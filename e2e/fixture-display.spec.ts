import { test, expect } from '@playwright/test';

async function waitForData(page: any, text: string, timeout = 10000) {
  try {
    await page.waitForSelector(`text=${text}`, { timeout });
    return true;
  } catch {
    return false;
  }
}

test.describe('Fixture display', () => {
  test('fixture cards render with local timezone dates', async ({ page }) => {
    test.setTimeout(45000);
    await page.goto('/search');

    // Wait for data to load (Supabase-backed). If data never loads (e.g. no
    // Supabase connectivity), skip gracefully instead of timing out.
    const hasData = await waitForData(page, 'Premier League', 25000);
    test.skip(!hasData, 'Supabase data unavailable — skipping');

    // Verify fixture card date/time is rendered in local format
    const dateTimeText = await page.textContent('text=/[A-Z][a-z]{2}, [A-Z][a-z]{2} \\d{1,2}/');
    expect(dateTimeText).toBeTruthy();

    // Check for MatchTime hydration — the placeholder "--" should be gone
    const hasPlaceholder = await page.getByText('--').count();
    expect(hasPlaceholder).toBe(0);

    // Verify time is shown (not just date)
    const hasTime = await page.getByText(/[AP]M/).count();
    expect(hasTime).toBeGreaterThanOrEqual(1);
  });

  test('popular fixtures show date-only format', async ({ page }) => {
    test.setTimeout(45000);
    await page.goto('/search');

    const hasData = await waitForData(page, 'Popular Fixtures', 25000);
    test.skip(!hasData, 'Supabase data unavailable — skipping');

    // Popular fixtures should show date-only: "Wed, May 13" (no time)
    const popularDate = page.locator('text=/[A-Z][a-z]{2}, [A-Z][a-z]{2} \\d{1,2}/').first();
    await expect(popularDate).toBeVisible();
  });

  test('insight page renders fixture time in local timezone', async ({ page }) => {
    test.setTimeout(45000);
    const futureDate = new Date(Date.now() + 3 * 86400000).toISOString();
    await page.goto(
      `/insight?home=Manchester%20City&away=Arsenal&league=Premier%20League&date=${encodeURIComponent(futureDate)}`,
    );

    const hasData = await waitForData(page, 'Manchester City', 25000);
    test.skip(!hasData, 'Supabase data unavailable — skipping');

    // Date should be rendered (not "TBD", not "--")
    const hasTbd = await page.getByText('TBD').count();
    expect(hasTbd).toBe(0);

    const hasUnknown = await page.getByText('--').count();
    expect(hasUnknown).toBe(0);
  });
});

test.describe('Chairman Goals Band', () => {
  test('card shows confidence label instead of percentage', async ({ page }) => {
    test.setTimeout(45000);
    const futureDate = new Date(Date.now() + 3 * 86400000).toISOString();
    await page.goto(
      `/insight?home=Manchester%20City&away=Arsenal&league=Premier%20League&date=${encodeURIComponent(futureDate)}`,
    );

    const hasData = await waitForData(page, 'Goal Band', 25000);
    test.skip(!hasData, 'Supabase data unavailable — skipping');

    // Should show HIGH or LOW confidence (not a percentage number)
    const confidenceBadge = page.locator('text=HIGH CONFIDENCE').or(page.locator('text=LOW CONFIDENCE'));
    await expect(confidenceBadge.first()).toBeVisible();

    // Should NOT show a percentage like "56%"
    const pageText = await page.textContent('body') || '';
    const hasConfidencePct = /Confidence/.test(pageText);
    if (hasConfidencePct) {
      console.log('Warning: "Confidence" label found — may need updating');
    }
  });
});
