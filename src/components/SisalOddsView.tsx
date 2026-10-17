import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Percent,
  Calendar,
  Layers,
  ArrowUpDown,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { SisalMatch } from '../types';
import { exportNormalizedSisalCsv } from '../utils/csvParser';

interface SisalOddsViewProps {
  matches: SisalMatch[];
  onSelectMatchForInsight?: (match: SisalMatch) => void;
}

export const SisalOddsView: React.FC<SisalOddsViewProps> = ({
  matches,
  onSelectMatchForInsight,
}) => {
  // Filtri
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedManif, setSelectedManif] = useState<string>('all');
  const [favoriteFilter, setFavoriteFilter] = useState<'all' | '1' | '2' | 'heavyFav'>('all');
  const [onlyHandicap, setOnlyHandicap] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'time' | 'favoriteOdds' | 'payout' | 'margin'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [uoTarget, setUoTarget] = useState<'2.5' | 'all'>('2.5');

  // Modalità vista
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Filtro Isolamento Quote Impossibili (quota = 1.00)
  const [anomalyFilter, setAnomalyFilter] = useState<'validOnly' | 'all' | 'isolatedOnly'>('validOnly');

  // Filtri quote range
  const [q1Max, setQ1Max] = useState<string>('');
  const [q2Max, setQ2Max] = useState<string>('');
  const [over25Max, setOver25Max] = useState<string>('');
  const [goalMax, setGoalMax] = useState<string>('');

  // Filtro Scenari ROI Positivo
  const [onlyPositiveRoi, setOnlyPositiveRoi] = useState<boolean>(false);
  const [selectedRoiPatternId, setSelectedRoiPatternId] = useState<string>('all');

  // Filtro Win Rate 1X2 >= 66% con tolleranza quote 0.05
  const [onlyHighWinRate1X2, setOnlyHighWinRate1X2] = useState<boolean>(false);

  // Estrai date e manifestazioni uniche
  const uniqueDates = useMemo(() => {
    return Array.from(new Set(matches.map(m => m.dataHeader))).filter(Boolean);
  }, [matches]);

  const uniqueManifs = useMemo(() => {
    const counts: { [key: string]: number } = {};
    matches.forEach(m => {
      counts[m.manif] = (counts[m.manif] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [matches]);

  // Filtraggio partite
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      // Filtro isolamento quote impossibili (quota = 1.00 / errore lettura file)
      const isAnomalous = m.hasImpossibleOdds || (m.q1 !== null && m.q1 <= 1.001) || (m.qX !== null && m.qX <= 1.001) || (m.q2 !== null && m.q2 <= 1.001);
      if (anomalyFilter === 'validOnly' && isAnomalous) return false;
      if (anomalyFilter === 'isolatedOnly' && !isAnomalous) return false;

      // Ricerca testo
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchText = `${m.squadra1} ${m.squadra2} ${m.manif} ${m.pal} ${m.avv}`.toLowerCase();
        if (!matchText.includes(query)) return false;
      }

      // Filtro data
      if (selectedDate !== 'all' && m.dataHeader !== selectedDate) {
        return false;
      }

      // Filtro manifestazione
      if (selectedManif !== 'all' && m.manif !== selectedManif) {
        return false;
      }

      // Solo Handicap
      if (onlyHandicap && m.handicapVal === null) {
        return false;
      }

      // Filtro Favorita
      if (favoriteFilter === '1' && m.favorite !== '1') return false;
      if (favoriteFilter === '2' && m.favorite !== '2') return false;
      if (favoriteFilter === 'heavyFav') {
        const minOdd = Math.min(m.q1 || 99, m.q2 || 99);
        if (minOdd > 1.60) return false;
      }

      // Filtro Scenari con ROI Positivo
      if (onlyPositiveRoi) {
        if (!m.matchedPatterns || m.matchedPatterns.length === 0) return false;
        const hasPositive = m.matchedPatterns.some(p => p.expectedRoi > 0);
        if (!hasPositive) return false;
        if (selectedRoiPatternId !== 'all' && !m.matchedPatterns.some(p => p.patternId === selectedRoiPatternId)) {
          return false;
        }
      }

      // Filtro Win Rate 1X2 >= 66% (Tolleranza quote 0.05)
      if (onlyHighWinRate1X2) {
        if (!m.highWinRate1X2 || m.highWinRate1X2.winRatePct < 66.0) return false;
      }

      // Range Quote
      if (q1Max && m.q1 && m.q1 > parseFloat(q1Max)) return false;
      if (q2Max && m.q2 && m.q2 > parseFloat(q2Max)) return false;
      if (over25Max && m.qO25 && m.qO25 > parseFloat(over25Max)) return false;
      if (goalMax && m.qGoal && m.qGoal > parseFloat(goalMax)) return false;

      return true;
    }).sort((a, b) => {
      let comp = 0;
      if (sortBy === 'time') {
        comp = a.ora.localeCompare(b.ora);
      } else if (sortBy === 'favoriteOdds') {
        const favA = a.favoriteOdds || 999;
        const favB = b.favoriteOdds || 999;
        comp = favA - favB;
      } else if (sortBy === 'payout') {
        comp = (a.payoutPercent || 0) - (b.payoutPercent || 0);
      } else if (sortBy === 'margin') {
        comp = (a.bookmakerMargin || 0) - (b.bookmakerMargin || 0);
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [
    matches,
    searchTerm,
    selectedDate,
    selectedManif,
    favoriteFilter,
    onlyHandicap,
    onlyPositiveRoi,
    selectedRoiPatternId,
    onlyHighWinRate1X2,
    anomalyFilter,
    sortBy,
    sortOrder,
    q1Max,
    q2Max,
    over25Max,
    goalMax,
  ]);

  // Conteggio partite complessive con ROI positivo
  const positiveRoiMatchesCount = useMemo(() => {
    return matches.filter(m => m.matchedPatterns && m.matchedPatterns.some(p => p.expectedRoi > 0)).length;
  }, [matches]);

  // Conteggio partite complessive con Win Rate 1X2 >= 66% (tolleranza 0.05)
  const highWinRate1X2Count = useMemo(() => {
    return matches.filter(m => m.highWinRate1X2 && m.highWinRate1X2.winRatePct >= 66.0).length;
  }, [matches]);

  // Conteggio partite complessive con quota anomala = 1.00 (valore impossibile)
  const anomalousMatchesCount = useMemo(() => {
    return matches.filter(m => m.hasImpossibleOdds || (m.q1 !== null && m.q1 <= 1.001) || (m.qX !== null && m.qX <= 1.001) || (m.q2 !== null && m.q2 <= 1.001)).length;
  }, [matches]);

  // Statistiche del palinsesto filtrato
  const summaryStats = useMemo(() => {
    if (filteredMatches.length === 0) return null;
    let avgPayout = 0;
    let countPayout = 0;
    let homeFavs = 0;
    let awayFavs = 0;

    filteredMatches.forEach(m => {
      if (m.payoutPercent) {
        avgPayout += m.payoutPercent;
        countPayout++;
      }
      if (m.favorite === '1') homeFavs++;
      if (m.favorite === '2') awayFavs++;
    });

    return {
      total: filteredMatches.length,
      avgPayout: countPayout > 0 ? (avgPayout / countPayout).toFixed(2) : '-',
      homeFavs,
      awayFavs,
    };
  }, [filteredMatches]);

  const handleExportNormalized = () => {
    const csvData = exportNormalizedSisalCsv(filteredMatches);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'calcio_base_per_data_corretto_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Normalization Notification */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-white">Palinsesto Sisal Calcio Normalizzato</span>
            <span className="text-xs text-slate-400">· {matches.length} partite in archivio</span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Il parser pulisce automaticamente intestazioni duplicate, allinea le quote slittate ed estrae
            1X2, Handicap, Doppia Chance, Under/Over e Goal.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportNormalized}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Scarica il CSV con la formattazione corretta standardizzata per le analisi successive"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Esporta CSV Corretto</span>
          </button>
        </div>
      </div>

      {/* BANNER SEGNALAZIONE ED ISOLAMENTO QUOTE ANOMALE = 1.0 */}
      {anomalousMatchesCount > 0 && (
        <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs transition-all shadow-lg ${
          anomalyFilter === 'isolatedOnly'
            ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${anomalyFilter === 'isolatedOnly' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span>Rilevate {anomalousMatchesCount} partite con Quota Offerta = 1.00 (Quota Impossibile)</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded font-mono font-bold">
                  {anomalyFilter === 'isolatedOnly' ? 'Attualmente Isolate a Schermo' : 'Filtrate ed Isolate Automaticamente'}
                </span>
              </div>
              <p className="text-slate-300 mt-1 leading-relaxed">
                Una quota pari a 1.00 non esiste nel betting reale (rendimento zero). È un sintomo tipico di valori nulli convertiti in 1 o sfasamento delle colonne nel file CSV. 
                Il sistema le ha <strong>isolate ed escluse</strong> dalle formule matematiche del Masaniello e dai cluster storici per prevenire divisioni per zero e calcoli errati.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {anomalyFilter === 'isolatedOnly' ? (
              <button
                type="button"
                onClick={() => setAnomalyFilter('validOnly')}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Torna a Partite Valide
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAnomalyFilter('isolatedOnly')}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Isola & Ispeziona ({anomalousMatchesCount} match)
              </button>
            )}
            <button
              type="button"
              onClick={() => setAnomalyFilter(anomalyFilter === 'all' ? 'validOnly' : 'all')}
              className={`px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                anomalyFilter === 'all'
                  ? 'bg-slate-800 text-white border-slate-600'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {anomalyFilter === 'all' ? 'Ripristina Filtro Sicuro' : 'Mostra Tutto'}
            </button>
          </div>
        </div>
      )}

      {/* Main Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Ricerca Testuale */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cerca squadra, lega (es. ITA1), palinsesto..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Filtro Data */}
          <div className="md:col-span-3">
            <select
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Tutte le date ({uniqueDates.length} giornate)</option>
              {uniqueDates.map(date => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Manifestazione / Campionato */}
          <div className="md:col-span-3">
            <select
              value={selectedManif}
              onChange={e => setSelectedManif(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Tutte le Manifestazioni ({uniqueManifs.length})</option>
              {uniqueManifs.map(([manif, count]) => (
                <option key={manif} value={manif}>
                  {manif} ({count} match)
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Filtri Avanzati & Vista */}
          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                showAdvancedFilters
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtri Quote</span>
            </button>

            <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tabella
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  viewMode === 'cards' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Card
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filter Badges (Segmented control) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60">
          <span className="text-[11px] text-slate-500 font-medium">Favorita:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFavoriteFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                favoriteFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              Tutte
            </button>
            <button
              onClick={() => setFavoriteFilter('1')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                favoriteFilter === '1'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              Casa Favorita (1)
            </button>
            <button
              onClick={() => setFavoriteFilter('2')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                favoriteFilter === '2'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              Ospite Favorita (2)
            </button>
            <button
              onClick={() => setFavoriteFilter('heavyFav')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                favoriteFilter === 'heavyFav'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              Super Favorite (Quota ≤ 1.60)
            </button>
          </div>

          {/* Filtro ROI Positivo Richiesto */}
          <div className="flex flex-wrap items-center gap-1.5 pl-2 border-l border-slate-800">
            <button
              onClick={() => setOnlyPositiveRoi(!onlyPositiveRoi)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                onlyPositiveRoi
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-sm shadow-emerald-500/30'
                  : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/50'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Solo Scenari ROI Positivo</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${onlyPositiveRoi ? 'bg-slate-950 text-emerald-300' : 'bg-emerald-900/60 text-emerald-200'}`}>
                {positiveRoiMatchesCount}
              </span>
            </button>

            {/* Filtro Win Rate 1X2 >= 66% (tolleranza quote 0.05) */}
            <button
              onClick={() => setOnlyHighWinRate1X2(!onlyHighWinRate1X2)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                onlyHighWinRate1X2
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm shadow-amber-500/30'
                  : 'bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Win Rate 1X2 ≥ 66% (Tol. ±0.05)</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${onlyHighWinRate1X2 ? 'bg-slate-950 text-amber-300' : 'bg-amber-900/60 text-amber-200'}`}>
                {highWinRate1X2Count}
              </span>
            </button>

            {/* Pulsante Filtro Quota 1.00 Isolata */}
            {anomalousMatchesCount > 0 && (
              <button
                type="button"
                onClick={() => setAnomalyFilter(prev => prev === 'isolatedOnly' ? 'validOnly' : 'isolatedOnly')}
                title="Isola e visualizza esclusivamente le partite con quota 1.00 anomala"
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                  anomalyFilter === 'isolatedOnly'
                    ? 'bg-rose-600 text-white border-rose-500 font-bold shadow-sm shadow-rose-500/40'
                    : 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/50'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Isolate: Quota 1.00</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${anomalyFilter === 'isolatedOnly' ? 'bg-white text-rose-700' : 'bg-rose-900/60 text-rose-200'}`}>
                  {anomalousMatchesCount}
                </span>
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyHandicap}
                onChange={e => setOnlyHandicap(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-950"
              />
              <span>Solo con Handicap Sisal</span>
            </label>

            {/* Ordinamento */}
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={e => {
                  const [field, ord] = e.target.value.split('-');
                  setSortBy(field as any);
                  setSortOrder(ord as any);
                }}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="time-asc">Orario crescente</option>
                <option value="time-desc">Orario decrescente</option>
                <option value="favoriteOdds-asc">Quota Favorita (crescente)</option>
                <option value="payout-desc">Payout Bookmaker (alto → basso)</option>
                <option value="margin-desc">Margine Bookmaker (alto → basso)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pannello Filtri Avanzati Quote */}
        {showAdvancedFilters && (
          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs animate-in slide-in-from-top-2 duration-150">
            <div>
              <label className="block text-slate-400 mb-1">Quota 1 Massima:</label>
              <input
                type="number"
                step="0.05"
                value={q1Max}
                onChange={e => setQ1Max(e.target.value)}
                placeholder="es. 2.10"
                className="w-full p-1.5 bg-slate-900 border border-slate-800 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Quota 2 Massima:</label>
              <input
                type="number"
                step="0.05"
                value={q2Max}
                onChange={e => setQ2Max(e.target.value)}
                placeholder="es. 2.50"
                className="w-full p-1.5 bg-slate-900 border border-slate-800 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Quota Over 2.5 Max:</label>
              <input
                type="number"
                step="0.05"
                value={over25Max}
                onChange={e => setOver25Max(e.target.value)}
                placeholder="es. 1.80"
                className="w-full p-1.5 bg-slate-900 border border-slate-800 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Quota Goal Max:</label>
              <input
                type="number"
                step="0.05"
                value={goalMax}
                onChange={e => setGoalMax(e.target.value)}
                placeholder="es. 1.75"
                className="w-full p-1.5 bg-slate-900 border border-slate-800 rounded text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Riassuntivi */}
      {summaryStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Partite Filtrate</span>
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="text-xl font-bold text-white font-mono mt-1">{summaryStats.total}</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Payout Medio Sisal</span>
              <Percent className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
              {summaryStats.avgPayout}%
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Favorite Casa (1)</span>
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-bold text-blue-400 font-mono mt-1">
              {summaryStats.homeFavs}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Favorite Ospite (2)</span>
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-bold text-purple-400 font-mono mt-1">
              {summaryStats.awayFavs}
            </div>
          </div>
        </div>
      )}

      {/* Visualizzazione Tabella Densa */}
      {viewMode === 'table' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 font-medium">
                  <th className="py-2.5 px-3 sticky left-0 bg-slate-950 z-10 w-28">Match / Orario</th>
                  <th className="py-2.5 px-3">Pal / Avv</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Squadre</th>
                  {/* Gruppo 1X2 */}
                  <th className="py-2.5 px-2 text-center bg-slate-900/50 border-l border-slate-800">1</th>
                  <th className="py-2.5 px-2 text-center bg-slate-900/50">X</th>
                  <th className="py-2.5 px-2 text-center bg-slate-900/50">2</th>
                  {/* Payout */}
                  <th className="py-2.5 px-2 text-center">Lavagna</th>
                  {/* Handicap */}
                  <th className="py-2.5 px-2 text-center bg-slate-900/30 border-l border-slate-800">H</th>
                  <th className="py-2.5 px-2 text-center bg-slate-900/30">1 (H)</th>
                  <th className="py-2.5 px-2 text-center bg-slate-900/30">X (H)</th>
                  <th className="py-2.5 px-2 text-center bg-slate-900/30">2 (H)</th>
                  {/* Doppia Chance */}
                  <th className="py-2.5 px-2 text-center border-l border-slate-800">1X</th>
                  <th className="py-2.5 px-2 text-center">X2</th>
                  <th className="py-2.5 px-2 text-center">12</th>
                  {/* Under / Over */}
                  <th className="py-2.5 px-2 text-center bg-slate-900/50 border-l border-slate-800">U 2.5</th>
                  <th className="py-2.5 px-2 text-center bg-slate-900/50">O 2.5</th>
                  {/* Goal / NoGoal */}
                  <th className="py-2.5 px-2 text-center border-l border-slate-800">Goal</th>
                  <th className="py-2.5 px-2 text-center">NoGoal</th>
                  {/* Segna Goal */}
                  <th className="py-2.5 px-2 text-center bg-slate-900/30 border-l border-slate-800">Casa SÌ</th>
                  <th className="py-2.5 px-2 text-center bg-slate-900/30">Osp. SÌ</th>
                  {/* Azioni */}
                  <th className="py-2.5 px-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredMatches.map(m => {
                  const is1Fav = m.favorite === '1';
                  const is2Fav = m.favorite === '2';

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Ora & Manifestazione */}
                      <td className="py-2.5 px-3 sticky left-0 bg-slate-900 group-hover:bg-slate-850 z-10 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-sans">
                          <span className="font-mono font-bold text-white">{m.ora}</span>
                          <span className="text-[10px] text-emerald-400 font-mono font-medium">
                            {m.manif}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans truncate max-w-[120px]">
                          {m.dataHeader.split(',')[0]}
                        </div>
                      </td>

                      {/* Pal / Avv */}
                      <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap font-mono">
                        {m.pal}/{m.avv}
                      </td>

                      {/* Squadre & Pattern ROI Badges */}
                      <td className="py-2.5 px-3 font-sans">
                        <div className="font-semibold text-white truncate max-w-[210px]">
                          {m.squadra1}
                        </div>
                        <div className="text-slate-400 truncate max-w-[210px]">
                          {m.squadra2}
                        </div>

                        {/* Badge Pattern ROI Positivi */}
                        {m.matchedPatterns && m.matchedPatterns.some(p => p.expectedRoi > 0) && (
                          <div className="flex flex-wrap gap-1 mt-1 font-sans">
                            {m.matchedPatterns.filter(p => p.expectedRoi > 0).slice(0, 2).map((p, idx) => (
                              <span
                                key={idx}
                                title={p.rationale}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium"
                              >
                                <TrendingUp className="w-2.5 h-2.5 shrink-0" />
                                <span>ROI +{p.expectedRoi}%: {p.targetMarket}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Badge Win Rate 1X2 >= 66% (tolleranza quote 0.05) */}
                        {m.highWinRate1X2 && m.highWinRate1X2.winRatePct >= 66.0 && (
                          <div className="mt-1 font-sans">
                            <span
                              title={`Tolleranza quote 0.05: su ${m.highWinRate1X2.matchesCount} partite storiche con quota vicina a ${m.highWinRate1X2.odd.toFixed(2)}, ${m.highWinRate1X2.winsCount} hanno terminato con esito ${m.highWinRate1X2.outcomeLabel}`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold"
                            >
                              <Sparkles className="w-2.5 h-2.5 shrink-0 text-amber-400" />
                              <span>{m.highWinRate1X2.outcomeLabel}: {m.highWinRate1X2.winRatePct}% (Tol. 0.05)</span>
                            </span>
                          </div>
                        )}

                        {/* Badge Quota 1.00 Anomala / Impossibile */}
                        {(m.hasImpossibleOdds || (m.q1 !== null && m.q1 <= 1.001) || (m.qX !== null && m.qX <= 1.001) || (m.q2 !== null && m.q2 <= 1.001)) && (
                          <div className="mt-1 font-sans">
                            <span
                              title={m.impossibleOddsReason || "Quota offerta 1.00: valore impossibile nelle scommesse reali (potenziale errore di lettura del CSV o colonna sfasata)"}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold"
                            >
                              <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-rose-400" />
                              <span>Quota 1.00 Anomala (Isolata)</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Esito 1X2 */}
                      <td
                        className={`py-2 px-2 text-center border-l border-slate-800 font-bold ${
                          m.q1 !== null && m.q1 <= 1.001
                            ? 'text-rose-400 bg-rose-950/40'
                            : is1Fav
                            ? 'text-emerald-300 bg-emerald-500/10'
                            : 'text-slate-200'
                        }`}
                      >
                        {m.q1 ? (m.q1 <= 1.001 ? <span title="Quota 1.00 impossibile">1.00 ⚠️</span> : m.q1.toFixed(2)) : '-'}
                      </td>
                      <td className={`py-2 px-2 text-center ${m.qX !== null && m.qX <= 1.001 ? 'text-rose-400 bg-rose-950/40 font-bold' : 'text-slate-300'}`}>
                        {m.qX ? (m.qX <= 1.001 ? <span title="Quota 1.00 impossibile">1.00 ⚠️</span> : m.qX.toFixed(2)) : '-'}
                      </td>
                      <td
                        className={`py-2 px-2 text-center font-bold ${
                          m.q2 !== null && m.q2 <= 1.001
                            ? 'text-rose-400 bg-rose-950/40'
                            : is2Fav
                            ? 'text-emerald-300 bg-emerald-500/10'
                            : 'text-slate-200'
                        }`}
                      >
                        {m.q2 ? (m.q2 <= 1.001 ? <span title="Quota 1.00 impossibile">1.00 ⚠️</span> : m.q2.toFixed(2)) : '-'}
                      </td>

                      {/* Lavagna / Payout */}
                      <td className="py-2 px-2 text-center text-[10px] text-slate-400">
                        {m.payoutPercent ? `${m.payoutPercent}%` : '-'}
                      </td>

                      {/* Handicap */}
                      <td className="py-2 px-1 text-center border-l border-slate-800 text-amber-400 font-bold">
                        {m.handicapVal !== null ? (m.handicapVal > 0 ? `+${m.handicapVal}` : m.handicapVal) : '-'}
                      </td>
                      <td className="py-2 px-1 text-center text-slate-300">
                        {m.qH1 ? m.qH1.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-1 text-center text-slate-400">
                        {m.qHX ? m.qHX.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-1 text-center text-slate-300">
                        {m.qH2 ? m.qH2.toFixed(2) : '-'}
                      </td>

                      {/* Doppia Chance */}
                      <td className="py-2 px-1 text-center border-l border-slate-800 text-slate-300">
                        {m.q1X ? m.q1X.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-1 text-center text-slate-300">
                        {m.qX2 ? m.qX2.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-1 text-center text-slate-400">
                        {m.q12 ? m.q12.toFixed(2) : '-'}
                      </td>

                      {/* Under / Over 2.5 */}
                      <td className="py-2 px-1 text-center border-l border-slate-800 text-sky-300">
                        {m.qU25 ? m.qU25.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-1 text-center text-amber-300">
                        {m.qO25 ? m.qO25.toFixed(2) : '-'}
                      </td>

                      {/* Goal / NoGoal */}
                      <td className="py-2 px-1 text-center border-l border-slate-800 text-slate-300">
                        {m.qGoal ? m.qGoal.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-1 text-center text-slate-400">
                        {m.qNoGoal ? m.qNoGoal.toFixed(2) : '-'}
                      </td>

                      {/* Segna Goal SÌ */}
                      <td className="py-2 px-1 text-center border-l border-slate-800 text-slate-300">
                        {m.qSegnaCasaSi ? m.qSegnaCasaSi.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-1 text-center text-slate-300">
                        {m.qSegnaOspiteSi ? m.qSegnaOspiteSi.toFixed(2) : '-'}
                      </td>

                      {/* Azioni */}
                      <td className="py-2 px-3 text-right whitespace-nowrap font-sans">
                        <button
                          onClick={() => onSelectMatchForInsight?.(m)}
                          className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 ml-auto cursor-pointer"
                        >
                          <span>Insight</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredMatches.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              Nessuna partita trovata con i filtri correnti. Prova a reimpostare i filtri di ricerca.
            </div>
          )}
        </div>
      ) : (
        /* Visualizzazione Card Compatte */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMatches.map(m => (
            <div
              key={m.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">{m.ora}</span>
                  <span className="text-emerald-400 font-mono font-medium">{m.manif}</span>
                </div>
                <span className="text-slate-400 text-[11px]">{m.dataHeader}</span>
              </div>

              <div>
                <div className="text-sm font-bold text-white">{m.squadra1}</div>
                <div className="text-sm font-medium text-slate-400">{m.squadra2}</div>

                {/* Badge Pattern ROI Positivi */}
                {m.matchedPatterns && m.matchedPatterns.some(p => p.expectedRoi > 0) && (
                  <div className="flex flex-wrap gap-1 mt-1.5 font-sans">
                    {m.matchedPatterns.filter(p => p.expectedRoi > 0).slice(0, 2).map((p, idx) => (
                      <span
                        key={idx}
                        title={p.rationale}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium"
                      >
                        <TrendingUp className="w-2.5 h-2.5 shrink-0" />
                        <span>ROI +{p.expectedRoi}%: {p.targetMarket}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Badge Win Rate 1X2 >= 66% (tolleranza quote 0.05) */}
                {m.highWinRate1X2 && m.highWinRate1X2.winRatePct >= 66.0 && (
                  <div className="mt-1.5 font-sans">
                    <span
                      title={`Tolleranza quote 0.05: su ${m.highWinRate1X2.matchesCount} match storici con quota vicina a ${m.highWinRate1X2.odd.toFixed(2)}, ${m.highWinRate1X2.winsCount} hanno terminato con esito ${m.highWinRate1X2.outcomeLabel}`}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold"
                    >
                      <Sparkles className="w-2.5 h-2.5 shrink-0 text-amber-400" />
                      <span>{m.highWinRate1X2.outcomeLabel}: {m.highWinRate1X2.winRatePct}% (Tol. 0.05)</span>
                    </span>
                  </div>
                )}
              </div>

              {/* 1X2 Box */}
              <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-950 rounded-lg text-center font-mono text-xs">
                <div className={`p-1.5 rounded ${m.favorite === '1' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-300'}`}>
                  <div className="text-[10px] text-slate-500 font-sans">1</div>
                  <div>{m.q1?.toFixed(2) || '-'}</div>
                </div>
                <div className="p-1.5 rounded text-slate-300">
                  <div className="text-[10px] text-slate-500 font-sans">X</div>
                  <div>{m.qX?.toFixed(2) || '-'}</div>
                </div>
                <div className={`p-1.5 rounded ${m.favorite === '2' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-300'}`}>
                  <div className="text-[10px] text-slate-500 font-sans">2</div>
                  <div>{m.q2?.toFixed(2) || '-'}</div>
                </div>
              </div>

              {/* Mercati secondari rapidi */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 bg-slate-950/60 rounded border border-slate-800/60 flex justify-between">
                  <span className="text-slate-500 font-sans">U/O 2.5:</span>
                  <span>{m.qU25?.toFixed(2) || '-'} / {m.qO25?.toFixed(2) || '-'}</span>
                </div>
                <div className="p-2 bg-slate-950/60 rounded border border-slate-800/60 flex justify-between">
                  <span className="text-slate-500 font-sans">G/NG:</span>
                  <span>{m.qGoal?.toFixed(2) || '-'} / {m.qNoGoal?.toFixed(2) || '-'}</span>
                </div>
              </div>

              {/* Footer card */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                <span className="text-slate-500 font-mono">Pal {m.pal} · Avv {m.avv}</span>
                <button
                  onClick={() => onSelectMatchForInsight?.(m)}
                  className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>Analizza Statistiche</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
