const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto('http://localhost:3000/search', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(10000);

  // Get body text
  const body = await page.locator('body').innerText();
  console.log('=== BODY TEXT (first 3000 chars) ===');
  console.log(body.substring(0, 3000));

  // Check for common time patterns
  const timeCount = await page.getByText(/[0-9]1?:\d{2}\s*[AP]M/).count();
  console.log('\n=== TIME PATTERN MATCHES ===');
  console.log('Times with AM/PM:', timeCount);

  // Check for "--" placeholders
  const placeholders = await page.getByText('--').count();
  console.log('Placeholder -- count:', placeholders);

  // Wait a bit more for data to hydrate
  await page.waitForTimeout(5000);
  const body2 = await page.locator('body').innerText();
  console.log('\n=== BODY AFTER EXTRA WAIT ===');
  console.log(body2.substring(0, 3000));

  await page.screenshot({ path: 'e2e/search-page.png', fullPage: true });
  console.log('\nScreenshot saved');

  await browser.close();
})();
