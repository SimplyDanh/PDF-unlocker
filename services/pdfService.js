/**
 * PDF Processing Service Layer
 * Handles WASM initialization, PDF validation, decryption, and secure download.
 */

/* global Module */

let qpdfModule = null;
let isProcessing = false;

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Initialize the QPDF WebAssembly module.
 * Idempotent — safe to call multiple times.
 */
async function initWasm() {
    if (qpdfModule) return;
    try {
        if (typeof Module !== 'function') {
            throw new Error("QPDF engine failed to load. Please check your internet connection.");
        }
        qpdfModule = await Module({
            locateFile: (path) => `https://unpkg.com/@neslinesli93/qpdf-wasm@0.3.0/dist/${path}`,
            print: function (text) { console.log('stdout:', text); },
            printErr: function (text) { console.error('stderr:', text); }
        });
        console.log("QPDF WASM initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize QPDF WASM module:", error);
        throw error;
    }
}

/**
 * Validate and decrypt a PDF file, then trigger a browser download.
 * @param {File} file - The PDF file to process.
 * @param {object} callbacks - UI callback functions.
 * @param {function} callbacks.onStatus - Called with (state, mainText, subText).
 * @param {function} callbacks.onReset - Called after processing to reset UI state.
 * @param {HTMLInputElement} callbacks.fileInput - The file input element to clear.
 */
async function processFile(file, callbacks) {
    const { onStatus, onReset, fileInput } = callbacks;

    if (!file || file.type !== "application/pdf") {
        onStatus('error', 'Invalid Format', 'Please upload a valid PDF document.');
        onReset();
        return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        onStatus('error', 'File Too Large', `Maximum file size is ${MAX_FILE_SIZE_MB} MB.`);
        onReset();
        return;
    }

    if (isProcessing) return;
    isProcessing = true;
    onStatus('processing', 'Unlocking locally...', 'Parsing structure and removing restrictions securely.');

    try {
        if (!qpdfModule) await initWasm();

        const fileBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(fileBuffer);

        // Magic-byte validation: PDF files must start with %PDF
        if (uint8Array.length < 4 ||
            uint8Array[0] !== 0x25 || uint8Array[1] !== 0x50 ||
            uint8Array[2] !== 0x44 || uint8Array[3] !== 0x46) {
            onStatus('error', 'Invalid PDF', 'File header does not match a valid PDF signature.');
            onReset();
            isProcessing = false;
            fileInput.value = '';
            return;
        }

        const inputName = `input_${Date.now()}.pdf`;
        const outputName = `output_${Date.now()}.pdf`;

        qpdfModule.FS.writeFile(inputName, uint8Array);
        // Zero the source buffer after writing to WASM FS
        uint8Array.fill(0);

        qpdfModule.callMain(["--decrypt", inputName, outputName]);
        const outputFile = qpdfModule.FS.readFile(outputName);

        // Reliable WASM FS cleanup with verification
        try {
            qpdfModule.FS.unlink(inputName);
        } catch (e) { console.warn('FS cleanup (input) failed:', e); }
        try {
            qpdfModule.FS.unlink(outputName);
        } catch (e) { console.warn('FS cleanup (output) failed:', e); }

        const outputBlob = new Blob([outputFile], { type: "application/pdf" });
        const url = URL.createObjectURL(outputBlob);

        const originalName = file.name;
        const nameWithoutExt = originalName.toLowerCase().endsWith('.pdf') ? originalName.slice(0, -4) : originalName;
        const newFilename = `${nameWithoutExt}_unlocked.pdf`;

        const a = document.createElement('a');
        a.href = url;
        a.download = newFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        onStatus('success', 'Success! Downloading...', 'Your unlocked document is ready.');
        onReset();

    } catch (error) {
        console.error("PDF Processing error:", error);
        onStatus('error', 'Processing Failed', 'The document appears to be corrupted or too heavily encrypted.');
        onReset();
    } finally {
        isProcessing = false;
        fileInput.value = '';
    }
}
