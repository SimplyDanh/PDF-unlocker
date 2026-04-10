# Phase 06 Validation Protocol: Reliability & Persistence

## 🎯 Verification Goals
Ensure that processing state is correctly persisted to IndexedDB and can be successfully restored after a browser crash or manual refresh.

## 🧪 Automated Tests

### 1. Unit Tests (`Vitest`)
- **`persistenceService.test.js`**
  - [ ] `init()`: Creates database and object stores.
  - [ ] `saveJob()` / `getJob()`: Basic CRUD for batch metadata.
  - [ ] `addFile()`: Correctly handles binary Blobs in IndexedDB.
  - [ ] `getInterruptedJobs()`: Filters only `PENDING` or `PROCESSING` jobs.

### 2. E2E Tests (`Playwright`)
- **`persistence.spec.js`**
  - [ ] **Scenario 1: Refresh Recovery**
    - 1. Load application.
    - 2. Upload 3 files.
    - 3. Wait for 1 file to complete.
    - 4. Trigger `page.reload()`.
    - 5. Verify "Resume" button is visible.
    - 6. Click "Resume".
    - 7. Verify all 3 files reach `COMPLETED` state.
  - [ ] **Scenario 2: Data Cleanup**
    - 1. Complete a batch.
    - 2. Download all files.
    - 3. Refresh page.
    - 4. Verify "Resume" button is NOT visible (completed jobs should be cleared or filtered).

## 🛠️ Verification Commands
```bash
# Unit tests
npm test tests/persistenceService.test.js

# E2E tests (Mandatory line reporter)
npx playwright test tests/e2e/persistence.spec.js --reporter=line
```

## 📋 Success Criteria
- [ ] 100% pass rate on `persistenceService.test.js`.
- [ ] Resume UX correctly restores all files in a batch including their binary data.
- [ ] No significant memory leaks observed when storing large Blobs in IndexedDB.
- [ ] IndexedDB schema versioning is handled correctly.
