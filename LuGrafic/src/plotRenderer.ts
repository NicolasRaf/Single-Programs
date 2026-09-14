/**
 * plotRenderer.ts — Wrapper do Plotly.js para o LuGrafic
 *
 * Renderiza gráficos 2D (linhas) e 3D (superfícies) com tema escuro
 * integrado e configuração responsiva automática.
 */

import Plotly from 'plotly.js-dist-min';
import type { PlotData2D, PlotData3D } from './mathEngine';

export type PlotStyle2D = 'lines' | 'markers' | 'lines+markers' | 'area';
export type PlotStyle3D = 'surface' | 'wireframe' | 'markers';

/** Cores do tema para os gráficos */
const THEME = {
  primary: '#ff0055',
  secondary: '#00d4ff',
  purple: '#9d00ff',
  amber: '#f59e0b',
  emerald: '#10b981',
  bgPaper: 'rgba(10, 14, 26, 0)',
  bgPlot: 'rgba(10, 14, 26, 0)',
  gridColor: 'rgba(255, 255, 255, 0.06)',
  zeroLineColor: 'rgba(255, 255, 255, 0.12)',
  textColor: '#8892a8',
  fontFamily: "'Inter', sans-serif",
};

/** Cycle de cores para múltiplos plots */
export const COLOR_CYCLE = [
  THEME.primary,
  THEME.secondary,
  THEME.purple,
  THEME.amber,
  THEME.emerald,
];

let plotColorIndex = 0;

/** Retorna a próxima cor do ciclo */
export function nextColor(): string {
  const color = COLOR_CYCLE[plotColorIndex % COLOR_CYCLE.length];
  plotColorIndex++;
  return color;
}

/** Reseta o índice de cores (ao limpar o gráfico) */
export function resetColorCycle(): void {
  plotColorIndex = 0;
}

/**
 * Layout base compartilhado entre 2D e 3D
 */
function baseLayout(): Partial<Plotly.Layout> {
  return {
    paper_bgcolor: THEME.bgPaper,
    plot_bgcolor: THEME.bgPlot,
    font: {
      family: THEME.fontFamily,
      color: THEME.textColor,
      size: 12,
    },
    margin: { l: 50, r: 30, t: 30, b: 50 },
    autosize: true,
    showlegend: false,
  };
}

/**
 * Renderiza um gráfico 2D (linha) no container especificado.
 *
 * @param container - Elemento DOM onde o gráfico será montado
 * @param data - Dados {x[], y[]} do mathEngine
 * @param exprLabel - Label para a curva (usado no hover)
 * @param append - Se true, adiciona ao gráfico existente ao invés de substituir
 */
export async function renderPlot2D(
  container: HTMLElement,
  items: { data: PlotData2D; exprLabel: string; color: string }[],
  style: PlotStyle2D = 'lines',
  append = false
): Promise<void> {
  const traces: Partial<Plotly.PlotData>[] = items.map(item => {
    const color = item.color;
    let mode: Plotly.PlotData['mode'] = 'lines';
    let fill: Plotly.PlotData['fill'] = 'none';

    if (style === 'markers') mode = 'markers';
    else if (style === 'lines+markers') mode = 'lines+markers';
    else if (style === 'area') {
      mode = 'lines';
      fill = 'tozeroy';
    }

    return {
      x: item.data.x,
      y: item.data.y,
      type: 'scatter' as Plotly.PlotType,
      mode,
      fill,
      name: item.exprLabel,
      line: {
        color: color,
        width: 2.5,
        shape: 'spline',
      },
      marker: { color, size: 4 },
      hovertemplate: `<b>${item.exprLabel}</b><br>x: %{x:.4f}<br>y: %{y:.4f}<extra></extra>`,
      connectgaps: false,
    };
  });

  const layout: Partial<Plotly.Layout> = {
    ...baseLayout(),
    xaxis: {
      gridcolor: THEME.gridColor,
      zerolinecolor: THEME.zeroLineColor,
      zerolinewidth: 1,
      showgrid: true,
      showline: false,
    },
    yaxis: {
      gridcolor: THEME.gridColor,
      zerolinecolor: THEME.zeroLineColor,
      zerolinewidth: 1,
      showgrid: true,
      showline: false,
    },
    hovermode: 'closest' as const,
    dragmode: 'pan' as const,
  };

  const config: Partial<Plotly.Config> = {
    responsive: true,
    displaylogo: false,
    scrollZoom: true,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
    displayModeBar: true,
    toImageButtonOptions: {
      format: 'png',
      filename: `lugrafic_plot`,
      scale: 2,
    },
  };

  if (append) {
    await Plotly.addTraces(container, traces as Plotly.PlotData[]);
  } else {
    await Plotly.newPlot(container, traces as Plotly.PlotData[], layout, config);
  }
}

/**
 * Renderiza um scatter 2D a partir de coordenadas avulsas.
 */
export async function renderScatter2D(
  container: HTMLElement,
  data: PlotData2D,
  label = 'Coordenadas',
  style: PlotStyle2D = 'lines+markers'
): Promise<void> {
  const color = nextColor();

  let mode: Plotly.PlotData['mode'] = 'lines+markers';
  let fill: Plotly.PlotData['fill'] = 'none';

  if (style === 'lines') mode = 'lines';
  else if (style === 'markers') mode = 'markers';
  else if (style === 'area') {
    mode = 'lines';
    fill = 'tozeroy';
  }

  const trace: Partial<Plotly.PlotData> = {
    x: data.x,
    y: data.y,
    type: 'scatter' as Plotly.PlotType,
    mode,
    fill,
    name: label,
    line: { color, width: 2 },
    marker: { color, size: 6, symbol: 'circle' },
    hovertemplate: `<b>${label}</b><br>x: %{x:.4f}<br>y: %{y:.4f}<extra></extra>`,
  };

  const layout: Partial<Plotly.Layout> = {
    ...baseLayout(),
    xaxis: {
      gridcolor: THEME.gridColor,
      zerolinecolor: THEME.zeroLineColor,
      zerolinewidth: 1,
      showgrid: true,
    },
    yaxis: {
      gridcolor: THEME.gridColor,
      zerolinecolor: THEME.zeroLineColor,
      zerolinewidth: 1,
      showgrid: true,
    },
    hovermode: 'closest' as const,
    dragmode: 'pan' as const,
  };

  const config: Partial<Plotly.Config> = {
    responsive: true,
    displaylogo: false,
    scrollZoom: true,
    displayModeBar: true,
  };

  await Plotly.newPlot(container, [trace], layout, config);
}

/**
 * Renderiza uma superfície 3D no container especificado.
 *
 * @param container - Elemento DOM
 * @param data - Dados {x[][], y[][], z[][]} do mathEngine
 * @param exprLabel - Label da superfície
 */
export async function renderPlot3D(
  container: HTMLElement,
  items: { data: PlotData3D; exprLabel: string; color: string }[],
  style: PlotStyle3D = 'surface'
): Promise<void> {
  const colorscale: Plotly.ColorScale = [
    [0, '#1a0a0e'],
    [0.15, '#3b0040'],
    [0.3, '#ff0055'],
    [0.5, '#ff0055'],
    [0.75, '#9d00ff'],
    [0.9, '#00d4ff'],
    [1, '#e0f7ff'],
  ];

  const traces: any[] = items.map(item => {
    if (style === 'markers') {
      return {
        x: item.data.x.flat(),
        y: item.data.y.flat(),
        z: item.data.z.flat(),
        type: 'scatter3d',
        mode: 'markers',
        marker: {
          size: 3,
          color: item.data.z.flat(),
          colorscale,
          opacity: 0.8,
        },
        name: item.exprLabel,
        hovertemplate: `<b>${item.exprLabel}</b><br>x: %{x:.3f}<br>y: %{y:.3f}<br>z: %{z:.3f}<extra></extra>`,
      };
    } else {
      return {
        x: item.data.x,
        y: item.data.y,
        z: item.data.z,
        type: 'surface' as Plotly.PlotType,
        colorscale,
        opacity: style === 'wireframe' ? 0.7 : 0.92,
        contours: {
          z: { show: true, usecolormap: true, highlightcolor: '#ffffff', project: { z: false } },
          x: { show: style === 'wireframe', color: '#ffffff', width: 1 },
          y: { show: style === 'wireframe', color: '#ffffff', width: 1 },
        },
        name: item.exprLabel,
        hovertemplate: `<b>${item.exprLabel}</b><br>x: %{x:.3f}<br>y: %{y:.3f}<br>z: %{z:.3f}<extra></extra>`,
        showscale: false,
      };
    }
  });

  const layout: Partial<Plotly.Layout> = {
    ...baseLayout(),
    margin: { l: 10, r: 10, t: 10, b: 10 },
    scene: {
      bgcolor: THEME.bgPlot,
      xaxis: {
        gridcolor: THEME.gridColor,
        zerolinecolor: THEME.zeroLineColor,
        showbackground: false,
        title: { text: 'X' },
      },
      yaxis: {
        gridcolor: THEME.gridColor,
        zerolinecolor: THEME.zeroLineColor,
        showbackground: false,
        title: { text: 'Y' },
      },
      zaxis: {
        gridcolor: THEME.gridColor,
        zerolinecolor: THEME.zeroLineColor,
        showbackground: false,
        title: { text: 'Z' },
      },
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.2 },
      },
    },
  };

  const config: Partial<Plotly.Config> = {
    responsive: true,
    displaylogo: false,
    scrollZoom: true,
    displayModeBar: true,
    toImageButtonOptions: {
      format: 'png',
      filename: `lugrafic_3d_plot`,
      scale: 2,
    },
  };

  await Plotly.newPlot(container, traces as unknown as Plotly.PlotData[], layout, config);
}

/**
 * Renderiza scatter 3D a partir de coordenadas avulsas.
 */
export async function renderScatter3D(
  container: HTMLElement,
  x: number[],
  y: number[],
  z: number[],
  label = 'Coordenadas 3D',
  style: PlotStyle3D = 'markers'
): Promise<void> {
  const mode = style === 'wireframe' ? 'lines' : (style === 'surface' ? 'lines+markers' : 'markers');

  const trace: Partial<Plotly.PlotData> = {
    x,
    y,
    z,
    type: 'scatter3d' as Plotly.PlotType,
    mode,
    name: label,
    marker: {
      color: THEME.primary,
      size: 4,
      symbol: 'circle',
    },
    line: {
      color: THEME.primary,
      width: 2,
    },
  };

  const layout: Partial<Plotly.Layout> = {
    ...baseLayout(),
    margin: { l: 10, r: 10, t: 10, b: 10 },
    scene: {
      bgcolor: THEME.bgPlot,
      xaxis: { gridcolor: THEME.gridColor, showbackground: false, title: { text: 'X' } },
      yaxis: { gridcolor: THEME.gridColor, showbackground: false, title: { text: 'Y' } },
      zaxis: { gridcolor: THEME.gridColor, showbackground: false, title: { text: 'Z' } },
    },
  };

  const config: Partial<Plotly.Config> = {
    responsive: true,
    displaylogo: false,
    scrollZoom: true,
    displayModeBar: true,
  };

  await Plotly.newPlot(container, [trace as Plotly.PlotData], layout, config);
}

/**
 * Limpa todo o conteúdo do gráfico e remove o plot do DOM.
 */
export function clearPlot(container: HTMLElement): void {
  Plotly.purge(container);
  resetColorCycle();
}
