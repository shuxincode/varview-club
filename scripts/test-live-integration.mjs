import { chromium } from 'playwright';

const BASE = 'http://localhost:3002';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const ctx = page.request;

const errors = [];
page.on('pageerror', err => errors.push(err.message));

const consoles = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoles.push(msg.text());
});

// 1. Test fixture page with non-existent ID
console.log('=== 1. FIXTURE PAGE (non-existent) ===');
await page.goto(`${BASE}/fixture/99999`, { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);

const body = await page.evaluate(() => document.body.innerText.substring(0, 800));
const url = page.url();

console.log(`URL: ${url}`);
console.log(`JS Errors: ${errors.length > 0 ? errors.join(' | ') : 'none'}`);
console.log(`Console errors: ${consoles.length > 0 ? consoles.join(' | ') : 'none'}`);
console.log(`Body: ${body.substring(0, 200)}`);
console.log(`Page load: ${errors.length === 0 ? 'PASS' : 'FAIL'}`);

// 2. Test API endpoints via Playwright request context
console.log('\n=== 2. LIVE STATE ENDPOINT ===');
let res = await ctx.get(`${BASE}/api/live/state?fixtureId=99999`);
console.log(`Status: ${res.status()}`);
console.log(`Body: ${JSON.stringify(await res.json())}`);

console.log('\n=== 3. LIVE PREDICT ENDPOINT ===');
res = await ctx.get(`${BASE}/api/live/predict?fixtureId=99999`);
console.log(`Status: ${res.status()}`);
console.log(`Body: ${JSON.stringify(await res.json())}`);

console.log('\n=== 4. LIVE STATE (no fixtureId, should 400) ===');
res = await ctx.get(`${BASE}/api/live/state`);
console.log(`Status: ${res.status()}`);
console.log(`Body: ${JSON.stringify(await res.json())}`);

console.log('\n=== 5. LIVE PREDICT (no fixtureId, should 400) ===');
res = await ctx.get(`${BASE}/api/live/predict`);
console.log(`Status: ${res.status()}`);
console.log(`Body: ${JSON.stringify(await res.json())}`);

await browser.close();
