# AGENTS.md — Secure PDF Unlocker

## Project Overview

A strictly client-side web application that removes owner-level restrictions
(printing, copying, editing) from protected PDF documents using QPDF compiled
to WebAssembly. No server, no API, no build step. Files never leave the browser.

**Tech stack:** Vanilla HTML5, CSS3, ES6+ JavaScript, QPDF-WASM, JSZip (CDN).

## Project Structure

```
PDF Unlocker/
├── index.html              # Entry point — loads CDN deps + local scripts
├── favicon.svg             # SVG favicon (document + unlocked padlock)
├── frame.png               # QR code image for About modal
├── services/
│   └── pdfService.js       # WASM init, PDF validation, decryption, download
├── ui/
│   ├── app.js              # DOM refs, events, theme toggle, modal, file queue
│   └── styles.css          # All styles, CSS custom properties, dark/light theme
└── .agent/                 # Agent skills/directives/workflows (gitignored)
```

## Build / Run / Test Commands

There is **no build step, bundler, or package.json**. The app is static HTML.

### Serving locally

Any static file server works. Examples:

```sh
# Python
python -m http.server 8000

# Node (npx)
npx serve .

# VS Code: use the "Live Server" extension
```

Open `http://localhost:8000` (or whichever port) in a browser.

### Testing

There is **no test framework** configured. All testing is manual:

1. Open the app in a browser.
2. Drop a password-protected (owner-password only) PDF onto the drop zone.
3. Verify the unlocked file downloads with `_unlocked.pdf` suffix.
4. Test multi-file upload — files under 150 MB total should produce a ZIP.
5. Test error states: non-PDF files, files > 100 MB, user-password PDFs.

### Linting

No linter is configured. If adding one, use ESLint with the browser globals
(`document`, `window`, `console`, `localStorage`, `Blob`, `URL`, etc.) and
declare WASM/CDN globals via `/* global */` comments at file tops.

## Dependencies (CDN with SRI)

Dependencies are loaded via `<script>` tags in `index.html` with Subresource
Integrity (SRI) hashes. **Do not remove SRI attributes.**

| Library | Version | Purpose |
|---------|---------|---------|
| `qpdf-wasm` | 0.3.0 | PDF decryption via WebAssembly |
| `jszip` | 3.10.1 | ZIP archive generation for batch downloads |

To update a dependency:
1. Update the `src` URL version in `index.html`.
2. Generate a new SRI hash: `shasum -b -a 384 <file> | awk '{print $1}' | xxd -r -p | base64`
3. Update the `integrity` attribute.
4. Test thoroughly — WASM modules are sensitive to version changes.

## Code Style — JavaScript

### General

- **ES6+**: Use `const`/`let` (never `var`), arrow functions, template literals,
  `async`/`await`, destructuring.
- **No modules**: Scripts are loaded via classic `<script>` tags. Cross-file
  communication uses global functions/variables.
- **Global declarations**: Mark CDN/cross-file globals with `/* global */`
  comments at the top of each file (e.g., `/* global Module */`,
  `/* global initWasm, processFile */`).

### Naming Conventions

- **Variables/functions**: `camelCase` — `dropZone`, `processFile`, `initWasm`
- **Constants**: `UPPER_SNAKE_CASE` — `MAX_FILE_SIZE_MB`, `ZIP_MEMORY_LIMIT_BYTES`
- **DOM element refs**: `camelCase` matching the element's role — `fileInput`,
  `statusText`, `modalBackdrop`
- **Temporary WASM filenames**: Template literal with timestamp —
  `` `input_${Date.now()}.pdf` ``

### Functions

- Use `async function name()` for async operations (not async arrow at top level).
- Use JSDoc comments (`/** ... */`) for public-facing functions with `@param`
  and `@returns` annotations.
- Keep functions focused: service layer (`pdfService.js`) handles logic,
  UI layer (`ui/app.js`) handles DOM and events.

### Error Handling

- Wrap WASM and file operations in `try/catch/finally`.
- Use `finally` blocks for cleanup (reset `isProcessing`, clear `fileInput`).
- WASM filesystem cleanup uses individual `try/catch` per `unlink` call to
  prevent one failure from blocking the next.
- Surface user-facing errors via the `onStatus('error', title, message)`
  callback pattern — never expose raw error objects to the UI.
- Use appropriate console methods: `console.log` for info, `console.warn` for
  non-fatal cleanup issues, `console.error` for actual failures.

### Security Patterns (Critical)

These patterns are **security requirements**, not optional style choices:

1. **Magic-byte validation**: Check PDF header bytes (`%PDF` = `0x25504446`)
   before processing.
2. **Memory zeroing**: Call `uint8Array.fill(0)` on source buffers after
   writing to the WASM filesystem.
3. **WASM FS cleanup**: Always `unlink` input and output files from the
   WASM virtual filesystem after processing.
4. **No `innerHTML`**: Use `textContent` for text updates. For SVG injection,
   use the `setSvgContent()` helper that parses through a temp SVG element.
5. **Object URL revocation**: Always call `URL.revokeObjectURL()` after
   triggering downloads to prevent memory leaks.

## Code Style — CSS

- **Custom properties** (`--var-name`) for all colors, fonts, and theme values.
  Defined on `:root` (light) and `[data-theme="dark"]` (dark).
- **Font stacks**: `--font-family` (Inter) for body, `--font-heading` (Outfit)
  for headings.
- **Units**: `rem` for spacing/sizing, `px` only for borders, shadows, and
  fine details.
- **Transitions**: Use `cubic-bezier(0.16, 1, 0.3, 1)` for UI interactions.
- **Vendor prefixes**: Include `-webkit-backdrop-filter` alongside standard
  `backdrop-filter`.
- **State classes on `.drop-zone`**: `.dragover`, `.processing`, `.success`,
  `.error` — toggled via JS. Use `pointer-events: none` during processing.
- **Animations**: Defined via `@keyframes` — `meshpan`, `float`, `pulse`,
  `shimmer`, `shake`. Keep durations and easing consistent with existing ones.
- **Mobile**: Use `@media (max-width: 600px)` for responsive breakpoints.

## Code Style — HTML

- **Accessibility**: Use ARIA attributes (`role`, `aria-label`, `aria-live`,
  `aria-busy`, `aria-hidden`, `aria-modal`, `tabindex`).
- **Content Security Policy**: Defined via `<meta http-equiv>` in `index.html`.
  Update the CSP when adding new script sources or style origins.
- **Keyboard support**: All interactive elements must be operable via
  Enter/Space keys. The drop zone has `tabindex="0"` and a `keydown` handler.

## Git Conventions

Commit messages follow **Conventional Commits**:

```
feat: description     # New features
fix: description      # Bug fixes
refactor: description # Code restructuring
chore: description    # Non-functional changes
```

Keep messages concise (one line, lowercase after prefix). Examples from history:

```
feat: integrate JSZip for hybrid batch automated downloads
fix: add SRI hash for JSZip, fix inconsistent return and orphaned Object URL
refactor: extract CSS/JS into modular files and harden CSP
```
