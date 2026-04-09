# Phase 4: Internalize Engine Dependencies - Research

**Researched:** 2026-04-09
**Domain:** Dependency Management / Frontend Asset Localization
**Confidence:** HIGH

## Summary

The objective of this phase is to remove reliance on external CDNs (unpkg.com) for engine-critical assets (JSZip, QPDF-WASM). This improves privacy, reliability in offline scenarios, and security posture by fully controlling the asset delivery pipeline and eliminating third-party dependency trust.

**Primary recommendation:** Create a `/vendor` directory, download all target assets, and update the application build path, CSP, Service Worker, and Web Worker configurations to load from the local `vendor/` path.

## Standard Stack

### Local Vendor Structure
| Asset | Target Path | Purpose |
|-------|-------------|---------|
| jszip.min.js | `vendor/jszip.min.js` | Batch ZIP generation |
| qpdf.js | `vendor/qpdf.js` | QPDF WASM wrapper |
| qpdf.wasm | `vendor/qpdf.wasm` | QPDF WASM binary |

## Architecture Patterns

### Pattern: Worker Dependency Loading
Web Workers operate in their own context. When shifting from absolute URL loading (unpkg) to relative path loading (`./vendor/...`), relative paths in `importScripts` and `locateFile` MUST be resolved correctly against the worker's base URL (the origin).

**Example:**
```javascript
// pdfWorker.js update
importScripts('./vendor/qpdf.js');

// ...
Module({
    locateFile: (path) => `./vendor/${path}`,
    // ...
});
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dependency Management | Custom scripts to update versions | Manual vendor update (for now) | The project is a "buildless vanilla project" (per GEMINI.md). Keeping it simple is better than adding a complex build chain. |

## Common Pitfalls

### 1. MIME Type Mismatch
Browsers are strict about MIME types for WASM files (`application/wasm`). Ensure the local server/hosting environment provides correct headers when serving the `vendor/` directory.

### 2. SRI Compatibility
Since SRI hashes are calculated for the exact binary, they must be recalculated once the assets are moved to a local path or verified against the exact bytes of the downloaded file. 
*Correction:* If SRI is strictly enforced, you MUST re-verify the hash for the local file.

### 3. Service Worker Cache
The Service Worker `ASSETS_TO_CACHE` constant currently contains absolute URLs. These must be updated to local paths to avoid caching conflicts or issues when the CDN becomes unavailable or the assets are removed from the manifest.

## Environment Availability

**No external dependencies were identified that require a fallback.** The system will transition from CDN-hosted dependencies to local assets, increasing overall robustness.

## Validation Architecture

### Wave 0 Gaps
- [ ] Ensure `vendor/` is added to git and not ignored.
- [ ] Verify `index.html` CSP updates allow `script-src 'self'`.
- [ ] Verify `sw.js` caches the new `vendor/` assets correctly.
- [ ] Verify `pdfWorker.js` `importScripts` correctly loads the local file.

## Sources

### Primary (HIGH confidence)
- Project GEMINI.md - Architecture and Tech Stack requirements
- `services/pdfWorker.js` - Existing WASM loading logic
- `index.html` - CSP rules
- `sw.js` - Cache strategy

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH
- Architecture: HIGH
- Pitfalls: HIGH

**Research date:** 2026-04-09
**Valid until:** 2026-05-09
