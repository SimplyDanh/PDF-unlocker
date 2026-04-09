---
phase: 04-internalize-engine-dependencies
plan: 1
type: execute
wave: 1
depends_on: ["01-engine-optimization"]
files_modified:
  - "assets/vendor/jszip.min.js"
  - "assets/vendor/qpdf/qpdf.js"
  - "assets/vendor/qpdf/qpdf.wasm"
  - "index.html"
  - "sw.js"
  - "services/pdfWorker.js"
  - "tests/pdfWorker.test.js"
autonomous: true
requirements: ["DEP-INT-01", "DEP-INT-02", "DEP-INT-03", "DEP-INT-04"]
must_haves:
  truths:
    - "Application loads and functions correctly without any external network calls to CDNs (DEP-INT-01)."
    - "The `jszip` library is loaded from the local `assets/vendor` directory (DEP-INT-01)."
    - "The `qpdf` WebAssembly module and its wrapper script are loaded from the local `assets/vendor/qpdf` directory (DEP-INT-01)."
    - "The `pdfWorker.js` validates the local `qpdf.wasm` binary using SRI (Subresource Integrity) (DEP-INT-04)."
    - "The application remains fully functional offline after the first visit (DEP-INT-03)."
  artifacts:
    - path: "assets/vendor/jszip.min.js"
      provides: "JSZip library file"
    - path: "assets/vendor/qpdf/qpdf.js"
      provides: "QPDF WASM loader script"
    - path: "assets/vendor/qpdf/qpdf.wasm"
      provides: "QPDF WASM binary"
    - path: "index.html"
      provides: "Updated script tags and Content Security Policy"
    - path: "sw.js"
      provides: "Updated asset cache list with local vendor files"
    - path: "services/pdfWorker.js"
      provides: "Worker script importing local QPDF assets with SRI validation"
  key_links:
    - from: "index.html"
      to: "assets/vendor/jszip.min.js"
      via: "<script src>"
      pattern: "assets/vendor/jszip.min.js"
    - from: "services/pdfWorker.js"
      to: "assets/vendor/qpdf/qpdf.js"
      via: "importScripts"
      pattern: "importScripts('../assets/vendor/qpdf/qpdf.js')"
    - from: "services/pdfWorker.js"
      to: "assets/vendor/qpdf/qpdf.wasm"
      via: "fetch with integrity"
      pattern: "integrity: sriHash"
    - from: "sw.js"
      to: "assets/vendor/"
      via: "ASSETS_TO_CACHE"
      pattern: "'./assets/vendor/jszip.min.js'"
---

<objective>
Internalize all external CDN dependencies (JSZip, QPDF-WASM) by moving them to a local `assets/vendor/` directory. This improves security, privacy, and offline reliability by removing reliance on third-party servers while maintaining strict SRI (Subresource Integrity) validation for the engine.

**Purpose:** To create a fully self-contained application that aligns with zero-trust and offline-first principles.

**Output:** A modified application structure where all scripts are served locally and verified for integrity.
</objective>

<execution_context>
@$HOME/.gemini/get-shit-done/workflows/execute-plan.md
@$HOME/.gemini/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/04-internalize-engine-dependencies/04-RESEARCH.md
@index.html
@sw.js
@services/pdfWorker.js
@tests/pdfWorker.test.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Vendor Directory and Download Assets (DEP-INT-01)</name>
  <files>
    - "assets/vendor/jszip.min.js"
    - "assets/vendor/qpdf/qpdf.js"
    - "assets/vendor/qpdf/qpdf.wasm"
  </files>
  <action>
    1.  Create the directory structure: `assets/vendor/qpdf/`.
    2.  Download/Copy the following assets:
        -   `https://unpkg.com/jszip@3.10.1/dist/jszip.min.js` -> `assets/vendor/jszip.min.js`
        -   `https://unpkg.com/@neslinesli93/qpdf-wasm@0.3.0/dist/qpdf.js` -> `assets/vendor/qpdf/qpdf.js`
        -   `https://unpkg.com/@neslinesli93/qpdf-wasm@0.3.0/dist/qpdf.wasm` -> `assets/vendor/qpdf/qpdf.wasm`
    3.  Verify the checksums of the downloaded files match the known SRI hashes (JSZip: `sha384-9aN99+8K9YInX19G4T9Nn6E5xQyv79i+8v6V+k2v5/0=`, QPDF WASM: `sha384-9ESKDLiqwqZ9ln5RdWhoE5TM/zLYG2UoW/AMa0KeND/fhDO5ZJsRH6FTJ3Dera+p`). Note: JSZip hash is for version 3.10.1.
  </action>
  <verify>
    <automated>ls assets/vendor/jszip.min.js assets/vendor/qpdf/qpdf.js assets/vendor/qpdf/qpdf.wasm</automated>
  </verify>
  <done>
    Assets are stored locally in the correct directory structure.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update index.html and Service Worker (DEP-INT-01, DEP-INT-03)</name>
  <files>
    - "index.html"
    - "sw.js"
  </files>
  <action>
    **In `index.html`:**
    1.  Update CSP `script-src` and `connect-src`: Remove `https://unpkg.com`.
    2.  Update `jszip` script tag to use `./assets/vendor/jszip.min.js`.
    3.  Ensure `qpdf.js` is NOT in `index.html` (it is imported by worker).

    **In `sw.js`:**
    1.  Update `ASSETS_TO_CACHE` list: Replace `unpkg.com` URLs with:
        -   `'./assets/vendor/jszip.min.js'`
        -   `'./assets/vendor/qpdf/qpdf.js'`
        -   `'./assets/vendor/qpdf/qpdf.wasm'`
  </action>
  <verify>
    <automated>grep -q "assets/vendor/jszip.min.js" index.html && grep -q "./assets/vendor/qpdf/qpdf.wasm" sw.js</automated>
  </verify>
  <done>
    Frontend entry point and Service Worker point to local assets.
  </done>
</task>

<task type="auto">
  <name>Task 3: Update Worker and Maintain SRI (DEP-INT-02, DEP-INT-04)</name>
  <files>
    - "services/pdfWorker.js"
    - "tests/pdfWorker.test.js"
  </files>
  <action>
    **In `services/pdfWorker.js`:**
    1.  Update `importScripts` to `'../assets/vendor/qpdf/qpdf.js'`.
    2.  Update `wasmUrl` to `'../assets/vendor/qpdf/qpdf.wasm'`.
    3.  **RETAIN and UPDATE SRI Logic:** Ensure the `fetch(wasmUrl, { integrity: sriHash })` call remains active and uses the correct relative path.
    4.  Update `locateFile` to point to `'../assets/vendor/qpdf/'`.

    **In `tests/pdfWorker.test.js`:**
    1.  Update mock paths to match new local directory structure.
    2.  Verify SRI failure handling still works with local paths.
  </action>
  <verify>
    <automated>npm test tests/pdfWorker.test.js</automated>
  </verify>
  <done>
    Worker loads local assets with integrity checks, and tests confirm security/functional requirements.
  </done>
</task>

</tasks>

<verification>
- No network requests to `unpkg.com` in DevTools.
- PDF processing remains functional.
- PWA remains functional in offline mode (checked via "Offline" checkbox in DevTools).
- Integrity check failure (simulated) correctly blocks WASM loading.
</verification>

<success_criteria>
- Zero external dependencies at runtime.
- SRI validation maintained for the engine core.
- 100% test pass rate for worker integration.
</success_criteria>

<output>
After completion, create `.planning/phases/04-internalize-engine-dependencies/04-01-SUMMARY.md`
</output>
