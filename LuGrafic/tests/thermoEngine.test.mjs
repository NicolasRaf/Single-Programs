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

test('aceita entalpia como entrada e identifica mistura saturada', () => {
  const state = calculateThermoState({ type: 'Ph', pressure: 101.325, enthalpy: 1547.5, mass: 2, substance: 'water' });
  assert.equal(state.phase, 'saturado');
  assert.ok(Math.abs(state.temperature - 100) < 1);
  assert.ok(Math.abs(state.enthalpy - 1547.5) < 1e-10);
  assert.ok(state.volume > 1);
  assert.match(state.warnings[0], /título aproximado/);
});

test('aceita entropia como entrada para gás ideal', () => {
  const reference = calculateThermoState({ type: 'PT', pressure: 200, temperature: 180, mass: 1, substance: 'ideal' });
  const state = calculateThermoState({ type: 'Ps', pressure: 200, entropy: reference.entropy, mass: 1, substance: 'ideal' });
  assert.ok(Math.abs(state.temperature - 180) < 1e-9);
  assert.ok(Math.abs(state.specificVolume - reference.specificVolume) < 1e-12);
});

test('aceita volume específico como entrada sem depender da massa', () => {
  const state = calculateThermoState({ type: 'Pv', pressure: 101.325, specificVolume: 1.7, mass: 3, substance: 'ideal' });
  assert.ok(Math.abs(state.specificVolume - 1.7) < 1e-12);
  assert.ok(Math.abs(state.volume - 5.1) < 1e-12);
});
