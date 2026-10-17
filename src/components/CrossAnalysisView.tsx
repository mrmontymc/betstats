import React, { useState, useMemo, useEffect } from 'react';
import {
  GitCompare,
  TrendingUp,
  Shield,
  Target,
  Activity,
  Flame,
  Percent,
  Cpu,
  BarChart2,
  CheckCircle2,
  AlertCircle,
  CornerDownRight,
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  BookmarkPlus,
  Scale,
  ArrowRight,
  Calculator,
  Compass,
  Coins,
} from 'lucide-react';
import {
  SisalMatch,
  HistoricalMatch,
  OddsClusterResult,
  MonteCarloSimulationResult,
  ModelComparisonResult,
  SavedPrediction,
} from '../types';
import {
  calculateTeamSummaries,
  findHistoricalOddsCluster,
  runMonteCarloSimulation,
  getMatch1X2SingleOddsStats,
} from '../utils/statsCalculator';
import { compareAdvancedModels } from '../utils/advancedModels';

interface CrossAnalysisViewProps {
  sisalMatches: SisalMatch[];
  historicalMatches: HistoricalMatch[];
  initialSelectedMatch?: SisalMatch | null;
  onSavePrediction?: (prediction: Omit<SavedPrediction, 'id' | 'createdAt'>) => void;
  onSendToMasaniello?: (odds: number, eventName: string) => void;
}

export const CrossAnalysisView: React.FC<CrossAnalysisViewProps> = ({
  sisalMatches,
  historicalMatches,
  initialSelectedMatch,
  onSavePrediction,
  onSendToMasaniello,
}) => {
  const [selectedMatchId, setSelectedMatchId] = useState<string>(
    initialSelectedMatch?.id || sisalMatches[0]?.id || ''
  );

  // Sincronizza immediatamente il match quando l'utente clicca "Insight" su una partita nel palinsesto
  useEffect(() => {
    if (initialSelectedMatch?.id) {
      setSelectedMatchId(initialSelectedMatch.id);
    }
  }, [initialSelectedMatch?.id]);

  // Impostazioni Tolleranza Quote
  const [tolerance, setTolerance] = useState<number>(0.05);
  const [clusterCriteria, setClusterCriteria] = useState<'1X2' | '12' | '1X'>('1X2');

  // Impostazioni Simulazione Monte Carlo ad alte prestazioni
  const [numSimulations, setNumSimulations] = useState<number>(2500);
  const [mcActiveTab, setMcActiveTab] = useState<'overview' | 'scores' | 'corners' | 'value'>('overview');

  // Feedback salvataggio pronostico
  const [savedSuccessKey, setSavedSuccessKey] = useState<string | null>(null);

  const selectedMatch = useMemo(() => {
    return sisalMatches.find(m => m.id === selectedMatchId) || sisalMatches[0];
  }, [sisalMatches, selectedMatchId]);

  // Calcolo statistiche di squadra
  const teamSummaries = useMemo(() => {
    return calculateTeamSummaries(historicalMatches);
  }, [historicalMatches]);

  const homeStats = useMemo(() => {
    if (!selectedMatch) return null;
    return teamSummaries[selectedMatch.squadra1] || null;
  }, [selectedMatch, teamSummaries]);

  const awayStats = useMemo(() => {
    if (!selectedMatch) return null;
    return teamSummaries[selectedMatch.squadra2] || null;
  }, [selectedMatch, teamSummaries]);

  // 1. Cluster di quote storiche con tolleranza (default 0.10)
  const oddsCluster: OddsClusterResult | null = useMemo(() => {
    if (!selectedMatch) return null;
    return findHistoricalOddsCluster(
      historicalMatches,
      {
        q1: selectedMatch.q1,
        qX: selectedMatch.qX,
        q2: selectedMatch.q2,
      },
      tolerance,
      clusterCriteria
    );
  }, [historicalMatches, selectedMatch, tolerance, clusterCriteria]);

  // Analisi quote singole Bet365 1, X, 2 (Tolleranza 0.05) per trasparenza e coerenza col palinsesto
  const singleOddsBreakdown = useMemo(() => {
    if (!selectedMatch) return null;
    return getMatch1X2SingleOddsStats(selectedMatch, historicalMatches, 0.05);
  }, [selectedMatch, historicalMatches]);

  // 2. Modelli Avanzati: Dixon-Coles vs Poisson Bivariata
  const advancedModels: ModelComparisonResult | null = useMemo(() => {
    if (!selectedMatch) return null;
    return compareAdvancedModels(selectedMatch, homeStats, awayStats);
  }, [selectedMatch, homeStats, awayStats]);

  // 3. Simulazione Monte Carlo
  const monteCarloResult: MonteCarloSimulationResult | null = useMemo(() => {
    if (!selectedMatch) return null;
    return runMonteCarloSimulation(selectedMatch, homeStats, awayStats, numSimulations);
  }, [selectedMatch, homeStats, awayStats, numSimulations]);

  // Probabilità implicite dalle quote Sisal
  const sisalImplied = useMemo(() => {
    if (!selectedMatch || !selectedMatch.q1 || !selectedMatch.qX || !selectedMatch.q2) {
      return null;
    }
    const q1 = selectedMatch.q1;
    const qX = selectedMatch.qX;
    const q2 = selectedMatch.q2;
    const sum = (1 / q1) + (1 / qX) + (1 / q2);

    return {
      prob1: Math.round(((1 / q1) / sum) * 100),
      probX: Math.round(((1 / qX) / sum) * 100),
      prob2: Math.round(((1 / q2) / sum) * 100),
      payout: Math.round((100 / sum) * 10) / 10,
    };
  }, [selectedMatch]);

  // Precedenti H2H nel DB statistico
  const h2hMatches = useMemo(() => {
    if (!selectedMatch) return [];
    const t1 = selectedMatch.squadra1.toLowerCase();
    const t2 = selectedMatch.squadra2.toLowerCase();
    return historicalMatches.filter(m => {
      const h = m.homeTeam.toLowerCase();
      const a = m.awayTeam.toLowerCase();
      return (
        (h.includes(t1) || t1.includes(h)) && (a.includes(t2) || t2.includes(a)) ||
        (h.includes(t2) || t2.includes(h)) && (a.includes(t1) || t1.includes(a))
      );
    });
  }, [selectedMatch, historicalMatches]);

  // Handler per salvare un pronostico
  const handleSaveTip = (
    market: string,
    selection: string,
    odd: number,
    modelSource: SavedPrediction['modelSource'],
    prob: number,
    key: string,
    notes?: string
  ) => {
    if (!onSavePrediction || !selectedMatch) return;
    onSavePrediction({
      matchDate: selectedMatch.dataHeader,
      matchTime: selectedMatch.ora,
      homeTeam: selectedMatch.squadra1,
      awayTeam: selectedMatch.squadra2,
      league: selectedMatch.manif,
      market,
      selection,
      odd,
      modelSource,
      estimatedProbPct: prob,
      status: 'pending',
      stake: 1,
      notes: notes || `Generato da ${modelSource} (Stima prob: ${prob}%, Quota: ${odd.toFixed(2)})`,
    });
    setSavedSuccessKey(key);
    setTimeout(() => setSavedSuccessKey(null), 2500);
  };

  if (!selectedMatch) {
    return (
      <div className="p-12 text-center text-slate-400">
        Nessuna partita disponibile per l'incrocio. Carica un palinsesto Sisal.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intestazione e Selettore Match */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              <span>Incrocio Match Insight, Dixon-Coles & Simulazione</span>
            </h2>
            <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              Tolleranza Quote ±{tolerance.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Verifica nel database gli esiti reali su base quote, confronta <strong>Dixon-Coles</strong> e <strong>Poisson Bivariata</strong> per rimuovere le distorsioni sui pareggi, ed esegui la simulazione Monte Carlo.
          </p>
        </div>

        {/* Selettore Partita Sisal */}
        <div className="w-full md:w-84">
          <label className="block text-[11px] font-medium text-slate-300 mb-1">
            Seleziona Incontro dal Palinsesto Sisal:
          </label>
          <select
            value={selectedMatchId}
            onChange={e => setSelectedMatchId(e.target.value)}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {sisalMatches.map(m => (
              <option key={m.id} value={m.id}>
                {m.ora} | {m.manif} - {m.squadra1} vs {m.squadra2} (1: {m.q1?.toFixed(2)} X: {m.qX?.toFixed(2)} 2: {m.q2?.toFixed(2)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Box Principale Partita & Quote Sisal */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">
              {selectedMatch.manif}
            </span>
            <span className="text-slate-300 font-medium">{selectedMatch.dataHeader} · ore {selectedMatch.ora}</span>
          </div>
          <span className="text-slate-500 font-mono text-[11px]">
            Palinsesto {selectedMatch.pal} · Avvenimento {selectedMatch.avv}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Squadra Casa */}
          <div className="text-left md:text-right">
            <h3 className="text-lg font-bold text-white">{selectedMatch.squadra1}</h3>
            <span className="text-xs text-slate-400 block mt-0.5">Casa (Quota 1)</span>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono">
              <span className={`text-base font-bold ${selectedMatch.favorite === '1' ? 'text-emerald-400' : 'text-white'}`}>
                {selectedMatch.q1 ? selectedMatch.q1.toFixed(2) : '-'}
              </span>
              {sisalImplied && (
                <span className="text-[11px] text-slate-400 font-sans">({sisalImplied.prob1}%)</span>
              )}
            </div>
          </div>

          {/* Pareggio */}
          <div className="text-center p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
            <div className="text-xs text-slate-400 font-medium mb-1">Pareggio (X)</div>
            <div className="text-base font-bold text-white font-mono">
              {selectedMatch.qX ? selectedMatch.qX.toFixed(2) : '-'}
            </div>
            {sisalImplied && (
              <div className="text-[10px] text-slate-400 font-mono mt-1">
                Prob. Implicita: {sisalImplied.probX}% · Payout: {sisalImplied.payout}%
              </div>
            )}
          </div>

          {/* Squadra Ospite */}
          <div className="text-left">
            <h3 className="text-lg font-bold text-white">{selectedMatch.squadra2}</h3>
            <span className="text-xs text-slate-400 block mt-0.5">Ospite (Quota 2)</span>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono">
              <span className={`text-base font-bold ${selectedMatch.favorite === '2' ? 'text-emerald-400' : 'text-white'}`}>
                {selectedMatch.q2 ? selectedMatch.q2.toFixed(2) : '-'}
              </span>
              {sisalImplied && (
                <span className="text-[11px] text-slate-400 font-sans">({sisalImplied.prob2}%)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SEZIONE SPECIALE: SEGNALAZIONI ATTIVE DAL PALINSESTO & VERIFICA COERENZA STATISTICA */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Segnalazioni Attive dal Palinsesto & Scheda di Coerenza Statistica
                {singleOddsBreakdown?.highWinRateAlert && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Win Rate ≥ 66% Rilevato
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Verifica diretta dei parametri evidenziati nel palinsesto: confronto quote Bet365 storiche e tolleranza 0.05
              </p>
            </div>
          </div>

          {onSendToMasaniello && singleOddsBreakdown?.highWinRateAlert && (
            <button
              onClick={() => {
                const alert = singleOddsBreakdown.highWinRateAlert!;
                onSendToMasaniello(
                  alert.odd,
                  `${selectedMatch.squadra1} - ${selectedMatch.squadra2} (${alert.outcomeLabel} @ ${alert.odd.toFixed(2)})`
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Invia a Masaniello</span>
            </button>
          )}
        </div>

        {/* Box evidenza se c'è un Win Rate >= 66% */}
        {singleOddsBreakdown?.highWinRateAlert ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Segnalazione Palinsesto: {singleOddsBreakdown.highWinRateAlert.outcomeLabel} con Win Rate {singleOddsBreakdown.highWinRateAlert.winRatePct}% (Tolleranza ±0.05)
              </span>
              <span className="text-[11px] font-mono text-slate-300">
                {singleOddsBreakdown.highWinRateAlert.winsCount} vittorie su {singleOddsBreakdown.highWinRateAlert.matchesCount} match nel database
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Nel dataset storico delle quote Bet365, su <strong>{singleOddsBreakdown.highWinRateAlert.matchesCount} incontri</strong> con quota compresa tra {(singleOddsBreakdown.highWinRateAlert.odd - 0.05).toFixed(2)} e {(singleOddsBreakdown.highWinRateAlert.odd + 0.05).toFixed(2)}, ben <strong>{singleOddsBreakdown.highWinRateAlert.winsCount}</strong> si sono conclusi con esito <strong>{singleOddsBreakdown.highWinRateAlert.outcomeLabel}</strong> (Win Rate: <strong className="text-amber-300">{singleOddsBreakdown.highWinRateAlert.winRatePct}%</strong>).
            </p>
          </div>
        ) : (
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-slate-500" />
            <span>Nessun esito 1X2 per questa partita supera la soglia di allerta del 66% a tolleranza 0.05 nel DB storico.</span>
          </div>
        )}

        {/* Tabella Comparativa Quote Singole 1, X, 2 (Tolleranza 0.05) */}
        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] font-sans">
                <th className="py-2.5 px-3">Esito 1X2</th>
                <th className="py-2.5 px-3 text-center">Quota Sisal</th>
                <th className="py-2.5 px-3 text-center">Range Bet365 (±0.05)</th>
                <th className="py-2.5 px-3 text-center">Match Storici</th>
                <th className="py-2.5 px-3 text-center">Esiti Vincenti</th>
                <th className="py-2.5 px-3 text-center">Win Rate Reale</th>
                <th className="py-2.5 px-3 text-center">Stato Palinsesto</th>
                <th className="py-2.5 px-3 text-right font-sans">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {[singleOddsBreakdown?.stat1, singleOddsBreakdown?.statX, singleOddsBreakdown?.stat2].map((stat, idx) => {
                if (!stat) return null;
                const isHighlight = stat.isHighWinRate;

                return (
                  <tr key={idx} className={isHighlight ? 'bg-amber-500/10' : 'hover:bg-slate-800/30'}>
                    <td className="py-2.5 px-3 font-sans font-semibold text-white flex items-center gap-1.5">
                      {isHighlight && <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      <span>{stat.outcomeLabel}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-white">
                      {stat.odd.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-400">
                      [{(stat.odd - 0.05).toFixed(2)} - {(stat.odd + 0.05).toFixed(2)}]
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-300">
                      {stat.matchesCount} partite
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-300">
                      {stat.winsCount} vincenti
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        stat.winRatePct >= 66
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : stat.winRatePct >= 50
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                      }`}>
                        {stat.winRatePct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isHighlight ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Segnalato (≥66%)
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">Standard</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        <button
                          onClick={() =>
                            handleSaveTip(
                              'Esito Finale 1X2',
                              stat.outcome,
                              stat.odd,
                              'Dixon-Coles',
                              stat.winRatePct,
                              `single_1x2_${stat.outcome}`
                            )
                          }
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-600 text-white text-[11px] cursor-pointer"
                        >
                          {savedSuccessKey === `single_1x2_${stat.outcome}` ? 'Salvato!' : 'Salva'}
                        </button>
                        {onSendToMasaniello && (
                          <button
                            onClick={() =>
                              onSendToMasaniello(
                                stat.odd,
                                `${selectedMatch.squadra1} - ${selectedMatch.squadra2} (${stat.outcomeLabel})`
                              )
                            }
                            title="Invia quota al Masaniello"
                            className="p-1 rounded bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white cursor-pointer"
                          >
                            <Coins className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pattern ROI Segnalati dal Palinsesto */}
        {selectedMatch.matchedPatterns && selectedMatch.matchedPatterns.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-300 block mb-2">
              Pattern ROI Positivi Attivi dal Palinsesto:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {selectedMatch.matchedPatterns.map((pat, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-start justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-white">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{pat.targetMarket}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                        ROI +{pat.expectedRoi}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{pat.rationale}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SEZIONE 1: CONFRONTO PROBABILITÀ DIXON-COLES VS POISSON BIVARIATA */}
      {advancedModels && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Confronto Modelli Avanzati: Dixon-Coles (1997) vs Poisson Bivariata
                </h3>
                <p className="text-xs text-slate-400">
                  Modellazione della correlazione gol per correggere la sotto-stima dei pareggi e punteggi bassi
                </p>
              </div>
            </div>

            {/* Badge Modello Consigliato */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Modello Consigliato:</span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                {advancedModels.divergenceSummary.recommendedModel}
              </span>
            </div>
          </div>

          {/* Striscia Parametri Matematici */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 block font-sans">λ Casa (xG attesi)</span>
              <span className="text-white font-bold">{advancedModels.dixonColes.homeLambda}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-sans">λ Trasferta (xG attesi)</span>
              <span className="text-white font-bold">{advancedModels.dixonColes.awayLambda}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-sans">Dixon-Coles ρ (Bassi Punteggi)</span>
              <span className="text-emerald-400 font-bold">{advancedModels.dixonColes.rho}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-sans">Poisson Biv. λ₃ (Covarianza)</span>
              <span className="text-sky-400 font-bold">{advancedModels.bivariatePoisson.lambda3}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-sans">Correlazione Pearson r</span>
              <span className="text-amber-400 font-bold">{advancedModels.bivariatePoisson.correlation}</span>
            </div>
          </div>

          {/* Spiegazione Divergenza & Razionale */}
          <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Analisi di Divergenza tra Modelli: </strong>
              <span>{advancedModels.divergenceSummary.rationale}</span>
              <span className="text-slate-400 block mt-1 font-mono text-[11px]">
                Effetto Pareggi: Dixon-Coles ({advancedModels.divergenceSummary.drawDixonColesDiffPct > 0 ? '+' : ''}{advancedModels.divergenceSummary.drawDixonColesDiffPct}% vs Poisson puro) · Poisson Bivariata ({advancedModels.divergenceSummary.drawBivariateDiffPct > 0 ? '+' : ''}{advancedModels.divergenceSummary.drawBivariateDiffPct}% vs Poisson puro).
              </span>
            </div>
          </div>

          {/* TABELLA CONFRONTO AFFIANCATO */}
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] font-sans">
                  <th className="py-2.5 px-3">Mercato & Esito</th>
                  <th className="py-2.5 px-3 text-center">Poisson Standard</th>
                  <th className="py-2.5 px-3 text-center bg-emerald-950/20 text-emerald-300">
                    Dixon-Coles (1997)
                  </th>
                  <th className="py-2.5 px-3 text-center bg-sky-950/20 text-sky-300">
                    Poisson Bivariata
                  </th>
                  <th className="py-2.5 px-3 text-center">Quota Sisal</th>
                  <th className="py-2.5 px-3 text-right">Azione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {/* 1 */}
                <tr className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-sans font-semibold text-white">
                    Vittoria Casa (1)
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-400">
                    {advancedModels.poissonStandard.prob1}% (Q: {advancedModels.poissonStandard.fair1})
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-300 bg-emerald-950/10">
                    {advancedModels.dixonColes.prob1}% (Fair: {advancedModels.dixonColes.fairOdds1})
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-sky-300 bg-sky-950/10">
                    {advancedModels.bivariatePoisson.prob1}% (Fair: {advancedModels.bivariatePoisson.fairOdds1})
                  </td>
                  <td className="py-2.5 px-3 text-center text-white font-bold">
                    {selectedMatch.q1?.toFixed(2) || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() =>
                        handleSaveTip(
                          '1X2',
                          '1',
                          selectedMatch.q1 || advancedModels.dixonColes.fairOdds1,
                          'Dixon-Coles',
                          advancedModels.dixonColes.prob1,
                          'dc_1'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-600 text-white font-sans text-[11px] cursor-pointer"
                    >
                      {savedSuccessKey === 'dc_1' ? 'Salvato!' : 'Salva Prono'}
                    </button>
                  </td>
                </tr>

                {/* X */}
                <tr className="hover:bg-slate-800/20 bg-amber-950/5">
                  <td className="py-2.5 px-3 font-sans font-semibold text-white">
                    Pareggio (X)
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-400">
                    {advancedModels.poissonStandard.probX}% (Q: {advancedModels.poissonStandard.fairX})
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-300 bg-emerald-950/10">
                    {advancedModels.dixonColes.probX}% (Fair: {advancedModels.dixonColes.fairOddsX})
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-sky-300 bg-sky-950/10">
                    {advancedModels.bivariatePoisson.probX}% (Fair: {advancedModels.bivariatePoisson.fairOddsX})
                  </td>
                  <td className="py-2.5 px-3 text-center text-white font-bold">
                    {selectedMatch.qX?.toFixed(2) || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() =>
                        handleSaveTip(
                          '1X2',
                          'X',
                          selectedMatch.qX || advancedModels.dixonColes.fairOddsX,
                          'Dixon-Coles',
                          advancedModels.dixonColes.probX,
                          'dc_X'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-600 text-white font-sans text-[11px] cursor-pointer"
                    >
                      {savedSuccessKey === 'dc_X' ? 'Salvato!' : 'Salva Prono'}
                    </button>
                  </td>
                </tr>

                {/* 2 */}
                <tr className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-sans font-semibold text-white">
                    Vittoria Trasferta (2)
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-400">
                    {advancedModels.poissonStandard.prob2}% (Q: {advancedModels.poissonStandard.fair2})
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-300 bg-emerald-950/10">
                    {advancedModels.dixonColes.prob2}% (Fair: {advancedModels.dixonColes.fairOdds2})
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-sky-300 bg-sky-950/10">
                    {advancedModels.bivariatePoisson.prob2}% (Fair: {advancedModels.bivariatePoisson.fairOdds2})
                  </td>
                  <td className="py-2.5 px-3 text-center text-white font-bold">
                    {selectedMatch.q2?.toFixed(2) || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() =>
                        handleSaveTip(
                          '1X2',
                          '2',
                          selectedMatch.q2 || advancedModels.dixonColes.fairOdds2,
                          'Dixon-Coles',
                          advancedModels.dixonColes.prob2,
                          'dc_2'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-600 text-white font-sans text-[11px] cursor-pointer"
                    >
                      {savedSuccessKey === 'dc_2' ? 'Salvato!' : 'Salva Prono'}
                    </button>
                  </td>
                </tr>

                {/* Over 2.5 */}
                <tr className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-sans text-slate-300">
                    Over 2.5 Gol
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-400">
                    {advancedModels.poissonStandard.probOver25}%
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-300 bg-emerald-950/10">
                    {advancedModels.dixonColes.probOver25}%
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-sky-300 bg-sky-950/10">
                    {advancedModels.bivariatePoisson.probOver25}%
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-300">
                    {selectedMatch.qO25?.toFixed(2) || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() =>
                        handleSaveTip(
                          'Under/Over 2.5',
                          'Over 2.5',
                          selectedMatch.qO25 || 1.85,
                          'Dixon-Coles',
                          advancedModels.dixonColes.probOver25,
                          'dc_o25'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-600 text-white font-sans text-[11px] cursor-pointer"
                    >
                      {savedSuccessKey === 'dc_o25' ? 'Salvato!' : 'Salva Prono'}
                    </button>
                  </td>
                </tr>

                {/* Goal BTTS */}
                <tr className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-sans text-slate-300">
                    Goal (Entrambe a Segno)
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-400">
                    {advancedModels.poissonStandard.probBtts}%
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-300 bg-emerald-950/10">
                    {advancedModels.dixonColes.probBtts}%
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-sky-300 bg-sky-950/10">
                    {advancedModels.bivariatePoisson.probBtts}%
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-300">
                    {selectedMatch.qGoal?.toFixed(2) || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() =>
                        handleSaveTip(
                          'Goal/NoGoal',
                          'Goal',
                          selectedMatch.qGoal || 1.80,
                          'Poisson Bivariata',
                          advancedModels.bivariatePoisson.probBtts,
                          'bp_goal'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-600 text-white font-sans text-[11px] cursor-pointer"
                    >
                      {savedSuccessKey === 'bp_goal' ? 'Salvato!' : 'Salva Prono'}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Griglia Correzione Bassi Punteggi & Risultati Esatti Dixon-Coles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Box Correzione Funzione Tau (Dixon-Coles) */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-slate-400 font-sans block text-xs font-bold text-emerald-400">
                Correzione Punteggi Bassi (Funzione τ Dixon-Coles)
              </span>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Nel calcio i risultati 0-0 e 1-1 si verificano con frequenza superiore rispetto all'ipotesi di indipendenza.
                Dixon-Coles corregge con il fattore τ:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-sans block">Correzione 0-0</span>
                  <span className="text-emerald-400 font-bold">
                    {advancedModels.dixonColes.lowScoreCorrection.score00DiffPct > 0 ? '+' : ''}
                    {advancedModels.dixonColes.lowScoreCorrection.score00DiffPct}% vs Indip.
                  </span>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-sans block">Correzione 1-1</span>
                  <span className="text-emerald-400 font-bold">
                    {advancedModels.dixonColes.lowScoreCorrection.score11DiffPct > 0 ? '+' : ''}
                    {advancedModels.dixonColes.lowScoreCorrection.score11DiffPct}% vs Indip.
                  </span>
                </div>
              </div>
            </div>

            {/* Risultati Esatti Top Dixon-Coles */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-slate-400 font-sans block text-xs font-bold text-sky-400">
                Top Risultati Esatti (Dixon-Coles Ranking)
              </span>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {advancedModels.dixonColes.topScores.slice(0, 6).map((item, idx) => (
                  <div key={item.label} className="p-2 bg-slate-900 rounded border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 block">#{idx + 1}</span>
                    <span className="text-white font-bold text-sm block">{item.label}</span>
                    <span className="text-sky-400 text-[11px]">{(item.prob * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEZIONE 2: VERIFICA QUOTE NEL DATABASE CON TOLLERANZA MASSIMA 0.1 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Esiti Reali nel DB su Base Quote Simili (Tolleranza ≤ {tolerance.toFixed(2)})
              </h3>
              <p className="text-xs text-slate-400">
                Verifica empirica: come sono finite nella storia le partite con quote analoghe a questa
              </p>
            </div>
          </div>

          {/* Controlli Tolleranza */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="text-slate-400">Tolleranza:</span>
              <div className="flex bg-slate-950 rounded border border-slate-800 p-0.5">
                {[0.05, 0.1, 0.15, 0.2].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTolerance(t)}
                    className={`px-2 py-0.5 text-xs font-mono rounded cursor-pointer ${
                      tolerance === t ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ±{t.toFixed(2)}
                  </button>
                ))}
              </div>
            </div>

            <select
              value={clusterCriteria}
              onChange={e => setClusterCriteria(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs px-2 py-1 rounded cursor-pointer"
            >
              <option value="1X2">Match su 1, X e 2</option>
              <option value="12">Match su 1 e 2</option>
              <option value="1X">Match su 1 e X</option>
            </select>
          </div>
        </div>

        {oddsCluster && oddsCluster.totalMatches > 0 ? (
          <div className="space-y-4">
            {/* Header riepilogo match trovati */}
            <div className="text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  Trovate <strong className="text-white font-mono">{oddsCluster.totalMatches} partite storiche</strong> con
                  quote vicine a (1: {selectedMatch.q1?.toFixed(2)} · X: {selectedMatch.qX?.toFixed(2)} · 2: {selectedMatch.q2?.toFixed(2)})
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Media Gol Reale: <strong className="text-white font-mono">{oddsCluster.avgTotalGoals}</strong> ·
                Media Corner Reale: <strong className="text-emerald-400 font-mono">{oddsCluster.avgCornersTotal}</strong>
              </span>
            </div>

            {/* Griglia Esiti Reali 1X2 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-center">
                <span className="text-xs text-slate-400 block mb-1">Vittorie Casa Reali (1)</span>
                <div className="text-2xl font-bold text-emerald-400 font-mono">
                  {oddsCluster.homeWinRate}%
                </div>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  {oddsCluster.homeWinCount} su {oddsCluster.totalMatches} match
                </div>
                <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
                  {sisalImplied && (
                    <span>
                      Quota Sisal stimava: <strong>{sisalImplied.prob1}%</strong> (
                      {oddsCluster.homeWinRate > sisalImplied.prob1 ? (
                        <span className="text-emerald-400 font-bold">+{oddsCluster.homeWinRate - sisalImplied.prob1}% Edge</span>
                      ) : (
                        <span className="text-slate-500">{oddsCluster.homeWinRate - sisalImplied.prob1}%</span>
                      )}
                      )
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-center">
                <span className="text-xs text-slate-400 block mb-1">Pareggi Reali (X)</span>
                <div className="text-2xl font-bold text-amber-400 font-mono">
                  {oddsCluster.drawRate}%
                </div>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  {oddsCluster.drawCount} su {oddsCluster.totalMatches} match
                </div>
                <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
                  {sisalImplied && (
                    <span>
                      Quota Sisal stimava: <strong>{sisalImplied.probX}%</strong> (
                      {oddsCluster.drawRate > sisalImplied.probX ? (
                        <span className="text-emerald-400 font-bold">+{oddsCluster.drawRate - sisalImplied.probX}% Edge</span>
                      ) : (
                        <span className="text-slate-500">{oddsCluster.drawRate - sisalImplied.probX}%</span>
                      )}
                      )
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-center">
                <span className="text-xs text-slate-400 block mb-1">Vittorie Trasferta Reali (2)</span>
                <div className="text-2xl font-bold text-blue-400 font-mono">
                  {oddsCluster.awayWinRate}%
                </div>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  {oddsCluster.awayWinCount} su {oddsCluster.totalMatches} match
                </div>
                <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
                  {sisalImplied && (
                    <span>
                      Quota Sisal stimava: <strong>{sisalImplied.prob2}%</strong> (
                      {oddsCluster.awayWinRate > sisalImplied.prob2 ? (
                        <span className="text-emerald-400 font-bold">+{oddsCluster.awayWinRate - sisalImplied.prob2}% Edge</span>
                      ) : (
                        <span className="text-slate-500">{oddsCluster.awayWinRate - sisalImplied.prob2}%</span>
                      )}
                      )
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Statistiche Aggiuntive: Over/Under, Goal & CORNER */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 font-sans block">Frequenza Over 2.5</span>
                <span className="text-amber-400 font-bold text-sm">{oddsCluster.over25Rate}%</span>
                <span className="text-[10px] text-slate-500 block">Under 2.5: {oddsCluster.under25Rate}%</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 font-sans block">Frequenza Goal (BTTS)</span>
                <span className="text-emerald-400 font-bold text-sm">{oddsCluster.bttsRate}%</span>
                <span className="text-[10px] text-slate-500 block">No Goal: {oddsCluster.noGoalRate}%</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-sky-900/40">
                <span className="text-[10px] text-sky-400 font-sans block font-semibold flex items-center gap-1">
                  <CornerDownRight className="w-3 h-3 text-sky-400" />
                  Corner Totali Medi
                </span>
                <span className="text-sky-300 font-bold text-sm">{oddsCluster.avgCornersTotal}</span>
                <span className="text-[10px] text-slate-500 block">Casa: {oddsCluster.avgHomeCorners} · Osp: {oddsCluster.avgAwayCorners}</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-sky-900/40">
                <span className="text-[10px] text-sky-400 font-sans block font-semibold">Over Corner Reali</span>
                <span className="text-sky-300 font-bold text-sm">O8.5: {oddsCluster.cornersOver85Rate}%</span>
                <span className="text-[10px] text-slate-500 block">O9.5: {oddsCluster.cornersOver95Rate}% · O10.5: {oddsCluster.cornersOver105Rate}%</span>
              </div>
            </div>

            {/* Lista partite del cluster */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-xs font-semibold text-white block mb-2 font-sans">
                Partite storiche estratte con quote simili ({oddsCluster.matchedGames.length}):
              </span>
              <div className="max-h-48 overflow-y-auto space-y-1 text-[11px] font-mono divide-y divide-slate-800/50">
                {oddsCluster.matchedGames.slice(0, 15).map(m => (
                  <div key={m.id} className="py-1.5 flex items-center justify-between text-slate-300">
                    <div>
                      <span className="text-slate-500 mr-2">{m.date}</span>
                      <strong className="text-white">{m.homeTeam} vs {m.awayTeam}</strong>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">
                        Quote: ({m.b365H?.toFixed(2) || m.avgH?.toFixed(2)} - {m.b365D?.toFixed(2) || m.avgD?.toFixed(2)} - {m.b365A?.toFixed(2) || m.avgA?.toFixed(2)})
                      </span>
                      <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                        FT: {m.fthg}-{m.ftag} ({m.ftr})
                      </span>
                      <span className="text-sky-400 text-[10px]">
                        Corner: {(m.hc ?? 0) + (m.ac ?? 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-slate-500 text-xs">
            Nessuna partita trovata nel database con quota entro la tolleranza di ±{tolerance.toFixed(2)}. Prova ad aumentare la tolleranza a ±0.15 o ±0.20.
          </div>
        )}
      </div>

      {/* SEZIONE 3: STATISTICHE SQUADRE & CORNER (HOME VS AWAY) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Squadra 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-sm text-white">{selectedMatch.squadra1}</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {homeStats ? `${homeStats.matchesPlayed} match nel DB` : 'Dati DB non trovati'}
            </span>
          </div>

          {homeStats ? (
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 bg-slate-950 rounded">
                <span className="text-slate-400 font-sans">Media Gol Fatti / Subiti:</span>
                <span className="text-white font-bold">{homeStats.goalsScoredAvg} / {homeStats.goalsConcededAvg}</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-950 rounded">
                <span className="text-slate-400 font-sans">Tiri in Porta Medi:</span>
                <span className="text-white font-bold">{homeStats.shotsOnTargetAvg} (su {homeStats.shotsAvg})</span>
              </div>
              {/* Corner */}
              <div className="flex justify-between p-2 bg-slate-950 rounded border border-sky-900/30">
                <span className="text-sky-300 font-sans">Corner a Favore / Contro:</span>
                <span className="text-sky-400 font-bold">{homeStats.cornersForAvg} / {homeStats.cornersAgainstAvg}</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-950 rounded border border-sky-900/30">
                <span className="text-sky-300 font-sans">% Partite Over 9.5 Corner:</span>
                <span className="text-sky-400 font-bold">{homeStats.cornersOver95Rate}%</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-950 rounded">
                <span className="text-slate-400 font-sans">% Over 2.5 / BTTS:</span>
                <span className="text-amber-400 font-bold">{homeStats.over25Rate}% / {homeStats.bttsRate}%</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 p-4 bg-slate-950 rounded text-center">
              Statistiche storiche non disponibili per {selectedMatch.squadra1} nel file I1 attuale.
            </p>
          )}
        </div>

        {/* Squadra 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="font-bold text-sm text-white">{selectedMatch.squadra2}</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {awayStats ? `${awayStats.matchesPlayed} match nel DB` : 'Dati DB non trovati'}
            </span>
          </div>

          {awayStats ? (
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 bg-slate-950 rounded">
                <span className="text-slate-400 font-sans">Media Gol Fatti / Subiti:</span>
                <span className="text-white font-bold">{awayStats.goalsScoredAvg} / {awayStats.goalsConcededAvg}</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-950 rounded">
                <span className="text-slate-400 font-sans">Tiri in Porta Medi:</span>
                <span className="text-white font-bold">{awayStats.shotsOnTargetAvg} (su {awayStats.shotsAvg})</span>
              </div>
              {/* Corner */}
              <div className="flex justify-between p-2 bg-slate-950 rounded border border-sky-900/30">
                <span className="text-sky-300 font-sans">Corner a Favore / Contro:</span>
                <span className="text-sky-400 font-bold">{awayStats.cornersForAvg} / {awayStats.cornersAgainstAvg}</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-950 rounded border border-sky-900/30">
                <span className="text-sky-300 font-sans">% Partite Over 9.5 Corner:</span>
                <span className="text-sky-400 font-bold">{awayStats.cornersOver95Rate}%</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-950 rounded">
                <span className="text-slate-400 font-sans">% Over 2.5 / BTTS:</span>
                <span className="text-amber-400 font-bold">{awayStats.over25Rate}% / {awayStats.bttsRate}%</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 p-4 bg-slate-950 rounded text-center">
              Statistiche storiche non disponibili per {selectedMatch.squadra2} nel file I1 attuale.
            </p>
          )}
        </div>
      </div>

      {/* SEZIONE 4: SIMULATORE MONTE CARLO */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Simulatore Monte Carlo & Value Bet Detector</h3>
              <p className="text-xs text-slate-400">
                Genera scenari stocastici per stimare quote eque, probabilità e rilevare quote a valore positivo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="text-slate-400">Simulazioni:</span>
              <select
                value={numSimulations}
                onChange={e => setNumSimulations(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 text-purple-300 text-xs px-2 py-1 rounded cursor-pointer font-mono font-bold"
              >
                <option value={1000}>1.000 iterazioni</option>
                <option value={5000}>5.000 iterazioni</option>
                <option value={10000}>10.000 iterazioni</option>
              </select>
            </div>
          </div>
        </div>

        {monteCarloResult && (
          <div className="space-y-4">
            {/* Tabs interne Monte Carlo */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3 text-xs">
              <button
                onClick={() => setMcActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  mcActiveTab === 'overview'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Esiti 1X2 & Fair Odds
              </button>
              <button
                onClick={() => setMcActiveTab('scores')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  mcActiveTab === 'scores'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Risultati Esatti Simulati
              </button>
              <button
                onClick={() => setMcActiveTab('corners')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  mcActiveTab === 'corners'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Corner Monte Carlo
              </button>
              <button
                onClick={() => setMcActiveTab('value')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  mcActiveTab === 'value'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Value Bet Detector ({monteCarloResult.valueBets.filter(v => v.isValue).length})
              </button>
            </div>

            {/* TAB 1: Overview 1X2 e Fair Odds */}
            {mcActiveTab === 'overview' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1 */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-xs text-slate-400 block mb-1">Simulazione Vittoria Casa (1)</span>
                    <div className="text-2xl font-bold text-purple-400 font-mono">
                      {monteCarloResult.homeWinRate}%
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-1">
                      Fair Odd Calcolata: <strong className="text-white">{monteCarloResult.fairOdds1.toFixed(2)}</strong>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-800">
                      Quota Sisal Offerta: <strong className="text-slate-300">{selectedMatch.q1?.toFixed(2) || '-'}</strong>
                    </div>
                  </div>

                  {/* X */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-xs text-slate-400 block mb-1">Simulazione Pareggio (X)</span>
                    <div className="text-2xl font-bold text-amber-400 font-mono">
                      {monteCarloResult.drawRate}%
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-1">
                      Fair Odd Calcolata: <strong className="text-white">{monteCarloResult.fairOddsX.toFixed(2)}</strong>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
                      Quota Sisal Offerta: <strong className="text-slate-300">{selectedMatch.qX?.toFixed(2) || '-'}</strong>
                    </div>
                  </div>

                  {/* 2 */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-xs text-slate-400 block mb-1">Simulazione Vittoria Ospite (2)</span>
                    <div className="text-2xl font-bold text-blue-400 font-mono">
                      {monteCarloResult.awayWinRate}%
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-1">
                      Fair Odd Calcolata: <strong className="text-white">{monteCarloResult.fairOdds2.toFixed(2)}</strong>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
                      Quota Sisal Offerta: <strong className="text-slate-300">{selectedMatch.q2?.toFixed(2) || '-'}</strong>
                    </div>
                  </div>
                </div>

                {/* Stime Gol xG e Mercati derivati */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 font-sans block">Expected Goals xG</span>
                    <div className="text-white font-bold mt-0.5">
                      {monteCarloResult.homeExpectedGoals} vs {monteCarloResult.awayExpectedGoals}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 font-sans block">Simulato Over 2.5</span>
                    <div className="text-amber-400 font-bold mt-0.5">
                      {monteCarloResult.over25Rate}%
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 font-sans block">Simulato Goal (BTTS)</span>
                    <div className="text-emerald-400 font-bold mt-0.5">
                      {monteCarloResult.bttsRate}%
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 font-sans block">Simulato Over 3.5</span>
                    <div className="text-purple-400 font-bold mt-0.5">
                      {monteCarloResult.over35Rate}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Risultati Esatti Simulati */}
            {mcActiveTab === 'scores' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <span className="text-xs text-slate-300 block">
                  Distribuzione dei risultati esatti più frequenti estratti dalle {numSimulations.toLocaleString()} iterazioni:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {monteCarloResult.topScores.map((scoreItem, idx) => (
                    <div
                      key={scoreItem.score}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-1"
                    >
                      <span className="text-[10px] text-slate-500 block">#{idx + 1} Probabile</span>
                      <div className="text-lg font-bold text-white font-mono">{scoreItem.score}</div>
                      <div className="text-xs text-purple-400 font-mono font-semibold">{scoreItem.pct}%</div>
                      <div className="text-[10px] text-slate-500">Fair: {(100 / scoreItem.pct).toFixed(1)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Corner Monte Carlo */}
            {mcActiveTab === 'corners' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    <span className="text-slate-400 font-sans block text-[11px] mb-1">Corner Totali Stimati</span>
                    <div className="text-xl font-bold text-sky-400">{monteCarloResult.avgCornersTotal}</div>
                    <span className="text-[10px] text-slate-500 font-sans">Media a partita</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    <span className="text-slate-400 font-sans block text-[11px] mb-1">Simulazione Over 8.5</span>
                    <div className="text-xl font-bold text-emerald-400">{monteCarloResult.cornersOver85Rate}%</div>
                    <span className="text-[10px] text-slate-500 font-sans">Probabilità</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    <span className="text-slate-400 font-sans block text-[11px] mb-1">Simulazione Over 9.5</span>
                    <div className="text-xl font-bold text-amber-400">{monteCarloResult.cornersOver95Rate}%</div>
                    <span className="text-[10px] text-slate-500 font-sans">Probabilità</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    <span className="text-slate-400 font-sans block text-[11px] mb-1">Simulazione Over 10.5</span>
                    <div className="text-xl font-bold text-purple-400">{monteCarloResult.cornersOver105Rate}%</div>
                    <span className="text-[10px] text-slate-500 font-sans">Probabilità</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-400">
                  Stima corner per squadra: <strong className="text-white">{selectedMatch.squadra1}</strong> (~{monteCarloResult.avgCornersHome} corner) · <strong className="text-white">{selectedMatch.squadra2}</strong> (~{monteCarloResult.avgCornersAway} corner).
                </div>
              </div>
            )}

            {/* TAB 4: Value Bet Detector con salvataggio pronostico */}
            {mcActiveTab === 'value' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <span className="text-xs text-slate-300 block">
                  Confronto tra Quota Sisal e Fair Odds Monte Carlo (Edge positivo = Quota con valore):
                </span>
                <div className="overflow-x-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-sans text-[11px]">
                        <th className="py-2.5 px-3">Mercato</th>
                        <th className="py-2.5 px-3">Esito</th>
                        <th className="py-2.5 px-2 text-center">Quota Sisal</th>
                        <th className="py-2.5 px-2 text-center">Quota Fair</th>
                        <th className="py-2.5 px-2 text-center">Prob. Sisal</th>
                        <th className="py-2.5 px-2 text-center">Prob. MC</th>
                        <th className="py-2.5 px-3 text-center">Edge Stimato</th>
                        <th className="py-2.5 px-3 text-right">Azione</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {monteCarloResult.valueBets.map((vb, idx) => (
                        <tr key={idx} className={vb.isValue ? 'bg-emerald-950/20' : ''}>
                          <td className="py-2 px-3 font-sans text-slate-300">{vb.market}</td>
                          <td className="py-2 px-3 font-sans font-semibold text-white">{vb.selection}</td>
                          <td className="py-2 px-2 text-center font-bold text-white">{vb.sisalOdd.toFixed(2)}</td>
                          <td className="py-2 px-2 text-center text-slate-300">{vb.fairOdd.toFixed(2)}</td>
                          <td className="py-2 px-2 text-center text-slate-400">{vb.impliedProbPct}%</td>
                          <td className="py-2 px-2 text-center text-purple-300">{vb.simulatedProbPct}%</td>
                          <td className="py-2 px-3 text-center">
                            {vb.isValue ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-emerald-300 bg-emerald-500/20 font-bold border border-emerald-500/30">
                                +{vb.edgePct}% Value!
                              </span>
                            ) : (
                              <span className="text-slate-500">{vb.edgePct > 0 ? `+${vb.edgePct}%` : `${vb.edgePct}%`}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() =>
                                handleSaveTip(
                                  vb.market,
                                  vb.selection,
                                  vb.sisalOdd,
                                  'Monte Carlo',
                                  vb.simulatedProbPct,
                                  `mc_${idx}`,
                                  `Value Bet rilevata: Edge +${vb.edgePct}% vs Fair Odd ${vb.fairOdd.toFixed(2)}`
                                )
                              }
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-600 text-white font-sans text-[11px] cursor-pointer"
                            >
                              {savedSuccessKey === `mc_${idx}` ? 'Salvato!' : 'Salva Prono'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scontri diretti H2H */}
      {h2hMatches.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-white mb-2">Precedenti Scontri Diretti nel Database ({h2hMatches.length})</h4>
          <div className="divide-y divide-slate-800 text-xs font-mono">
            {h2hMatches.map(h => (
              <div key={h.id} className="py-2 flex items-center justify-between">
                <span className="text-slate-400">{h.date}</span>
                <span className="font-semibold text-white">{h.homeTeam} {h.fthg} - {h.ftag} {h.awayTeam}</span>
                <span className="text-slate-400 font-sans">
                  Corner: {(h.hc ?? 0) + (h.ac ?? 0)} ({h.hc ?? 0}-{h.ac ?? 0}) · HT: ({h.hthg}-{h.htag})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
