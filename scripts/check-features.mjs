import { chromium } from 'playwright';

const BASE = 'http://localhost:3003';

async function checkPage(label, url, checks) {
  console.log(`\n═══ ${label} ═══`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    // Wait for rendering
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `screenshots/${label.replace(/\s+/g, '-').toLowerCase()}.png`, fullPage: true });
    console.log(`  ✓ Loaded ${url}`);

    const html = await page.content();
    const bodyText = await page.evaluate(() => document.body.innerText);

    for (const [name, selector] of Object.entries(checks)) {
      const el = await page.$(selector);
      if (el) {
        const visible = await el.isVisible();
        const text = await el.textContent().catch(() => '') || '';
        console.log(`  ${visible ? '✓' : '✗'} ${name}: ${visible ? 'VISIBLE' : 'HIDDEN'} — "${text.trim().slice(0, 80)}"`);
      } else {
        console.log(`  ✗ ${name}: NOT FOUND in DOM`);
      }
    }
  } catch (e) {
    console.log(`  ✗ Error: ${e.message}`);
  }
  await browser.close();
}

async function main() {
  // 1. Search page — Daily Tabulation + Fixture Search + Popular Fixtures
  await checkPage('Search Page', '/search', {
    'Search bar': 'input[type="text"], input[placeholder*="earch"], input[placeholder*="team"]',
    "Today's Matches heading": 'h2:has-text("Today")',
    'Popular Fixtures section': 'text=Popular',
    'Chairman Daily Tabulation heading': 'text=Daily Tabulation',
    'Chairman shield icon': 'text=Chairman',
    'Top picks list': '[class*="pick"]',
  });

  // 2. Insight page — Chairman Goals Band + 4 Pillars + Agents
  await checkPage('Insight Page', '/insight?homeTeam=Arsenal&awayTeam=Chelsea&league=Premier%20League', {
    'Fixture header': 'text=Arsenal',
    'VS divider': 'text=VS',
    'Chairman Goals Band heading': 'text=Goal Band',
    'Hard Research Pillars (Bayesian CI)': 'text=Bayesian',
    'Analyst Agent Reports': 'text=Analyst',
    'Probability bars (P2/P3)': '[class*="probability"]',
    'Gate evaluation list': 'text=xG Range',
    'Lambda parameters': 'text=λ',
    'Pricing CTA': 'text=View Plans',
  });

  // 3. Fixture detail page — Goals Band should be integrated
  await checkPage('Fixture Detail Page', '/fixture/1', {
    'Fixture header present': 'h2',
    'Analysis Locked section': 'text=Analysis Locked',
    'Live Prediction Panel': '[class*="live"]',
    'Chairman Goals Band': 'text=Goal Band',
    'Pillars / Analysis section': 'text=Reveal',
  });

  // 4. Check specific text content that confirms placement
  console.log('\n═══ CONTENT CHECKS ═══');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(BASE + '/search', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  const text = await page.evaluate(() => document.body.innerText);

  const checks = [
    ['Daily Tabulation', 'Daily Tabulation'],
    ['Chairman picks', 'Chairman'],
    ['Success Rate', 'Success Rate'],
    ['Today Matches', "Today's Matches"],
    ['Popular Fixtures', 'Popular'],
  ];
  for (const [name, search] of checks) {
    console.log(`  ${text.includes(search) ? '✓' : '✗'} "${search}" found in body`);
  }
  await browser.close();

  console.log('\n═══ DONE ═══');
}

main().catch(console.error);
