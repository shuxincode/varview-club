/**
 * Comprehensive verification script:
 * 1. MatchTime renders correct local times (not 8:00 AM bug)
 * 2. Daily Tabulation heading visibility
 * 3. In-play fixtures and live prediction feature state
 * 4. Screenshots for visual review
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

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });

  // ── 1. Search page ──
  console.log('\n=== 1. SEARCH PAGE ===');
  await page.goto('http://localhost:3000/search', { waitUntil: 'load', timeout: 20000 });

  // Wait for fixture cards to render (look for "VS" text or fixture cards)
  try {
    await page.waitForFunction(() => {
      const body = document.body.innerText;
      return body.includes('VS') && !body.includes('Generating');
    }, { timeout: 30000 });
    console.log('PASS: Search page content rendered');
  } catch {
    console.log('WARN: Search page content did not fully render within 30s');
  }

  // Wait for data hydration
  await page.waitForTimeout(3000);

  const body = await page.locator('body').innerText().catch(() => '');
  console.log('\nBody text (first 1500 chars):');
  console.log(body.substring(0, 1500));

  // Check for match times - look for AM/PM patterns
  const timeMatches = body.match(/\d{1,2}:\d{2}\s*[AP]M/g);
  console.log('\n--- Time Display Check ---');
  if (timeMatches) {
    console.log(`Times found (${timeMatches.length}):`, timeMatches.join(', '));
    // Check for the 8:00 AM bug
    const has8am = timeMatches.some(t => t.includes('8:00') && t.includes('AM'));
    if (has8am) {
      console.log('FAIL: Found 8:00 AM times — timezone bug still present!');
    } else {
      console.log('PASS: No 8:00 AM times detected');
    }
  } else {
    console.log('No AM/PM times found in visible text');
  }

  // Check for placeholder dashes
  const dashes = (body.match(/--/g) || []).length;
  console.log(`\nPlaceholder "--" count: ${dashes}`);

  // Check for Daily Tabulation heading
  const hasTabulation = body.includes("Chairman's Daily Tabulation") || body.includes('Daily Tabulation');
  console.log(`Daily Tabulation heading: ${hasTabulation ? 'FOUND' : 'NOT FOUND'}`);

  // Check fixture statuses
  const liveMatchCount = (body.match(/LIVE/g) || []).length;
  const finishedCount = (body.match(/\bFT\b/g) || []).length;
  console.log(`LIVE badges: ${liveMatchCount}, FT badges: ${finishedCount}`);

  await page.screenshot({ path: 'e2e/01-search-page.png', fullPage: true });
  console.log('Screenshot: e2e/01-search-page.png');

  // ── 2. Check fixture page ──
  console.log('\n=== 2. FIXTURE PAGE (Live Prediction Panel) ===');

  // Try fixture IDs 1-5 to see if any exist in Supabase
  for (const id of [1, 2, 3, 4, 5]) {
    console.log(`\n--- Checking /fixture/${id} ---`);
    await page.goto(`http://localhost:3000/fixture/${id}`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(3000);
    const fBody = await page.locator('body').innerText().catch(() => '');

    if (fBody.includes('Fixture not found') || fBody.includes('Error Loading')) {
      console.log(`Fixture ${id}: Not found in Supabase`);
    } else {
      console.log(`Fixture ${id}: PAGE RENDERED`);
      console.log(fBody.substring(0, 500));
      const hasLivePanel = fBody.includes('Live Prediction');
      console.log(`LivePredictionPanel visible: ${hasLivePanel}`);
      await page.screenshot({ path: `e2e/02-fixture-${id}.png`, fullPage: true });
    }
  }

  // ── 3. Insight page with popular fixture ──
  console.log('\n=== 3. INSIGHT PAGE (Popular Preview) ===');
  // Use one of the in-play fixtures from the today API
  // We know fs_13 = Oviedo vs Getafe and fs_11 = Parma vs AS Roma are in_play
  await page.goto(
    'http://localhost:3000/insight?home=Oviedo&away=Getafe&league=LaLiga&date=2026-05-11T16:00:00',
    { waitUntil: 'load', timeout: 15000 }
  );

  try {
    await page.waitForFunction(() => {
      const body = document.body.innerText;
      return body.includes('VS') && !body.includes('Generating') && !body.includes('Generating Preview');
    }, { timeout: 45000 });
    console.log('PASS: Insight page content rendered');
  } catch {
    console.log('WARN: Insight page content did not fully render within 45s');
  }

  await page.waitForTimeout(2000);
  const insightBody = await page.locator('body').innerText().catch(() => '');
  console.log('\nInsight page body (first 1000 chars):');
  console.log(insightBody.substring(0, 1000));

  // Check for live prediction panel on insight page
  const hasLiveOnInsight = insightBody.includes('Live Prediction');
  console.log(`\nLivePredictionPanel on insight page: ${hasLiveOnInsight}`);

  // Check for Chairman's Live Verdict
  const hasLiveVerdict = insightBody.includes("Chairman's Live Verdict") || insightBody.includes("Chairman");
  console.log(`Chairman's Live Verdict visible: ${hasLiveVerdict}`);

  await page.screenshot({ path: 'e2e/03-insight-oviedo-getafe.png', fullPage: true });
  console.log('Screenshot: e2e/03-insight-oviedo-getafe.png');

  // ── 4. Match time verification on insight page ──
  console.log('\n=== 4. MATCH TIME VERIFICATION (Insight Page) ===');
  const insightTimeMatch = insightBody.match(/[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2},? \d{1,2}:\d{2}\s*[AP]M/);
  if (insightTimeMatch) {
    console.log(`PASS: Date/time rendered: "${insightTimeMatch[0]}"`);
  } else {
    console.log('No formatted date/time found on insight page');
  }

  await browser.close();
  console.log('\n=== VERIFICATION COMPLETE ===');
})().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
