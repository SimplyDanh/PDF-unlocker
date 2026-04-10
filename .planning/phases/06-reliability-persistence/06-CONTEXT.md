# Phase 06 Context: Reliability & Persistence

## 📖 Overview
Phase 06 addresses the "Session Volatility" and "OOM Risks" associated with processing large PDF batches in a web environment. By introducing IndexedDB-backed persistence and chunked worker communication, we ensure the application remains stable even under extreme loads and survives transient interruptions.

## 🎯 Requirements
- **REQ-6.1:** Persistent Job Queue (IndexedDB storage for active batches).
- **REQ-6.2:** Chunked Output Streaming (Spillover large buffers to IndexedDB).
- **REQ-6.3:** Resume UX (Restore state on page reload/re-entry).
- **REQ-6.4:** Memory Safety Audit (Flush buffers to disk for 1GB+ outputs).

## 🏗️ Architectural Impact
- **Services:** New `persistenceService.js` to manage IndexedDB.
- **Workers:** Enhanced `pdfWorker.js` with chunked read/write logic.
- **UI:** New recovery state in `app.js` and notification component for resuming jobs.

## 🛡️ Security Constraints
- All data stored in IndexedDB remains strictly local.
- No sensitive document content is ever sent to a server.
- Decrypted outputs are only persisted temporarily if the user has not yet downloaded them or if a batch is active.

## 📅 Roadmap Alignment
- Previous phases established the engine, worker pool, large file support (WorkerFS), and security.
- This phase hardens these features for production-grade reliability.
