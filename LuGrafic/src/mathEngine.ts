/**
 * mathEngine.ts — Motor Matemático do LuGrafic
 *
 * Encapsula math.js para compilar e avaliar expressões matemáticas
 * digitadas pelo usuário, sem uso de eval().
 */

import { compile, parse, derivative, type EvalFunction } from 'mathjs';

const RESERVED_SYMBOLS = new Set(['x', 'y', 'z', 't', 'theta', 'pi', 'e', 'i', 'Infinity', 'NaN']);

function splitTopLevel(value: string, separator = ','): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if ('([{'.includes(char)) depth++;
    else if (')]}'.includes(char)) depth--;
    else if (char === separator && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
}

/** Normaliza notação comum da UI e remove o lado dependente de uma igualdade. */
export function normalizeExpression(expression: string): string {
  let expr = expression.trim()
    .replace(/[−–—]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/θ/g, 'theta')
    .replace(/√\s*\(/g, 'sqrt(');

  const equality = splitTopLevel(expr, '=');
  if (equality.length === 2) {
    const lhs = equality[0].replace(/\s+/g, '').toLowerCase();
    const rhs = equality[1];
    if (/^(y|z|r|f\(x\)|g\(x\)|h\(x\)|f\(x,y\))$/.test(lhs)) {
      expr = rhs;
    } else {
      throw new Error('Use a igualdade como y = f(x), f(x) = ..., r = f(theta) ou z = f(x,y).');
    }
  } else if (equality.length > 1) {
    throw new Error('A fórmula deve conter no máximo um sinal de igualdade.');
  }
  return expr.trim();
}

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
  const trimmed = normalizeExpression(expr);
  if (!trimmed) {
    throw new Error('A expressão está vazia. Digite algo como sin(x) ou x^2.');
  }
  if (trimmed.length > 500) throw new Error('A fórmula é muito longa. Use até 500 caracteres.');
  try {
    const ast = parse(trimmed);
    let nodeCount = 0;
    // @ts-ignore: a API de travessia do AST do math.js possui tipagem incompleta.
    ast.traverse((node: any) => {
      nodeCount++;
      if (node.isAssignmentNode || node.isFunctionAssignmentNode || node.isBlockNode ||
          node.isArrayNode || node.isRangeNode || node.isObjectNode || node.isAccessorNode) {
        throw new Error('Use apenas uma expressão escalar, sem atribuições, listas, intervalos ou acesso a propriedades.');
      }
      if (node.isFunctionNode && ['import', 'createUnit', 'evaluate', 'parse', 'simplify', 'derivative', 'resolve'].includes(node.fn?.name)) {
        throw new Error(`A função ${node.fn.name} não é permitida.`);
      }
    });
    if (nodeCount > 200) throw new Error('A fórmula é complexa demais. Simplifique a expressão.');
    return compile(trimmed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith('Use apenas') || message.startsWith('A função') || message.startsWith('A fórmula')) throw err;
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
  try {
    const normalized = normalizeExpression(expr);
    return /^\s*(z|f\s*\(\s*x\s*,\s*y\s*\))\s*=/.test(expr) || /(?<![a-zA-Z])y(?![a-zA-Z(])/.test(normalized);
  } catch {
    return false;
  }
}

/** Derivada simbólica em x; os demais parâmetros são tratados como constantes. */
export function evaluateDerivative(
  expr: string, xMin: number, xMax: number, steps = 500,
  scope: Record<string, number> = {}
): { expression: string; data: PlotData2D } {
  compileExpression(expr);
  if (detectEquationType(expr) !== 'cartesian' || is3DExpression(expr)) {
    throw new Error('A derivada está disponível apenas para funções cartesianas 2D de x.');
  }
  try {
    const expression = derivative(normalizeExpression(expr), 'x').toString();
    const data = evaluateGrid2D(expression, xMin, xMax, steps, scope);
    const original = evaluateGrid2D(expr, xMin, xMax, steps, scope);
    data.y = data.y.map((value, index) => Number.isFinite(original.y[index]) ? value : NaN);
    if (!data.y.some(Number.isFinite)) throw new Error('nenhum valor real no intervalo');
    return { expression, data };
  } catch (error) {
    throw new Error(`Não foi possível calcular a derivada desta fórmula: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extrai parâmetros dinâmicos (variáveis além de x, y e built-ins) das expressões.
 */
export function extractParameters(expressions: string[]): string[] {
  const params = new Set<string>();
  
  expressions.forEach(expr => {
    const trimmed = expr.trim();
    if (!trimmed) return;
    try {
      const normalized = normalizeExpression(trimmed);
      const type = detectEquationType(normalized);
      const parseTargets = type === 'parametric'
        ? splitTopLevel(normalized.slice(1, -1))
        : [normalized];
      const calledFunctions = new Set<string>();
      for (const target of parseTargets) {
        for (const match of target.matchAll(/\b([A-Za-z_]\w*)\s*\(/g)) calledFunctions.add(match[1]);
      }
      const nodes = parseTargets.map(target => parse(target));
      // @ts-ignore: mathjs AST traverse API is loosely typed
      nodes.flatMap(node => node.filter((n: any) => n.isSymbolNode)).forEach((n: any) => {
        if (!RESERVED_SYMBOLS.has(n.name) && !calledFunctions.has(n.name)) params.add(n.name);
      });
    } catch {
      // Ignorar erros de parse (serão pegos na avaliação principal)
    }
  });
  
  return [...params].sort();
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
      if (typeof res !== 'number' || !Number.isFinite(res)) {
        throw new Error(`A função não possui valor real finito em x = ${xVal}.`);
      }
      return res;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('A função')) throw error;
      throw new Error(`Não foi possível avaliar a integral em x = ${xVal}.`);
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
  const trimmed = normalizeExpression(expr);
  // Paramétrica: Ex: (sin(t), cos(t))
  if (trimmed.startsWith('(') && trimmed.endsWith(')') && splitTopLevel(trimmed.slice(1, -1)).length === 2) {
    return 'parametric';
  }
  // Polar: contém a variável theta isolada
  if (/^\s*r\s*=/.test(expr) || /(?<![a-zA-Z])theta(?![a-zA-Z(])/.test(trimmed)) {
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
  const normalized = normalizeExpression(expr);
  const components = normalized.startsWith('(') && normalized.endsWith(')')
    ? splitTopLevel(normalized.slice(1, -1))
    : [];
  if (components.length !== 2) throw new Error('Curva paramétrica deve usar o formato (x(t), y(t)).');
  const compiled = components.map(compileExpression);
  const x: number[] = [];
  const y: number[] = [];
  const dt = (tMax - tMin) / (steps - 1);
  
  for (let i = 0; i < steps; i++) {
    const t = tMin + i * dt;
    try {
      const values = compiled.map(component => component.evaluate({ ...scope, t }));
      const valid = values.every(value => typeof value === 'number' && Number.isFinite(value));
      x.push(valid ? values[0] : NaN);
      y.push(valid ? values[1] : NaN);
    } catch {
      // Preserva a quebra da curva em pontos fora do domínio.
      x.push(NaN);
      y.push(NaN);
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
export function findNotablePoints(data: PlotData2D, expression?: string, scope: Record<string, number> = {}): NotablePoint[] {
  const points: NotablePoint[] = [];
  const { x, y } = data;
  const compiledExpression = expression ? compileExpression(expression) : null;
  
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
      if (expression) {
        const midpoint = (x[i - 1] + x[i]) / 2;
        try {
          const midY = compiledExpression!.evaluate({ x: midpoint, ...scope });
          const scale = Math.max(1e-12, Math.abs(y0), Math.abs(y1));
          if (typeof midY !== 'number' || !Number.isFinite(midY) || Math.abs(midY) > scale * 10) continue;
        } catch { continue; }
      }
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
  if (![...x, ...y].every(Number.isFinite)) return null;
  const meanX = x.reduce((sum, value) => sum + value, 0) / n;
  const meanY = y.reduce((sum, value) => sum + value, 0) / n;
  let covariance = 0;
  let varianceX = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    covariance += dx * (y[i] - meanY);
    varianceX += dx * dx;
  }
  if (varianceX <= Number.EPSILON * Math.max(1, Math.abs(meanX))) return null;
  const m = covariance / varianceX;
  const b = meanY - m * meanX;
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
export function findIntersections(data: PlotData2D[], expressions?: string[], scope: Record<string, number> = {}): NotablePoint[] {
  const intersections: NotablePoint[] = [];
  if (data.length < 2) return intersections;
  const compiledExpressions = expressions?.map(compileExpression);

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
          if (expressions?.[i] && expressions?.[j]) {
            const midpoint = (eq1.x[k - 1] + eq1.x[k]) / 2;
            try {
              const a = compiledExpressions![i].evaluate({ x: midpoint, ...scope });
              const b = compiledExpressions![j].evaluate({ x: midpoint, ...scope });
              const midDiff = Number(a) - Number(b);
              const scale = Math.max(1e-12, Math.abs(diffA), Math.abs(diffB));
              if (!Number.isFinite(midDiff) || Math.abs(midDiff) > scale * 10) continue;
            } catch { continue; }
          }
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
