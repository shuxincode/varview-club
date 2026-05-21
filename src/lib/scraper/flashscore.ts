import { chromium } from 'playwright';

export interface ScrapedFixture {
  home_team: string;
  away_team: string;
  league_name: string;
  time: string;
  status: 'scheduled' | 'in_play' | 'finished';
  home_score?: string;
  away_score?: string;
  scheduled_time?: string;
}

const UNIQUE_LEAGUES = [
  'Bundesliga', 'Serie A', 'Serie B',
  'K League 1', 'K League 2', 'J1 League',
  'Allsvenskan', 'Eliteserien', 'Eredivisie', 'Primeira Liga',
  '2. Bundesliga', 'Super Lig', 'MLS', 'Liga MX',
  'A-League - Play Offs',
];

const FEATURED_ONLY_LEAGUES = ['Premier League', 'Ligue 1', 'LaLiga'];

const FLASHSCORE_COUNTRIES = [
  'ENGLAND', 'FRANCE', 'GERMANY', 'ITALY', 'SPAIN', 'SOUTH KOREA',
  'AUSTRALIA', 'JAPAN', 'BRAZIL', 'SWEDEN', 'NORWAY', 'NETHERLANDS',
  'PORTUGAL', 'TURKEY', 'MEXICO', 'USA', 'AUSTRIA', 'SWITZERLAND',
  'BELGIUM', 'SCOTLAND', 'ARGENTINA', 'CHINA', 'DENMARK', 'POLAND',
  'UKRAINE', 'RUSSIA', 'GREECE', 'ROMANIA', 'CROATIA', 'CZECH',
  'HUNGARY', 'SERBIA', 'BULGARIA', 'SLOVAKIA', 'SLOVENIA',
  'ICELAND', 'IRELAND', 'EGYPT', 'MOROCCO', 'ALGERIA', 'TUNISIA',
  'NIGERIA', 'SOUTH AFRICA', 'SENEGAL', 'GHANA', 'INDIA',
  'THAILAND', 'VIETNAM', 'INDONESIA', 'MALAYSIA', 'PHILIPPINES',
  'SINGAPORE', 'ISRAEL', 'SAUDI ARABIA', 'QATAR', 'UAE',
  'KAZAKHSTAN', 'UZBEKISTAN', 'BELARUS', 'FINLAND', 'WALES',
  'ARMENIA', 'GEORGIA', 'AZERBAIJAN', 'ALBANIA', 'KOSOVO',
  'LUXEMBOURG', 'MALTA', 'CYPRUS', 'MONTENEGRO', 'BOSNIA',
  'NORTH MACEDONIA', 'MOLDOVA', 'FAROE ISLANDS', 'ESTONIA',
  'LITHUANIA', 'LATVIA', 'ZIMBABWE', 'ZAMBIA', 'KENYA',
  'RWANDA', 'UGANDA', 'COSTA RICA', 'CANADA', 'CHILE', 'COLOMBIA',
  'PERU', 'URUGUAY', 'PARAGUAY', 'ECUADOR', 'BOLIVIA', 'VENEZUELA',
  'IRAN', 'IRAQ', 'JORDAN', 'LEBANON', 'OMAN', 'BAHRAIN', 'KUWAIT',
];

/**
 * Scrape today's fixtures from Flashscore using Playwright.
 * Returns structured fixture data for K League, A-League, and other
 * competitions not available in the football-data.org free tier.
 */
export async function scrapeFlashscoreFixtures(): Promise<ScrapedFixture[]> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();
    await page.goto('https://www.flashscore.com/football/', {
      timeout: 30000,
      waitUntil: 'networkidle',
    });

    await page.waitForSelector('.event__match', { timeout: 15000 });
    await page.waitForTimeout(2000);

    try {
      const rejectBtn = page.locator('button:has-text("Reject All")');
      if (await rejectBtn.isVisible({ timeout: 2000 })) {
        await rejectBtn.click();
        await page.waitForTimeout(500);
      }
    } catch {
      // Cookie banner might not be visible
    }

    const fixtures = await page.evaluate(
      ({
        unique,
        featuredOnly,
        countries,
      }: {
        unique: string[];
        featuredOnly: string[];
        countries: string[];
      }) => {
        const uniqueSet = new Set(unique);
        const featuredSet = new Set(featuredOnly);
        // Build country regex: longest first to match multi-word names
        const sorted = [...countries].sort((a, b) => b.length - a.length);
        const countryRe = new RegExp(`(${sorted.join('|')})`);

        function getLeagueName(raw: string): string {
          if (!raw) return 'Unknown';
          const beforeColon = raw.split(':')[0] || raw;
          const m = beforeColon.match(countryRe);
          if (m) {
            const idx = beforeColon.indexOf(m[1]);
            return beforeColon.substring(0, idx).trim() || m[1].trim();
          }
          return beforeColon.trim().substring(0, 40);
        }

        function extractFromContainer(
          container: HTMLElement,
          isFeatured: boolean,
        ): any[] {
          const children = container.children;
          const results: any[] = [];
          let currentLeague = 'Unknown';

          for (let i = 0; i < children.length; i++) {
            const child = children[i] as HTMLElement;

            if (child.classList.contains('headerLeague__wrapper')) {
              currentLeague = getLeagueName(child.textContent?.trim() || '');
              continue;
            }

            if (child.classList.contains('event__match')) {
              const stageEl = child.querySelector('.event__stage--block');
              const timeEl = child.querySelector('.event__time');
              const homeEl = child.querySelector(
                '.event__homeParticipant [data-testid="wcl-scores-simple-text-01"]',
              );
              const awayEl = child.querySelector(
                '.event__awayParticipant [data-testid="wcl-scores-simple-text-01"]',
              );
              const homeScoreEl = child.querySelector('.event__score--home');
              const awayScoreEl = child.querySelector('.event__score--away');

              const stage = stageEl?.textContent?.trim() || '';
              const scheduledTime = timeEl?.textContent?.trim() || '';
              const home = homeEl?.textContent?.trim() || '';
              const away = awayEl?.textContent?.trim() || '';
              const homeScore = homeScoreEl?.textContent?.trim() || '';
              const awayScore = awayScoreEl?.textContent?.trim() || '';

              if (!home || !away) continue;

              let status: 'scheduled' | 'in_play' | 'finished' = 'scheduled';
              let time = '';

              if (
                stage === 'Finished' ||
                stage === 'Awarded' ||
                stage === 'After Pen.'
              ) {
                status = 'finished';
              } else if (
                stage === 'Half Time' ||
                stage === 'Interrupted'
              ) {
                status = 'in_play';
                time = stage;
              } else if (stage.includes("'")) {
                status = 'in_play';
                time = stage;
              } else if (/^\d{1,2}:\d{2}$/.test(stage)) {
                status = 'scheduled';
                time = stage;
              } else if (/^\d{1,3}$/.test(stage)) {
                status = 'in_play';
                time = stage + "'";
              } else if (
                /^\d+$/.test(homeScore) &&
                /^\d+$/.test(awayScore)
              ) {
                status = 'finished';
              }

              const leagueTrimmed = currentLeague.trim();
              const isFeaturedOnly = featuredSet.has(leagueTrimmed);
              const isUnique = uniqueSet.has(leagueTrimmed);

              if (isFeaturedOnly && !isFeatured) continue;
              if (!isFeaturedOnly && !isUnique) continue;

              results.push({
                home_team: home,
                away_team: away,
                league_name: leagueTrimmed,
                time,
                status,
                scheduled_time: scheduledTime,
                home_score:
                  homeScore && /^\d+$/.test(homeScore)
                    ? homeScore
                    : undefined,
                away_score:
                  awayScore && /^\d+$/.test(awayScore)
                    ? awayScore
                    : undefined,
              });
            }
          }

          return results;
        }

        const allDivs = document.querySelectorAll('div');
        const containers: { el: HTMLElement; size: number }[] = [];

        for (const div of allDivs) {
          const matches = div.querySelectorAll(':scope > .event__match');
          if (matches.length > 3) {
            containers.push({
              el: div as HTMLElement,
              size: matches.length,
            });
          }
        }
        containers.sort((a, b) => b.size - a.size);
        if (containers.length === 0) return [];

        const bigContainer = containers[0];
        const featuredContainers = containers.filter((c) => c.size < 100);
        const allFixtures: any[] = [];

        for (const fc of featuredContainers) {
          allFixtures.push(...extractFromContainer(fc.el, true));
        }
        allFixtures.push(...extractFromContainer(bigContainer.el, false));

        return allFixtures;
      },
      {
        unique: UNIQUE_LEAGUES,
        featuredOnly: FEATURED_ONLY_LEAGUES,
        countries: FLASHSCORE_COUNTRIES,
      },
    );

    return fixtures;
  } finally {
    await browser.close();
  }
}
