import {
  BivariatePoissonResult,
  DixonColesResult,
  ModelComparisonResult,
  ScoreProbItem,
  SisalMatch,
  TeamStatsSummary,
} from '../types';

// Tabella fattoriali precalcolati O(1) per alleggerire i calcoli di probabilità
const FACTORIAL_TABLE = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600];

/**
 * Funzione fattoriale O(1)
 */
function factorial(n: number): number {
  if (n <= 1) return 1;
  return FACTORIAL_TABLE[n] || 1;
}

/**
 * Coefficiente binomiale n su k con calcolo O(1)
 */
function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  const fn = FACTORIAL_TABLE[n];
  const fk = FACTORIAL_TABLE[k];
  const fnk = FACTORIAL_TABLE[n - k];
  if (!fn || !fk || !fnk) return 1;
  return fn / (fk * fnk);
}

/**
 * Probabilità Poisson univariata standard: P(k; lambda) con lookup fattoriale O(1)
 */
function poissonProb(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  const fk = FACTORIAL_TABLE[k] || factorial(k);
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / fk;
}

/**
 * Modello Dixon & Coles (1997)
 * Corregge le probabilità binarie dei punteggi bassi (0-0, 1-0, 0-1, 1-1) attraverso la funzione tau(x, y, lambda, mu, rho)
 */
export function computeDixonColes(
  homeLambda: number,
  awayLambda: number,
  rho = -0.12,
  maxGoals = 7
): DixonColesResult {
  const lambda = Math.max(0.3, homeLambda);
  const mu = Math.max(0.3, awayLambda);

  const tau = (x: number, y: number): number => {
    if (x === 0 && y === 0) {
      return 1 - lambda * mu * rho;
    }
    if (x === 0 && y === 1) {
      return 1 + lambda * rho;
    }
    if (x === 1 && y === 0) {
      return 1 + mu * rho;
    }
    if (x === 1 && y === 1) {
      return 1 - rho;
    }
    return 1.0;
  };

  const matrix: { home: number; away: number; rawP: number; p: number; tauMult: number }[] = [];
  let totalRawP = 0;

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const pInd = poissonProb(h, lambda) * poissonProb(a, mu);
      const mult = Math.max(0, tau(h, a));
      const rawP = pInd * mult;
      totalRawP += rawP;
      matrix.push({ home: h, away: a, rawP, p: 0, tauMult: mult });
    }
  }

  // Normalizzazione per somma = 1.0
  let p1 = 0;
  let pX = 0;
  let p2 = 0;
  let over15 = 0;
  let over25 = 0;
  let over35 = 0;
  let btts = 0;

  let p00 = 0;
  let p11 = 0;
  let p10 = 0;
  let p01 = 0;

  let p00Indep = 0;
  let p11Indep = 0;

  const scoreItems: ScoreProbItem[] = [];

  matrix.forEach(cell => {
    const normP = totalRawP > 0 ? cell.rawP / totalRawP : 0;
    cell.p = normP;

    if (cell.home > cell.away) p1 += normP;
    else if (cell.home < cell.away) p2 += normP;
    else pX += normP;

    const tot = cell.home + cell.away;
    if (tot > 1.5) over15 += normP;
    if (tot > 2.5) over25 += normP;
    if (tot > 3.5) over35 += normP;
    if (cell.home > 0 && cell.away > 0) btts += normP;

    if (cell.home === 0 && cell.away === 0) p00 = normP;
    if (cell.home === 1 && cell.away === 1) p11 = normP;
    if (cell.home === 1 && cell.away === 0) p10 = normP;
    if (cell.home === 0 && cell.away === 1) p01 = normP;

    scoreItems.push({
      home: cell.home,
      away: cell.away,
      prob: normP,
      label: `${cell.home}-${cell.away}`,
      tauMultiplier: cell.tauMult,
    });
  });

  // Calcolo indipendenti per stimare l'effetto correttivo di Dixon-Coles
  p00Indep = poissonProb(0, lambda) * poissonProb(0, mu);
  p11Indep = poissonProb(1, lambda) * poissonProb(1, mu);

  const score00DiffPct = p00Indep > 0 ? Math.round(((p00 - p00Indep) / p00Indep) * 1000) / 10 : 0;
  const score11DiffPct = p11Indep > 0 ? Math.round(((p11 - p11Indep) / p11Indep) * 1000) / 10 : 0;

  const topScores = scoreItems.sort((a, b) => b.prob - a.prob).slice(0, 8);

  const fairOdds1 = p1 > 0 ? Math.round((1 / p1) * 100) / 100 : 99;
  const fairOddsX = pX > 0 ? Math.round((1 / pX) * 100) / 100 : 99;
  const fairOdds2 = p2 > 0 ? Math.round((1 / p2) * 100) / 100 : 99;

  return {
    homeLambda: Math.round(lambda * 100) / 100,
    awayLambda: Math.round(mu * 100) / 100,
    rho,
    prob1: Math.round(p1 * 1000) / 10,
    probX: Math.round(pX * 1000) / 10,
    prob2: Math.round(p2 * 1000) / 10,
    fairOdds1,
    fairOddsX,
    fairOdds2,
    probOver15: Math.round(over15 * 1000) / 10,
    probOver25: Math.round(over25 * 1000) / 10,
    probOver35: Math.round(over35 * 1000) / 10,
    probBtts: Math.round(btts * 1000) / 10,
    probNoGoal: Math.round((1 - btts) * 1000) / 10,
    topScores,
    lowScoreCorrection: {
      score00DiffPct,
      score11DiffPct,
      score10DiffPct: Math.round((p10 * 100)),
      score01DiffPct: Math.round((p01 * 100)),
    },
  };
}

/**
 * Modello Poisson Bivariato (Karlis & Ntzoufras 2003)
 * Modella la correlazione tra gol casa e gol trasferta mediante un termine di intensità congiunta lambda3 (covarianza)
 */
export function computeBivariatePoisson(
  homeLambda: number,
  awayLambda: number,
  covarianceLambda3 = 0.18,
  maxGoals = 7
): BivariatePoissonResult {
  // Calcolo dei parametri bivariati
  const l3 = Math.min(Math.min(homeLambda, awayLambda) * 0.45, Math.max(0.04, covarianceLambda3));
  const l1 = Math.max(0.1, homeLambda - l3);
  const l2 = Math.max(0.1, awayLambda - l3);

  const expTerm = Math.exp(-(l1 + l2 + l3));

  const scoreItems: ScoreProbItem[] = [];
  let totalP = 0;

  for (let x = 0; x <= maxGoals; x++) {
    for (let y = 0; y <= maxGoals; y++) {
      let sumK = 0;
      const minXY = Math.min(x, y);

      for (let k = 0; k <= minXY; k++) {
        const combX = combinations(x, k);
        const combY = combinations(y, k);
        const term = combX * combY * factorial(k) * Math.pow(l3 / (l1 * l2), k);
        sumK += term;
      }

      const pXY = expTerm * (Math.pow(l1, x) / factorial(x)) * (Math.pow(l2, y) / factorial(y)) * sumK;
      totalP += pXY;

      scoreItems.push({
        home: x,
        away: y,
        prob: pXY,
        label: `${x}-${y}`,
      });
    }
  }

  // Normalizza
  let p1 = 0;
  let pX = 0;
  let p2 = 0;
  let over15 = 0;
  let over25 = 0;
  let over35 = 0;
  let btts = 0;

  scoreItems.forEach(item => {
    item.prob = totalP > 0 ? item.prob / totalP : 0;

    if (item.home > item.away) p1 += item.prob;
    else if (item.home < item.away) p2 += item.prob;
    else pX += item.prob;

    const tot = item.home + item.away;
    if (tot > 1.5) over15 += item.prob;
    if (tot > 2.5) over25 += item.prob;
    if (tot > 3.5) over35 += item.prob;
    if (item.home > 0 && item.away > 0) btts += item.prob;
  });

  const topScores = scoreItems.sort((a, b) => b.prob - a.prob).slice(0, 8);

  const fairOdds1 = p1 > 0 ? Math.round((1 / p1) * 100) / 100 : 99;
  const fairOddsX = pX > 0 ? Math.round((1 / pX) * 100) / 100 : 99;
  const fairOdds2 = p2 > 0 ? Math.round((1 / p2) * 100) / 100 : 99;

  // Stima correlazione di Pearson teorica: lambda3 / sqrt((lambda1+lambda3)*(lambda2+lambda3))
  const correlation = Math.round((l3 / Math.sqrt((l1 + l3) * (l2 + l3))) * 1000) / 1000;

  return {
    lambda1: Math.round(l1 * 100) / 100,
    lambda2: Math.round(l2 * 100) / 100,
    lambda3: Math.round(l3 * 100) / 100,
    correlation,
    prob1: Math.round(p1 * 1000) / 10,
    probX: Math.round(pX * 1000) / 10,
    prob2: Math.round(p2 * 1000) / 10,
    fairOdds1,
    fairOddsX,
    fairOdds2,
    probOver15: Math.round(over15 * 1000) / 10,
    probOver25: Math.round(over25 * 1000) / 10,
    probOver35: Math.round(over35 * 1000) / 10,
    probBtts: Math.round(btts * 1000) / 10,
    probNoGoal: Math.round((1 - btts) * 1000) / 10,
    topScores,
  };
}

/**
 * Confronto completo e affiancato: Poisson Standard vs Dixon-Coles vs Poisson Bivariato vs Quote Sisal
 */
export function compareAdvancedModels(
  sisalMatch: SisalMatch,
  homeStats: TeamStatsSummary | null,
  awayStats: TeamStatsSummary | null
): ModelComparisonResult {
  // Stima lambda
  let homeLambda = 1.45;
  let awayLambda = 1.15;

  if (homeStats && awayStats) {
    homeLambda = Math.max(0.4, (homeStats.goalsScoredAvg * 1.1 + awayStats.goalsConcededAvg) / 2);
    awayLambda = Math.max(0.4, (awayStats.goalsScoredAvg * 0.9 + homeStats.goalsConcededAvg) / 2);
  } else if (sisalMatch.q1 && sisalMatch.q2) {
    const ratio = sisalMatch.q2 / sisalMatch.q1;
    homeLambda = Math.min(3.0, Math.max(0.6, 1.25 * Math.sqrt(ratio)));
    awayLambda = Math.min(3.0, Math.max(0.6, 1.25 / Math.sqrt(ratio)));
  }

  // 1. Poisson Standard Indipendente
  const maxG = 7;
  let poisP1 = 0;
  let poisPX = 0;
  let poisP2 = 0;
  let poisOver25 = 0;
  let poisBtts = 0;

  for (let h = 0; h <= maxG; h++) {
    for (let a = 0; a <= maxG; a++) {
      const p = poissonProb(h, homeLambda) * poissonProb(a, awayLambda);
      if (h > a) poisP1 += p;
      else if (h < a) poisP2 += p;
      else poisPX += p;

      if (h + a > 2.5) poisOver25 += p;
      if (h > 0 && a > 0) poisBtts += p;
    }
  }

  // 2. Modello Dixon & Coles
  const dcResult = computeDixonColes(homeLambda, awayLambda, -0.12, maxG);

  // 3. Modello Poisson Bivariato
  const bpResult = computeBivariatePoisson(homeLambda, awayLambda, 0.16, maxG);

  // 4. Quote Sisal Implicite
  let sisalData: ModelComparisonResult['sisalImplied'] = null;
  if (sisalMatch.q1 && sisalMatch.qX && sisalMatch.q2) {
    const q1 = sisalMatch.q1;
    const qX = sisalMatch.qX;
    const q2 = sisalMatch.q2;
    const sumProb = (1 / q1) + (1 / qX) + (1 / q2);

    let over25Prob = 50;
    if (sisalMatch.qO25 && sisalMatch.qU25) {
      const sumUO = (1 / sisalMatch.qO25) + (1 / sisalMatch.qU25);
      over25Prob = Math.round(((1 / sisalMatch.qO25) / sumUO) * 1000) / 10;
    }

    let bttsProb = 50;
    if (sisalMatch.qGoal && sisalMatch.qNoGoal) {
      const sumG = (1 / sisalMatch.qGoal) + (1 / sisalMatch.qNoGoal);
      bttsProb = Math.round(((1 / sisalMatch.qGoal) / sumG) * 1000) / 10;
    }

    sisalData = {
      prob1: Math.round(((1 / q1) / sumProb) * 1000) / 10,
      probX: Math.round(((1 / qX) / sumProb) * 1000) / 10,
      prob2: Math.round(((1 / q2) / sumProb) * 1000) / 10,
      probOver25: over25Prob,
      probBtts: bttsProb,
      odd1: q1,
      oddX: qX,
      odd2: q2,
      payout: Math.round((100 / sumProb) * 10) / 10,
    };
  }

  const poisP1Pct = Math.round(poisP1 * 1000) / 10;
  const poisPXPct = Math.round(poisPX * 1000) / 10;
  const poisP2Pct = Math.round(poisP2 * 1000) / 10;

  const drawDixonColesDiffPct = Math.round((dcResult.probX - poisPXPct) * 10) / 10;
  const drawBivariateDiffPct = Math.round((bpResult.probX - poisPXPct) * 10) / 10;

  let recommendedModel: 'Dixon-Coles' | 'Poisson Bivariata' | 'Consenso' = 'Consenso';
  let rationale = '';

  if (Math.abs(dcResult.probX - bpResult.probX) <= 1.5) {
    recommendedModel = 'Consenso';
    rationale = `Forte accordo tra Dixon-Coles (${dcResult.probX}%) e Poisson Bivariata (${bpResult.probX}%): entrambi correggono l'indipendenza di Poisson aumentando la probabilità di pareggio rispetto al Poisson puro (${poisPXPct}%).`;
  } else if (homeLambda + awayLambda < 2.3) {
    recommendedModel = 'Dixon-Coles';
    rationale = `Match a basso punteggio atteso (xG totale < 2.3): la correzione parametrica tau di Dixon-Coles è statisticamente superiore nel modellare la probabilità di 0-0 e 1-1.`;
  } else {
    recommendedModel = 'Poisson Bivariata';
    rationale = `Match a ritmo vivace (xG totale ≥ 2.3): la covarianza comune lambda3 della Poisson Bivariata cattura meglio le transizioni rapide e la correlazione di gol tra le due squadre.`;
  }

  return {
    poissonStandard: {
      prob1: poisP1Pct,
      probX: poisPXPct,
      prob2: poisP2Pct,
      probOver25: Math.round(poisOver25 * 1000) / 10,
      probBtts: Math.round(poisBtts * 1000) / 10,
      fair1: poisP1 > 0 ? Math.round((1 / poisP1) * 100) / 100 : 99,
      fairX: poisPX > 0 ? Math.round((1 / poisPX) * 100) / 100 : 99,
      fair2: poisP2 > 0 ? Math.round((1 / poisP2) * 100) / 100 : 99,
    },
    dixonColes: dcResult,
    bivariatePoisson: bpResult,
    sisalImplied: sisalData,
    divergenceSummary: {
      drawDixonColesDiffPct,
      drawBivariateDiffPct,
      recommendedModel,
      rationale,
    },
  };
}
