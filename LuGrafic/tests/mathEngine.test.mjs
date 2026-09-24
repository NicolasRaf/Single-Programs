import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDefiniteIntegral,
  calculateLinearRegression,
  detectEquationType,
  evaluateGrid2D,
  evaluateDerivative,
  evaluateParametric,
  extractParameters,
  findIntersections,
  findNotablePoints,
  normalizeExpression,
} from '../src/mathEngine.ts';

test('aceita igualdade e símbolos usuais', () => {
  assert.equal(normalizeExpression('y = 2×sin(π*x)'), '2*sin(pi*x)');
  assert.equal(normalizeExpression('z = x^2 + y^2'), 'x^2 + y^2');
  assert.equal(normalizeExpression('r = 2 + sin(θ)'), '2 + sin(theta)');
  assert.equal(detectEquationType('r = 2'), 'polar');
});

test('deriva polinômio com igualdade e parâmetros constantes', () => {
  assert.deepEqual(evaluateDerivative('y = a*x^2', -1, 1, 3, { a: 3 }).data.y, [-6, 0, 6]);
  assert.deepEqual(evaluateDerivative('f(x) = 7', -1, 1, 3).data.y, [0, 0, 0]);
  assert.ok(Math.abs(evaluateDerivative('sin(x)', 0, Math.PI, 3).data.y[0] - 1) < 1e-12);
});

test('derivada preserva domínio e rejeita modos não suportados', () => {
  assert.ok(Number.isNaN(evaluateDerivative('1/x', -1, 1, 3).data.y[1]));
  assert.throws(() => evaluateDerivative('z = x*y', -1, 1, 3), /cartesianas 2D/);
  assert.throws(() => evaluateDerivative('(cos(t), sin(t))', -1, 1, 3));
  assert.throws(() => evaluateDerivative('r = sin(theta)', -1, 1, 3), /cartesianas 2D/);
});

test('integral definida de polinômio e limites invertidos', () => {
  assert.ok(Math.abs(calculateDefiniteIntegral('y = x^2', 0, 1) - 1/3) < 1e-10);
  assert.ok(Math.abs(calculateDefiniteIntegral('x^2', 1, 0) + 1/3) < 1e-10);
});

test('não transforma funções em parâmetros', () => {
  assert.deepEqual(extractParameters(['y = abs(x) + a*cos(x)']), ['a']);
  const data = evaluateGrid2D('y = abs(x)', -1, 1, 3);
  assert.deepEqual(data.y, [1, 0, 1]);
});

test('vírgula interna de função não define curva paramétrica', () => {
  assert.equal(detectEquationType('log(x, 10)'), 'cartesian');
  assert.equal(detectEquationType('(a*cos(t), b*sin(t))'), 'parametric');
  assert.deepEqual(extractParameters(['(a*cos(t), b*sin(t))']), ['a', 'b']);
});

test('integral inválida gera erro', () => {
  assert.throws(() => calculateDefiniteIntegral('sqrt(-1)', -1, 1), /valor real finito/);
  assert.throws(() => calculateDefiniteIntegral('1\/x^2', -1, 1), /valor real finito/);
});

test('avalia curvas paramétricas com componentes escalares e parâmetros', () => {
  const result = evaluateParametric('(a*t, t^2)', 0, 2, 3, { a: 2 });
  assert.deepEqual(result, { x: [0, 2, 4], y: [0, 1, 4] });
  const invalid = evaluateParametric('(t, 1/t)', -1, 1, 3);
  assert.ok(Number.isNaN(invalid.y[1]));
});

test('bloqueia estruturas e funções que não pertencem a uma fórmula escalar', () => {
  assert.throws(() => evaluateGrid2D('[1:1000000000]', -1, 1, 10), /expressão escalar/);
  assert.throws(() => evaluateGrid2D('evaluate("2+2")', -1, 1, 10), /não é permitida/);
});

test('regressão é estável para coordenadas grandes', () => {
  assert.deepEqual(
    calculateLinearRegression([1_000_000_000, 1_000_000_001, 1_000_000_002], [1, 2, 3]),
    { m: 1, b: -999_999_999, rSquared: 1 },
  );
});

test('não inventa raiz ou interseção em assíntota', () => {
  const reciprocal = evaluateGrid2D('1/x', -10, 10, 200);
  const zero = evaluateGrid2D('0', -10, 10, 200);
  assert.equal(findNotablePoints(reciprocal, '1/x').filter(point => point.type === 'raiz').length, 0);
  assert.equal(findIntersections([reciprocal, zero], ['1/x', '0']).length, 0);
});
