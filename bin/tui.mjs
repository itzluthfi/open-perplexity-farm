import readline from "node:readline";
import { CONFIG } from "../src/config.mjs";
import { createServer } from "../src/server.mjs";
import { AccountPoolManager } from "../src/pool.mjs";
import { CdpSession } from "../src/cdp.mjs";
import { spawnNewAccount } from "../src/creator.mjs";

export class InteractiveTui {
  constructor() {
    this.pool = new AccountPoolManager();
    this.cdp = new CdpSession();
    this.appInstance = null;
    this.serverRunning = false;
    this.selectedIndex = 0;
    this.isPrompting = false;
    this.statusMessage = "Siap menerima perintah.";
    
    this.menuItems = [
      { id: "toggle_server", label: "Start / Stop API Gateway Server" },
      { id: "view_pool", label: "Lihat Dashboard Pool Akun & Status" },
      { id: "create_account", label: "Buat Akun Baru Otomatis (Auto-Creator)" },
      { id: "rotate_account", label: "Rotasi Sesi ke Akun Berikutnya" },
      { id: "test_query", label: "Test Prompt Pertanyaan ke Perplexity" },
      { id: "reset_cooldown", label: "Reset Status Cooldown Semua Akun" },
      { id: "exit", label: "Keluar (Exit)" }
    ];
  }

  clearScreen() {
    process.stdout.write("\x1Bc");
  }

  renderHeader() {
    const activeAcc = this.pool.getActiveAccount();
    const serverStatus = this.serverRunning 
      ? `\x1b[42m\x1b[30m ● RUNNING (Port ${CONFIG.PORT}) \x1b[0m`
      : `\x1b[41m\x1b[37m ○ STOPPED \x1b[0m`;

    console.log(`\x1b[36m╔══════════════════════════════════════════════════════════════════════════════╗
║        PERPLEXITY FARM & WEB-TO-API GATEWAY — INTERACTIVE CLI TUI            ║
╚══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);
    
    console.log(` [*] \x1b[1mAPI Server:\x1b[0m ${serverStatus}  │  \x1b[1mPool:\x1b[0m ${this.pool.accounts.length} Akun  │  \x1b[1mActive:\x1b[0m \x1b[33m${activeAcc ? activeAcc.email : "Default Browser"}\x1b[0m`);
    console.log(`\x1b[90m──────────────────────────────────────────────────────────────────────────────\x1b[0m`);
  }

  renderMenu() {
    console.log(`\x1b[1mPILIH MENU (Gunakan Panah ↑/↓ atau Angka [1-7], lalu ENTER):\x1b[0m\n`);

    this.menuItems.forEach((item, idx) => {
      let label = item.label;
      if (item.id === "toggle_server") {
        label = this.serverRunning ? "Stop API Gateway Server" : "Start API Gateway Server";
      }

      if (idx === this.selectedIndex) {
        console.log(`  \x1b[36m> \x1b[1m\x1b[46m\x1b[30m [${idx + 1}] ${label} \x1b[0m`);
      } else {
        console.log(`    \x1b[90m[${idx + 1}]\x1b[0m ${label}`);
      }
    });

    console.log(`\n\x1b[90m──────────────────────────────────────────────────────────────────────────────\x1b[0m`);
    console.log(` [*] \x1b[1mStatus:\x1b[0m ${this.statusMessage}`);
    console.log(`\x1b[90m [↑/↓]: Navigasi  │  [Enter]: Pilih  │  [Q/Esc]: Keluar \x1b[0m\n`);
  }

  render() {
    if (this.isPrompting) return;
    this.clearScreen();
    this.renderHeader();
    this.renderMenu();
  }

  async askQuestion(query) {
    this.isPrompting = true;
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(`\n\x1b[33m${query}\x1b[0m `, (ans) => {
        rl.close();
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(true);
          process.stdin.resume();
        }
        this.isPrompting = false;
        resolve(ans.trim());
      });
    });
  }

  async waitForEnter(msg = "Tekan [ENTER] untuk kembali ke menu...") {
    await this.askQuestion(`\n${msg}`);
  }

  async toggleServer() {
    if (this.serverRunning) {
      this.statusMessage = "Menghentikan server...";
      this.render();
      if (this.appInstance?.server) {
        this.appInstance.server.close();
      }
      this.serverRunning = false;
      this.statusMessage = "API Gateway Server berhasil dihentikan.";
    } else {
      this.statusMessage = "Menyalakan API Gateway & browser...";
      this.render();
      try {
        this.appInstance = await createServer({ port: CONFIG.PORT, cdpPort: CONFIG.CDP_PORT });
        await this.appInstance.start();
        this.serverRunning = true;
        this.statusMessage = `Server aktif di http://localhost:${CONFIG.PORT}/v1/chat/completions`;
      } catch (err) {
        this.statusMessage = `Gagal menyalakan server: ${err.message}`;
      }
    }
  }

  async showPoolDashboard() {
    this.clearScreen();
    this.renderHeader();
    this.pool.syncAccounts();
    const list = this.pool.listAccounts();

    console.log(`\x1b[1m[*] DAFTAR POOL AKUN PERPLEXITY (${list.length} Terdaftar):\x1b[0m\n`);
    
    if (list.length === 0) {
      console.log("  \x1b[33m(Belum ada akun di pool. Pilih menu [3] untuk membuat akun baru)\x1b[0m\n");
    } else {
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
    }

    await this.waitForEnter();
    this.render();
  }

  async createAccountFlow() {
    this.clearScreen();
    this.renderHeader();
    console.log(`\x1b[1mAUTO-CREATOR AKUN PERPLEXITY\x1b[0m\n`);
    
    const countStr = await this.askQuestion("Jumlah akun yang ingin dibuat (default: 1):");
    const count = parseInt(countStr || "1", 10) || 1;

    console.log(`\n[*] Memulai pembuatan ${count} akun...\n`);
    try {
      await this.cdp.connect();
      for (let i = 0; i < count; i++) {
        console.log(`\n--- [Membuat Akun ${i + 1}/${count}] ---`);
        await spawnNewAccount(this.cdp);
      }
      this.pool.syncAccounts();
      this.statusMessage = `Sukses membuat ${count} akun baru.`;
      console.log(`\n\x1b[32m[+] Selesai. Semua akun berhasil dimasukkan ke pool.\x1b[0m`);
    } catch (err) {
      console.error(`\x1b[31m[-] Terjadi error: ${err.message}\x1b[0m`);
      this.statusMessage = `Error saat membuat akun: ${err.message}`;
    }

    await this.waitForEnter();
    this.render();
  }

  async rotateAccountFlow() {
    this.statusMessage = "Merotasi akun...";
    this.render();
    try {
      await this.cdp.connect();
      const nextAcc = await this.pool.rotateToNext(this.cdp);
      if (nextAcc) {
        this.statusMessage = `Berhasil rotasi ke akun: ${nextAcc.email}`;
      } else {
        this.statusMessage = "Hanya ada 1 akun di pool.";
      }
    } catch (err) {
      this.statusMessage = `Gagal rotasi: ${err.message}`;
    }
    this.render();
  }

  async testQueryFlow() {
    this.clearScreen();
    this.renderHeader();
    console.log(`\x1b[1mTEST PROMPT PERPLEXITY WEB API\x1b[0m\n`);

    if (!this.serverRunning) {
      console.log("[*] \x1b[33mServer belum berjalan. Menyalakan server otomatis untuk pengujian...\x1b[0m\n");
      await this.toggleServer();
    }

    const prompt = await this.askQuestion("Ketik prompt pertanyaan (atau tekan ENTER untuk default):");
    const queryText = prompt || "Siapa presiden Indonesia saat ini dan apa ibu kotanya?";

    console.log(`\n[*] Mengirim query: "${queryText}"\n[*] Menunggu respon dari Perplexity...`);

    try {
      const start = Date.now();
      const res = await fetch(`http://localhost:${CONFIG.PORT}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "perplexity/sonar-web",
          messages: [{ role: "user", content: queryText }]
        })
      });

      const data = await res.json();
      const duration = ((Date.now() - start) / 1000).toFixed(2);

      if (res.ok) {
        console.log(`\n\x1b[32m[+] Jawaban Diterima (${duration} detik):\x1b[0m\n`);
        console.log("──────────────────────────────────────────────────────────────────────────────");
        console.log(data.choices[0]?.message?.content || "(Kosong)");
        console.log("──────────────────────────────────────────────────────────────────────────────\n");
        this.statusMessage = `Test sukses dalam ${duration}s.`;
      } else {
        console.log(`\n\x1b[31m[-] Gagal (${res.status}): ${JSON.stringify(data)}\x1b[0m\n`);
        this.statusMessage = `Test gagal dengan status ${res.status}`;
      }
    } catch (err) {
      console.log(`\n\x1b[31m[-] Error: ${err.message}\x1b[0m\n`);
      this.statusMessage = `Test error: ${err.message}`;
    }

    await this.waitForEnter();
    this.render();
  }

  resetCooldowns() {
    this.pool.syncAccounts();
    for (const acc of this.pool.accounts) {
      acc.status = "active";
      acc.cooldownUntil = 0;
    }
    this.pool.saveRegistry();
    this.statusMessage = "Semua akun direset ke status ACTIVE!";
    this.render();
  }

  async executeSelected() {
    const selected = this.menuItems[this.selectedIndex];
    switch (selected.id) {
      case "toggle_server":
        await this.toggleServer();
        this.render();
        break;
      case "view_pool":
        await this.showPoolDashboard();
        break;
      case "create_account":
        await this.createAccountFlow();
        break;
      case "rotate_account":
        await this.rotateAccountFlow();
        break;
      case "test_query":
        await this.testQueryFlow();
        break;
      case "reset_cooldown":
        this.resetCooldowns();
        break;
      case "exit":
        this.exit();
        break;
    }
  }

  exit() {
    this.clearScreen();
    console.log("Selesai. Sesi CLI ditutup.\n");
    if (this.appInstance?.server) {
      this.appInstance.server.close();
    }
    process.exit(0);
  }

  start() {
    if (!process.stdin.isTTY) {
      console.log("Non-interactive environment detected. Starting server directly...");
      this.toggleServer();
      return;
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    process.stdin.on("keypress", async (str, key) => {
      if (this.isPrompting) return;

      if ((key.ctrl && key.name === "c") || key.name === "q" || key.name === "escape") {
        this.exit();
        return;
      }

      if (key.name === "up") {
        this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
        this.render();
      } else if (key.name === "down") {
        this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
        this.render();
      } else if (key.name === "return") {
        await this.executeSelected();
      } else if (str >= "1" && str <= String(this.menuItems.length)) {
        this.selectedIndex = parseInt(str, 10) - 1;
        this.render();
        await this.executeSelected();
      }
    });

    this.render();
  }
}
