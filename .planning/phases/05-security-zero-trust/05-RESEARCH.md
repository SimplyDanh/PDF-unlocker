# Research: Phase 05 - Advanced Security & Zero-Trust Hardening

This document outlines the technical research and recommended implementation patterns for the final hardening phase of the PDF Unlocker project.

## 🛡️ Standard Stack
- **Web Crypto API**: Native browser API for high-performance hashing (SHA-256).
- **IndexedDB**: Structured client-side storage for the Audit Log.
- **CSP Level 3**: Using hashes and strict source lists for environments without dynamic nonce generation.
- **Subresource Integrity (SRI)**: Cryptographic hashes for all local assets to ensure build integrity.

## 🏛️ Architecture Patterns

### 1. Worker-Based Hashing (REQ-5.4)
To maintain the project's performance goals, cryptographic hashing of output PDFs should occur within the `pdfWorker.js`. This prevents the "Success" state from freezing the UI thread for 100MB+ files.
- **Pattern:** The worker will generate the SHA-256 hash immediately after QPDF writes the output buffer.
- **API:** `crypto.subtle.digest('SHA-256', outputBuffer)`

### 2. Service-Layer Persistence (REQ-5.3)
A new `AuditService.js` will encapsulate all IndexedDB interactions. 
- **Pattern:** Using a singleton service to log events from `pdfService` and `batchService`.
- **Storage:** A dedicated Database versioned with the app (e.g., `PDF_UNLOCKER_DB`, version 1).

### 3. Static SRI Management (REQ-5.1)
Since there is no build step, SRI hashes must be manually updated in `index.html`. 
- **Tooling:** A temporary `scripts/generate-sri.js` helper will be used during implementation to generate the base hashes for:
    - `ui/app.js`
    - `ui/styles.css`
    - `services/pdfService.js`
    - `services/batchService.js`

## 🚫 Don't Hand-Roll
- **Do not** use a custom hashing library. The `Web Crypto API` is globally supported by modern browsers and is faster/more secure than JS-based alternatives.
- **Do not** use `LocalStorage` for the Audit Log. It is limited to ~5MB and is synchronous (blocking). Use `IndexedDB`.

## ⚠️ Common Pitfalls

### 1. Hash Mismatch during Updates
Any change to the `.js` or `.css` files will break the app if SRI is enabled.
- **Mitigation:** The implementation plan MUST include a step to update hashes in `index.html` as the last task of any edit.

### 2. CSP vs. Google Fonts
The current CSP allows `https://fonts.googleapis.com`. To harden this further, we should consider downloading the fonts (Phase 4 scope) or ensuring the CSP correctly handles the font sources.
- **Finding:** We already allow both `googleapis` and `gstatic`. This is acceptable for now but SRI for these is not possible as they are dynamic.

### 3. IndexedDB in Private/Incognito Mode
Some browsers (or configurations) block IndexedDB in private mode.
- **Mitigation:** The `AuditService` should fail gracefully and allow the app to function without logging if the DB is unavailable.

## 📝 Implementation Strategy

### Task Breakdown
1. **Audit Engine:** Implement `services/auditService.js` (IndexedDB).
2. **Crypto Engine:** Update `services/pdfWorker.js` to calculate SHA-256 hashes for all output files.
3. **UI Integration:** 
    - Add "Verification Hash" to Bento Grid cards.
    - Add "Audit Log" viewer to the About Modal.
4. **Final Hardening:** Update `index.html` with hardened CSP (using hashes for any tiny inline scripts) and SRI for all local assets.

## 🔗 References
- [MDN: Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
- [MDN: Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Content Security Policy (CSP) Evaluator](https://csp-evaluator.withgoogle.com/)
