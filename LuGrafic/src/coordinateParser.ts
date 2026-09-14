/**
 * coordinateParser.ts — Parser de Coordenadas do LuGrafic
 *
 * Interpreta texto colado pelo usuário (tabelas, CSV, TSV)
 * em arrays de coordenadas para plotagem.
 */

import type { PlotData2D } from './mathEngine';

/** Resultado do parsing de coordenadas 3D */
export interface CoordinateData3D {
  x: number[];
  y: number[];
  z: number[];
}

/** Tipo de dados detectados */
export type CoordinateDimension = '2d' | '3d';

/** Resultado completo do parsing */
export interface ParseResult {
  dimension: CoordinateDimension;
  data2d?: PlotData2D;
  data3d?: CoordinateData3D;
  pointCount: number;
}

/**
 * Detecta automaticamente o separador usado no texto.
 * Prioridade: tab > ponto-e-vírgula > vírgula > espaços múltiplos
 */
function detectSeparator(text: string): RegExp {
  const firstDataLine = text
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0 && /\d/.test(l));

  if (!firstDataLine) return /[\t,;]\s*/;

  if (firstDataLine.includes('\t')) return /\t+/;
  if (firstDataLine.includes(';')) return /\s*;\s*/;

  // For comma: need to distinguish between decimal comma and separator comma
  // If a line has multiple commas, they're separators
  const commaCount = (firstDataLine.match(/,/g) || []).length;
  if (commaCount >= 1) return /\s*,\s*/;

  // Multiple spaces as separator
  return /\s+/;
}

/**
 * Verifica se uma linha parece ser um cabeçalho (contém letras e não números significativos).
 */
function isHeaderLine(line: string): boolean {
  const trimmed = line.trim().toLowerCase();
  if (!trimmed) return false;
  // If the line starts with common header words
  if (/^[xyz,;\s\t]+$/.test(trimmed)) return true;
  // If the line contains more letters than numbers
  const letters = (trimmed.match(/[a-zA-Z]/g) || []).length;
  const digits = (trimmed.match(/\d/g) || []).length;
  return letters > digits;
}

/**
 * Converte uma string numérica para number, tratando vírgula decimal.
 */
function parseNumber(str: string): number {
  let cleaned = str.trim();
  // If the string uses comma as decimal separator (e.g., "3,14")
  // But only if there's exactly one comma and no dots
  if (cleaned.includes(',') && !cleaned.includes('.') && (cleaned.match(/,/g) || []).length === 1) {
    cleaned = cleaned.replace(',', '.');
  }
  const num = parseFloat(cleaned);
  return num;
}

/**
 * Faz o parsing do texto de coordenadas inserido pelo usuário.
 *
 * Suporta formatos:
 * - CSV: 1, 2\n3, 4\n5, 6
 * - TSV: 1\t2\n3\t4
 * - Ponto-e-vírgula: 1; 2; 3\n4; 5; 6
 * - Espaço: 1 2\n3 4
 *
 * @param text - Texto cru do textarea
 * @returns Resultado com dimensão detectada e dados
 * @throws Error com mensagem amigável se o formato for inválido
 */
export function parseCoordinates(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Nenhum dado inserido. Cole uma tabela de pontos (X, Y) ou (X, Y, Z).');
  }

  const lines = trimmed.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  // Skip header lines
  const dataLines = lines.filter((l) => !isHeaderLine(l));

  if (dataLines.length === 0) {
    throw new Error('Nenhum ponto numérico encontrado. Verifique o formato dos dados.');
  }

  const separator = detectSeparator(dataLines.join('\n'));

  // Parse all lines
  const rows: number[][] = [];
  for (let i = 0; i < dataLines.length; i++) {
    const parts = dataLines[i].split(separator).filter((p) => p.trim().length > 0);
    const nums = parts.map(parseNumber);

    // Validate that all parts are actual numbers
    const validNums = nums.filter((n) => !isNaN(n));
    if (validNums.length < 2) {
      continue; // Skip lines with less than 2 valid numbers
    }

    rows.push(validNums);
  }

  if (rows.length === 0) {
    throw new Error(
      'Não foi possível interpretar os dados. Use o formato:\nx, y\n0, 0\n1, 1'
    );
  }

  // Determine dimension based on column count
  const maxCols = Math.max(...rows.map((r) => r.length));

  if (maxCols >= 3) {
    // 3D data
    const x: number[] = [];
    const y: number[] = [];
    const z: number[] = [];

    for (const row of rows) {
      if (row.length >= 3) {
        x.push(row[0]);
        y.push(row[1]);
        z.push(row[2]);
      }
    }

    return {
      dimension: '3d',
      data3d: { x, y, z },
      pointCount: x.length,
    };
  } else {
    // 2D data
    const x: number[] = [];
    const y: number[] = [];

    for (const row of rows) {
      if (row.length >= 2) {
        x.push(row[0]);
        y.push(row[1]);
      }
    }

    return {
      dimension: '2d',
      data2d: { x, y },
      pointCount: x.length,
    };
  }
}
