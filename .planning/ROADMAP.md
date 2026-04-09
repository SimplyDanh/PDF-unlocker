# 🗺️ Project Roadmap - PDF Unlocker v2.0

## 🚦 Status Summary
- **Phase 1 (Optimization):** ✅ COMPLETED
- **Phase 2 (UX Polish):** ⏳ Upcoming
- **Phase 4 (Self-Containment):** 🛠️ Planned
- **Phase 3 (Enterprise):** ⏳ Backlog

---

## Phase 1: Engine Optimization & Worker Migration ✅
**Goal:** Remove main-thread blocking and provide instant feedback during engine bootstrap.

- [x] 01-01-PLAN.md — Web Worker Infrastructure & Foundation
- [x] 01-02-PLAN.md — Streaming WASM Loading & SRI
- [x] 01-03-PLAN.md — UI Engine Ready State & SW Cache Optimization
- [x] 01-04-PLAN.md — Performance Benchmarking & Integration
- [x] 01-05-PLAN.md — Main Thread Proxy & UI Integration

### ✅ Tasks
- [x] **1.1 Web Worker Infrastructure**
- [x] **1.2 Streaming WASM Loading**
- [x] **1.3 UI State Management**
- [x] **1.4 Service Worker Cache Strategy**
- [x] **1.5 Performance Benchmarking**
- [x] **1.6 Main Thread Proxy & UI Integration**

### 🏁 Success Criteria
- Engine initializes < 500ms on repeat visits (cached).
- Drop zone displays "Loading engine..." if initialization takes > 100ms.
- Main UI remains responsive (60fps) during heavy PDF decryption tasks.

---

## Phase 2: UX Polish & Batch Management ⏳
*Goal: Provide enterprise-level feedback for batch processing.*

### ✅ Tasks
- [ ] **2.1 Individual File Progress**
- [ ] **2.2 Advanced ZIP Options**
- [ ] **2.3 Drag-and-Drop Improvements**
- [ ] **2.4 Theme Customization**

---

## Phase 4: Internalize Engine Dependencies 🛠️
**Goal:** Move external WASM/JS dependencies from CDNs to local assets to make the project fully self-contained and offline-capable without external network requests.

**Requirements:**
- **DEP-INT-01:** Host `qpdf.wasm` and `qpdf.js` locally in `assets/vendor/`.
- **DEP-INT-02:** Update `pdfWorker.js` to load from local paths.
- **DEP-INT-03:** Update Service Worker (`sw.js`) to cache local vendor assets.
- **DEP-INT-04:** Maintain SRI (Subresource Integrity) for local assets.

**Depends on:** Phase 1
**Plans:** 1/1 plans complete

Plans:
- [ ] 04-PLAN.md — Internalize Engine Dependencies
- [ ] 04-VALIDATION.md — Validation Protocol for Internalized Dependencies

---

## Phase 3: Enterprise & Security Features ⏳
*Goal: Expand utility while maintaining strict zero-trust principles.*

### ✅ Tasks
- [ ] **3.1 Encrypted PDF Support**
- [ ] **3.2 PDF Metadata Editor**
- [ ] **3.3 Desktop App (Electron/Tauri)**
