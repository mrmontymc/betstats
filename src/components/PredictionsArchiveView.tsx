import React, { useState, useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Download,
  PlusCircle,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  Percent,
  FileSpreadsheet,
  AlertCircle,
  Edit2,
  Check,
} from 'lucide-react';
import { HistoricalMatch, SavedPrediction } from '../types';

interface PredictionsArchiveViewProps {
  predictions: SavedPrediction[];
  onUpdatePrediction: (id: string, updates: Partial<SavedPrediction>) => void;
  onDeletePrediction: (id: string) => void;
  onAddPrediction: (prediction: Omit<SavedPrediction, 'id' | 'createdAt'>) => void;
  historicalMatches: HistoricalMatch[];
}

export const PredictionsArchiveView: React.FC<PredictionsArchiveViewProps> = ({
  predictions,
  onUpdatePrediction,
  onDeletePrediction,
  onAddPrediction,
  historicalMatches,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'won' | 'lost' | 'void'>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [autoVerifySuccessMsg, setAutoVerifySuccessMsg] = useState<string | null>(null);

  // Form stato per nuovo pronostico
  const [newHome, setNewHome] = useState('');
  const [newAway, setNewAway] = useState('');
  const [newLeague, setNewLeague] = useState('Serie A');
  const [newMarket, setNewMarket] = useState('1X2');
  const [newSelection, setNewSelection] = useState('1');
  const [newOdd, setNewOdd] = useState('1.85');
  const [newModel, setNewModel] = useState<SavedPrediction['modelSource']>('Dixon-Coles');
  const [newProb, setNewProb] = useState('55');
  const [newStake, setNewStake] = useState('1');
  const [newNotes, setNewNotes] = useState('');

  // Filtraggio pronostici
  const filteredPredictions = useMemo(() => {
    return predictions.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (modelFilter !== 'all' && p.modelSource !== modelFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const text = `${p.homeTeam} ${p.awayTeam} ${p.market} ${p.selection} ${p.league} ${p.notes || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [predictions, statusFilter, modelFilter, searchTerm]);

  // Statistiche e Rendimento KPI
  const stats = useMemo(() => {
    const total = predictions.length;
    const settled = predictions.filter(p => p.status === 'won' || p.status === 'lost');
    const won = predictions.filter(p => p.status === 'won').length;
    const lost = predictions.filter(p => p.status === 'lost').length;
    const pending = predictions.filter(p => p.status === 'pending').length;
    const voidCount = predictions.filter(p => p.status === 'void').length;

    let totalStake = 0;
    let totalReturn = 0;
    let avgOddSum = 0;

    predictions.forEach(p => {
      avgOddSum += p.odd;
      if (p.status === 'won') {
        totalStake += p.stake;
        totalReturn += p.stake * p.odd;
      } else if (p.status === 'lost') {
        totalStake += p.stake;
      }
    });

    const netProfit = totalReturn - totalStake;
    const winRate = settled.length > 0 ? Math.round((won / settled.length) * 1000) / 10 : 0;
    const yieldPct = totalStake > 0 ? Math.round((netProfit / totalStake) * 1000) / 10 : 0;
    const avgOdd = total > 0 ? Math.round((avgOddSum / total) * 100) / 100 : 0;

    return {
      total,
      settled: settled.length,
      won,
      lost,
      pending,
      voidCount,
      netProfit: Math.round(netProfit * 100) / 100,
      winRate,
      yieldPct,
      avgOdd,
      totalStake: Math.round(totalStake * 100) / 100,
    };
  }, [predictions]);

  // Funzione di verifica automatica con l'archivio storico
  const handleAutoVerify = () => {
    let verifiedCount = 0;

    predictions.forEach(p => {
      if (p.status !== 'pending') return;

      const pHome = p.homeTeam.toLowerCase().trim();
      const pAway = p.awayTeam.toLowerCase().trim();

      // Cerca il match nel database storico per nome squadra
      const matched = historicalMatches.find(m => {
        const mHome = m.homeTeam.toLowerCase();
        const mAway = m.awayTeam.toLowerCase();
        return (
          (mHome.includes(pHome) || pHome.includes(mHome)) &&
          (mAway.includes(pAway) || pAway.includes(mAway))
        );
      });

      if (matched) {
        let isWon = false;
        const realScore = `${matched.fthg}-${matched.ftag}`;

        // Verifica esito in base alla selezione e al mercato
        const sel = p.selection.trim().toUpperCase();
        if (sel === '1' || sel.includes('CASA')) {
          isWon = matched.ftr === 'H';
        } else if (sel === 'X' || sel.includes('PAR')) {
          isWon = matched.ftr === 'D';
        } else if (sel === '2' || sel.includes('OSPITE')) {
          isWon = matched.ftr === 'A';
        } else if (sel.includes('1X')) {
          isWon = matched.ftr === 'H' || matched.ftr === 'D';
        } else if (sel.includes('X2')) {
          isWon = matched.ftr === 'D' || matched.ftr === 'A';
        } else if (sel.includes('12')) {
          isWon = matched.ftr === 'H' || matched.ftr === 'A';
        } else if (sel.includes('OVER 2.5') || sel === 'OVER') {
          isWon = (matched.fthg + matched.ftag) > 2.5;
        } else if (sel.includes('UNDER 2.5') || sel === 'UNDER') {
          isWon = (matched.fthg + matched.ftag) < 2.5;
        } else if (sel.includes('GOAL') || sel === 'GG') {
          isWon = matched.fthg > 0 && matched.ftag > 0;
        } else if (sel.includes('NO GOAL') || sel === 'NG') {
          isWon = matched.fthg === 0 || matched.ftag === 0;
        }

        onUpdatePrediction(p.id, {
          status: isWon ? 'won' : 'lost',
          realScore,
          payout: isWon ? p.stake * p.odd : 0,
        });
        verifiedCount++;
      }
    });

    setAutoVerifySuccessMsg(
      verifiedCount > 0
        ? `Verifica completata: ${verifiedCount} pronostici aggiornati con i risultati del DB!`
        : 'Nessun pronostico in attesa trovato tra le partite del database.'
    );
    setTimeout(() => setAutoVerifySuccessMsg(null), 4000);
  };

  // Creazione manuale pronostico
  const handleCreateManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHome || !newAway) return;

    onAddPrediction({
      matchDate: new Date().toLocaleDateString('it-IT'),
      matchTime: '20:45',
      homeTeam: newHome,
      awayTeam: newAway,
      league: newLeague,
      market: newMarket,
      selection: newSelection,
      odd: parseFloat(newOdd) || 1.85,
      modelSource: newModel,
      estimatedProbPct: parseFloat(newProb) || 55,
      status: 'pending',
      stake: parseFloat(newStake) || 1,
      notes: newNotes,
    });

    setNewHome('');
    setNewAway('');
    setNewNotes('');
    setIsAddModalOpen(false);
  };

  // Esportazione CSV
  const handleExportCsv = () => {
    if (predictions.length === 0) return;
    const header = 'Data,Incontro,Lega,Mercato,Pronostico,Quota,Modello,Prob%,Stake,Status,Punteggio,Profitto,Note\n';
    const rows = predictions.map(p => {
      const profit = p.status === 'won' ? (p.stake * p.odd - p.stake).toFixed(2) : p.status === 'lost' ? (-p.stake).toFixed(2) : '0';
      return `"${p.matchDate}","${p.homeTeam} vs ${p.awayTeam}","${p.league}","${p.market}","${p.selection}",${p.odd},"${p.modelSource}",${p.estimatedProbPct}%,${p.stake},"${p.status}","${p.realScore || ''}",${profit},"${(p.notes || '').replace(/"/g, '""')}"`;
    }).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Archivio_Pronostici_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              <span>Archivio Pronostici & Verifica Validità</span>
            </h2>
            <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-700">
              {predictions.length} Pronostici
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Raccogli e tieni traccia dei pronostici suggeriti dai modelli analitici (Dixon-Coles, Poisson Bivariata, Monte Carlo, Cluster Quote, Win Rate Bet365).
            Verifica in tempo reale l'esito reale con il database o aggiorna i punteggi manualmente.
          </p>
        </div>

        {/* Pulsanti Azione Principali */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAutoVerify}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm cursor-pointer"
            title="Cerca nel database storico i risultati per i pronostici in attesa"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Verifica con Database</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-all border border-slate-700 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Aggiungi Manuale</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={predictions.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all cursor-pointer disabled:opacity-50"
            title="Esporta archivio in formato CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Esporta CSV</span>
          </button>
        </div>
      </div>

      {/* Messaggio notifica verifica automatica */}
      {autoVerifySuccessMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{autoVerifySuccessMsg}</span>
        </div>
      )}

      {/* KPI Cards Rendimento */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-400 block mb-1">Win Rate % (Conclusi)</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {stats.winRate}%
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            {stats.won} Vinti / {stats.settled} Conclusi
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-400 block mb-1">Profitto Netto (Unità)</span>
          <div className={`text-2xl font-bold font-mono ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.netProfit >= 0 ? `+${stats.netProfit}` : stats.netProfit} u
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Stake totale: {stats.totalStake} u
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-400 block mb-1">Yield / ROI %</span>
          <div className={`text-2xl font-bold font-mono ${stats.yieldPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.yieldPct >= 0 ? `+${stats.yieldPct}%` : `${stats.yieldPct}%`}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Rendimento su capitale giocato
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-400 block mb-1">Quota Media</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {stats.avgOdd.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Media pesata su archivio
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] text-slate-400 block mb-1">In Attesa di Esito</span>
          <div className="text-2xl font-bold text-sky-400 font-mono">
            {stats.pending}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Pronostici aperti
          </span>
        </div>
      </div>

      {/* Barra Filtri */}
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
                placeholder="Cerca squadra, mercato, selezione o note..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Filtro Status */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400">Esito:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              >
                <option value="all">Tutti ({predictions.length})</option>
                <option value="pending">In Attesa ({stats.pending})</option>
                <option value="won">Vinti ({stats.won})</option>
                <option value="lost">Persi ({stats.lost})</option>
                <option value="void">Rimborsati ({stats.voidCount})</option>
              </select>
            </div>

            {/* Filtro Modello */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400">Modello:</span>
              <select
                value={modelFilter}
                onChange={e => setModelFilter(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              >
                <option value="all">Tutti i Modelli</option>
                <option value="Dixon-Coles">Dixon-Coles</option>
                <option value="Poisson Bivariata">Poisson Bivariata</option>
                <option value="Monte Carlo">Monte Carlo</option>
                <option value="Bet365 Win Rate">Bet365 Win Rate</option>
                <option value="Pattern ROI">Pattern ROI</option>
                <option value="Cluster Quote">Cluster Quote</option>
                <option value="Manuale">Manuale</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabella Pronostici */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        {filteredPredictions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <p>Nessun pronostico presente in questa vista.</p>
            <p className="text-slate-500 text-[11px]">
              Puoi salvare i pronostici suggeriti direttamente da <strong>Incrocio Match Insights</strong> (Dixon-Coles, Bivariata, Monte Carlo), dalla vista <strong>Win Rate Bet365</strong>, o aggiungerne uno manualmente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] font-sans">
                  <th className="py-3 px-4">Partita & Data</th>
                  <th className="py-3 px-3">Modello Analitico</th>
                  <th className="py-3 px-3">Mercato & Pronostico</th>
                  <th className="py-3 px-2 text-center">Quota</th>
                  <th className="py-3 px-2 text-center">Prob. Stimata</th>
                  <th className="py-3 px-3 text-center">Stato / Esito</th>
                  <th className="py-3 px-3 text-center">Risultato Reale</th>
                  <th className="py-3 px-3 text-center">Profitto Netto</th>
                  <th className="py-3 px-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPredictions.map(p => {
                  const isWon = p.status === 'won';
                  const isLost = p.status === 'lost';
                  const isPending = p.status === 'pending';
                  const profit = isWon ? p.stake * p.odd - p.stake : isLost ? -p.stake : 0;

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isWon
                          ? 'bg-emerald-950/15 hover:bg-emerald-900/20'
                          : isLost
                          ? 'bg-rose-950/15 hover:bg-rose-900/20'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Partita */}
                      <td className="py-3 px-4 font-sans">
                        <div className="font-semibold text-white text-xs">
                          {p.homeTeam} vs {p.awayTeam}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{p.league}</span>
                          <span>·</span>
                          <span>{p.matchDate} {p.matchTime !== '--:--' ? p.matchTime : ''}</span>
                        </div>
                        {p.notes && (
                          <div className="text-[10px] text-slate-400/80 mt-1 italic line-clamp-1">
                            {p.notes}
                          </div>
                        )}
                      </td>

                      {/* Modello */}
                      <td className="py-3 px-3 font-sans">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            p.modelSource === 'Dixon-Coles'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : p.modelSource === 'Poisson Bivariata'
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                              : p.modelSource === 'Monte Carlo'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : p.modelSource === 'Bet365 Win Rate'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {p.modelSource}
                        </span>
                      </td>

                      {/* Mercato & Selezione */}
                      <td className="py-3 px-3 font-sans">
                        <div className="text-slate-400 text-[11px]">{p.market}</div>
                        <div className="text-white font-bold text-xs">{p.selection}</div>
                      </td>

                      {/* Quota */}
                      <td className="py-3 px-2 text-center font-bold text-white font-mono text-xs">
                        {p.odd.toFixed(2)}
                      </td>

                      {/* Probabilità Stimata */}
                      <td className="py-3 px-2 text-center text-slate-300 font-mono text-xs">
                        {p.estimatedProbPct}%
                      </td>

                      {/* Stato & Selettore */}
                      <td className="py-3 px-3 text-center font-sans">
                        <select
                          value={p.status}
                          onChange={e => onUpdatePrediction(p.id, { status: e.target.value as any })}
                          className={`text-xs font-semibold px-2 py-1 rounded border cursor-pointer ${
                            isWon
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : isLost
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : isPending
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          <option value="pending">In Attesa</option>
                          <option value="won">Vinto</option>
                          <option value="lost">Perso</option>
                          <option value="void">Rimborsato</option>
                        </select>
                      </td>

                      {/* Risultato Reale */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="text"
                          value={p.realScore || ''}
                          onChange={e => onUpdatePrediction(p.id, { realScore: e.target.value })}
                          placeholder="- vs -"
                          className="w-16 text-center py-0.5 px-1 bg-slate-950 border border-slate-800 rounded text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                        />
                      </td>

                      {/* Profitto Netto */}
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        {isPending ? (
                          <span className="text-slate-500">-</span>
                        ) : (
                          <span className={profit > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {profit > 0 ? `+${profit.toFixed(2)}` : profit.toFixed(2)} u
                          </span>
                        )}
                      </td>

                      {/* Azioni */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onDeletePrediction(p.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                          title="Elimina pronostico"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal Aggiungi Pronostico Manuale */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Aggiungi Pronostico Manuale all'Archivio</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Squadra Casa:</label>
                  <input
                    type="text"
                    required
                    value={newHome}
                    onChange={e => setNewHome(e.target.value)}
                    placeholder="Es. Inter"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Squadra Trasferta:</label>
                  <input
                    type="text"
                    required
                    value={newAway}
                    onChange={e => setNewAway(e.target.value)}
                    placeholder="Es. Milan"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Campionato:</label>
                  <input
                    type="text"
                    value={newLeague}
                    onChange={e => setNewLeague(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Mercato:</label>
                  <input
                    type="text"
                    value={newMarket}
                    onChange={e => setNewMarket(e.target.value)}
                    placeholder="1X2, U/O, GG"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Pronostico:</label>
                  <input
                    type="text"
                    required
                    value={newSelection}
                    onChange={e => setNewSelection(e.target.value)}
                    placeholder="1, X, 2, Over 2.5"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Quota:</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newOdd}
                    onChange={e => setNewOdd(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Modello:</label>
                  <select
                    value={newModel}
                    onChange={e => setNewModel(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="Dixon-Coles">Dixon-Coles</option>
                    <option value="Poisson Bivariata">Poisson Bivariata</option>
                    <option value="Monte Carlo">Monte Carlo</option>
                    <option value="Bet365 Win Rate">Bet365 Win Rate</option>
                    <option value="Pattern ROI">Pattern ROI</option>
                    <option value="Cluster Quote">Cluster Quote</option>
                    <option value="Manuale">Manuale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Stake (Unità):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newStake}
                    onChange={e => setNewStake(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Note & Razionale:</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Es. Edge alto sul pareggio da Dixon-Coles..."
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm"
                >
                  Salva Pronostico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
