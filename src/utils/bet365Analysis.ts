import { Bet365PairOddStat, Bet365SingleOddStat, HistoricalMatch, OddsRangeStat } from '../types';

/**
 * Analizza le quote Bet365 singole e calcola il Win Rate storico reale
 * Mette in evidenza (isHighlight = true) quando il Win Rate è >= 66%
 */
export function analyzeBet365SingleOdds(
  matches: HistoricalMatch[],
  minSampleSize = 2
): Bet365SingleOddStat[] {
  const groups: {
    [key: string]: {
      marketType: 'H' | 'D' | 'A' | 'Over25' | 'Under25';
      marketLabel: string;
      oddValue: number;
      total: number;
      wins: number;
      totalReturn: number;
    };
  } = {};

  const addStat = (
    marketType: 'H' | 'D' | 'A' | 'Over25' | 'Under25',
    marketLabel: string,
    odd: number | null,
    isWin: boolean
  ) => {
    if (!odd || isNaN(odd) || odd <= 1.0) return;
    const key = `${marketType}_${odd.toFixed(2)}`;

    if (!groups[key]) {
      groups[key] = {
        marketType,
        marketLabel,
        oddValue: odd,
        total: 0,
        wins: 0,
        totalReturn: 0,
      };
    }

    groups[key].total++;
    if (isWin) {
      groups[key].wins++;
      groups[key].totalReturn += odd;
    }
  };

  matches.forEach(m => {
    // 1. Quota Casa B365H
    addStat('H', 'Segno 1 (Casa)', m.b365H, m.ftr === 'H');

    // 2. Quota Pareggio B365D
    addStat('D', 'Segno X (Pareggio)', m.b365D, m.ftr === 'D');

    // 3. Quota Ospite B365A
    addStat('A', 'Segno 2 (Ospite)', m.b365A, m.ftr === 'A');

    // 4. Over 2.5
    if (m.b365Over25) {
      addStat('Over25', 'Over 2.5 Gol', m.b365Over25, m.fthg + m.ftag > 2.5);
    }

    // 5. Under 2.5
    if (m.b365Under25) {
      addStat('Under25', 'Under 2.5 Gol', m.b365Under25, m.fthg + m.ftag < 2.5);
    }
  });

  return Object.values(groups)
    .filter(g => g.total >= minSampleSize)
    .map(g => {
      const winRatePct = Math.round((g.wins / g.total) * 1000) / 10;
      const profitUnits = Math.round((g.totalReturn - g.total) * 100) / 100;
      const roiPct = Math.round((profitUnits / g.total) * 1000) / 10;
      const isHighlight = winRatePct >= 66.0;

      return {
        id: `${g.marketType}_${g.oddValue}`,
        marketType: g.marketType,
        marketLabel: g.marketLabel,
        oddValue: g.oddValue,
        sampleSize: g.total,
        wins: g.wins,
        winRatePct,
        isHighlight,
        profitUnits,
        roiPct,
      };
    })
    .sort((a, b) => b.winRatePct - a.winRatePct || b.sampleSize - a.sampleSize);
}

/**
 * Analizza le quote Bet365 a coppie ordinate e calcola il Win Rate
 * Coppie: (B365H, B365D), (B365H, B365A), (B365D, B365A)
 * Mette in evidenza (isHighlight = true) quando il Win Rate è >= 66%
 */
export function analyzeBet365PairOdds(
  matches: HistoricalMatch[],
  minSampleSize = 2
): Bet365PairOddStat[] {
  const pairGroups: {
    [key: string]: {
      pairType: 'H_D' | 'H_A' | 'D_A';
      pairLabel: string;
      odd1: number;
      odd2: number;
      targetOutcome: 'H' | 'D' | 'A' | '1X' | 'X2' | '12';
      targetLabel: string;
      total: number;
      wins: number;
      totalReturn: number;
    };
  } = {};

  const recordPair = (
    pairType: 'H_D' | 'H_A' | 'D_A',
    pairLabel: string,
    odd1: number | null,
    odd2: number | null,
    targetOutcome: 'H' | 'D' | 'A' | '1X' | 'X2' | '12',
    targetLabel: string,
    isWin: boolean,
    targetOdd: number
  ) => {
    if (!odd1 || !odd2 || isNaN(odd1) || isNaN(odd2) || odd1 <= 1.0 || odd2 <= 1.0) return;
    const key = `${pairType}_${odd1.toFixed(2)}_${odd2.toFixed(2)}_${targetOutcome}`;

    if (!pairGroups[key]) {
      pairGroups[key] = {
        pairType,
        pairLabel,
        odd1,
        odd2,
        targetOutcome,
        targetLabel,
        total: 0,
        wins: 0,
        totalReturn: 0,
      };
    }

    pairGroups[key].total++;
    if (isWin) {
      pairGroups[key].wins++;
      pairGroups[key].totalReturn += targetOdd;
    }
  };

  matches.forEach(m => {
    const qH = m.b365H;
    const qD = m.b365D;
    const qA = m.b365A;

    if (qH && qD) {
      // Coppia ordinata (Casa, Pareggio)
      // 1. Esito Casa
      recordPair('H_D', `Casa: ${qH.toFixed(2)} | Pareggio: ${qD.toFixed(2)}`, qH, qD, 'H', 'Segno 1', m.ftr === 'H', qH);
      // 2. Doppia Chance 1X
      const q1X = 1 / ((1 / qH) + (1 / qD));
      recordPair('H_D', `Casa: ${qH.toFixed(2)} | Pareggio: ${qD.toFixed(2)}`, qH, qD, '1X', 'Doppia Chance 1X', m.ftr === 'H' || m.ftr === 'D', q1X || 1.15);
    }

    if (qH && qA) {
      // Coppia ordinata (Casa, Ospite)
      recordPair('H_A', `Casa: ${qH.toFixed(2)} | Ospite: ${qA.toFixed(2)}`, qH, qA, 'H', 'Segno 1', m.ftr === 'H', qH);
      recordPair('H_A', `Casa: ${qH.toFixed(2)} | Ospite: ${qA.toFixed(2)}`, qH, qA, 'A', 'Segno 2', m.ftr === 'A', qA);
      // Doppia Chance 12 (nessun pareggio)
      const q12 = 1 / ((1 / qH) + (1 / qA));
      recordPair('H_A', `Casa: ${qH.toFixed(2)} | Ospite: ${qA.toFixed(2)}`, qH, qA, '12', 'Doppia Chance 12 (No Pareggio)', m.ftr !== 'D', q12 || 1.25);
    }

    if (qD && qA) {
      // Coppia ordinata (Pareggio, Ospite)
      recordPair('D_A', `Pareggio: ${qD.toFixed(2)} | Ospite: ${qA.toFixed(2)}`, qD, qA, 'A', 'Segno 2', m.ftr === 'A', qA);
      recordPair('D_A', `Pareggio: ${qD.toFixed(2)} | Ospite: ${qA.toFixed(2)}`, qD, qA, 'D', 'Segno X', m.ftr === 'D', qD);
      const qX2 = 1 / ((1 / qD) + (1 / qA));
      recordPair('D_A', `Pareggio: ${qD.toFixed(2)} | Ospite: ${qA.toFixed(2)}`, qD, qA, 'X2', 'Doppia Chance X2', m.ftr === 'D' || m.ftr === 'A', qX2 || 1.25);
    }
  });

  return Object.values(pairGroups)
    .filter(g => g.total >= minSampleSize)
    .map(g => {
      const winRatePct = Math.round((g.wins / g.total) * 1000) / 10;
      const profitUnits = Math.round((g.totalReturn - g.total) * 100) / 100;
      const roiPct = Math.round((profitUnits / g.total) * 1000) / 10;
      const isHighlight = winRatePct >= 66.0;

      return {
        id: `${g.pairType}_${g.odd1}_${g.odd2}_${g.targetOutcome}`,
        pairType: g.pairType,
        pairLabel: g.pairLabel,
        odd1: g.odd1,
        odd2: g.odd2,
        targetOutcome: g.targetOutcome,
        targetLabel: g.targetLabel,
        sampleSize: g.total,
        wins: g.wins,
        winRatePct,
        isHighlight,
        profitUnits,
        roiPct,
      };
    })
    .sort((a, b) => b.winRatePct - a.winRatePct || b.sampleSize - a.sampleSize);
}

interface BracketDef {
  min: number;
  max: number;
  label: string;
}

const ODDS_BRACKETS: BracketDef[] = [
  { min: 1.10, max: 1.45, label: '1.10 - 1.45 (Super Favorite)' },
  { min: 1.46, max: 1.75, label: '1.46 - 1.75 (Favorite Medie)' },
  { min: 1.76, max: 2.05, label: '1.76 - 2.05 (Equilibrio / Pari)' },
  { min: 2.06, max: 2.45, label: '2.06 - 2.45 (Equilibrio Alto)' },
  { min: 2.46, max: 2.95, label: '2.46 - 2.95 (Medio-Alte)' },
  { min: 2.96, max: 3.45, label: '2.96 - 3.45 (Pareggi & Sfavorite)' },
  { min: 3.46, max: 4.25, label: '3.46 - 4.25 (Sfavorite Marcate)' },
  { min: 4.26, max: 6.00, label: '4.26 - 6.00 (Outsider)' },
  { min: 6.01, max: 99.0, label: '6.00+ (Estreme)' },
];

/**
 * Analizza le quote Bet365 in archivio suddivise in fasce/range per ciascun mercato,
 * individuando i range con il ROI storico più elevato e il tasso di successo (Win Rate)
 */
export function analyzeBet365ProfitableRanges(
  matches: HistoricalMatch[],
  minSampleSize = 2
): OddsRangeStat[] {
  type MarketKey = '1' | 'X' | '2' | 'Over25' | 'Under25' | '1X' | 'X2' | '12';

  const marketNames: { [k in MarketKey]: string } = {
    '1': 'Segno 1 (Vittoria Casa)',
    'X': 'Segno X (Pareggio)',
    '2': 'Segno 2 (Vittoria Ospite)',
    'Over25': 'Over 2.5 Gol',
    'Under25': 'Under 2.5 Gol',
    '1X': 'Doppia Chance 1X',
    'X2': 'Doppia Chance X2',
    '12': 'Doppia Chance 12',
  };

  const rangeStats: {
    [key: string]: {
      marketType: MarketKey;
      marketLabel: string;
      bracket: BracketDef;
      sampleSize: number;
      wins: number;
      totalReturn: number;
      sumOdds: number;
    };
  } = {};

  const recordRangeBet = (
    marketType: MarketKey,
    odd: number | null,
    isWin: boolean
  ) => {
    if (!odd || isNaN(odd) || odd <= 1.05) return;

    const bracket = ODDS_BRACKETS.find(b => odd >= b.min && odd <= b.max);
    if (!bracket) return;

    const key = `${marketType}_${bracket.min}_${bracket.max}`;

    if (!rangeStats[key]) {
      rangeStats[key] = {
        marketType,
        marketLabel: marketNames[marketType],
        bracket,
        sampleSize: 0,
        wins: 0,
        totalReturn: 0,
        sumOdds: 0,
      };
    }

    rangeStats[key].sampleSize++;
    rangeStats[key].sumOdds += odd;
    if (isWin) {
      rangeStats[key].wins++;
      rangeStats[key].totalReturn += odd;
    }
  };

  matches.forEach(m => {
    // 1X2
    recordRangeBet('1', m.b365H, m.ftr === 'H');
    recordRangeBet('X', m.b365D, m.ftr === 'D');
    recordRangeBet('2', m.b365A, m.ftr === 'A');

    // Over / Under 2.5
    if (m.b365Over25) {
      recordRangeBet('Over25', m.b365Over25, m.fthg + m.ftag > 2.5);
    }
    if (m.b365Under25) {
      recordRangeBet('Under25', m.b365Under25, m.fthg + m.ftag < 2.5);
    }

    // Doppie Chance
    if (m.b365H && m.b365D) {
      const q1X = 1 / ((1 / m.b365H) + (1 / m.b365D));
      recordRangeBet('1X', q1X, m.ftr === 'H' || m.ftr === 'D');
    }
    if (m.b365D && m.b365A) {
      const qX2 = 1 / ((1 / m.b365D) + (1 / m.b365A));
      recordRangeBet('X2', qX2, m.ftr === 'D' || m.ftr === 'A');
    }
    if (m.b365H && m.b365A) {
      const q12 = 1 / ((1 / m.b365H) + (1 / m.b365A));
      recordRangeBet('12', q12, m.ftr !== 'D');
    }
  });

  return Object.values(rangeStats)
    .filter(r => r.sampleSize >= minSampleSize)
    .map(r => {
      const winRatePct = Math.round((r.wins / r.sampleSize) * 1000) / 10;
      const profitUnits = Math.round((r.totalReturn - r.sampleSize) * 100) / 100;
      const roiPct = Math.round((profitUnits / r.sampleSize) * 1000) / 10;
      const avgOdd = Math.round((r.sumOdds / r.sampleSize) * 100) / 100;

      let evaluation: OddsRangeStat['evaluation'] = 'Negativo';
      if (roiPct >= 10.0 && r.sampleSize >= 3) {
        evaluation = 'Ottimo Valore Atteso';
      } else if (roiPct > 0) {
        evaluation = 'Profittevole';
      } else if (roiPct >= -5.0) {
        evaluation = 'Equilibrato';
      } else if (roiPct < -25.0) {
        evaluation = 'Alto Rischio';
      }

      const isHighlight = winRatePct >= 66.0 || roiPct > 5.0;

      return {
        id: `${r.marketType}_${r.bracket.min}_${r.bracket.max}`,
        marketType: r.marketType,
        marketLabel: r.marketLabel,
        rangeMin: r.bracket.min,
        rangeMax: r.bracket.max,
        rangeLabel: r.bracket.label,
        sampleSize: r.sampleSize,
        wins: r.wins,
        losses: r.sampleSize - r.wins,
        winRatePct,
        totalStake: r.sampleSize,
        totalReturn: Math.round(r.totalReturn * 100) / 100,
        profitUnits,
        roiPct,
        avgOdd,
        evaluation,
        isHighlight,
      };
    })
    .sort((a, b) => b.roiPct - a.roiPct || b.winRatePct - a.winRatePct);
}

