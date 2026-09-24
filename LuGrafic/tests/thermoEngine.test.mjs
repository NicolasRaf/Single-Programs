import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateThermoState } from '../src/thermoEngine.ts';

test('rejeita entradas físicas inválidas', () => {
  assert.throws(() => calculateThermoState({ type: 'PT', pressure: 0, temperature: 100, mass: 1, substance: 'water' }), /pressão/);
  assert.throws(() => calculateThermoState({ type: 'TV', temperature: -300, volume: 1, mass: 1, substance: 'ideal' }), /temperatura/);
});

test('identifica mistura saturada por temperatura e volume', () => {
  const state = calculateThermoState({ type: 'TV', temperature: 100, volume: 0.1, mass: 1, substance: 'water' });
  assert.equal(state.phase, 'saturado');
  assert.ok(Math.abs(state.pressure - 101.42) < 1);
  assert.match(state.warnings[0], /título aproximado/);
});

test('não inventa temperatura da água líquida a partir de P e V', () => {
  assert.throws(
    () => calculateThermoState({ type: 'PV', pressure: 101.325, volume: 0.001, mass: 1, substance: 'water' }),
    /não determinam a temperatura/,
  );
});
