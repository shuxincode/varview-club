import { chromium } from 'playwright';
const BASE = 'http://localhost:3003';

async function checkFixture(home, away, label) {
  const page = await browser.newPage();
  const url = `${BASE}/insight?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}&league=Premier+League`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);
  const text = await page.evaluate(() => document.body.innerText);

  // Find the Goals Band section specifically — extract lines around "2/3 Goal Band"
  const lines = text.split('\n').filter(l => l.trim());
  let inBand = false;
  const bandLines = [];
  for (const line of lines) {
    if (line.includes('2/3 Goal Band')) inBand = true;
    if (inBand) {
      bandLines.push(line.trim());
      if (line.includes('H2H:') || bandLines.length > 30) break;
    }
  }
  console.log(`\n=== ${label}: ${home} vs ${away} ===`);
  bandLines.forEach((l, i) => console.log(`  ${l.slice(0, 80)}`));
  await page.close();
}

const browser = await chromium.launch({ headless: true });

await checkFixture('Manchester City', 'Arsenal', 'Top 4 clash');
await checkFixture('Southampton', 'Ipswich Town', 'Relegation battle');
await checkFixture('Paris Saint-Germain', 'Marseille', 'Mismatch');
await checkFixture('FC Random', 'SC Unknown', 'Unknown teams');

await browser.close();
