/**
 * thermoEngine.ts — Módulo de Cálculos Termodinâmicos (Estado)
 *
 * Calcula propriedades termodinâmicas para água/vapor usando
 * equações simplificadas (gás ideal + tabelas de Antoine/Clausius-Clapeyron).
 *
 * Propriedades: Pressão, Temperatura, Volume, Entalpia, Entropia, Volume Específico
 */

// Constantes
const R_WATER = 461.5;      // J/(kg·K) - constante específica da água

// Propriedades da água no ponto de referência
const T_REF = 373.15;       // K (100°C)
const P_REF = 101325;       // Pa (1 atm)
const H_FG_REF = 2257000;   // J/kg (calor latente de vaporização a 100°C)
const S_FG_REF = 6049;      // J/(kg·K) (entropia de vaporização a 100°C)
const CP_LIQUID = 4186;     // J/(kg·K)
const CP_VAPOR = 2010;      // J/(kg·K)

export interface ThermoState {
  pressure: number;         // Pa
  temperature: number;      // K
  volume: number;           // m³
  specificVolume: number;   // m³/kg
  enthalpy: number;         // kJ/kg
  entropy: number;          // kJ/(kg·K)
  phase: 'líquido' | 'vapor' | 'saturado' | 'gás ideal';
  warnings: string[];
}

export type ThermoInput = {
  type: 'PT' | 'PV' | 'TV';
  pressure?: number;        // kPa
  temperature?: number;     // °C
  volume?: number;          // m³
  mass?: number;            // kg (default 1)
  substance?: 'water' | 'ideal';
};

/**
 * Pressão de saturação da água (equação simplificada de Antoine)
 * @param T_celsius - Temperatura em °C
 * @returns Pressão de saturação em kPa
 */
function saturationPressure(T_celsius: number): number {
  // Antoine equation for water (valid 1-374°C approximately)
  const T = T_celsius;
  if (T < 0 || T > 374) return NaN;
  const A = 8.07131, B = 1730.63, C = 233.426;
  const logP_mmHg = A - B / (C + T);
  const P_mmHg = Math.pow(10, logP_mmHg);
  return P_mmHg * 0.133322; // mmHg -> kPa
}

/**
 * Temperatura de saturação da água
 * @param P_kPa - Pressão em kPa
 * @returns Temperatura de saturação em °C
 */
export function saturationTemperature(P_kPa: number): number {
  const P_mmHg = P_kPa / 0.133322;
  const logP = Math.log10(P_mmHg);
  const A = 8.07131, B = 1730.63, C = 233.426;
  return B / (A - logP) - C;
}

/**
 * Calcula o estado termodinâmico
 */
export function calculateThermoState(input: ThermoInput): ThermoState {
  const warnings: string[] = [];
  const mass = input.mass || 1;
  const isIdeal = input.substance === 'ideal';
  
  let T_K: number;    // Temperatura em K
  let T_C: number;    // Temperatura em °C
  let P_Pa: number;   // Pressão em Pa
  let P_kPa: number;  // Pressão em kPa
  let V: number;      // Volume em m³
  let v: number;      // Volume específico m³/kg
  let h: number;      // Entalpia kJ/kg
  let s: number;      // Entropia kJ/(kg·K)
  let phase: ThermoState['phase'];

  if (input.type === 'PT') {
    P_kPa = input.pressure!;
    P_Pa = P_kPa * 1000;
    T_C = input.temperature!;
    T_K = T_C + 273.15;

    if (isIdeal) {
      v = (R_WATER * T_K) / P_Pa;
      V = v * mass;
      h = CP_VAPOR * T_C / 1000;
      s = CP_VAPOR * Math.log(T_K / 273.15) / 1000 - R_WATER * Math.log(P_Pa / P_REF) / 1000;
      phase = 'gás ideal';
    } else {
      const P_sat = saturationPressure(T_C);
      if (P_kPa > P_sat * 1.02) {
        // Líquido comprimido (aproximação)
        phase = 'líquido';
        v = 0.001; // m³/kg (aproximação para água líquida)
        V = v * mass;
        h = CP_LIQUID * T_C / 1000;
        s = CP_LIQUID * Math.log(T_K / 273.15) / 1000;
      } else if (P_kPa < P_sat * 0.98) {
        // Vapor superaquecido
        phase = 'vapor';
        v = (R_WATER * T_K) / P_Pa;
        V = v * mass;
        h = (H_FG_REF + CP_VAPOR * (T_C - 100)) / 1000;
        s = (S_FG_REF + CP_VAPOR * Math.log(T_K / T_REF)) / 1000;
      } else {
        // Saturado
        phase = 'saturado';
        v = (R_WATER * T_K) / P_Pa;
        V = v * mass;
        h = H_FG_REF / 1000;
        s = S_FG_REF / 1000;
        warnings.push('O estado está próximo da região de saturação. Resultados são aproximados.');
      }
    }
  } else if (input.type === 'PV') {
    P_kPa = input.pressure!;
    P_Pa = P_kPa * 1000;
    V = input.volume!;
    v = V / mass;

    // Calcular T pela equação de gás ideal
    T_K = (P_Pa * v) / R_WATER;
    T_C = T_K - 273.15;

    if (isIdeal) {
      h = CP_VAPOR * T_C / 1000;
      s = CP_VAPOR * Math.log(T_K / 273.15) / 1000 - R_WATER * Math.log(P_Pa / P_REF) / 1000;
      phase = 'gás ideal';
    } else {
      if (v < 0.005) {
        phase = 'líquido';
        T_K = T_C + 273.15; // keep as-is since v is very small
        h = CP_LIQUID * T_C / 1000;
        s = CP_LIQUID * Math.log(T_K / 273.15) / 1000;
        warnings.push('Volume específico muito baixo. Aproximação de líquido comprimido utilizada.');
      } else {
        phase = 'vapor';
        h = (H_FG_REF + CP_VAPOR * (T_C - 100)) / 1000;
        s = (S_FG_REF + CP_VAPOR * Math.log(T_K / T_REF)) / 1000;
      }
    }
  } else {
    // TV
    T_C = input.temperature!;
    T_K = T_C + 273.15;
    V = input.volume!;
    v = V / mass;

    P_Pa = (R_WATER * T_K) / v;
    P_kPa = P_Pa / 1000;

    if (isIdeal) {
      h = CP_VAPOR * T_C / 1000;
      s = CP_VAPOR * Math.log(T_K / 273.15) / 1000 - R_WATER * Math.log(P_Pa / P_REF) / 1000;
      phase = 'gás ideal';
    } else {
      const P_sat = saturationPressure(T_C);
      if (P_kPa > P_sat * 1.02) {
        phase = 'líquido';
        h = CP_LIQUID * T_C / 1000;
        s = CP_LIQUID * Math.log(T_K / 273.15) / 1000;
      } else {
        phase = 'vapor';
        h = (H_FG_REF + CP_VAPOR * (T_C - 100)) / 1000;
        s = (S_FG_REF + CP_VAPOR * Math.log(T_K / T_REF)) / 1000;
      }
    }
  }

  return {
    pressure: P_kPa,
    temperature: T_C,
    volume: V,
    specificVolume: v,
    enthalpy: h,
    entropy: s,
    phase,
    warnings,
  };
}
