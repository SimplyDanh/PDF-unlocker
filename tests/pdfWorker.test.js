import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * pdfWorker unit tests
 * Part of Phase 1: Engine Optimization.
 */

// Load the worker script content
const pdfWorkerPath = path.resolve(__dirname, '../services/pdfWorker.js');
const pdfWorkerContent = fs.readFileSync(pdfWorkerPath, 'utf8');

describe('pdfWorker', () => {
    let workerScope;
    let postMessage;
    let mockModule;

    beforeEach(() => {
        // Setup mock worker environment
        postMessage = vi.fn();
        
        // Mock global Module for Emscripten
        mockModule = vi.fn().mockImplementation(async (options) => {
            const moduleInstance = mockModule.instance || { 
                FS: { 
                    writeFile: vi.fn(), 
                    readFile: vi.fn(), 
                    unlink: vi.fn(),
                    mkdir: vi.fn(),
                    mount: vi.fn(),
                    unmount: vi.fn()
                }, 
                WORKERFS: {},
                callMain: vi.fn() 
            };
            
            if (mockModule.shouldFail) {
                throw new Error("Simulated WASM Error");
            }
            
            return moduleInstance;
        });
        vi.stubGlobal('Module', mockModule);
        
        // Mock global importScripts
        const mockImportScripts = vi.fn();
        vi.stubGlobal('importScripts', mockImportScripts);
        
        // Mock global fetch
        const mockFetch = vi.fn();
        vi.stubGlobal('fetch', mockFetch);

        // Mock WebAssembly
        const mockWebAssembly = {
            instantiateStreaming: vi.fn().mockResolvedValue({ instance: { exports: {} } }),
            instantiate: vi.fn()
        };
        vi.stubGlobal('WebAssembly', mockWebAssembly);

        // Mock navigator
        vi.stubGlobal('navigator', { onLine: true });

        // Mock Blob for test environment if needed
        if (typeof global.Blob === 'undefined') {
            global.Blob = class {
                constructor(content) { this.content = content; this.size = content[0].length; }
                slice() { return new global.Blob(this.content); }
                async arrayBuffer() { return this.content[0].buffer; }
            };
        }

        workerScope = {
            postMessage: postMessage,
            importScripts: mockImportScripts,
            onmessage: null,
            console: {
                log: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            }
        };

        // Evaluate the worker code in a simulated worker scope
        const fn = new Function('self', 'importScripts', 'Module', 'fetch', 'Uint8Array', 'WebAssembly', 'navigator', pdfWorkerContent);
        fn(workerScope, workerScope.importScripts, mockModule, mockFetch, Uint8Array, mockWebAssembly, navigator);
    });

    it('should initialize WASM successfully', async () => {
        const mockQpdf = { FS: {}, callMain: vi.fn() };
        mockModule.instance = mockQpdf;
        mockModule.shouldFail = false;

        // Trigger init message
        await workerScope.onmessage({ data: { type: 'init' } });

        expect(postMessage).toHaveBeenCalledWith({ type: 'ready' });
        expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ 
            type: 'status', 
            state: 'loading' 
        }));
        expect(mockModule).toHaveBeenCalledWith(expect.objectContaining({
            locateFile: expect.any(Function)
        }));
    });

    it('should handle WASM initialization failure', async () => {
        mockModule.shouldFail = true;

        await workerScope.onmessage({ data: { type: 'init' } });

        expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ 
            type: 'error', 
            main: 'Engine Error'
        }));
    });

    it('should reject non-PDF files via magic byte validation', async () => {
        const invalidPdfContent = new Uint8Array([0, 1, 2, 3]);
        const file = new Blob([invalidPdfContent]);

        await workerScope.onmessage({ 
            data: { 
                type: 'process', 
                file: file, 
                name: 'fake.pdf' 
            } 
        });

        expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ 
            type: 'error', 
            main: 'Invalid PDF' 
        }));
    });

    it('should process a valid PDF and return success message with Transferable', async () => {
        const mockQpdf = {
            FS: {
                mkdir: vi.fn(),
                mount: vi.fn(),
                unmount: vi.fn(),
                writeFile: vi.fn(),
                readFile: vi.fn().mockReturnValue(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x31])),
                unlink: vi.fn()
            },
            WORKERFS: {},
            callMain: vi.fn()
        };
        mockModule.instance = mockQpdf;

        const validPdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00]);
        const file = new Blob([validPdfContent]);
        file.name = 'test.pdf';

        await workerScope.onmessage({ 
            data: { 
                type: 'process', 
                file: file, 
                name: 'test.pdf' 
            } 
        });

        // Check if status processing message was sent
        expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ 
            type: 'status', 
            state: 'processing',
            sub: expect.stringContaining('WorkerFS')
        }));

        // Check for success message
        expect(postMessage).toHaveBeenCalledWith(
            expect.objectContaining({ 
                type: 'success', 
                name: 'test.pdf' 
            }),
            expect.any(Array) // Transferable Objects (ArrayBuffer)
        );

        // Verify WorkerFS interactions
        expect(mockQpdf.FS.mount).toHaveBeenCalledWith(
            mockQpdf.WORKERFS, 
            expect.objectContaining({ files: [file] }), 
            "/mnt"
        );
        expect(mockQpdf.FS.unmount).toHaveBeenCalledWith("/mnt");
        expect(mockQpdf.FS.unlink).toHaveBeenCalled();
    });

    it('should not require manual buffer zeroing with WorkerFS (SEC-3 transition)', async () => {
        // With WorkerFS, the file is not copied into WASM heap initially.
        // We verify that the process still completes securely.
        const mockQpdf = {
            FS: {
                mkdir: vi.fn(),
                mount: vi.fn(),
                unmount: vi.fn(),
                readFile: vi.fn().mockReturnValue(new Uint8Array([0x25, 0x50, 0x44, 0x46])),
                unlink: vi.fn()
            },
            WORKERFS: {},
            callMain: vi.fn()
        };
        mockModule.instance = mockQpdf;

        const validPdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0xFF]);
        const file = new Blob([validPdfContent]);
        file.name = 'security.pdf';

        await workerScope.onmessage({ 
            data: { 
                type: 'process', 
                file: file, 
                name: 'security.pdf' 
            } 
        });

        // Ensure success was reached
        expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }), expect.any(Array));
    });
});
