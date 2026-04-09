# Architecture

**Analysis Date:** 2026-04-09

## Pattern Overview

**Overall:** Client-side 2-Tier Architecture (Presentation & Business Logic). This is a serverless application that performs all processing in the browser using WebAssembly.

**Key Characteristics:**
- **Zero-Trust Client-Side Processing:** No files are uploaded to any server; all PDF decryption happens locally.
- **Separation of Concerns:** Clear boundary between DOM manipulation (`ui/`) and core PDF logic (`services/`).
- **Offline-First:** Implemented as a Progressive Web App (PWA) using Service Workers.

## Layers

**Presentation Layer (UI):**
- Purpose: Handles user interaction, DOM updates, and state visualization.
- Location: `ui/`
- Contains: `ui/app.js`, `ui/styles.css`, `index.html`.
- Depends on: `services/pdfService.js`, `JSZip` (external).
- Used by: End user.

**Business Logic Layer (Services):**
- Purpose: Orchestrates PDF processing, WebAssembly initialization, and file validation.
- Location: `services/`
- Contains: `services/pdfService.js`.
- Depends on: `qpdf-wasm` (external WASM module).
- Used by: `ui/app.js`.

**Persistence/Data Layer:**
- Purpose: Handled via browser-native APIs (File, Blob, URL). No persistent database is used.
- Location: Browser memory/Filesystem.
- Contains: `Blob` objects, `ArrayBuffer`.

## Data Flow

**PDF Unlocking Flow:**

1. **Input:** User drops a file or selects via input (`ui/app.js`).
2. **Validation:** UI layer checks file type and batch limits, then passes to `pdfService`.
3. **Processing:** `pdfService.js` validates magic bytes, writes to WASM virtual filesystem, runs `qpdf --decrypt`, and reads the result.
4. **Output:** 
    - Single file: `pdfService.js` triggers browser download.
    - Batch: `ui/app.js` collects Blobs into a ZIP using `JSZip` and then triggers download.

**State Management:**
- UI state (processing, success, error) is managed via the `updateStatus` function in `ui/app.js`.
- Service state (isProcessing) is internal to the `pdfService` module.

## Key Abstractions

**pdfService Module:**
- Purpose: Encapsulates the complexity of WebAssembly and QPDF commands.
- Examples: `services/pdfService.js`
- Pattern: Revealing Module Pattern (IIFE).

**Queue Manager:**
- Purpose: Handles sequential processing of multiple files to prevent browser memory exhaustion.
- Examples: `processQueue` function in `ui/app.js`.

## Entry Points

**Web Entry:**
- Location: `index.html`
- Triggers: Browser load.
- Responsibilities: Loads scripts, defines the UI structure, and sets Content Security Policy.

**Service Worker:**
- Location: `sw.js`
- Triggers: Install/Fetch events.
- Responsibilities: Caches App Shell and external dependencies for offline use.

## Error Handling

**Strategy:** Callback-based status updates.

**Patterns:**
- **UI Callbacks:** The `pdfService.processFile` method accepts an `onStatus` callback to update the UI in real-time.
- **Graceful Failures:** Catches WASM initialization errors (e.g., CSP blocks) and provides user-friendly fallback messages.

## Cross-Cutting Concerns

**Logging:** Uses standard `console.log` and `console.error`, often wrapped in mocks during testing.
**Validation:** 
- File type validation in `ui/app.js`.
- PDF Magic-byte validation in `services/pdfService.js`.
- File size limits (100MB per file, 150MB total batch for ZIP).
**Security:**
- Content Security Policy (CSP) in `index.html`.
- Subresource Integrity (SRI) for external scripts and WASM binaries.
- Secure memory handling (zeroing buffers after use).

---

*Architecture analysis: 2026-04-09*
