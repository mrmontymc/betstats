/**
 * Motore Matematico Masaniello per Money Management nelle Scommesse Sportive
 * 
 * Il Masaniello (creato da Ciro Masaniello) ottimizza la progressione delle puntate
 * calcolando l'ammontare esatto (Stake) da scommettere su ogni singolo evento,
 * affinché - al conseguimento di K eventi vincenti su un totale di N eventi - 
 * la vincita finale garantita (utile netto) risulti costante e identica,
 * indipendentemente dall'ordine temporale in cui si verificano le vittorie e le sconfitte.
 * 
 * Parametro Chiave: "Win Rate di Riferimento" (es. 66%, 70%, 75%)
 * Consente di calcolare automaticamente il numero atteso di vincite K su N:
 * K = round(N * (WinRate / 100))
 */

export interface MasanielloConfig {
  bankroll: number; // Cassa Iniziale (es. 100 €)
  totalEvents: number; // N eventi totali nel ciclo (es. 6, 10, 15)
  referenceWinRate: number; // Win Rate di Riferimento in % (es. 66)
  expectedWins: number; // K vincite attese
  defaultOdds: number; // Quota di default (es. 1.80)
}

export type StepStatus = 'pending' | 'won' | 'lost';

export interface MasanielloStepItem {
  stepIndex: number; // 1 to N
  eventName: string; // Descrizione opzionale o match associato
  odds: number; // Quota per questo step (>= 1.05)
  stake: number; // Puntata calcolata in €
  stakePercent: number; // Puntata come % della cassa iniziale
  potentialWin: number; // Vincita potenziale lorda (stake * odds)
  potentialNet: number; // Utile potenziale netto (potentialWin - stake)
  status: StepStatus; // 'pending' | 'won' | 'lost'
  bankrollAfter?: number; // Cassa effettiva dopo la chiusura dello step
}

export interface MasanielloState {
  config: MasanielloConfig;
  steps: MasanielloStepItem[];
  currentStepIndex: number; // 1-based, primo step in attesa
  initialBankroll: number;
  currentBankroll: number;
  finalGuaranteedBankroll: number;
  guaranteedNetProfit: number;
  guaranteedRoiPct: number;
  expectedWins: number;
  totalEvents: number;
  referenceWinRate: number;
  winsCount: number;
  lossesCount: number;
  pendingCount: number;
  isCompleted: boolean;
  isSuccessful: boolean; // Obiettivo centrato (wins >= K)
  isFailed: boolean; // Obiettivo fallito (non è più possibile raggiungere K vincite)
  binomialProbSuccess: number; // Probabilità binomiale di vittoria globale in %
  expectedValue: number; // Valore atteso (EV) in €
}

/**
 * Coefficiente binomiale n su k: C(n, k)
 */
export function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let c = 1;
  const min = Math.min(k, n - k);
  for (let i = 1; i <= min; i++) {
    c = (c * (n - i + 1)) / i;
  }
  return c;
}

/**
 * Calcola la probabilità binomiale cumulativa di ottenere almeno K successi su N prove,
 * dato il Win Rate di riferimento p (es. 0.66).
 */
export function computeBinomialSuccessProb(n: number, k: number, winRatePct: number): number {
  if (k <= 0) return 100;
  if (k > n) return 0;
  const p = Math.max(0.01, Math.min(0.99, winRatePct / 100));
  let probCumulative = 0;

  for (let j = k; j <= n; j++) {
    const comb = combinations(n, j);
    const prob = comb * Math.pow(p, j) * Math.pow(1 - p, n - j);
    probCumulative += prob;
  }

  return Math.round(probCumulative * 1000) / 10;
}

/**
 * Risolve la tabella dei pesi con backward induction per quote dinamiche o costanti.
 * M[i][w] = capitale necessario allo step i per garantire 1 unità finale avendo bisogno di w vittorie.
 */
function buildWeightTable(oddsList: number[], totalEvents: number): number[][] {
  const M: number[][] = [];

  for (let i = 0; i < totalEvents; i++) {
    M[i] = [];
    const eventsLeft = totalEvents - i;
    for (let w = 0; w <= totalEvents; w++) {
      if (w === 0) {
        M[i][w] = 1;
      } else if (w > eventsLeft) {
        M[i][w] = 0;
      }
    }
  }

  // Risoluzione a ritroso
  for (let i = totalEvents - 1; i >= 0; i--) {
    const q = Math.max(1.05, oddsList[i] || 1.80);
    const eventsLeft = totalEvents - i;

    for (let w = 1; w <= eventsLeft; w++) {
      let nextLoss = 0;
      let nextWin = 0;

      if (i + 1 < totalEvents) {
        nextLoss = M[i + 1][w] || 0;
        nextWin = M[i + 1][w - 1] || (w === 1 ? 1 : 0);
      } else {
        // Ultimo step (i = totalEvents - 1)
        nextLoss = 0;
        nextWin = w === 1 ? 1 : 0;
      }

      M[i][w] = ((q - 1) * nextLoss + nextWin) / q;
    }
  }

  return M;
}

/**
 * Calcola lo stato completo e sincronizzato della progressione Masaniello
 */
export function calculateMasaniello(
  config: MasanielloConfig,
  currentSteps: MasanielloStepItem[]
): MasanielloState {
  const { bankroll, totalEvents, referenceWinRate, defaultOdds } = config;

  // Calcolo K atteso dal Win Rate di Riferimento se non specificato manualmente
  const autoK = Math.max(1, Math.min(totalEvents, Math.round(totalEvents * (referenceWinRate / 100))));
  const expectedWins = config.expectedWins > 0 && config.expectedWins <= totalEvents
    ? config.expectedWins
    : autoK;

  // Assicura che ci siano N step inizializzati
  const oddsList: number[] = [];
  const normalizedSteps: MasanielloStepItem[] = [];

  for (let i = 0; i < totalEvents; i++) {
    const existing = currentSteps[i];
    const odd = existing?.odds && existing.odds >= 1.05 ? existing.odds : defaultOdds;
    oddsList.push(odd);

    normalizedSteps.push({
      stepIndex: i + 1,
      eventName: existing?.eventName || `Evento ${i + 1}`,
      odds: odd,
      stake: 0,
      stakePercent: 0,
      potentialWin: 0,
      potentialNet: 0,
      status: existing?.status || 'pending',
      bankrollAfter: undefined,
    });
  }

  // Tabella pesi teorici a ritroso
  const M = buildWeightTable(oddsList, totalEvents);
  const initialWeight = M[0][expectedWins] || 1;
  const finalGuaranteedBankroll = initialWeight > 0 ? Math.round((bankroll / initialWeight) * 100) / 100 : bankroll;
  const guaranteedNetProfit = Math.round((finalGuaranteedBankroll - bankroll) * 100) / 100;
  const guaranteedRoiPct = bankroll > 0 ? Math.round(((finalGuaranteedBankroll - bankroll) / bankroll) * 1000) / 10 : 0;

  // Simulazione e tracciamento step per step con cassa dinamica
  let runningBankroll = bankroll;
  let winsCount = 0;
  let lossesCount = 0;
  let isTargetReached = false;
  let isTargetFailed = false;

  for (let i = 0; i < totalEvents; i++) {
    const step = normalizedSteps[i];
    const winsNeeded = expectedWins - winsCount;
    const eventsLeft = totalEvents - i;

    // Condizioni di chiusura precoce o stato
    if (winsCount >= expectedWins) {
      isTargetReached = true;
    } else if (winsNeeded > eventsLeft) {
      isTargetFailed = true;
    }

    if (isTargetReached || isTargetFailed) {
      step.stake = 0;
      step.stakePercent = 0;
      step.potentialWin = 0;
      step.potentialNet = 0;
      if (step.status !== 'pending') {
        step.bankrollAfter = Math.round(runningBankroll * 100) / 100;
      }
      continue;
    }

    // Calcolo Stake per lo step corrente
    const q = step.odds;
    let nextLoss = 0;
    let nextWin = 0;

    if (i + 1 < totalEvents) {
      nextLoss = M[i + 1][winsNeeded] || 0;
      nextWin = M[i + 1][winsNeeded - 1] || (winsNeeded === 1 ? 1 : 0);
    } else {
      nextLoss = 0;
      nextWin = winsNeeded === 1 ? 1 : 0;
    }

    // Puntata esatta Masaniello basata sul target garantito
    let calculatedStake = finalGuaranteedBankroll * ((nextWin - nextLoss) / q);

    // Salvaguardia cassa residua e arrotondamenti decimali
    calculatedStake = Math.max(0, Math.min(runningBankroll, calculatedStake));
    calculatedStake = Math.round(calculatedStake * 100) / 100;

    // Se è l'ultimo evento o cassa minima
    if (winsNeeded === eventsLeft && calculatedStake <= 0 && runningBankroll > 0) {
      calculatedStake = Math.round(runningBankroll * 100) / 100;
    }

    step.stake = calculatedStake;
    step.stakePercent = bankroll > 0 ? Math.round((calculatedStake / bankroll) * 1000) / 10 : 0;
    step.potentialWin = Math.round(calculatedStake * q * 100) / 100;
    step.potentialNet = Math.round((step.potentialWin - calculatedStake) * 100) / 100;

    // Applica l'esito reale se già giocato
    if (step.status === 'won') {
      winsCount++;
      runningBankroll = runningBankroll - calculatedStake + step.potentialWin;
      step.bankrollAfter = Math.round(runningBankroll * 100) / 100;
    } else if (step.status === 'lost') {
      lossesCount++;
      runningBankroll = runningBankroll - calculatedStake;
      step.bankrollAfter = Math.round(runningBankroll * 100) / 100;
    } else {
      // Step ancora in attesa: mantieni bankrollAfter corrente come anteprima
      step.bankrollAfter = Math.round(runningBankroll * 100) / 100;
    }
  }

  // Verifica finale obiettivi
  const finalWinsReached = winsCount >= expectedWins;
  const finalFailed = (expectedWins - winsCount) > (totalEvents - (winsCount + lossesCount));
  const isCompleted = finalWinsReached || finalFailed || (winsCount + lossesCount >= totalEvents);

  // Probabilità binomiale ed Expected Value
  const binomialProb = computeBinomialSuccessProb(totalEvents, expectedWins, referenceWinRate);
  const pDecimal = binomialProb / 100;
  // EV = (P * Vincita Netta) - ((1 - P) * Cassa Iniziale)
  const expectedValue = Math.round((pDecimal * guaranteedNetProfit - (1 - pDecimal) * bankroll) * 100) / 100;

  // Identifica primo step pending
  const firstPendingIdx = normalizedSteps.findIndex(s => s.status === 'pending');
  const currentStepIndex = firstPendingIdx !== -1 ? firstPendingIdx + 1 : totalEvents;

  return {
    config: {
      ...config,
      expectedWins,
    },
    steps: normalizedSteps,
    currentStepIndex,
    initialBankroll: bankroll,
    currentBankroll: Math.round(runningBankroll * 100) / 100,
    finalGuaranteedBankroll,
    guaranteedNetProfit,
    guaranteedRoiPct,
    expectedWins,
    totalEvents,
    referenceWinRate,
    winsCount,
    lossesCount,
    pendingCount: totalEvents - (winsCount + lossesCount),
    isCompleted,
    isSuccessful: finalWinsReached,
    isFailed: finalFailed,
    binomialProbSuccess: binomialProb,
    expectedValue,
  };
}

export interface MasanielloProgression {
  id: string;
  name: string;
  createdAt: string;
  config: MasanielloConfig;
  steps: MasanielloStepItem[];
  notes?: string;
}

/**
 * Crea una configurazione predefinita standard di Masaniello
 */
export function createDefaultMasanielloConfig(): MasanielloConfig {
  return {
    bankroll: 100,
    totalEvents: 10,
    referenceWinRate: 66, // 66% come da filtro e modello palinsesto
    expectedWins: 7, // round(10 * 0.66) = 7
    defaultOdds: 1.80,
  };
}

/**
 * Crea una nuova progressione Masaniello completa con ID univoco e step inizializzati
 */
export function createNewProgression(
  name?: string,
  customConfig?: Partial<MasanielloConfig>
): MasanielloProgression {
  const config = { ...createDefaultMasanielloConfig(), ...(customConfig || {}) };
  // Ricalcola K atteso dal Win Rate
  config.expectedWins = Math.max(1, Math.min(config.totalEvents, Math.round(config.totalEvents * (config.referenceWinRate / 100))));

  const steps: MasanielloStepItem[] = Array.from({ length: config.totalEvents }, (_, i) => ({
    stepIndex: i + 1,
    eventName: `Evento ${i + 1}`,
    odds: Math.max(1.05, config.defaultOdds),
    stake: 0,
    stakePercent: 0,
    potentialWin: 0,
    potentialNet: 0,
    status: 'pending' as StepStatus,
  }));

  return {
    id: `mas_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name || `Progressione ${new Date().toLocaleDateString('it-IT')}`,
    createdAt: new Date().toISOString(),
    config,
    steps,
  };
}

/**
 * Azzera completamente il ciclo di una progressione Masaniello.
 * Se clearMatches è true (default), azzera TUTTO, comprese le partite caricate e le quote modificate,
 * ripristinando "Evento 1..N" e la quota di default.
 */
export function resetProgressionCycle(
  progression: MasanielloProgression,
  clearMatches = true
): MasanielloProgression {
  const defaultOdds = Math.max(1.05, progression.config.defaultOdds || 1.80);
  const newSteps: MasanielloStepItem[] = Array.from({ length: progression.config.totalEvents }, (_, i) => {
    const prev = progression.steps[i];
    return {
      stepIndex: i + 1,
      eventName: clearMatches ? `Evento ${i + 1}` : (prev?.eventName || `Evento ${i + 1}`),
      odds: clearMatches ? defaultOdds : Math.max(1.05, prev?.odds || defaultOdds),
      stake: 0,
      stakePercent: 0,
      potentialWin: 0,
      potentialNet: 0,
      status: 'pending' as StepStatus,
      bankrollAfter: undefined,
    };
  });

  return {
    ...progression,
    steps: newSteps,
  };
}

