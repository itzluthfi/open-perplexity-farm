import { ACCOUNTS_DIR } from "./config.mjs";
import { createPerplexityAccount } from "./creator/perplexity_creator.mjs";

export async function spawnNewAccount(cdpSession, options = {}) {
  console.log("\n=======================================================");
  console.log("[Auto-Spawner] Memulai pembuatan akun Perplexity baru...");
  console.log("=======================================================\n");

  await cdpSession.ensureConnected();
  const sessionWrapper = cdpSession.getCreatorSessionWrapper();

  const result = await createPerplexityAccount(sessionWrapper, {
    outDir: ACCOUNTS_DIR,
    forceFresh: true,
    otpTimeoutMs: 120000,
    onLog: options.onLog
  });

  const email = result.email || result.account?.email;
  console.log(`\n[Auto-Spawner] Sukses! Akun baru dibuat: ${email}`);
  return result;
}
