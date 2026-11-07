import { chromium } from 'playwright-core';

const url = process.argv[2] || 'http://localhost:5173/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();

page.on('console', (m) => console.log(`[console.${m.type()}]`, m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('requestfailed', (r) => console.log('[requestfailed]', r.url()));

const res = await page.goto(url, { waitUntil: 'networkidle' });
console.log('status:', res?.status());
console.log('title:', await page.title());
console.log('h1:', await page.locator('h1').allInnerTexts());

await browser.close();
