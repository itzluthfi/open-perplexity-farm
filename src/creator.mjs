import { ACCOUNTS_DIR } from "./config.mjs";
import { createPerplexityAccount } from "./creator/perplexity_creator.mjs";

export async function spawnNewAccount(cdpSession) {
  console.log("\n=======================================================");
  console.log("[Auto-Spawner] Memulai pembuatan akun Perplexity baru...");
  console.log("=======================================================\n");

  // Bungkus cdpSession ke format session yang dibutuhkan perplexity_creator
  const eventListeners = new Map();
  if (cdpSession.ws) {
    cdpSession.ws.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.method && eventListeners.has(msg.method)) {
          for (const cb of eventListeners.get(msg.method)) cb(msg.params);
        }
      } catch {}
    });
  }

  function createDomainProxy(domain) {
    return new Proxy({}, {
      get: (_, action) => (params = {}) => cdpSession.send(`${domain}.${action}`, params)
    });
  }

  const sessionWrapper = new Proxy({
    waitFor: (event, { timeoutMs = 35000 } = {}) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout waiting for ${event}`));
      }, timeoutMs);
      const cb = (params) => {
        cleanup();
        resolve(params);
      };
      const cleanup = () => {
        clearTimeout(timer);
        const list = eventListeners.get(event) || [];
        eventListeners.set(event, list.filter(fn => fn !== cb));
      };
      if (!eventListeners.has(event)) eventListeners.set(event, []);
      eventListeners.get(event).push(cb);
    })
  }, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      return createDomainProxy(prop);
    }
  });

  const result = await createPerplexityAccount(sessionWrapper, {
    outDir: ACCOUNTS_DIR,
    forceFresh: true
  });

  console.log(`\n[Auto-Spawner] Sukses! Akun baru dibuat: ${result.account?.email || result.email}`);
  return result;
}
