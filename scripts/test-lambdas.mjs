import { chromium } from 'playwright';

const BASE = 'http://localhost:3003';

const FIXTURES = [
  { name: 'Man City vs Arsenal (top 4)', url: '/insight?home=Manchester+City&away=Arsenal&league=Premier+League' },
  { name: 'Southampton vs Ipswich (relegation battle)', url: '/insight?home=Southampton&away=Ipswich+Town&league=Premier+League' },
  { name: 'PSG vs Marseille (mismatch)', url: '/insight?home=Paris+Saint-Germain&away=Marseille&league=Ligue+1' },
  { name: 'Bayern vs Dortmund (classic)', url: '/insight?home=Bayern+Munich&away=Borussia+Dortmund&league=Bundesliga' },
  { name: 'Unknown vs Unknown (fallback)', url: '/insight?home=FC+Random&away=SC+Unknown&league=Fake+League' },
];

async function main() {
  const browser = await chromium.launch({ headless: true });

  for (const { name, url } of FIXTURES) {
    const page = await browser.newPage();
    await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    const text = await page.evaluate(() => document.body.innerText);

    // Extract confidence % and lambda from text
    const confidenceMatch = text.match(/(\d+)%\s*Confidence/);
    const lambdaMatch = text.match(/λ\s*=\s*([\d.]+)/);
    const pct = confidenceMatch ? confidenceMatch[1] : '??';
    const lambda = lambdaMatch ? lambdaMatch[1] : '??';

    console.log(`${name}`);
    console.log(`  Confidence: ${pct}% | λ = ${lambda}`);
    console.log('');
    await page.close();
  }

  await browser.close();
}

main().catch(console.error);
