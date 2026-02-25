import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Helper to load the script into the test environment
const pdfServiceContent = fs.readFileSync(path.resolve(__dirname, '../services/pdfService.js'), 'utf8');

describe('pdfService', () => {
    let pdfService;

    beforeEach(() => {
        // Setup mock environment
        vi.stubGlobal('console', {
            log: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        });

        // Evaluate the service code in the current context
        // This is a way to test the IIFE without changing the source to a module
        const mockWindow = {};
        const fn = new Function('window', pdfServiceContent);
        fn(mockWindow);
        pdfService = mockWindow.pdfService;
    });

    it('should reject non-PDF files', async () => {
        const mockFile = { type: 'text/plain', name: 'test.txt' };
        const onStatus = vi.fn();
        const fileInput = { value: 'something' };

        const result = await pdfService.processFile(mockFile, { onStatus, fileInput });

        expect(result).toBeNull();
        expect(onStatus).toHaveBeenCalledWith('error', 'Invalid Format', expect.any(String));
    });

    it('should reject files that are too large', async () => {
        const mockFile = {
            type: 'application/pdf',
            name: 'large.pdf',
            size: 101 * 1024 * 1024 // 101MB
        };
        const onStatus = vi.fn();
        const fileInput = { value: 'something' };

        const result = await pdfService.processFile(mockFile, { onStatus, fileInput });

        expect(result).toBeNull();
        expect(onStatus).toHaveBeenCalledWith('error', 'File Too Large', expect.any(String));
    });

    it('should validate magic bytes', async () => {
        // Evaluate the service code again to inject dependencies
        const mockWindow = {};
        const fn = new Function('window', 'Module', pdfServiceContent);
        // Inject a dummy Module function and mock qpdfModule
        const mockQpdf = { FS: { writeFile: vi.fn(), readFile: vi.fn(), unlink: vi.fn() }, callMain: vi.fn() };
        const mockModule = vi.fn().mockResolvedValue(mockQpdf);

        fn(mockWindow, mockModule);
        pdfService = mockWindow.pdfService;

        // Manually trigger init to set internal qpdfModule
        // Actually we can't easily reach the internal qpdfModule.
        // But we can mock initWasm to set it if we restructure slightly, 
        // but let's just make initWasm succeed.

        // Mock fetch for wasm
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
        }));

        await pdfService.initWasm();

        // Mock a file that isn't a PDF by bytes
        const invalidPdfContent = new Uint8Array([0, 1, 2, 3]).buffer;
        const mockFile = {
            type: 'application/pdf',
            name: 'fake.pdf',
            size: 100,
            arrayBuffer: vi.fn().mockResolvedValue(invalidPdfContent)
        };

        const onStatus = vi.fn();
        const fileInput = { value: 'something' };

        const result = await pdfService.processFile(mockFile, { onStatus, fileInput });

        expect(result).toBeNull();
        expect(onStatus).toHaveBeenCalledWith('error', 'Invalid PDF', expect.any(String));
    });

    it('should successfully process a valid PDF and return a Blob', async () => {
        const mockWindow = {};
        const fn = new Function('window', 'Module', pdfServiceContent);

        // Mock a successful QPDF output
        const mockQpdf = {
            FS: {
                writeFile: vi.fn(),
                readFile: vi.fn().mockReturnValue(new Uint8Array([0x25, 0x50, 0x44, 0x46])), // Mock returning a PDF Blob 
                unlink: vi.fn()
            },
            callMain: vi.fn()
        };
        const mockModule = vi.fn().mockResolvedValue(mockQpdf);

        fn(mockWindow, mockModule);
        pdfService = mockWindow.pdfService;

        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
        }));

        vi.stubGlobal('Blob', class Blob {
            constructor(parts, options) {
                this.parts = parts;
                this.options = options;
            }
        });

        await pdfService.initWasm();

        // Valid PDF magic bytes
        const validPdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00]).buffer;
        const mockFile = {
            type: 'application/pdf',
            name: 'valid_secure.pdf',
            size: 100,
            arrayBuffer: vi.fn().mockResolvedValue(validPdfContent)
        };

        const onStatus = vi.fn();
        const fileInput = { value: 'something' };

        // Test with returnBlob = true
        const result = await pdfService.processFile(mockFile, { onStatus, fileInput }, { returnBlob: true });

        expect(mockQpdf.callMain).toHaveBeenCalledWith(["--decrypt", expect.stringMatching(/^input_.*\.pdf$/), expect.stringMatching(/^output_.*\.pdf$/)]);
        expect(result).toBeDefined();
        expect(result.options.type).toBe("application/pdf");
        expect(onStatus).toHaveBeenCalledWith('processing', 'Unlocking locally...', expect.any(String));
    });

    it('should handle WASM processing errors gracefully', async () => {
        const mockWindow = {};
        const fn = new Function('window', 'Module', pdfServiceContent);

        // Mock QPDF throwing an error during execution
        const mockQpdf = {
            FS: { writeFile: vi.fn(), readFile: vi.fn(), unlink: vi.fn() },
            callMain: vi.fn().mockImplementation(() => { throw new Error("Decryption failed"); })
        };
        const mockModule = vi.fn().mockResolvedValue(mockQpdf);

        fn(mockWindow, mockModule);
        pdfService = mockWindow.pdfService;

        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
        }));

        await pdfService.initWasm();

        const validPdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00]).buffer;
        const mockFile = {
            type: 'application/pdf',
            name: 'corrupt.pdf',
            size: 100,
            arrayBuffer: vi.fn().mockResolvedValue(validPdfContent)
        };

        const onStatus = vi.fn();
        const fileInput = { value: 'something' };

        const result = await pdfService.processFile(mockFile, { onStatus, fileInput });

        expect(result).toBeNull();
        expect(onStatus).toHaveBeenCalledWith('error', 'Processing Failed', expect.any(String));
    });
});
