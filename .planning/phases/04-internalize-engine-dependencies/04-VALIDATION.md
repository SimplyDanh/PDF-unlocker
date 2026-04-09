# Phase 04 Validation Protocol: Internalize Engine Dependencies

## Overview
This protocol defines the verification steps for Phase 04, ensuring that all external engine dependencies have been successfully internalized, cached for offline use, and protected by Subresource Integrity (SRI) validation.

## 🏁 Phase Goals
1.  **Zero External Dependencies:** No runtime calls to CDNs (e.g., unpkg.com).
2.  **Local Asset Hosting:** Assets stored in `assets/vendor/`.
3.  **SRI Continuity:** Integrity checks maintained for the engine core.
4.  **Offline-First Stability:** PWA functions correctly without internet access.

---

## 🧪 Verification Scenarios

### 1. Dependency Analysis (Network Isolation)
**Objective:** Confirm no external requests are made to unpkg.com.
- **Steps:**
    1.  Open Chrome DevTools -> Network tab.
    2.  Check "Disable cache".
    3.  Reload the application.
    4.  Filter by `unpkg.com`.
- **Expected Result:** Zero requests matched. All scripts (`jszip.min.js`, `qpdf.js`) and the WASM binary (`qpdf.wasm`) are loaded from the local server.

### 2. Functional Verification
**Objective:** Ensure PDF unlocking still works with local assets.
- **Steps:**
    1.  Upload a restricted PDF.
    2.  Wait for processing.
    3.  Download the unlocked file.
- **Expected Result:** Unlocking succeeds, and the downloaded file is a valid PDF.

### 3. SRI Integrity Protection (Security)
**Objective:** Verify that tampering with local files triggers the security block.
- **Steps:**
    1.  Manually modify one byte in `assets/vendor/qpdf/qpdf.wasm`.
    2.  Reload the application and check the UI status.
- **Expected Result:** The UI displays a "Security Error: WASM binary integrity check failed." message. Processing is blocked.

### 4. Offline Capability (PWA)
**Objective:** Verify the Service Worker caches local vendor assets.
- **Steps:**
    1.  Load the app once to install the Service Worker.
    2.  Open DevTools -> Network tab -> Check "Offline".
    3.  Reload the application.
- **Expected Result:** The application loads successfully. DevTools shows assets served "(from ServiceWorker)".

---

## 📈 Automated Test Suite
Run the following command to verify the worker's integration and SRI handling:

```bash
npm test tests/pdfWorker.test.js
```

**Required Pass Rate:** 100%

---

## ✅ Final Checklist
- [ ] `assets/vendor/` contains all necessary files.
- [ ] `index.html` CSP `script-src` does not contain `unpkg.com`.
- [ ] `sw.js` `ASSETS_TO_CACHE` includes all local vendor paths.
- [ ] `services/pdfWorker.js` uses `fetch(wasmUrl, { integrity: sriHash })`.
- [ ] All tests pass.
