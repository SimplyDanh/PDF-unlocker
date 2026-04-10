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
                    unmount: vi.fn(),
                    stat: vi.fn().mockReturnValue({ size: 100 })
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
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(10))
        });
        vi.stubGlobal('fetch', mockFetch);

        // Mock WebAssembly
        const mockWebAssembly = {
            instantiateStreaming: vi.fn().mockResolvedValue({ instance: { exports: {} } }),
            instantiate: vi.fn().mockResolvedValue({ instance: { exports: {} } })
        };
        vi.stubGlobal('WebAssembly', mockWebAssembly);

        // Mock crypto.subtle.digest
        const mockDigest = vi.fn().mockResolvedValue(new Uint8Array(32).fill(0).buffer);
        vi.stubGlobal('crypto', {
            subtle: {
                digest: mockDigest
            }
        });

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
            },
            crypto: {
                subtle: {
                    digest: mockDigest
                }
            }
        };

        // Evaluate the worker code in a simulated worker scope
        const fn = new Function('self', 'importScripts', 'Module', 'fetch', 'Uint8Array', 'WebAssembly', 'navigator', 'crypto', pdfWorkerContent);
        fn(workerScope, workerScope.importScripts, mockModule, mockFetch, Uint8Array, mockWebAssembly, navigator, workerScope.crypto);
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

    it('should process a valid PDF and return success message with hash and Transferable', async () => {
        const mockQpdf = {
            FS: {
                mkdir: vi.fn(),
                mount: vi.fn(),
                unmount: vi.fn(),
                writeFile: vi.fn(),
                readFile: vi.fn().mockReturnValue(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x31])),
                unlink: vi.fn(),
                stat: vi.fn().mockReturnValue({ size: 100 })
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

        // Check for success message with hash
        expect(postMessage).toHaveBeenCalledWith(
            expect.objectContaining({ 
                type: 'success', 
                name: 'test.pdf',
                hash: expect.any(String)
            }),
            expect.any(Array) // Transferable Objects (ArrayBuffer)
        );

        const successMsg = postMessage.mock.calls.find(call => call[0].type === 'success')[0];
        expect(successMsg.hash).toHaveLength(64); // SHA-256 hex string

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
                unlink: vi.fn(),
                stat: vi.fn().mockReturnValue({ size: 100 })
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

    it('should use chunked streaming for files over 250MB', async () => {
        const STREAM_THRESHOLD = 250 * 1024 * 1024;
        const largeSize = STREAM_THRESHOLD + 1024;
        
        const mockQpdf = {
            FS: {
                mkdir: vi.fn(),
                mount: vi.fn(),
                unmount: vi.fn(),
                stat: vi.fn().mockReturnValue({ size: largeSize }),
                open: vi.fn().mockReturnValue(1), // fd = 1
                read: vi.fn((fd, buffer, offset, length, position) => {
                    // Fill buffer with some dummy data
                    for (let i = 0; i < length; i++) buffer[i] = 0xAA;
                    return length;
                }),
                close: vi.fn(),
                unlink: vi.fn()
            },
            WORKERFS: {},
            callMain: vi.fn()
        };
        mockModule.instance = mockQpdf;

        const validPdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00]);
        const file = new Blob([validPdfContent]);
        file.name = 'large.pdf';

        await workerScope.onmessage({ 
            data: { 
                type: 'process', 
                file: file, 
                name: 'large.pdf' 
            } 
        });

        // Verify status message for streaming
        expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ 
            type: 'status', 
            main: 'Streaming output...' 
        }));

        // Verify chunks were sent
        expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ 
            type: 'chunk',
            chunkIndex: 0
        }), expect.any(Array));

        // Verify final success message for streamed file
        expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ 
            type: 'success', 
            streamed: true,
            hash: expect.stringContaining('streamed-')
        }));

        // Verify FS interactions for streaming
        expect(mockQpdf.FS.open).toHaveBeenCalled();
        expect(mockQpdf.FS.read).toHaveBeenCalled();
        expect(mockQpdf.FS.close).toHaveBeenCalled();
    });
});
