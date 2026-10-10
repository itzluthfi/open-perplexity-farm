import fs from "node:fs";
import path from "node:path";
import { ACCOUNTS_DIR, CREATOR_OUTPUTS_DIR, CONFIG } from "./config.mjs";

export class AccountPoolManager {
  constructor() {
    this.accounts = [];
    this.activeIndex = 0;
    this.strategy = CONFIG.ROTATION_STRATEGY || "FAILOVER_ONLY";
    this.dbFile = path.resolve(ACCOUNTS_DIR, "pool_registry.json");
    this.ensureDirs();
    this.syncAccounts();
  }

  ensureDirs() {
    if (!fs.existsSync(ACCOUNTS_DIR)) {
      fs.mkdirSync(ACCOUNTS_DIR, { recursive: true });
    }
  }

  syncAccounts() {
    this.ensureDirs();

    // 1. Cek file di outputs creator dan copy ke accounts jika belum ada
    if (fs.existsSync(CREATOR_OUTPUTS_DIR)) {
      try {
        const creatorFiles = fs.readdirSync(CREATOR_OUTPUTS_DIR).filter(f => f.endsWith(".json"));
        for (const file of creatorFiles) {
          const srcPath = path.join(CREATOR_OUTPUTS_DIR, file);
          const destPath = path.join(ACCOUNTS_DIR, file);
          if (!fs.existsSync(destPath)) {
            try {
              fs.copyFileSync(srcPath, destPath);
            } catch {}
          }
        }
      } catch {}
    }

    // 2. Baca registry database
    let registry = {};
    if (fs.existsSync(this.dbFile)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.dbFile, "utf-8"));
        if (parsed._meta) {
          this.activeIndex = parsed._meta.activeIndex || 0;
          this.strategy = parsed._meta.strategy || this.strategy;
          registry = parsed.accounts || {};
        } else {
          registry = parsed;
        }
      } catch {}
    }

    // 3. Scan semua account json di ACCOUNTS_DIR
    const accountFiles = fs.readdirSync(ACCOUNTS_DIR).filter(f => f.endsWith(".json") && f !== "pool_registry.json");
    this.accounts = [];

    for (const file of accountFiles) {
      const filePath = path.join(ACCOUNTS_DIR, file);
      try {
        const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const email = raw.account?.email || raw.email || file.replace(".json", "");
        const id = raw.id || file.replace(".json", "");

        const meta = registry[id] || {
          id,
          email,
          createdAt: raw.createdAt || Date.now(),
          usageCount: 0,
          status: "active", // active | cooling_down | invalid
          lastUsed: null,
          cooldownUntil: 0
        };

        this.accounts.push({
          ...meta,
          filePath,
          raw
        });
      } catch (e) {
        console.error(`Gagal membaca akun ${file}:`, e.message);
      }
    }

    if (this.activeIndex >= this.accounts.length) {
      this.activeIndex = 0;
    }

    this.saveRegistry();
  }

  saveRegistry() {
    const accountsData = {};
    for (const acc of this.accounts) {
      accountsData[acc.id] = {
        id: acc.id,
        email: acc.email,
        createdAt: acc.createdAt,
        usageCount: acc.usageCount,
        status: acc.status,
        lastUsed: acc.lastUsed,
        cooldownUntil: acc.cooldownUntil
      };
    }
    const payload = {
      _meta: {
        activeIndex: this.activeIndex,
        strategy: this.strategy,
        updatedAt: Date.now()
      },
      accounts: accountsData
    };
    fs.writeFileSync(this.dbFile, JSON.stringify(payload, null, 2), "utf-8");
  }

  setStrategy(strategy) {
    if (["FAILOVER_ONLY", "ROUND_ROBIN", "LEAST_USED"].includes(strategy)) {
      this.strategy = strategy;
      this.saveRegistry();
      console.log(`[Pool] Strategi rotasi diubah ke: ${strategy}`);
      return true;
    }
    return false;
  }

  listAccounts() {
    this.syncAccounts();
    const now = Date.now();
    return this.accounts.map((a, idx) => {
      const isCooldown = a.status === "cooling_down" && a.cooldownUntil > now;
      const cooldownRemainingSec = isCooldown ? Math.max(0, Math.round((a.cooldownUntil - now) / 1000)) : 0;
      return {
        index: idx,
        id: a.id,
        email: a.email,
        status: isCooldown ? "cooling_down" : "active",
        usageCount: a.usageCount || 0,
        lastUsed: a.lastUsed ? new Date(a.lastUsed).toLocaleString() : "Never",
        lastUsedRaw: a.lastUsed || 0,
        cooldownRemainingSec,
        isActive: idx === this.activeIndex
      };
    });
  }

  getStats() {
    const list = this.listAccounts();
    const activeCount = list.filter(a => a.status === "active").length;
    const cooldownCount = list.filter(a => a.status === "cooling_down").length;
    const totalUsage = list.reduce((sum, a) => sum + a.usageCount, 0);
    const activeAccount = this.accounts[this.activeIndex] || null;

    return {
      totalAccounts: list.length,
      activeAccounts: activeCount,
      cooldownAccounts: cooldownCount,
      totalUsage,
      strategy: this.strategy,
      currentAccount: activeAccount ? activeAccount.email : "Default Profile",
      currentIndex: this.activeIndex
    };
  }

  getActiveAccount() {
    if (this.accounts.length === 0) return null;
    const now = Date.now();

    // Pulihkan status akun yang cooldown-nya sudah selesai
    for (const acc of this.accounts) {
      if (acc.status === "cooling_down" && now > (acc.cooldownUntil || 0)) {
        acc.status = "active";
        acc.cooldownUntil = 0;
      }
    }

    if (this.strategy === "LEAST_USED") {
      // Pilih akun berstatus active dengan usageCount terendah
      const available = this.accounts
        .map((acc, idx) => ({ acc, idx }))
        .filter(item => item.acc.status === "active");

      if (available.length > 0) {
        available.sort((a, b) => (a.acc.usageCount || 0) - (b.acc.usageCount || 0));
        this.activeIndex = available[0].idx;
        this.saveRegistry();
        return available[0].acc;
      }
    } else if (this.strategy === "ROUND_ROBIN") {
      // Cari akun aktif mulai dari activeIndex
      for (let offset = 0; offset < this.accounts.length; offset++) {
        const checkIdx = (this.activeIndex + offset) % this.accounts.length;
        const candidate = this.accounts[checkIdx];
        if (candidate.status === "active") {
          this.activeIndex = checkIdx;
          this.saveRegistry();
          return candidate;
        }
      }
    } else {
      // FAILOVER_ONLY: Tetap di akun aktif selama statusnya active
      const current = this.accounts[this.activeIndex];
      if (current && current.status === "active") {
        return current;
      }
      // Jika akun aktif cooldown, cari fallback akun active pertama yang ditemukan
      for (let i = 0; i < this.accounts.length; i++) {
        if (this.accounts[i].status === "active") {
          this.activeIndex = i;
          this.saveRegistry();
          return this.accounts[i];
        }
      }
    }

    return null;
  }

  async applyAccountToCdp(cdpSession, account) {
    if (!account || !account.raw) return false;
    const cookies = account.raw.cookies || [];
    if (cookies.length === 0) return false;

    console.log(`\n[Pool] Mengaktifkan akun: ${account.email} (ID: ${account.id})...`);
    await cdpSession.clearCookies();
    await cdpSession.injectCookies(cookies);
    await cdpSession.navigateTo("https://www.perplexity.ai/", 2000);
    console.log(`[Pool] Akun ${account.email} berhasil di-inject ke browser.`);
    return true;
  }

  async rotateToNext(cdpSession) {
    if (this.accounts.length <= 1) {
      console.log("[Pool] Hanya ada 1 akun di pool, tidak dapat rotasi.");
      return null;
    }

    this.activeIndex = (this.activeIndex + 1) % this.accounts.length;
    this.saveRegistry();
    const nextAcc = this.accounts[this.activeIndex];
    if (cdpSession) {
      await this.applyAccountToCdp(cdpSession, nextAcc);
    }
    return nextAcc;
  }

  markLimit(account, cooldownMinutes = 240) {
    if (!account) return;
    account.status = "cooling_down";
    account.cooldownUntil = Date.now() + cooldownMinutes * 60 * 1000;
    console.log(`[Pool] Akun ${account.email} masuk mode COOLDOWN (${cooldownMinutes} menit) karena limit.`);
    this.saveRegistry();
  }

  resetCooldown(id) {
    const acc = this.accounts.find(a => a.id === id);
    if (acc) {
      acc.status = "active";
      acc.cooldownUntil = 0;
      this.saveRegistry();
      console.log(`[Pool] Cooldown untuk akun ${acc.email} telah di-reset.`);
      return true;
    }
    return false;
  }

  deleteAccount(id) {
    const idx = this.accounts.findIndex(a => a.id === id);
    if (idx !== -1) {
      const acc = this.accounts[idx];
      try {
        if (fs.existsSync(acc.filePath)) {
          fs.unlinkSync(acc.filePath);
        }
      } catch {}
      this.accounts.splice(idx, 1);
      if (this.activeIndex >= this.accounts.length) {
        this.activeIndex = Math.max(0, this.accounts.length - 1);
      }
      this.saveRegistry();
      return true;
    }
    return false;
  }

  markSuccess(account) {
    if (!account) return;
    account.usageCount = (account.usageCount || 0) + 1;
    account.lastUsed = Date.now();
    this.saveRegistry();

    // Jika strategi ROUND_ROBIN, majukan index untuk request berikutnya
    if (this.strategy === "ROUND_ROBIN" && this.accounts.length > 1) {
      this.activeIndex = (this.activeIndex + 1) % this.accounts.length;
      this.saveRegistry();
    }
  }
}
