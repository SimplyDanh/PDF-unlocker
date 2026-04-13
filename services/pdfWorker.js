/* global importScripts, Module */

/**
 * PDF Processing Worker
 * Handles WASM initialization and PDF processing in a background thread.
 * Part of Phase 1: Engine Optimization.
 */

// Import the QPDF WASM wrapper from local vendor directory
importScripts('../assets/vendor/qpdf/qpdf.js');

let qpdfModule = null;

/**
 * Helper to convert buffer to hex string.
 * @param {ArrayBuffer} buffer 
 * @returns {string}
 */
function bufferToHex(buffer) {
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Initialize the QPDF WebAssembly module.
 */
async function initWasm() {
    if (qpdfModule) {
        self.postMessage({ type: 'ready' });
        return;
    }

    try {
        self.postMessage({ 
            type: 'status', 
            state: 'loading', 
            main: 'Initializing Engine', 
            sub: 'Loading WebAssembly core...' 
        });

        // DEP-INT-04: Subresource Integrity (SRI) validation for local WASM binary
        const wasmUrl = '../assets/vendor/qpdf/qpdf.wasm';
        const wasmSri = 'sha384-9ESKDLiqwqZ9ln5RdWhoE5TM/zLYG2UoW/AMa0KeND/fhDO5ZJsRH6FTJ3Dera+p';

        qpdfModule = await Module({
            locateFile: (path) => `../assets/vendor/qpdf/${path}`,
            instantiateWasm: (info, receiveInstance) => {
                // Manual fetch with SRI to ensure binary has not been tampered with
                fetch(wasmUrl, { integrity: wasmSri })
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        return response.arrayBuffer();
                    })
                    .then(buffer => WebAssembly.instantiate(buffer, info))
                    .then(result => receiveInstance(result.instance))
                    .catch(error => {
                        console.error("Worker: SRI Validation or WASM instantiation failed:", error);
                        self.postMessage({ 
                            type: 'error', 
                            main: 'Security Error', 
                            sub: 'The PDF engine failed integrity validation and was blocked.' 
                        });
                    });
                return {}; // instantiateWasm is asynchronous
            },
            print: (text) => console.log('Worker stdout:', text),
            printErr: (text) => console.error('Worker stderr:', text)
        });

        self.postMessage({ type: 'ready' });
    } catch (error) {
        console.error("Worker: Failed to initialize QPDF WASM:", error);
        // Avoid sending duplicate error if already sent in instantiateWasm
        if (!qpdfModule) {
            self.postMessage({ 
                type: 'error', 
                main: 'Engine Error', 
                sub: 'Failed to initialize the PDF processing engine.' 
            });
        }
    }
}

/**
 * Process a PDF file using MEMFS (≤150MB) or WorkerFS (>150MB).
 * MEMFS keeps the file entirely in the WASM heap for fast random-access I/O.
 * WorkerFS is used as a fallback for very large files to avoid OOM.
 * @param {File|Blob} file - The input PDF file.
 * @param {string} fileName - Original filename for display.
 */
async function processFile(file, fileName) {
    if (!qpdfModule) {
        await initWasm();
    }

    const mountPoint = '/mnt';
    let isMounted = false;
    let inputPath = '';
    const outputName = `output_${Date.now()}.pdf`;

    try {

        // Magic-byte validation using minimal memory (only 4 bytes)
        const headerBuffer = await file.slice(0, 4).arrayBuffer();
        const header = new Uint8Array(headerBuffer);
        
        if (header.length < 4 ||
            header[0] !== 0x25 || header[1] !== 0x50 ||
            header[2] !== 0x44 || header[3] !== 0x46) {
            self.postMessage({ 
                type: 'error', 
                main: 'Invalid PDF', 
                sub: 'File header does not match a valid PDF signature.' 
            });
            return;
        }

        const USE_MEMFS_THRESHOLD = 150 * 1024 * 1024; // 150MB

        if (file.size <= USE_MEMFS_THRESHOLD) {
            self.postMessage({ 
                type: 'status', 
                state: 'processing', 
                main: 'Loading into memory...', 
                sub: 'Optimizing for high-performance processing.' 
            });
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            inputPath = `input_${Date.now()}.pdf`;
            qpdfModule.FS.writeFile(inputPath, uint8Array);
            // Security: zero source buffer after writing to WASM FS
            uint8Array.fill(0);
            isMounted = false;
        } else {
            try {
                qpdfModule.FS.mkdir(mountPoint);
            } catch (e) {
                if (e.errno !== 17) console.warn('Worker: FS.mkdir error:', e);
            }
            qpdfModule.FS.mount(qpdfModule.WORKERFS, { files: [file] }, mountPoint);
            isMounted = true;
            inputPath = `${mountPoint}/${file.name}`;
            
            self.postMessage({ 
                type: 'status', 
                state: 'processing', 
                main: 'Unlocking locally...', 
                sub: 'Accessing file via WorkerFS zero-copy mounting.' 
            });
        }

        self.postMessage({ 
            type: 'status', 
            state: 'processing', 
            main: 'Decrypting...', 
            sub: 'Removing restrictions securely via QPDF core.' 
        });

        // Execute QPDF decryption with maximum performance flags:
        // --preserve-unreferenced-resources: skip object cleanup pass
        // --compress-streams=n: skip recompression of streams (biggest perf win)
        // --decode-level=none: skip stream decoding entirely
        // --object-streams=preserve: keep existing object stream structure
        qpdfModule.callMain([
            "--decrypt",
            "--preserve-unreferenced-resources",
            "--compress-streams=n",
            "--decode-level=none",
            "--object-streams=preserve",
            inputPath,
            outputName
        ]);
        
        self.postMessage({ 
            type: 'status', 
            state: 'processing', 
            main: 'Finalizing...', 
            sub: 'Preparing output.' 
        });

        // Constants for chunked streaming (Task 06-02)
        const CHUNK_SIZE = 64 * 1024 * 1024; // 64MB
        const STREAM_THRESHOLD = 250 * 1024 * 1024; // 250MB

        const outputStats = qpdfModule.FS.stat(outputName);
        const outputSize = outputStats.size;

        if (outputSize > STREAM_THRESHOLD) {
            self.postMessage({ 
                type: 'status', 
                state: 'processing', 
                main: 'Streaming output...', 
                sub: `Large file (${(outputSize / (1024 * 1024)).toFixed(1)} MB) detected. Using chunked transfer.` 
            });

            const fd = qpdfModule.FS.open(outputName, 'r');
            const totalChunks = Math.ceil(outputSize / CHUNK_SIZE);
            
            for (let i = 0; i < totalChunks; i++) {
                const buffer = new Uint8Array(Math.min(CHUNK_SIZE, outputSize - i * CHUNK_SIZE));
                qpdfModule.FS.read(fd, buffer, 0, buffer.length, i * CHUNK_SIZE);
                
                const chunkBuffer = buffer.buffer;
                self.postMessage({
                    type: 'chunk',
                    chunkIndex: i,
                    totalChunks: totalChunks,
                    data: chunkBuffer
                }, [chunkBuffer]);
            }
            
            qpdfModule.FS.close(fd);

            // For ultra-large files, we provide a size-based signature instead of a full SHA-256
            // to avoid loading the entire file into the worker's memory just for hashing.
            const hashPlaceholder = `streamed-${outputSize}-${Date.now()}`;

            self.postMessage({ 
                type: 'success', 
                streamed: true,
                name: fileName,
                hash: hashPlaceholder
            });
        } else {
            // Read the result from MEMFS (output is in MEMFS)
            const outputFile = qpdfModule.FS.readFile(outputName);
            
            // Calculate SHA-256 hash of the output
            const hashBuffer = await self.crypto.subtle.digest('SHA-256', outputFile);
            const hashHex = bufferToHex(hashBuffer);

            // Send back the processed file using Transferable Objects
            const outputBuffer = new Uint8Array(outputFile).buffer;
            
            self.postMessage({ 
                type: 'success', 
                blob: outputBuffer, 
                name: fileName,
                hash: hashHex
            }, [outputBuffer]);
        }

        // Cleanup output from MEMFS immediately
        try {
            qpdfModule.FS.unlink(outputName);
        } catch (e) {
            console.warn('Worker: Failed to unlink output file:', e);
        }

    } catch (error) {
        console.error("Worker: PDF Processing error:", error);
        self.postMessage({ 
            type: 'error', 
            main: 'Processing Failed', 
            sub: 'The document appears to be corrupted or too heavily encrypted.' 
        });
    } finally {
        // Ensure we always unmount or unlink to free up memory/mount points
        if (isMounted) {
            try {
                qpdfModule.FS.unmount(mountPoint);
            } catch (e) {
                console.warn('Worker: Failed to unmount WorkerFS:', e);
            }
        } else if (inputPath && inputPath.startsWith('input_')) {
            try {
                qpdfModule.FS.unlink(inputPath);
            } catch (e) {
                console.warn('Worker: Failed to unlink MEMFS input file:', e);
            }
        }
    }
}

/**
 * Listen for messages from the main thread.
 */
self.onmessage = async (e) => {
    const { type, file, name } = e.data;

    switch (type) {
        case 'init':
            await initWasm();
            break;
        case 'process':
            // file is now a File/Blob object (from Task 1 refactor)
            await processFile(file, name);
            break;
        default:
            console.warn('Worker: Unknown message type:', type);
    }
};
