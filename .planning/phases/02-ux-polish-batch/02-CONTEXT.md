# 🌌 Phase 2 Context: UX Polish & Batch Management

This document captures the finalized implementation decisions for Phase 2, providing a locked-in strategy for research and planning.

## 📋 Phase Goals
Enhance the user experience for batch processing with detailed feedback, provide flexible download options, and expand the visual aesthetic with modern UI patterns.

## 🏛️ Implementation Decisions

### 1. Batch Progress: Bento Grid File Cards
- **Strategy:** When files are dropped, the "Drop Zone" content (icon/text) will be replaced by a dynamic **Bento Grid** of individual file cards.
- **Card Content:** Each card will display the filename, a status icon (pending, processing, success, error), and a small progress indicator if possible.
- **Limit:** Maintain the current `MAX_BATCH_FILES = 20`.
- **Reasoning:** Aligns with the "Aurora UI" aesthetic and provides premium "app-like" feedback for multi-file workflows.

### 2. Download Strategy: Post-Processing Choice
- **Strategy:** Once all files in a batch are processed, the UI will present a **Post-Processing Selector** (e.g., a small overlay or secondary action area) asking the user how they want to receive their files.
- **Options:** 
    - "Download All as ZIP" (subject to the 150MB browser limit).
    - "Download Individually" (triggers multiple browser downloads).
- **Reasoning:** Minimizes unwanted downloads and gives users explicit control over their local files after verifying success.

### 3. Visuals: 4 Flat Themes
- **Strategy:** The theme toggle will expand from a binary Light/Dark switch to a 4-option selection:
    1. **Light:** Current standard light mode.
    2. **Dark:** Current standard dark mode.
    3. **Aurora:** Light-based theme with the animated mesh gradient background.
    4. **Glass:** Dark-based theme with high-translucency (backdrop-blur) and glassmorphism cards.
- **Reasoning:** Simpler implementation than a multi-layered sub-option system, providing clear, distinct "vibes" for the user.

### 4. Motion: Smooth Transitions
- **Strategy:** Use CSS transitions and potentially the **View Transitions API** (where supported) to smoothly animate the entry of file cards and the transition between batch states.
- **Accessibility:** Must strictly respect `prefers-reduced-motion` media queries.
- **Reasoning:** Enhances the "premium" feel of the PWA without compromising performance.

## 🛠️ Technical Constraints
- **Zero-Trust:** All UI changes must maintain strict client-side isolation. No external assets (except Google Fonts/Unpkg) are allowed.
- **Memory Management:** ZIP generation remains capped at 150MB total batch size to prevent browser crashes.
- **Non-Blocking:** UI updates must not interfere with the `pdfWorker.js` processing loop.

## 🚀 Next Steps
1. **Researcher:** Investigate the **View Transitions API** for Bento Grid animations and finalize CSS variable maps for the 4 new themes.
2. **Planner:** Create a multi-wave execution plan for these UX enhancements.
