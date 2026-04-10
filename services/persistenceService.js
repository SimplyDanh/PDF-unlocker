/**
 * Persistence Service
 * Handles IndexedDB operations for job tracking and file storage.
 * Follows the Revealing Module Pattern.
 */

window.persistenceService = (function () {
    const DB_NAME = 'pdf_unlocker_db';
    const DB_VERSION = 2; // Incremented for chunks store (Task 06-02)
    let db = null;

    /**
     * Initialize the IndexedDB.
     */
    function init() {
        if (db) return Promise.resolve(db);

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Jobs store: id (auto-increment), status, timestamp, totalFiles, processedCount
                if (!db.objectStoreNames.contains('jobs')) {
                    const jobsStore = db.createObjectStore('jobs', { keyPath: 'id', autoIncrement: true });
                    jobsStore.createIndex('status', 'status', { unique: false });
                    jobsStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Files store: id (auto-increment), jobId (index), name, status, originalBlob, outputBlob, hash
                if (!db.objectStoreNames.contains('files')) {
                    const filesStore = db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
                    filesStore.createIndex('jobId', 'jobId', { unique: false });
                    filesStore.createIndex('status', 'status', { unique: false });
                    filesStore.createIndex('hash', 'hash', { unique: false });
                }

                // Chunks store (Task 06-02): id (auto-increment), fileId (index), index, data
                if (!db.objectStoreNames.contains('chunks')) {
                    const chunksStore = db.createObjectStore('chunks', { keyPath: 'id', autoIncrement: true });
                    chunksStore.createIndex('fileId', 'fileId', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                resolve(db);
            };

            request.onerror = (event) => {
                reject(`IndexedDB error: ${event.target.error}`);
            };
        });
    }

    /**
     * Create a new job record.
     */
    async function createJob(data) {
        const database = await init();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(['jobs'], 'readwrite');
            const store = transaction.objectStore('jobs');
            
            const job = {
                status: 'pending',
                timestamp: Date.now(),
                totalFiles: data.totalFiles || 0,
                processedCount: 0,
                ...data
            };

            const request = store.add(job);
            request.onsuccess = () => resolve(request.result); // Returns the auto-incremented ID
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update an existing job record.
     */
    async function updateJob(jobId, updates) {
        const database = await init();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(['jobs'], 'readwrite');
            const store = transaction.objectStore('jobs');
            
            const getRequest = store.get(jobId);
            getRequest.onsuccess = () => {
                const data = getRequest.result;
                if (!data) return reject('Job not found');

                const updatedData = { ...data, ...updates };
                const putRequest = store.put(updatedData);
                putRequest.onsuccess = () => resolve(putRequest.result);
                putRequest.onerror = () => reject(putRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Add a file to the files store.
     */
    async function addFile(data) {
        const database = await init();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');
            
            const fileRecord = {
                status: 'pending',
                jobId: data.jobId,
                name: data.name,
                originalBlob: data.originalBlob,
                outputBlob: null,
                hash: data.hash || null,
                ...data
            };

            const request = store.add(fileRecord);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update a file record.
     */
    async function updateFile(fileId, updates) {
        const database = await init();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');
            
            const getRequest = store.get(fileId);
            getRequest.onsuccess = () => {
                const data = getRequest.result;
                if (!data) return reject('File not found');

                const updatedData = { ...data, ...updates };
                const putRequest = store.put(updatedData);
                putRequest.onsuccess = () => resolve(putRequest.result);
                putRequest.onerror = () => reject(putRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Get jobs that are not completed or failed.
     */
    async function getIncompleteJobs() {
        const database = await init();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(['jobs'], 'readonly');
            const store = transaction.objectStore('jobs');
            const index = store.index('status');
            
            const results = [];
            const openCursor = index.openCursor();
            openCursor.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.status === 'pending' || cursor.value.status === 'processing') {
                        results.push(cursor.value);
                    }
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            openCursor.onerror = () => reject(openCursor.error);
        });
    }

    /**
     * Get all files for a specific job.
     */
    async function getFilesByJob(jobId) {
        const database = await init();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const index = store.index('jobId');
            
            const request = index.getAll(IDBKeyRange.only(jobId));
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save a chunk of data for a file. (Task 06-02)
     */
    async function saveChunk(fileId, index, data) {
        const database = await init();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(['chunks'], 'readwrite');
            const store = transaction.objectStore('chunks');
            
            const request = store.add({
                fileId,
                index,
                data // Uint8Array or Blob
            });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all chunks for a file, ordered by index. (Task 06-02)
     */
    async function getChunks(fileId) {
        const database = await init();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(['chunks'], 'readonly');
            const store = transaction.objectStore('chunks');
            const index = store.index('fileId');
            
            const request = index.getAll(IDBKeyRange.only(fileId));
            request.onsuccess = () => {
                const chunks = request.result;
                // Ensure they are sorted by index
                chunks.sort((a, b) => a.index - b.index);
                resolve(chunks);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Reassemble a file from its chunks and return a Blob. (Task 06-02)
     */
    async function assembleFileFromChunks(fileId, mimeType = 'application/pdf') {
        const chunks = await getChunks(fileId);
        if (chunks.length === 0) return null;
        
        const blobParts = chunks.map(c => c.data);
        return new Blob(blobParts, { type: mimeType });
    }

    return {
        init,
        createJob,
        updateJob,
        addFile,
        updateFile,
        getIncompleteJobs,
        getFilesByJob,
        saveChunk,
        getChunks,
        assembleFileFromChunks
    };
})();
