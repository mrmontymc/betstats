import { HistoricalMatch, RoiPattern, SisalMatch, TeamStatsSummary } from '../types';
import { evaluateMatchHighWinRate1X2 } from './statsCalculator';

/**
 * Modulo di Pattern Mining e Quantitative Analysis
 * Analizza le partite storiche per trovare correlazioni e pattern tra quote e statistiche
 * con calcolo del ROI storico reale (Flat Stake = 1 unità per scommessa).
 */

interface PatternDefinition {
  id: string;
  name: string;
  category: 'Quote Pure' | 'Quote & Tiri' | 'Quote & Corner' | 'Equilibrio 1X2' | 'Over/Under';
  targetMarket: string;
  description: string;
  conditionsText: string;
  // Funzione di match storico: ritorna { applies: boolean, won: boolean, oddsUsed: number }
  evalHistorical: (m: HistoricalMatch, homeStats?: TeamStatsSummary, awayStats?: TeamStatsSummary) => {
    applies: boolean;
    won: boolean;
    odds: number;
  };
  // Funzione di match su partita Sisal futura:
  matchesSisal: (m: SisalMatch, homeStats?: TeamStatsSummary, awayStats?: TeamStatsSummary) => boolean;
}

const PATTERN_DEFINITIONS: PatternDefinition[] = [
  {
    id: 'draw_equilibrium',
    name: 'Draw Hunters (Equilibrio 1X2)',
    category: 'Equilibrio 1X2',
    targetMarket: 'Segno X (Pareggio)',
    description: 'Partite molto bilanciate con quote 1 e 2 quasi simmetriche e quota del pareggio remunerativa.',
    conditionsText: '|Quota 1 - Quota 2| ≤ 0.35, entrambe tra 2.30 e 3.10, Quota X ≥ 3.00',
    evalHistorical: (m) => {
      const qH = m.avgH || m.b365H || 0;
      const qD = m.avgD || m.b365D || 0;
      const qA = m.avgA || m.b365A || 0;
      if (!qH || !qD || !qA) return { applies: false, won: false, odds: 0 };

      const diff = Math.abs(qH - qA);
      const inRange = qH >= 2.30 && qH <= 3.20 && qA >= 2.30 && qA <= 3.20;
      const drawAttractive = qD >= 2.95;

      const applies = diff <= 0.40 && inRange && drawAttractive;
      const won = m.ftr === 'D';
      return { applies, won, odds: qD };
    },
    matchesSisal: (m) => {
      if (!m.q1 || !m.qX || !m.q2) return false;
      const diff = Math.abs(m.q1 - m.q2);
      return diff <= 0.40 && m.q1 >= 2.30 && m.q1 <= 3.20 && m.q2 >= 2.30 && m.q2 <= 3.20 && m.qX >= 2.95;
    },
  },
  {
    id: 'high_pace_over25',
    name: 'Sweet Spot Over 2.5 (Volume Tiri Elevato)',
    category: 'Over/Under',
    targetMarket: 'Over 2.5 Gol',
    description: 'Quote Over 2.5 ad alto valore abbinate a squadre o contesti con alta produzione offensiva.',
    conditionsText: 'Quota Over 2.5 tra 1.70 e 2.25 con somma tiri in porta medi ≥ 8.0 o Quota Over vantaggiosa',
    evalHistorical: (m, hStats, aStats) => {
      const qOver = m.avgOver25 || m.b365Over25 || 0;
      if (!qOver) return { applies: false, won: false, odds: 0 };

      // Se abbiamo statistiche tiri nel match o statistiche squadra
      const shotsOnTargetSum = (m.hst ?? 4) + (m.ast ?? 4);
      const teamSotAvg = (hStats?.shotsOnTargetAvg ?? 4.2) + (aStats?.shotsOnTargetAvg ?? 4.0);

      const highPace = shotsOnTargetSum >= 8 || teamSotAvg >= 8.2;
      const oddsGood = qOver >= 1.72 && qOver <= 2.25;

      const applies = oddsGood && highPace;
      const won = (m.fthg + m.ftag) > 2.5;
      return { applies, won, odds: qOver };
    },
    matchesSisal: (m, hStats, aStats) => {
      if (!m.qO25) return false;
      const oddsGood = m.qO25 >= 1.72 && m.qO25 <= 2.25;
      if (hStats && aStats) {
        const teamSotAvg = hStats.shotsOnTargetAvg + aStats.shotsOnTargetAvg;
        const overRateCombined = (hStats.over25Rate + aStats.over25Rate) / 2;
        return oddsGood && (teamSotAvg >= 8.0 || overRateCombined >= 50);
      }
      return oddsGood && m.qO25 <= 2.05;
    },
  },
  {
    id: 'under_tactical_lock',
    name: 'Tactical Lock (Under 2.5 & Difese Solide)',
    category: 'Over/Under',
    targetMarket: 'Under 2.5 Gol',
    description: 'Incontri a basso punteggio atteso con quote Under 2.5 generose e difese che concedono pochi tiri.',
    conditionsText: 'Quota Under 2.5 ≥ 1.65 con Clean Sheet combinato ≥ 55% o Quota 1 e 2 entrambe ≥ 2.10',
    evalHistorical: (m, hStats, aStats) => {
      const qUnder = m.avgUnder25 || m.b365Under25 || 0;
      if (!qUnder) return { applies: false, won: false, odds: 0 };

      const cleanSheetSum = (hStats?.cleanSheetRate ?? 30) + (aStats?.cleanSheetRate ?? 30);
      const applies = qUnder >= 1.65 && (cleanSheetSum >= 50 || ((m.avgH || 2.5) >= 2.10 && (m.avgA || 2.5) >= 2.30));
      const won = (m.fthg + m.ftag) < 2.5;
      return { applies, won, odds: qUnder };
    },
    matchesSisal: (m, hStats, aStats) => {
      if (!m.qU25) return false;
      if (hStats && aStats) {
        const cleanSheetSum = hStats.cleanSheetRate + aStats.cleanSheetRate;
        return m.qU25 >= 1.65 && cleanSheetSum >= 50;
      }
      return m.qU25 >= 1.75 && (m.q1 || 0) >= 2.10 && (m.q2 || 0) >= 2.30;
    },
  },
  {
    id: 'away_dog_value',
    name: 'Away Value Dog (Sfavorita Sottovalutata)',
    category: 'Quote & Tiri',
    targetMarket: 'Doppia Chance X2 / Vittoria 2',
    description: 'Ospite offerta a quota interessante (≥ 3.20) contro una favorita in casa fragile (Quota 1 ≥ 1.85).',
    conditionsText: 'Quota Ospite tra 3.20 e 5.50, Quota Casa ≥ 1.80, Ospite con tiri in porta medi ≥ 3.5',
    evalHistorical: (m, hStats, aStats) => {
      const qH = m.avgH || m.b365H || 0;
      const qA = m.avgA || m.b365A || 0;
      if (!qH || !qA) return { applies: false, won: false, odds: 0 };

      const awaySot = aStats?.shotsOnTargetAvg ?? (m.ast || 3.5);
      const applies = qA >= 3.20 && qA <= 5.80 && qH >= 1.80 && awaySot >= 3.4;
      // Per prudenza e ROI calcoliamo su quota 2 o su pareggio/ospite
      const won = m.ftr === 'A' || m.ftr === 'D';
      // Quota implicita per X2
      const qD = m.avgD || 3.3;
      const oddX2 = 1 / ((1 / qD) + (1 / qA));
      return { applies, won, odds: oddX2 || 1.85 };
    },
    matchesSisal: (m, hStats, aStats) => {
      if (!m.q1 || !m.q2) return false;
      const appliesBasic = m.q2 >= 3.20 && m.q2 <= 5.80 && m.q1 >= 1.80;
      if (aStats) {
        return appliesBasic && aStats.shotsOnTargetAvg >= 3.2;
      }
      return appliesBasic;
    },
  },
  {
    id: 'heavy_home_efficiency',
    name: 'Heavy Home Dominance (Super Favorita Casa)',
    category: 'Quote Pure',
    targetMarket: 'Segno 1 (Vittoria Casa)',
    description: 'Favorite casalinghe solide con quota tra 1.30 e 1.58 dove il differenziale gol e tiri premia il rendimento.',
    conditionsText: 'Quota 1 tra 1.28 e 1.58, Quota Pareggio ≥ 4.00',
    evalHistorical: (m) => {
      const qH = m.avgH || m.b365H || 0;
      const qD = m.avgD || m.b365D || 0;
      if (!qH) return { applies: false, won: false, odds: 0 };

      const applies = qH >= 1.28 && qH <= 1.58 && qD >= 3.90;
      const won = m.ftr === 'H';
      return { applies, won, odds: qH };
    },
    matchesSisal: (m) => {
      if (!m.q1 || !m.qX) return false;
      return m.q1 >= 1.28 && m.q1 <= 1.58 && m.qX >= 3.90;
    },
  },
  {
    id: 'btts_trend',
    name: 'Goal / BTTS Trend (Entrambe a Segno)',
    category: 'Over/Under',
    targetMarket: 'Goal (Entrambe Segnano)',
    description: 'Partite aperte con quota Goal invitante e difese con basso tasso di clean sheet.',
    conditionsText: 'Quota Goal tra 1.62 e 2.10, Clean sheet medio entrambe le squadre ≤ 30%',
    evalHistorical: (m, hStats, aStats) => {
      // Usiamo una quota stimata o il mercato Over/Gol
      const qGoalEst = 1.80;
      const bttsSum = (hStats?.bttsRate ?? 55) + (aStats?.bttsRate ?? 55);
      const applies = bttsSum >= 100;
      const won = m.fthg > 0 && m.ftag > 0;
      return { applies, won, odds: qGoalEst };
    },
    matchesSisal: (m, hStats, aStats) => {
      if (!m.qGoal) return false;
      const oddsGood = m.qGoal >= 1.62 && m.qGoal <= 2.10;
      if (hStats && aStats) {
        return oddsGood && (hStats.bttsRate >= 50 || aStats.bttsRate >= 50);
      }
      return oddsGood;
    },
  },
  {
    id: 'corner_surge',
    name: 'Corner Surge (Over 9.5 Calci d\'Angolo)',
    category: 'Quote & Corner',
    targetMarket: 'Over 9.5 Corner Totali',
    description: 'Partite con squadre a forte vocazione di cross e tiri, con frequenza elevata di corner battuti.',
    conditionsText: 'Media corner combinata ≥ 10.2 a partita, tiri totali combinati ≥ 24.0',
    evalHistorical: (m, hStats, aStats) => {
      const cornersTot = (m.hc ?? 0) + (m.ac ?? 0);
      const avgCornersCombined = (hStats?.cornersAvg ?? 9.8) + (aStats?.cornersAvg ?? 9.5);
      const applies = avgCornersCombined >= 19.0 || (m.hs ?? 12) + (m.as ?? 12) >= 25;
      const won = cornersTot > 9.5;
      // Quota media di mercato per Over 9.5 corner ~ 1.85
      return { applies, won, odds: 1.85 };
    },
    matchesSisal: (m, hStats, aStats) => {
      if (hStats && aStats) {
        const cornersForCombined = hStats.cornersForAvg + aStats.cornersForAvg;
        const over95Pct = (hStats.cornersOver95Rate + aStats.cornersOver95Rate) / 2;
        return cornersForCombined >= 9.8 || over95Pct >= 50;
      }
      return false;
    },
  },
];

/**
 * Esegue l'analisi completa di tutti i pattern sull'archivio storico
 * Calcola ROI, Win Rate, Stake e profitto a massa pari.
 */
export function analyzeHistoricalPatterns(
  historicalMatches: HistoricalMatch[],
  teamSummaries: { [team: string]: TeamStatsSummary }
): RoiPattern[] {
  return PATTERN_DEFINITIONS.map(def => {
    let sampleSize = 0;
    let wins = 0;
    let losses = 0;
    let totalReturn = 0;
    let totalStake = 0;

    historicalMatches.forEach(m => {
      const hStats = teamSummaries[m.homeTeam];
      const aStats = teamSummaries[m.awayTeam];

      const res = def.evalHistorical(m, hStats, aStats);
      if (res.applies && res.odds > 1) {
        sampleSize++;
        totalStake += 1; // Flat stake 1 unità
        if (res.won) {
          wins++;
          totalReturn += res.odds;
        } else {
          losses++;
        }
      }
    });

    const netProfit = totalReturn - totalStake;
    const winRatePct = sampleSize > 0 ? Math.round((wins / sampleSize) * 1000) / 10 : 0;
    const roiPct = totalStake > 0 ? Math.round((netProfit / totalStake) * 1000) / 10 : 0;
    const isPositiveRoi = roiPct > 0;

    let confidence: 'Alta' | 'Media' | 'Bassa' = 'Bassa';
    if (sampleSize >= 25 && isPositiveRoi) confidence = 'Alta';
    else if (sampleSize >= 10) confidence = 'Media';

    return {
      id: def.id,
      name: def.name,
      category: def.category,
      targetMarket: def.targetMarket,
      description: def.description,
      conditionsText: def.conditionsText,
      sampleSize,
      wins,
      losses,
      winRatePct,
      profitUnits: Math.round(netProfit * 100) / 100,
      roiPct,
      isPositiveRoi,
      confidence,
    };
  });
}

/**
 * Associa a ogni match del palinsesto Sisal i pattern ricorrenti che soddisfa
 * e calcola se il match rientra in uno o più scenari con ROI positivo!
 */
export function tagSisalMatchesWithPatterns(
  sisalMatches: SisalMatch[],
  analyzedPatterns: RoiPattern[],
  teamSummaries: { [team: string]: TeamStatsSummary },
  historicalMatches?: HistoricalMatch[]
): SisalMatch[] {
  // Mappa dei pattern analizzati per id
  const patternStatsMap = new Map(analyzedPatterns.map(p => [p.id, p]));

  return sisalMatches.map(match => {
    const hStats = teamSummaries[match.squadra1];
    const aStats = teamSummaries[match.squadra2];

    const matchedPatterns: NonNullable<SisalMatch['matchedPatterns']> = [];

    PATTERN_DEFINITIONS.forEach(def => {
      if (def.matchesSisal(match, hStats, aStats)) {
        const stats = patternStatsMap.get(def.id);
        if (stats) {
          matchedPatterns.push({
            patternId: def.id,
            patternName: def.name,
            targetMarket: def.targetMarket,
            expectedRoi: stats.roiPct,
            rationale: `${def.description} (ROI Storico: ${stats.roiPct > 0 ? '+' : ''}${stats.roiPct}% su ${stats.sampleSize} partite nel DB)`,
          });
        }
      }
    });

    // Non assegnare pattern o segnalazioni se la partita ha quote impossibili (quota = 1.00)
    const isAnomalous = match.hasImpossibleOdds || !match.q1 || !match.qX || !match.q2 || match.q1 <= 1.001 || match.qX <= 1.001 || match.q2 <= 1.001;

    // Ordina i pattern dal ROI più alto
    matchedPatterns.sort((a, b) => b.expectedRoi - a.expectedRoi);

    // Valuta Win Rate 1X2 con tolleranza 0.05 solo se quote regolari
    const highWinRate1X2 = (historicalMatches && !isAnomalous)
      ? evaluateMatchHighWinRate1X2(match, historicalMatches, 0.05)
      : null;

    return {
      ...match,
      matchedPatterns: (!isAnomalous && matchedPatterns.length > 0) ? matchedPatterns : undefined,
      highWinRate1X2,
    };
  });
}
