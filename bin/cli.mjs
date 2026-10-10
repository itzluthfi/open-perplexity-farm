#!/usr/bin/env node

/**
 * Perplexity Farm & Web API - Command Line Interface (CLI)
 * Open-Source Standard Multi-Account Gateway for Perplexity AI
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIG } from "../src/config.mjs";
import { createServer } from "../src/server.mjs";
import { AccountPoolManager } from "../src/pool.mjs";
import { CdpSession } from "../src/cdp.mjs";
import { spawnNewAccount } from "../src/creator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function printBanner() {
  console.log(`
\x1b[36m╔══════════════════════════════════════════════════════════════════════════╗
║  PERPLEXITY FARM & WEB-TO-API GATEWAY (OpenAI Compatible)                ║
║  Multi-Account Pool, Real-time Web Search & Automatic Rate-Limit Fallback║
╚══════════════════════════════════════════════════════════════════════════╝\x1b[0m
`);
}

function printHelp() {
  printBanner();
  console.log(`\x1b[1mPENGGUNAAN:\x1b[0m
  node bin/cli.mjs <command> [options]

\x1b[1mCOMMANDS:\x1b[0m
  \x1b[32mstart\x1b[0m | \x1b[32mserve\x1b[0m       Menjalankan API server gateway OpenAI (/v1/chat/completions)
  \x1b[32mcreate\x1b[0m [count]      Membuat akun Perplexity baru otomatis & memasukkan ke pool
  \x1b[32mpool\x1b[0m | \x1b[32mlist\x1b[0m         Melihat daftar semua akun di pool, status, dan riwayat pemakaian
  \x1b[32mrotate\x1b[0m              Memindahkan sesi Chrome aktif ke akun berikutnya di pool
  \x1b[32mtest\x1b[0m [prompt]       Menguji pengiriman query ke API server lokal
  \x1b[32mhelp\x1b[0m                Menampilkan bantuan ini

\x1b[1mCONTOH:\x1b[0m
  node bin/cli.mjs start --port 8128
  node bin/cli.mjs create 3
  node bin/cli.mjs pool
  node bin/cli.mjs test "Siapa juara Piala Dunia 2022?"
`);
}

async function main() {
  const args = process.argv.slice(2);

  // Jika dijalankan tanpa argumen, otomatis buka Interactive TUI Menu!
  if (args.length === 0) {
    const { InteractiveTui } = await import("./tui.mjs");
    const tui = new InteractiveTui();
    tui.start();
    return;
  }

  const command = args[0] || "help";

  // Parse options
  const getOpt = (name, def) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : def;
  };

  switch (command.toLowerCase()) {
    case "start":
    case "serve": {
      printBanner();
      const port = parseInt(getOpt("port", CONFIG.PORT), 10);
      const cdpPort = parseInt(getOpt("cdp-port", CONFIG.CDP_PORT), 10);
      const app = await createServer({ port, cdpPort });
      await app.start();
      break;
    }

    case "pool":
    case "list":
    case "status": {
      printBanner();
      const pool = new AccountPoolManager();
      const list = pool.listAccounts();

      console.log(`[*] \x1b[1mTOTAL AKUN DI POOL:\x1b[0m ${list.length}\n`);
      if (list.length === 0) {
        console.log("\x1b[33mBelum ada akun di pool. Jalankan `node bin/cli.mjs create` untuk membuat akun baru.\x1b[0m\n");
        return;
      }

      console.log("┌─────┬────────┬──────────────────────────────────────┬─────────────┬──────────┬────────────────────────┐");
      console.log("│ NUM │ ACTIVE │ EMAIL / ID                           │ STATUS      │ USAGE    │ LAST USED              │");
      console.log("├─────┼────────┼──────────────────────────────────────┼─────────────┼──────────┼────────────────────────┤");

      list.forEach((acc, i) => {
        const activeMark = acc.isActive ? "\x1b[32m  ●   \x1b[0m" : "      ";
        const statusColor = acc.status === "active" ? "\x1b[32mactive     \x1b[0m" : (acc.status === "cooling_down" ? "\x1b[33mcooldown   \x1b[0m" : "\x1b[31minvalid    \x1b[0m");
        const emailStr = (acc.email.length > 36 ? acc.email.slice(0, 33) + "..." : acc.email).padEnd(36);
        const usageStr = String(acc.usageCount).padStart(8);
        const lastUsedStr = (acc.lastUsed || "Never").padEnd(22);

        console.log(`│ ${(i + 1).toString().padStart(3)} │ ${activeMark} │ ${emailStr} │ ${statusColor} │ ${usageStr} │ ${lastUsedStr} │`);
      });
      console.log("└─────┴────────┴──────────────────────────────────────┴─────────────┴──────────┴────────────────────────┘\n");
      break;
    }

    case "create": {
      printBanner();
      const count = parseInt(args[1] || "1", 10);
      console.log(`[*] Memulai pembuatan ${count} akun Perplexity baru...\n`);

      const cdp = new CdpSession();
      await cdp.connect();

      for (let i = 0; i < count; i++) {
        console.log(`\n--- [Akun ${i + 1}/${count}] ---`);
        try {
          await spawnNewAccount(cdp);
        } catch (err) {
          console.error(`[-] Gagal membuat akun ke-${i + 1}:`, err.message);
        }
      }

      console.log("\n[+] Selesai. Menampilkan pool akun terbaru:");
      const pool = new AccountPoolManager();
      console.log(JSON.stringify(pool.listAccounts(), null, 2));
      process.exit(0);
      break;
    }

    case "rotate": {
      printBanner();
      const cdp = new CdpSession();
      await cdp.connect();
      const pool = new AccountPoolManager();
      const nextAcc = await pool.rotateToNext(cdp);
      if (nextAcc) {
        console.log(`\n[+] Berhasil rotasi aktif ke: ${nextAcc.email}`);
      }
      process.exit(0);
      break;
    }

    case "test": {
      printBanner();
      const prompt = args.slice(1).join(" ") || "Siapa presiden Indonesia saat ini dan apa ibu kotanya?";
      const port = parseInt(getOpt("port", CONFIG.PORT), 10);
      
      console.log(`[*] Mengirim prompt uji coba ke: http://localhost:${port}/v1/chat/completions`);
      console.log(`[*] Prompt: "${prompt}"\n`);

      try {
        const start = Date.now();
        const res = await fetch(`http://localhost:${port}/v1/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "perplexity/sonar-web",
            messages: [{ role: "user", content: prompt }]
          })
        });

        const data = await res.json();
        const duration = ((Date.now() - start) / 1000).toFixed(2);

        if (!res.ok) {
          console.error(`[-] API Error (${res.status}):`, JSON.stringify(data, null, 2));
          return;
        }

        console.log(`\x1b[32m[+] Respon Diterima dalam ${duration}s:\x1b[0m\n`);
        console.log(data.choices[0]?.message?.content || "(Kosong)");
        console.log("\n=======================================================");
      } catch (e) {
        console.error("[-] Gagal terhubung ke API server. Pastikan server sudah aktif (`node bin/cli.mjs start`).");
        console.error("Detail:", e.message);
      }
      break;
    }

    case "help":
    default:
      printHelp();
      break;
  }
}

main().catch(err => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
