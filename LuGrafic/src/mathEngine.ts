/**
 * mathEngine.ts — Motor Matemático do LuGrafic
 *
 * Encapsula math.js para compilar e avaliar expressões matemáticas
 * digitadas pelo usuário, sem uso de eval().
 */

import { compile, type EvalFunction } from 'mathjs';

/** Resultado da avaliação para gráficos 2D */
export interface PlotData2D {
  x: number[];
  y: number[];
}

/** Resultado da avaliação para superfícies 3D */
export interface PlotData3D {
  x: number[][];
  y: number[][];
  z: number[][];
}

/**
 * Compila uma expressão matemática em texto para uma função avaliável.
 * Lança erro com mensagem amigável se a expressão for inválida.
 */
export function compileExpression(expr: string): EvalFunction {
  const trimmed = expr.trim();
  if (!trimmed) {
    throw new Error('A expressão está vazia. Digite algo como sin(x) ou x^2.');
  }
  try {
    return compile(trimmed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Erro de sintaxe na expressão: ${message}`);
  }
}

/**
 * Detecta se uma expressão contém a variável 'y', indicando que
 * o gráfico deve ser 3D (superfície).
 */
export function is3DExpression(expr: string): boolean {
  // Match isolated 'y' that isn't part of a function name
  // Negative lookbehind for letters, negative lookahead for letters
  return /(?<![a-zA-Z])y(?![a-zA-Z(])/.test(expr);
}

/**
 * Gera uma malha de pontos 2D avaliando f(x) no intervalo [xMin, xMax].
 *
 * @param expr - Expressão compilável (ex: "sin(x)", "x^2 + 3")
 * @param xMin - Limite inferior do eixo X
 * @param xMax - Limite superior do eixo X
 * @param steps - Número de pontos a calcular (resolução)
 * @returns Dados prontos para o Plotly 2D
 */
export function evaluateGrid2D(
  expr: string,
  xMin: number,
  xMax: number,
  steps: number
): PlotData2D {
  const compiled = compileExpression(expr);
  const x: number[] = [];
  const y: number[] = [];
  const dx = (xMax - xMin) / (steps - 1);

  for (let i = 0; i < steps; i++) {
    const xVal = xMin + i * dx;
    x.push(xVal);
    try {
      const result = compiled.evaluate({ x: xVal });
      // Handle complex numbers or non-finite results
      const yVal = typeof result === 'number' && isFinite(result) ? result : NaN;
      y.push(yVal);
    } catch {
      y.push(NaN);
    }
  }

  return { x, y };
}

/**
 * Gera uma malha de pontos 3D avaliando f(x, y) no plano [xMin..xMax] x [yMin..yMax].
 *
 * @param expr - Expressão com x e y (ex: "x^2 + y^2", "sin(x) * cos(y)")
 * @param xMin - Limite inferior do eixo X
 * @param xMax - Limite superior do eixo X
 * @param yMin - Limite inferior do eixo Y
 * @param yMax - Limite superior do eixo Y
 * @param steps - Pontos por eixo (total de pontos = steps²)
 * @returns Dados prontos para superfície Plotly 3D
 */
export function evaluateGrid3D(
  expr: string,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  steps: number
): PlotData3D {
  // For 3D, cap steps to avoid performance issues
  const effectiveSteps = Math.min(steps, 100);
  const compiled = compileExpression(expr);

  const xGrid: number[][] = [];
  const yGrid: number[][] = [];
  const zGrid: number[][] = [];

  const dx = (xMax - xMin) / (effectiveSteps - 1);
  const dy = (yMax - yMin) / (effectiveSteps - 1);

  for (let j = 0; j < effectiveSteps; j++) {
    const xRow: number[] = [];
    const yRow: number[] = [];
    const zRow: number[] = [];
    const yVal = yMin + j * dy;

    for (let i = 0; i < effectiveSteps; i++) {
      const xVal = xMin + i * dx;
      xRow.push(xVal);
      yRow.push(yVal);
      try {
        const result = compiled.evaluate({ x: xVal, y: yVal });
        const zVal = typeof result === 'number' && isFinite(result) ? result : NaN;
        zRow.push(zVal);
      } catch {
        zRow.push(NaN);
      }
    }

    xGrid.push(xRow);
    yGrid.push(yRow);
    zGrid.push(zRow);
  }

  return { x: xGrid, y: yGrid, z: zGrid };
}
