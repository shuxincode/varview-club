import { chromium } from 'playwright';

const BASE = 'http://localhost:3003';

async function main() {
  const browser = await chromium.launch({ headless: true });

  // Wait longer for full JS hydration in production mode
  for (const [label, url] of [
    ['Search Page', '/search'],
    ['Insight Page', '/insight?home=Arsenal&away=Chelsea&league=Premier%20League'],
    ['Fixture Page', '/fixture/1'],
  ]) {
    console.log(`\n=== ${label}: ${url} ===`);
    const page = await browser.newPage({ viewport: { width: 1280, height: 3000 } });
    try {
      await page.goto(BASE + url, { waitUntil: 'load', timeout: 20000 });
      // Wait for hydration — check when "Browse Fixtures" or "Search" button appears
      await page.waitForTimeout(5000);

      const text = await page.evaluate(() => document.body.innerText);
      const lines = text.split('\n').filter(l => l.trim()).slice(0, 40);
      lines.forEach((l, i) => console.log((i+1) + ': ' + l));

      if (lines.length === 0) {
        console.log('  (empty page - checking HTML)');
        const html = await page.content();
        console.log(html.slice(0, 500));
      }

      await page.screenshot({ path: `screenshots/verify-${label.replace(/\s+/g, '-').toLowerCase()}.png`, fullPage: true });
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
    await page.close();
  }

  await browser.close();
  console.log('\n=== DONE ===');
}

main().catch(e => { console.error(e); process.exit(1); });
