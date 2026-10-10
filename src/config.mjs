import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, "..");
export const ACCOUNTS_DIR = path.resolve(ROOT_DIR, "accounts");
export const PUBLIC_DIR = path.resolve(ROOT_DIR, "public");
export const CREATOR_OUTPUTS_DIR = ACCOUNTS_DIR;

// Simple zero-dependency .env loader
function loadEnv() {
  const envPath = path.resolve(ROOT_DIR, ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

function detectChromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const platform = os.platform();
  if (platform === "win32") {
    const winPaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      path.join(os.homedir(), "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"),
      "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
    ];
    for (const p of winPaths) {
      if (fs.existsSync(p)) return p;
    }
    return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  } else if (platform === "darwin") {
    const macPaths = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
    ];
    for (const p of macPaths) {
      if (fs.existsSync(p)) return p;
    }
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  } else {
    // Linux
    const linuxPaths = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium"
    ];
    for (const p of linuxPaths) {
      if (fs.existsSync(p)) return p;
    }
    return "/usr/bin/google-chrome";
  }
}

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 8128,
  CDP_PORT: process.env.CDP_PORT ? parseInt(process.env.CDP_PORT, 10) : 9222,
  CHROME_PATH: detectChromePath(),
  PROFILE_DIR: process.env.PROFILE_DIR || path.resolve(ROOT_DIR, ".cdp_profile"),
  TARGET_URL: "https://www.perplexity.ai",
  ROTATION_STRATEGY: process.env.ROTATION_STRATEGY || "FAILOVER_ONLY", // FAILOVER_ONLY | ROUND_ROBIN | LEAST_USED
  AUTO_SPAWN_ON_EXHAUSTED: process.env.AUTO_SPAWN !== "false",
  MAX_QUERY_TIMEOUT_MS: 120000,
};
