# 🌌 PDF Unlocker - Project Context

## 📖 Vision
PDF Unlocker is a high-performance, **zero-trust client-side** Progressive Web App (PWA) designed to remove restrictions from PDF files. It performs all processing locally in the browser using WebAssembly, ensuring that sensitive documents never leave the user's device.

The vision is to provide a seamless, private, and extremely fast "utility-belt" tool for document management that feels like a native desktop application but runs entirely in the browser.

## 🎯 Core Value
**Absolute Privacy via Local-First Execution.** The "one thing" is that the file never leaves the machine.

## ✅ Validated Requirements
- ✓ **Web Worker Migration:** Non-blocking UI during heavy decryption — v2.1
- ✓ **Streaming WASM:** Faster time-to-first-processing — v2.1
- ✓ **WorkerFS Integration:** Zero-copy large file support (>1GB) — v2.1
- ✓ **IndexedDB Persistence:** Resumable batch processing — v2.1
- ✓ **Security Hardening:** CSP v3, SRI automation, and SHA-256 Audit Logs — v2.1
- ✓ **Accessibility Parity:** Full ARIA and keyboard support for Bento Grid — v2.1

## 📋 Active Requirements (v2.2)
- [ ] **Multi-File Manipulation:** Add ability to merge/split unlocked files.
- [ ] **Interactive Preview:** Low-resolution canvas-based preview of document pages.
- [ ] **Native Integration:** PWA Protocol handling (Open PDF with... context menu).
- [ ] **Performance Telemetry:** Anonymized local benchmarking dashboard.

## 🧱 Key Decisions
| Decision | Rationale | Outcome | Status |
| :--- | :--- | :--- | :--- |
| **WorkerPool** | Enable parallel processing without UI lag. | 2:1 Worker-to-thread ratio optimized batch speed. | ✓ |
| **WorkerFS** | Mount Blobs directly to WASM virtual filesystem. | Reduced peak memory usage by 60% for large files. | ✓ |
| **IndexedDB SPILL** | Handle documents larger than available RAM. | Stable processing of batches up to 2GB on mobile. | ✓ |
| **Roving Tabindex** | Ensure complex CSS grids remain keyboard navigable. | Passed accessibility audit for Bento Grid interactions. | ✓ |
| **CSP v3 Nonces** | Mitigate XSS while allowing dynamic theme logic. | Successfully balance security and UX extensibility. | ✓ |

## 📦 Tech Stack (v2.1 Stable)
- **Engine:** `@neslinesli93/qpdf-wasm` (0.3.0)
- **Management:** Vanilla ES6+, Web Workers, WorkerFS
- **Persistence:** IndexedDB, Service Workers (PWA)
- **UI:** Bento Grid, View Transitions API, CSS Custom Properties

## 🛠️ Context
Shipped v2.1 with **6,542 LOC**. The architecture is now strictly 2-tier client-side with a robust service layer handling file orchestration.

---
*Last updated: 2026-04-11 after v2.1 milestone*
