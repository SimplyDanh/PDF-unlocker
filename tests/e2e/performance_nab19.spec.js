import { test, expect } from '@playwright/test';
import path from 'path';

test('Unlock performance test for NAB19.pdf', async ({ page, browserName }) => {
  // Chromium is ~5x faster at WASM than Firefox/WebKit
  const timeout = browserName === 'chromium' ? 30000 : 60000;
  test.setTimeout(timeout);

  // Capture console messages
  page.on('console', msg => {
    console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
  });

  await page.goto('http://localhost:3000');
  
  // Wait for engine ready
  await page.waitForSelector('.drop-zone:not(.loading)', { timeout: 15000 });
  
  const filePath = path.resolve('NAB19.pdf');
  
  console.log('Starting performance test for NAB19.pdf...');
  const startTime = Date.now();
  
  // Upload file
  await page.setInputFiles('#file-input', filePath);
  
  // Wait for the verified badge to appear (success indicator)
  await page.waitForSelector('.verified-badge:not(.hidden)', { timeout });
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log(`--- PERFORMANCE RESULT ---`);
  console.log(`Unlocking NAB19.pdf (38MB) took: ${duration.toFixed(2)} seconds`);
  console.log(`---------------------------`);

  // Verify the card shows "Unlocked"
  const status = await page.textContent('.file-status');
  expect(status).toBe('Unlocked');
  
  // Log the result as a soft assertion
  console.log(`PASS: File unlocked in ${duration.toFixed(2)}s`);
});
