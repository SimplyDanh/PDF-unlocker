# Codebase Concerns

**Analysis Date:** 2025-02-17

## Tech Debt

**Modular Organization:**
- Issue: The project uses classic script tags and global state (`window.pdfService`, `JSZip`, `Module`) instead of ES modules. This makes dependency tracking harder and pollutes the global namespace.
- Files: `index.html`, `ui/app.js`, `services/pdfService.js`
- Impact: Harder to maintain as complexity grows; risk of global name collisions.
- Fix approach: Refactor to ES modules (`import`/`export`) and use a modern bundler or native browser module support.

**Hardcoded Configuration:**
- Issue: Constants like `MAX_FILE_SIZE_MB`, `MAX_BATCH_FILES`, and `ZIP_MEMORY_LIMIT_MB` are hardcoded in source files rather than being in a central config.
- Files: `services/pdfService.js`, `ui/app.js`
- Impact: Difficult to adjust limits based on environment or user feedback without code changes.
- Fix approach: Move configuration to a dedicated `config.js` or environment-based configuration.

**Logic in UI Layer:**
- Issue: `ui/app.js` contains a mix of DOM manipulation and queue management logic.
- Files: `ui/app.js`
- Impact: Harder to test the queue logic independently of the DOM.
- Fix approach: Extract the queue manager into a separate service (e.g., `services/queueService.js`).

## Security Considerations

**External Runtime Dependencies:**
- Issue: The application fetches the QPDF WASM binary and JSZip from external CDNs (`unpkg.com`) at runtime.
- Files: `services/pdfService.js`, `sw.js`
- Risk: If the CDN is compromised or unavailable, the core functionality breaks. While SRI is used, it's still a single point of failure and a privacy concern (leaking usage to CDNs).
- Current mitigation: Subresource Integrity (SRI) and Service Worker caching.
- Recommendations: Bundle the WASM and library files locally with the application to ensure complete independence and privacy.

**Sensitive Data in Memory:**
- Issue: PDFs are decrypted and stored in the browser's memory and the Emscripten virtual filesystem.
- Files: `services/pdfService.js`
- Risk: Sensitive documents could potentially be recovered from browser memory dumps or swap files if the process is interrupted before zeroing out.
- Current mitigation: `uint8Array.fill(0)` and Emscripten FS cleanup.
- Recommendations: Use a dedicated Web Worker to isolate memory; research more robust ways to clear WASM memory if possible.

## Performance Bottlenecks

**Main Thread Blocking:**
- Issue: The WebAssembly execution for PDF decryption runs on the main browser thread.
- Files: `services/pdfService.js`, `ui/app.js`
- Cause: `qpdfModule.callMain` is a synchronous call that freezes the UI during processing.
- Improvement path: Move PDF processing to a Web Worker. Use `Comlink` or postMessage to communicate progress without blocking the UI.

**In-Memory File Limits:**
- Issue: The entire PDF file and its decrypted output must fit into the browser's available RAM.
- Files: `services/pdfService.js`, `ui/app.js`
- Cause: Reading files as `ArrayBuffer` and using the Emscripten `FS` (which is in-memory by default).
- Improvement path: For very large files, explore stream-based processing or OPFS (Origin Private File System) to avoid keeping the whole file in RAM.

**ZIP Compression Overhead:**
- Issue: Batch processing zips all files into a single archive in memory before downloading.
- Files: `ui/app.js`
- Cause: `JSZip` is used to build the blob in memory.
- Improvement path: Provide individual downloads for very large batches or use a streaming ZIP library if possible.

## Fragile Areas

**Browser WASM Restrictions:**
- Files: `services/pdfService.js`
- Why fragile: Some environments (corporate networks, strict CSPs) block WebAssembly execution or `wasm-unsafe-eval`.
- Safe modification: Ensure the application fails gracefully with clear user instructions (partially implemented with `wasmSupportStatus`).
- Test coverage: Partially tested, but E2E tests in restricted environments are missing.

## Missing Critical Features

**PDF Password Support:**
- Problem: The application currently cannot unlock PDFs that require a user password (it only handles owner-restricted files).
- Blocks: Users with password-protected files cannot use the tool.
- Fix approach: Implement a UI prompt to ask for a password when `callMain` fails or when encryption is detected.

**Offline Dependency Loading:**
- Problem: The Service Worker uses a "Network-First" strategy for assets including large WASM files.
- Blocks: Fast subsequent loads and true offline usage if the network is flaky but present.
- Fix approach: Change the SW strategy to "Cache-First" or "Stale-While-Revalidate" for static assets like WASM and library code.

## Test Coverage Gaps

**UI Integration:**
- What's not tested: Queue management logic, DOM updates, and error state transitions.
- Files: `ui/app.js`
- Risk: Regressions in the batching logic or UI state might go unnoticed.
- Priority: Medium

**Service Worker:**
- What's not tested: Caching behavior and offline functionality.
- Files: `sw.js`
- Risk: Updates to the service worker might break caching or prevent the app from loading offline.
- Priority: Low

---

*Concerns audit: 2025-02-17*
