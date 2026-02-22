/**
 * Presentation Layer
 * DOM references, SVG helpers, event listeners, theme toggle, and modal logic.
 * Depends on: pdfService.js (loaded first via classic script tag).
 */

/* global initWasm, processFile */

// --- DOM References ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const statusText = document.getElementById('status-text');
const subStatusText = document.getElementById('sub-status-text');
const statusIcon = document.getElementById('status-icon');
const spinner = document.getElementById('spinner');

// --- WASM Bootstrap ---
initWasm().catch(err => {
    console.error("Initialization error:", err);
    updateStatus('error', 'Initialization Error', 'Failed to load the engine. Please check your connection and reload.');
});

// --- SVG Path Constants ---
const SVGS = {
    upload: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>`,
    success: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>`,
    error: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>`
};

// Safe SVG update — avoids innerHTML to prevent latent XSS vectors
function setSvgContent(svgElement, pathMarkup) {
    while (svgElement.firstChild) {
        svgElement.removeChild(svgElement.firstChild);
    }
    const temp = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    temp.innerHTML = pathMarkup;
    while (temp.firstChild) {
        svgElement.appendChild(temp.firstChild);
    }
}

// --- Status Management ---
function updateStatus(state, mainText, subText) {
    statusText.textContent = mainText;
    subStatusText.textContent = subText;

    // Manage ARIA attributes for screen readers
    dropZone.setAttribute('aria-busy', state === 'processing' ? 'true' : 'false');

    dropZone.className = 'drop-zone';
    spinner.style.display = 'none';
    statusIcon.style.display = 'block';

    if (state === 'processing') {
        dropZone.classList.add('processing');
        spinner.style.display = 'block';
        statusIcon.style.display = 'none';
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
        // Guard: only reset if the service layer is no longer processing
        if (typeof isProcessing !== 'undefined' && !isProcessing) {
            updateStatus('default', 'Awaiting Document', 'Drag & drop a protected PDF here, or click to browse');
        }
    }, 6000);
}

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

// --- Queue Manager ---
async function processQueue() {
    if (isQueueRunning) return;
    isQueueRunning = true;

    const totalFilesThisBatch = fileQueue.length;
    let currentProcessed = 0;

    while (fileQueue.length > 0) {
        const currentFile = fileQueue.shift();
        currentProcessed++;

        // Update UI to show progress
        updateStatus('processing', `Unlocking (${currentProcessed}/${totalFilesThisBatch})...`, `Processing: ${currentFile.name}`);

        // Await the file processing so we never crash browser RAM limits
        await processFile(currentFile, serviceCallbacks);
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
        if (typeof isProcessing !== 'undefined' && !isProcessing) dropZone.classList.add('dragover');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('dragover');
    }, false);
});

dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf");
        if (files.length === 0) {
            updateStatus('error', 'Invalid Format', 'Please upload valid PDF documents.');
            resetState();
        } else {
            fileQueue.push(...files);
            processQueue();
        }
    }
    dropZone.blur();
});

dropZone.addEventListener('click', () => {
    if (typeof isProcessing !== 'undefined' && !isProcessing) fileInput.click();
});

// Keyboard accessibility: trigger specific actions on Enter/Space
dropZone.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && (typeof isProcessing === 'undefined' || !isProcessing)) {
        preventDefaults(e);
        fileInput.click();
    }
});

fileInput.addEventListener('change', function () {
    if (this.files.length > 0) {
        const files = Array.from(this.files).filter(f => f.type === "application/pdf");
        fileQueue.push(...files);
        processQueue();
    }
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

function openModal() {
    modalBackdrop.classList.add('open');
    modalBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modalBackdrop.classList.remove('open');
    modalBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

aboutToggle.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);

// Close modal when clicking outside the panel
modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBackdrop.classList.contains('open')) {
        closeModal();
    }
});
