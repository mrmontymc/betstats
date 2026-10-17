import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  BarChart3,
  ListOrdered,
  Calendar,
  Layers,
  Flame,
  Award,
  Activity,
  CornerDownRight,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { HistoricalMatch } from '../types';
import {
  calculateLeagueTable,
  calculateTeamSummaries,
  calculateGoalSumDistribution,
  calculateCornerSumDistribution,
} from '../utils/statsCalculator';

interface HistoricalStatsViewProps {
  matches: HistoricalMatch[];
  onSelectTeamForInsight?: (team: string) => void;
}

export const HistoricalStatsView: React.FC<HistoricalStatsViewProps> = ({
  matches,
  onSelectTeamForInsight,
}) => {
  const [subTab, setSubTab] = useState<'matches' | 'table' | 'teams' | 'distributions'>('matches');
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'H' | 'D' | 'A'>('all');
  const [ouFilter, setOuFilter] = useState<'all' | 'over25' | 'under25'>('all');
  const [bttsFilter, setBttsFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');

  const uniqueDivisions = useMemo(() => {
    return Array.from(new Set(matches.map(m => m.div))).filter(Boolean);
  }, [matches]);

  // Filtra partite storiche
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      if (selectedDivision !== 'all' && m.div !== selectedDivision) return false;

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchText = `${m.homeTeam} ${m.awayTeam} ${m.date}`.toLowerCase();
        if (!matchText.includes(query)) return false;
      }

      if (resultFilter !== 'all' && m.ftr !== resultFilter) return false;

      const totalGoals = m.fthg + m.ftag;
      if (ouFilter === 'over25' && totalGoals < 2.5) return false;
      if (ouFilter === 'under25' && totalGoals >= 2.5) return false;

      const isBtts = m.fthg > 0 && m.ftag > 0;
      if (bttsFilter === 'yes' && !isBtts) return false;
      if (bttsFilter === 'no' && isBtts) return false;

      return true;
    });
  }, [matches, selectedDivision, searchTerm, resultFilter, ouFilter, bttsFilter]);

  // Calcoli aggregati
  const standings = useMemo(() => {
    const targetMatches = selectedDivision === 'all'
      ? matches
      : matches.filter(m => m.div === selectedDivision);
    return calculateLeagueTable(targetMatches);
  }, [matches, selectedDivision]);

  const teamSummaries = useMemo(() => {
    const targetMatches = selectedDivision === 'all'
      ? matches
      : matches.filter(m => m.div === selectedDivision);
    return calculateTeamSummaries(targetMatches);
  }, [matches, selectedDivision]);

  // Distribuzione Somma Gol & Corner
  const goalSumDist = useMemo(() => {
    return calculateGoalSumDistribution(filteredMatches);
  }, [filteredMatches]);

  const cornerSumDist = useMemo(() => {
    return calculateCornerSumDistribution(filteredMatches);
  }, [filteredMatches]);

  // Somma gol modale (più frequente)
  const modalGoalSum = useMemo(() => {
    if (goalSumDist.length === 0) return null;
    return [...goalSumDist].sort((a, b) => b.count - a.count)[0];
  }, [goalSumDist]);

  const statsKpi = useMemo(() => {
    if (filteredMatches.length === 0) return null;
    let homeWins = 0;
    let draws = 0;
    let awayWins = 0;
    let totalGoals = 0;
    let over25Count = 0;
    let bttsCount = 0;

    filteredMatches.forEach(m => {
      if (m.ftr === 'H') homeWins++;
      else if (m.ftr === 'D') draws++;
      else if (m.ftr === 'A') awayWins++;

      const g = m.fthg + m.ftag;
      totalGoals += g;
      if (g > 2.5) over25Count++;
      if (m.fthg > 0 && m.ftag > 0) bttsCount++;
    });

    const count = filteredMatches.length;

    return {
      count,
      homeWinPct: Math.round((homeWins / count) * 100),
      drawPct: Math.round((draws / count) * 100),
      awayWinPct: Math.round((awayWins / count) * 100),
      avgGoals: (totalGoals / count).toFixed(2),
      over25Pct: Math.round((over25Count / count) * 100),
      bttsPct: Math.round((bttsCount / count) * 100),
    };
  }, [filteredMatches]);

  return (
    <div className="space-y-4">
      {/* Top Header & Subtabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-semibold text-white">Database Statistico Risultati & Quote</h2>
            <span className="text-xs text-slate-400">· {matches.length} partite storiche caricate</span>
          </div>
          <p className="text-xs text-slate-400">
            Dati ufficiali di campionato: punteggi FT, HT, tiri, tiri in porta, falli, cartellini, corner e quote bookmaker.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex flex-wrap bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1">
          <button
            onClick={() => setSubTab('matches')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              subTab === 'matches'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Elenco Partite</span>
          </button>
          <button
            onClick={() => setSubTab('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              subTab === 'table'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Classifica Dinamica</span>
          </button>
          <button
            onClick={() => setSubTab('teams')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              subTab === 'teams'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Metriche Squadre</span>
          </button>
          <button
            onClick={() => setSubTab('distributions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              subTab === 'distributions'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>Somma Gol & Corner</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {statsKpi && (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg">
            <span className="text-[10px] text-slate-400 block">Partite Filtrate</span>
            <span className="text-lg font-bold text-white font-mono">{statsKpi.count}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg">
            <span className="text-[10px] text-slate-400 block">Vittorie Casa (1)</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{statsKpi.homeWinPct}%</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg">
            <span className="text-[10px] text-slate-400 block">Pareggi (X)</span>
            <span className="text-lg font-bold text-amber-400 font-mono">{statsKpi.drawPct}%</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg">
            <span className="text-[10px] text-slate-400 block">Vittorie Ospite (2)</span>
            <span className="text-lg font-bold text-blue-400 font-mono">{statsKpi.awayWinPct}%</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg">
            <span className="text-[10px] text-slate-400 block">Media Gol / Match</span>
            <span className="text-lg font-bold text-white font-mono">{statsKpi.avgGoals}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg">
            <span className="text-[10px] text-slate-400 block">Over 2.5 / BTTS</span>
            <span className="text-lg font-bold text-purple-400 font-mono">
              {statsKpi.over25Pct}% / {statsKpi.bttsPct}%
            </span>
          </div>
        </div>
      )}

      {/* Barra Filtri (per viste partite e classifiche) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Cerca */}
          <div className="relative min-w-48 flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cerca squadra o data..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Divisione */}
          {uniqueDivisions.length > 1 && (
            <select
              value={selectedDivision}
              onChange={e => setSelectedDivision(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Tutte le Leghe</option>
              {uniqueDivisions.map(d => (
                <option key={d} value={d}>
                  Lega {d}
                </option>
              ))}
            </select>
          )}

          {/* Risultato FT */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setResultFilter('all')}
              className={`px-2 py-1 rounded text-xs cursor-pointer ${resultFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}`}
            >
              Tutti
            </button>
            <button
              onClick={() => setResultFilter('H')}
              className={`px-2 py-1 rounded text-xs cursor-pointer ${resultFilter === 'H' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'}`}
            >
              1
            </button>
            <button
              onClick={() => setResultFilter('D')}
              className={`px-2 py-1 rounded text-xs cursor-pointer ${resultFilter === 'D' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400'}`}
            >
              X
            </button>
            <button
              onClick={() => setResultFilter('A')}
              className={`px-2 py-1 rounded text-xs cursor-pointer ${resultFilter === 'A' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
            >
              2
            </button>
          </div>

          {/* Over / Under */}
          <select
            value={ouFilter}
            onChange={e => setOuFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">Tutti Gol</option>
            <option value="over25">Solo Over 2.5</option>
            <option value="under25">Solo Under 2.5</option>
          </select>

          {/* Goal / NoGoal */}
          <select
            value={bttsFilter}
            onChange={e => setBttsFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">Tutti BTTS</option>
            <option value="yes">Solo Goal (BTTS SÌ)</option>
            <option value="no">Solo NoGoal</option>
          </select>
        </div>

        <span className="text-slate-400 font-mono">
          Mostrate: <strong className="text-white">{filteredMatches.length}</strong> / {matches.length}
        </span>
      </div>

      {/* VISTA 1: ELENCO PARTITE */}
      {subTab === 'matches' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] font-sans">
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-2">Div</th>
                  <th className="py-2.5 px-4">Partita (Casa - Ospite)</th>
                  <th className="py-2.5 px-3 text-center">Risultato FT</th>
                  <th className="py-2.5 px-2 text-center text-slate-500">HT</th>
                  <th className="py-2.5 px-3 text-center">Tiri (In Porta)</th>
                  <th className="py-2.5 px-3 text-center text-sky-400">Corner</th>
                  <th className="py-2.5 px-2 text-center">Falli</th>
                  <th className="py-2.5 px-2 text-center">Cartellini</th>
                  <th className="py-2.5 px-2 text-center bg-slate-950 border-l border-slate-800">B365 1</th>
                  <th className="py-2.5 px-2 text-center bg-slate-950">B365 X</th>
                  <th className="py-2.5 px-2 text-center bg-slate-950">B365 2</th>
                  <th className="py-2.5 px-2 text-center bg-slate-950 border-l border-slate-800">B365 &gt;2.5</th>
                  <th className="py-2.5 px-2 text-center bg-slate-950">B365 &lt;2.5</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMatches.map(m => {
                  const isHomeWin = m.ftr === 'H';
                  const isAwayWin = m.ftr === 'A';
                  const isDraw = m.ftr === 'D';
                  const totalGoals = m.fthg + m.ftag;
                  const totalCorners = (m.hc ?? 0) + (m.ac ?? 0);

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 text-slate-300 font-sans whitespace-nowrap">{m.date}</td>
                      <td className="py-2 px-2 text-emerald-400 font-bold">{m.div}</td>
                      <td className="py-2 px-4 font-sans">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-semibold ${isHomeWin ? 'text-emerald-300' : 'text-white'}`}>
                            {m.homeTeam}
                          </span>
                          <span className="text-slate-500">vs</span>
                          <span className={`font-semibold ${isAwayWin ? 'text-emerald-300' : 'text-white'}`}>
                            {m.awayTeam}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            isHomeWin
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : isAwayWin
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {m.fthg} - {m.ftag}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center text-slate-500 text-[11px]">
                        {m.hthg !== null && m.htag !== null ? `${m.hthg}-${m.htag}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-300">
                        {m.hs ?? '-'}:{m.as ?? '-'} <span className="text-slate-500">({m.hst ?? '-'}:{m.ast ?? '-'})</span>
                      </td>
                      <td className="py-2 px-3 text-center text-sky-400 font-bold">
                        {m.hc !== null && m.ac !== null ? `${totalCorners} (${m.hc}-${m.ac})` : '-'}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-400 text-[11px]">
                        {m.hf ?? '-'}:{m.af ?? '-'}
                      </td>
                      <td className="py-2 px-2 text-center text-[11px]">
                        <span className="text-amber-400">{m.hy ?? 0 + (m.ay ?? 0)}G</span>
                        {((m.hr ?? 0) + (m.ar ?? 0) > 0) && (
                          <span className="text-rose-400 ml-1 font-bold">{(m.hr ?? 0) + (m.ar ?? 0)}R</span>
                        )}
                      </td>
                      {/* Quote Bet365 */}
                      <td className="py-2 px-2 text-center font-bold border-l border-slate-800 text-slate-200">
                        {m.b365H ? m.b365H.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-300">
                        {m.b365D ? m.b365D.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-slate-200">
                        {m.b365A ? m.b365A.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-2 text-center text-amber-300 border-l border-slate-800">
                        {m.b365Over25 ? m.b365Over25.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-300">
                        {m.b365Under25 ? m.b365Under25.toFixed(2) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 2: CLASSIFICA DINAMICA */}
      {subTab === 'table' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-white">Classifica Campionato Calcolata</span>
            <span className="text-slate-400 font-mono">Totale Squadre: {standings.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] font-sans">
                  <th className="py-2 px-3 text-center">Pos</th>
                  <th className="py-2 px-4">Squadra</th>
                  <th className="py-2 px-2 text-center font-bold text-emerald-400">PT</th>
                  <th className="py-2 px-2 text-center">G</th>
                  <th className="py-2 px-2 text-center">V</th>
                  <th className="py-2 px-2 text-center">N</th>
                  <th className="py-2 px-2 text-center">P</th>
                  <th className="py-2 px-2 text-center">GF</th>
                  <th className="py-2 px-2 text-center">GS</th>
                  <th className="py-2 px-2 text-center">DR</th>
                  <th className="py-2 px-3 text-center">Forma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {standings.map((t, idx) => (
                  <tr key={t.team} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-2 px-4 font-sans font-semibold text-white">{t.team}</td>
                    <td className="py-2 px-2 text-center font-bold text-emerald-400 text-sm">{t.points}</td>
                    <td className="py-2 px-2 text-center text-slate-300">{t.played}</td>
                    <td className="py-2 px-2 text-center text-slate-300">{t.won}</td>
                    <td className="py-2 px-2 text-center text-slate-300">{t.drawn}</td>
                    <td className="py-2 px-2 text-center text-slate-300">{t.lost}</td>
                    <td className="py-2 px-2 text-center text-slate-300">{t.goalsFor}</td>
                    <td className="py-2 px-2 text-center text-slate-300">{t.goalsAgainst}</td>
                    <td className="py-2 px-2 text-center text-slate-300 font-bold">{t.goalDiff > 0 ? `+${t.goalDiff}` : t.goalDiff}</td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {t.form.map((res, fIdx) => (
                          <span
                            key={fIdx}
                            className={`w-4 h-4 rounded-xs text-[9px] flex items-center justify-center font-bold ${
                              res === 'W'
                                ? 'bg-emerald-500 text-slate-950'
                                : res === 'D'
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-700 text-white'
                            }`}
                          >
                            {res}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 3: METRICHE SQUADRE */}
      {subTab === 'teams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.values(teamSummaries).map(summary => (
            <div
              key={summary.team}
              className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">{summary.team}</span>
                <span className="text-xs text-slate-400 font-mono">{summary.matchesPlayed} match</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 font-sans">Media Gol Fatti / Subiti</div>
                  <div className="text-white font-bold mt-0.5">
                    {summary.goalsScoredAvg} <span className="text-slate-500">/</span> {summary.goalsConcededAvg}
                  </div>
                </div>

                <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 font-sans">Tiri Totali (In Porta)</div>
                  <div className="text-white font-bold mt-0.5">
                    {summary.shotsAvg} <span className="text-slate-500">({summary.shotsOnTargetAvg})</span>
                  </div>
                </div>

                <div className="p-2 bg-slate-950 rounded border border-sky-950/60">
                  <div className="text-[10px] text-sky-400 font-sans">Corner a Favore / Contro</div>
                  <div className="text-sky-300 font-bold mt-0.5">
                    {summary.cornersForAvg} <span className="text-slate-500">/</span> {summary.cornersAgainstAvg}
                  </div>
                  <div className="text-[9px] text-slate-500 font-sans">Tot: {summary.cornersAvg} (Over 9.5: {summary.cornersOver95Rate}%)</div>
                </div>

                <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 font-sans">% Over 2.5 / BTTS</div>
                  <div className="text-amber-400 font-bold mt-0.5">
                    {summary.over25Rate}% <span className="text-slate-500">/</span> {summary.bttsRate}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <span>Clean Sheet: <strong className="text-white">{summary.cleanSheetRate}%</strong></span>
                <span>Falli Medi: <strong className="text-white">{summary.foulsAvg}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VISTA 4: DISTRIBUZIONE SOMMA GOL & CALCI D'ANGOLO */}
      {subTab === 'distributions' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* SEZIONE 1: DISTRIBUZIONE SOMMA GOL */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Numero di Volte per Somma Gol Partita (0, 1, 2, 3, 4, 5, 6+ Gol)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Frequenza esatta con cui si è verificata ciascuna somma gol nei {filteredMatches.length} match analizzati
                </p>
              </div>

              {modalGoalSum && (
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-300">Somma Gol più frequente:</span>
                  <strong className="text-emerald-300 font-mono font-bold">
                    {modalGoalSum.label} ({modalGoalSum.count} volte · {modalGoalSum.percentage}%)
                  </strong>
                </div>
              )}
            </div>

            {/* Griglia Somma Gol Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {goalSumDist.map(item => {
                const isModal = modalGoalSum?.goalSum === item.goalSum;
                return (
                  <div
                    key={item.goalSum}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      isModal
                        ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-[11px] text-slate-400 font-sans block mb-1">
                      {item.label}
                    </span>
                    <div className="text-2xl font-bold text-white font-mono">
                      {item.count}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      volte a DB
                    </span>

                    <div className="mt-2 text-xs font-bold text-emerald-400 font-mono">
                      {item.percentage}%
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${isModal ? 'bg-emerald-400' : 'bg-slate-500'}`}
                        style={{ width: `${Math.min(100, item.percentage * 2)}%` }}
                      />
                    </div>

                    {/* Esempi punteggi */}
                    {item.sampleScorelines.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono leading-tight">
                        <span className="text-[9px] text-slate-500 font-sans block mb-0.5">Top Risultati:</span>
                        {item.sampleScorelines.slice(0, 2).join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SEZIONE 2: DISTRIBUZIONE CALCI D'ANGOLO */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CornerDownRight className="w-4 h-4 text-sky-400" />
                  <span>Numero di Volte dei Calci d'Angolo Partita (Fasce e Conteggi Esatti)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Frequenza empirica e numero di volte in cui una data somma di corner si è verificata
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-400">Media Corner Partita:</span>
                <strong className="text-sky-300 font-bold text-sm bg-sky-950/40 px-2.5 py-1 rounded border border-sky-800/40">
                  {cornerSumDist.totalCornersAverage} Corner
                </strong>
              </div>
            </div>

            {/* Griglia Fasce Corner */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {cornerSumDist.byBracket.map(bracket => (
                <div
                  key={bracket.bracketKey}
                  className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-1.5"
                >
                  <span className="text-[11px] text-sky-300 font-sans block font-semibold">
                    {bracket.bracketLabel}
                  </span>
                  <div className="text-2xl font-bold text-white font-mono">
                    {bracket.count}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    partite verificate
                  </span>
                  <div className="text-xs font-bold text-sky-400 font-mono">
                    {bracket.percentage}%
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-sky-400"
                      style={{ width: `${Math.min(100, bracket.percentage * 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Dettaglio Conteggi Esatti di Corner */}
            {cornerSumDist.exactFrequencies.length > 0 && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Conteggio Esatto del Numero di Corner Verificatisi</span>
                  <span className="text-slate-400 text-[11px] font-mono">
                    Partite a campione: {cornerSumDist.matchesWithCornersCount}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2 text-xs font-mono">
                  {cornerSumDist.exactFrequencies.map(ef => (
                    <div
                      key={ef.corners}
                      className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-center"
                    >
                      <span className="text-[11px] text-slate-400 block font-sans">{ef.corners} Corner</span>
                      <strong className="text-white text-base block mt-0.5">{ef.count} v</strong>
                      <span className="text-[10px] text-sky-400">{ef.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
