import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const stylesPath = path.resolve(__dirname, '../ui/styles.css');
const stylesContent = fs.readFileSync(stylesPath, 'utf8');

describe('Animation Optimization Structural Audit (Phase 8)', () => {

    it('should NOT use background-position in any keyframes or body styles', () => {
        // Search for background-position in any @keyframes block
        const keyframesMatch = stylesContent.match(/@keyframes[\s\S]*?\{[\s\S]*?\}/g);
        if (keyframesMatch) {
            keyframesMatch.forEach(keyframe => {
                expect(keyframe).not.toContain('background-position');
            });
        }
        
        // Also check general body styles
        const bodyMatch = stylesContent.match(/body\s*\{[\s\S]*?\}/);
        if (bodyMatch) {
            expect(bodyMatch[0]).not.toContain('background-position');
        }
    });

    it('should use translate3d in meshpan-gpu keyframes', () => {
        const meshpanGpu = stylesContent.match(/@keyframes\s+meshpan-gpu[\s\S]*?\{([\s\S]*?)\}/);
        expect(meshpanGpu).not.toBeNull();
        expect(meshpanGpu[1]).toContain('translate3d');
    });

    it('should isolate background mesh to body::before pseudo-element', () => {
        expect(stylesContent).toContain('body::before');
        const pseudoMatch = stylesContent.match(/body::before\s*\{([\s\S]*?)\}/);
        expect(pseudoMatch).not.toBeNull();
        expect(pseudoMatch[1]).toContain('background-image');
        expect(pseudoMatch[1]).toContain('z-index: -1');
        expect(pseudoMatch[1]).toContain('position: fixed');
    });

    it('should apply will-change: transform to hardware-accelerated layers', () => {
        // Check body::before
        const pseudoMatch = stylesContent.match(/body::before\s*\{([\s\S]*?)\}/);
        expect(pseudoMatch[1]).toContain('will-change: transform');

        // Check modals and HUD
        const aboutMatch = stylesContent.match(/\.about-panel\s*\{([\s\S]*?)\}/);
        expect(aboutMatch[1]).toContain('will-change: transform');

        const hudMatch = stylesContent.match(/\.theme-hud\s*\{([\s\S]*?)\}/);
        expect(hudMatch[1]).toContain('will-change: transform');

        const dropZoneMatch = stylesContent.match(/\.drop-zone\s*\{([\s\S]*?)\}/);
        expect(dropZoneMatch[1]).toContain('will-change: transform');
    });

    it('should use translate3d for about-panel transitions', () => {
        const aboutMatch = stylesContent.match(/\.about-panel\s*\{([\s\S]*?)\}/);
        expect(aboutMatch[1]).toContain('translate3d');
        
        const openMatch = stylesContent.match(/\.modal-backdrop\.open\s+\.about-panel\s*\{([\s\S]*?)\}/);
        expect(openMatch).not.toBeNull();
        expect(openMatch[1]).toContain('translate3d');
    });
});
