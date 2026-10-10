import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { CONFIG, PUBLIC_DIR } from "./config.mjs";
import { CdpSession } from "./cdp.mjs";
import { AccountPoolManager } from "./pool.mjs";
import { spawnNewAccount } from "./creator.mjs";

function serveStaticFile(reqPath, res) {
  let filePath = path.join(PUBLIC_DIR, reqPath === "/" ? "index.html" : reqPath);
  
  // Security check to avoid directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return true;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon"
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
    return true;
  }
  return false;
}

export async function createServer(options = {}) {
  const port = options.port || CONFIG.PORT;
  const cdp = new CdpSession({ cdpPort: options.cdpPort || CONFIG.CDP_PORT });
  const pool = new AccountPoolManager();
  let isQueryRunning = false;

  async function executeQueryWithFallback(prompt, options = {}, retryCount = 0) {
    while (isQueryRunning) {
      await new Promise(r => setTimeout(r, 400));
    }
    isQueryRunning = true;

    try {
      let activeAccount = pool.getActiveAccount();
      
      // Jika belum ada akun atau semua cooldown, coba spawn baru
      if (!activeAccount && CONFIG.AUTO_SPAWN_ON_EXHAUSTED) {
        console.log("[Server] Semua akun di pool limit/kosong. Melahirkan akun baru secara otomatis...");
        try {
          await spawnNewAccount(cdp);
          pool.syncAccounts();
          activeAccount = pool.getActiveAccount();
        } catch (spawnErr) {
          console.error("Gagal auto-spawn akun:", spawnErr.message);
        }
      }

      console.log(`[Query] Prompt: "${prompt.slice(0, 60)}..." (Focus: ${options.focus || "web"}, Akun: ${activeAccount ? activeAccount.email : "Default Profile"})`);

      try {
        const result = await cdp.query(prompt, options);
        if (activeAccount) pool.markSuccess(activeAccount);
        return result;
      } catch (err) {
        if (err.message.includes("RATE_LIMIT_EXCEEDED") || err.message.includes("limit")) {
          console.warn(`[Fallback] Terdeteksi limit pada akun ${activeAccount?.email}. Memulai rotasi akun...`);
          if (activeAccount) pool.markLimit(activeAccount);

          if (retryCount < 3) {
            const nextAcc = await pool.rotateToNext(cdp);
            if (nextAcc) {
              console.log(`[Fallback] Mengulang query dengan akun ${nextAcc.email}...`);
              return await executeQueryWithFallback(prompt, options, retryCount + 1);
            } else if (CONFIG.AUTO_SPAWN_ON_EXHAUSTED) {
              console.log("[Fallback] Membuat akun baru on-demand...");
              try {
                await spawnNewAccount(cdp);
                pool.syncAccounts();
                const freshAcc = pool.getActiveAccount();
                if (freshAcc) {
                  await pool.applyAccountToCdp(cdp, freshAcc);
                  return await executeQueryWithFallback(prompt, options, retryCount + 1);
                }
              } catch (e) {
                console.error("Gagal spawn fallback:", e.message);
              }
            }
          }
        }
        throw err;
      }
    } finally {
      isQueryRunning = false;
    }
  }

  const server = http.createServer(async (req, res) => {
    // CORS Headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = parsedUrl.pathname;

    // 1. Health Check
    if (pathname === "/health") {
      const stats = pool.getStats();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        service: "Open Perplexity Farm & Web Studio",
        port,
        stats,
        cdpConnected: !!cdp.ws && cdp.ws.readyState === 1
      }, null, 2));
      return;
    }

    // 2. Account Fleet Endpoints
    if (pathname === "/v1/accounts" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        object: "list",
        data: pool.listAccounts(),
        stats: pool.getStats()
      }, null, 2));
      return;
    }

    if (pathname === "/v1/accounts/rotate" && req.method === "POST") {
      const nextAcc = await pool.rotateToNext(cdp);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        message: nextAcc ? `Berhasil rotasi ke akun ${nextAcc.email}` : "Hanya ada 1 akun di pool",
        activeAccount: nextAcc ? nextAcc.email : null
      }));
      return;
    }

    if (pathname === "/v1/accounts/spawn" && req.method === "POST") {
      try {
        console.log("[Manual Trigger] Memulai proses pembuatan akun baru...");
        const newAcc = await spawnNewAccount(cdp);
        pool.syncAccounts();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "ok",
          message: `Akun baru ${newAcc?.account?.email || "baru"} berhasil dibuat dan masuk pool!`,
          account: newAcc?.account?.email
        }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (pathname === "/v1/accounts/strategy" && req.method === "POST") {
      let bodyStr = "";
      req.on("data", chunk => bodyStr += chunk);
      req.on("end", () => {
        try {
          const body = JSON.parse(bodyStr || "{}");
          const ok = pool.setStrategy(body.strategy);
          res.writeHead(ok ? 200 : 400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: ok ? "ok" : "error", strategy: pool.strategy }));
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    if (pathname === "/v1/accounts/reset" && req.method === "POST") {
      let bodyStr = "";
      req.on("data", chunk => bodyStr += chunk);
      req.on("end", () => {
        try {
          const body = JSON.parse(bodyStr || "{}");
          const ok = pool.resetCooldown(body.id);
          res.writeHead(ok ? 200 : 404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: ok ? "ok" : "not_found" }));
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    if (pathname === "/v1/accounts/delete" && req.method === "POST") {
      let bodyStr = "";
      req.on("data", chunk => bodyStr += chunk);
      req.on("end", () => {
        try {
          const body = JSON.parse(bodyStr || "{}");
          const ok = pool.deleteAccount(body.id);
          res.writeHead(ok ? 200 : 404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: ok ? "ok" : "not_found" }));
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // 3. Models List
    if (pathname === "/v1/models") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        object: "list",
        data: [
          { id: "perplexity/sonar-web", object: "model", created: Date.now(), owned_by: "perplexity" },
          { id: "perplexity/sonar-reasoning", object: "model", created: Date.now(), owned_by: "perplexity" },
          { id: "perplexity/pro-search", object: "model", created: Date.now(), owned_by: "perplexity" }
        ]
      }));
      return;
    }

    // 4. OpenAI Chat Completions (SSE Streaming & Full JSON)
    if (pathname === "/v1/chat/completions" && req.method === "POST") {
      let bodyStr = "";
      req.on("data", chunk => bodyStr += chunk);
      req.on("end", async () => {
        try {
          const body = JSON.parse(bodyStr || "{}");
          const messages = body.messages || [];
          const lastMsg = messages[messages.length - 1]?.content || "Halo";
          const isStream = Boolean(body.stream);
          const focus = body.focus || "web";

          const queryRes = await executeQueryWithFallback(lastMsg, { focus });
          const answerText = typeof queryRes === "object" ? queryRes.text : queryRes;
          const sources = typeof queryRes === "object" ? (queryRes.sources || []) : [];

          if (isStream) {
            res.writeHead(200, {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive"
            });

            const chunkPayload = {
              id: `chatcmpl-${Date.now()}`,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: body.model || "perplexity/sonar-web",
              choices: [
                {
                  index: 0,
                  delta: { content: answerText },
                  finish_reason: "stop"
                }
              ],
              sources
            };

            res.write(`data: ${JSON.stringify(chunkPayload)}\n\n`);
            res.write("data: [DONE]\n\n");
            res.end();
            return;
          }

          const responsePayload = {
            id: `chatcmpl-${Date.now()}`,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: body.model || "perplexity/sonar-web",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: answerText
                },
                finish_reason: "stop"
              }
            ],
            sources,
            usage: {
              prompt_tokens: lastMsg.length,
              completion_tokens: answerText.length,
              total_tokens: lastMsg.length + answerText.length
            }
          };

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(responsePayload));
        } catch (err) {
          console.error("[API Error]:", err.message);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: err.message, type: "server_error" } }));
        }
      });
      return;
    }

    // 5. Serve Web Studio UI & Static Files
    if (req.method === "GET") {
      const served = serveStaticFile(pathname, res);
      if (served) return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  });

  return {
    server,
    cdp,
    pool,
    start: async () => {
      await cdp.connect();
      const initialAccount = pool.getActiveAccount();
      if (initialAccount) {
        await pool.applyAccountToCdp(cdp, initialAccount);
      }

      return new Promise((resolve) => {
        server.listen(port, () => {
          console.log(`\n======================================================`);
          console.log(`Open Perplexity Farm & Web Studio`);
          console.log(`Web Studio UI: http://localhost:${port}`);
          console.log(`OpenAI Chat API: http://localhost:${port}/v1/chat/completions`);
          console.log(`Account Fleet : http://localhost:${port}/v1/accounts`);
          console.log(`Total Akun Pool: ${pool.accounts.length} akun`);
          console.log(`Strategi Aktif: ${pool.strategy}`);
          console.log(`======================================================\n`);
          resolve(server);
        });
      });
    }
  };
}
