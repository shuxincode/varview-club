import { chromium } from 'playwright';

const BASE = 'http://localhost:3003';

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1. Search Page — full text to find DailyTabulation
  console.log('=== SEARCH PAGE (full text) ===');
  const page1 = await browser.newPage();
  await page1.goto(BASE + '/search', { waitUntil: 'networkidle', timeout: 20000 });
  await page1.waitForTimeout(3000);
  const text1 = await page1.evaluate(() => document.body.innerText);
  const lines1 = text1.split('\n').filter(l => l.trim());
  const tabIdx = lines1.findIndex(l => l.includes('Tabulation') || l.includes('Chairman') || l.includes('Daily'));
  if (tabIdx >= 0) {
    console.log(`Daily Tabulation found at line ${tabIdx}:`);
    lines1.slice(Math.max(0, tabIdx - 1), tabIdx + 15).forEach((l, i) => console.log((i+1) + ': ' + l));
  } else {
    console.log('❌ Daily Tabulation NOT found in search page');
    // Check last 30 lines
    console.log('Last 30 lines:');
    lines1.slice(-30).forEach((l, i) => console.log((i+1) + ': ' + l));
  }

  // Check for Popular Fixtures
  const popIdx = lines1.findIndex(l => l.includes('Popular'));
  if (popIdx >= 0) {
    console.log(`\nPopular Fixtures found at line ${popIdx}`);
  } else {
    console.log('\n❌ Popular Fixtures NOT found');
  }
  await page1.close();

  // 2. Insight Page — check Goals Band + pillars
  console.log('\n=== INSIGHT PAGE ===');
  const page2 = await browser.newPage();
  await page2.goto(BASE + '/insight?home=Arsenal&away=Chelsea&league=Premier%20League', { waitUntil: 'networkidle', timeout: 20000 });
  await page2.waitForTimeout(3000);
  const text2 = await page2.evaluate(() => document.body.innerText);
  const checks2 = [
    'Goal Band', 'Chairman', 'Analyst A', 'Analyst B',
    'Hard Research', 'Soft Research', 'Bayesian', 'λ =',
    'GATES', 'xG Range', 'BLUE TICK', 'Pop(2 goals)'
  ];
  for (const check of checks2) {
    const found = text2.includes(check);
    console.log(`  ${found ? '✓' : '✗'} '${check}' ${found ? 'FOUND' : 'NOT FOUND'}`);
  }
  await page2.close();

  // 3. Fixture Page — check Goals Band card
  console.log('\n=== FIXTURE PAGE ===');
  const page3 = await browser.newPage();
  await page3.goto(BASE + '/fixture/1', { waitUntil: 'networkidle', timeout: 20000 });
  await page3.waitForTimeout(3000);
  const text3 = await page3.evaluate(() => document.body.innerText);
  const checks3 = [
    'Goal Band', 'Chairman', 'Analysis Locked', 'Fixture not found'
  ];
  for (const check of checks3) {
    const found = text3.includes(check);
    console.log(`  ${found ? '✓' : '✗'} '${check}' ${found ? 'FOUND' : 'NOT FOUND'}`);
  }
  await page3.close();

  await browser.close();
  console.log('\n=== DONE ===');
}

main().catch(console.error);
