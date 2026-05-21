import { chromium } from 'playwright';

const BASE = 'http://localhost:3003';

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1. Insight page with CORRECT param names: home, away, league
  console.log('=== INSIGHT PAGE (home=Arsenal, away=Chelsea) ===');
  const page1 = await browser.newPage({ viewport: { width: 1280, height: 3000 } });
  await page1.goto(BASE + '/insight?home=Arsenal&away=Chelsea&league=Premier%20League', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page1.waitForTimeout(4000);
  await page1.screenshot({ path: 'screenshots/insight-correct.png', fullPage: true });
  const text = await page1.evaluate(() => document.body.innerText);
  text.split('\n').filter(l => l.trim()).forEach((l, i) => console.log((i+1) + ': ' + l));

  // Check what's in the PremiumOverlay
  const overlayHtml = await page1.evaluate(() => {
    const overlays = document.querySelectorAll('[class*="blur"], [class*="overlay"]');
    return Array.from(overlays).slice(0, 3).map(el => ({
      class: el.className,
      text: el.textContent?.trim().slice(0, 100),
      visible: el.checkVisibility()
    }));
  });
  console.log('\n=== OVERLAY ELEMENTS ===');
  console.log(JSON.stringify(overlayHtml, null, 2));
  await page1.close();

  // 2. Search page - full text to find all sections
  console.log('\n=== SEARCH PAGE ===');
  const page2 = await browser.newPage({ viewport: { width: 1280, height: 3000 } });
  await page2.goto(BASE + '/search', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page2.waitForTimeout(3000);
  await page2.screenshot({ path: 'screenshots/search-full.png', fullPage: true });
  const text2 = await page2.evaluate(() => document.body.innerText);
  text2.split('\n').filter(l => l.trim()).forEach((l, i) => console.log((i+1) + ': ' + l));
  await page2.close();

  // 3. Fixture page - what renders?
  console.log('\n=== FIXTURE PAGE (/fixture/1) ===');
  const page3 = await browser.newPage({ viewport: { width: 1280, height: 3000 } });
  await page3.goto(BASE + '/fixture/1', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page3.waitForTimeout(3000);
  await page3.screenshot({ path: 'screenshots/fixture-1.png', fullPage: true });
  const text3 = await page3.evaluate(() => document.body.innerText);
  text3.split('\n').filter(l => l.trim()).forEach((l, i) => console.log((i+1) + ': ' + l));
  await page3.close();

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
