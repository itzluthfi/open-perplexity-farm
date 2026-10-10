import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { CONFIG } from "./config.mjs";
import { extractCitationsFromMarkdown } from "./apa_formatter.mjs";

function waitForPort(port, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const sock = createConnection(port, "127.0.0.1");
      sock.on("connect", () => { sock.destroy(); resolve(); });
      sock.on("error", () => {
        if (Date.now() - start > timeout) return reject(new Error("CDP timeout"));
        setTimeout(check, 500);
      });
    };
    check();
  });
}

export class CdpSession {
  constructor(options = {}) {
    this.cdpPort = options.cdpPort || CONFIG.CDP_PORT;
    this.chromePath = options.chromePath || CONFIG.CHROME_PATH;
    this.profileDir = options.profileDir || CONFIG.PROFILE_DIR;
    this.targetUrl = options.targetUrl || CONFIG.TARGET_URL;
    this.ws = null;
    this.msgId = 0;
    this.eventListeners = new Map();
    this.pendingRequests = new Map();
    this.currentTargetId = null;
  }

  async send(method, params = {}, timeoutMs = 25000) {
    if (!this.ws || this.ws.readyState !== 1) {
      throw new Error("CDP WebSocket is not connected");
    }
    const id = ++this.msgId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Timeout CDP call: ${method} (${timeoutMs}ms)`));
      }, timeoutMs);
      this.pendingRequests.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(event, cb) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(cb);
  }

  off(event, cb) {
    const list = this.eventListeners.get(event) || [];
    this.eventListeners.set(event, list.filter(fn => fn !== cb));
  }

  waitFor(event, { timeoutMs = 35000 } = {}) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout menunggu event CDP: ${event}`));
      }, timeoutMs);
      const cb = (params) => {
        cleanup();
        resolve(params);
      };
      const cleanup = () => {
        clearTimeout(timer);
        this.off(event, cb);
      };
      this.on(event, cb);
    });
  }

  async ensureConnected() {
    if (!this.ws || this.ws.readyState !== 1) {
      await this.connect();
    } else {
      await this.ensureActivePage();
    }
  }

  getCreatorSessionWrapper() {
    const self = this;
    function createDomainProxy(domain) {
      return new Proxy({}, {
        get: (_, action) => (params = {}) => self.send(`${domain}.${action}`, params)
      });
    }

    return new Proxy({
      waitFor: (event, opts) => self.waitFor(event, opts)
    }, {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        return createDomainProxy(prop);
      }
    });
  }

  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    return res?.result?.value;
  }

  async attachToTarget(pageTarget) {
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    this.currentTargetId = pageTarget.id;
    this.ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
          const { resolve, reject, timer } = this.pendingRequests.get(msg.id);
          this.pendingRequests.delete(msg.id);
          clearTimeout(timer);
          if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          else resolve(msg.result);
          return;
        }
        if (msg.method && this.eventListeners.has(msg.method)) {
          for (const cb of this.eventListeners.get(msg.method)) cb(msg.params);
        }
      } catch {}
    };

    await this.send("Page.enable");
    await this.send("Runtime.enable");
    await this.send("Network.enable");

    // Mask CDP webdriver fingerprint
    await this.evaluate(`
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    `);
  }

  async ensureActivePage() {
    try {
      const res = await fetch(`http://127.0.0.1:${this.cdpPort}/json`);
      const targets = await res.json();
      const pageTarget = targets.find(t => t.type === "page" && t.url.includes("perplexity")) || targets.find(t => t.type === "page");
      if (pageTarget && this.currentTargetId !== pageTarget.id) {
        console.log(`[CDP] Berpindah ke target tab: ${pageTarget.title || pageTarget.url}`);
        await this.attachToTarget(pageTarget);
      }
    } catch (e) {
      console.warn("[CDP] Gagal check active page:", e.message);
    }
  }

  async connect(launchIfClosed = true) {
    let isPortOpen = false;
    try {
      await waitForPort(this.cdpPort, 2000);
      isPortOpen = true;
    } catch {}

    if (!isPortOpen) {
      if (!launchIfClosed) throw new Error("Chrome CDP is not running");
      console.log(`[Chrome-CDP] Menyalakan background Chrome instance: ${this.chromePath}...`);
      const chrome = spawn(this.chromePath, [
        `--remote-debugging-port=${this.cdpPort}`,
        `--user-data-dir=${this.profileDir}`,
        `--no-first-run`,
        `--no-default-browser-check`,
        `--disable-blink-features=AutomationControlled`,
        this.targetUrl,
      ], { detached: true, stdio: "ignore" });
      chrome.unref();
      await waitForPort(this.cdpPort);
    }

    const res = await fetch(`http://127.0.0.1:${this.cdpPort}/json`);
    const targets = await res.json();
    let pageTarget = targets.find(t => t.type === "page" && t.url.includes("perplexity")) || targets.find(t => t.type === "page");

    if (!pageTarget) {
      throw new Error("Target Perplexity page not found in Chrome");
    }

    await this.attachToTarget(pageTarget);
    return true;
  }

  async clearCookies() {
    await this.send("Network.clearBrowserCookies");
    console.log("[CDP] Browser cookies dibersihkan.");
  }

  async injectCookies(cookies) {
    if (!cookies || !Array.isArray(cookies) || cookies.length === 0) return false;

    const cdpCookies = cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain?.startsWith(".") ? c.domain.slice(1) : c.domain,
      path: c.path || "/",
      secure: typeof c.secure === "boolean" ? c.secure : true,
      httpOnly: typeof c.httpOnly === "boolean" ? c.httpOnly : false,
      sameSite: c.sameSite === "None" ? "None" : (c.sameSite === "Strict" ? "Strict" : "Lax"),
      expires: c.expires > 0 ? c.expires : Math.floor(Date.now() / 1000) + 86400 * 30
    }));

    await this.send("Network.setCookies", { cookies: cdpCookies });
    console.log(`[CDP] Berhasil meng-inject ${cdpCookies.length} cookies ke Chrome.`);
    return true;
  }

  async navigateTo(url = CONFIG.TARGET_URL, waitMs = 2000) {
    await this.send("Page.navigate", { url });
    await new Promise(r => setTimeout(r, waitMs));
  }

  /**
   * Mengatur Focus Mode di antarmuka Perplexity jika tersedia
   * @param {string} focusMode - 'academic' | 'writing' | 'youtube' | 'reddit' | 'web'
   */
  async selectFocusMode(focusMode) {
    if (!focusMode || focusMode === "web" || focusMode === "all") return;

    try {
      await this.evaluate(`
        (() => {
          // Cari tombol focus selector (biasanya bertuliskan 'Focus' atau tombol dengan icon target)
          const buttons = Array.from(document.querySelectorAll('button'));
          const focusBtn = buttons.find(b => {
            const txt = (b.innerText || '').toLowerCase();
            const label = (b.getAttribute('aria-label') || '').toLowerCase();
            return txt.includes('focus') || txt.includes('cari') || label.includes('focus');
          });

          if (focusBtn) {
            focusBtn.click();
            setTimeout(() => {
              // Cari menu option yang sesuai
              const options = Array.from(document.querySelectorAll('div[role="menuitem"], button, [data-testid*="focus"]'));
              const target = options.find(o => {
                const oTxt = (o.innerText || '').toLowerCase();
                if ('${focusMode}' === 'academic') return oTxt.includes('academic') || oTxt.includes('akademik') || oTxt.includes('scholar');
                if ('${focusMode}' === 'writing') return oTxt.includes('writing') || oTxt.includes('menulis');
                if ('${focusMode}' === 'youtube') return oTxt.includes('youtube');
                if ('${focusMode}' === 'reddit') return oTxt.includes('reddit') || oTxt.includes('social');
                return false;
              });
              if (target) target.click();
            }, 300);
          }
        })()
      `);
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.warn("[CDP] Focus mode selector fallback to prompt prefix:", e.message);
    }
  }

  async query(prompt, options = {}) {
    const timeoutMs = options.timeoutMs || CONFIG.MAX_QUERY_TIMEOUT_MS;
    const focus = options.focus || "web";

    // 0. Pastikan terhubung ke active tab
    await this.ensureActivePage();

    // 1. Pastikan di home perplexity
    const currentUrl = await this.evaluate("window.location.href");
    if (!currentUrl || !currentUrl.startsWith("https://www.perplexity.ai/")) {
      await this.navigateTo("https://www.perplexity.ai/", 2000);
    } else if (currentUrl.includes("/search/")) {
      await this.navigateTo("https://www.perplexity.ai/", 1800);
    }

    // 2. Terapkan Focus Mode jika diminta
    if (focus && focus !== "web") {
      await this.selectFocusMode(focus);
    }

    // Jika mode akademik diminta dan focus button tidak muncul, perkuat dengan instruksi terarah
    let effectivePrompt = prompt;
    if (focus === "academic" && !prompt.toLowerCase().includes("academic") && !prompt.toLowerCase().includes("jurnal")) {
      effectivePrompt = `[Fokus Akademik: Cari referensi paper/jurnal ilmiah terindeks (IEEE, ACM, SINTA, Scopus, Google Scholar) dengan sitasi lengkap]\n${prompt}`;
    }

    // 3. Focus ke input composer
    await this.evaluate(`
      (() => {
        const el = document.querySelector('#ask-input') || document.querySelector('textarea') || document.querySelector('[contenteditable="true"]');
        if (el) {
          el.focus();
          el.click();
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 400));

    // 4. Hardware typing via CDP insertText
    await this.send("Input.insertText", { text: effectivePrompt });
    await new Promise(r => setTimeout(r, 500));

    // 5. Submit via click atau Enter
    await this.evaluate(`
      (() => {
        const btn = document.querySelector('button[aria-label*="Submit"]') || document.querySelector('button[type="submit"]') || document.querySelector('button.bg-super');
        if (btn) btn.click();
      })()
    `);

    await this.send("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      windowsVirtualKeyCode: 13,
      unmodifiedText: "\r",
      text: "\r",
      key: "Enter",
      code: "Enter"
    });
    await this.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      windowsVirtualKeyCode: 13,
      key: "Enter",
      code: "Enter"
    });

    // 6. Polling streaming response
    const start = Date.now();
    let lastText = "";
    let stableCount = 0;

    // Tunggu awal generate 2.5 detik
    await new Promise(r => setTimeout(r, 2500));

    while (Date.now() - start < timeoutMs) {
      await new Promise(r => setTimeout(r, 1200));

      const status = await this.evaluate(`
        (() => {
          const prose = document.querySelectorAll('.prose, div[dir="auto"], .markdown, [data-testid="search-results-content"]');
          const texts = Array.from(prose).map(p => p.innerText.trim()).filter(Boolean);
          const longTexts = texts.filter(t => t.length > 30);
          const latestText = longTexts.length > 0 ? longTexts[longTexts.length - 1] : (texts[texts.length - 1] || "");

          const stopBtn = document.querySelector('button[aria-label*="Stop"]') || document.querySelector('button[title*="Stop"]');
          const copyBtn = document.querySelector('button[aria-label*="Copy"]') || document.querySelector('button[title*="Copy"]');

          // Ekstrak rujukan link yang ada di halaman
          const linkElements = Array.from(document.querySelectorAll('a[target="_blank"], a[href^="http"]'));
          const sources = linkElements
            .filter(a => a.href && !a.href.includes('perplexity.ai') && !a.href.includes('google.com/search') && a.innerText.trim().length > 2)
            .map(a => {
              let domain = '';
              try { domain = new URL(a.href).hostname.replace(/^www\\./, ''); } catch {}
              return {
                title: a.innerText.trim().slice(0, 120),
                url: a.href,
                domain
              };
            });

          const bodyText = document.body.innerText || "";
          const isLimit = bodyText.includes("reached your query limit") || bodyText.includes("Upgrade to Pro to continue");

          return {
            latestText,
            isGenerating: !!stopBtn,
            hasFinishedButtons: !!copyBtn,
            isLimit,
            sources: sources.slice(0, 15)
          };
        })()
      `).catch(() => null);

      if (status?.isLimit) {
        throw new Error("RATE_LIMIT_EXCEEDED: Akun mencapai limit harian/kuota Pro.");
      }

      if (status && status.latestText) {
        if (status.latestText !== lastText) {
          stableCount = 0;
          lastText = status.latestText;
        } else {
          if (!status.isGenerating) {
            stableCount++;
            if ((status.hasFinishedButtons && stableCount >= 1) || stableCount >= 3) {
              if (status.latestText.length > 40) {
                console.log(`[CDP] Selesai membaca respon (${status.latestText.length} karakter, ${status.sources?.length || 0} sumber).`);
                const mdSources = extractCitationsFromMarkdown(status.latestText);
                const combinedSources = dedupeSources([...(status.sources || []), ...mdSources]);
                return {
                  text: formatPerplexityOutput(status.latestText),
                  sources: combinedSources
                };
              }
            }
          }
        }
      }
    }

    if (lastText && lastText.length > 40) {
      console.log(`[CDP] Timeout tercapai, mengembalikan teks parsial (${lastText.length} karakter).`);
      const mdSources = extractCitationsFromMarkdown(lastText);
      return {
        text: formatPerplexityOutput(lastText),
        sources: mdSources
      };
    }

    throw new Error("Timeout menunggu respon selesai dari Perplexity.");
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export function formatPerplexityOutput(rawText) {
  if (!rawText) return "";
  let text = rawText;

  // 1. Bersihkan floating citation clutter seperti: "jurnal.kharisma.ac +1" atau "domain.com +3"
  text = text.replace(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s\)\.\,]*)?)\s*(?:\+(\d+))?/g, "[$1]");

  // 2. Beri spasi dan format bold pada label umum
  text = text.replace(/(^|\n)\s*(Fokus|Kebaruan|Alasan|Alasannya|Metodologi|Tujuan|Kelebihan|Kekurangan|Variabel|Kesimpulan)\s*:\s*/gim, "$1- **$2:** ");

  // 3. Format Section Headers jika baris adalah judul pendek tanpa titik
  text = text.replace(/(^|\n\n)([A-Z][A-Za-z0-9\s\/\-]{2,45})(?:\:)?(\n\n|$)/g, (match, before, header, after) => {
    const trimmed = header.trim();
    if (trimmed.startsWith("#") || trimmed.startsWith("*") || trimmed.endsWith(".")) {
      return match;
    }
    return `${before}### ${trimmed}${after}`;
  });

  // 4. Format daftar kutipan / keyword jika berupa baris bertanda petik
  text = text.replace(/(^|\n)\s*("[^"\n]+"|'[^'\n]+')\s*(?=\n|$)/g, "$1- `$2`");

  return text.trim();
}

function dedupeSources(sources) {
  const seen = new Set();
  const res = [];
  for (const s of sources) {
    if (s.url && !seen.has(s.url)) {
      seen.add(s.url);
      res.push(s);
    }
  }
  return res;
}
