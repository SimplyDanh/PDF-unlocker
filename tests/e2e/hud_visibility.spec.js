import { test, expect } from '@playwright/test';

test('theme HUD does not flash expanded on reload', async ({ page }) => {
    await page.goto('/');
    
    const themeHud = page.locator('#theme-hud');
    
    // Check if it starts collapsed (no expanded class)
    await expect(themeHud).not.toHaveClass(/expanded/);
    console.log('HUD is collapsed on load (correct)');
    
    // Optional: wait a bit to ensure it doesn't spontaneously expand
    await page.waitForTimeout(1000);
    await expect(themeHud).not.toHaveClass(/expanded/);
});
