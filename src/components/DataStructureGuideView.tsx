import React from 'react';
import {
  FileCheck,
  AlertCircle,
  Database,
  Layers,
  CheckCircle2,
  FileText,
  Calculator,
  TrendingUp,
  Percent,
  Cpu,
  Target,
  CornerDownRight,
  ShieldCheck,
  Sparkles,
  Award,
  Scale,
} from 'lucide-react';
import { RoiPattern } from '../types';

interface DataStructureGuideViewProps {
  patterns?: RoiPattern[];
}

export const DataStructureGuideView: React.FC<DataStructureGuideViewProps> = ({ patterns = [] }) => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Intro Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <h2 className="text-base font-bold text-white mb-2">
          Specifiche Dati, Formule Matematiche & Metriche Analizzate
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Guida analitica approfondita alla struttura dei file CSV, all'architettura di normalizzazione quote Sisal,
          e a tutte le metodologie quantitative implementate nella piattaforma: modelli probabilistici avanzati (Dixon-Coles 1997 e Poisson Bivariata 2003),
          cluster quote con tolleranza ≤ 0.10, metriche corner, analisi Win Rate quote Bet365 a soglia ≥ 66%,
          simulatore Monte Carlo e tracciamento validità pronostici con calcolo del ROI storico a massa pari.
        </p>
      </div>

      {/* SEZIONE 1: ELENCO E SPIEGAZIONE DEI CALCOLI FATTI E DELLE METRICHE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Calculator className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-white">
              Elenco Completo dei Calcoli e delle Metriche Analizzate
            </h3>
            <p className="text-xs text-slate-400">
              Formule matematiche, assunzioni teoriche e spiegazione logica passo-passo
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Calcolo 1: Lavagna e Payout */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <Percent className="w-4 h-4" />
              <span>1. Lavagna Bookmaker (Aggio / Overround) e Payout</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              La lavagna rappresenta la somma delle probabilità implicite nelle quote offerte dal bookmaker. Poiché include il margine di profitto, supera sempre il 100%.
            </p>
            <div className="p-2.5 bg-slate-900 rounded font-mono text-[11px] text-emerald-300 border border-slate-800 space-y-1">
              <div>Margine % = [(1 / Q₁ + 1 / Qₓ + 1 / Q₂) - 1] × 100</div>
              <div>Payout % = [100 / (1 / Q₁ + 1 / Qₓ + 1 / Q₂)]</div>
            </div>
            <p className="text-slate-400 text-[10px]">
              Esempio: Quote 1.50, 4.00, 6.00 → Somma prob = 0.667 + 0.250 + 0.167 = 1.083 → Margine = 8.33%, Payout restituito = 92.3%.
            </p>
          </div>

          {/* Calcolo 2: Probabilità Implicite Normalizzate */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-400">
              <Target className="w-4 h-4" />
              <span>2. Probabilità Implicita Reale (Fair Probability)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Per rimuovere l'aggio del bookmaker e ricavare la stima percentuale pura di ciascun esito:
            </p>
            <div className="p-2.5 bg-slate-900 rounded font-mono text-[11px] text-blue-300 border border-slate-800 space-y-1">
              <div>P₁(Reale) = [(1 / Q₁) / SommaProb] × 100</div>
              <div>Pₓ(Reale) = [(1 / Qₓ) / SommaProb] × 100</div>
              <div>P₂(Reale) = [(1 / Q₂) / SommaProb] × 100</div>
            </div>
            <p className="text-slate-400 text-[10px]">
              Permette di confrontare la probabilità stimata dal bookmaker con quella empirica storica del database.
            </p>
          </div>

          {/* Calcolo 3: Modello Dixon & Coles (1997) */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <Scale className="w-4 h-4" />
              <span>3. Modello Dixon & Coles (1997) con Funzione τ</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Risolve il difetto strutturale del modello Poisson puro che sottostima sistematicamente i pareggi e i punteggi bassi (0-0, 1-1). Applica un moltiplicatore correttivo τ(x, y, λ, μ, ρ):
            </p>
            <div className="p-2.5 bg-slate-900 rounded font-mono text-[11px] text-emerald-300 border border-slate-800 space-y-1">
              <div>τ(0, 0) = 1 - λ μ ρ &nbsp;&nbsp;|&nbsp;&nbsp; τ(1, 1) = 1 - ρ</div>
              <div>τ(1, 0) = 1 + μ ρ &nbsp;&nbsp;|&nbsp;&nbsp; τ(0, 1) = 1 + λ ρ</div>
              <div>P_DC(x, y) = P_Poisson(x; λ) × P_Poisson(y; μ) × τ(x, y)</div>
            </div>
            <p className="text-slate-400 text-[10px]">
              Con parametro empirico ρ ≈ -0.12, aumenta sensibilmente la probabilità di 0-0 e 1-1 allineandosi alle quote reali dei bookmaker.
            </p>
          </div>

          {/* Calcolo 4: Modello Poisson Bivariato */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sky-400">
              <Cpu className="w-4 h-4" />
              <span>4. Modello Poisson Bivariato (Karlis & Ntzoufras 2003)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Modella l'interdipendenza tra i gol segnati dalle due squadre introducendo una variabile casuale comune di Poisson con parametro di intensità congiunta λ₃ (covarianza):
            </p>
            <div className="p-2.5 bg-slate-900 rounded font-mono text-[11px] text-sky-300 border border-slate-800 space-y-1">
              <div>X = X₁ + X₃, Y = Y₁ + X₃ con X₃ ~ Poisson(λ₃)</div>
              <div>Cov(X, Y) = λ₃ &nbsp;|&nbsp; Corr(X, Y) = λ₃ / √[(λ₁+λ₃)(λ₂+λ₃)]</div>
            </div>
            <p className="text-slate-400 text-[10px]">
              Ideale per partite ad alto ritmo e intensità (xG totale ≥ 2.3) dove le due squadre si rispondono colpo su colpo.
            </p>
          </div>

          {/* Calcolo 5: Cluster Quote con Tolleranza <= 0.1 */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <ShieldCheck className="w-4 h-4" />
              <span>5. Cluster Quote Storico (Tolleranza Massima ≤ 0.10)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Per ogni match Sisal con quote (Q₁, Qₓ, Q₂), il sistema interroga l'intero archivio storico cercando le partite che ricadono entro la finestra di tolleranza metrica:
            </p>
            <div className="p-2.5 bg-slate-900 rounded font-mono text-[11px] text-amber-300 border border-slate-800">
              |Quota_DB(H) - Q₁| ≤ 0.10 &amp;&amp; |Quota_DB(D) - Qₓ| ≤ 0.10 &amp;&amp; |Quota_DB(A) - Q₂| ≤ 0.10
            </div>
            <p className="text-slate-400 text-[10px]">
              Fornisce frequenze reali empiriche di 1X2, Over 2.5, Goal e medie dei corner per quel preciso profilo di quota.
            </p>
          </div>

          {/* Calcolo 6: Analisi Win Rate Quote Bet365 Singole e a Coppie Ordinate */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span>6. Win Rate Bet365 (Singole & Coppie Ordinate ≥ 66%)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Analizza la frequenza storica di successo di ogni quota Bet365 (H, D, A, Over/Under 2.5) singolarmente e per coppie ordinate: (Casa, Pareggio), (Casa, Ospite), (Pareggio, Ospite):
            </p>
            <div className="p-2.5 bg-slate-900 rounded font-mono text-[11px] text-amber-300 border border-slate-800 space-y-1">
              <div>Win Rate % = (Partite Vincenti / Totale Partite a DB con quella Quota) × 100</div>
              <div>Soglia Evidenziata = Win Rate ≥ 66.0% (Almeno 2 vittorie su 3)</div>
            </div>
            <p className="text-slate-400 text-[10px]">
              Permette di scoprire anomalie statistiche e convergenze ad altissima percentuale vincente.
            </p>
          </div>

          {/* Calcolo 7: Metriche Calci d'Angolo (Corner) */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sky-400">
              <CornerDownRight className="w-4 h-4" />
              <span>7. Metriche Avanzate Calci d'Angolo (Corner)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Estratte dalle colonne HC (Home Corners) e AC (Away Corners) di Football-Data:
            </p>
            <div className="p-2.5 bg-slate-900 rounded font-mono text-[11px] text-sky-300 border border-slate-800 space-y-1">
              <div>Corner Medi = (Σ Corner Fatti) / Match Giocati</div>
              <div>% Over 8.5 / 9.5 / 10.5 = (Partite con HC + AC &gt; soglia) / Totale</div>
            </div>
            <p className="text-slate-400 text-[10px]">
              Viene calcolata anche la propensione difensiva: quanti corner la squadra concede in media agli avversari.
            </p>
          </div>

          {/* Calcolo 8: Value Bet Detector & Fair Odds */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              <span>8. Fair Odds (Quote Eque) & Edge % (Value Bet)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              La quota equa è l'inverso della probabilità stocastica simulata o modellata. Se la quota del bookmaker è superiore, si ha un valore atteso positivo:
            </p>
            <div className="p-2.5 bg-slate-900 rounded font-mono text-[11px] text-emerald-300 border border-slate-800 space-y-1">
              <div>Fair Odd = 1 / P_stimata</div>
              <div>Edge % = [(Quota_Sisal × P_stimata) - 1] × 100</div>
            </div>
            <p className="text-slate-400 text-[10px]">
              Se Edge &gt; +2.0%, la quota Sisal viene contrassegnata come <strong>Value Bet</strong> con vantaggio matematico sul lungo periodo.
            </p>
          </div>

          {/* Calcolo 9: Calcolo del ROI Storico Reale */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <Calculator className="w-4 h-4" />
              <span>9. Calcolo del ROI Storico a Massa Pari (Flat Stake)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Il ROI quantifica la resa percentuale di una strategia scommettendo 1 unità fissa (Flat Stake) su ogni partita dell'archivio storico che soddisfa i parametri del pattern:
            </p>
            <div className="p-2.5 bg-slate-900 rounded font-mono text-[11px] text-amber-300 border border-slate-800 space-y-1">
              <div>Profitto Netto (Unità) = (Σ Quote delle Scommesse Vinte) - Numero Totale Scommesse</div>
              <div>ROI % = (Profitto Netto / Numero Totale Scommesse) × 100</div>
            </div>
            <p className="text-slate-400 text-[10px]">
              Esempio: Su 40 partite vinte 18 a quota media 2.60 → Ritorno = 46.8 unità. Stake = 40 unità. Profitto = +6.8 unità. ROI = <strong>+17.0%</strong>.
            </p>
          </div>

          {/* Calcolo 10: Archivio Pronostici e Tracking Validità */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <Award className="w-4 h-4" />
              <span>10. Archivio Pronostici, Yield & Verifica Validità</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Tutti i suggerimenti generati dai modelli analitici possono essere salvati nell'Archivio Pronostici e validati contro i risultati reali:
            </p>
            <div className="p-2.5 bg-slate-900 rounded font-mono text-[11px] text-emerald-300 border border-slate-800 space-y-1">
              <div>Win Rate Prono % = (Pronostici Vinti / Pronostici Conclusi) × 100</div>
              <div>Yield % = (Profitto Netto Reale / Somma degli Stake Giocati) × 100</div>
            </div>
            <p className="text-slate-400 text-[10px]">
              La funzione "Verifica con Database" automatizza la riconciliazione verificando i risultati effettivi dei match.
            </p>
          </div>

          {/* Calcolo 11: Masaniello Money Management con Win Rate di Riferimento */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <Calculator className="w-4 h-4" />
              <span>11. Money Management: Masaniello & Win Rate di Riferimento</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Sistema di progressione a utile garantito invariante rispetto all'ordine degli eventi.
              Il parametro <strong>Win Rate di Riferimento</strong> ($WR\%$) calcola automaticamente le vincite attese $K$ su $N$ eventi:
            </p>
            <div className="p-2.5 bg-slate-900 rounded font-mono text-[11px] text-emerald-300 border border-slate-800 space-y-1">
              <div>K = round(N × (WinRate / 100))</div>
              <div>Stake_i = Cassa_Attuale × Peso_Combinatorio(n_residui, k_residui, Quota)</div>
              <div>Prob. Binomiale Successo % = Σ_(j=K)^N C(N, j) × p^j × (1-p)^(N-j)</div>
            </div>
            <p className="text-slate-400 text-[10px]">
              Centrando almeno K vincite su N, la vincita finale e il ROI garantito sono costanti indipendentemente da quando si verificano le vittorie.
            </p>
          </div>

          {/* Calcolo 12: Coerenza Segnalazioni Palinsesto vs Dettaglio Match */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>12. Coerenza Segnalazioni Palinsesto vs Dettaglio Match</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Riconciliazione totale tra alert visivi del palinsesto e schermata di dettaglio del match:
            </p>
            <div className="p-2.5 bg-slate-900 rounded font-mono text-[11px] text-emerald-300 border border-slate-800 space-y-1">
              <div>Filtro Palinsesto: Quota Singola Bet365 con Tolleranza ±0.05 e Win Rate ≥ 66%</div>
              <div>Dettaglio Match: Scheda Trasparenza 1X2 Singole (±0.05) + Cluster Congiunto Triplo</div>
            </div>
            <p className="text-slate-400 text-[10px]">
              La sincronizzazione immediata (useEffect) garantisce che cliccando "Insight" nel palinsesto i dati del dettaglio corrispondano esattamente al match selezionato.
            </p>
          </div>
        </div>
      </div>

      {/* SEZIONE 2: PATTERN RICORRENTI SCOPERTI CON ROI POSITIVO */}
      {patterns.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Pattern Ricorrenti & Strategie con ROI Storico Rilevate
                </h3>
                <p className="text-xs text-slate-400">
                  Modelli quantitativi testati empiricamente sull'archivio storico delle partite
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                  <th className="py-2.5 px-3">Nome Pattern</th>
                  <th className="py-2.5 px-2">Categoria</th>
                  <th className="py-2.5 px-3">Mercato Obiettivo</th>
                  <th className="py-2.5 px-2 text-center">Partite Testate</th>
                  <th className="py-2.5 px-2 text-center">Win Rate %</th>
                  <th className="py-2.5 px-2 text-center">Profitto (Unità)</th>
                  <th className="py-2.5 px-3 text-center">ROI Storico %</th>
                  <th className="py-2.5 px-2 text-center">Affidabilità</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {patterns.map(p => (
                  <tr key={p.id} className={p.isPositiveRoi ? 'hover:bg-slate-800/40 bg-emerald-950/10' : 'hover:bg-slate-800/20'}>
                    <td className="py-2.5 px-3 font-sans">
                      <div className="font-semibold text-white">{p.name}</div>
                      <div className="text-[10px] text-slate-500">{p.conditionsText}</div>
                    </td>
                    <td className="py-2.5 px-2 font-sans text-slate-400">{p.category}</td>
                    <td className="py-2.5 px-3 font-sans font-medium text-emerald-300">{p.targetMarket}</td>
                    <td className="py-2.5 px-2 text-center text-slate-300">{p.sampleSize}</td>
                    <td className="py-2.5 px-2 text-center text-slate-300">{p.winRatePct}%</td>
                    <td className={`py-2.5 px-2 text-center font-bold ${p.profitUnits > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {p.profitUnits > 0 ? `+${p.profitUnits}` : p.profitUnits}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        p.roiPct > 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-slate-500'
                      }`}>
                        {p.roiPct > 0 ? `+${p.roiPct}%` : `${p.roiPct}%`}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-sans">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        p.confidence === 'Alta' ? 'text-emerald-400 bg-emerald-500/10' :
                        p.confidence === 'Media' ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500'
                      }`}>
                        {p.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEZIONE 3: File Sisal Grezzo vs Corretto */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <FileCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">
            Specifiche File Quote Sisal: Grezzo vs Corretto
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* File Grezzo */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>File Grezzo ("calcio base per data")</span>
            </div>
            <ul className="space-y-1 text-slate-400 text-[11px] list-disc list-inside">
              <li>Header e footer ripetuti per pagina (<code>www.sisal.it | Quote soggette a variazioni...</code>).</li>
              <li>Data inserita come riga isolata prima delle partite (<code>"domenica, 11 ottobre"</code>).</li>
              <li>Omissione saltuaria della colonna <code>1</code> nelle pagine successive con slittamento quote.</li>
              <li>Numeri formattati con virgola decimale e virgolette miste (<code>"1,75"</code>, <code>3,5</code>, <code>4</code>).</li>
            </ul>
          </div>

          {/* File Corretto */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>File Corretto ("calcio base per data corretto")</span>
            </div>
            <ul className="space-y-1 text-slate-400 text-[11px] list-disc list-inside">
              <li>Pulizia automatica di tutti i banner e intestazioni parassite.</li>
              <li>Rigido allineamento delle 28 colonne per ciascuna riga di match.</li>
              <li>Tutte le quote normalizzate rigorosamente a due decimali (es. <code>"1,75"</code>, <code>"3,50"</code>, <code>"4,00"</code>).</li>
              <li>Pulsante sempre disponibile nell'app: <strong>"Esporta CSV Corretto"</strong>.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
