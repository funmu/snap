# Issue #001: Implement Playwright / Puppeteer Headless Engine for Substack Notes Publishing

## 📌 Summary
Direct HTTP requests (`POST https://substack.com/api/v1/comment/feed`) issued via standard Node.js HTTP clients (`fetch`, `axios`) are intercepted by **Cloudflare Enterprise Bot Management** via **JA3/JA4 TLS Fingerprinting**, resulting in `HTTP 403 Forbidden` responses.

To achieve 100% automated live publishing via `snap create --publish`, SNAP needs a headless browser automation driver using **Playwright** or **Puppeteer**.

---

## 🎯 Objectives & Requirements

1. **Browser Context Execution**:
   - Integrate `@playwright/test` or `puppeteer-extra-plugin-stealth` as an optional publisher engine in `src/publisher.ts`.
   - Launch a headless Chromium instance with active session cookies (`substack.sid`) or user browser profile context.
   
2. **Bypass Cloudflare TLS Fingerprinting**:
   - Execute `fetch('/api/v1/comment/feed')` or interact with Substack's web UI editor directly within the real Chromium browser page context.

3. **CLI Integration**:
   - Add flag `--engine [fetch|playwright]` to `snap create`.
   - Default to `--engine playwright` when `--publish` is specified if Playwright is installed.

4. **Fallback & Graceful Error Handling**:
   - If Playwright/Puppeteer is not installed, output a friendly prompt asking the user to run `npm install playwright` or use the in-browser console dispatcher snippet.

---

## 🛠️ Proposed Architecture & Code Location
- Add module `src/browser_publisher.ts` wrapping Playwright page context execution.
- Export `publishNoteViaBrowser({ body, sessionToken, handle })` from `src/index.ts`.
- Update `src/publisher.ts` to route live publication through `browser_publisher.ts`.

---

## 📋 Tasks & Checklist
- [ ] Add `playwright` or `puppeteer-core` as an optional dependency in `package.json`.
- [ ] Implement `src/browser_publisher.ts` with session cookie injection (`substack.sid`).
- [ ] Test headless note creation on `https://substack.com/notes`.
- [ ] Add unit/integration tests and update CLI documentation.
