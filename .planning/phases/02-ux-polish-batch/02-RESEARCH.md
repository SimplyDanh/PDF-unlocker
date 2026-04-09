# Phase 2: UX Polish & Batch Management - Research

**Researched:** 2026-04-09
**Domain:** Frontend UI/UX, Browser APIs, Web Workers
**Confidence:** HIGH

## Summary

This research identifies the optimal implementation path for Phase 2, focusing on providing a premium, enterprise-grade user experience for batch PDF processing. The transition from a single-file status to a dynamic **Bento Grid** will leverage the **View Transitions API** for fluid state changes. Batch processing will be upgraded from a sequential loop to a **Worker Pool** architecture, enabling concurrent processing (limited by system resources) and real-time progress tracking for up to 20 files. Visual aesthetics will be expanded to 4 distinct themes (Light, Dark, Aurora, Glass) using a robust CSS Custom Property mapping strategy.

**Primary recommendation:** Use the **View Transitions API** to animate the "Drop Zone" to "Batch Grid" transition, and implement a **Worker Pool (size: hardwareConcurrency)** to handle concurrent WASM tasks without blocking the UI or overwhelming the browser.

<user_constraints>
## User Constraints (from 02-CONTEXT.md)

### Locked Decisions
- **Bento Grid File Cards:** Replace Drop Zone content with dynamic cards showing filename, status icon, and progress.
- **Post-Processing Selector:** Choice between "Download All as ZIP" and "Download Individually" after batch completion.
- **4 Flat Themes:** Light, Dark, Aurora (mesh gradient), Glass (glassmorphism).
- **Smooth Transitions:** Use View Transitions API where supported, respect `prefers-reduced-motion`.
- **Batch Limit:** Maintain `MAX_BATCH_FILES = 20`.
- **ZIP Limit:** Maintain `150MB` total batch size limit for ZIP generation.

### the agent's Discretion
- Implementation of the Bento Grid layout (uniform vs. varied spans).
- Worker Pool vs. Optimized Sequential processing.
- CSS variable naming and mapping structure.

### Deferred Ideas (OUT OF SCOPE)
- Multi-layered sub-option theme system.
- Direct-to-cloud uploads.
- Password-protected ZIP creation.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-2.1 | Individual File Progress | Worker Pool architecture enables per-file status reporting and concurrent tracking. |
| REQ-2.2 | Advanced ZIP Options | Post-processing selector logic and individual download throttling research. |
| REQ-2.3 | Drag-and-Drop Improvements | View Transitions API enables fluid movement from drop to grid view. |
| REQ-2.4 | Theme Customization | CSS Custom Property maps for 4 themes (Aurora/Glass included). |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **View Transitions API** | Native | Fluid state animations | Baseline support in 2026; high performance; native feel. |
| **CSS Grid (Bento)** | Native | File card layout | Flexible, performs well with dynamic counts (1-20). |
| **Web Worker Pool** | Native | Concurrency | Parallel WASM execution; utilizes multi-core systems. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| **JSZip** | 3.10.x+ | Batch compression | Used for "Download All as ZIP" option. (Already in project) |
| **Promise.withResolvers** | Native | Pool management | Standardized in 2024; simplifies async task tracking. |

**Installation:**
No new npm packages required. The project remains buildless and vanilla.

## Architecture Patterns

### State-Driven Transitions
The UI should treat the transition from "Awaiting" to "Batch" as a state change wrapped in a view transition.
```javascript
// Pattern for Phase 2
async function startBatchUI(files) {
    if (document.startViewTransition) {
        document.startViewTransition(() => renderBentoGrid(files));
    } else {
        renderBentoGrid(files); // Fallback
    }
}
```

### Worker Pool Manager
Move from a single `pdfWorker` to a `WorkerPool` class that manages N workers (default: `navigator.hardwareConcurrency`).
- **Input:** Queue of files.
- **Output:** Stream of success/error events with individual card IDs.

### CSS Variable Mapping (4-Theme Strategy)
Use a "Semantic -> Token" mapping. The UI code uses Semantic variables (`--card-bg`), while the theme definitions set the Tokens.
- `Light/Dark`: Standard solid colors.
- `Aurora`: Transparent backgrounds + blurred animated blobs behind content.
- `Glass`: `backdrop-filter: blur()` + high-translucency backgrounds.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UI Animations | Custom JS intervals/RAF | **View Transitions API** | Browser-optimized, handles DOM swaps natively, handles "reduced motion". |
| Dynamic Layout | Absolute positioning | **CSS Grid (auto-fill)** | Responsive by default, handles 1 to 20 items without math. |
| Multi-tasking | Single worker queue | **Worker Pool** | Single workers can't run multiple WASM instances concurrently. |

## Common Pitfalls

### Pitfall 1: Multiple Download Block
**What goes wrong:** Browsers block "spam" downloads if 20 `click()` events happen at once.
**How to avoid:** Use the Post-Processing selector. If "Individual" is chosen, trigger with a **300ms delay** between files to stay under security thresholds.

### Pitfall 2: Glassmorphism Performance
**What goes wrong:** `backdrop-filter: blur()` is expensive, especially in a grid of 20 cards.
**How to avoid:** Apply the blur only to the main container or use it sparingly on cards. Ensure `will-change: transform` is used on animated Aurora blobs.

### Pitfall 3: ZIP Memory Exhaustion
**What goes wrong:** 150MB limit is a guideline; actual browser heap limits vary.
**How to avoid:** Check `navigator.deviceMemory` (if available) and warn the user if the batch is large but RAM is low.

## Code Examples

### Bento Grid CSS (Vanilla)
```css
.bento-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    grid-auto-rows: 180px;
    gap: 1.5rem;
    padding: 2rem;
}

/* Optional "Bento" accent: make some cards larger if batch is small */
.bento-grid:has(> :nth-child(1):last-child) .file-card {
    grid-column: span 2;
    grid-row: span 2;
}
```

### Throttled Download Loop
```javascript
async function downloadSequentially(files) {
    for (const file of files) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file.blob);
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise(r => setTimeout(r, 400)); // The "Safe Gap"
    }
}
```

### Aurora/Glass Theme Variables
```css
[data-theme="glass"] {
    --bg-main: transparent;
    --card-bg: rgba(255, 255, 255, 0.1);
    --card-blur: blur(12px);
    --card-border: rgba(255, 255, 255, 0.2);
    --text-primary: #ffffff;
}

[data-theme="aurora"] {
    --bg-main: #020617; /* Dark base for glow contrast */
    --accent-glow: radial-gradient(circle, var(--aurora-1) 0%, transparent 70%);
}
```

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| View Transitions API | Animations | ✓ | Baseline 2026 | Immediate DOM update |
| hardwareConcurrency | Worker Pool | ✓ | — | Default to 4 workers |
| backdrop-filter | Glass theme | ✓ | — | Solid translucent bg |
| Promise.withResolvers| Pool Logic | ✓ | Baseline 2024 | Manual Promise ctor |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.mjs` |
| Quick run command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-2.1| Individual status tracking | Integration| `npm test tests/pdfService.test.js` | ✅ |
| REQ-2.2| ZIP vs Individual choice | E2E | `npx playwright test` | ❌ Wave 0 |
| REQ-2.4| Theme variable application | Unit | `npm test tests/theme.test.js` | ❌ Wave 0 |

## Sources

### Primary (HIGH confidence)
- **MDN Web Docs:** View Transitions API (2026 update).
- **Chrome for Developers:** "Throttling multiple downloads" security guidelines (2025).
- **W3C Standards:** Promise.withResolvers (standardized).

### Secondary (MEDIUM confidence)
- **Aurora UI Case Studies:** Performance benchmarks for `backdrop-filter` in grids.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Native APIs are stable in 2026.
- Architecture: HIGH - Worker Pool is a proven pattern for WASM concurrency.
- Pitfalls: HIGH - Browser download limits are well-documented.

**Research date:** 2026-04-09
**Valid until:** 2026-07-09 (Fast-moving UI patterns)
