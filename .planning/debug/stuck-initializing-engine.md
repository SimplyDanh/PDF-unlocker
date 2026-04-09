---
status: investigating
trigger: "check the the engine of the app as i stuck with Initializing Engine Loading WebAssembly core..."
created: 2024-05-18T00:00:00Z
updated: 2024-05-18T00:00:00Z
---

## Current Focus

hypothesis: The path to the WebAssembly core (qpdf.wasm) or the JS wrapper (qpdf.js) is incorrect after internalization, leading to a silent failure or an unhandled promise rejection during engine initialization.
test: Review `index.html`, `ui/app.js`, and `services/pdfWorker.js` or `services/pdfService.js` to see how the engine is loaded and what paths are expected.
expecting: Mismatched paths or incorrect script loading strategy.
next_action: Read source files related to WASM loading.

## Symptoms

expected: Engine should initialize properly and be ready for use.
actual: stuck with "Initializing Engine Loading WebAssembly core..."
errors: none
reproduction: just loading the page
started: started after the engine was internalized (worked previously when not internalized)

## Eliminated

## Evidence

## Resolution

root_cause: 
fix: 
verification: 
files_changed: []