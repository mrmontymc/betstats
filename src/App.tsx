import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { SisalOddsView } from './components/SisalOddsView';
import { HistoricalStatsView } from './components/HistoricalStatsView';
import { CrossAnalysisView } from './components/CrossAnalysisView';
import { Bet365WinRateView } from './components/Bet365WinRateView';
import { PredictionsArchiveView } from './components/PredictionsArchiveView';
import { MasanielloView } from './components/MasanielloView';
import { DataStructureGuideView } from './components/DataStructureGuideView';
import { FileUploadModal } from './components/FileUploadModal';
import { SisalMatch, HistoricalMatch, SavedPrediction } from './types';
import { parseSisalCsv, parseHistoricalFootballCsv } from './utils/csvParser';
import { calculateTeamSummaries } from './utils/statsCalculator';
import { analyzeHistoricalPatterns, tagSisalMatchesWithPatterns } from './utils/patternMining';

const DEFAULT_SAMPLE_PREDICTIONS: SavedPrediction[] = [
  {
    id: 'prono_sample_1',
    createdAt: new Date().toISOString(),
    matchDate: '23/08/2025',
    matchTime: '17:30',
    homeTeam: 'Genoa',
    awayTeam: 'Lecce',
    league: 'Serie A (I1)',
    market: 'Doppia Chance 1X',
    selection: '1X',
    odd: 1.22,
    modelSource: 'Bet365 Win Rate',
    estimatedProbPct: 78.5,
    status: 'won',
    realScore: '0-0',
    stake: 1,
    payout: 1.22,
    notes: 'Cluster quota 1.90/3.30 con Win Rate storico 1X al 78.5%',
  },
  {
    id: 'prono_sample_2',
    createdAt: new Date().toISOString(),
    matchDate: '24/08/2025',
    matchTime: '20:45',
    homeTeam: 'Atalanta',
    awayTeam: 'Pisa',
    league: 'Serie A (I1)',
    market: '1X2',
    selection: '1',
    odd: 1.40,
    modelSource: 'Dixon-Coles',
    estimatedProbPct: 71.2,
    status: 'won',
    realScore: '2-0',
    stake: 1,
    payout: 1.40,
    notes: 'Dominanza casalinga e stima xG elevata da Dixon-Coles',
  },
  {
    id: 'prono_sample_3',
    createdAt: new Date().toISOString(),
    matchDate: '11/10/2026',
    matchTime: '21.10',
    homeTeam: 'Atletico Go',
    awayTeam: 'Sport Recife',
    league: 'BRA2',
    market: '1X2',
    selection: 'X',
    odd: 3.50,
    modelSource: 'Dixon-Coles',
    estimatedProbPct: 32.5,
    status: 'pending',
    stake: 1,
    notes: 'Correzione tau sui punteggi bassi: alta frequenza 0-0 e 1-1',
  },
  {
    id: 'prono_sample_4',
    createdAt: new Date().toISOString(),
    matchDate: '11/10/2026',
    matchTime: '21.10',
    homeTeam: 'CRB',
    awayTeam: 'Ponte Preta',
    league: 'BRA2',
    market: 'Under/Over 2.5',
    selection: 'Under 2.5',
    odd: 1.55,
    modelSource: 'Poisson Bivariata',
    estimatedProbPct: 68.0,
    status: 'pending',
    stake: 1,
    notes: 'Covarianza ridotta e difese chiuse: probabilità Under al 68%',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'sisal' | 'historical' | 'cross' | 'bet365' | 'predictions' | 'masaniello' | 'guide'>('sisal');
  const [sisalMatches, setSisalMatches] = useState<SisalMatch[]>([]);
  const [historicalMatches, setHistoricalMatches] = useState<HistoricalMatch[]>([]);
  const [savedPredictions, setSavedPredictions] = useState<SavedPrediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedMatchForInsight, setSelectedMatchForInsight] = useState<SisalMatch | null>(null);

  // Caricamento iniziale dei dataset di esempio
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Prova a recuperare da localStorage se presente
      const savedSisal = localStorage.getItem('bet_sisal_matches');
      const savedHistorical = localStorage.getItem('bet_historical_matches');
      const savedProno = localStorage.getItem('bet_saved_predictions');

      if (savedProno) {
        try {
          setSavedPredictions(JSON.parse(savedProno));
        } catch {
          setSavedPredictions(DEFAULT_SAMPLE_PREDICTIONS);
        }
      } else {
        setSavedPredictions(DEFAULT_SAMPLE_PREDICTIONS);
        localStorage.setItem('bet_saved_predictions', JSON.stringify(DEFAULT_SAMPLE_PREDICTIONS));
      }

      if (savedSisal && savedHistorical) {
        setSisalMatches(JSON.parse(savedSisal));
        setHistoricalMatches(JSON.parse(savedHistorical));
        setIsLoading(false);
        return;
      }

      // Altrimenti carica i campioni in /data/
      const [resSisal, resI1] = await Promise.all([
        fetch('/data/sisal_sample.csv').then(r => r.text()),
        fetch('/data/I1_sample.csv').then(r => r.text()),
      ]);

      const parsedSisal = parseSisalCsv(resSisal);
      const parsedHistorical = parseHistoricalFootballCsv(resI1, 'Serie_A_I1.csv');

      setSisalMatches(parsedSisal.matches);
      setHistoricalMatches(parsedHistorical.matches);

      localStorage.setItem('bet_sisal_matches', JSON.stringify(parsedSisal.matches));
      localStorage.setItem('bet_historical_matches', JSON.stringify(parsedHistorical.matches));
    } catch (err) {
      console.error('Errore nel caricamento dei dati iniziali:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Salvataggio sicuro in localStorage protetto da QuotaExceededError
  const safeSetLocalStorage = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.warn(`Spazio di archiviazione insufficiente per ${key} (quota superata):`, err);
    }
  };

  // Reset ai dati di fabbrica
  const handleResetData = async () => {
    localStorage.removeItem('bet_sisal_matches');
    localStorage.removeItem('bet_historical_matches');
    localStorage.removeItem('bet_saved_predictions');
    localStorage.removeItem('bet_masaniello_progressions');
    localStorage.removeItem('bet_masaniello_config');
    localStorage.removeItem('bet_masaniello_steps');
    await loadInitialData();
  };

  // Svuota completamente tutte le partite caricate
  const handleClearAllMatches = () => {
    setSisalMatches([]);
    setHistoricalMatches([]);
    localStorage.removeItem('bet_sisal_matches');
    localStorage.removeItem('bet_historical_matches');
  };

  // Handler aggiunta/sovrascrittura partite Sisal
  const handleAddSisalMatches = (newMatches: SisalMatch[], replace: boolean) => {
    let updated: SisalMatch[];
    if (replace) {
      updated = newMatches;
    } else {
      const existingIds = new Set(sisalMatches.map(m => m.id));
      const fresh = newMatches.filter(m => !existingIds.has(m.id));
      updated = [...sisalMatches, ...fresh];
    }
    setSisalMatches(updated);
    safeSetLocalStorage('bet_sisal_matches', updated);
    setActiveTab('sisal');
  };

  // Handler aggiunta/sovrascrittura partite Storiche
  const handleAddHistoricalMatches = (newMatches: HistoricalMatch[], replace: boolean) => {
    let updated: HistoricalMatch[];
    if (replace) {
      updated = newMatches;
    } else {
      const existingIds = new Set(historicalMatches.map(m => m.id));
      const fresh = newMatches.filter(m => !existingIds.has(m.id));
      updated = [...historicalMatches, ...fresh];
    }
    setHistoricalMatches(updated);
    safeSetLocalStorage('bet_historical_matches', updated);
    setActiveTab('historical');
  };

  // Handler gestione pronostici
  const handleSavePrediction = (newPred: Omit<SavedPrediction, 'id' | 'createdAt'>) => {
    const item: SavedPrediction = {
      ...newPred,
      id: `prono_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [item, ...savedPredictions];
    setSavedPredictions(updated);
    safeSetLocalStorage('bet_saved_predictions', updated);
  };

  const handleUpdatePrediction = (id: string, updates: Partial<SavedPrediction>) => {
    const updated = savedPredictions.map(p => (p.id === id ? { ...p, ...updates } : p));
    setSavedPredictions(updated);
    safeSetLocalStorage('bet_saved_predictions', updated);
  };

  const handleDeletePrediction = (id: string) => {
    const updated = savedPredictions.filter(p => p.id !== id);
    setSavedPredictions(updated);
    safeSetLocalStorage('bet_saved_predictions', updated);
  };

  const handleSelectMatchForInsight = (match: SisalMatch) => {
    setSelectedMatchForInsight(match);
    setActiveTab('cross');
  };

  const handleSendToMasaniello = (odds: number, eventName: string) => {
    const safeOdds = Math.max(1.05, odds);
    try {
      const savedProgs = localStorage.getItem('bet_masaniello_progressions');
      if (savedProgs) {
        const progs: any[] = JSON.parse(savedProgs);
        const activeId = localStorage.getItem('bet_masaniello_active_id');
        const activeProg = progs.find((p: any) => p.id === activeId) || progs[0];
        if (activeProg && Array.isArray(activeProg.steps)) {
          const pendingIdx = activeProg.steps.findIndex((s: any) => s.status === 'pending');
          if (pendingIdx !== -1) {
            activeProg.steps[pendingIdx].odds = safeOdds;
            activeProg.steps[pendingIdx].eventName = eventName;
          } else if (activeProg.steps.length > 0) {
            activeProg.steps[0].odds = safeOdds;
            activeProg.steps[0].eventName = eventName;
          }
          safeSetLocalStorage('bet_masaniello_progressions', progs);
        }
      }

      // Legacy fallback
      const saved = localStorage.getItem('bet_masaniello_steps');
      let stepsList = saved ? JSON.parse(saved) : [];
      const pendingIdx = stepsList.findIndex((s: any) => s.status === 'pending');
      if (pendingIdx !== -1) {
        stepsList[pendingIdx].odds = safeOdds;
        stepsList[pendingIdx].eventName = eventName;
      } else if (stepsList.length > 0) {
        stepsList[0].odds = safeOdds;
        stepsList[0].eventName = eventName;
      }
      safeSetLocalStorage('bet_masaniello_steps', stepsList);
    } catch (e) {
      console.error('Errore popolamento Masaniello:', e);
    }
    setActiveTab('masaniello');
  };

  // Calcolo statistiche e pattern di rendimento
  const teamSummaries = useMemo(() => {
    return calculateTeamSummaries(historicalMatches);
  }, [historicalMatches]);

  const historicalPatterns = useMemo(() => {
    return analyzeHistoricalPatterns(historicalMatches, teamSummaries);
  }, [historicalMatches, teamSummaries]);

  // Match Sisal arricchiti con i pattern e scenari ROI e valutazione 1X2 win rate 0.05
  const processedSisalMatches = useMemo(() => {
    return tagSisalMatchesWithPatterns(sisalMatches, historicalPatterns, teamSummaries, historicalMatches);
  }, [sisalMatches, historicalPatterns, teamSummaries, historicalMatches]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Header con tabs */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sisalCount={processedSisalMatches.length}
        historicalCount={historicalMatches.length}
        predictionsCount={savedPredictions.length}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onResetData={handleResetData}
        isLoading={isLoading}
      />

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-mono">Caricamento ed elaborazione dataset in corso...</p>
          </div>
        ) : (
          <>
            {activeTab === 'sisal' && (
              <SisalOddsView
                matches={processedSisalMatches}
                onSelectMatchForInsight={handleSelectMatchForInsight}
              />
            )}

            {activeTab === 'historical' && (
              <HistoricalStatsView
                matches={historicalMatches}
                onSelectTeamForInsight={(team) => {
                  const match = processedSisalMatches.find(
                    m => m.squadra1.toLowerCase() === team.toLowerCase() ||
                         m.squadra2.toLowerCase() === team.toLowerCase()
                  );
                  if (match) {
                    setSelectedMatchForInsight(match);
                    setActiveTab('cross');
                  }
                }}
              />
            )}

            {activeTab === 'cross' && (
              <CrossAnalysisView
                sisalMatches={processedSisalMatches}
                historicalMatches={historicalMatches}
                initialSelectedMatch={selectedMatchForInsight}
                onSavePrediction={handleSavePrediction}
                onSendToMasaniello={handleSendToMasaniello}
              />
            )}

            {activeTab === 'bet365' && (
              <Bet365WinRateView
                matches={historicalMatches}
                onSavePrediction={handleSavePrediction}
              />
            )}

            {activeTab === 'predictions' && (
              <PredictionsArchiveView
                predictions={savedPredictions}
                onUpdatePrediction={handleUpdatePrediction}
                onDeletePrediction={handleDeletePrediction}
                onAddPrediction={handleSavePrediction}
                historicalMatches={historicalMatches}
              />
            )}

            {activeTab === 'masaniello' && (
              <MasanielloView
                sisalMatches={processedSisalMatches}
                savedPredictions={savedPredictions}
                onNavigateToPalinsesto={() => setActiveTab('sisal')}
                onClearAllMatches={handleClearAllMatches}
                onResetEverything={handleResetData}
              />
            )}

            {activeTab === 'guide' && <DataStructureGuideView patterns={historicalPatterns} />}
          </>
        )}
      </main>

      {/* Footer discreto */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>BetStatistica Pro · Motore Analisi Quote Sisal, Dixon-Coles, Poisson Bivariata & Database Storico</span>
          <span>Supporta formati Sisal Grezzi/Normalizzati, Caricamento Multi-File ed Esportazione CSV</span>
        </div>
      </footer>

      {/* Modal Upload CSV Multiplo */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onAddSisalMatches={handleAddSisalMatches}
        onAddHistoricalMatches={handleAddHistoricalMatches}
      />
    </div>
  );
}
