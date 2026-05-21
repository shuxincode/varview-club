/**
 * Test lambda variance across leagues by importing the built module.
 * Run via: node scripts/test-variance.mjs
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Dynamic import path to the TS file via tsconfig paths
const { estimateLambdas } = require('../src/lib/agents/team-ratings.ts');

const fixtures = [
  { label: 'Bayern vs Dortmund (Bundesliga ×1.08)',     home: 'Bayern Munich',          away: 'Borussia Dortmund',  league: 'Bundesliga' },
  { label: 'Inter vs Juventus (Serie A ×0.92)',         home: 'Inter Milan',            away: 'Juventus',           league: 'Serie A' },
  { label: 'Soton vs Ipswich (Prem ×1.05)',             home: 'Southampton',            away: 'Ipswich Town',       league: 'Premier League' },
  { label: 'Man City vs Arsenal (Prem ×1.05)',          home: 'Manchester City',        away: 'Arsenal',            league: 'Premier League' },
  { label: 'PSG vs Marseille (Ligue 1 ×0.98)',          home: 'Paris Saint-Germain',    away: 'Marseille',          league: 'Ligue 1' },
  { label: 'Real Madrid vs Barcelona (La Liga ×0.95)',  home: 'Real Madrid',            away: 'Barcelona',          league: 'La Liga' },
  { label: 'Ajax vs PSV (Eredivisie ×1.10)',            home: 'Ajax',                   away: 'PSV',                league: 'Eredivisie' },
  { label: 'Benfica vs Porto (Primeira ×0.96)',         home: 'Benfica',                away: 'Porto',              league: 'Primeira Liga' },
  { label: 'Unknown teams (no league)',                 home: 'FC Random',              away: 'SC Unknown',         league: '' },
];

for (const f of fixtures) {
  const { lambdaHome, lambdaAway } = estimateLambdas(f.home, f.away, f.league || undefined);
  const total = lambdaHome + lambdaAway;
  console.log(`${f.label}`);
  console.log(`  λ_home=${lambdaHome.toFixed(2)}  λ_away=${lambdaAway.toFixed(2)}  λ_total=${total.toFixed(2)}`);
}
