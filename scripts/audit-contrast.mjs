// Playwright audit: check for low-contrast text and take screenshots
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';

async function audit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  const pages = [
    { url: '/admin', name: 'admin' },
    { url: '/search', name: 'search' },
  ];

  const issues = [];

  for (const { url, name } of pages) {
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
      console.log(`✓ Screenshot saved: screenshots/${name}.png`);

      // Check for text elements with known low-contrast patterns
      const contrastChecks = await page.evaluate(() => {
        const results = [];
        const elements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');

        elements.forEach((el) => {
          const style = window.getComputedStyle(el);
          const color = style.color;
          const bgColor = style.backgroundColor;
          const text = el.textContent?.trim();
          if (!text || text.length < 2) return;

          // Parse RGBA values
          const colorMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          const bgMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (!colorMatch || !bgMatch) return;

          const fg = { r: +colorMatch[1], g: +colorMatch[2], b: +colorMatch[3] };
          const bg = { r: +bgMatch[1], g: +bgMatch[2], b: +bgMatch[3] };

          // Relative luminance
          const lum = (c) => {
            const v = c / 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          };

          const fgLum = 0.2126 * lum(fg.r) + 0.7152 * lum(fg.g) + 0.0722 * lum(fg.b);
          const bgLum = 0.2126 * lum(bg.r) + 0.7152 * lum(bg.g) + 0.0722 * lum(bg.b);
          const lighter = Math.max(fgLum, bgLum);
          const darker = Math.min(fgLum, bgLum);
          const ratio = (lighter + 0.05) / (darker + 0.05);

          if (ratio < 3.0 && ratio > 0) {
            results.push({
              text: text.substring(0, 60),
              fg: color,
              bg: bgColor,
              ratio: ratio.toFixed(2),
              tag: el.tagName,
              class: el.className,
            });
          }
        });

        return results;
      });

      if (contrastChecks.length > 0) {
        console.log(`  ⚠ Found ${contrastChecks.length} low-contrast elements:`);
        contrastChecks.slice(0, 10).forEach((c) => {
          console.log(`    - "${c.text}" (${c.fg} on ${c.bg}) ratio: ${c.ratio}`);
        });
        issues.push({ page: name, count: contrastChecks.length, details: contrastChecks.slice(0, 10) });
      } else {
        console.log(`  ✓ No low-contrast text found`);
      }
    } catch (err) {
      console.log(`  ✗ Error auditing ${url}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  console.log('\n=== Audit Summary ===');
  if (issues.length === 0) {
    console.log('All pages passed contrast checks!');
  } else {
    issues.forEach((i) => console.log(`- ${i.page}: ${i.count} contrast issues`));
  }

  await browser.close();
}

audit().catch(console.error);
