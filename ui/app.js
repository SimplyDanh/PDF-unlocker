/**
 * Presentation Layer
 * DOM references, SVG helpers, event listeners, theme toggle, and modal logic.
 * Depends on: pdfService.js (loaded first via classic script tag).
 */

/* global pdfService */

// --- DOM References ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const statusText = document.getElementById('status-text');
const subStatusText = document.getElementById('sub-status-text');
const statusIcon = document.getElementById('status-icon');
const spinner = document.getElementById('spinner');

// --- WASM Bootstrap ---
pdfService.initWasm().catch(err => {
    console.error("Initialization error:", err);
    if (pdfService.wasmSupportStatus === 'blocked') {
        updateStatus('error', 'Browser Restricted', 'Your security policy blocks WebAssembly. Please try a different browser.');
    } else {
        updateStatus('error', 'Initialization Error', 'Failed to load the engine. Please check your connection and reload.');
    }
});

// --- Async Font Swap (CSP-safe alternative to inline onload) ---
const fontLink = document.getElementById('google-fonts');
if (fontLink) {
    fontLink.addEventListener('load', () => { fontLink.media = 'all'; });
    // If already loaded (cached), swap immediately
    if (fontLink.sheet) fontLink.media = 'all';
}

// --- SVG Path Constants ---
const SVGS = {
    upload: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>`,
    success: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>`,
    error: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>`
};

// Safe SVG update — avoids innerHTML on the live document to prevent latent XSS vectors
function setSvgContent(svgElement, pathMarkup) {
    while (svgElement.firstChild) {
        svgElement.removeChild(svgElement.firstChild);
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${pathMarkup}</svg>`, 'image/svg+xml');
    const newPaths = doc.documentElement.childNodes;

    // Convert NodeList to array before appending to avoid live-collection mutation issues
    Array.from(newPaths).forEach(node => {
        svgElement.appendChild(node);
    });
}

// --- Status Management ---
function updateStatus(state, mainText, subText) {
    statusText.textContent = mainText;
    subStatusText.textContent = subText;

    // Manage ARIA attributes for screen readers
    dropZone.setAttribute('aria-busy', state === 'processing' ? 'true' : 'false');

    dropZone.className = 'drop-zone';
    spinner.classList.remove('visible');
    statusIcon.classList.remove('hidden');

    if (state === 'processing') {
        dropZone.classList.add('processing');
        spinner.classList.add('visible');
        statusIcon.classList.add('hidden');
    } else if (state === 'success') {
        dropZone.classList.add('success');
        setSvgContent(statusIcon, SVGS.success);
    } else if (state === 'error') {
        dropZone.classList.add('error');
        setSvgContent(statusIcon, SVGS.error);
    } else {
        setSvgContent(statusIcon, SVGS.upload);
    }
}

function resetState() {
    setTimeout(() => {
        // Guard: only reset if the service layer and queue are no longer processing
        // and WASM is actually supported
        if (!pdfService.isProcessing && !isQueueRunning && pdfService.wasmSupportStatus !== 'blocked') {
            updateStatus('default', 'Awaiting Document', 'Drag & drop protected PDFs here, or click to browse');
        }
    }, 6000);
}

const MAX_BATCH_FILES = 20;
let fileQueue = [];
let isQueueRunning = false;

// --- Callbacks object passed to the service layer ---
const serviceCallbacks = {
    onStatus: (state, mainText, subText) => {
        // Only update the main UI text if we aren't in the middle of a queue
        // The queue manager handles the 'Unlocking (x/y)...' text
        if (state !== 'processing') {
            updateStatus(state, mainText, subText);
        } else {
            // For processing state, just spin the UI but let the queue manager set the text
            updateStatus('processing', statusText.textContent, subStatusText.textContent);
        }
    },
    fileInput: fileInput
};

const ZIP_MEMORY_LIMIT_MB = 150;
const ZIP_MEMORY_LIMIT_BYTES = ZIP_MEMORY_LIMIT_MB * 1024 * 1024;

// --- Queue Manager ---
async function processQueue() {
    if (isQueueRunning) return;
    isQueueRunning = true;

    const totalFilesThisBatch = fileQueue.length;
    let currentProcessed = 0;

    // Calculate total size to determine if we can safely zip in RAM
    const totalBatchSize = fileQueue.reduce((acc, f) => acc + f.size, 0);
    // Use ZIP only if memory is under threshold and there is more than 1 file
    const useZip = (totalBatchSize < ZIP_MEMORY_LIMIT_BYTES) && (totalFilesThisBatch > 1);

    let zip = useZip ? new JSZip() : null;
    let successfulBlobs = 0;

    while (fileQueue.length > 0) {
        const currentFile = fileQueue.shift();
        currentProcessed++;

        // Update UI to show progress
        updateStatus('processing', `Unlocking (${currentProcessed}/${totalFilesThisBatch})...`, `Processing: ${currentFile.name}`);

        // Await the file processing. Returns Blob if useZip is true, else null.
        const blob = await pdfService.processFile(currentFile, serviceCallbacks, { returnBlob: useZip });

        if (useZip && blob) {
            const originalName = currentFile.name;
            const nameWithoutExt = originalName.toLowerCase().endsWith('.pdf') ? originalName.slice(0, -4) : originalName;
            zip.file(`${nameWithoutExt}_unlocked.pdf`, blob);
            successfulBlobs++;
        }
    }

    if (useZip && successfulBlobs > 0) {
        updateStatus('processing', 'Compressing files...', 'Building your ZIP archive securely in memory.');
        try {
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Unlocked_PDFs.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            updateStatus('success', 'Success! Downloading ZIP...', 'All documents preserved and unlocked.');
        } catch (error) {
            console.error("ZIP Generation error:", error);
            updateStatus('error', 'ZIP Failed', 'Failed to compress files due to browser memory limits.');
        }
    }

    isQueueRunning = false;
    // Delay slightly to let the last success message show
    setTimeout(() => {
        resetState();
    }, 4000);
}

// --- Interaction Logic ---
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        if (!pdfService.isProcessing && !isQueueRunning && pdfService.wasmSupportStatus !== 'blocked') dropZone.classList.add('dragover');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('dragover');
    }, false);
});

function queueFiles(fileList) {
    if (pdfService.wasmSupportStatus === 'blocked') {
        updateStatus('error', 'Browser Restricted', 'WebAssembly is blocked. Please use a supported browser.');
        return;
    }
    const files = Array.from(fileList).filter(f => f.type === "application/pdf");
    if (files.length === 0) {
        updateStatus('error', 'Invalid Format', 'Please upload valid PDF documents.');
        resetState();
        return;
    }
    if (files.length > MAX_BATCH_FILES) {
        updateStatus('error', 'Batch Limit Exceeded', `Maximum batch size is ${MAX_BATCH_FILES} files.`);
        resetState();
        return;
    }
    fileQueue.push(...files);
    processQueue();
}

dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length > 0) {
        queueFiles(e.dataTransfer.files);
    }
    dropZone.blur();
});

dropZone.addEventListener('click', () => {
    if (!pdfService.isProcessing && !isQueueRunning && pdfService.wasmSupportStatus !== 'blocked') fileInput.click();
});

// Keyboard accessibility: trigger specific actions on Enter/Space
dropZone.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !pdfService.isProcessing && !isQueueRunning && pdfService.wasmSupportStatus !== 'blocked') {
        preventDefaults(e);
        fileInput.click();
    }
});

fileInput.addEventListener('change', function () {
    if (this.files.length > 0) {
        queueFiles(this.files);
    }
    this.value = ''; // Reset input so same file can be re-selected if needed
    dropZone.blur();
});

// --- Theme Toggle Logic ---
const themeToggle = document.getElementById('theme-toggle');
const rootElement = document.documentElement;
const savedTheme = localStorage.getItem('theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    rootElement.setAttribute('data-theme', 'dark');
}

themeToggle.addEventListener('click', () => {
    const currentTheme = rootElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    rootElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// --- Modal About Toggle Logic ---
const aboutToggle = document.getElementById('about-toggle');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalClose = document.getElementById('modal-close');
const aboutPanel = document.querySelector('.about-panel');

function openModal() {
    modalBackdrop.classList.add('open');
    modalBackdrop.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    // Move focus into the modal for screen readers
    modalClose.focus();
}

function closeModal() {
    modalBackdrop.classList.remove('open');
    modalBackdrop.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    // Return focus to the trigger element
    aboutToggle.focus();
}

aboutToggle.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);

// Close modal when clicking outside the panel
modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
});

// Close modal on Escape key + focus trap
document.addEventListener('keydown', (e) => {
    if (!modalBackdrop.classList.contains('open')) return;

    if (e.key === 'Escape') {
        closeModal();
        return;
    }

    // Focus trap: cycle Tab within modal
    if (e.key === 'Tab') {
        const focusable = aboutPanel.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
});
