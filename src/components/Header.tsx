import React from 'react';
import {
  Database,
  FileSpreadsheet,
  GitCompare,
  Info,
  PlusCircle,
  RefreshCw,
  Sparkles,
  Award,
  Calculator,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'sisal' | 'historical' | 'cross' | 'bet365' | 'predictions' | 'masaniello' | 'guide';
  setActiveTab: (tab: 'sisal' | 'historical' | 'cross' | 'bet365' | 'predictions' | 'masaniello' | 'guide') => void;
  sisalCount: number;
  historicalCount: number;
  predictionsCount: number;
  onOpenUpload: () => void;
  onResetData: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  sisalCount,
  historicalCount,
  predictionsCount,
  onOpenUpload,
  onResetData,
  isLoading,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
              ⚽
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-tight">
                  BetStatistica Pro
                </span>
                <span className="text-xs text-emerald-400/80 font-mono font-medium">v1.4</span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Hub Quote Sisal & Statistiche Football-Data
              </p>
            </div>
          </div>

          {/* Navigation Tabs Desktop */}
          <nav className="hidden lg:flex items-center space-x-1 p-1 bg-slate-950/70 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('sisal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'sisal'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Palinsesto Sisal</span>
              <span className="text-[10px] text-slate-500 font-mono">({sisalCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('historical')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'historical'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Archivio Statistico</span>
              <span className="text-[10px] text-slate-500 font-mono">({historicalCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('cross')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'cross'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Incroci & Dixon-Coles</span>
            </button>

            <button
              onClick={() => setActiveTab('bet365')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'bet365'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Win Rate Bet365</span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-mono">≥66%</span>
            </button>

            <button
              onClick={() => setActiveTab('predictions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'predictions'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Archivio Prono</span>
              {predictionsCount > 0 && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {predictionsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('masaniello')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'masaniello'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              <span>Masaniello</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded font-mono">WR%</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Struttura Dati & Formule</span>
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Carica CSV</span>
            </button>

            <button
              onClick={onResetData}
              title="Ricarica dataset iniziale"
              disabled={isLoading}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Medium/Mobile Navigation bar */}
        <div className="lg:hidden flex items-center justify-between overflow-x-auto py-2 border-t border-slate-800 gap-1 text-xs no-scrollbar">
          <button
            onClick={() => setActiveTab('sisal')}
            className={`px-2 py-1 rounded whitespace-nowrap cursor-pointer ${activeTab === 'sisal' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'}`}
          >
            Sisal ({sisalCount})
          </button>
          <button
            onClick={() => setActiveTab('historical')}
            className={`px-2 py-1 rounded whitespace-nowrap cursor-pointer ${activeTab === 'historical' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'}`}
          >
            DB ({historicalCount})
          </button>
          <button
            onClick={() => setActiveTab('cross')}
            className={`px-2 py-1 rounded whitespace-nowrap cursor-pointer ${activeTab === 'cross' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'}`}
          >
            Incroci
          </button>
          <button
            onClick={() => setActiveTab('bet365')}
            className={`px-2 py-1 rounded whitespace-nowrap cursor-pointer ${activeTab === 'bet365' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'}`}
          >
            Win Rate ≥66%
          </button>
          <button
            onClick={() => setActiveTab('predictions')}
            className={`px-2 py-1 rounded whitespace-nowrap cursor-pointer ${activeTab === 'predictions' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'}`}
          >
            Archivio Prono ({predictionsCount})
          </button>
          <button
            onClick={() => setActiveTab('masaniello')}
            className={`px-2 py-1 rounded whitespace-nowrap cursor-pointer ${activeTab === 'masaniello' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'}`}
          >
            Masaniello
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-2 py-1 rounded whitespace-nowrap cursor-pointer ${activeTab === 'guide' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'}`}
          >
            Formule
          </button>
        </div>
      </div>
    </header>
  );
};
