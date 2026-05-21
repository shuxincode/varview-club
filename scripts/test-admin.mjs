import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Listen for console messages and errors
const logs = [];
page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', err => logs.push(`[PAGE_ERROR] ${err.message}`));

// Track all navigation/requests
const failures = [];
page.on('response', resp => {
  if (resp.status() >= 400) {
    failures.push(`[${resp.status()}] ${resp.url()}`);
  }
});

try {
  // 1. Navigate to admin
  const resp = await page.goto('http://localhost:3002/admin', {
    waitUntil: 'networkidle',
    timeout: 15000,
  });

  await page.waitForTimeout(2000);

  // 2. Capture state
  const url = page.url();
  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  const html = await page.evaluate(() => document.documentElement.innerHTML.substring(0, 1000));

  console.log('=== ADMIN PAGE REPORT ===');
  console.log(`URL: ${url}`);
  console.log(`Title: ${title}`);
  console.log(`Status: ${resp?.status()}`);
  console.log(`Failed requests: ${failures.length > 0 ? failures.join(', ') : 'none'}`);
  console.log(`Console logs: ${logs.length > 0 ? logs.slice(0,10).join(' | ') : 'none'}`);
  console.log('--- Body text ---');
  console.log(bodyText);
  console.log('--- HTML preview ---');
  console.log(html);

  // 3. Screenshot
  await page.screenshot({ path: 'public/screenshots/admin.png', fullPage: true });
  console.log('Screenshot saved to public/screenshots/admin.png');

} catch (err) {
  console.error(`Error accessing admin: ${err.message}`);
}

await browser.close();
