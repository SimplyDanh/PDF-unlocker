# External Integrations

**Analysis Date:** 2025-02-14

## APIs & External Services

**CDN Services:**
- Unpkg - Primary distribution network for third-party libraries:
  - `jszip@3.10.1`
  - `@neslinesli93/qpdf-wasm@0.3.0` (JS wrapper and WASM binary)
- Google Fonts - Typography services:
  - `Inter`
  - `Outfit`
  - Auth: None (Public API)

## Data Storage

**Databases:**
- None (Stateless architecture).

**File Storage:**
- Local Filesystem (WASM Virtual FS): Temporary storage for PDF processing.
- Browser Memory (Blobs): For creating and triggering downloads.
- localStorage: Used for persisting user theme preference (`dark` or `light`).

**Caching:**
- Service Worker Cache (`pdf-unlocker-v2`): Offline support for application shell and external libraries (`sw.js`).
- Strategy: Network-First (updates cache on every successful fetch, falls back to cache when offline).

## Authentication & Identity

**Auth Provider:**
- None. This tool is strictly anonymous and client-side.

## Monitoring & Observability

**Error Tracking:**
- Local console logging only (`console.log`, `console.error`).

**Logs:**
- Browser console.

## CI/CD & Deployment

**Hosting:**
- GitHub Pages (implied by repository structure and README).

**CI Pipeline:**
- GitHub Actions: `.github/workflows/test.yml` runs Vitest tests on push/PR.

## Environment Configuration

**Required env vars:**
- None.

**Secrets location:**
- Not applicable (no server-side secrets).

## Webhooks & Callbacks

**Incoming:**
- None.

**Outgoing:**
- None.

---

*Integration audit: 2025-02-14*
