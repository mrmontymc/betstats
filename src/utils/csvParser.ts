import { HistoricalMatch, SisalMatch } from '../types';

/**
 * Utility per fare il parse di una riga CSV rispettando campi con virgolette e virgole interne
 */
export function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Converte una stringa di quota italiana (es. "1,75", "3,5", "4", "4,00") in numero
 */
export function parseItalianNumber(val: string | undefined | null): number | null {
  if (!val) return null;
  const cleaned = val.replace(/"/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned === '0' || cleaned === '0,00' || cleaned === '0.00') {
    return null;
  }
  const normalized = cleaned.replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) || num <= 0 ? null : Math.round(num * 100) / 100;
}

/**
 * Parser per i file quote Sisal ("calcio base per data" grezzo o corretto)
 */
export function parseSisalCsv(csvText: string): {
  matches: SisalMatch[];
  errors: string[];
  rawCount: number;
} {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const matches: SisalMatch[] = [];
  const errors: string[] = [];

  let currentDate = 'Data non specificata';

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex];

    // Ignora righe di intestazione generale o copyright Sisal
    if (
      rawLine.toUpperCase().startsWith('CALCIO PER DATA') ||
      rawLine.includes('www.sisal.it') ||
      rawLine.includes('Quote soggette a variazioni') ||
      rawLine.includes('Esito Finale') ||
      rawLine.includes('Under / Over') ||
      rawLine.includes('GoalNoGoal') ||
      rawLine.includes('Segna goal')
    ) {
      continue;
    }

    // Se è la riga delle colonne (Ora,Manif.,Pal.,Avv...)
    if (rawLine.startsWith('Ora,Manif.') || rawLine.startsWith('Ora,Manif,')) {
      continue;
    }

    // Riconoscimento della data: es. "domenica, 11 ottobre", "lunedì, 12 ottobre", "martedì, 13 ottobre"
    const isDateHeader = /^(domenica|lunedì|martedì|mercoledì|giovedì|venerdì|sabato)/i.test(
      rawLine.replace(/"/g, '').trim()
    );

    if (isDateHeader) {
      // Estrai il nome della data pulito
      const dateParts = splitCsvLine(rawLine);
      currentDate = dateParts[0].replace(/"/g, '').trim();
      continue;
    }

    // Altrimenti è una riga di partita
    const cells = splitCsvLine(rawLine);

    // Una riga valida di match Sisal inizia con un orario (es. 21.10 o 21:10 o 01.00) e contiene il codice Manif.
    const timeMatch = cells[0]?.match(/^\d{1,2}[\.:]\d{2}$/);
    if (!timeMatch || cells.length < 6) {
      continue;
    }

    try {
      const ora = cells[0].replace(':', '.');
      const manif = cells[1];
      const pal = cells[2];
      const avv = cells[3];
      const squadra1 = cells[4];
      const squadra2 = cells[5];

      // Verifichiamo se le quote partono dall'indice 6 o 7 (gestione scostamento del file grezzo vs corretto)
      // Nel file grezzo:
      // riga: Ora,Manif.,Pal.,Avv.,Squadra 1,Squadra 2,1,X,2,H,1,X,2,1X,X2,12,U,O,U,O,U,O,G,NG,SI,NO,SI,NO
      // indici:
      // [6] = 1, [7] = X, [8] = 2, [9] = H
      // [10] = H1, [11] = HX, [12] = H2
      // [13] = 1X, [14] = X2, [15] = 12
      // [16] = U1.5, [17] = O1.5
      // [18] = U2.5, [19] = O2.5
      // [20] = U3.5, [21] = O3.5
      // [22] = Goal, [23] = NoGoal
      // [24] = Casa SI, [25] = Casa NO
      // [26] = Ospite SI, [27] = Ospite NO
      //
      // In alcune righe del file "corretto", notiamo che cells[6] è vuoto e la quota 1 è in cells[7], oppure
      // verifichiamo la posizione dinamica in base al primo valore numerico:
      let offset = 6;
      if (cells[6] === '' && cells[7] && !isNaN(parseFloat(cells[7].replace(',', '.')))) {
        // C'è una colonna vuota iniziale nel file corretto
        offset = 7;
      }

      const q1 = parseItalianNumber(cells[offset]);
      const qX = parseItalianNumber(cells[offset + 1]);
      const q2 = parseItalianNumber(cells[offset + 2]);

      // Handicap
      const rawHandicap = cells[offset + 3]?.replace(/"/g, '').trim();
      const handicapVal = rawHandicap ? parseInt(rawHandicap, 10) : null;
      const qH1 = parseItalianNumber(cells[offset + 4]);
      const qHX = parseItalianNumber(cells[offset + 5]);
      const qH2 = parseItalianNumber(cells[offset + 6]);

      // Doppia Chance
      const q1X = parseItalianNumber(cells[offset + 7]);
      const qX2 = parseItalianNumber(cells[offset + 8]);
      const q12 = parseItalianNumber(cells[offset + 9]);

      // Under/Over
      const qU15 = parseItalianNumber(cells[offset + 10]);
      const qO15 = parseItalianNumber(cells[offset + 11]);
      const qU25 = parseItalianNumber(cells[offset + 12]);
      const qO25 = parseItalianNumber(cells[offset + 13]);
      const qU35 = parseItalianNumber(cells[offset + 14]);
      const qO35 = parseItalianNumber(cells[offset + 15]);

      // Goal / NoGoal
      const qGoal = parseItalianNumber(cells[offset + 16]);
      const qNoGoal = parseItalianNumber(cells[offset + 17]);

      // Segna Goal
      const qSegnaCasaSi = parseItalianNumber(cells[offset + 18]);
      const qSegnaCasaNo = parseItalianNumber(cells[offset + 19]);
      const qSegnaOspiteSi = parseItalianNumber(cells[offset + 20]);
      const qSegnaOspiteNo = parseItalianNumber(cells[offset + 21]);

      // Rilevamento ed isolamento quote offerte = 1.0 (valore impossibile nel betting, errore lettura CSV)
      const impossibleOddsFields: string[] = [];
      const checkOdd = (val: number | null, label: string) => {
        if (val !== null && val <= 1.001) {
          impossibleOddsFields.push(`${label} (${val.toFixed(2)})`);
        }
      };

      checkOdd(q1, 'Quota 1');
      checkOdd(qX, 'Quota X');
      checkOdd(q2, 'Quota 2');
      checkOdd(qH1, 'Handicap 1');
      checkOdd(qHX, 'Handicap X');
      checkOdd(qH2, 'Handicap 2');
      checkOdd(q1X, 'Doppia Chance 1X');
      checkOdd(qX2, 'Doppia Chance X2');
      checkOdd(q12, 'Doppia Chance 12');
      checkOdd(qU15, 'Under 1.5');
      checkOdd(qO15, 'Over 1.5');
      checkOdd(qU25, 'Under 2.5');
      checkOdd(qO25, 'Over 2.5');
      checkOdd(qU35, 'Under 3.5');
      checkOdd(qO35, 'Over 3.5');
      checkOdd(qGoal, 'Goal');
      checkOdd(qNoGoal, 'NoGoal');

      const hasImpossibleOdds = impossibleOddsFields.length > 0;
      const impossibleOddsReason = hasImpossibleOdds
        ? `Quota offerta = 1.00 (${impossibleOddsFields.join(', ')}): valore impossibile nel betting reale, potenziale errore di lettura o sfasamento colonne nel file`
        : undefined;

      // Calcolo Lavagna (Margine Bookmaker) e Payout su 1X2 - SOLO se quote regolari (> 1.001)
      let bookmakerMargin: number | null = null;
      let payoutPercent: number | null = null;
      let favorite: '1' | 'X' | '2' | 'Equal' | null = null;
      let favoriteOdds: number | null = null;

      if (q1 && qX && q2 && q1 > 1.001 && qX > 1.001 && q2 > 1.001) {
        const sumProb = (1 / q1) + (1 / qX) + (1 / q2);
        bookmakerMargin = Math.round((sumProb - 1) * 10000) / 100;
        payoutPercent = Math.round((100 / sumProb) * 100) / 100;

        const minOdd = Math.min(q1, qX, q2);
        favoriteOdds = minOdd;
        if (q1 === minOdd && q1 < q2) favorite = '1';
        else if (q2 === minOdd && q2 < q1) favorite = '2';
        else if (qX === minOdd) favorite = 'X';
        else favorite = 'Equal';
      }

      const matchId = `${pal}_${avv}_${currentDate.replace(/\s+/g, '_')}_${ora}`;

      matches.push({
        id: matchId,
        dataHeader: currentDate,
        ora,
        manif: manif || 'GENERIC',
        pal: pal || '',
        avv: avv || '',
        squadra1: squadra1 || 'Squadra 1',
        squadra2: squadra2 || 'Squadra 2',
        q1,
        qX,
        q2,
        handicapVal: isNaN(handicapVal as number) ? null : handicapVal,
        qH1,
        qHX,
        qH2,
        q1X,
        qX2,
        q12,
        qU15,
        qO15,
        qU25,
        qO25,
        qU35,
        qO35,
        qGoal,
        qNoGoal,
        qSegnaCasaSi,
        qSegnaCasaNo,
        qSegnaOspiteSi,
        qSegnaOspiteNo,
        bookmakerMargin,
        payoutPercent,
        favorite,
        favoriteOdds,
        hasImpossibleOdds,
        impossibleOddsReason,
        impossibleOddsFields: hasImpossibleOdds ? impossibleOddsFields : undefined,
      });
    } catch (err) {
      errors.push(`Errore alla riga ${lineIndex + 1}: ${(err as Error).message}`);
    }
  }

  return {
    matches,
    errors,
    rawCount: lines.length,
  };
}

/**
 * Esporta le partite Sisal nel formato CSV normalizzato e corretto
 * ("calcio base per data corretto")
 */
export function exportNormalizedSisalCsv(matches: SisalMatch[]): string {
  const outputLines: string[] = [];

  // Intestazioni standard identiche al file corretto
  outputLines.push('"CALCIO PER DATA"');
  outputLines.push(',,"Esito Finale","1X2 Handicap","DoppiaChance","Under / Over","GoalNoGoal","Segna goal"');
  outputLines.push(',,,,,,,,,,,,,,,,,"1,5","2,5","3,5",Casa,Ospite');
  outputLines.push('Ora,Manif.,Pal.,Avv.,"Squadra 1","Squadra 2",1,X,2,H,1,X,2,1X,X2,12,U,O,U,O,U,O,G,NG,SI,NO,SI,NO');

  // Raggruppa per data
  const dateGroups: { [date: string]: SisalMatch[] } = {};
  matches.forEach(m => {
    if (!dateGroups[m.dataHeader]) {
      dateGroups[m.dataHeader] = [];
    }
    dateGroups[m.dataHeader].push(m);
  });

  const formatOdd = (val: number | null | undefined): string => {
    if (val === null || val === undefined || isNaN(val)) return '';
    return `"${val.toFixed(2).replace('.', ',')}"`;
  };

  const formatH = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return '';
    return `${val}`;
  };

  Object.keys(dateGroups).forEach(date => {
    outputLines.push(`"${date}"`);
    dateGroups[date].forEach(m => {
      const row = [
        m.ora,
        m.manif,
        m.pal,
        m.avv,
        `"${m.squadra1}"`,
        `"${m.squadra2}"`,
        '', // Colonna spaziatrice come nel file corretto Sisal
        formatOdd(m.q1),
        formatOdd(m.qX),
        formatOdd(m.q2),
        formatH(m.handicapVal),
        formatOdd(m.qH1),
        formatOdd(m.qHX),
        formatOdd(m.qH2),
        formatOdd(m.q1X),
        formatOdd(m.qX2),
        formatOdd(m.q12),
        formatOdd(m.qU15),
        formatOdd(m.qO15),
        formatOdd(m.qU25),
        formatOdd(m.qO25),
        formatOdd(m.qU35),
        formatOdd(m.qO35),
        formatOdd(m.qGoal),
        formatOdd(m.qNoGoal),
        formatOdd(m.qSegnaCasaSi),
        formatOdd(m.qSegnaCasaNo),
        formatOdd(m.qSegnaOspiteSi),
        formatOdd(m.qSegnaOspiteNo),
      ];
      outputLines.push(row.join(','));
    });
  });

  return outputLines.join('\n');
}

/**
 * Parser per i file CSV di Football-Data.co.uk (es. I1, E0, SP1)
 */
export function parseHistoricalFootballCsv(csvText: string, filename = 'I1.csv'): {
  matches: HistoricalMatch[];
  errors: string[];
  count: number;
} {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) {
    return { matches: [], errors: ['File vuoto'], count: 0 };
  }

  const headerLine = lines[0];
  const headers = splitCsvLine(headerLine);

  // Mappa delle posizioni delle colonne
  const colIndex: { [key: string]: number } = {};
  headers.forEach((h, idx) => {
    colIndex[h.trim()] = idx;
  });

  const getCol = (cells: string[], colName: string): string => {
    const idx = colIndex[colName];
    return idx !== undefined && idx < cells.length ? cells[idx] : '';
  };

  const getNum = (cells: string[], colName: string): number | null => {
    const val = getCol(cells, colName);
    if (!val || val === '') return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  };

  const matches: HistoricalMatch[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cells = splitCsvLine(line);

    if (cells.length < 5) continue;

    const div = getCol(cells, 'Div') || 'I1';
    const date = getCol(cells, 'Date');
    const time = getCol(cells, 'Time') || '15:00';
    const homeTeam = getCol(cells, 'HomeTeam');
    const awayTeam = getCol(cells, 'AwayTeam');

    if (!homeTeam || !awayTeam || !date) {
      continue;
    }

    const fthg = getNum(cells, 'FTHG');
    const ftag = getNum(cells, 'FTAG');
    const ftr = getCol(cells, 'FTR') as 'H' | 'D' | 'A';

    if (fthg === null || ftag === null || !ftr) {
      continue;
    }

    const hthg = getNum(cells, 'HTHG');
    const htag = getNum(cells, 'HTAG');
    const htr = (getCol(cells, 'HTR') as 'H' | 'D' | 'A') || null;

    const hs = getNum(cells, 'HS');
    const asShots = getNum(cells, 'AS');
    const hst = getNum(cells, 'HST');
    const ast = getNum(cells, 'AST');
    const hf = getNum(cells, 'HF');
    const af = getNum(cells, 'AF');
    const hc = getNum(cells, 'HC');
    const ac = getNum(cells, 'AC');
    const hy = getNum(cells, 'HY');
    const ay = getNum(cells, 'AY');
    const hr = getNum(cells, 'HR');
    const ar = getNum(cells, 'AR');

    // Quote
    const b365H = getNum(cells, 'B365H');
    const b365D = getNum(cells, 'B365D');
    const b365A = getNum(cells, 'B365A');
    const avgH = getNum(cells, 'AvgH');
    const avgD = getNum(cells, 'AvgD');
    const avgA = getNum(cells, 'AvgA');
    const maxH = getNum(cells, 'MaxH');
    const maxD = getNum(cells, 'MaxD');
    const maxA = getNum(cells, 'MaxA');

    const b365Over25 = getNum(cells, 'B365>2.5');
    const b365Under25 = getNum(cells, 'B365<2.5');
    const avgOver25 = getNum(cells, 'Avg>2.5');
    const avgUnder25 = getNum(cells, 'Avg<2.5');

    // Rilevamento quote impossibili <= 1.0 nel file storico
    const impossibleOddsFields: string[] = [];
    const checkH = (val: number | null, label: string) => {
      if (val !== null && val <= 1.001) impossibleOddsFields.push(`${label} (${val.toFixed(2)})`);
    };
    checkH(b365H, 'B365H');
    checkH(b365D, 'B365D');
    checkH(b365A, 'B365A');
    checkH(avgH, 'AvgH');
    checkH(avgD, 'AvgD');
    checkH(avgA, 'AvgA');
    checkH(maxH, 'MaxH');
    checkH(maxD, 'MaxD');
    checkH(maxA, 'MaxA');
    checkH(b365Over25, 'B365>2.5');
    checkH(b365Under25, 'B365<2.5');
    checkH(avgOver25, 'Avg>2.5');
    checkH(avgUnder25, 'Avg<2.5');

    const hasImpossibleOdds = impossibleOddsFields.length > 0;
    const impossibleOddsReason = hasImpossibleOdds
      ? `Quota = 1.00 (${impossibleOddsFields.join(', ')}): quota impossibile o errore nel file`
      : undefined;

    // ID univoco del match basato su data, squadre e orario
    const id = `${date.replace(/\//g, '-')}_${homeTeam.replace(/\s+/g, '')}_${awayTeam.replace(/\s+/g, '')}`;

    matches.push({
      id,
      div,
      date,
      time,
      homeTeam,
      awayTeam,
      fthg,
      ftag,
      ftr,
      hthg,
      htag,
      htr,
      hs,
      as: asShots,
      hst,
      ast,
      hf,
      af,
      hc,
      ac,
      hy,
      ay,
      hr,
      ar,
      b365H,
      b365D,
      b365A,
      avgH,
      avgD,
      avgA,
      maxH,
      maxD,
      maxA,
      b365Over25,
      b365Under25,
      avgOver25,
      avgUnder25,
      sourceFile: filename,
      hasImpossibleOdds,
      impossibleOddsReason,
      impossibleOddsFields: hasImpossibleOdds ? impossibleOddsFields : undefined,
    });
  }

  return {
    matches,
    errors,
    count: matches.length,
  };
}
