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
function detectSeparator(text: string): { separator: RegExp; decimalComma: boolean } {
  const firstDataLine = text
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0 && /\d/.test(l));

  if (!firstDataLine) return { separator: /;/, decimalComma: true };

  if (firstDataLine.includes('\t')) return { separator: /\t/, decimalComma: true };
  if (firstDataLine.includes(';')) return { separator: /;/, decimalComma: true };
  if (/,\s+/.test(firstDataLine)) return { separator: /\s*,\s*/, decimalComma: false };

  // Espaços permitem vírgula decimal: "1,5 2,5".
  if (/\s+/.test(firstDataLine)) return { separator: /\s+/, decimalComma: true };

  // CSV separado por vírgula exige ponto como separador decimal.
  return { separator: /,/, decimalComma: false };
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
export function parseLocaleNumber(str: string, decimalComma = true): number {
  let cleaned = str.trim();
  if (decimalComma && /^[-+]?\d+,\d+(?:[eE][-+]?\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(',', '.');
  }
  if (!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(cleaned)) return NaN;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : NaN;
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

  const { separator, decimalComma } = detectSeparator(dataLines.join('\n'));

  // Parse all lines
  const rows: number[][] = [];
  for (let i = 0; i < dataLines.length; i++) {
    const parts = dataLines[i].split(separator);
    if (parts.length !== 2 && parts.length !== 3) {
      throw new Error(`Linha ${i + 1}: esperado 2 ou 3 valores, encontrados ${parts.length}.`);
    }
    if (parts.some((part) => part.trim() === '')) {
      throw new Error(`Linha ${i + 1}: há uma coordenada vazia.`);
    }
    const nums = parts.map((part) => parseLocaleNumber(part, decimalComma));
    const invalidIndex = nums.findIndex((value) => !Number.isFinite(value));
    if (invalidIndex >= 0) {
      throw new Error(`Linha ${i + 1}, coluna ${invalidIndex + 1}: número inválido.`);
    }
    rows.push(nums);
  }

  if (rows.length === 0) {
    throw new Error(
      'Não foi possível interpretar os dados. Use o formato:\nx, y\n0, 0\n1, 1'
    );
  }

  // Determine dimension based on column count
  const maxCols = rows[0].length;
  const inconsistentRow = rows.findIndex((row) => row.length !== maxCols);
  if (inconsistentRow >= 0) {
    throw new Error(`Linha ${inconsistentRow + 1}: todas as linhas devem ter ${maxCols} coordenadas.`);
  }

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
