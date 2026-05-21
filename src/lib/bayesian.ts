/**
 * Bayesian confidence interval calculation using beta distribution.
 * Provides the confidence slider value and interval for predictions.
 */

// Regularized incomplete beta function (continued fraction method)
function betacf(a: number, b: number, x: number): number {
  const MAX_ITER = 100;
  const EPS = 3e-7;
  const FPMIN = 1e-30;

  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= MAX_ITER; m++) {
    let m2 = 2 * m;
    // Even step
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    // Odd step
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    let del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function betai(a: number, b: number, x: number): number {
  if (x < 0 || x > 1) return 0;
  if (x === 0 || x === 1) return x;

  let bt = (
    Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) +
    a * Math.log(x) + b * Math.log(1 - x))
  );

  if (x < (a + 1) / (a + b + 2)) {
    return bt * betacf(a, b, x) / a;
  } else {
    return 1 - bt * betacf(b, a, 1 - x) / b;
  }
}

function logGamma(x: number): number {
  const coef = [
    76.18009172947146, -86.50532032941677,
    24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += coef[j] / y;
  }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/**
 * Compute Bayesian confidence interval from binomial successes/trials.
 * Uses Jeffreys prior (Beta(0.5, 0.5)).
 */
export function bayesianConfidenceInterval(
  successes: number,
  trials: number,
  confidenceLevel: number = 0.90
): { low: number; high: number; pointEstimate: number } {
  if (trials === 0) {
    return { low: 0, high: 1, pointEstimate: 0.5 };
  }

  const alpha = successes + 0.5; // Jeffreys prior
  const beta = trials - successes + 0.5;
  const pointEstimate = successes / trials;

  // Equal-tailed interval
  const tail = (1 - confidenceLevel) / 2;
  const low = (tail < 0.5) ? inverseBeta(alpha, beta, tail) : 0;
  const high = inverseBeta(alpha, beta, 1 - tail);

  return { low, high, pointEstimate };
}

/**
 * Inverse beta CDF using binary search.
 */
function inverseBeta(a: number, b: number, p: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;

  let lo = 0;
  let hi = 1;
  const EPS = 1e-6;
  let iter = 0;

  while (hi - lo > EPS && iter < 50) {
    let mid = (lo + hi) / 2;
    let f = betai(a, b, mid);
    if (f < p) lo = mid;
    else hi = mid;
    iter++;
  }
  return (lo + hi) / 2;
}

/**
 * Compute Bayesian confidence score (spread-adjusted).
 * Higher confidence = tighter interval around the point estimate.
 */
export function computeConfidenceScore(
  successes: number,
  trials: number
): number {
  if (trials === 0) return 0.5;

  const { low, high, pointEstimate } = bayesianConfidenceInterval(successes, trials);
  const intervalWidth = high - low;

  // Score: 1 - intervalWidth, scaled by distance from 0.5
  const spreadScore = 1 - intervalWidth;
  const certaintyBonus = Math.abs(pointEstimate - 0.5) * 2;

  return Math.min(0.95, Math.max(0.1, spreadScore * 0.6 + certaintyBonus * 0.4));
}
