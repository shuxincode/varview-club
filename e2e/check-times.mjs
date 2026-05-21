import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto('http://localhost:3000/search', { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(8000);

// Get all visible date/time text
const times = await page.locator('text=/\\d{1,2}:\\d{2}\\s*[AP]M/').allInnerTexts();
console.log('TIMES FOUND:', JSON.stringify(times));

// Get all text content that looks like a date
const dates = await page.locator('text=/[A-Z][a-z]{2}, [A-Z][a-z]{2} \\d{1,2}/').allInnerTexts();
console.log('DATES FOUND:', JSON.stringify(dates));

// Check for "--" placeholders
const placeholders = await page.getByText('--').count();
console.log('PLACEHOLDER COUNT:', placeholders);

// Check for "TBD"
const tbds = await page.getByText('TBD').count();
console.log('TBD COUNT:', tbds);

// Check for Chairman Goals Band
const goalBand = await page.getByText('Goal Band').count();
console.log('GOAL BAND COUNT:', goalBand);

// Take screenshot
await page.screenshot({ path: 'e2e/search-page.png', fullPage: true });
console.log('Screenshot saved to e2e/search-page.png');

// Get raw HTML around fixture cards
const html = await page.locator('body').innerHTML();
const idx = html.indexOf('8:00');
if (idx >= 0) {
  console.log('8:00 AM context:', html.substring(Math.max(0, idx - 200), idx + 200));
}

await browser.close();
