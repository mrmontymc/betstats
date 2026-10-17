import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  Trash2,
  Database,
  FileSpreadsheet,
  Check,
} from 'lucide-react';
import { parseSisalCsv, parseHistoricalFootballCsv } from '../utils/csvParser';
import { HistoricalMatch, SisalMatch, MultiFileItem } from '../types';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSisalMatches: (matches: SisalMatch[], replace: boolean) => void;
  onAddHistoricalMatches: (matches: HistoricalMatch[], replace: boolean) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onAddSisalMatches,
  onAddHistoricalMatches,
}) => {
  const [fileList, setFileList] = useState<MultiFileItem[]>([]);
  const [replaceMode, setReplaceMode] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Rileva automaticamente se un testo CSV è Sisal o Football-Data
  const detectCsvType = (content: string): 'sisal' | 'historical' => {
    const firstLines = content.slice(0, 800).toLowerCase();
    if (
      firstLines.includes('div,date') ||
      firstLines.includes('hometeam,awayteam') ||
      firstLines.includes('fthg,ftag')
    ) {
      return 'historical';
    }
    if (
      firstLines.includes('calcio per data') ||
      firstLines.includes('manif.,pal.') ||
      firstLines.includes('esito finale') ||
      firstLines.includes('sisal.it')
    ) {
      return 'sisal';
    }
    return 'historical'; // default fallback
  };

  const processFile = async (file: File): Promise<MultiFileItem> => {
    const text = await file.text();
    const detectedType = detectCsvType(text);

    try {
      if (detectedType === 'sisal') {
        const res = parseSisalCsv(text);
        return {
          id: `${file.name}_${file.size}_${Date.now()}`,
          file,
          name: file.name,
          size: file.size,
          detectedType: 'sisal',
          status: 'parsed',
          parsedCount: res.matches.length,
          sisalMatches: res.matches,
          errorMessage: res.errors.length > 0 ? `${res.errors.length} righe ignorate` : undefined,
        };
      } else {
        const res = parseHistoricalFootballCsv(text, file.name);
        return {
          id: `${file.name}_${file.size}_${Date.now()}`,
          file,
          name: file.name,
          size: file.size,
          detectedType: 'historical',
          status: 'parsed',
          parsedCount: res.matches.length,
          historicalMatches: res.matches,
          errorMessage: res.errors.length > 0 ? `${res.errors.length} righe ignorate` : undefined,
        };
      }
    } catch (err) {
      return {
        id: `${file.name}_${file.size}_${Date.now()}`,
        file,
        name: file.name,
        size: file.size,
        detectedType,
        status: 'error',
        parsedCount: 0,
        errorMessage: (err as Error).message,
      };
    }
  };

  const [processingStatus, setProcessingStatus] = useState<string>('');

  const handleFilesSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);

    try {
      const newItems: MultiFileItem[] = [];
      for (let i = 0; i < files.length; i++) {
        setProcessingStatus(`Elaborazione file ${i + 1} di ${files.length}: ${files[i].name}...`);
        // Rilascia il thread UI per evitare freeze del browser
        await new Promise(resolve => setTimeout(resolve, 25));
        const item = await processFile(files[i]);
        newItems.push(item);
      }

      setFileList(prev => [...prev, ...newItems]);
    } catch (err) {
      console.error('Errore durante la lettura dei file:', err);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (id: string) => {
    setFileList(prev => prev.filter(f => f.id !== id));
  };

  const handleTypeToggle = async (id: string, newType: 'sisal' | 'historical') => {
    const item = fileList.find(f => f.id === id);
    if (!item) return;

    const text = await item.file.text();
    if (newType === 'sisal') {
      const res = parseSisalCsv(text);
      setFileList(prev =>
        prev.map(f =>
          f.id === id
            ? {
                ...f,
                detectedType: 'sisal',
                parsedCount: res.matches.length,
                sisalMatches: res.matches,
                historicalMatches: undefined,
              }
            : f
        )
      );
    } else {
      const res = parseHistoricalFootballCsv(text, item.name);
      setFileList(prev =>
        prev.map(f =>
          f.id === id
            ? {
                ...f,
                detectedType: 'historical',
                parsedCount: res.matches.length,
                historicalMatches: res.matches,
                sisalMatches: undefined,
              }
            : f
        )
      );
    }
  };

  // Somme aggregate
  const totalSisalCount = fileList.reduce((acc, f) => acc + (f.sisalMatches?.length || 0), 0);
  const totalHistCount = fileList.reduce((acc, f) => acc + (f.historicalMatches?.length || 0), 0);

  const handleConfirmAll = async () => {
    setIsProcessing(true);
    setProcessingStatus('Integrazione dati nel database...');
    // Pausa breve per permettere al browser di aggiornare la UI
    await new Promise(resolve => setTimeout(resolve, 30));

    try {
      const allSisal: SisalMatch[] = [];
      const allHist: HistoricalMatch[] = [];

      fileList.forEach(f => {
        if (f.sisalMatches) allSisal.push(...f.sisalMatches);
        if (f.historicalMatches) allHist.push(...f.historicalMatches);
      });

      if (allSisal.length > 0) {
        onAddSisalMatches(allSisal, replaceMode);
      }
      if (allHist.length > 0) {
        onAddHistoricalMatches(allHist, replaceMode);
      }
    } catch (err) {
      console.error('Errore durante l\'importazione combinata:', err);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      setFileList([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">Caricamento Multiplo File CSV</h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Multi-File Upload
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Puoi selezionare e caricare più file contemporaneamente (palinsesti Sisal e archivi Football-Data).
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Modalità di inserimento */}
          <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
            <div>
              <span className="text-xs font-medium text-slate-200 block">Gestione dei Dati Esistenti:</span>
              <span className="text-[11px] text-slate-400">
                {replaceMode
                  ? 'Sostituisci completamente i dataset con i nuovi file'
                  : 'Unisci ed accoda i nuovi file (deduplica automatica attiva)'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setReplaceMode(false)}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                  !replaceMode ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Accoda / Unisci
              </button>
              <button
                type="button"
                onClick={() => setReplaceMode(true)}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                  replaceMode ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sovrascrivi
              </button>
            </div>
          </div>

          {/* Upload Drop Zone con multiple selection */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".csv,.txt"
              onChange={e => handleFilesSelect(e.target.files)}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                handleFilesSelect(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-slate-700 hover:border-emerald-500/70 rounded-xl p-6 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/80 group"
            >
              <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-400 mx-auto mb-2 transition-colors" />
              <div className="text-sm font-semibold text-white mb-0.5">
                Trascina qui o clicca per selezionare uno o più file CSV
              </div>
              <p className="text-xs text-slate-400">
                Riconoscimento automatico del tipo di file (Sisal grezzo/corretto oppure Football-Data come I1, E0, ecc.)
              </p>
            </div>
          </div>

          {/* Elenco file selezionati */}
          {fileList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>File in coda ({fileList.length}):</span>
                <span>
                  Totale: <strong className="text-emerald-400 font-mono">{totalSisalCount}</strong> quote Sisal ·{' '}
                  <strong className="text-blue-400 font-mono">{totalHistCount}</strong> match storici
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {fileList.map(item => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.detectedType === 'sisal' ? (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Database className="w-4 h-4 text-blue-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate max-w-[240px]">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {(item.size / 1024).toFixed(1)} KB ·{' '}
                          <strong className="text-slate-300 font-mono">{item.parsedCount} partite</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Selettore tipologia */}
                      <div className="flex bg-slate-900 rounded border border-slate-800 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleTypeToggle(item.id, 'sisal')}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            item.detectedType === 'sisal'
                              ? 'bg-emerald-600 text-white font-semibold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Sisal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTypeToggle(item.id, 'historical')}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            item.detectedType === 'historical'
                              ? 'bg-blue-600 text-white font-semibold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          DB Storico
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(item.id)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-900 transition-colors cursor-pointer"
                        title="Rimuovi file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="p-3 bg-slate-950 rounded-lg text-center text-xs text-slate-400 flex items-center justify-center gap-2 font-mono border border-slate-800">
              <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span>{processingStatus || 'Analisi e pulizia dei file in corso...'}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          <button
            type="button"
            onClick={() => {
              setFileList([]);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            disabled={fileList.length === 0}
            className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30 cursor-pointer"
          >
            Svuota coda
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleConfirmAll}
              disabled={fileList.length === 0 || isProcessing}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Importa Tutti ({fileList.length} file)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
