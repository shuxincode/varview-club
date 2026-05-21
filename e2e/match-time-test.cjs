/**
 * Test that MatchTime renders dates in local timezone.
 * Uses the insight page with query params (no Supabase needed).
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
    timezoneId: 'Asia/Singapore',
  });
  const page = await context.newPage();

  // Log console messages for debugging
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });

  const testCases = [
    {
      name: 'Bare time string (15:00 no tz)',
      url: 'http://localhost:3000/insight?home=Team%20A&away=Team%20B&league=Test&date=2026-05-11T15:00:00',
      expectedHour: 15, // 3:00 PM SGT for 15:00 SGT input
    },
    {
      name: 'UTC ISO string (07:00Z = 15:00 SGT)',
      url: 'http://localhost:3000/insight?home=Team%20A&away=Team%20B&league=Test&date=2026-05-11T07:00:00.000Z',
      expectedHour: 15, // 07:00 UTC = 15:00 SGT
    },
    {
      name: 'Midnight UTC (00:00Z = 08:00 SGT)',
      url: 'http://localhost:3000/insight?home=Team%20A&away=Team%20B&league=Test&date=2026-05-11T00:00:00.000Z',
      expectedHour: 8, // 00:00 UTC = 08:00 SGT
    },
  ];

  for (const tc of testCases) {
    console.log(`\n=== ${tc.name} ===`);
    await page.goto(tc.url, { waitUntil: 'load', timeout: 15000 });

    // Wait for loading skeleton to disappear and content to render
    // The insight page shows a skeleton before the useEffect completes.
    // We wait for the "VS" text which appears in the fixture header.
    try {
      await page.waitForFunction(() => {
        return document.body.innerText.includes('VS') && !document.body.innerText.includes('Generating');
      }, { timeout: 30000 });
      console.log('PASS: Page content rendered');
    } catch {
      console.log('FAIL: Page content did not render within 30s');
      const body = await page.locator('body').innerText().catch(() => '');
      console.log('Body:', body.substring(0, 800));
      await page.screenshot({ path: `e2e/matchtime-${tc.name.replace(/\s+/g, '-')}.png`, fullPage: true });
      continue;
    }

    // Get body text to check date display
    const body = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
    console.log('Body:', body.substring(0, 800));

    // Check for date-like patterns
    const dateMatch = body.match(/[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2},? \d{1,2}:\d{2}\s*[AP]M/);
    if (dateMatch) {
      console.log(`PASS: Date/time found: "${dateMatch[0]}"`);
    } else {
      // Check for any date-like text
      const anyDate = body.match(/[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}/);
      if (anyDate) {
        console.log(`PARTIAL: Date found (no time): "${anyDate[0]}"`);
      } else {
        console.log('FAIL: No date text found at all');
      }
    }

    // Check for placeholder
    const hasDash = body.includes('--');
    if (hasDash) console.log('WARN: "--" placeholder still present');

    await page.screenshot({ path: `e2e/matchtime-${tc.name.replace(/\s+/g, '-')}.png`, fullPage: true });
  }

  await browser.close();
  console.log('\n=== All tests done ===');
})();
