import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCoordinates, parseLocaleNumber } from '../src/coordinateParser.ts';

test('aceita CSV com espaços e não colapsa células TSV vazias', () => {
  assert.deepEqual(parseCoordinates('1, 2\n3, 4').data2d, { x: [1, 3], y: [2, 4] });
  assert.throws(() => parseCoordinates('1\t\t3\n4\t\t6'), /coordenada vazia/);
});

test('preserva vírgula decimal quando o delimitador é espaço ou ponto e vírgula', () => {
  assert.deepEqual(parseCoordinates('1,5 2,5\n3,5 4,5').data2d, { x: [1.5, 3.5], y: [2.5, 4.5] });
  assert.deepEqual(parseCoordinates('1,5;2,5\n3,5;4,5').data2d, { x: [1.5, 3.5], y: [2.5, 4.5] });
});

test('rejeita células vazias, dimensões inconsistentes e números parciais', () => {
  assert.throws(() => parseCoordinates('1;;3\n4;;6'), /coordenada vazia/);
  assert.throws(() => parseCoordinates('1;2\n3;4;5'), /todas as linhas/);
  assert.throws(() => parseCoordinates('12foo;34\n5;6'), /número inválido/);
  assert.ok(Number.isNaN(parseLocaleNumber('1e309')));
});
