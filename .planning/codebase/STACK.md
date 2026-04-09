# Technology Stack

**Analysis Date:** 2025-02-14

## Languages

**Primary:**
- JavaScript (ES6+) - Used for UI logic (`ui/app.js`), service layer (`services/pdfService.js`), and service worker (`sw.js`).

**Secondary:**
- HTML5 - Page structure and semantic markup (`index.html`).
- CSS3 - UI styling, theme support, and responsive design (`ui/styles.css`).

## Runtime

**Environment:**
- Browser (Client-side only). No server-side components.

**Package Manager:**
- npm 10.x (dev environment)
- Lockfile: `package-lock.json` present.

## Frameworks

**Core:**
- Vanilla JavaScript - No UI framework (React/Vue/etc.) used. Direct DOM manipulation.

**Testing:**
- Vitest ^4.0.18 - Unit and integration testing (`tests/pdfService.test.js`).
- JSDOM ^28.1.0 - Simulating browser environment for tests.

**Build/Dev:**
- Native ES Modules and classic script tags.

## Key Dependencies

**Critical:**
- `@neslinesli93/qpdf-wasm` v0.3.0 - Core PDF processing engine, powered by WebAssembly. Loaded via unpkg CDN.
- `jszip` v3.10.1 - Used for batching multiple unlocked files into a single ZIP archive. Loaded via unpkg CDN.

**Infrastructure:**
- Service Workers - PWA support and offline capabilities (`sw.js`).

## Configuration

**Environment:**
- Browser-based. No `.env` or build-time environment variables used.
- `manifest.json` - PWA manifest configuration.

**Build:**
- `vitest.config.mjs` - Configuration for the Vitest test runner.

## Platform Requirements

**Development:**
- Node.js (for running tests).

**Production:**
- Modern browser with WebAssembly support.
- Service Worker support for offline functionality.

---

*Stack analysis: 2025-02-14*
