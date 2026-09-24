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
const H_F_REF = 419200;      // J/kg (líquido saturado a 100°C)
const S_F_REF = 1307.2;      // J/(kg·K) (líquido saturado a 100°C)
const CP_LIQUID = 4186;     // J/(kg·K)
const CP_VAPOR = 2010;      // J/(kg·K)

export interface ThermoState {
  pressure: number;         // kPa
  temperature: number;      // °C
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
  if (!Number.isFinite(P_kPa) || P_kPa <= 0) throw new Error('A pressão deve ser positiva.');
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
  const mass = input.mass ?? 1;
  const isIdeal = input.substance === 'ideal';
  if (!Number.isFinite(mass) || mass <= 0) throw new Error('A massa deve ser um número positivo.');

  const requirePositive = (value: number | undefined, label: string): number => {
    if (!Number.isFinite(value) || value! <= 0) throw new Error(`${label} deve ser um número positivo.`);
    return value!;
  };
  const requireTemperature = (value: number | undefined): number => {
    if (!Number.isFinite(value) || value! <= -273.15) throw new Error('A temperatura deve ser maior que −273,15 °C.');
    return value!;
  };
  const liquidProps = (temperature: number) => ({
    h: CP_LIQUID * temperature / 1000,
    s: CP_LIQUID * Math.log((temperature + 273.15) / 273.15) / 1000,
  });
  const vaporProps = (temperature: number, pressurePa: number) => ({
    h: (H_F_REF + H_FG_REF + CP_VAPOR * (temperature - 100)) / 1000,
    s: (S_F_REF + S_FG_REF + CP_VAPOR * Math.log((temperature + 273.15) / T_REF)
      - R_WATER * Math.log(pressurePa / P_REF)) / 1000,
  });
  
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
    P_kPa = requirePositive(input.pressure, 'A pressão');
    P_Pa = P_kPa * 1000;
    T_C = requireTemperature(input.temperature);
    T_K = T_C + 273.15;

    if (isIdeal) {
      v = (R_WATER * T_K) / P_Pa;
      V = v * mass;
      h = CP_VAPOR * T_C / 1000;
      s = CP_VAPOR * Math.log(T_K / 273.15) / 1000 - R_WATER * Math.log(P_Pa / P_REF) / 1000;
      phase = 'gás ideal';
    } else {
      if (T_C > 374) {
        phase = 'vapor';
        v = (R_WATER * T_K) / P_Pa;
        V = v * mass;
        ({ h, s } = vaporProps(T_C, P_Pa));
        warnings.push('Estado acima do domínio da correlação de saturação; aproximação de vapor utilizada.');
        return { pressure: P_kPa, temperature: T_C, volume: V, specificVolume: v, enthalpy: h, entropy: s, phase, warnings };
      }
      const P_sat = saturationPressure(T_C);
      if (P_kPa > P_sat * 1.02) {
        // Líquido comprimido (aproximação)
        phase = 'líquido';
        v = 0.001; // m³/kg (aproximação para água líquida)
        V = v * mass;
        ({ h, s } = liquidProps(T_C));
      } else if (P_kPa < P_sat * 0.98) {
        // Vapor superaquecido
        phase = 'vapor';
        v = (R_WATER * T_K) / P_Pa;
        V = v * mass;
        ({ h, s } = vaporProps(T_C, P_Pa));
      } else {
        throw new Error('Na saturação, pressão e temperatura não determinam o estado. Informe volume e massa para calcular o título da mistura.');
      }
    }
  } else if (input.type === 'PV') {
    P_kPa = requirePositive(input.pressure, 'A pressão');
    P_Pa = P_kPa * 1000;
    V = requirePositive(input.volume, 'O volume');
    v = V / mass;

    if (isIdeal) {
      T_K = (P_Pa * v) / R_WATER;
      T_C = T_K - 273.15;
      h = CP_VAPOR * T_C / 1000;
      s = CP_VAPOR * Math.log(T_K / 273.15) / 1000 - R_WATER * Math.log(P_Pa / P_REF) / 1000;
      phase = 'gás ideal';
    } else {
      T_C = saturationTemperature(P_kPa);
      if (T_C < 0 || T_C > 374) throw new Error('Pressão fora do domínio suportado para água nos modos PV/TV.');
      T_K = T_C + 273.15;
      const vf = 0.001;
      const vg = R_WATER * T_K / P_Pa;
      if (v <= vf * 1.05) {
        throw new Error('Para água líquida, pressão e volume não determinam a temperatura neste modelo. Use P + T.');
      } else if (v < vg) {
        const quality = Math.max(0, Math.min(1, (v - vf) / (vg - vf)));
        const liquid = liquidProps(T_C);
        phase = 'saturado';
        h = liquid.h + quality * H_FG_REF / 1000;
        s = liquid.s + quality * H_FG_REF / T_K / 1000;
        warnings.push(`Mistura saturada: título aproximado ${(quality * 100).toFixed(1)}%.`);
      } else {
        phase = 'vapor';
        T_K = (P_Pa * v) / R_WATER;
        T_C = T_K - 273.15;
        ({ h, s } = vaporProps(T_C, P_Pa));
      }
    }
  } else {
    // TV
    T_C = requireTemperature(input.temperature);
    T_K = T_C + 273.15;
    V = requirePositive(input.volume, 'O volume');
    v = V / mass;

    P_Pa = (R_WATER * T_K) / v;
    P_kPa = P_Pa / 1000;

    if (isIdeal) {
      h = CP_VAPOR * T_C / 1000;
      s = CP_VAPOR * Math.log(T_K / 273.15) / 1000 - R_WATER * Math.log(P_Pa / P_REF) / 1000;
      phase = 'gás ideal';
    } else {
      if (T_C < 0 || T_C > 374) throw new Error('Temperatura fora do domínio suportado para água no modo T + V.');
      const P_sat = saturationPressure(T_C);
      const vf = 0.001;
      const vg = R_WATER * T_K / (P_sat * 1000);
      if (v <= vf * 1.05) {
        throw new Error('Para água líquida, temperatura e volume não determinam a pressão neste modelo. Use P + T.');
      } else if (v < vg) {
        const quality = Math.max(0, Math.min(1, (v - vf) / (vg - vf)));
        const liquid = liquidProps(T_C);
        P_kPa = P_sat;
        P_Pa = P_kPa * 1000;
        phase = 'saturado';
        h = liquid.h + quality * H_FG_REF / 1000;
        s = liquid.s + quality * H_FG_REF / T_K / 1000;
        warnings.push(`Mistura saturada: título aproximado ${(quality * 100).toFixed(1)}%.`);
      } else {
        phase = 'vapor';
        ({ h, s } = vaporProps(T_C, P_Pa));
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
