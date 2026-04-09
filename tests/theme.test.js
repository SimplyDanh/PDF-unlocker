import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * @vitest-environment jsdom
 */

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

describe('Theme Logic Persistence & Cycling', () => {
    let themeToggle;
    let rootElement;

    // We'll manually implement the logic in the test for now to verify the behavior 
    // we intend to implement in app.js
    const themes = ['aurora', 'midnight', 'frost', 'ember'];

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    function cycleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'aurora';
        const currentIndex = themes.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        applyTheme(themes[nextIndex]);
    }

    beforeEach(() => {
        document.body.innerHTML = `
            <button id="theme-toggle"></button>
        `;
        themeToggle = document.getElementById('theme-toggle');
        rootElement = document.documentElement;
        rootElement.removeAttribute('data-theme');
        localStorage.clear();
    });

    it('should cycle through all 4 themes: aurora -> midnight -> frost -> ember -> aurora', () => {
        applyTheme('aurora');
        expect(rootElement.getAttribute('data-theme')).toBe('aurora');

        cycleTheme();
        expect(rootElement.getAttribute('data-theme')).toBe('midnight');
        expect(localStorage.getItem('theme')).toBe('midnight');

        cycleTheme();
        expect(rootElement.getAttribute('data-theme')).toBe('frost');
        expect(localStorage.getItem('theme')).toBe('frost');

        cycleTheme();
        expect(rootElement.getAttribute('data-theme')).toBe('ember');
        expect(localStorage.getItem('theme')).toBe('ember');

        cycleTheme();
        expect(rootElement.getAttribute('data-theme')).toBe('aurora');
        expect(localStorage.getItem('theme')).toBe('aurora');
    });

    it('should persist theme across reloads', () => {
        localStorage.setItem('theme', 'frost');
        
        // Simulate app initialization
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            rootElement.setAttribute('data-theme', savedTheme);
        }

        expect(rootElement.getAttribute('data-theme')).toBe('frost');
    });
});
