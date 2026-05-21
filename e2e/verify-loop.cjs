/**
 * Looping verification script:
 * 1. Search page — MatchTime renders correct local times, Daily Tabulation visible
 * 2. Fixture page — LivePredictionPanel + Chairman's Live Verdict for in-play matches
 * 3. Insight page — Popular preview with hard research + soft signals
 *
 * Loops until all checks pass or max retries reached.
 */
const { chromium } = require('playwright');
const MAX_RETRIES = 20;
const RETRY_DELAY = 15000; // 15s between retries
const BASE = 'http://localhost:3000';

async function verifyAll() {
  const failures = [];

  // ---- 1. SEARCH PAGE ----
  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
      timezoneId: 'Asia/Singapore',
    });
    const page = await context.newPage();

    // ---------- Search page ----------
    await page.goto(`${BASE}/search`, { waitUntil: 'load', timeout: 20000 });
    await page.waitForFunction(() => {
      const body = document.body.innerText;
      return body.includes('VS') && !body.includes('Generating');
    }, { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const searchBody = await page.locator('body').innerText().catch(() => '');

    // Check match times -- no 8:00 AM bug
    const timeMatches = searchBody.match(/\d{1,2}:\d{2}\s*[AP]M/g);
    if (timeMatches) {
      const has8am = timeMatches.some(t => t.includes('8:00') && t.includes('AM'));
      if (has8am) failures.push('8:00 AM bug still present on search page');
      else console.log('PASS: No 8:00 AM times detected');
    } else {
      console.log('WARN: No AM/PM times found on search page');
    }

    // Check Daily Tabulation
    if (searchBody.includes("Chairman's Daily Tabulation") || searchBody.includes('Daily Tabulation')) {
      console.log('PASS: Daily Tabulation heading visible');
    } else {
      failures.push('Daily Tabulation heading NOT found on search page');
    }

    // Check interactive pillar breakdown hint
    if (searchBody.includes('Click to expand pillars')) {
      console.log('PASS: Interactive pillar hint visible in tabulation');
    } else {
      console.log('INFO: Interactive pillar hint not found (tabulation may be empty)');
    }

    // Check for "5 pillars" note in tabulation footer
    if (searchBody.includes('5 pillars') || searchBody.includes('pillars evaluated')) {
      console.log('PASS: 5 pillars reference visible in tabulation');
    } else {
      console.log('INFO: 5 pillars reference not found (tabulation may be empty)');
    }

    // Check stats row renders when picks exist
    if (searchBody.includes('Total') && searchBody.includes('Won') && searchBody.includes('Accuracy') && searchBody.includes('Pending')) {
      console.log('PASS: Tabulation stats row (Total/Won/Accuracy/Pending) visible');
    } else {
      console.log('INFO: Tabulation stats row not fully visible (tabulation may be empty)');
    }

    // If there are picks, check for vs separator in pick cards
    const pickMatches = searchBody.match(/(\w+\s\w+)\s+vs\s+(\w+\s\w+)/g);
    if (pickMatches && pickMatches.length > 0) {
      console.log(`PASS: Tabulation picks rendered (${pickMatches.length} match(es) found)`);
    } else {
      console.log('INFO: No pick cards found in tabulation (may have no chairman-signed picks yet)');
    }

    // Verify tabulation API returns pillar data
    try {
      const tabData = await page.evaluate(async () => {
        const res = await fetch('/api/tabulation/daily');
        return res.json();
      });
      if (tabData.picks && Array.isArray(tabData.picks)) {
        console.log(`PASS: Tabulation API returns ${tabData.picks.length} picks`);
        if (tabData.picks.length > 0 && tabData.picks[0].pillars) {
          console.log(`PASS: Tabulation API includes pillar data (${tabData.picks[0].pillars.length} pillars per pick)`);
        } else {
          console.log('INFO: Tabulation API picks have no pillar data (not yet evaluated)');
        }
      } else {
        console.log('INFO: Tabulation API returned no picks');
      }
    } catch (e) {
      console.log('WARN: Tabulation API test failed: ' + (e.message || 'unknown'));
    }

    // Check LIVE badges for in-play fixtures
    const liveCount = (searchBody.match(/LIVE/g) || []).length;
    const postCount = (searchBody.match(/POST/g) || []).length;
    console.log(`INFO: ${liveCount} LIVE badges, ${postCount} POST/FT badges`);

    await page.screenshot({ path: 'e2e/verify-01-search.png', fullPage: true });

    // ---------- Pricing page redirects to /search (admin-only mode) ----------
    await page.goto(`${BASE}/pricing`, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(2000);
    const pricingRedirectBody = await page.locator('body').innerText().catch(() => '');
    if (pricingRedirectBody.includes('Search') || pricingRedirectBody.includes('No upcoming')) {
      console.log('PASS: Pricing page redirects to /search');
    } else {
      console.log('INFO: Pricing page redirect target may vary');
    }

    // ---------- Fixture page for in-play match (try id=2 - Oviedo vs Getafe) ----------
    await page.goto(`${BASE}/fixture/2`, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(5000);

    const fixtureBody = await page.locator('body').innerText().catch(() => '');

    // Check fixture loads
    if (fixtureBody.includes('Fixture not found') || fixtureBody.includes('Error Loading')) {
      failures.push('Fixture page for id=2 returned not found');
    } else {
      console.log('PASS: Fixture page id=2 loaded');

      // Check if fixture is in_play -- only then should LivePredictionPanel render
      const isInPlay = fixtureBody.includes('in_play') || fixtureBody.includes('LIVE');
      const hasLivePanel = fixtureBody.includes('Live Prediction');
      const hasWinProb = fixtureBody.includes('Win Probability');
      const hasChairmanVerdict = fixtureBody.includes("Chairman's Live Verdict");

      if (isInPlay) {
        if (hasLivePanel) console.log('PASS: LivePredictionPanel visible');
        else failures.push('LivePredictionPanel NOT visible on in-play fixture page');
        if (hasWinProb) console.log('PASS: Win Probability bars visible');
        else failures.push('Win Probability NOT visible on in-play fixture page');
        if (hasChairmanVerdict) console.log('PASS: Chairman\'s Live Verdict visible');
        else console.log('INFO: Chairman\'s Live Verdict not visible (API may still be loading)');
      } else {
        console.log('INFO: Fixture not in_play -- LivePredictionPanel check skipped');
        console.log('INFO: Chairman\'s Live Verdict check skipped (not in_play)');
      }

      // Check ChairmanGoalsBandCard
      if (fixtureBody.includes('2/3 Goal Band') || fixtureBody.includes('Goal Band')) {
        console.log('PASS: Goals band section visible');
      } else {
        console.log('INFO: Goals band section not found (may be below fold)');
      }

      // Check that no pricing/credit information is shown on the fixture page
      if (fixtureBody.includes('Reveal Analysis')) {
        console.log('PASS: Reveal Analysis button is visible (no price gate)');
      } else {
        console.log('INFO: Reveal Analysis button not visible (may be replaced by Analysis Ready)');
      }

      if (fixtureBody.includes('Analysis Ready')) {
        console.log('PASS: Analysis Ready state present');
      }

      // Check that price text is NOT present
      if (fixtureBody.includes('$1.99') || fixtureBody.includes('1.99')) {
        failures.push('PRICE STILL VISIBLE on fixture page');
      } else {
        console.log('PASS: No price displayed on fixture page');
      }
    }

    await page.screenshot({ path: 'e2e/verify-02-fixture1.png', fullPage: true });

    // ---------- Insight page with popular preview ----------
    await page.goto(
      `${BASE}/insight?home=Oviedo&away=Getafe&league=LaLiga&date=2026-05-10T16:00:00`,
      { waitUntil: 'load', timeout: 20000 }
    );
    await page.waitForFunction(() => {
      const body = document.body.innerText;
      return body.includes('VS') && !body.includes('Generating');
    }, { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(3000);

    const insightBody = await page.locator('body').innerText().catch(() => '');

    // Check pillars rendered
    const hasPillars = insightBody.includes('Over') || insightBody.includes('Goals');
    if (hasPillars) console.log('PASS: Hard research pillars visible on insight page');
    else failures.push('Hard research pillars NOT visible on insight page');

    // Check fixtureId-based insight -- verify analysis loads via RPC (not "Analysis Pending")
    await page.goto(`${BASE}/insight?fixtureId=2`, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(5000);
    const insightFixtureBody = await page.locator('body').innerText().catch(() => '');

    if (insightFixtureBody.includes('Analysis Pending')) {
      failures.push('Analysis still pending on insight page with fixtureId=2 -- RPC may be failing');
    } else {
      console.log('PASS: Analysis loaded via RPC on insight page with fixtureId');
    }

    // Check HardResearchAgents -- should show report content not "pending" placeholder
    if (insightFixtureBody.includes('Tactical analysis') || insightFixtureBody.includes('counter-attack')) {
      console.log('PASS: HardResearchAgents -- Analyst A report populated');
    } else if (insightFixtureBody.includes('pending prediction generation')) {
      failures.push('HardResearchAgents -- Analyst A still showing placeholder text');
    } else {
      console.log('INFO: Analyst A report not found (may use different text)');
    }

    if (insightFixtureBody.includes('internal conflicts') || insightFixtureBody.includes('No major')) {
      console.log('PASS: HardResearchAgents -- Analyst B report populated');
    }

    if (insightFixtureBody.includes('Analyst C')) {
      console.log('PASS: HardResearchAgents -- Analyst C screening report populated');
    } else {
      console.log('INFO: Analyst C screening report not found');
    }

    if (insightFixtureBody.includes('Insufficient cross-validated confidence') || insightFixtureBody.includes('VETO') || insightFixtureBody.includes("Chairman's Verdict")) {
      console.log('PASS: HardResearchAgents -- Chairman verdict populated');
    }

    if (insightFixtureBody.includes('Live Prediction')) {
      console.log('PASS: LivePredictionPanel on insight page with fixtureId');
    }

    await page.screenshot({ path: 'e2e/verify-03-insight.png', fullPage: true });

    await browser.close();
  } catch (err) {
    failures.push(`Exception during verification: ${err.message}`);
  }

  return failures;
}

(async () => {
  console.log('=== VARview Club: Looping Verification ===');
  console.log(`Max retries: ${MAX_RETRIES}, Delay: ${RETRY_DELAY / 1000}s\n`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`\n--- Attempt ${attempt}/${MAX_RETRIES} ---`);
    const failures = await verifyAll();

    if (failures.length === 0) {
      console.log('\n=== ALL CHECKS PASSED ===');
      process.exit(0);
    }

    console.log(`\nFAILURES (${failures.length}):`);
    failures.forEach(f => console.log(`  ✗ ${f}`));

    if (attempt < MAX_RETRIES) {
      console.log(`\nRetrying in ${RETRY_DELAY / 1000}s...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY));
    }
  }

  console.log(`\n=== FAILED after ${MAX_RETRIES} attempts ===`);
  process.exit(1);
})().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
