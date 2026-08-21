# ⚡ SNAP — Substack Notes Authoring & Analytics Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-v18+-green.svg)](https://nodejs.org/)

**SNAP** (Substack Notes Authoring Platform) is a unified, 100% TypeScript CLI toolset for creating, publishing, clustering, monitoring, and managing Substack Notes.

Designed as an open-source tool with a decoupled storage engine, SNAP stores all private user data, databases, and session cookies in a local hidden directory (`~/.snap/`), keeping the codebase clean, portable, and ready for integration into web applications or deployment as a global CLI.

> 📘 **Technical Architecture & Data Specs**: For low-level details on ProseMirror JSON payloads, REST API headers, and database interfaces, read the [Technical Specification (spec.md)](spec.md).

---

## ✨ Features

- **🌐 Browser Extractor V2**: High-res resilience DOM extractor script (`extract_v2.js`) that captures notes, hashtags, restack quotes, and author signatures directly from Substack profile pages.
- **📥 Intelligent Data Normalizer**: Parses raw browser DOM text dumps into clean, strongly typed `NoteItem` JSON databases.
- **🏷️ Topic Management & Content Clustering Engine**: Automatically groups notes into semantic topic clusters (e.g. AI Payments, Forex & Macro, Startup Horizons, Systems Bottlenecks, Software Evolution) and generates actionable **Future Post Ideas** per cluster.
- **✍️ Note Authoring & ProseMirror Generator**: Preview note character length (~1000 limit check), hashtag suggestions, and Substack ProseMirror JSON payload structures.
- **🔐 Substack Authenticated API Publisher**: Direct live publishing engine using session cookie authentication (`substack.sid`), with dry-run mode safeguards.
- **🔒 Decoupled Storage Architecture**: Clean separation between code and state using `StorageAdapter` pattern. Defaults to hidden directory `~/.snap/db.json`.

---

## 🚀 Installation & NPM Linking

### Option A: Install & Link Globally via NPM
Clone the repository and link the CLI executable globally:

```bash
git clone https://github.com/funmu/substack-snap.git
cd substack-snap
npm install
npm link
```

After linking, run `snap` from anywhere in your terminal:

```bash
snap help
```

### Option B: Run locally via NPX / TSX
Without linking globally:

```bash
npx tsx cli.ts help
```

---

## 📋 Command Line Interface (CLI)

```bash
snap <command> [options]
```

### Commands

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `snap ingest` | `<file.json>` | Ingest & normalize raw browser JSON extract into `~/.snap/db.json` |
| `snap topics` | None | Display topic clusters, note density, and AI future post ideas |
| `snap list` | `[--topic <name>] [--search <query>]` | List and filter notes inventory with hashtag highlights |
| `snap create` | `--body "<text>" [--publish]` | Draft/preview a note (add `--publish` for live post) |
| `snap auth` | `[--set <token>] [--handle <handle>]` | Configure Substack `substack.sid` session token |
| `snap export` | None | Export clean note inventory & topic cards to `~/.snap/exports/` |

---

## 💡 Quickstart Workflow

### 1. Extract your Substack Notes inventory
1. Go to your Substack Profile page (e.g., `https://substack.com/@yourusername/notes`).
2. Scroll down to load historical notes.
3. Open Browser DevTools Console (`Cmd + Option + J` or `F12`), paste the contents of `extract_v2.js`, and press Enter.
4. It will download `substack_notes_inventory.json`.

### 2. Ingest notes into SNAP data store
```bash
snap ingest path/to/substack_notes_inventory.json
```
*Output:*
```
⚡ SNAP — Substack Notes Authoring Platform (v1.0.0)
📂 Data Store: /Users/username/.snap
====================================================
📥 Ingesting raw Substack notes...
✅ Successfully ingested 149 notes! Total notes in SNAP DB: 149
📁 Saved to backend data store: /Users/username/.snap/db.json
```

### 3. View Topic Clusters & Content Inspiration
```bash
snap topics
```
*Output:*
```
📊 SNAP Topic Management & Clusters (6 clusters)
=======================================================
1. 📂 AI, Tollbooths & Payments [ai-payments]
   Notes in Cluster: 5
   Keywords: stripe, tolls, tollbooth, payments, tokens, openrouter
   💡 Future Note Ideas:
      - Analyze the evolution of AI token economics and payment infrastructure over the past quarter.
      - How AI routing layers capture more value than raw model providers.
...
```

### 4. Draft & Preview a New Note
```bash
snap create --body "Stripe and OpenRouter are building the financial rail for AI agents. #AI #stripe"
```

---

## 🔑 Authentication Guide (`substack.sid`)

To publish live notes and sync private stats:
1. Log into `https://substack.com` in Google Chrome.
2. Open Chrome Developer Tools (`Cmd + Option + I`).
3. Select **Application** -> **Cookies** -> `https://substack.com`.
4. Locate cookie `substack.sid` and copy its value (starts with `s%3A...`).
5. Configure SNAP:
   ```bash
   snap auth --set "s%3A..." --handle "yourusername"
   ```
   Or export environment variables:
   ```bash
   export SUBSTACK_SESSION_ID="s%3A..."
   export SUBSTACK_HANDLE="yourusername"
   ```

---

## 🏛️ System Architecture

```
tools/snap/
├── README.md           # Open-source package documentation & CLI guide
├── spec.md             # Technical design specification & architecture details
├── LICENSE             # MIT License
├── package.json        # NPM package specification & bin link
├── bin/
│   └── snap.js         # CLI executable entry point
└── src/
    ├── index.ts        # Programmatic library entry point
    ├── store.ts        # StorageAdapter interface & FileStorageAdapter
    ├── types.ts        # TypeScript interfaces (NoteItem, TopicCluster)
    ├── ingest.ts       # Ingestion engine & data normalizer
    ├── topics.ts       # Topic management & clustering engine
    ├── auth.ts         # Session configuration & instructions
    ├── publisher.ts    # Substack ProseMirror API publisher
    ├── cli.ts          # Interactive CLI controller
    └── extract_v2.js   # Browser DOM extractor script
```

### Data Storage Directory (`~/.snap/`)
User state is completely separated from code:
- `~/.snap/db.json` — Normalized notes database
- `~/.snap/config.json` — Session credentials & user handle
- `~/.snap/exports/` — Generated exports

To specify a custom data directory:
```bash
snap topics --data-dir ./my-data
# or set environment variable
export SNAP_DATA_DIR="./my-data"
```

---

## 📦 Programmatic Library Usage

In addition to the CLI, SNAP can be imported directly into Node.js, Express, Next.js, or React applications:

```typescript
import { FileStorageAdapter, ingestRawInventory, buildTopicClusters } from 'substack-snap';

// Load or ingest notes programmatically
const notes = ingestRawInventory('samples/sample_notes.json');

// Build semantic topic clusters
const clusters = buildTopicClusters(notes);
console.log(clusters);

// Save to custom storage engine
const storage = new FileStorageAdapter('./custom-store');
await storage.saveDB({ version: '1.0.0', last_updated: new Date().toISOString(), notes, clusters });
```

---

## 🤝 Contributing & License

Contributions are welcome! Please read the [Contributing Guidelines (CONTRIBUTING.md)](CONTRIBUTING.md) for details on developer setup, typechecking, and issue templates.

This project is licensed under the [MIT License](LICENSE).
