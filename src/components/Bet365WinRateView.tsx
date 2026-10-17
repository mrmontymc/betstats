import React, { useState, useMemo } from 'react';
import {
  Award,
  Filter,
  Flame,
  Search,
  Sparkles,
  TrendingUp,
  SlidersHorizontal,
  BookmarkPlus,
  CheckCircle2,
  Layers,
  ArrowUpDown,
  Percent,
  Scale,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { Bet365PairOddStat, Bet365SingleOddStat, HistoricalMatch, OddsRangeStat, SavedPrediction } from '../types';
import {
  analyzeBet365SingleOdds,
  analyzeBet365PairOdds,
  analyzeBet365ProfitableRanges,
} from '../utils/bet365Analysis';

interface Bet365WinRateViewProps {
  matches: HistoricalMatch[];
  onSavePrediction?: (prediction: Omit<SavedPrediction, 'id' | 'createdAt'>) => void;
}

export const Bet365WinRateView: React.FC<Bet365WinRateViewProps> = ({
  matches,
  onSavePrediction,
}) => {
  const [viewType, setViewType] = useState<'single' | 'pairs' | 'ranges'>('single');
  const [onlyHighWinRate, setOnlyHighWinRate] = useState<boolean>(true); // default true per evidenziare >= 66%
  const [minSampleSize, setMinSampleSize] = useState<number>(2);
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'winRate' | 'sampleSize' | 'odd' | 'roi'>('winRate');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  // Filtro valutazione per la sezione range
  const [rangeEvalFilter, setRangeEvalFilter] = useState<'all' | 'profitable' | 'greatValue'>('all');

  // Calcolo quote singole
  const singleOddsStats = useMemo(() => {
    return analyzeBet365SingleOdds(matches, minSampleSize);
  }, [matches, minSampleSize]);

  // Calcolo coppie ordinate
  const pairOddsStats = useMemo(() => {
    return analyzeBet365PairOdds(matches, minSampleSize);
  }, [matches, minSampleSize]);

  // Calcolo range profittevoli in tutti i mercati
  const rangeOddsStats = useMemo(() => {
    return analyzeBet365ProfitableRanges(matches, minSampleSize);
  }, [matches, minSampleSize]);

  // Filtraggio e ordinamento quote singole
  const filteredSingleOdds = useMemo(() => {
    return singleOddsStats
      .filter(item => {
        if (onlyHighWinRate && item.winRatePct < 66.0) return false;
        if (marketFilter !== 'all' && item.marketType !== marketFilter) return false;
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          const matchLabel = item.marketLabel.toLowerCase().includes(q);
          const matchOdd = item.oddValue.toFixed(2).includes(q);
          if (!matchLabel && !matchOdd) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortBy === 'winRate') comp = a.winRatePct - b.winRatePct;
        else if (sortBy === 'sampleSize') comp = a.sampleSize - b.sampleSize;
        else if (sortBy === 'odd') comp = a.oddValue - b.oddValue;
        else if (sortBy === 'roi') comp = a.roiPct - b.roiPct;
        return sortOrder === 'desc' ? -comp : comp;
      });
  }, [singleOddsStats, onlyHighWinRate, marketFilter, searchTerm, sortBy, sortOrder]);

  // Filtraggio e ordinamento coppie ordinate
  const filteredPairOdds = useMemo(() => {
    return pairOddsStats
      .filter(item => {
        if (onlyHighWinRate && item.winRatePct < 66.0) return false;
        if (marketFilter !== 'all' && item.pairType !== marketFilter) return false;
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          const matchLabel = item.pairLabel.toLowerCase().includes(q);
          const matchTarget = item.targetLabel.toLowerCase().includes(q);
          const matchOdd1 = item.odd1.toFixed(2).includes(q);
          const matchOdd2 = item.odd2.toFixed(2).includes(q);
          if (!matchLabel && !matchTarget && !matchOdd1 && !matchOdd2) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortBy === 'winRate') comp = a.winRatePct - b.winRatePct;
        else if (sortBy === 'sampleSize') comp = a.sampleSize - b.sampleSize;
        else if (sortBy === 'odd') comp = a.odd1 - b.odd1;
        else if (sortBy === 'roi') comp = a.roiPct - b.roiPct;
        return sortOrder === 'desc' ? -comp : comp;
      });
  }, [pairOddsStats, onlyHighWinRate, marketFilter, searchTerm, sortBy, sortOrder]);

  // Filtraggio e ordinamento range profittevoli
  const filteredRangeOdds = useMemo(() => {
    return rangeOddsStats
      .filter(item => {
        if (marketFilter !== 'all' && item.marketType !== marketFilter) return false;
        if (rangeEvalFilter === 'profitable' && item.roiPct <= 0) return false;
        if (rangeEvalFilter === 'greatValue' && item.evaluation !== 'Ottimo Valore Atteso') return false;
        if (onlyHighWinRate && item.winRatePct < 66.0 && item.roiPct <= 0) return false;
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          const matchLabel = item.marketLabel.toLowerCase().includes(q);
          const matchRange = item.rangeLabel.toLowerCase().includes(q);
          if (!matchLabel && !matchRange) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortBy === 'roi') comp = a.roiPct - b.roiPct;
        else if (sortBy === 'winRate') comp = a.winRatePct - b.winRatePct;
        else if (sortBy === 'sampleSize') comp = a.sampleSize - b.sampleSize;
        else if (sortBy === 'odd') comp = a.avgOdd - b.avgOdd;
        return sortOrder === 'desc' ? -comp : comp;
      });
  }, [rangeOddsStats, marketFilter, rangeEvalFilter, onlyHighWinRate, searchTerm, sortBy, sortOrder]);

  // KPI di sintesi
  const summaryKpis = useMemo(() => {
    const totalSingle = singleOddsStats.length;
    const highlightSingle = singleOddsStats.filter(s => s.isHighlight).length;
    const totalPairs = pairOddsStats.length;
    const highlightPairs = pairOddsStats.filter(p => p.isHighlight).length;
    const totalRanges = rangeOddsStats.length;
    const profitableRanges = rangeOddsStats.filter(r => r.roiPct > 0).length;

    let currentList: any[] = [];
    if (viewType === 'single') currentList = filteredSingleOdds;
    else if (viewType === 'pairs') currentList = filteredPairOdds;
    else currentList = filteredRangeOdds;

    const totalTested = currentList.reduce((acc, curr) => acc + curr.sampleSize, 0);
    const totalWins = currentList.reduce((acc, curr) => acc + curr.wins, 0);
    const avgWinRate = totalTested > 0 ? Math.round((totalWins / totalTested) * 1000) / 10 : 0;
    const totalUnitsProfit = currentList.reduce((acc, curr) => acc + curr.profitUnits, 0);

    return {
      totalSingle,
      highlightSingle,
      totalPairs,
      highlightPairs,
      totalRanges,
      profitableRanges,
      displayedCount: currentList.length,
      avgWinRate,
      totalUnitsProfit: Math.round(totalUnitsProfit * 10) / 10,
    };
  }, [singleOddsStats, pairOddsStats, rangeOddsStats, viewType, filteredSingleOdds, filteredPairOdds, filteredRangeOdds]);

  // Gestione salvataggio pronostico in archivio
  const handleSaveSingle = (item: Bet365SingleOddStat) => {
    if (!onSavePrediction) return;
    onSavePrediction({
      matchDate: new Date().toLocaleDateString('it-IT'),
      matchTime: '--:--',
      homeTeam: 'Pattern Quota',
      awayTeam: `Bet365 @ ${item.oddValue.toFixed(2)}`,
      league: 'Archivio DB',
      market: item.marketLabel,
      selection: item.marketType === 'H' ? '1' : item.marketType === 'D' ? 'X' : item.marketType === 'A' ? '2' : item.marketLabel,
      odd: item.oddValue,
      modelSource: 'Bet365 Win Rate',
      estimatedProbPct: item.winRatePct,
      status: 'pending',
      stake: 1,
      notes: `Quota Bet365 ${item.oddValue.toFixed(2)} con Win Rate storico ${item.winRatePct}% su ${item.sampleSize} match (ROI: ${item.roiPct > 0 ? '+' : ''}${item.roiPct}%)`,
    });
    setSavedSuccessId(item.id);
    setTimeout(() => setSavedSuccessId(null), 2500);
  };

  const handleSavePair = (item: Bet365PairOddStat) => {
    if (!onSavePrediction) return;
    onSavePrediction({
      matchDate: new Date().toLocaleDateString('it-IT'),
      matchTime: '--:--',
      homeTeam: 'Coppia Quote',
      awayTeam: `${item.pairLabel}`,
      league: 'Archivio DB',
      market: `Coppia ${item.pairType}`,
      selection: item.targetLabel,
      odd: item.odd1,
      modelSource: 'Bet365 Win Rate',
      estimatedProbPct: item.winRatePct,
      status: 'pending',
      stake: 1,
      notes: `Coppia Bet365 [${item.odd1.toFixed(2)} - ${item.odd2.toFixed(2)}] esito ${item.targetLabel} con Win Rate storico ${item.winRatePct}% su ${item.sampleSize} match`,
    });
    setSavedSuccessId(item.id);
    setTimeout(() => setSavedSuccessId(null), 2500);
  };

  const handleSaveRange = (item: OddsRangeStat) => {
    if (!onSavePrediction) return;
    onSavePrediction({
      matchDate: new Date().toLocaleDateString('it-IT'),
      matchTime: '--:--',
      homeTeam: 'Range Quota Profittevole',
      awayTeam: `${item.marketLabel} [${item.rangeLabel}]`,
      league: 'Archivio DB',
      market: item.marketLabel,
      selection: item.marketType,
      odd: item.avgOdd,
      modelSource: 'Bet365 Win Rate',
      estimatedProbPct: item.winRatePct,
      status: 'pending',
      stake: 1,
      notes: `Range ${item.rangeLabel} su ${item.marketLabel}: ROI storico ${item.roiPct > 0 ? '+' : ''}${item.roiPct}% con Win Rate ${item.winRatePct}% (${item.evaluation})`,
    });
    setSavedSuccessId(item.id);
    setTimeout(() => setSavedSuccessId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Intestazione */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Analisi Win Rate & Range Profittevoli Quote Bet365</span>
              </h2>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 font-mono font-semibold px-2 py-0.5 rounded border border-emerald-500/30">
                Evidenziazione ≥ 66%
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl">
              Valutazione statistica sulle quote Bet365 in archivio: analizza le frequenze di vittoria singole, le convergenze a coppie ordinate,
              e scopri le <strong>fasce di quota più profittevoli</strong> (con valutazione quantitativa del valore atteso) in tutti i mercati (1X2, Over/Under 2.5, Doppie Chance).
            </p>
          </div>

          {/* Switch modalità Singole / Coppie / Range Profittevoli */}
          <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={() => {
                setViewType('single');
                setMarketFilter('all');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewType === 'single'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Quote Singole ({summaryKpis.totalSingle})
            </button>
            <button
              onClick={() => {
                setViewType('pairs');
                setMarketFilter('all');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewType === 'pairs'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Coppie ({summaryKpis.totalPairs})
            </button>
            <button
              onClick={() => {
                setViewType('ranges');
                setMarketFilter('all');
                setSortBy('roi');
                setSortOrder('desc');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewType === 'ranges'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Range Più Profittevoli ({summaryKpis.profitableRanges})
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-400 block mb-1">
            {viewType === 'ranges' ? 'Fasce Analizzate' : 'Quote / Coppie a DB'}
          </span>
          <div className="text-xl font-bold text-white font-mono">
            {viewType === 'single'
              ? summaryKpis.totalSingle
              : viewType === 'pairs'
              ? summaryKpis.totalPairs
              : summaryKpis.totalRanges}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Min. {minSampleSize} partite a campione
          </span>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 bg-emerald-950/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-300 font-semibold block mb-1">
              {viewType === 'ranges' ? 'Fasce con ROI Positivo ⭐' : 'Cluster Win Rate ≥ 66% ⭐'}
            </span>
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            {viewType === 'single'
              ? summaryKpis.highlightSingle
              : viewType === 'pairs'
              ? summaryKpis.highlightPairs
              : summaryKpis.profitableRanges}
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono mt-0.5 block">
            {viewType === 'ranges' ? 'Rendimento storico netto positivo' : 'Frequenza vincente superiore al 66%'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-400 block mb-1">Win Rate Medio Attuale</span>
          <div className="text-xl font-bold text-amber-400 font-mono">
            {summaryKpis.avgWinRate}%
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Su {summaryKpis.displayedCount} elementi mostrati
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-400 block mb-1">Profitto Flat Stake (Unità)</span>
          <div className={`text-xl font-bold font-mono ${summaryKpis.totalUnitsProfit >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
            {summaryKpis.totalUnitsProfit >= 0 ? `+${summaryKpis.totalUnitsProfit}` : summaryKpis.totalUnitsProfit}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            1 unità fissa per combinazione
          </span>
        </div>
      </div>

      {/* Barra Filtri Avanzata */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Ricerca e Filtri */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative min-w-56 flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={
                  viewType === 'ranges'
                    ? 'Cerca range (es. 1.76, over, casa)...'
                    : viewType === 'single'
                    ? 'Cerca quota es. 1.80 o mercato...'
                    : 'Cerca es. 1.90 o coppia...'
                }
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Toggle Highlight >= 66% */}
            {viewType !== 'ranges' && (
              <button
                onClick={() => setOnlyHighWinRate(!onlyHighWinRate)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  onlyHighWinRate
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Solo Win Rate ≥ 66%</span>
              </button>
            )}

            {/* Filtro Valutazione (visibile solo se viewType === 'ranges') */}
            {viewType === 'ranges' && (
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
                <span className="text-slate-400">Valutazione:</span>
                <select
                  value={rangeEvalFilter}
                  onChange={e => setRangeEvalFilter(e.target.value as any)}
                  className="bg-transparent text-white focus:outline-none cursor-pointer"
                >
                  <option value="all">Tutte le Valutazioni</option>
                  <option value="profitable">Solo Profittevoli (ROI &gt; 0%)</option>
                  <option value="greatValue">Solo Ottimo Valore Atteso</option>
                </select>
              </div>
            )}

            {/* Filtro Campione Minimo */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400">Min Partite:</span>
              <select
                value={minSampleSize}
                onChange={e => setMinSampleSize(Number(e.target.value))}
                className="bg-transparent text-white focus:outline-none cursor-pointer font-mono font-bold"
              >
                <option value={1}>1+</option>
                <option value={2}>2+</option>
                <option value={3}>3+</option>
                <option value={5}>5+</option>
                <option value={8}>8+</option>
              </select>
            </div>

            {/* Filtro Mercato */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400">Mercato:</span>
              <select
                value={marketFilter}
                onChange={e => setMarketFilter(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              >
                <option value="all">Tutti i Mercati</option>
                {viewType === 'single' ? (
                  <>
                    <option value="H">Segno 1 (Casa)</option>
                    <option value="D">Segno X (Pareggio)</option>
                    <option value="A">Segno 2 (Ospite)</option>
                    <option value="Over25">Over 2.5</option>
                    <option value="Under25">Under 2.5</option>
                  </>
                ) : viewType === 'pairs' ? (
                  <>
                    <option value="H_D">Coppia Casa - Pareggio</option>
                    <option value="H_A">Coppia Casa - Ospite</option>
                    <option value="D_A">Coppia Pareggio - Ospite</option>
                  </>
                ) : (
                  <>
                    <option value="1">Segno 1 (Vittoria Casa)</option>
                    <option value="X">Segno X (Pareggio)</option>
                    <option value="2">Segno 2 (Vittoria Ospite)</option>
                    <option value="Over25">Over 2.5 Gol</option>
                    <option value="Under25">Under 2.5 Gol</option>
                    <option value="1X">Doppia Chance 1X</option>
                    <option value="X2">Doppia Chance X2</option>
                    <option value="12">Doppia Chance 12</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Ordinamento */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Ordina:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none cursor-pointer"
            >
              <option value="roi">ROI % (Rendimento)</option>
              <option value="winRate">Win Rate %</option>
              <option value="sampleSize">Campione (Partite)</option>
              <option value="odd">Valore Quota</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              title="Inverti ordine"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* VISTA 1: TABELLA QUOTE SINGOLE */}
      {viewType === 'single' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Quote Singole Bet365 Analizzate ({filteredSingleOdds.length})
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Evidenziate in verde/oro con badge se Win Rate ≥ 66%
            </span>
          </div>

          {filteredSingleOdds.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Nessuna quota singola corrisponde ai filtri selezionati. Prova a diminuire il campione minimo o deselezionare "Solo Win Rate ≥ 66%".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] font-sans">
                    <th className="py-3 px-4">Mercato & Quota Bet365</th>
                    <th className="py-3 px-3 text-center">Partite a DB</th>
                    <th className="py-3 px-3 text-center">Esiti Vincenti</th>
                    <th className="py-3 px-4 text-center">Win Rate Storico</th>
                    <th className="py-3 px-3 text-center">Profitto Netto (Flat 1u)</th>
                    <th className="py-3 px-3 text-center">ROI Storico %</th>
                    <th className="py-3 px-4 text-right">Azione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSingleOdds.map(item => {
                    const isHigh = item.isHighlight;
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isHigh
                            ? 'bg-emerald-950/20 hover:bg-emerald-900/30'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-4 font-sans">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-sm font-bold bg-slate-950 border border-slate-800 text-white font-mono">
                              {item.oddValue.toFixed(2)}
                            </span>
                            <div>
                              <div className="font-semibold text-white text-xs">{item.marketLabel}</div>
                              <span className="text-[10px] text-slate-400">Mercato Bet365</span>
                            </div>
                            {isHigh && (
                              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                Win Rate ≥ 66%
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center text-slate-300 font-bold">
                          {item.sampleSize}
                        </td>

                        <td className="py-3 px-3 text-center text-emerald-400 font-bold">
                          {item.wins} / {item.sampleSize}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`text-sm font-bold px-2 py-0.5 rounded ${
                                isHigh
                                  ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30'
                                  : item.winRatePct >= 50
                                  ? 'text-amber-300 bg-amber-500/10'
                                  : 'text-slate-400'
                              }`}
                            >
                              {item.winRatePct}%
                            </span>
                            <div className="w-16 bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                              <div
                                className={`h-1 rounded-full ${
                                  isHigh ? 'bg-emerald-400' : item.winRatePct >= 50 ? 'bg-amber-400' : 'bg-slate-600'
                                }`}
                                style={{ width: `${Math.min(100, item.winRatePct)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center font-bold">
                          <span className={item.profitUnits > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                            {item.profitUnits > 0 ? `+${item.profitUnits}` : item.profitUnits} u
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              item.roiPct > 0
                                ? 'text-emerald-300 bg-emerald-500/10'
                                : 'text-slate-500'
                            }`}
                          >
                            {item.roiPct > 0 ? `+${item.roiPct}%` : `${item.roiPct}%`}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleSaveSingle(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-600 text-white font-sans text-xs transition-colors cursor-pointer"
                            title="Salva suggerimento nell'archivio pronostici"
                          >
                            {savedSuccessId === item.id ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                <span className="text-emerald-300">Salvato!</span>
                              </>
                            ) : (
                              <>
                                <BookmarkPlus className="w-3.5 h-3.5 text-slate-300" />
                                <span>Salva Prono</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: TABELLA COPPIE ORDINATE */}
      {viewType === 'pairs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Coppie Ordinate Bet365 Analizzate ({filteredPairOdds.length})
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Coppie (Quota 1, Quota 2) e Win Rate per singoli esiti o doppie chance
            </span>
          </div>

          {filteredPairOdds.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Nessuna coppia ordinata corrisponde ai filtri selezionati. Prova a diminuire il campione minimo o disattivare "Solo Win Rate ≥ 66%".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] font-sans">
                    <th className="py-3 px-4">Coppia Ordinata</th>
                    <th className="py-3 px-3">Esito Target</th>
                    <th className="py-3 px-3 text-center">Partite a DB</th>
                    <th className="py-3 px-3 text-center">Esiti Vincenti</th>
                    <th className="py-3 px-4 text-center">Win Rate Storico</th>
                    <th className="py-3 px-3 text-center">Profitto Netto</th>
                    <th className="py-3 px-3 text-center">ROI Storico %</th>
                    <th className="py-3 px-4 text-right">Azione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredPairOdds.map(item => {
                    const isHigh = item.isHighlight;
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isHigh
                            ? 'bg-emerald-950/20 hover:bg-emerald-900/30'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-4 font-sans">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 font-mono">
                              <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-slate-950 border border-slate-800 text-white">
                                {item.odd1.toFixed(2)}
                              </span>
                              <span className="text-slate-500 font-sans">vs</span>
                              <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-slate-950 border border-slate-800 text-white">
                                {item.odd2.toFixed(2)}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 ml-1">
                              ({item.pairType === 'H_D' ? 'Casa-X' : item.pairType === 'H_A' ? 'Casa-Ospite' : 'X-Ospite'})
                            </span>
                            {isHigh && (
                              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                ≥ 66%
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 font-sans font-bold text-white">
                          <span className="px-2 py-0.5 bg-slate-950 rounded border border-slate-800 text-emerald-300">
                            {item.targetLabel}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center text-slate-300 font-bold">
                          {item.sampleSize}
                        </td>

                        <td className="py-3 px-3 text-center text-emerald-400 font-bold">
                          {item.wins} / {item.sampleSize}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`text-sm font-bold px-2 py-0.5 rounded ${
                                isHigh
                                  ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30'
                                  : item.winRatePct >= 50
                                  ? 'text-amber-300 bg-amber-500/10'
                                  : 'text-slate-400'
                              }`}
                            >
                              {item.winRatePct}%
                            </span>
                            <div className="w-16 bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                              <div
                                className={`h-1 rounded-full ${
                                  isHigh ? 'bg-emerald-400' : item.winRatePct >= 50 ? 'bg-amber-400' : 'bg-slate-600'
                                }`}
                                style={{ width: `${Math.min(100, item.winRatePct)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center font-bold">
                          <span className={item.profitUnits > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                            {item.profitUnits > 0 ? `+${item.profitUnits}` : item.profitUnits} u
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              item.roiPct > 0
                                ? 'text-emerald-300 bg-emerald-500/10'
                                : 'text-slate-500'
                            }`}
                          >
                            {item.roiPct > 0 ? `+${item.roiPct}%` : `${item.roiPct}%`}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleSavePair(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-600 text-white font-sans text-xs transition-colors cursor-pointer"
                            title="Salva suggerimento nell'archivio pronostici"
                          >
                            {savedSuccessId === item.id ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                <span className="text-emerald-300">Salvato!</span>
                              </>
                            ) : (
                              <>
                                <BookmarkPlus className="w-3.5 h-3.5 text-slate-300" />
                                <span>Salva Prono</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VISTA 3: RANGE DI QUOTA PIÙ PROFITTEVOLI (TUTTI I MERCATI) */}
      {viewType === 'ranges' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Valutazione Range Quote Bet365 più Profittevoli ({filteredRangeOdds.length})
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Classifica delle fasce di quota ordinate per rendimento storico (ROI %) e valutazione del valore atteso
              </p>
            </div>
            <span className="text-xs text-emerald-400 font-mono font-medium">
              Fasce Profittevoli: {summaryKpis.profitableRanges} su {summaryKpis.totalRanges}
            </span>
          </div>

          {filteredRangeOdds.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Nessuna fascia di quota corrisponde ai filtri selezionati. Prova a selezionare "Tutte le Valutazioni" o diminuire il campione minimo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] font-sans">
                    <th className="py-3 px-4">Mercato</th>
                    <th className="py-3 px-3">Fascia di Quota</th>
                    <th className="py-3 px-2 text-center">Quota Media</th>
                    <th className="py-3 px-2 text-center">Partite a DB</th>
                    <th className="py-3 px-2 text-center">Win / Totale</th>
                    <th className="py-3 px-3 text-center">Win Rate %</th>
                    <th className="py-3 px-3 text-center">Profitto Netto</th>
                    <th className="py-3 px-3 text-center">ROI Storico %</th>
                    <th className="py-3 px-3 text-center">Valutazione Statistica</th>
                    <th className="py-3 px-4 text-right">Azione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRangeOdds.map(item => {
                    const isProfit = item.roiPct > 0;
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          item.evaluation === 'Ottimo Valore Atteso'
                            ? 'bg-emerald-950/25 hover:bg-emerald-900/30'
                            : isProfit
                            ? 'bg-emerald-950/10 hover:bg-slate-800/40'
                            : 'hover:bg-slate-800/30'
                        }`}
                      >
                        {/* Mercato */}
                        <td className="py-3 px-4 font-sans">
                          <span className="font-semibold text-white block text-xs">
                            {item.marketLabel}
                          </span>
                        </td>

                        {/* Fascia di quota */}
                        <td className="py-3 px-3 font-sans">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300 font-mono font-bold text-xs">
                            {item.rangeLabel}
                          </span>
                        </td>

                        {/* Quota Media */}
                        <td className="py-3 px-2 text-center text-slate-300 font-bold">
                          {item.avgOdd.toFixed(2)}
                        </td>

                        {/* Partite a DB */}
                        <td className="py-3 px-2 text-center text-slate-300 font-bold">
                          {item.sampleSize}
                        </td>

                        {/* Win / Totale */}
                        <td className="py-3 px-2 text-center text-emerald-400 font-bold">
                          {item.wins} / {item.sampleSize}
                        </td>

                        {/* Win Rate % */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`font-bold px-1.5 py-0.5 rounded ${
                              item.winRatePct >= 66
                                ? 'text-emerald-300 bg-emerald-500/20'
                                : item.winRatePct >= 50
                                ? 'text-amber-300 bg-amber-500/10'
                                : 'text-slate-400'
                            }`}
                          >
                            {item.winRatePct}%
                          </span>
                        </td>

                        {/* Profitto Netto */}
                        <td className="py-3 px-3 text-center font-bold">
                          <span className={item.profitUnits > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                            {item.profitUnits > 0 ? `+${item.profitUnits}` : item.profitUnits} u
                          </span>
                        </td>

                        {/* ROI % */}
                        <td className="py-3 px-3 text-center font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              item.roiPct > 0
                                ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30'
                                : 'text-slate-500'
                            }`}
                          >
                            {item.roiPct > 0 ? `+${item.roiPct}%` : `${item.roiPct}%`}
                          </span>
                        </td>

                        {/* Valutazione Statistica */}
                        <td className="py-3 px-3 text-center font-sans">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                              item.evaluation === 'Ottimo Valore Atteso'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                                : item.evaluation === 'Profittevole'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : item.evaluation === 'Equilibrato'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                : item.evaluation === 'Negativo'
                                ? 'bg-slate-800 text-slate-400 border-slate-700'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {item.evaluation === 'Ottimo Valore Atteso' && (
                              <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                            )}
                            <span>{item.evaluation}</span>
                          </span>
                        </td>

                        {/* Azione */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleSaveRange(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-600 text-white font-sans text-xs transition-colors cursor-pointer"
                            title="Salva suggerimento su questa fascia di quota"
                          >
                            {savedSuccessId === item.id ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                <span className="text-emerald-300">Salvato!</span>
                              </>
                            ) : (
                              <>
                                <BookmarkPlus className="w-3.5 h-3.5 text-slate-300" />
                                <span>Salva Prono</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
