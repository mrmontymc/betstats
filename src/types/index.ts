export interface SisalMatch {
  id: string;
  dataHeader: string; // e.g. "domenica, 11 ottobre"
  ora: string; // e.g. "21.10"
  manif: string; // e.g. "BRA2", "ITA1", "EUCHL"
  pal: string; // e.g. "36411"
  avv: string; // e.g. "602"
  squadra1: string; // Casa
  squadra2: string; // Ospite
  q1: number | null;
  qX: number | null;
  q2: number | null;
  handicapVal: number | null; // e.g. 1, -1, 2, -2
  qH1: number | null;
  qHX: number | null;
  qH2: number | null;
  q1X: number | null;
  qX2: number | null;
  q12: number | null;
  qU15: number | null;
  qO15: number | null;
  qU25: number | null;
  qO25: number | null;
  qU35: number | null;
  qO35: number | null;
  qGoal: number | null;
  qNoGoal: number | null;
  qSegnaCasaSi: number | null;
  qSegnaCasaNo: number | null;
  qSegnaOspiteSi: number | null;
  qSegnaOspiteNo: number | null;

  // Calcoli derivati
  bookmakerMargin: number | null; // Margine della lavagna Sisal su 1X2 (%)
  payoutPercent: number | null; // Payout teorico (%)
  favorite: '1' | 'X' | '2' | 'Equal' | null;
  favoriteOdds: number | null;

  // Pattern di rendimento ROI
  matchedPatterns?: {
    patternId: string;
    patternName: string;
    targetMarket: string;
    expectedRoi: number;
    rationale: string;
  }[];

  // Verifica esito 1X2 con Win Rate >= 66% (tolleranza quote 0.05)
  highWinRate1X2?: {
    outcome: '1' | 'X' | '2';
    outcomeLabel: string;
    odd: number;
    winRatePct: number;
    matchesCount: number;
    winsCount: number;
  } | null;

  // Rilevazione e isolamento quote impossibili (quota = 1.00 / errore di lettura file)
  hasImpossibleOdds?: boolean;
  impossibleOddsReason?: string;
  impossibleOddsFields?: string[];
}

export interface RoiPattern {
  id: string;
  name: string;
  category: 'Quote Pure' | 'Quote & Tiri' | 'Quote & Corner' | 'Equilibrio 1X2' | 'Over/Under';
  targetMarket: string;
  description: string;
  conditionsText: string;
  sampleSize: number;
  wins: number;
  losses: number;
  winRatePct: number;
  profitUnits: number;
  roiPct: number;
  isPositiveRoi: boolean;
  confidence: 'Alta' | 'Media' | 'Bassa';
}

export interface MultiFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  detectedType: 'sisal' | 'historical' | 'unknown';
  status: 'pending' | 'parsed' | 'error';
  parsedCount: number;
  errorMessage?: string;
  sisalMatches?: SisalMatch[];
  historicalMatches?: HistoricalMatch[];
}

export interface HistoricalMatch {
  id: string;
  div: string; // e.g. "I1"
  date: string; // DD/MM/YYYY
  time: string; // HH:MM
  homeTeam: string;
  awayTeam: string;
  fthg: number; // Full Time Home Goals
  ftag: number; // Full Time Away Goals
  ftr: 'H' | 'D' | 'A'; // Full Time Result
  hthg: number | null; // Half Time Home Goals
  htag: number | null; // Half Time Away Goals
  htr: 'H' | 'D' | 'A' | null; // Half Time Result
  hs: number | null; // Home Shots
  as: number | null; // Away Shots
  hst: number | null; // Home Shots on Target
  ast: number | null; // Away Shots on Target
  hf: number | null; // Home Fouls
  af: number | null; // Away Fouls
  hc: number | null; // Home Corners
  ac: number | null; // Away Corners
  hy: number | null; // Home Yellow Cards
  ay: number | null; // Away Yellow Cards
  hr: number | null; // Home Red Cards
  ar: number | null; // Away Red Cards

  // Principali quote Bookmaker da dataset (apertura & medie)
  b365H: number | null;
  b365D: number | null;
  b365A: number | null;
  avgH: number | null;
  avgD: number | null;
  avgA: number | null;
  maxH: number | null;
  maxD: number | null;
  maxA: number | null;
  b365Over25: number | null;
  b365Under25: number | null;
  avgOver25: number | null;
  avgUnder25: number | null;
  sourceFile?: string;
  // Rilevazione e isolamento quote impossibili (quota = 1.00 / errore di lettura file)
  hasImpossibleOdds?: boolean;
  impossibleOddsReason?: string;
  impossibleOddsFields?: string[];
}

export interface TeamStanding {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  homeWon: number;
  homeDrawn: number;
  homeLost: number;
  awayWon: number;
  awayDrawn: number;
  awayLost: number;
  form: ('W' | 'D' | 'L')[];
}

export interface TeamStatsSummary {
  team: string;
  matchesPlayed: number;
  homeMatches: number;
  awayMatches: number;
  goalsScoredAvg: number;
  goalsConcededAvg: number;
  shotsAvg: number;
  shotsOnTargetAvg: number;
  cornersAvg: number;
  cornersForAvg: number;
  cornersAgainstAvg: number;
  cornersOver85Rate: number;
  cornersOver95Rate: number;
  cornersOver105Rate: number;
  foulsAvg: number;
  over25Rate: number; // Percentuale esito Over 2.5
  bttsRate: number; // Percentuale Goal (Both Teams To Score)
  cleanSheetRate: number;
}

export interface OddsClusterResult {
  tolerance: number;
  criteria: '1X2' | '1X' | '12' | 'OverUnder' | 'Exact1X2';
  matchedGames: HistoricalMatch[];
  totalMatches: number;
  homeWinCount: number;
  drawCount: number;
  awayWinCount: number;
  homeWinRate: number;
  drawRate: number;
  awayWinRate: number;
  over15Rate: number;
  over25Rate: number;
  under25Rate: number;
  over35Rate: number;
  bttsRate: number;
  noGoalRate: number;
  avgHomeGoals: number;
  avgAwayGoals: number;
  avgTotalGoals: number;
  avgCornersTotal: number;
  avgHomeCorners: number;
  avgAwayCorners: number;
  cornersOver85Rate: number;
  cornersOver95Rate: number;
  cornersOver105Rate: number;
  topScorelines: { score: string; count: number; rate: number }[];
}

export interface MonteCarloSimulationResult {
  simulations: number;
  homeExpectedGoals: number;
  awayExpectedGoals: number;
  homeWinRate: number;
  drawRate: number;
  awayWinRate: number;
  fairOdds1: number;
  fairOddsX: number;
  fairOdds2: number;
  over15Rate: number;
  over25Rate: number;
  over35Rate: number;
  bttsRate: number;
  noGoalRate: number;
  avgCornersHome: number;
  avgCornersAway: number;
  avgCornersTotal: number;
  cornersOver85Rate: number;
  cornersOver95Rate: number;
  cornersOver105Rate: number;
  topScores: { score: string; homeGoals: number; awayGoals: number; count: number; pct: number }[];
  valueBets: {
    market: string;
    selection: string;
    sisalOdd: number;
    fairOdd: number;
    impliedProbPct: number;
    simulatedProbPct: number;
    edgePct: number;
    isValue: boolean;
  }[];
}

export interface SavedPrediction {
  id: string;
  createdAt: string;
  matchDate: string;
  matchTime: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  market: string; // es. "1X2", "Under/Over 2.5", "Goal/NoGoal", "Doppia Chance"
  selection: string; // es. "1", "X", "2", "Over 2.5", "Goal"
  odd: number;
  modelSource: 'Dixon-Coles' | 'Poisson Bivariata' | 'Monte Carlo' | 'Pattern ROI' | 'Cluster Quote' | 'Bet365 Win Rate' | 'Manuale';
  estimatedProbPct: number;
  status: 'pending' | 'won' | 'lost' | 'void';
  realScore?: string;
  stake: number;
  payout?: number;
  notes?: string;
}

export interface Bet365SingleOddStat {
  id: string;
  marketType: 'H' | 'D' | 'A' | 'Over25' | 'Under25';
  marketLabel: string;
  oddValue: number;
  sampleSize: number;
  wins: number;
  winRatePct: number;
  isHighlight: boolean; // >= 66%
  profitUnits: number;
  roiPct: number;
}

export interface Bet365PairOddStat {
  id: string;
  pairType: 'H_D' | 'H_A' | 'D_A';
  pairLabel: string;
  odd1: number;
  odd2: number;
  targetOutcome: 'H' | 'D' | 'A' | '1X' | 'X2' | '12';
  targetLabel: string;
  sampleSize: number;
  wins: number;
  winRatePct: number;
  isHighlight: boolean; // >= 66%
  profitUnits: number;
  roiPct: number;
}

export interface ScoreProbItem {
  home: number;
  away: number;
  prob: number;
  label: string;
  tauMultiplier?: number;
}

export interface DixonColesResult {
  homeLambda: number;
  awayLambda: number;
  rho: number;
  prob1: number;
  probX: number;
  prob2: number;
  fairOdds1: number;
  fairOddsX: number;
  fairOdds2: number;
  probOver15: number;
  probOver25: number;
  probOver35: number;
  probBtts: number;
  probNoGoal: number;
  topScores: ScoreProbItem[];
  lowScoreCorrection: {
    score00DiffPct: number;
    score11DiffPct: number;
    score10DiffPct: number;
    score01DiffPct: number;
  };
}

export interface BivariatePoissonResult {
  lambda1: number;
  lambda2: number;
  lambda3: number; // Covarianza / intensità comune di gol
  correlation: number;
  prob1: number;
  probX: number;
  prob2: number;
  fairOdds1: number;
  fairOddsX: number;
  fairOdds2: number;
  probOver15: number;
  probOver25: number;
  probOver35: number;
  probBtts: number;
  probNoGoal: number;
  topScores: ScoreProbItem[];
}

export interface ModelComparisonResult {
  poissonStandard: {
    prob1: number;
    probX: number;
    prob2: number;
    probOver25: number;
    probBtts: number;
    fair1: number;
    fairX: number;
    fair2: number;
  };
  dixonColes: DixonColesResult;
  bivariatePoisson: BivariatePoissonResult;
  sisalImplied: {
    prob1: number;
    probX: number;
    prob2: number;
    probOver25: number;
    probBtts: number;
    odd1: number;
    oddX: number;
    odd2: number;
    payout: number;
  } | null;
  divergenceSummary: {
    drawDixonColesDiffPct: number; // Differenza % stima pareggi Dixon-Coles vs Poisson standard
    drawBivariateDiffPct: number; // Differenza % stima pareggi Bivariata vs Poisson standard
    recommendedModel: 'Dixon-Coles' | 'Poisson Bivariata' | 'Consenso';
    rationale: string;
  };
}

export interface OddsRangeStat {
  id: string;
  marketType: '1' | 'X' | '2' | 'Over25' | 'Under25' | '1X' | 'X2' | '12';
  marketLabel: string;
  rangeMin: number;
  rangeMax: number;
  rangeLabel: string; // es. "1.50 - 1.79"
  sampleSize: number;
  wins: number;
  losses: number;
  winRatePct: number;
  totalStake: number;
  totalReturn: number;
  profitUnits: number;
  roiPct: number;
  avgOdd: number;
  evaluation: 'Ottimo Valore Atteso' | 'Profittevole' | 'Equilibrato' | 'Negativo' | 'Alto Rischio';
  isHighlight: boolean; // winRate >= 66% o roi > 5%
}

export interface GoalSumFrequency {
  goalSum: number; // 0, 1, 2, 3, 4, 5, 6
  label: string; // "0 Gol", "1 Gol", "2 Gol", ..., "6+ Gol"
  count: number;
  percentage: number;
  sampleScorelines: string[]; // es. ["1-1", "2-0", "0-2"]
}

export interface CornerSumFrequency {
  bracketKey: string;
  bracketLabel: string; // "0-6 Corner", "7-8 Corner", "9-10 Corner", "11-12 Corner", "13+ Corner"
  minCorners: number;
  maxCorners: number;
  count: number;
  percentage: number;
}

