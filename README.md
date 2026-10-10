<div align="center">

<img src="./assets/logo.png" alt="Open Perplexity Logo" width="130" height="130" style="border-radius: 28px;" />

# Open Perplexity Farm & Web Studio

**Self-Hosted Multi-Account AI Search Gateway, Academic Literature Synthesizer & OpenAI-Compatible REST API**

[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-black.svg?style=flat-square&logo=node.js)](https://nodejs.org/)
[![API Compatibility](https://img.shields.io/badge/API-OpenAI%20Compatible-0d9488.svg?style=flat-square)](https://platform.openai.com/docs/api-reference)
[![Chrome DevTools Protocol](https://img.shields.io/badge/Engine-Chrome%20CDP%20%289222%29-4285F4.svg?style=flat-square&logo=googlechrome)](https://chromedevtools.github.io/devtools-protocol/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-emerald.svg?style=flat-square)](https://github.com/itzluthfi/open-perplexity-farm/pulls)

[English](./README.md) • [Bahasa Indonesia](#ikhtisar-bahasa-indonesia) • [Dokumentasi API](#api-reference) • [Panduan Instalasi](#quick-start)

</div>

---

## Overview

**Open Perplexity Farm & Web Studio** is a production-grade, self-hosted search engine gateway and multi-account fleet orchestrator that bridges directly to the live Perplexity AI engine via the **Chrome DevTools Protocol (CDP)**.

It provides both a modern, high-contrast Web Studio interface and a standard OpenAI-compatible REST API (`/v1/chat/completions`), allowing you to use Perplexity's deep search, academic synthesis, and reasoning capabilities inside tools like **Cursor**, **LibreChat**, **NextChat**, **OpenCode**, or native Python/Node.js SDKs with zero API subscription cost and autonomous quota management.

---

## Interface Showcase

<div align="center">
  <img src="./assets/hasil-pencarian.png" alt="Open Perplexity Live Academic Research & Literature Cards" width="100%" style="border-radius: 12px; margin-bottom: 16px; border: 1px solid rgba(0,0,0,0.1);" />
</div>

<details open>
<summary><b>Click to expand full UI Gallery (Live Fleet Manager, Real-time Spawner, Academic Studio & Dark Mode)</b></summary>
<br />

| Academic Research & SINTA Journal Citations | Real-Time Fleet Account Spawner |
|:---:|:---:|
| <img src="./assets/hasil-pencarian.png" width="100%" alt="Live Academic Literature Cards" /> | <img src="./assets/proses-buat-akun.png" width="100%" alt="Real-Time Spawner Modal" /> |

| Search Studio Home | Fleet & Account Manager (Latency Ping) |
|:---:|:---:|
| <img src="./assets/preview-studio.png" width="100%" alt="Search Studio Light" /> | <img src="./assets/preview-fleet-manager.png" width="100%" alt="Fleet Manager" /> |

| Dynamic Markdown & Citations | Deep Research (High-Contrast Dark Mode) |
|:---:|:---:|
| <img src="./assets/preview-chat-academic.png" width="100%" alt="Dynamic Citations & Sourcing" /> | <img src="./assets/preview-dark-mode.png" width="100%" alt="Dark Mode Studio" /> |

</details>

---

## Key Features

- **Multi-Account Fleet Orchestration:**
  - Automated session pooling with sub-second failover when rate limits or quotas are hit.
  - Load balancing strategies: `FAILOVER_ONLY`, `ROUND_ROBIN`, and `LEAST_USED`.
  - Manual account switcher dropdown in the sidebar with live cookie injection into the CDP session.
  - Per-account and fleet-wide connection testing with real-time latency ping (`ms`).

- **Autonomous Account Spawner:**
  - Integrated batch generator capable of creating and validating disposable email accounts.
  - Real-time spawner progress modal with animated telemetry and log tracking.
  - Instant cookie harvesting and database synchronization.

- **Adaptive Academic & Web Studio UI:**
  - **Dynamic Response Formatting:** Non-destructive Markdown rendering that naturally adapts to any query type (code blocks, comparison tables, step-by-step guides, KaTeX math).
  - **Literature Cards (Consensus / SciSpace Style):** Automatically extracts citations and maps university/journal domains with relevance indicators.
  - **Interactive Citation Badges:** Converts numeric brackets (`[1]`, `[2]`) and domain tags (`[domain.org]`) into clickable pills.
  - **One-Click Code Copy:** Dedicated copy buttons for formatted code blocks.
  - **Theme System:** Crisp default light mode with high-contrast dark mode switch.
  - **Zero-Slop Design:** Compliant with strict antislop guidelines (pure SVGs, no decorative emojis, solid typography).

- **Standard OpenAI-Compatible Gateway:**
  - Exposes standard `/v1/chat/completions` endpoint.
  - Supports search focuses: `academic` (Google Scholar/Scopus prioritization), `web`, `writing`, `youtube`, and `reddit`.
  - Exposes underlying thinking/reasoning traces when using reasoning models.

---

## System Architecture

```mermaid
flowchart TD
    Client["Client (Web Studio / Cursor / OpenAI SDK / Agent)"] -->|HTTP Port 8128| Gateway["REST API Server & Web Studio"]
    Gateway --> Orchestrator["Account Fleet Orchestrator"]
    Orchestrator --> Strategy{"Load Balancing Strategy"}
    
    Strategy -->|Least-Used| AccA["Account A (Usage: 2)"]
    Strategy -->|Failover| AccB["Account B (Usage: 14)"]
    Strategy -->|Round-Robin| AccC["Account C (Active)"]
    
    AccC --> CDP["Chrome DevTools Protocol (Port 9222)"]
    CDP --> Browser["Chromium / Chrome Engine"]
    Browser --> Perplexity["Perplexity Live Engine"]
    
    Perplexity -->|Stream / Full Synthesis + Citations| Browser
    Browser -->|Extracted JSON Payload| Gateway
    Gateway -->|OpenAI Format Response| Client
```

---

## Quick Start

### 1. Prerequisites
- **Node.js**: `v18.0.0` or later.
- **Google Chrome** or **Chromium** browser.

### 2. Clone & Install
```bash
git clone https://github.com/itzluthfi/open-perplexity-farm.git
cd open-perplexity-farm
npm install
```

### 3. Launch Chrome with CDP
Start your Chrome instance with the remote debugging port enabled:

**Windows (PowerShell):**
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\chrome-cdp-profile"
```

**macOS:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="/tmp/chrome-cdp-profile"
```

**Linux / Headless Server:**
```bash
google-chrome --remote-debugging-port=9222 --user-data-dir="/tmp/chrome-cdp-profile" --headless=new --disable-gpu
```

### 4. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configuration parameters:
```env
PORT=8128
CDP_PORT=9222
CDP_HOST=127.0.0.1
ROTATION_STRATEGY=FAILOVER_ONLY
DEFAULT_MODEL=perplexity/sonar-web
```

### 5. Run the Server
```bash
# Start background web studio and API server
npm start

# Or launch the interactive Terminal UI (TUI)
npm run tui
```

Access the Web Studio at: **`http://localhost:8128`**

---

## Command Line Interface (CLI)

The repository includes a CLI tool at `bin/cli.mjs` for rapid administration:

```bash
# Check the fleet status of all registered accounts
node bin/cli.mjs pool

# Create 3 new accounts automatically
node bin/cli.mjs create 3

# Rotate active account
node bin/cli.mjs rotate

# Test connection of all accounts
node bin/cli.mjs verify

# Run a test search query directly from terminal
node bin/cli.mjs test "Multi-vendor network monitoring with SNMP and Telegram notifications"
```

---

## API Reference

### 1. Chat Completions
`POST /v1/chat/completions`

Standard OpenAI-compatible endpoint.

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer open-perplexity
```

**Request Body:**
```json
{
  "model": "perplexity/sonar-web",
  "focus": "academic",
  "messages": [
    {
      "role": "user",
      "content": "Jelaskan arsitektur Personal Extreme Programming (PXP) dan rekomendasikan jurnal terkait."
    }
  ],
  "stream": false
}
```

**Response Body:**
```json
{
  "id": "chatcmpl-1791643900000",
  "object": "chat.completion",
  "created": 1791643900,
  "model": "perplexity/sonar-web",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Personal Extreme Programming (PXP) adalah adaptasi dari Extreme Programming...",
        "thinking": ["Menganalisis metodologi agile untuk pengembang tunggal...", "Memverifikasi jurnal SINTA/IEEE..."]
      },
      "finish_reason": "stop"
    }
  ],
  "sources": [
    {
      "title": "Implementation of Personal Extreme Programming Method",
      "url": "https://journal.universitas.ac.id/index.php/article/view/102",
      "domain": "journal.universitas.ac.id"
    }
  ]
}
```

---

### 2. Fleet Management Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v1/accounts` | Returns all registered accounts, usage stats, and active state. |
| `POST` | `/v1/accounts/activate` | Immediately sets account ID as active and syncs cookies to CDP. |
| `POST` | `/v1/accounts/rotate` | Forces rotation to the next account in the pool. |
| `POST` | `/v1/accounts/verify` | Tests connectivity and session validity for a single account (`{ id }`). |
| `POST` | `/v1/accounts/verify-all` | Tests connection validity and measures latency for all accounts. |
| `POST` | `/v1/accounts/strategy` | Sets load-balancing strategy (`FAILOVER_ONLY`, `ROUND_ROBIN`, `LEAST_USED`). |
| `POST` | `/v1/accounts/spawn` | Spawns accounts in batches using disposable temp-mail fleet. |
| `POST` | `/v1/accounts/delete` | Deletes an account from the pool (`{ id }`). |
| `GET` | `/health` | Health check probe for container orchestrators. |

---

## SDK Integration Examples

### Python (`openai` SDK)
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8128/v1",
    api_key="open-perplexity"
)

response = client.chat.completions.create(
    model="perplexity/sonar-web",
    messages=[
        {"role": "user", "content": "Rangkum perkembangan multi-vendor network monitoring 2024-2026."}
    ],
    extra_body={"focus": "academic"}
)

print(response.choices[0].message.content)
```

### TypeScript / Node.js
```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "http://localhost:8128/v1",
  apiKey: "open-perplexity",
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "perplexity/sonar-web",
    messages: [{ role: "user", content: "Apa perbedaan gRPC dan WebSocket dalam sistem IoT?" }],
  });

  console.log(completion.choices[0].message.content);
}

main();
```

---

<a name="ikhtisar-bahasa-indonesia"></a>
## Ikhtisar (Bahasa Indonesia)

**Open Perplexity Farm & Web Studio** adalah gateway pencarian cerdas mandiri (*self-hosted*) yang menghubungkan otomatis ke mesin live Perplexity melalui Chrome DevTools Protocol (CDP).

### Keunggulan Utama:
1. **Bebas Kuota Mandek**: Dilengkapi orkestrator armada akun otomatis dengan rotasi cerdas dan pembuat akun instan.
2. **REST API Standar OpenAI**: Kompatibel langsung dengan Cursor IDE, LibreChat, OpenCode, dan skrip Python/Node.js.
3. **Pencarian Akademik & Kartu Jurnal**: Menyaring otomatis referensi jurnal terverifikasi (SINTA, IEEE, repositori kampus) dilengkapi skor relevansi.
4. **Antarmuka Bersih & Cepat**: Desain modern kontras tinggi, mode terang/gelap, tanpa emoji berlebihan, dan responsif dari desktop hingga ponsel.

---

## Project Structure

```text
open-perplexity-farm/
├── assets/
│   ├── logo.png           # Official high-resolution Open Perplexity logo
│   └── logo.svg           # Clean scalable vector logo
├── bin/
│   ├── cli.mjs            # Command-line interface tool
│   └── tui.mjs            # Terminal User Interface dashboard
├── public/
│   ├── index.html         # Web Studio UI layout
│   ├── app.js             # Client state, dynamic markdown, and event handlers
│   ├── style.css          # Antislop styling, custom prose, and theme variables
│   ├── logo.png           # Web logo asset
│   └── logo.svg           # Vector favicon asset
├── src/
│   ├── server.mjs         # Express REST API & static server
│   ├── pool.mjs           # Account database, session state, and verification
│   ├── cdp.mjs            # Chrome DevTools Protocol client and query automator
│   └── spawner.mjs        # Disposable mail automator and account minter
├── .env.example           # Environment template
├── package.json           # Node.js dependencies and script definitions
└── README.md              # Project documentation
```

---

## Contributing

Contributions are welcomed! Follow these steps:
1. Fork this repository.
2. Create a feature branch (`git checkout -b feature/my-enhancement`).
3. Commit your changes (`git commit -m "feat: add support for new focus mode"`).
4. Push to the branch (`git push origin feature/my-enhancement`).
5. Open a Pull Request.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
Built with precision for researchers, developers, and autonomous agent fleets.
</div>
