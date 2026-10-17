import React, { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingUp,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Target,
  ShieldAlert,
  Coins,
  BookmarkPlus,
  Layers,
  HelpCircle,
  Play,
  Award,
  Plus,
  Copy,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  FolderPlus,
  BarChart3,
} from 'lucide-react';
import {
  MasanielloConfig,
  MasanielloStepItem,
  MasanielloProgression,
  StepStatus,
  calculateMasaniello,
  createDefaultMasanielloConfig,
  createNewProgression,
  resetProgressionCycle,
} from '../utils/masaniello';
import { SisalMatch, SavedPrediction } from '../types';

interface MasanielloViewProps {
  sisalMatches: SisalMatch[];
  savedPredictions?: SavedPrediction[];
  onNavigateToPalinsesto?: () => void;
  onClearAllMatches?: () => void;
  onResetEverything?: () => void;
}

export const MasanielloView: React.FC<MasanielloViewProps> = ({
  sisalMatches,
  savedPredictions = [],
  onNavigateToPalinsesto,
  onClearAllMatches,
  onResetEverything,
}) => {
  // Lista delle progressioni Masaniello parallele
  const [progressions, setProgressions] = useState<MasanielloProgression[]>(() => {
    const saved = localStorage.getItem('bet_masaniello_progressions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Errore parsing progressioni salvate:', e);
      }
    }

    // Migrazione da eventuale stato singolo precedente
    const oldConfigRaw = localStorage.getItem('bet_masaniello_config');
    const oldStepsRaw = localStorage.getItem('bet_masaniello_steps');
    if (oldConfigRaw) {
      try {
        const oldConfig: MasanielloConfig = JSON.parse(oldConfigRaw);
        const oldSteps: MasanielloStepItem[] = oldStepsRaw ? JSON.parse(oldStepsRaw) : [];
        const migrated: MasanielloProgression = {
          id: `mas_migrated_${Date.now()}`,
          name: 'Progressione Principale',
          createdAt: new Date().toISOString(),
          config: oldConfig,
          steps: oldSteps.length === oldConfig.totalEvents ? oldSteps : createNewProgression('', oldConfig).steps,
        };
        return [migrated];
      } catch (e) {
        // Fallback sotto
      }
    }

    // Inizializza 2 progressioni predefinite per consentire subito il multi-money management
    const prog1 = createNewProgression('Progressione 1 (Serie A & 1X2)', {
      bankroll: 100,
      totalEvents: 10,
      referenceWinRate: 66,
      defaultOdds: 1.80,
    });
    const prog2 = createNewProgression('Progressione 2 (Over 2.5 & WR Alto)', {
      bankroll: 50,
      totalEvents: 6,
      referenceWinRate: 70,
      defaultOdds: 1.65,
    });

    return [prog1, prog2];
  });

  // ID progressione attualmente attiva
  const [activeProgressionId, setActiveProgressionId] = useState<string>(() => {
    const saved = localStorage.getItem('bet_masaniello_active_id');
    return saved || '';
  });

  // Progressione attiva corrente (con fallback alla prima)
  const activeProgression = useMemo(() => {
    return progressions.find(p => p.id === activeProgressionId) || progressions[0] || createNewProgression();
  }, [progressions, activeProgressionId]);

  // Modalità e dialoghi
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [showNewProgModal, setShowNewProgModal] = useState<boolean>(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);

  // Stato per rinominare inline una progressione
  const [editingProgId, setEditingProgId] = useState<string | null>(null);
  const [editingProgName, setEditingProgName] = useState<string>('');

  // Parametri del form nuova progressione
  const [newProgName, setNewProgName] = useState<string>('Nuova Progressione');
  const [newProgBankroll, setNewProgBankroll] = useState<number>(100);
  const [newProgEvents, setNewProgEvents] = useState<number>(10);
  const [newProgWinRate, setNewProgWinRate] = useState<number>(66);
  const [newProgOdds, setNewProgOdds] = useState<number>(1.80);

  // Salva stato progressioni in localStorage
  const persistProgressions = (updated: MasanielloProgression[], newActiveId?: string) => {
    setProgressions(updated);
    const activeIdToSave = newActiveId !== undefined ? newActiveId : activeProgression.id;
    setActiveProgressionId(activeIdToSave);

    try {
      localStorage.setItem('bet_masaniello_progressions', JSON.stringify(updated));
      localStorage.setItem('bet_masaniello_active_id', activeIdToSave);
      // Mantieni anche chiavi legacy per compatibilità
      const active = updated.find(p => p.id === activeIdToSave) || updated[0];
      if (active) {
        localStorage.setItem('bet_masaniello_config', JSON.stringify(active.config));
        localStorage.setItem('bet_masaniello_steps', JSON.stringify(active.steps));
      }
    } catch (err) {
      console.warn('Impossibile salvare progressioni in localStorage:', err);
    }
  };

  // Calcolo matematico per tutte le progressioni (per il portfolio manager)
  const allProgressionStates = useMemo(() => {
    return progressions.map(prog => ({
      progression: prog,
      state: calculateMasaniello(prog.config, prog.steps),
    }));
  }, [progressions]);

  // Stato calcolato della progressione attiva
  const activeState = useMemo(() => {
    const found = allProgressionStates.find(item => item.progression.id === activeProgression.id);
    return found ? found.state : calculateMasaniello(activeProgression.config, activeProgression.steps);
  }, [allProgressionStates, activeProgression]);

  // Statistiche di portafoglio globale (somma di tutte le progressioni)
  const portfolioStats = useMemo(() => {
    let totalInitialBankroll = 0;
    let totalCurrentBankroll = 0;
    let totalExpectedTargetProfit = 0;
    let completedCount = 0;
    let successfulCount = 0;
    let failedCount = 0;
    let inProgressCount = 0;

    allProgressionStates.forEach(({ state }) => {
      totalInitialBankroll += state.initialBankroll;
      totalCurrentBankroll += state.currentBankroll;
      totalExpectedTargetProfit += state.guaranteedNetProfit;
      if (state.isCompleted) {
        completedCount++;
        if (state.isSuccessful) successfulCount++;
        else if (state.isFailed) failedCount++;
      } else {
        inProgressCount++;
      }
    });

    const netProfitRealized = Math.round((totalCurrentBankroll - totalInitialBankroll) * 100) / 100;
    const netProfitPct = totalInitialBankroll > 0
      ? Math.round((netProfitRealized / totalInitialBankroll) * 1000) / 10
      : 0;

    return {
      totalProgressions: progressions.length,
      totalInitialBankroll,
      totalCurrentBankroll: Math.round(totalCurrentBankroll * 100) / 100,
      totalExpectedTargetProfit: Math.round(totalExpectedTargetProfit * 100) / 100,
      netProfitRealized,
      netProfitPct,
      completedCount,
      successfulCount,
      failedCount,
      inProgressCount,
    };
  }, [allProgressionStates, progressions.length]);

  // Selezione progressione attiva
  const handleSelectProgression = (id: string) => {
    setActiveProgressionId(id);
    try {
      localStorage.setItem('bet_masaniello_active_id', id);
    } catch (e) {}
  };

  // Creazione nuova progressione
  const handleCreateNewProgression = () => {
    const newProg = createNewProgression(newProgName.trim() || 'Nuova Progressione', {
      bankroll: Math.max(10, newProgBankroll || 100),
      totalEvents: Math.max(2, Math.min(30, newProgEvents || 10)),
      referenceWinRate: Math.max(50, Math.min(95, newProgWinRate || 66)),
      defaultOdds: Math.max(1.05, newProgOdds || 1.80),
    });

    const updated = [...progressions, newProg];
    persistProgressions(updated, newProg.id);
    setShowNewProgModal(false);
  };

  // Duplicazione progressione attiva (Clone per test o divisione cassa)
  const handleDuplicateActiveProgression = () => {
    const clonedConfig = { ...activeProgression.config };
    const clonedSteps: MasanielloStepItem[] = activeProgression.steps.map(s => ({
      ...s,
      status: 'pending', // la copia riparte come nuovo ciclo
      bankrollAfter: undefined,
    }));

    const clonedProg: MasanielloProgression = {
      id: `mas_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${activeProgression.name} (Copia)`,
      createdAt: new Date().toISOString(),
      config: clonedConfig,
      steps: clonedSteps,
    };

    const updated = [...progressions, clonedProg];
    persistProgressions(updated, clonedProg.id);
  };

  // Eliminazione progressione
  const handleDeleteProgression = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (progressions.length <= 1) {
      alert('Deve essere presente almeno una progressione attiva.');
      return;
    }
    const targetProg = progressions.find(p => p.id === id);
    if (!window.confirm(`Sei sicuro di voler eliminare la progressione "${targetProg?.name || id}"?`)) {
      return;
    }

    const updated = progressions.filter(p => p.id !== id);
    const nextActiveId = activeProgressionId === id ? updated[0].id : activeProgressionId;
    persistProgressions(updated, nextActiveId);
  };

  // Inizio rinomina inline
  const handleStartRename = (prog: MasanielloProgression, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProgId(prog.id);
    setEditingProgName(prog.name);
  };

  // Salva rinomina inline
  const handleSaveRename = (id: string) => {
    if (!editingProgName.trim()) {
      setEditingProgId(null);
      return;
    }
    const updated = progressions.map(p => (p.id === id ? { ...p, name: editingProgName.trim() } : p));
    persistProgressions(updated);
    setEditingProgId(null);
  };

  // Modifica parametri di configurazione per la progressione attiva
  const handleConfigChange = (patch: Partial<MasanielloConfig>) => {
    const updatedConfig = { ...activeProgression.config, ...patch };

    // Se cambia il numero totale di eventi N
    if (patch.totalEvents !== undefined && patch.totalEvents !== activeProgression.config.totalEvents) {
      const newN = patch.totalEvents;
      // Ricalcola K atteso dal Win Rate
      updatedConfig.expectedWins = Math.max(1, Math.min(newN, Math.round(newN * (updatedConfig.referenceWinRate / 100))));

      // Aggiorna la lunghezza dell'array degli step
      let updatedSteps = [...activeProgression.steps];
      if (newN > activeProgression.steps.length) {
        const extra: MasanielloStepItem[] = Array.from({ length: newN - activeProgression.steps.length }, (_, idx) => ({
          stepIndex: activeProgression.steps.length + idx + 1,
          eventName: `Evento ${activeProgression.steps.length + idx + 1}`,
          odds: updatedConfig.defaultOdds,
          stake: 0,
          stakePercent: 0,
          potentialWin: 0,
          potentialNet: 0,
          status: 'pending',
        }));
        updatedSteps = [...updatedSteps, ...extra];
      } else {
        updatedSteps = updatedSteps.slice(0, newN);
      }

      const updatedProgressions = progressions.map(p =>
        p.id === activeProgression.id ? { ...p, config: updatedConfig, steps: updatedSteps } : p
      );
      persistProgressions(updatedProgressions);
      return;
    }

    // Se cambia il Win Rate di Riferimento
    if (patch.referenceWinRate !== undefined) {
      // Ricalcola K atteso automaticamente
      updatedConfig.expectedWins = Math.max(1, Math.min(updatedConfig.totalEvents, Math.round(updatedConfig.totalEvents * (patch.referenceWinRate / 100))));
    }

    const updatedProgressions = progressions.map(p =>
      p.id === activeProgression.id ? { ...p, config: updatedConfig } : p
    );
    persistProgressions(updatedProgressions);
  };

  // Aggiorna lo stato di un singolo step nella progressione attiva
  const handleUpdateStepStatus = (stepIndex: number, newStatus: StepStatus) => {
    const updatedSteps = activeProgression.steps.map(s => {
      if (s.stepIndex === stepIndex) {
        return { ...s, status: newStatus };
      }
      return s;
    });

    const updatedProgressions = progressions.map(p =>
      p.id === activeProgression.id ? { ...p, steps: updatedSteps } : p
    );
    persistProgressions(updatedProgressions);
  };

  // Modifica quota o descrizione per un singolo step
  const handleUpdateStepField = (stepIndex: number, patch: Partial<MasanielloStepItem>) => {
    const updatedSteps = activeProgression.steps.map(s => {
      if (s.stepIndex === stepIndex) {
        return { ...s, ...patch };
      }
      return s;
    });

    const updatedProgressions = progressions.map(p =>
      p.id === activeProgression.id ? { ...p, steps: updatedSteps } : p
    );
    persistProgressions(updatedProgressions);
  };

  // Applica quota di default a tutti gli step in attesa
  const handleApplyDefaultOddsToAll = () => {
    const updatedSteps = activeProgression.steps.map(s =>
      s.status === 'pending' ? { ...s, odds: activeProgression.config.defaultOdds } : s
    );
    const updatedProgressions = progressions.map(p =>
      p.id === activeProgression.id ? { ...p, steps: updatedSteps } : p
    );
    persistProgressions(updatedProgressions);
  };

  /**
   * RESET CICLO COMPLETO RICHIESTO DALL'UTENTE:
   * "il tasto reset ciclo deve azzerare tutto, compreso le partite caricate"
   * Azzera tutti gli step della progressione attuale (status, quote personalizzate e nomi partite),
   * ripristinando "Evento 1..N" e quote default.
   */
  const handleExecuteResetProgressOnly = () => {
    const resetProg = resetProgressionCycle(activeProgression, true);
    const updatedProgressions = progressions.map(p => (p.id === activeProgression.id ? resetProg : p));
    persistProgressions(updatedProgressions);
    setShowResetConfirmModal(false);
  };

  /**
   * RESET TOTALE COMPRESO ARCHIVIO PARTITE DELL'APPLICAZIONE
   */
  const handleExecuteResetAllAppMatches = () => {
    // Azzera progressioni attuali
    const resetProg = resetProgressionCycle(activeProgression, true);
    const updatedProgressions = progressions.map(p => (p.id === activeProgression.id ? resetProg : p));
    persistProgressions(updatedProgressions);

    // Svuota partite caricate nel palinsesto e database storico
    if (onClearAllMatches) {
      onClearAllMatches();
    }
    setShowResetConfirmModal(false);
  };

  // Importa i pronostici salvati o le partite evidenziate con Win Rate >= 66% (escludendo quote impossibili 1.00)
  const handleImportSuggestedPredictions = () => {
    // Filtra ed esclude le partite con quota anomala = 1.00
    const highWinMatches = sisalMatches.filter(
      m => !m.hasImpossibleOdds && m.highWinRate1X2 && m.highWinRate1X2.winRatePct >= 66 && m.highWinRate1X2.odd > 1.001
    );

    const updatedSteps = [...activeProgression.steps];
    let importIdx = 0;

    // Dai la precedenza ai pronostici salvati se presenti
    if (savedPredictions.length > 0) {
      const validPredictions = savedPredictions.filter(p => p.odd > 1.001);
      for (let i = 0; i < updatedSteps.length && importIdx < validPredictions.length; i++) {
        if (updatedSteps[i].status === 'pending') {
          const prono = validPredictions[importIdx];
          updatedSteps[i].eventName = `${prono.homeTeam} - ${prono.awayTeam} (${prono.market}: ${prono.selection})`;
          updatedSteps[i].odds = Math.max(1.05, prono.odd);
          importIdx++;
        }
      }
    } else {
      for (let i = 0; i < updatedSteps.length && importIdx < highWinMatches.length; i++) {
        if (updatedSteps[i].status === 'pending') {
          const match = highWinMatches[importIdx];
          const hw = match.highWinRate1X2!;
          updatedSteps[i].eventName = `${match.squadra1} - ${match.squadra2} (${hw.outcomeLabel} @ ${hw.odd.toFixed(2)})`;
          updatedSteps[i].odds = Math.max(1.05, hw.odd);
          importIdx++;
        }
      }
    }

    const updatedProgressions = progressions.map(p =>
      p.id === activeProgression.id ? { ...p, steps: updatedSteps } : p
    );
    persistProgressions(updatedProgressions);
    setShowImportModal(false);
  };

  // Win rate medio calcolato dall'archivio pronostici salvati
  const savedArchiveWinRate = useMemo(() => {
    if (!savedPredictions || savedPredictions.length === 0) return 66;
    const settled = savedPredictions.filter(p => p.status === 'won' || p.status === 'lost');
    if (settled.length === 0) return 66;
    const wins = settled.filter(p => p.status === 'won').length;
    return Math.round((wins / settled.length) * 100);
  }, [savedPredictions]);

  return (
    <div className="space-y-6">
      {/* Intestazione Titolo & Spiegazione */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Money Management: Masaniello Multi-Progressione
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-medium">
                  {progressions.length} Progressioni Attive
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Gestisci più progressioni in contemporanea con calibrazione su Win Rate atteso e utile garantito invariante
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>{showGuide ? 'Nascondi Guida' : 'Come Funziona'}</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
          >
            <BookmarkPlus className="w-4 h-4" />
            <span>Importa Pronostici</span>
          </button>

          {/* PULSANTE RESET CICLO: AZZERA TUTTO COMPRESO LE PARTITE CARICATE */}
          <button
            onClick={() => setShowResetConfirmModal(true)}
            title="Azzera il ciclo attuale, cancellando tutte le partite caricate e ripristinando la cassa iniziale"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-950/30 text-rose-300 transition-colors cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset Ciclo</span>
          </button>
        </div>
      </div>

      {/* RIEPILOGO GLOBALE MULTI-PROGRESSIONE (PORTFOLIO CASH MANAGEMENT) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Quadro Globale Portafoglio Progressioni
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {portfolioStats.inProgressCount} in corso · {portfolioStats.successfulCount} vinte · {portfolioStats.failedCount} interrotte
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Cassa Totale Impegnata</span>
            <div className="text-base font-bold text-white font-mono mt-0.5">
              {portfolioStats.totalInitialBankroll.toFixed(2)} €
            </div>
            <span className="text-[10px] text-slate-500">su {portfolioStats.totalProgressions} progressioni</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Saldo Cassa Attuale</span>
            <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
              {portfolioStats.totalCurrentBankroll.toFixed(2)} €
            </div>
            <span className="text-[10px] text-slate-500">patrimonio liquido attuale</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Utile Netto Realizzato</span>
            <div className={`text-base font-bold font-mono mt-0.5 ${portfolioStats.netProfitRealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {portfolioStats.netProfitRealized >= 0 ? `+${portfolioStats.netProfitRealized.toFixed(2)}` : portfolioStats.netProfitRealized.toFixed(2)} €
            </div>
            <span className={`text-[10px] font-mono ${portfolioStats.netProfitPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ROI: {portfolioStats.netProfitPct >= 0 ? '+' : ''}{portfolioStats.netProfitPct}%
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Target Finale Atteso</span>
            <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
              +{portfolioStats.totalExpectedTargetProfit.toFixed(2)} €
            </div>
            <span className="text-[10px] text-slate-500">al conseguimento degli obiettivi K</span>
          </div>
        </div>
      </div>

      {/* SELETTORE A SCHEDE MULTI-PROGRESSIONE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Progressioni Masaniello in Parallelo
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDuplicateActiveProgression}
              title="Duplica la progressione attiva per testare varianti o dividere la cassa"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplica Attiva</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNewProgModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nuova Progressione</span>
            </button>
          </div>
        </div>

        {/* Tab Bar delle Progressioni */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {progressions.map((prog) => {
            const isActive = prog.id === activeProgression.id;
            const pState = allProgressionStates.find(s => s.progression.id === prog.id)?.state;
            const isEditing = editingProgId === prog.id;

            return (
              <div
                key={prog.id}
                onClick={() => !isEditing && handleSelectProgression(prog.id)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-all shrink-0 ${
                  isActive
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {/* Status indicator icon */}
                {pState?.isSuccessful ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : pState?.isFailed ? (
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}

                {/* Nome progressione */}
                {isEditing ? (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editingProgName}
                      onChange={e => setEditingProgName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveRename(prog.id);
                        if (e.key === 'Escape') setEditingProgId(null);
                      }}
                      autoFocus
                      className="py-0.5 px-1.5 bg-slate-900 border border-emerald-500 rounded text-xs text-white font-medium focus:outline-none w-36"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRename(prog.id)}
                      className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProgId(null)}
                      className="p-1 text-slate-400 hover:bg-slate-800 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{prog.name}</span>
                    <button
                      type="button"
                      onClick={e => handleStartRename(prog, e)}
                      title="Rinomina progressione"
                      className="opacity-0 group-hover:opacity-100 hover:text-white p-0.5 text-slate-500 transition-opacity"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Badge di stato e cassa */}
                {pState && (
                  <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                    pState.isSuccessful
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                      : pState.isFailed
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {pState.winsCount}/{pState.expectedWins} vinte ({pState.currentBankroll}€)
                  </span>
                )}

                {/* Delete button (se > 1) */}
                {progressions.length > 1 && !isEditing && (
                  <button
                    type="button"
                    onClick={e => handleDeleteProgression(prog.id, e)}
                    title="Elimina progressione"
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Guida Rapida Didattica (Collassabile) */}
      {showGuide && (
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-5 space-y-3 text-xs leading-relaxed text-slate-300">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Principio Matematico del Masaniello con Win Rate di Riferimento</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <strong className="text-white block font-sans">1. Parametro Win Rate di Riferimento ($WR\%$)</strong>
              <p className="text-slate-400">
                Impostando il Win Rate (es. <strong>{activeProgression.config.referenceWinRate}%</strong>), il Masaniello calcola automaticamente quante partite vincenti ($K$) sono statisticamente attese su $N$ eventi: 
                <span className="font-mono text-emerald-300 block mt-0.5">K = round(N × {activeProgression.config.referenceWinRate}%) = {activeState.expectedWins} eventi</span>
              </p>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <strong className="text-white block font-sans">2. Invarianza dell'Utile Finale Garantito</strong>
              <p className="text-slate-400">
                A differenza di martingala o raddoppi rischiosi, il Masaniello calcola ogni singola puntata tramite combinatoria backward: qualunque sia l'ordine temporale (vinte subito o alla fine), centrando almeno $K$ eventi su $N$ si ottiene l'utile garantito prestabilito.
              </p>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <strong className="text-white block font-sans">3. Chiusura Anticipata in Vincita</strong>
              <p className="text-slate-400">
                Se ottieni le $K$ vittorie prima del completamento degli $N$ eventi, il ciclo si chiude automaticamente in utile garantito senza rischiare oltre la cassa!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PANNELLO IMPOSTAZIONI PARAMETRI DELLA PROGRESSIONE ATTIVA */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Parametri Fondamentali: {activeProgression.name}
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Eventi Totali: {activeProgression.config.totalEvents} · Obiettivo: {activeState.expectedWins} su {activeProgression.config.totalEvents}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Cassa Iniziale */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>Cassa Iniziale (€)</span>
              <span className="text-emerald-400 font-mono font-bold">{activeProgression.config.bankroll} €</span>
            </label>
            <input
              type="number"
              min="10"
              max="50000"
              step="10"
              value={activeProgression.config.bankroll}
              onChange={e => handleConfigChange({ bankroll: Math.max(10, parseFloat(e.target.value) || 100) })}
              className="w-full py-1.5 px-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
            />
            <div className="flex gap-1 pt-1">
              {[50, 100, 200, 500].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleConfigChange({ bankroll: val })}
                  className={`flex-1 py-0.5 text-[10px] rounded font-mono cursor-pointer ${
                    activeProgression.config.bankroll === val ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  {val}€
                </button>
              ))}
            </div>
          </div>

          {/* Numero Totale di Eventi N */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>Numero Eventi (N)</span>
              <span className="text-white font-mono font-bold">{activeProgression.config.totalEvents} partite</span>
            </label>
            <input
              type="number"
              min="2"
              max="30"
              value={activeProgression.config.totalEvents}
              onChange={e => handleConfigChange({ totalEvents: Math.max(2, Math.min(30, parseInt(e.target.value) || 10)) })}
              className="w-full py-1.5 px-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
            />
            <div className="flex gap-1 pt-1">
              {[6, 8, 10, 12, 15].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleConfigChange({ totalEvents: val })}
                  className={`flex-1 py-0.5 text-[10px] rounded font-mono cursor-pointer ${
                    activeProgression.config.totalEvents === val ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* PARAMETRO SPECIFICO: WIN RATE DI RIFERIMENTO */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
              <span className="text-amber-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Win Rate Riferimento (%)
              </span>
              <span className="text-amber-400 font-mono font-bold text-xs">{activeProgression.config.referenceWinRate}%</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="50"
                max="95"
                step="1"
                value={activeProgression.config.referenceWinRate}
                onChange={e => handleConfigChange({ referenceWinRate: parseInt(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <span className="font-mono text-xs text-white font-bold w-12 text-right">
                {activeProgression.config.referenceWinRate}%
              </span>
            </div>
            {/* Preset Win Rate */}
            <div className="flex gap-1 pt-1">
              <button
                type="button"
                onClick={() => handleConfigChange({ referenceWinRate: 66 })}
                title="Soglia Win Rate 66% usata nel Palinsesto e nelle Quote Bet365"
                className={`flex-1 py-0.5 text-[10px] rounded font-mono cursor-pointer ${
                  activeProgression.config.referenceWinRate === 66 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400 hover:text-amber-300'
                }`}
              >
                66% (Filtro)
              </button>
              <button
                type="button"
                onClick={() => handleConfigChange({ referenceWinRate: 70 })}
                className={`flex-1 py-0.5 text-[10px] rounded font-mono cursor-pointer ${
                  activeProgression.config.referenceWinRate === 70 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400 hover:text-amber-300'
                }`}
              >
                70%
              </button>
              <button
                type="button"
                onClick={() => handleConfigChange({ referenceWinRate: savedArchiveWinRate })}
                title={`Usa Win Rate medio calcolato dall'archivio dei pronostici salvati (${savedArchiveWinRate}%)`}
                className={`flex-1 py-0.5 text-[10px] rounded font-mono cursor-pointer ${
                  activeProgression.config.referenceWinRate === savedArchiveWinRate ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400 hover:text-amber-300'
                }`}
              >
                Archivio ({savedArchiveWinRate}%)
              </button>
            </div>
          </div>

          {/* Quota di Riferimento & K atteso */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
              <span>Quota Media Default</span>
              <span className="text-white font-mono font-bold">@ {activeProgression.config.defaultOdds.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1.10"
                max="10.00"
                step="0.05"
                value={activeProgression.config.defaultOdds}
                onChange={e => handleConfigChange({ defaultOdds: Math.max(1.05, parseFloat(e.target.value) || 1.80) })}
                className="w-full py-1.5 px-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleApplyDefaultOddsToAll}
                title="Applica questa quota a tutti gli step ancora in attesa"
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 rounded whitespace-nowrap cursor-pointer"
              >
                Applica a Tutti
              </button>
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
              <span>Vittorie Richieste (K):</span>
              <span className="font-mono text-emerald-400 font-bold">
                {activeState.expectedWins} su {activeProgression.config.totalEvents} ({Math.round((activeState.expectedWins / activeProgression.config.totalEvents) * 100)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD STATO FINANZIARIO & RESA GARANTITA DELLA PROGRESSIONE ATTIVA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Cassa Residua / Attuale */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Cassa Attuale / Iniziale</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white flex items-baseline gap-2">
            <span>{activeState.currentBankroll.toFixed(2)} €</span>
            <span className="text-xs text-slate-500 font-normal">/ {activeState.initialBankroll} €</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 pt-1 flex items-center justify-between">
            <span>Variazione Netta:</span>
            <span className={activeState.currentBankroll >= activeState.initialBankroll ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {activeState.currentBankroll >= activeState.initialBankroll ? '+' : ''}
              {(activeState.currentBankroll - activeState.initialBankroll).toFixed(2)} €
            </span>
          </div>
        </div>

        {/* Resa Finale Garantita */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Cassa Finale Garantita (a K vinte)</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-300">
            {activeState.finalGuaranteedBankroll.toFixed(2)} €
          </div>
          <div className="text-[11px] font-mono text-emerald-400 pt-1 flex items-center justify-between">
            <span>Utile Netto Garantito:</span>
            <span className="font-bold">+{activeState.guaranteedNetProfit.toFixed(2)} € (+{activeState.guaranteedRoiPct}%)</span>
          </div>
        </div>

        {/* Obiettivo e Successi */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Avanzamento Obiettivo K</span>
            <Target className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white flex items-baseline gap-2">
            <span className="text-emerald-400">{activeState.winsCount} vinte</span>
            <span className="text-xs text-slate-500 font-normal">/ servono {activeState.expectedWins}</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 pt-1 flex items-center justify-between">
            <span>Mancano alla Cassa Finale:</span>
            <span className="text-amber-400 font-bold">{Math.max(0, activeState.expectedWins - activeState.winsCount)} vittorie</span>
          </div>
        </div>

        {/* Probabilità di Successo Binomiale */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Probabilità Binomiale di Chiusura</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-300">
            {activeState.binomialProbSuccess}%
          </div>
          <div className="text-[11px] font-mono text-slate-400 pt-1 flex items-center justify-between">
            <span>Valore Atteso (EV):</span>
            <span className={activeState.expectedValue >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {activeState.expectedValue >= 0 ? '+' : ''}{activeState.expectedValue.toFixed(2)} €
            </span>
          </div>
        </div>
      </div>

      {/* BANNER DI STATO VITTORIA O INTERRUZIONE */}
      {activeState.isSuccessful && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-center justify-between gap-4 text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <strong className="text-white text-sm block">Obiettivo Raggiunto con Successo!</strong>
              <span>
                Hai centrato le {activeState.expectedWins} vittorie richieste. Cassa finale garantita di {activeState.finalGuaranteedBankroll} € (Utile netto: +{activeState.guaranteedNetProfit} €).
              </span>
            </div>
          </div>
          <button
            onClick={handleExecuteResetProgressOnly}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs whitespace-nowrap cursor-pointer"
          >
            Avvia Nuovo Ciclo
          </button>
        </div>
      )}

      {activeState.isFailed && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-center justify-between gap-4 text-rose-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <strong className="text-white text-sm block">Ciclo Interrotto: Troppe Sconfitte</strong>
              <span>
                Con {activeState.lossesCount} eventi persi, non ci sono abbastanza eventi rimanenti per raggiungere le {activeState.expectedWins} vittorie richieste. Puoi resettare il ciclo.
              </span>
            </div>
          </div>
          <button
            onClick={handleExecuteResetProgressOnly}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs whitespace-nowrap cursor-pointer"
          >
            Reset Ciclo
          </button>
        </div>
      )}

      {/* TABELLA DI MARCIA INTERATTIVA PASSO-PASSO DELLA PROGRESSIONE ATTIVA */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-0">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Tabella Operativa Step-by-Step: {activeProgression.name}
            </h3>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              (Lo Stake si ricalcola automaticamente ad ogni esito inserito)
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Prossima Giocata:</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
              Step #{activeState.currentStepIndex}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 font-medium">
                <th className="py-2.5 px-3 w-16 text-center">Step</th>
                <th className="py-2.5 px-3 min-w-[220px]">Evento / Pronostico Associato</th>
                <th className="py-2.5 px-3 w-28 text-center">Quota (Q)</th>
                <th className="py-2.5 px-3 w-32 text-center bg-emerald-950/20 text-emerald-300 font-bold border-l border-slate-800">
                  Stake Calcolato
                </th>
                <th className="py-2.5 px-3 w-28 text-center">Vincita Potenziale</th>
                <th className="py-2.5 px-3 w-44 text-center border-l border-slate-800">Esito Reale</th>
                <th className="py-2.5 px-3 w-28 text-right font-mono">Cassa Residua</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {activeState.steps.map((step) => {
                const isCurrent = step.stepIndex === activeState.currentStepIndex && !activeState.isCompleted;
                const isWon = step.status === 'won';
                const isLost = step.status === 'lost';
                const isPending = step.status === 'pending';

                return (
                  <tr
                    key={step.stepIndex}
                    className={`transition-colors ${
                      isCurrent
                        ? 'bg-amber-500/10 hover:bg-amber-500/15'
                        : isWon
                        ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                        : isLost
                        ? 'bg-rose-500/5 hover:bg-rose-500/10'
                        : 'hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Numero Step */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isWon
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : isLost
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : isCurrent
                            ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/40 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {step.stepIndex}
                        </span>
                      </div>
                    </td>

                    {/* Descrizione Evento */}
                    <td className="py-3 px-3 font-sans">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={step.eventName}
                          placeholder={`Evento ${step.stepIndex}`}
                          onChange={e => handleUpdateStepField(step.stepIndex, { eventName: e.target.value })}
                          className="w-full py-1 px-2 bg-transparent border border-transparent hover:border-slate-800 focus:border-emerald-500 focus:bg-slate-950 rounded text-xs text-white placeholder-slate-600 focus:outline-none"
                        />
                      </div>
                    </td>

                    {/* Quota */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min="1.05"
                        max="20.00"
                        step="0.05"
                        value={step.odds}
                        onChange={e => handleUpdateStepField(step.stepIndex, { odds: Math.max(1.05, parseFloat(e.target.value) || 1.80) })}
                        disabled={!isPending && !isCurrent}
                        className={`w-20 py-1 px-1.5 text-center font-bold bg-slate-950 border rounded text-xs focus:outline-none ${
                          step.odds < 1.05
                            ? 'border-rose-500 text-rose-400'
                            : 'border-slate-800 text-white focus:border-emerald-500'
                        }`}
                      />
                    </td>

                    {/* Stake Puntata Calcolato */}
                    <td className="py-3 px-3 text-center bg-emerald-950/10 border-l border-slate-800">
                      {isPending && !isCurrent && activeState.currentStepIndex < step.stepIndex ? (
                        <span className="text-slate-500 text-xs italic">In attesa step prec.</span>
                      ) : (
                        <div>
                          <span className={`text-sm font-bold ${isCurrent ? 'text-amber-300 font-extrabold' : 'text-emerald-300'}`}>
                            {step.stake.toFixed(2)} €
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            ({step.stakePercent.toFixed(1)}% cassa)
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Vincita Potenziale Lorda & Netta */}
                    <td className="py-3 px-3 text-center">
                      {step.stake > 0 ? (
                        <div>
                          <span className="text-xs text-white font-bold">{step.potentialWin.toFixed(2)} €</span>
                          <span className="block text-[10px] text-emerald-400">
                            Netto: +{step.potentialNet.toFixed(2)} €
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Selettore Esito Reale */}
                    <td className="py-3 px-3 text-center border-l border-slate-800">
                      <div className="flex items-center justify-center gap-1 font-sans">
                        <button
                          type="button"
                          onClick={() => handleUpdateStepStatus(step.stepIndex, 'won')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                            isWon
                              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/40'
                              : 'bg-slate-950 hover:bg-emerald-950/40 text-slate-400 hover:text-emerald-300 border border-slate-800'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Vinto</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStepStatus(step.stepIndex, 'lost')}
                          className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                            isLost
                              ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/40'
                              : 'bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800'
                          }`}
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Perso</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStepStatus(step.stepIndex, 'pending')}
                          title="Ripristina step in attesa"
                          className={`px-2 py-1 rounded text-[11px] transition-all cursor-pointer ${
                            isPending
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-slate-950 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          In Attesa
                        </button>
                      </div>
                    </td>

                    {/* Cassa Residua Effettiva */}
                    <td className="py-3 px-3 text-right">
                      {step.bankrollAfter !== undefined ? (
                        <span className={`font-bold ${step.bankrollAfter >= activeState.initialBankroll ? 'text-emerald-300' : 'text-slate-300'}`}>
                          {step.bankrollAfter.toFixed(2)} €
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALE CONFERMA RESET CICLO */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset del Ciclo Masaniello</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Come richiesto, il reset azzera completamente il ciclo comprese le partite caricate.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Rimuove tutti i nomi delle partite caricate dagli step e ripristina "Evento 1..N"</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Ripristina la quota di default ({activeProgression.config.defaultOdds.toFixed(2)}) su tutti gli step</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Azzera tutti gli esiti inseriti (Vinto/Perso) e riparte con la cassa iniziale piena</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleExecuteResetProgressOnly}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Azzera Ciclo e Partite negli Step ({activeProgression.name})</span>
              </button>

              {onClearAllMatches && (
                <button
                  type="button"
                  onClick={handleExecuteResetAllAppMatches}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 font-semibold text-xs transition-colors cursor-pointer border border-rose-500/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Azzera Ciclo + Svuota Tutte le Partite del Palinsesto & Storico</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="w-full py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer text-center"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE CREAZIONE NUOVA PROGRESSIONE */}
      {showNewProgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Crea Nuova Progressione Masaniello</h3>
              </div>
              <button
                onClick={() => setShowNewProgModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Template Presets Rapidi */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Preset Strategia Rapida:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setNewProgName('Serie A 1X2 Standard');
                    setNewProgBankroll(100);
                    setNewProgEvents(10);
                    setNewProgWinRate(66);
                    setNewProgOdds(1.80);
                  }}
                  className="p-2 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-lg text-left"
                >
                  <strong className="text-white block">Serie A 1X2 (66%)</strong>
                  <span className="text-[10px] text-slate-400">10 eventi, cassa 100€, Q 1.80</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewProgName('Singole Alto Win Rate 70%');
                    setNewProgBankroll(150);
                    setNewProgEvents(8);
                    setNewProgWinRate(70);
                    setNewProgOdds(1.65);
                  }}
                  className="p-2 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-lg text-left"
                >
                  <strong className="text-white block">Singole Alto WR (70%)</strong>
                  <span className="text-[10px] text-slate-400">8 eventi, cassa 150€, Q 1.65</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewProgName('Raddoppi Quota 2.00');
                    setNewProgBankroll(50);
                    setNewProgEvents(6);
                    setNewProgWinRate(60);
                    setNewProgOdds(2.00);
                  }}
                  className="p-2 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-lg text-left"
                >
                  <strong className="text-white block">Raddoppi Quota 2.00</strong>
                  <span className="text-[10px] text-slate-400">6 eventi, cassa 50€, Q 2.00</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewProgName('Over 2.5 / Goal Gol');
                    setNewProgBankroll(80);
                    setNewProgEvents(12);
                    setNewProgWinRate(66);
                    setNewProgOdds(1.75);
                  }}
                  className="p-2 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-lg text-left"
                >
                  <strong className="text-white block">Over 2.5 / Goal</strong>
                  <span className="text-[10px] text-slate-400">12 eventi, cassa 80€, Q 1.75</span>
                </button>
              </div>
            </div>

            {/* Campi personalizzabili */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nome Progressione:</label>
                <input
                  type="text"
                  value={newProgName}
                  onChange={e => setNewProgName(e.target.value)}
                  placeholder="Es. Progressione Campionato Inglese"
                  className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Cassa Iniziale (€):</label>
                  <input
                    type="number"
                    min="10"
                    step="10"
                    value={newProgBankroll}
                    onChange={e => setNewProgBankroll(parseFloat(e.target.value) || 100)}
                    className="w-full py-1.5 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Numero Eventi (N):</label>
                  <input
                    type="number"
                    min="2"
                    max="30"
                    value={newProgEvents}
                    onChange={e => setNewProgEvents(parseInt(e.target.value) || 10)}
                    className="w-full py-1.5 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Win Rate Riferimento (%):</label>
                  <input
                    type="number"
                    min="50"
                    max="95"
                    value={newProgWinRate}
                    onChange={e => setNewProgWinRate(parseInt(e.target.value) || 66)}
                    className="w-full py-1.5 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Quota Default:</label>
                  <input
                    type="number"
                    min="1.05"
                    step="0.05"
                    value={newProgOdds}
                    onChange={e => setNewProgOdds(parseFloat(e.target.value) || 1.80)}
                    className="w-full py-1.5 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewProgModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleCreateNewProgression}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer"
              >
                Crea ed Attiva Progressione
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE IMPORTAZIONE PRONOSTICI */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Importa Pronostici nel Masaniello</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                Destinazione: <strong className="text-emerald-400">{activeProgression.name}</strong>
              </p>
              <p className="text-slate-400">
                Puoi importare automaticamente i pronostici salvati nell'archivio oppure le partite del palinsesto con Win Rate storicamente provato ≥ 66% (quota valida &gt; 1.00).
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span>Pronostici Salvati in Archivio:</span>
                <span className="font-mono text-emerald-400 font-bold">{savedPredictions.length} pronostici</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Partite Palinsesto Sisal con WR ≥ 66%:</span>
                <span className="font-mono text-amber-400 font-bold">
                  {sisalMatches.filter(m => !m.hasImpossibleOdds && m.highWinRate1X2 && m.highWinRate1X2.winRatePct >= 66).length} partite
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleImportSuggestedPredictions}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer"
              >
                Importa negli Step in Attesa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
