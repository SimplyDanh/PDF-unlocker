# Phase 06 Research: Reliability & Persistence

## 🎯 Objectives
- Prevent OOM (Out of Memory) crashes during large file processing.
- Enable recovery from page refreshes or browser crashes.
- Improve reliability for batch processing.

## 🔍 Key Findings

### 1. IndexedDB Schema
A multi-store approach is required to handle metadata and potentially large binary chunks.

- **`jobs` (Store):**
  - `id`: Primary key (UUID or timestamp).
  - `timestamp`: When the batch started.
  - `status`: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`.
  - `totalFiles`: Total number of files in the batch.
  - `processedCount`: Number of successfully processed files.

- **`files` (Store):**
  - `id`: Primary key.
  - `batchId`: Foreign key to `jobs.id`.
  - `name`: Original filename.
  - `status`: `PENDING`, `COMPLETED`, `FAILED`.
  - `originalBlob`: The source file.
  - `outputBlob`: The processed file (if processed).
  - `hash`: SHA-256 hash.

### 2. Chunked Streaming for WorkerFS
Emscripten's `FS.readFile` returns a full `Uint8Array`. For 1GB files, this causes a 1GB allocation in the worker heap, and another 1GB in the main thread during `postMessage`.

**Proposed Solution:**
- Instead of `FS.readFile`, use `FS.open`, `FS.read`, and `FS.close`.
- Read in 64MB chunks.
- Send each chunk to the main thread via `postMessage({ type: 'chunk', data: chunk, ... })` using Transferable Objects.
- Main thread reconstructs the Blob or writes chunks directly to IndexedDB.

### 3. Resume Workflow
1. **Application Load:** `pdfService.init()` checks `JobStore` for any job with `status: PENDING` or `PROCESSING`.
2. **User Notification:** UI shows a "Restore previous session?" toast.
3. **Data Recovery:** If accepted, `pdfService` pulls files from `FileStore` and pushes them into the `WorkerPool`.

## 🛠️ Implementation Strategy
- **Step 1:** Implement `persistenceService.js` (IndexedDB Wrapper).
- **Step 2:** Integrate `persistenceService` into `pdfService` (WorkerPool).
- **Step 3:** Implement chunked read in `pdfWorker.js`.
- **Step 4:** Add Resume UI in `app.js`.

## 🧪 Verification Plan
- **Unit Tests:** `persistenceService` CRUD operations.
- **Integration Tests:** Worker chunking with 1GB+ synthetic files.
- **E2E Tests:** Refreshing the page during a batch and verifying the "Resume" prompt appears and works.
