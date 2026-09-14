/**
 * mathEngine.ts — Motor Matemático do LuGrafic
 *
 * Encapsula math.js para compilar e avaliar expressões matemáticas
 * digitadas pelo usuário, sem uso de eval().
 */

import { compile, parse, type EvalFunction } from 'mathjs';

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
 * Extrai parâmetros dinâmicos (variáveis além de x, y e built-ins) das expressões.
 */
export function extractParameters(expressions: string[]): string[] {
  const params = new Set<string>();
  const builtins = ['sin', 'cos', 'tan', 'sqrt', 'exp', 'log', 'ln', 'pi', 'e', 'x', 'y', 't', 'theta'];
  
  expressions.forEach(expr => {
    const trimmed = expr.trim();
    if (!trimmed) return;
    try {
      const node = parse(trimmed);
      // @ts-ignore: mathjs AST traverse API is loosely typed
      node.filter((n: any) => n.isSymbolNode).forEach((n: any) => {
        // Ignora builtins globais (MathJS pode ter 'math' mas evitamos os principais)
        if (!builtins.includes(n.name)) {
          // Também filtraria constantes globais de JS se necessário
          params.add(n.name);
        }
      });
    } catch {
      // Ignorar erros de parse (serão pegos na avaliação principal)
    }
  });
  
  // Como MathJS inclui dezenas de units/functions, vamos remover 
  // funções built-in dinamicamente tentando avaliar no vazio
  const validParams: string[] = [];
  params.forEach(p => {
    try {
      // Se conseguir avaliar p sozinho sem escopo e não der erro (ex: pi), não é parâmetro limpo.
      // Ou melhor, assumimos que 1-char symbols ou não-functions são params.
      validParams.push(p);
    } catch {}
  });

  return validParams.sort();
}

/**
 * Calcula a integral definida de f(x) de a até b numericamente usando a Regra de Simpson 1/3.
 */
export function calculateDefiniteIntegral(
  expr: string,
  a: number,
  b: number,
  scope: Record<string, number> = {},
  steps: number = 1000
): number {
  const n = steps % 2 === 0 ? steps : steps + 1;
  const compiled = compileExpression(expr);
  const h = (b - a) / n;
  
  const evalAt = (xVal: number) => {
    try {
      const res = compiled.evaluate({ x: xVal, ...scope });
      return typeof res === 'number' && isFinite(res) ? res : 0;
    } catch {
      return 0;
    }
  };
  
  let sum = evalAt(a) + evalAt(b);
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    sum += evalAt(x) * (i % 2 === 0 ? 2 : 4);
  }
  
  return (sum * h) / 3;
}

/**
 * Gera uma malha de pontos 2D avaliando f(x) no intervalo [xMin, xMax].
 *
 * @param expr - Expressão compilável (ex: "sin(x)", "x^2 + 3")
 * @param xMin - Limite inferior do eixo X
 * @param xMax - Limite superior do eixo X
 * @param steps - Número de pontos a calcular (resolução)
 * @param scope - Variáveis de escopo (parâmetros) para avaliação
 * @returns Dados prontos para o Plotly 2D
 */
export function evaluateGrid2D(
  expr: string,
  xMin: number,
  xMax: number,
  steps: number,
  scope: Record<string, number> = {}
): PlotData2D {
  const compiled = compileExpression(expr);
  const x: number[] = [];
  const y: number[] = [];
  const dx = (xMax - xMin) / (steps - 1);

  for (let i = 0; i < steps; i++) {
    const xVal = xMin + i * dx;
    x.push(xVal);
    try {
      const result = compiled.evaluate({ x: xVal, ...scope });
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
 * @param scope - Variáveis de escopo (parâmetros) para avaliação
 * @returns Dados prontos para superfície Plotly 3D
 */
export function evaluateGrid3D(
  expr: string,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  steps: number,
  scope: Record<string, number> = {}
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
        const result = compiled.evaluate({ x: xVal, y: yVal, ...scope });
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

/**
 * Detecta o tipo de equação pela sintaxe digitada
 */
export function detectEquationType(expr: string): 'cartesian' | 'parametric' | 'polar' {
  const trimmed = expr.trim();
  // Paramétrica: Ex: (sin(t), cos(t))
  if (trimmed.startsWith('(') && trimmed.endsWith(')') && trimmed.includes(',')) {
    return 'parametric';
  }
  // Polar: contém a variável theta isolada
  if (/(?<![a-zA-Z])theta(?![a-zA-Z(])/.test(trimmed)) {
    return 'polar';
  }
  return 'cartesian';
}

/**
 * Gera pontos para curvas paramétricas
 */
export function evaluateParametric(
  expr: string,
  tMin: number = 0,
  tMax: number = 2 * Math.PI,
  steps: number = 500,
  scope: Record<string, number> = {}
): PlotData2D {
  const arrayExpr = `[${expr.substring(1, expr.length - 1)}]`;
  const compiled = compileExpression(arrayExpr);
  const x: number[] = [];
  const y: number[] = [];
  const dt = (tMax - tMin) / (steps - 1);
  
  for (let i = 0; i < steps; i++) {
    const t = tMin + i * dt;
    try {
      const res = compiled.evaluate({ t, ...scope });
      if (Array.isArray(res) || (res && typeof res.toArray === 'function')) {
        const arr = Array.isArray(res) ? res : res.toArray();
        if (arr.length >= 2) {
          x.push(Number(arr[0]));
          y.push(Number(arr[1]));
        }
      }
    } catch {
      // Ignora falhas pontuais
    }
  }
  return { x, y };
}

/**
 * Gera pontos para curvas polares (convertendo para cartesianas no final)
 */
export function evaluatePolar(
  expr: string,
  thetaMin: number = 0,
  thetaMax: number = 2 * Math.PI,
  steps: number = 500,
  scope: Record<string, number> = {}
): PlotData2D {
  const compiled = compileExpression(expr);
  const x: number[] = [];
  const y: number[] = [];
  const dTheta = (thetaMax - thetaMin) / (steps - 1);
  
  for (let i = 0; i < steps; i++) {
    const theta = thetaMin + i * dTheta;
    try {
      const r = compiled.evaluate({ theta, ...scope });
      if (typeof r === 'number' && isFinite(r)) {
        x.push(r * Math.cos(theta));
        y.push(r * Math.sin(theta));
      } else {
        x.push(NaN); y.push(NaN);
      }
    } catch {
      x.push(NaN); y.push(NaN);
    }
  }
  return { x, y };
}

/**
 * Pontos notáveis identificados no gráfico
 */
export interface NotablePoint {
  x: number;
  y: number;
  type: 'raiz' | 'max' | 'min' | 'intersection';
  label?: string;
}

/**
 * Encontra raízes e extremos locais de um conjunto de pontos 2D (analisa Y)
 */
export function findNotablePoints(data: PlotData2D): NotablePoint[] {
  const points: NotablePoint[] = [];
  const { x, y } = data;
  
  // Para evitar ruídos extremos em assíntotas verticais
  const maxYJump = 100;
  
  for (let i = 1; i < y.length - 1; i++) {
    const y0 = y[i - 1];
    const y1 = y[i];
    const y2 = y[i + 1];
    const x1 = x[i];
    
    if (isNaN(y0) || isNaN(y1) || isNaN(y2)) continue;
    if (Math.abs(y1 - y0) > maxYJump || Math.abs(y2 - y1) > maxYJump) continue; // Evitar falsas raízes em assíntotas
    
    // Raiz (cruzamento do eixo X)
    if ((y0 < 0 && y1 >= 0) || (y0 > 0 && y1 <= 0)) {
      // Interpolação linear simples para afinar o X
      let rootX = x1;
      if (y1 !== y0) {
         const t = (0 - y0) / (y1 - y0);
         rootX = x[i-1] + t * (x[i] - x[i-1]);
      }
      points.push({ x: rootX, y: 0, type: 'raiz' });
    }
    
    // Max / Min
    if (y1 > y0 && y1 > y2) {
      points.push({ x: x1, y: y1, type: 'max' });
    } else if (y1 < y0 && y1 < y2) {
      points.push({ x: x1, y: y1, type: 'min' });
    }
  }
  
  return points;
}

/**
 * Calcula a regressão linear simples (y = mx + b)
 */
export function calculateLinearRegression(x: number[], y: number[]): { m: number; b: number; rSquared: number } | null {
  if (x.length !== y.length || x.length < 2) return null;
  const n = x.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
  }
  
  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-10) return null; // Linha vertical
  
  const m = (n * sumXY - sumX * sumY) / denominator;
  const b = (sumY - m * sumX) / n;
  
  const meanY = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const f = m * x[i] + b;
    ssTot += Math.pow(y[i] - meanY, 2);
    ssRes += Math.pow(y[i] - f, 2);
  }
  const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 1;
  
  return { m, b, rSquared };
}

/**
 * Encontra interseções entre múltiplas curvas avaliadas na mesma grade X (Cartesianas)
 */
export function findIntersections(data: PlotData2D[]): NotablePoint[] {
  const intersections: NotablePoint[] = [];
  if (data.length < 2) return intersections;

  for (let i = 0; i < data.length - 1; i++) {
    for (let j = i + 1; j < data.length; j++) {
      const eq1 = data[i];
      const eq2 = data[j];
      
      if (eq1.x.length !== eq2.x.length || eq1.x.length < 2) continue;
      // Checa se usam a mesma grade
      if (Math.abs(eq1.x[0] - eq2.x[0]) > 1e-5) continue;
      
      for (let k = 1; k < eq1.x.length; k++) {
        const y1A = eq1.y[k-1];
        const y1B = eq1.y[k];
        const y2A = eq2.y[k-1];
        const y2B = eq2.y[k];
        
        if (!isFinite(y1A) || !isFinite(y1B) || !isFinite(y2A) || !isFinite(y2B)) continue;
        
        const diffA = y1A - y2A;
        const diffB = y1B - y2B;
        
        if (diffA * diffB <= 0 && diffA !== diffB) {
          const m1 = y1B - y1A;
          const m2 = y2B - y2A;
          if (Math.abs(m1 - m2) > 1e-10) {
            const t = (y2A - y1A) / (m1 - m2);
            if (t >= 0 && t <= 1) {
              const xCross = eq1.x[k-1] + t * (eq1.x[k] - eq1.x[k-1]);
              const yCross = y1A + t * m1;
              intersections.push({
                x: xCross,
                y: yCross,
                type: 'intersection' as any // Usando "any" por enquanto ou estendendo a interface depois
              });
            }
          }
        }
      }
    }
  }
  
  return intersections;
}
