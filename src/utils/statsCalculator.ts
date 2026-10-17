import {
  CornerSumFrequency,
  GoalSumFrequency,
  HistoricalMatch,
  MonteCarloSimulationResult,
  OddsClusterResult,
  SisalMatch,
  TeamStanding,
  TeamStatsSummary,
} from '../types';

/**
 * Calcola la classifica completa da un insieme di match storici
 */
export function calculateLeagueTable(matches: HistoricalMatch[]): TeamStanding[] {
  const standingsMap: { [team: string]: TeamStanding } = {};

  const initTeam = (name: string): TeamStanding => ({
    team: name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
    homeWon: 0,
    homeDrawn: 0,
    homeLost: 0,
    awayWon: 0,
    awayDrawn: 0,
    awayLost: 0,
    form: [],
  });

  const sortedMatches = [...matches].sort((a, b) => {
    const partsA = a.date.split('/');
    const partsB = b.date.split('/');
    const dateA = new Date(Number(partsA[2]), Number(partsA[1]) - 1, Number(partsA[0])).getTime();
    const dateB = new Date(Number(partsB[2]), Number(partsB[1]) - 1, Number(partsB[0])).getTime();
    return dateA - dateB;
  });

  sortedMatches.forEach(m => {
    if (!standingsMap[m.homeTeam]) standingsMap[m.homeTeam] = initTeam(m.homeTeam);
    if (!standingsMap[m.awayTeam]) standingsMap[m.awayTeam] = initTeam(m.awayTeam);

    const home = standingsMap[m.homeTeam];
    const away = standingsMap[m.awayTeam];

    home.played++;
    away.played++;
    home.goalsFor += m.fthg;
    home.goalsAgainst += m.ftag;
    away.goalsFor += m.ftag;
    away.goalsAgainst += m.fthg;

    if (m.ftr === 'H') {
      home.won++;
      home.homeWon++;
      home.points += 3;
      home.form.push('W');
      away.lost++;
      away.awayLost++;
      away.form.push('L');
    } else if (m.ftr === 'A') {
      away.won++;
      away.awayWon++;
      away.points += 3;
      away.form.push('W');
      home.lost++;
      home.homeLost++;
      home.form.push('L');
    } else {
      home.drawn++;
      home.homeDrawn++;
      home.points += 1;
      home.form.push('D');
      away.drawn++;
      away.awayDrawn++;
      away.points += 1;
      away.form.push('D');
    }
  });

  return Object.values(standingsMap)
    .map(t => ({
      ...t,
      goalDiff: t.goalsFor - t.goalsAgainst,
      form: t.form.slice(-5),
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      return b.goalsFor - a.goalsFor;
    });
}

/**
 * Calcola i report statistici aggregati per ciascuna squadra includendo i CORNER in dettaglio
 */
export function calculateTeamSummaries(matches: HistoricalMatch[]): { [team: string]: TeamStatsSummary } {
  const summaries: { [team: string]: TeamStatsSummary } = {};
  const teamList = Array.from(new Set(matches.flatMap(m => [m.homeTeam, m.awayTeam])));

  teamList.forEach(team => {
    const teamMatches = matches.filter(m => m.homeTeam === team || m.awayTeam === team);
    if (teamMatches.length === 0) return;

    let totalGoalsScored = 0;
    let totalGoalsConceded = 0;
    let totalShots = 0;
    let totalShotsOnTarget = 0;
    let totalCornersFor = 0;
    let totalCornersAgainst = 0;
    let totalFouls = 0;
    let over25Count = 0;
    let bttsCount = 0;
    let cleanSheetCount = 0;
    let homeCount = 0;
    let awayCount = 0;

    let cornersOver85Count = 0;
    let cornersOver95Count = 0;
    let cornersOver105Count = 0;

    teamMatches.forEach(m => {
      const isHome = m.homeTeam === team;
      const teamCorners = isHome ? (m.hc ?? 0) : (m.ac ?? 0);
      const oppCorners = isHome ? (m.ac ?? 0) : (m.hc ?? 0);
      const totalMatchCorners = (m.hc ?? 0) + (m.ac ?? 0);

      if (totalMatchCorners > 8.5) cornersOver85Count++;
      if (totalMatchCorners > 9.5) cornersOver95Count++;
      if (totalMatchCorners > 10.5) cornersOver105Count++;

      totalCornersFor += teamCorners;
      totalCornersAgainst += oppCorners;

      if (isHome) {
        homeCount++;
        totalGoalsScored += m.fthg;
        totalGoalsConceded += m.ftag;
        if (m.hs !== null) totalShots += m.hs;
        if (m.hst !== null) totalShotsOnTarget += m.hst;
        if (m.hf !== null) totalFouls += m.hf;
        if (m.ftag === 0) cleanSheetCount++;
      } else {
        awayCount++;
        totalGoalsScored += m.ftag;
        totalGoalsConceded += m.fthg;
        if (m.as !== null) totalShots += m.as;
        if (m.ast !== null) totalShotsOnTarget += m.ast;
        if (m.af !== null) totalFouls += m.af;
        if (m.fthg === 0) cleanSheetCount++;
      }

      if (m.fthg + m.ftag > 2.5) over25Count++;
      if (m.fthg > 0 && m.ftag > 0) bttsCount++;
    });

    const total = teamMatches.length;

    summaries[team] = {
      team,
      matchesPlayed: total,
      homeMatches: homeCount,
      awayMatches: awayCount,
      goalsScoredAvg: Math.round((totalGoalsScored / total) * 100) / 100,
      goalsConcededAvg: Math.round((totalGoalsConceded / total) * 100) / 100,
      shotsAvg: Math.round((totalShots / total) * 10) / 10,
      shotsOnTargetAvg: Math.round((totalShotsOnTarget / total) * 10) / 10,
      cornersAvg: Math.round(((totalCornersFor + totalCornersAgainst) / total) * 10) / 10,
      cornersForAvg: Math.round((totalCornersFor / total) * 10) / 10,
      cornersAgainstAvg: Math.round((totalCornersAgainst / total) * 10) / 10,
      cornersOver85Rate: Math.round((cornersOver85Count / total) * 100),
      cornersOver95Rate: Math.round((cornersOver95Count / total) * 100),
      cornersOver105Rate: Math.round((cornersOver105Count / total) * 100),
      foulsAvg: Math.round((totalFouls / total) * 10) / 10,
      over25Rate: Math.round((over25Count / total) * 100),
      bttsRate: Math.round((bttsCount / total) * 100),
      cleanSheetRate: Math.round((cleanSheetCount / total) * 100),
    };
  });

  return summaries;
}

/**
 * Cluster Odds: cerca nel database storico le partite con quote simili (tolleranza massima specificata, default 0.1)
 * e calcola gli esiti reali registrati sulla base delle sole quote.
 */
export function findHistoricalOddsCluster(
  matches: HistoricalMatch[],
  targetOdds: { q1: number | null; qX: number | null; q2: number | null },
  tolerance = 0.1,
  criteria: '1X2' | '1X' | '12' | 'OverUnder' | 'Exact1X2' = '1X2'
): OddsClusterResult | null {
  const { q1, qX, q2 } = targetOdds;
  if (!q1 || !qX || !q2 || q1 <= 1.001 || qX <= 1.001 || q2 <= 1.001) return null;

  // Filtra le partite storiche che hanno quote valide e regolari (> 1.00)
  const candidates = matches.filter(m => {
    const oddH = m.b365H || m.avgH;
    const oddD = m.b365D || m.avgD;
    const oddA = m.b365A || m.avgA;
    if (!oddH || !oddD || !oddA || oddH <= 1.001 || oddD <= 1.001 || oddA <= 1.001) return false;

    const diffH = Math.abs(oddH - q1);
    const diffD = Math.abs(oddD - qX);
    const diffA = Math.abs(oddA - q2);

    if (criteria === '1X2' || criteria === 'Exact1X2') {
      return diffH <= tolerance && diffD <= tolerance && diffA <= tolerance;
    } else if (criteria === '12') {
      return diffH <= tolerance && diffA <= tolerance;
    } else if (criteria === '1X') {
      return diffH <= tolerance && diffD <= tolerance;
    }
    return diffH <= tolerance && diffD <= tolerance && diffA <= tolerance;
  });

  // Se i candidati sono 0 o pochi con tolleranza rigida su tutte e 3, possiamo allargare di poco o usare distanza euclidea
  let finalMatches = candidates;
  if (finalMatches.length < 3) {
    // Ricerca estesa con tolleranza dinamica leggermente ampliata (+0.05) per dare riscontro
    finalMatches = matches.filter(m => {
      const oddH = m.b365H || m.avgH;
      const oddD = m.b365D || m.avgD;
      const oddA = m.b365A || m.avgA;
      if (!oddH || !oddD || !oddA || oddH <= 1.001 || oddD <= 1.001 || oddA <= 1.001) return false;
      const diffH = Math.abs(oddH - q1);
      const diffD = Math.abs(oddD - qX);
      const diffA = Math.abs(oddA - q2);
      return diffH <= tolerance + 0.05 && diffD <= tolerance + 0.08 && diffA <= tolerance + 0.08;
    });
  }

  if (finalMatches.length === 0) {
    return {
      tolerance,
      criteria,
      matchedGames: [],
      totalMatches: 0,
      homeWinCount: 0,
      drawCount: 0,
      awayWinCount: 0,
      homeWinRate: 0,
      drawRate: 0,
      awayWinRate: 0,
      over15Rate: 0,
      over25Rate: 0,
      under25Rate: 0,
      over35Rate: 0,
      bttsRate: 0,
      noGoalRate: 0,
      avgHomeGoals: 0,
      avgAwayGoals: 0,
      avgTotalGoals: 0,
      avgCornersTotal: 0,
      avgHomeCorners: 0,
      avgAwayCorners: 0,
      cornersOver85Rate: 0,
      cornersOver95Rate: 0,
      cornersOver105Rate: 0,
      topScorelines: [],
    };
  }

  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let over15 = 0;
  let over25 = 0;
  let over35 = 0;
  let btts = 0;

  let totalHomeGoals = 0;
  let totalAwayGoals = 0;
  let totalHomeCorners = 0;
  let totalAwayCorners = 0;
  let cornersRecorded = 0;

  let cornersOver85 = 0;
  let cornersOver95 = 0;
  let cornersOver105 = 0;

  const scoreCounts: { [score: string]: number } = {};

  finalMatches.forEach(m => {
    if (m.ftr === 'H') homeWins++;
    else if (m.ftr === 'D') draws++;
    else if (m.ftr === 'A') awayWins++;

    const gTot = m.fthg + m.ftag;
    totalHomeGoals += m.fthg;
    totalAwayGoals += m.ftag;

    if (gTot > 1.5) over15++;
    if (gTot > 2.5) over25++;
    if (gTot > 3.5) over35++;
    if (m.fthg > 0 && m.ftag > 0) btts++;

    const scoreKey = `${m.fthg}-${m.ftag}`;
    scoreCounts[scoreKey] = (scoreCounts[scoreKey] || 0) + 1;

    if (m.hc !== null && m.ac !== null) {
      totalHomeCorners += m.hc;
      totalAwayCorners += m.ac;
      const cTot = m.hc + m.ac;
      if (cTot > 8.5) cornersOver85++;
      if (cTot > 9.5) cornersOver95++;
      if (cTot > 10.5) cornersOver105++;
      cornersRecorded++;
    }
  });

  const total = finalMatches.length;
  const cDiv = cornersRecorded > 0 ? cornersRecorded : 1;

  const topScorelines = Object.entries(scoreCounts)
    .map(([score, count]) => ({
      score,
      count,
      rate: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    tolerance,
    criteria,
    matchedGames: finalMatches,
    totalMatches: total,
    homeWinCount: homeWins,
    drawCount: draws,
    awayWinCount: awayWins,
    homeWinRate: Math.round((homeWins / total) * 100),
    drawRate: Math.round((draws / total) * 100),
    awayWinRate: Math.round((awayWins / total) * 100),
    over15Rate: Math.round((over15 / total) * 100),
    over25Rate: Math.round((over25 / total) * 100),
    under25Rate: Math.round(((total - over25) / total) * 100),
    over35Rate: Math.round((over35 / total) * 100),
    bttsRate: Math.round((btts / total) * 100),
    noGoalRate: Math.round(((total - btts) / total) * 100),
    avgHomeGoals: Math.round((totalHomeGoals / total) * 100) / 100,
    avgAwayGoals: Math.round((totalAwayGoals / total) * 100) / 100,
    avgTotalGoals: Math.round(((totalHomeGoals + totalAwayGoals) / total) * 100) / 100,
    avgCornersTotal: Math.round(((totalHomeCorners + totalAwayCorners) / cDiv) * 10) / 10,
    avgHomeCorners: Math.round((totalHomeCorners / cDiv) * 10) / 10,
    avgAwayCorners: Math.round((totalAwayCorners / cDiv) * 10) / 10,
    cornersOver85Rate: Math.round((cornersOver85 / cDiv) * 100),
    cornersOver95Rate: Math.round((cornersOver95 / cDiv) * 100),
    cornersOver105Rate: Math.round((cornersOver105 / cDiv) * 100),
    topScorelines,
  };
}

/**
 * Generatore pseudo-casuale Poisson (Knuth) ottimizzato con L precalcolato
 * Elimina migliaia di chiamate ridondanti a Math.exp all'interno dei cicli di simulazione
 */
function fastPoissonWithL(L: number): number {
  if (L >= 1) return 0;
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

/**
 * Esegue simulazione Monte Carlo su Gol e Corner ad alte prestazioni
 */
export function runMonteCarloSimulation(
  sisalMatch: SisalMatch,
  homeStats: TeamStatsSummary | null,
  awayStats: TeamStatsSummary | null,
  numSimulations = 2000
): MonteCarloSimulationResult {
  // Stima xG (Expected Goals)
  let homeLambda = 1.45;
  let awayLambda = 1.15;

  if (homeStats && awayStats) {
    // Modello Dixon-Coles/Poisson base: media gol fatti in casa e gol subiti fuori casa
    homeLambda = Math.max(0.4, (homeStats.goalsScoredAvg * 1.1 + awayStats.goalsConcededAvg) / 2);
    awayLambda = Math.max(0.4, (awayStats.goalsScoredAvg * 0.9 + homeStats.goalsConcededAvg) / 2);
  } else if (sisalMatch.q1 && sisalMatch.q2) {
    // Stima approssimativa dalle quote se mancano stats storiche
    const ratio = sisalMatch.q2 / sisalMatch.q1;
    homeLambda = Math.min(3.0, Math.max(0.6, 1.25 * Math.sqrt(ratio)));
    awayLambda = Math.min(3.0, Math.max(0.6, 1.25 / Math.sqrt(ratio)));
  }

  // Stima Lambda Corner
  const homeCornerLambda = homeStats?.cornersForAvg || 5.2;
  const awayCornerLambda = awayStats?.cornersForAvg || 4.4;

  // PRECALCOLO O(1) di L per Poisson: elimina 8.000 chiamate a Math.exp all'interno del loop
  const lHome = Math.exp(-homeLambda);
  const lAway = Math.exp(-awayLambda);
  const lHomeCorner = Math.exp(-homeCornerLambda);
  const lAwayCorner = Math.exp(-awayCornerLambda);

  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;

  let over15 = 0;
  let over25 = 0;
  let over35 = 0;
  let btts = 0;

  let totalSimulatedCornersHome = 0;
  let totalSimulatedCornersAway = 0;
  let cornersOver85 = 0;
  let cornersOver95 = 0;
  let cornersOver105 = 0;

  const scoreFreq: { [key: string]: { home: number; away: number; count: number } } = {};

  for (let i = 0; i < numSimulations; i++) {
    const simHomeGoals = fastPoissonWithL(lHome);
    const simAwayGoals = fastPoissonWithL(lAway);

    if (simHomeGoals > simAwayGoals) homeWins++;
    else if (simHomeGoals < simAwayGoals) awayWins++;
    else draws++;

    const totalGoals = simHomeGoals + simAwayGoals;
    if (totalGoals > 1.5) over15++;
    if (totalGoals > 2.5) over25++;
    if (totalGoals > 3.5) over35++;
    if (simHomeGoals > 0 && simAwayGoals > 0) btts++;

    const scoreKey = `${simHomeGoals}-${simAwayGoals}`;
    if (!scoreFreq[scoreKey]) {
      scoreFreq[scoreKey] = { home: simHomeGoals, away: simAwayGoals, count: 0 };
    }
    scoreFreq[scoreKey].count++;

    // Simulazione Corner con soglia precalcolata
    const simHomeCorners = fastPoissonWithL(lHomeCorner);
    const simAwayCorners = fastPoissonWithL(lAwayCorner);
    const simTotalCorners = simHomeCorners + simAwayCorners;

    totalSimulatedCornersHome += simHomeCorners;
    totalSimulatedCornersAway += simAwayCorners;

    if (simTotalCorners > 8.5) cornersOver85++;
    if (simTotalCorners > 9.5) cornersOver95++;
    if (simTotalCorners > 10.5) cornersOver105++;
  }

  const p1 = homeWins / numSimulations;
  const pX = draws / numSimulations;
  const p2 = awayWins / numSimulations;

  const fairOdds1 = p1 > 0 ? Math.round((1 / p1) * 100) / 100 : 99;
  const fairOddsX = pX > 0 ? Math.round((1 / pX) * 100) / 100 : 99;
  const fairOdds2 = p2 > 0 ? Math.round((1 / p2) * 100) / 100 : 99;

  const topScores = Object.entries(scoreFreq)
    .map(([score, data]) => ({
      score,
      homeGoals: data.home,
      awayGoals: data.away,
      count: data.count,
      pct: Math.round((data.count / numSimulations) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Analisi Value Bet tra quote Sisal e stima Monte Carlo
  const valueBets: MonteCarloSimulationResult['valueBets'] = [];

  const checkValue = (market: string, selection: string, sisalOdd: number | null, simProb: number) => {
    if (!sisalOdd || sisalOdd <= 1) return;
    const fairOdd = Math.round((1 / simProb) * 100) / 100;
    const impliedProbPct = Math.round((1 / sisalOdd) * 1000) / 10;
    const simulatedProbPct = Math.round(simProb * 1000) / 10;
    const edgePct = Math.round(((simProb * sisalOdd) - 1) * 1000) / 10;
    const isValue = edgePct > 2.0; // Valore se edge > +2%

    valueBets.push({
      market,
      selection,
      sisalOdd,
      fairOdd,
      impliedProbPct,
      simulatedProbPct,
      edgePct,
      isValue,
    });
  };

  checkValue('Esito Finale', '1 (Casa)', sisalMatch.q1, p1);
  checkValue('Esito Finale', 'X (Pareggio)', sisalMatch.qX, pX);
  checkValue('Esito Finale', '2 (Ospite)', sisalMatch.q2, p2);
  checkValue('Under/Over 2.5', 'Over 2.5', sisalMatch.qO25, over25 / numSimulations);
  checkValue('Under/Over 2.5', 'Under 2.5', sisalMatch.qU25, (numSimulations - over25) / numSimulations);
  checkValue('Goal/NoGoal', 'Goal (BTTS)', sisalMatch.qGoal, btts / numSimulations);
  checkValue('Goal/NoGoal', 'NoGoal', sisalMatch.qNoGoal, (numSimulations - btts) / numSimulations);

  return {
    simulations: numSimulations,
    homeExpectedGoals: Math.round(homeLambda * 100) / 100,
    awayExpectedGoals: Math.round(awayLambda * 100) / 100,
    homeWinRate: Math.round(p1 * 100),
    drawRate: Math.round(pX * 100),
    awayWinRate: Math.round(p2 * 100),
    fairOdds1,
    fairOddsX,
    fairOdds2,
    over15Rate: Math.round((over15 / numSimulations) * 100),
    over25Rate: Math.round((over25 / numSimulations) * 100),
    over35Rate: Math.round((over35 / numSimulations) * 100),
    bttsRate: Math.round((btts / numSimulations) * 100),
    noGoalRate: Math.round(((numSimulations - btts) / numSimulations) * 100),
    avgCornersHome: Math.round((totalSimulatedCornersHome / numSimulations) * 10) / 10,
    avgCornersAway: Math.round((totalSimulatedCornersAway / numSimulations) * 10) / 10,
    avgCornersTotal: Math.round(((totalSimulatedCornersHome + totalSimulatedCornersAway) / numSimulations) * 10) / 10,
    cornersOver85Rate: Math.round((cornersOver85 / numSimulations) * 100),
    cornersOver95Rate: Math.round((cornersOver95 / numSimulations) * 100),
    cornersOver105Rate: Math.round((cornersOver105 / numSimulations) * 100),
    topScores,
    valueBets,
  };
}

export interface SingleOutcomeStat {
  outcome: '1' | 'X' | '2';
  outcomeLabel: string;
  odd: number;
  tolerance: number;
  matchesCount: number;
  winsCount: number;
  winRatePct: number;
  isHighWinRate: boolean;
  sampleMatches: HistoricalMatch[];
}

export interface Match1X2AnalysisSummary {
  stat1: SingleOutcomeStat | null;
  statX: SingleOutcomeStat | null;
  stat2: SingleOutcomeStat | null;
  highWinRateAlert: SisalMatch['highWinRate1X2'];
}

/**
 * Calcola l'analisi dettagliata delle singole quote 1, X, 2 su base Bet365 con tolleranza data (default 0.05).
 * Questo assicura coerenza totale al 100% tra segnalazioni nel palinsesto e schermata dettaglio match.
 */
export function getMatch1X2SingleOddsStats(
  sisalMatch: SisalMatch,
  historicalMatches: HistoricalMatch[],
  tolerance = 0.05
): Match1X2AnalysisSummary {
  const q1 = sisalMatch.q1;
  const qX = sisalMatch.qX;
  const q2 = sisalMatch.q2;

  if (!q1 || !qX || !q2 || q1 <= 1.001 || qX <= 1.001 || q2 <= 1.001) {
    return {
      stat1: null,
      statX: null,
      stat2: null,
      highWinRateAlert: null,
    };
  }

  const hMatches: HistoricalMatch[] = [];
  const dMatches: HistoricalMatch[] = [];
  const aMatches: HistoricalMatch[] = [];

  let hWins = 0;
  let dWins = 0;
  let aWins = 0;

  for (let i = 0; i < historicalMatches.length; i++) {
    const m = historicalMatches[i];
    const oddH = m.b365H || m.avgH;
    const oddD = m.b365D || m.avgD;
    const oddA = m.b365A || m.avgA;

    if (oddH && oddH > 1.001 && Math.abs(oddH - q1) <= tolerance) {
      hMatches.push(m);
      if (m.ftr === 'H') hWins++;
    }
    if (oddD && oddD > 1.001 && Math.abs(oddD - qX) <= tolerance) {
      dMatches.push(m);
      if (m.ftr === 'D') dWins++;
    }
    if (oddA && oddA > 1.001 && Math.abs(oddA - q2) <= tolerance) {
      aMatches.push(m);
      if (m.ftr === 'A') aWins++;
    }
  }

  const hRate = hMatches.length >= 2 ? Math.round((hWins / hMatches.length) * 1000) / 10 : (hMatches.length === 1 ? Math.round((hWins / 1) * 100) : 0);
  const dRate = dMatches.length >= 2 ? Math.round((dWins / dMatches.length) * 1000) / 10 : (dMatches.length === 1 ? Math.round((dWins / 1) * 100) : 0);
  const aRate = aMatches.length >= 2 ? Math.round((aWins / aMatches.length) * 1000) / 10 : (aMatches.length === 1 ? Math.round((aWins / 1) * 100) : 0);

  const stat1: SingleOutcomeStat = {
    outcome: '1',
    outcomeLabel: 'Segno 1 (Casa)',
    odd: q1,
    tolerance,
    matchesCount: hMatches.length,
    winsCount: hWins,
    winRatePct: hRate,
    isHighWinRate: hRate >= 66.0 && hMatches.length >= 2,
    sampleMatches: hMatches,
  };

  const statX: SingleOutcomeStat = {
    outcome: 'X',
    outcomeLabel: 'Segno X (Pareggio)',
    odd: qX,
    tolerance,
    matchesCount: dMatches.length,
    winsCount: dWins,
    winRatePct: dRate,
    isHighWinRate: dRate >= 66.0 && dMatches.length >= 2,
    sampleMatches: dMatches,
  };

  const stat2: SingleOutcomeStat = {
    outcome: '2',
    outcomeLabel: 'Segno 2 (Trasferta)',
    odd: q2,
    tolerance,
    matchesCount: aMatches.length,
    winsCount: aWins,
    winRatePct: aRate,
    isHighWinRate: aRate >= 66.0 && aMatches.length >= 2,
    sampleMatches: aMatches,
  };

  const candidates: NonNullable<SisalMatch['highWinRate1X2']>[] = [];

  if (stat1.isHighWinRate) {
    candidates.push({
      outcome: '1',
      outcomeLabel: stat1.outcomeLabel,
      odd: q1,
      winRatePct: stat1.winRatePct,
      matchesCount: stat1.matchesCount,
      winsCount: stat1.winsCount,
    });
  }

  if (statX.isHighWinRate) {
    candidates.push({
      outcome: 'X',
      outcomeLabel: statX.outcomeLabel,
      odd: qX,
      winRatePct: statX.winRatePct,
      matchesCount: statX.matchesCount,
      winsCount: statX.winsCount,
    });
  }

  if (stat2.isHighWinRate) {
    candidates.push({
      outcome: '2',
      outcomeLabel: stat2.outcomeLabel,
      odd: q2,
      winRatePct: stat2.winRatePct,
      matchesCount: stat2.matchesCount,
      winsCount: stat2.winsCount,
    });
  }

  candidates.sort((a, b) => b.winRatePct - a.winRatePct || b.matchesCount - a.matchesCount);

  return {
    stat1,
    statX,
    stat2,
    highWinRateAlert: candidates.length > 0 ? candidates[0] : null,
  };
}

/**
 * Valuta se nel match c'è almeno un esito (1, X, 2) con Win Rate >= 66% su base quote storiche con tolleranza 0.05
 */
export function evaluateMatchHighWinRate1X2(
  sisalMatch: SisalMatch,
  historicalMatches: HistoricalMatch[],
  tolerance = 0.05
): SisalMatch['highWinRate1X2'] {
  const summary = getMatch1X2SingleOddsStats(sisalMatch, historicalMatches, tolerance);
  return summary.highWinRateAlert;
}

/**
 * Calcola la distribuzione empirica della Somma Gol nei match del database
 */
export function calculateGoalSumDistribution(matches: HistoricalMatch[]): GoalSumFrequency[] {
  if (matches.length === 0) return [];
  const counts: { [sum: number]: { count: number; scores: { [s: string]: number } } } = {
    0: { count: 0, scores: {} },
    1: { count: 0, scores: {} },
    2: { count: 0, scores: {} },
    3: { count: 0, scores: {} },
    4: { count: 0, scores: {} },
    5: { count: 0, scores: {} },
    6: { count: 0, scores: {} },
  };

  matches.forEach(m => {
    const sum = m.fthg + m.ftag;
    const bucket = sum >= 6 ? 6 : sum;
    counts[bucket].count++;
    const s = `${m.fthg}-${m.ftag}`;
    counts[bucket].scores[s] = (counts[bucket].scores[s] || 0) + 1;
  });

  const total = matches.length;

  return [0, 1, 2, 3, 4, 5, 6].map(g => {
    const data = counts[g];
    const topScores = Object.entries(data.scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([score, c]) => `${score} (${c}v)`);

    return {
      goalSum: g,
      label: g === 6 ? '6+ Gol' : `${g} ${g === 1 ? 'Gol' : 'Gol'}`,
      count: data.count,
      percentage: Math.round((data.count / total) * 1000) / 10,
      sampleScorelines: topScores,
    };
  });
}

/**
 * Calcola la distribuzione del numero di volte dei Calci d'Angolo (Totali e per Fasce)
 */
export function calculateCornerSumDistribution(matches: HistoricalMatch[]): {
  byBracket: CornerSumFrequency[];
  exactFrequencies: { corners: number; count: number; pct: number }[];
  totalCornersAverage: number;
  matchesWithCornersCount: number;
} {
  const matchesWithCorners = matches.filter(m => m.hc !== null && m.ac !== null);
  if (matchesWithCorners.length === 0) {
    return {
      byBracket: [],
      exactFrequencies: [],
      totalCornersAverage: 0,
      matchesWithCornersCount: 0,
    };
  }

  const exactCounts: { [corners: number]: number } = {};
  let totalSum = 0;

  const brackets = [
    { key: '0-6', label: '0-6 Corner (Bassa frequenza)', min: 0, max: 6, count: 0 },
    { key: '7-8', label: '7-8 Corner', min: 7, max: 8, count: 0 },
    { key: '9-10', label: '9-10 Corner (Fascia Media)', min: 9, max: 10, count: 0 },
    { key: '11-12', label: '11-12 Corner', min: 11, max: 12, count: 0 },
    { key: '13+', label: '13+ Corner (Fascia Alta)', min: 13, max: 99, count: 0 },
  ];

  matchesWithCorners.forEach(m => {
    const tot = (m.hc || 0) + (m.ac || 0);
    totalSum += tot;
    exactCounts[tot] = (exactCounts[tot] || 0) + 1;

    for (const b of brackets) {
      if (tot >= b.min && tot <= b.max) {
        b.count++;
        break;
      }
    }
  });

  const totCount = matchesWithCorners.length;

  const byBracket: CornerSumFrequency[] = brackets.map(b => ({
    bracketKey: b.key,
    bracketLabel: b.label,
    minCorners: b.min,
    maxCorners: b.max,
    count: b.count,
    percentage: Math.round((b.count / totCount) * 1000) / 10,
  }));

  const exactFrequencies = Object.entries(exactCounts)
    .map(([c, count]) => ({
      corners: Number(c),
      count,
      pct: Math.round((count / totCount) * 1000) / 10,
    }))
    .sort((a, b) => a.corners - b.corners);

  return {
    byBracket,
    exactFrequencies,
    totalCornersAverage: Math.round((totalSum / totCount) * 10) / 10,
    matchesWithCornersCount: totCount,
  };
}

