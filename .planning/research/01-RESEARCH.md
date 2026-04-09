# Phase 1: Engine Optimization & Worker Migration - Research

**Researched:** 2024-04-09
**Domain:** WebAssembly, Web Workers, PWA Performance
**Confidence:** HIGH

## Summary

This phase focuses on offloading the resource-intensive QPDF WASM engine from the main UI thread to a dedicated Web Worker. By implementing `WebAssembly.instantiateStreaming` with Subresource Integrity (SRI) validation, we will significantly reduce the time-to-first-processing. Additionally, the Service Worker strategy will be optimized to a Cache-First approach for versioned assets (WASM and JS libraries), ensuring near-instant load times for returning users.

**Primary recommendation:** Use Emscripten's `instantiateWasm` hook in the Worker to combine `instantiateStreaming` with SRI validation, and communicate via a structured message protocol using Transferable Objects for zero-copy data transfer.

<user_constraints>
## User Constraints (from Phase Goals)

### Locked Decisions
- Move WASM engine (QPDF) to a dedicated Web Worker.
- Implement streaming initialization for WASM.
- Update Service Worker fetch strategy to Cache-First for versioned assets.
- Add a WASM Engine Ready State in the UI.
- Ensure SRI validation and CSP compliance.
- Support zero-copy data transfer (Transferable Objects).

### the agent's Discretion
- Design of the Worker <-> Main Thread message protocol.
- Specific implementation of the UI "Loading Engine" state transitions.
- Method for detecting "versioned" assets in the Service Worker.

### Deferred Ideas (OUT OF SCOPE)
- Parallel processing of multiple PDFs (Sequential processing is maintained as per `CONCERNS.md`).
- Support for User Password decryption (Requires user input UI, not part of engine optimization).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FR-1 | Move WASM engine to a dedicated Web Worker | Research confirms `worker-src 'self'` and `postMessage` protocol. |
| FR-2 | Implement Streaming Initialization | `WebAssembly.instantiateStreaming` is standard for 2024 performance. |
| FR-3 | Update SW strategy to Cache-First | Verified PWA pattern for versioned assets (unpkg URLs). |
| FR-4 | Add WASM Engine Ready State in UI | Message protocol includes `ready` signal for UI transitions. |
| SEC-1 | Ensure Worker CSP compliance | `worker-src 'self'` and `'wasm-unsafe-eval'` identified. |
| SEC-2 | Validate SRI for WASM binary | `instantiateWasm` override allows attaching SRI to `fetch`. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| QPDF (WASM) | 0.3.0 | PDF processing engine | Industry standard for PDF manipulation. |
| Emscripten Glue | N/A | JS/WASM bridge | Standard loader for C++ compiled to WASM. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| JSZip | 3.10.1 | Batch compression | Used for zipping multiple unlocked PDFs. |
| Vitest | 4.0.18 | Unit testing | Project's chosen test runner. |

## Architecture Patterns

### Recommended Project Structure
```
services/
├── pdfService.js    # Main thread Proxy (facade for the Worker)
└── pdfWorker.js     # Worker thread (contains WASM runtime & processing logic)
ui/
└── app.js           # Presentation layer (listens for Worker state)
sw.js                # Optimized Service Worker (Cache-First)
```

### Pattern 1: Worker Proxy (Facade)
The `pdfService.js` on the main thread acts as a lightweight proxy that handles Worker instantiation and message routing. This keeps the UI code clean and ignorant of the `postMessage` details.

### Pattern 2: Emscripten `instantiateWasm` Override
To support SRI with streaming, we must override the default loader:
```javascript
// Source: https://emscripten.org/docs/api_reference/module.html#Module.instantiateWasm
const Module = {
  instantiateWasm: (imports, successCallback) => {
    fetch(WASM_URL, { integrity: SRI_HASH })
      .then(resp => WebAssembly.instantiateStreaming(resp, imports))
      .then(result => successCallback(result.instance, result.module));
    return {}; // Indicates async instantiation
  }
};
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WASM Loading | Custom fetcher | `instantiateStreaming` | Browser-level compilation optimizations. |
| Worker Lifecycle | Custom manager | `self.onmessage` / `postMessage` | Standard API is sufficient for single-worker usage. |
| Integrity Check | Custom buffer hash | `fetch(url, { integrity })` | Browser native SRI is faster and more secure. |

## Common Pitfalls

### Pitfall 1: CSP Blocking WASM
**What goes wrong:** Browser refuses to compile WASM, throwing `EvalError`.
**How to avoid:** Add `'wasm-unsafe-eval'` to `script-src` in the CSP.
**Warning signs:** Console error mentioning "Content Security Policy" and "WebAssembly".

### Pitfall 2: Detached Transferable Objects
**What goes wrong:** Sending an `ArrayBuffer` twice or accessing it after transfer.
**How to avoid:** Ensure `postMessage(buf, [buf])` is only called once per buffer and the sender treats it as "gone".
**Warning signs:** `TypeError: Cannot perform Construct on a detached ArrayBuffer`.

### Pitfall 3: Service Worker Cache Poisoning
**What goes wrong:** Non-versioned assets (like `index.html`) stuck in cache.
**How to avoid:** Use **Network-First** for the main entry point and **Cache-First** only for versioned URLs (e.g., those containing `@0.3.0`).

## Code Examples

### Message Protocol (pdfService <-> pdfWorker)
```javascript
// Main -> Worker
{ type: 'init' }
{ type: 'process', file: ArrayBuffer, name: string }

// Worker -> Main
{ type: 'ready' }
{ type: 'status', state: 'processing', main: string, sub: string }
{ type: 'success', blob: ArrayBuffer, name: string }
{ type: 'error', main: string, sub: string }
```

### Cache-First fetch in `sw.js`
```javascript
// Optimized strategy for versioned unpkg assets
if (event.request.url.includes('https://unpkg.com/')) {
    event.respondWith(
        caches.match(event.request).then(cached => {
            return cached || fetch(event.request).then(resp => {
                const copy = resp.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                return resp;
            });
        })
    );
}
```

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `instantiateStreaming` | Engine loading | ✓ | Chrome 61+ | `arrayBuffer()` + `instantiate()` |
| Web Workers | Engine isolation | ✓ | All modern | Main thread (suboptimal) |
| `Transferable` | Zero-copy data | ✓ | All modern | Structured Clone (slow) |
| `'wasm-unsafe-eval'` | CSP Compliance | ✓ | Chrome 95+ | `'unsafe-eval'` (less secure) |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.mjs` |
| Quick run command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-1 | Worker handles messages | Unit | `npm test tests/pdfService.test.js` | ✅ |
| FR-2 | Streaming instantiation | Integration | (Manual verification in DevTools) | ❌ |
| FR-3 | Cache-First for WASM | Smoke | (Manual verification in Network Tab) | ❌ |
| SEC-2 | SRI validation | Unit | `npm test tests/pdfService.test.js` | ✅ |

### Wave 0 Gaps
- [ ] `tests/pdfWorker.test.js` — needed to test the worker logic in isolation.
- [ ] Mock `Worker` environment for Vitest (using `jsdom` or manual mocks).

## Sources

### Primary (HIGH confidence)
- MDN: [WebAssembly.instantiateStreaming()](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/instantiateStreaming)
- Emscripten Docs: [instantiateWasm override](https://emscripten.org/docs/api_reference/module.html#Module.instantiateWasm)
- CSP Guide: [WebAssembly and Workers](https://content-security-policy.com/examples/webassembly/)

### Secondary (MEDIUM confidence)
- Google Web Fundamentals: [The Offline Cookbook (Cache-First)](https://web.dev/offline-cookbook/#cache-falling-back-to-network)

## Metadata
**Confidence breakdown:**
- Standard stack: HIGH (already in project)
- Architecture: HIGH (standard worker patterns)
- Pitfalls: HIGH (common web security/perf gotchas)

**Research date:** 2024-04-09
**Valid until:** 2024-05-09
