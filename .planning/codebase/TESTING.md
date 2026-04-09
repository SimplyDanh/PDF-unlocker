# Testing Patterns

**Analysis Date:** 2025-02-13

## Test Framework

**Runner:**
- Vitest ^4.0.18
- Config: `vitest.config.mjs`

**Assertion Library:**
- Vitest (built-in expect)

**Run Commands:**
```bash
npm test              # Run all unit tests (one-off)
```

## Test File Organization

**Location:**
- Separate directory: `tests/`

**Naming:**
- `*.test.js` for unit tests: `tests/pdfService.test.js`
- `perf_test.js` for performance benchmarking.

**Structure:**
```
tests/
├── pdfService.test.js    # Service layer unit tests
└── perf_test.js         # Performance and memory benchmark tool
```

## Test Structure

**Suite Organization:**
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('pdfService', () => {
    let pdfService;

    beforeEach(() => {
        // Setup mock environment and inject script content
        const mockWindow = {};
        const fn = new Function('window', pdfServiceContent);
        fn(mockWindow);
        pdfService = mockWindow.pdfService;
    });

    it('should behave as expected', async () => {
        // Test logic
    });
});
```

**Patterns:**
- **Script Injection**: Since the source uses a global IIFE, tests load the script file via `fs.readFileSync` and evaluate it within a controlled scope using `new Function`.
- **Setup**: `beforeEach` is used to reset global mocks (e.g., `console`, `fetch`).
- **Assertion**: Standard Vitest `expect` assertions.

## Mocking

**Framework:** Vitest (`vi`)

**Patterns:**
```javascript
// Mocking browser globals
vi.stubGlobal('console', { log: vi.fn(), warn: vi.fn(), error: vi.fn() });
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
}));
vi.stubGlobal('Blob', class Blob { ... });

// Mocking the WebAssembly module
const mockQpdf = {
    FS: { writeFile: vi.fn(), readFile: vi.fn(), unlink: vi.fn() },
    callMain: vi.fn()
};
const mockModule = vi.fn().mockResolvedValue(mockQpdf);
```

**What to Mock:**
- Browser-specific objects: `fetch`, `Blob`, `Performance`.
- External WebAssembly dependencies: `Module`.
- DOM elements (simulated via `jsdom`).

**What NOT to Mock:**
- Core application logic in `pdfService.js`.

## Fixtures and Factories

**Test Data:**
```javascript
// Byte-perfect minimal PDF generator for testing
const validPdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00]).buffer;
const mockFile = {
    type: 'application/pdf',
    name: 'valid.pdf',
    size: 100,
    arrayBuffer: vi.fn().mockResolvedValue(validPdfContent)
};
```

**Location:**
- Helper functions within the test files.

## Coverage

**Requirements:** None enforced.
**View Coverage:** Not configured (can be run with `vitest --coverage`).

## Test Types

**Unit Tests:**
- Focus on `pdfService.js` logic: file type validation, size limits, WASM interaction, magic-byte checks.

**Integration Tests:**
- None detected (direct browser/service integration is assumed in UI).

**Performance Tests:**
- `tests/perf_test.js` provides a benchmarking tool to measure memory and processing time for files of various sizes (1MB to 75MB).

## Common Patterns

**Async Testing:**
- Extensive use of `async/await` for file processing and WASM initialization.

**Error Testing:**
- Explicit testing of failure modes: "Invalid Format", "File Too Large", "Processing Failed".

---

*Testing analysis: 2025-02-13*
