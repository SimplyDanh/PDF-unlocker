# Coding Conventions

**Analysis Date:** 2025-02-13

## Naming Patterns

**Files:**
- camelCase for JavaScript files: `pdfService.js`, `app.js`
- kebab-case for CSS/HTML: `index.html`, `styles.css`
- lowercase for configuration: `package.json`, `manifest.json`

**Functions:**
- camelCase for all functions: `initWasm`, `processFile`, `updateStatus`

**Variables:**
- camelCase for local variables and parameters: `fileQueue`, `isProcessing`, `callbacks`

**Types/Constants:**
- UPPER_SNAKE_CASE for configuration constants and static data: `MAX_FILE_SIZE_MB`, `SVGS`, `ZIP_MEMORY_LIMIT_MB`

## Code Style

**Formatting:**
- Indentation: 4 spaces
- Semicolons: Required/Used
- Strings: Single quotes preferred for values, double quotes occasionally for attributes in strings
- Trailing commas: Not consistently used in literals

**Linting:**
- No explicit ESLint/Prettier configuration found. Coding style is maintained manually.

## Import Organization

**Order:**
1. External modules (in tests)
2. Native Node.js modules (in tests)
3. Local file content (loaded via `fs` in tests or script tags in HTML)

**Path Aliases:**
- Not detected (classic web structure).

## Error Handling

**Patterns:**
- `try...catch...finally` blocks for asynchronous operations.
- Graceful degradation: failing WASM initialization updates UI with "Browser Restricted" or "Initialization Error".
- UI-driven error reporting via `onStatus` callbacks.

## Logging

**Framework:** `console`

**Patterns:**
- Errors are logged via `console.error` with descriptive messages.
- Success and informational logs via `console.log`.
- Warnings (e.g., cleanup failures) via `console.warn`.

## Comments

**When to Comment:**
- High-level module descriptions at the top of files.
- Complex logic blocks (e.g., WASM initialization, magic-byte validation).
- SVG path markup and security considerations.

**JSDoc/TSDoc:**
- Used for core functions in `services/pdfService.js` to define parameters and return types.

## Function Design

**Size:**
- Functions are focused on single responsibilities (e.g., `setSvgContent`, `updateStatus`).
- Complex workflows (like `processQueue`) are broken down with sub-calls to services.

**Parameters:**
- Uses object destructuring for callbacks and configuration options: `processFile(file, callbacks, config = { returnBlob: false })`.

**Return Values:**
- Consistent use of Promises for async functions.
- Explicit returns of `null` or specific objects (e.g., `Blob`) based on configuration.

## Module Design

**Exports:**
- Browser-compatible IIFE (Immediately Invoked Function Expression) pattern: `window.pdfService = (function () { ... })();`.
- Encourages encapsulation of private state (e.g., `qpdfModule`).

**Barrel Files:**
- Not applicable.

---

*Convention analysis: 2025-02-13*
