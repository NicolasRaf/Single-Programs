/**
 * main.ts — Orquestrador Principal do LuGrafic
 *
 * Conecta os módulos mathEngine, plotRenderer e coordinateParser
 * aos elementos da interface, gerencia estado e eventos.
 */

import './index.css';
import { evaluateDerivative } from './mathEngine';
import Plotly from 'plotly.js-dist-min';
import { evaluateGrid2D, evaluateGrid3D, is3DExpression, extractParameters, calculateDefiniteIntegral, detectEquationType, evaluateParametric, evaluatePolar, findNotablePoints, calculateLinearRegression, findIntersections, normalizeExpression, type PlotData2D, type PlotData3D, type NotablePoint } from './mathEngine';
import { calculateThermoState, type ThermoInput } from './thermoEngine';
import {
  renderPlot2D,
  renderPlot3D,
  renderScatter2D,
  renderScatter3D,
  clearPlot,
  resetColorCycle,
  nextColor,
  PlotStyle2D,
  PlotStyle3D
} from './plotRenderer';
import { parseCoordinates, parseLocaleNumber } from './coordinateParser';

// ────────────────────────────────────────────────────────
// DOM References
// ────────────────────────────────────────────────────────

const $btn2D = document.getElementById('btn-2d') as HTMLButtonElement;
const $btn3D = document.getElementById('btn-3d') as HTMLButtonElement;
const $tabFunction = document.getElementById('tab-function') as HTMLButtonElement;
const $tabCoordinates = document.getElementById('tab-coordinates') as HTMLButtonElement;
const $panelFunction = document.getElementById('panel-function') as HTMLDivElement;
const $panelCoordinates = document.getElementById('panel-coordinates') as HTMLDivElement;
const $equationList = document.getElementById('equation-list') as HTMLDivElement;
const $btnAddEquation = document.getElementById('btn-add-equation') as HTMLButtonElement;
const $mathToolbar = document.getElementById('math-toolbar') as HTMLDivElement;
const $inputCoordinates = document.getElementById('input-coordinates') as HTMLTextAreaElement;
const $equationLabelIcon = document.getElementById('equation-label-icon') as HTMLSpanElement;
const $coordLabelIcon = document.getElementById('coord-label-icon') as HTMLSpanElement;
const $btnPlot = document.getElementById('btn-plot') as HTMLButtonElement;
const $btnClearAll = document.getElementById('btn-clear-all') as HTMLButtonElement;
const $btnDownloadPng = document.getElementById('btn-download-png') as HTMLButtonElement;
const $btnDownloadCsv = document.getElementById('btn-download-csv') as HTMLButtonElement;
const $btnSuggestCoord = document.getElementById('btn-suggest-coord') as HTMLButtonElement;
const $plotContainer = document.getElementById('plot-container') as HTMLDivElement;
const $plotPlaceholder = document.getElementById('plot-placeholder') as HTMLDivElement;
const $errorDisplay = document.getElementById('error-display') as HTMLDivElement;
const $historyList = document.getElementById('history-list') as HTMLUListElement;
const $rowZAxis = document.getElementById('row-z-axis') as HTMLDivElement;

const $selectStyle2d = document.getElementById('select-style-2d') as HTMLSelectElement;
const $selectStyle3d = document.getElementById('select-style-3d') as HTMLSelectElement;

// Coordinate table elements
const $subtabTable = document.getElementById('subtab-table') as HTMLButtonElement;
const $subtabPaste = document.getElementById('subtab-paste') as HTMLButtonElement;
const $coordTableView = document.getElementById('coord-table-view') as HTMLDivElement;
const $coordPasteView = document.getElementById('coord-paste-view') as HTMLDivElement;
const $coordTableHeader = document.getElementById('coord-table-header') as HTMLTableRowElement;
const $coordTableBody = document.getElementById('coord-table-body') as HTMLTableSectionElement;
const $btnAddRow = document.getElementById('btn-add-row') as HTMLButtonElement;
const $btnRemoveRow = document.getElementById('btn-remove-row') as HTMLButtonElement;
const $btnImportPaste = document.getElementById('btn-import-paste') as HTMLButtonElement;
const $coordCount = document.getElementById('coord-count') as HTMLSpanElement;
const $toggleAnalysis = document.getElementById('toggle-analysis') as HTMLInputElement;
const $toggleTrendline = document.getElementById('toggle-trendline') as HTMLInputElement;

const $xLog = document.getElementById('x-log') as HTMLInputElement;
const $yLog = document.getElementById('y-log') as HTMLInputElement;

const $btnClearCoord = document.getElementById('btn-clear-coord') as HTMLButtonElement;

// Accordion Logic
document.querySelectorAll('.panel-label.collapsible').forEach(label => {
  // Add 'collapsed' to all collapsibles by default initially to ensure state matches UI
  label.classList.add('collapsed');
  label.setAttribute('role', 'button');
  label.setAttribute('tabindex', '0');
  label.setAttribute('aria-expanded', 'false');
  const toggleAccordion = () => {
    const targetId = label.getAttribute('data-target');
    const targetContent = targetId ? document.getElementById(targetId) : null;
    if (targetContent) {
      label.classList.toggle('collapsed');
      targetContent.classList.toggle('collapsed');
      label.setAttribute('aria-expanded', String(!label.classList.contains('collapsed')));
    }
  };

  label.addEventListener('click', () => {
    toggleAccordion();
  });
  label.addEventListener('keydown', (event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') { keyboardEvent.preventDefault(); toggleAccordion(); }
  });
});

// Download Logic
if ($btnDownloadPng) {
  $btnDownloadPng.addEventListener('click', () => {
    if (hasPlot && $plotContainer) {
      Plotly.downloadImage($plotContainer, {
        format: 'png',
        width: 1200,
        height: 800,
        filename: 'lugrafic_export'
      });
    } else {
      showError('Nenhum gráfico para exportar.');
    }
  });
}

if ($btnDownloadCsv) {
  $btnDownloadCsv.addEventListener('click', () => {
    if (lastPlot?.mode === 'coordinates') {
      exportCoordinatesCSV();
    } else {
      if (!hasPlot) {
        showError('Nenhum gráfico para exportar.');
        return;
      }
      exportEquationsCSV();
    }
  });
}

// Suggestion Logic for Coordinates
if ($btnSuggestCoord) {
  $btnSuggestCoord.addEventListener('click', () => {
    setCoordSubtab('paste');
    let text = '';
    if (currentDimension === '3d') {
      const shapeType3D = Math.floor(Math.random() * 2);
      if (shapeType3D === 0) { // 3D Helix
        const numPoints = 100;
        for (let i = 0; i < numPoints; i++) {
          const t = i * 0.2;
          text += `${(5 * Math.cos(t)).toFixed(3)}, ${(5 * Math.sin(t)).toFixed(3)}, ${(t - 10).toFixed(3)}\n`;
        }
      } else { // 3D Scatter on a surface (Paraboloid)
        const numPoints = 100;
        for (let i = 0; i < numPoints; i++) {
          const x = (Math.random() - 0.5) * 20;
          const y = (Math.random() - 0.5) * 20;
          const z = (x*x + y*y) / 10 - 5;
          text += `${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)}\n`;
        }
      }
    } else {
      const shapeType = Math.floor(Math.random() * 4);
      if (shapeType === 0) { // Spiral
        const numPoints = 100;
        for (let i = 0; i < numPoints; i++) {
          const t = i * 0.1;
          text += `${(t * Math.cos(t)).toFixed(3)}, ${(t * Math.sin(t)).toFixed(3)}\n`;
        }
      } else if (shapeType === 1) { // Circle
        const numPoints = 50;
        for (let i = 0; i <= numPoints; i++) {
          const t = (i / numPoints) * 2 * Math.PI;
          text += `${(5 * Math.cos(t)).toFixed(3)}, ${(5 * Math.sin(t)).toFixed(3)}\n`;
        }
      } else if (shapeType === 2) { // Heart shape
        const numPoints = 100;
        for (let i = 0; i <= numPoints; i++) {
          const t = (i / numPoints) * 2 * Math.PI;
          const x = 16 * Math.pow(Math.sin(t), 3);
          const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
          // Scale it down a bit to fit nicely in -10 to 10
          text += `${(x * 0.5).toFixed(3)}, ${(y * 0.5).toFixed(3)}\n`;
        }
      } else { // Dampened sine wave
        const numPoints = 100;
        for (let i = 0; i < numPoints; i++) {
          const x = -10 + i * (20 / numPoints);
          const y = Math.sin(x * 3) * Math.exp(-Math.abs(x) * 0.2) * 5;
          text += `${x.toFixed(3)}, ${y.toFixed(3)}\n`;
        }
      }
    }

    if (typeof $inputCoordinates !== 'undefined' && $inputCoordinates) {
      $inputCoordinates.value = text;
    }
    
    // Automatically plot after suggesting
    handlePlot();
  });
}

function exportCoordinatesCSV() {
  if (!lastPlot || lastPlot.mode !== 'coordinates') {
    showError('Nenhum dado de coordenada para exportar.');
    return;
  }
  const { x, y, z } = lastPlot;
  const csv = [z ? ['X', 'Y', 'Z'] : ['X', 'Y'], ...x.map((value, index) =>
    z ? [value, y[index], z[index]] : [value, y[index]])]
    .map(row => row.map(csvCell).join(',')).join('\r\n');
  triggerDownload(csv, 'lugrafic_coordenadas.csv');
}

function exportEquationsCSV() {
  if (!lastPlot || lastPlot.mode !== 'function') {
    showError('Nenhuma equação válida para exportar.');
    return;
  }
  let csv: string;
  if (lastPlot.dimension === '3d') {
    const rows: Array<Array<string | number>> = [['Equação', 'X', 'Y', 'Z']];
    lastPlot.series3d.forEach(series => series.data.z.forEach((zRow, row) => zRow.forEach((z, col) => {
      rows.push([series.label, series.data.x[row][col], series.data.y[row][col], z]);
    })));
    csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  } else {
    const rows: Array<Array<string | number>> = [['Equação', 'X', 'Y']];
    lastPlot.series2d.forEach(series => series.data.x.forEach((x, index) => {
      rows.push([series.label, x, series.data.y[index]]);
    }));
    csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  }
  triggerDownload(csv, 'lugrafic_equacoes.csv');
}

function csvCell(value: string | number): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  return `"${value.replace(/"/g, '""')}"`;
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const $xMin = document.getElementById('x-min') as HTMLInputElement;
const $xMax = document.getElementById('x-max') as HTMLInputElement;
const $yMin = document.getElementById('y-min') as HTMLInputElement;
const $yMax = document.getElementById('y-max') as HTMLInputElement;
const $steps = document.getElementById('input-steps') as HTMLInputElement;
const $zMin = document.getElementById('z-min') as HTMLInputElement;
const $zMax = document.getElementById('z-max') as HTMLInputElement;

// ────────────────────────────────────────────────────────
// State
// ────────────────────────────────────────────────────────

type AppMode = 'function' | 'coordinates' | 'thermo';
type Dimension = '2d' | '3d';
type CoordSubtab = 'table' | 'paste';

interface HistoryEntry {
  label: string;
  mode: 'function' | 'coordinates';
  dimension: Dimension;
  equations?: EquationInput[];
  coordinates?: { x: number[]; y: number[]; z?: number[] };
  timestamp: number;
}

type LastPlot =
  | { mode: 'function'; dimension: '2d'; series2d: Array<{ label: string; data: PlotData2D }>; series3d: [] }
  | { mode: 'function'; dimension: '3d'; series2d: []; series3d: Array<{ label: string; data: PlotData3D }> }
  | { mode: 'coordinates'; dimension: Dimension; x: number[]; y: number[]; z?: number[] };

let currentMode: AppMode = 'function';
let currentDimension: Dimension = '2d';
let currentCoordSubtab: CoordSubtab = 'table';
let history: HistoryEntry[] = [];
let hasPlot = false;
let lastPlot: LastPlot | null = null;
let coordinateDraft: Array<{ x: string; y: string; z: string }> = [];

// ────────────────────────────────────────────────────────
// Equation State Management
// ────────────────────────────────────────────────────────

interface EquationInput {
  id: string;
  expr: string;
  color: string;
  integral?: { active: boolean; a: number; b: number };
  derivative?: boolean;
}

let equations: EquationInput[] = [];
let activeEquationInput: HTMLInputElement | null = null;
let currentParameters: Record<string, number> = {};

const $parametersContainer = document.getElementById('parameters-container') as HTMLDivElement;
const $parametersList = document.getElementById('parameters-list') as HTMLDivElement;

function updateParameters(exprs: string[]) {
  const params = extractParameters(exprs);
  
  const newParams: Record<string, number> = {};
  params.forEach(p => {
    newParams[p] = currentParameters[p] !== undefined ? currentParameters[p] : 1;
  });
  currentParameters = newParams;
  
  if (params.length === 0) {
    if ($parametersContainer) $parametersContainer.classList.add('hidden');
    return;
  }
  
  if ($parametersContainer) {
    $parametersContainer.classList.remove('hidden');
    $parametersList.innerHTML = '';
    
    params.forEach(p => {
      const row = document.createElement('div');
      row.className = 'param-row';
      
      const label = document.createElement('span');
      label.className = 'param-label';
      label.innerText = `${p} = ${currentParameters[p]}`;
      
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'param-slider';
      slider.min = '-10';
      slider.max = '10';
      slider.step = '0.1';
      slider.value = currentParameters[p].toString();
      
      slider.addEventListener('input', (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        currentParameters[p] = val;
        label.innerText = `${p} = ${val}`;
        if (hasPlot) handlePlot();
      });
      
      row.appendChild(label);
      row.appendChild(slider);
      $parametersList.appendChild(row);
    });
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function nextColorForEq(): string {
  // Use nextColor from plotRenderer
  return nextColor();
}

function addEquation(expr = ''): void {
  const id = generateId();
  equations.push({ id, expr, color: nextColorForEq() });
  renderEquationList();
}

function removeEquation(id: string): void {
  equations = equations.filter(eq => eq.id !== id);
  renderEquationList();
  if (hasPlot) handlePlot();
}

function updateEquation(id: string, expr: string): void {
  const eq = equations.find(e => e.id === id);
  if (eq) eq.expr = expr;
  
  if (is3DExpression(expr) && currentDimension === '2d') {
    $btn3D.classList.add('pulse');
    setTimeout(() => $btn3D.classList.remove('pulse'), 2000);
  }
}

function renderEquationList(): void {
  const activeId = activeEquationInput?.dataset.equationId;
  activeEquationInput = null;
  $equationList.innerHTML = '';
  equations.forEach((eq) => {
    const row = document.createElement('div');
    row.className = 'equation-row';
    
    const colorIndicator = document.createElement('input');
    colorIndicator.type = 'color';
    colorIndicator.className = 'equation-color';
    colorIndicator.value = eq.color;
    
    colorIndicator.addEventListener('input', (e) => {
      const newColor = (e.target as HTMLInputElement).value;
      eq.color = newColor;
      if (hasPlot) handlePlot();
    });
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'equation-input';
    input.value = eq.expr;
    input.placeholder = currentDimension === '3d' ? 'z = sin(x) * cos(y)' : 'y = sin(x)';
    input.dataset.equationId = eq.id;
    if (eq.id === activeId || !activeEquationInput) activeEquationInput = input;
    input.setAttribute('aria-label', `Fórmula ${equations.indexOf(eq) + 1}`);
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.setAttribute('list', 'formula-examples');
    
    input.addEventListener('focus', () => {
       activeEquationInput = input;
    });
    
    input.addEventListener('input', (e) => {
      updateEquation(eq.id, (e.target as HTMLInputElement).value);
    });

    input.addEventListener('blur', () => {
      if (!input.value.trim()) return;
      try {
        normalizeExpression(input.value);
        input.classList.remove('invalid');
        input.removeAttribute('aria-invalid');
      } catch {
        input.classList.add('invalid');
        input.setAttribute('aria-invalid', 'true');
      }
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handlePlot();
      }
    });
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove-eq';
    removeBtn.title = 'Remover Equação';
    removeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    removeBtn.onclick = () => removeEquation(eq.id);
    
    const suggestBtn = document.createElement('button');
    suggestBtn.className = 'btn-suggest-eq-row btn-ghost';
    suggestBtn.title = 'Sugerir Função Aleatória';
    suggestBtn.style.padding = '0';
    suggestBtn.style.width = '32px';
    suggestBtn.style.height = '32px';
    suggestBtn.style.display = 'flex';
    suggestBtn.style.alignItems = 'center';
    suggestBtn.style.justifyContent = 'center';
    suggestBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z"></path></svg>';
    suggestBtn.onclick = () => {
      if (currentDimension === '2d') {
        const examples2D = ['sin(x) * x', 'x^3 - 2*x', '(3*cos(t), 3*sin(t))', 'theta', 'sin(x^2)', 'exp(-x^2)', '(cos(t)*t, sin(t)*t)', 'x^2 - 4'];
        updateEquation(eq.id, examples2D[Math.floor(Math.random() * examples2D.length)]);
      } else {
        const examples3D = ['sin(sqrt(x^2 + y^2))', 'x^2 - y^2', 'sin(x) * cos(y)', 'exp(-(x^2 + y^2))', '(sin(x*5) + cos(y*5)) / 5'];
        updateEquation(eq.id, examples3D[Math.floor(Math.random() * examples3D.length)]);
      }
      renderEquationList();
      handlePlot();
    };
    
    const integralBtn = document.createElement('button');
    integralBtn.className = 'btn-integral-eq';
    integralBtn.title = 'Calcular Integral';
    integralBtn.innerHTML = '∫';
    integralBtn.setAttribute('aria-label', 'Calcular integral definida');
    integralBtn.setAttribute('aria-pressed', String(!!eq.integral?.active));
    integralBtn.onclick = () => {
      if (!eq.integral) eq.integral = { active: false, a: 0, b: 1 };
      eq.integral.active = !eq.integral.active;
      renderEquationList();
      if (hasPlot) handlePlot();
    };
    
    const derivativeBtn = document.createElement('button');
    derivativeBtn.className = 'btn-integral-eq';
    derivativeBtn.textContent = 'f′';
    derivativeBtn.title = 'Mostrar derivada em x (curva tracejada)';
    derivativeBtn.setAttribute('aria-label', 'Mostrar derivada em x');
    derivativeBtn.setAttribute('aria-pressed', String(!!eq.derivative));
    derivativeBtn.onclick = () => {
      eq.derivative = !eq.derivative;
      renderEquationList();
      handlePlot();
    };
    const supportsCalculus = () => {
      try { return detectEquationType(eq.expr) === 'cartesian' && !is3DExpression(eq.expr); }
      catch { return false; }
    };
    const updateCalculusButtons = () => {
      integralBtn.disabled = derivativeBtn.disabled = !supportsCalculus();
      const derivativePanel = document.getElementById(`derivative-result-${eq.id}`);
      const integralPanel = document.getElementById(`integral-panel-${eq.id}`);
      if (derivativePanel) {
        derivativePanel.hidden = !supportsCalculus();
        derivativePanel.textContent = 'f′(x): clique em Plotar para atualizar';
      }
      if (integralPanel) integralPanel.hidden = !supportsCalculus();
      const integralResult = document.getElementById(`int-result-${eq.id}`);
      if (integralResult) integralResult.textContent = '= ?';
    };
    updateCalculusButtons();
    input.addEventListener('input', updateCalculusButtons);

    row.appendChild(colorIndicator);
    row.appendChild(input);
    row.appendChild(suggestBtn);
    if (currentDimension === '2d') {
       row.appendChild(integralBtn);
       row.appendChild(derivativeBtn);
    }
    if (equations.length > 1) {
       row.appendChild(removeBtn);
    }
    
    $equationList.appendChild(row);
    
    if (eq.derivative && currentDimension === '2d' && supportsCalculus()) {
      const derivativePanel = document.createElement('div');
      derivativePanel.className = 'derivative-panel';
      derivativePanel.id = `derivative-result-${eq.id}`;
      derivativePanel.setAttribute('aria-live', 'polite');
      derivativePanel.textContent = 'f′(x): clique em Plotar para calcular';
      $equationList.appendChild(derivativePanel);
    }
    if (eq.integral?.active && currentDimension === '2d' && supportsCalculus()) {
      const intPanel = document.createElement('div');
      intPanel.className = 'integral-panel';
      intPanel.id = `integral-panel-${eq.id}`;
      intPanel.innerHTML = `
        <span class="int-symbol">∫</span>
        <input type="number" class="int-input int-a" value="${eq.integral.a}" step="0.1" title="Limite Inferior (a)">
        <span class="int-to">até</span>
        <input type="number" class="int-input int-b" value="${eq.integral.b}" step="0.1" title="Limite Superior (b)">
        <span class="int-result" id="int-result-${eq.id}">= ?</span>
      `;
      const inputA = intPanel.querySelector('.int-a') as HTMLInputElement;
      const inputB = intPanel.querySelector('.int-b') as HTMLInputElement;
      
      inputA.addEventListener('input', (e) => {
        eq.integral!.a = parseFloat((e.target as HTMLInputElement).value) || 0;
        if (hasPlot) handlePlot();
      });
      
      inputB.addEventListener('input', (e) => {
        eq.integral!.b = parseFloat((e.target as HTMLInputElement).value) || 0;
        if (hasPlot) handlePlot();
      });
      
      $equationList.appendChild(intPanel);
    }
  });
}

// ────────────────────────────────────────────────────────
// Dimension Toggle (2D / 3D)
// ────────────────────────────────────────────────────────

function setDimension(dim: Dimension): void {
  currentDimension = dim;

  // Update buttons
  $btn2D.classList.toggle('active', dim === '2d');
  $btn3D.classList.toggle('active', dim === '3d');

  // Update equation label
  $equationLabelIcon.textContent = dim === '3d' ? 'f(x,y)' : 'f(x)';

  // Update coordinate table header
  updateCoordTableHeader();

  // Update coordinate label
  $coordLabelIcon.textContent = dim === '3d' ? 'XYZ' : 'XY';

  // Show/hide Z axis row
  $rowZAxis.style.display = dim === '3d' ? 'flex' : 'none';
  document.querySelector<HTMLElement>('.log-options')!.style.display = dim === '3d' ? 'none' : 'flex';

  // Show/hide style selectors
  $selectStyle2d.style.display = dim === '2d' ? 'block' : 'none';
  $selectStyle3d.style.display = dim === '3d' ? 'block' : 'none';

  // Rebuild table rows to match dimension
  rebuildTableForDimension();

  // Rebuild the equation list to update placeholders and show/hide dimension-specific buttons
  renderEquationList();
}

$btn2D.addEventListener('click', () => setDimension('2d'));
$btn3D.addEventListener('click', () => setDimension('3d'));



// ────────────────────────────────────────────────────────
// Input Mode Toggle (Function / Coordinates / Thermo)
// ────────────────────────────────────────────────────────

const $tabThermo = document.getElementById('tab-thermo') as HTMLButtonElement;
const $panelThermo = document.getElementById('panel-thermo') as HTMLDivElement;

function setMode(mode: AppMode): void {
  currentMode = mode;

  $tabFunction.classList.toggle('active', mode === 'function');
  $tabCoordinates.classList.toggle('active', mode === 'coordinates');
  $tabThermo.classList.toggle('active', mode === 'thermo');

  $panelFunction.classList.toggle('hidden', mode !== 'function');
  $panelCoordinates.classList.toggle('hidden', mode !== 'coordinates');
  $panelThermo.classList.toggle('hidden', mode !== 'thermo');
  const plotButtonText = $btnPlot.childNodes[$btnPlot.childNodes.length - 1];
  if (plotButtonText?.nodeType === Node.TEXT_NODE) {
    plotButtonText.textContent = mode === 'thermo' ? ' Calcular Estado' : ' Plotar Gráfico';
  }

  if (mode === 'function') {
    if (activeEquationInput) {
      activeEquationInput.focus();
    } else {
      const firstInput = $equationList.querySelector('.equation-input') as HTMLInputElement;
      if (firstInput) firstInput.focus();
    }
  }
}

$tabFunction.addEventListener('click', () => setMode('function'));
$tabCoordinates.addEventListener('click', () => setMode('coordinates'));
$tabThermo.addEventListener('click', () => setMode('thermo'));

// ────────────────────────────────────────────────────────
// Thermodynamic Calculator Logic
// ────────────────────────────────────────────────────────

{
  const $thermoInputType = document.getElementById('thermo-input-type') as HTMLSelectElement;
  const $thermoPRow = document.getElementById('thermo-p-row') as HTMLDivElement;
  const $thermoTRow = document.getElementById('thermo-t-row') as HTMLDivElement;
  const $thermoVRow = document.getElementById('thermo-v-row') as HTMLDivElement;
  const $btnCalcThermo = document.getElementById('btn-calc-thermo') as HTMLButtonElement;

  // Show/hide inputs based on input type selection
  $thermoInputType.addEventListener('change', () => {
    const type = $thermoInputType.value;
    $thermoPRow.classList.toggle('hidden', type === 'TV');
    $thermoTRow.classList.toggle('hidden', type === 'PV');
    $thermoVRow.classList.toggle('hidden', type === 'PT');
  });

  $btnCalcThermo.addEventListener('click', () => {
    const substance = (document.getElementById('thermo-substance') as HTMLSelectElement).value as 'water' | 'ideal';
    const type = $thermoInputType.value as 'PT' | 'PV' | 'TV';
    const readInput = (id: string): number => {
      const raw = (document.getElementById(id) as HTMLInputElement).value.trim();
      return raw === '' ? NaN : Number(raw);
    };
    const pressure = readInput('thermo-pressure');
    const temperature = readInput('thermo-temperature');
    const volume = readInput('thermo-volume');
    const mass = readInput('thermo-mass');

    const input: ThermoInput = { type, pressure, temperature, volume, mass, substance };

    try {
      hideError();
      const state = calculateThermoState(input);

      const $results = document.getElementById('thermo-results') as HTMLDivElement;
      $results.classList.remove('hidden');

      (document.getElementById('thermo-res-phase') as HTMLSpanElement).textContent = state.phase;
      (document.getElementById('thermo-res-pressure') as HTMLSpanElement).textContent = `${state.pressure.toFixed(2)} kPa`;
      (document.getElementById('thermo-res-temperature') as HTMLSpanElement).textContent = `${state.temperature.toFixed(2)} °C`;
      (document.getElementById('thermo-res-volume') as HTMLSpanElement).textContent = `${state.volume.toExponential(4)} m³`;
      (document.getElementById('thermo-res-specvol') as HTMLSpanElement).textContent = `${state.specificVolume.toExponential(4)} m³/kg`;
      (document.getElementById('thermo-res-enthalpy') as HTMLSpanElement).textContent = `${state.enthalpy.toFixed(3)} kJ/kg`;
      (document.getElementById('thermo-res-entropy') as HTMLSpanElement).textContent = `${state.entropy.toFixed(4)} kJ/(kg·K)`;

      const $warnings = document.getElementById('thermo-warnings') as HTMLDivElement;
      if (state.warnings.length > 0) {
        $warnings.classList.remove('hidden');
        $warnings.textContent = state.warnings.join(' ');
      } else {
        $warnings.classList.add('hidden');
        $warnings.textContent = '';
      }
    } catch (err) {
      (document.getElementById('thermo-results') as HTMLDivElement).classList.add('hidden');
      showError('Erro no cálculo termodinâmico: ' + (err as Error).message);
    }
  });
}

// ────────────────────────────────────────────────────────
// Coordinate Sub-tabs (Table / Paste)
// ────────────────────────────────────────────────────────

function setCoordSubtab(subtab: CoordSubtab): void {
  currentCoordSubtab = subtab;

  $subtabTable.classList.toggle('active', subtab === 'table');
  $subtabPaste.classList.toggle('active', subtab === 'paste');

  $coordTableView.classList.toggle('hidden', subtab !== 'table');
  $coordPasteView.classList.toggle('hidden', subtab !== 'paste');
}

$subtabTable.addEventListener('click', () => setCoordSubtab('table'));
$subtabPaste.addEventListener('click', () => setCoordSubtab('paste'));

// ────────────────────────────────────────────────────────
// Coordinate Table Management
// ────────────────────────────────────────────────────────

function updateCoordTableHeader(): void {
  if (currentDimension === '3d') {
    $coordTableHeader.innerHTML = `
      <th class="col-index">#</th>
      <th>X</th>
      <th>Y</th>
      <th class="col-z">Z</th>
    `;
  } else {
    $coordTableHeader.innerHTML = `
      <th class="col-index">#</th>
      <th>X</th>
      <th>Y</th>
    `;
  }
}

function createTableRow(index: number, values?: { x?: string; y?: string; z?: string }): HTMLTableRowElement {
  const tr = document.createElement('tr');
  const cols = currentDimension === '3d' ? ['x', 'y', 'z'] : ['x', 'y'];
  const indexCell = document.createElement('td');
  indexCell.className = 'td-index';
  indexCell.textContent = String(index);
  tr.appendChild(indexCell);
  cols.forEach((col) => {
    const cell = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.className = 'coord-cell';
    input.dataset.col = col;
    input.placeholder = '0';
    input.setAttribute('aria-label', `${col.toUpperCase()} do ponto ${index}`);
    input.value = values?.[col as keyof typeof values] ?? '';
    cell.appendChild(input);
    tr.appendChild(cell);
  });

  // Navigate between cells with Tab/Enter and auto-create rows
  const inputs = tr.querySelectorAll('input');
  inputs.forEach((input, inputIdx) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        // If last cell in last row, add new row
        const allRows = $coordTableBody.querySelectorAll('tr');
        const isLastRow = tr === allRows[allRows.length - 1];
        const isLastCol = inputIdx === inputs.length - 1;

        if (isLastRow && isLastCol) {
          addTableRow();
          // Focus first cell of new row
          const newRow = $coordTableBody.lastElementChild;
          const firstInput = newRow?.querySelector('input');
          firstInput?.focus();
        } else if (isLastCol) {
          // Move to first cell of next row
          const nextRow = tr.nextElementSibling;
          const firstInput = nextRow?.querySelector('input');
          (firstInput as HTMLInputElement)?.focus();
        } else {
          // Move to next cell in same row
          (inputs[inputIdx + 1] as HTMLInputElement).focus();
        }
      }
    });

    input.addEventListener('input', updateCoordCount);
  });

  return tr;
}

function addTableRow(values?: { x?: string; y?: string; z?: string }): void {
  const index = $coordTableBody.children.length + 1;
  const row = createTableRow(index, values);
  $coordTableBody.appendChild(row);
  updateCoordCount();
}

function removeLastTableRow(): void {
  if ($coordTableBody.children.length > 1) {
    $coordTableBody.removeChild($coordTableBody.lastElementChild!);
    updateCoordCount();
  }
}

function rebuildTableForDimension(): void {
  // Read current values
  coordinateDraft = Array.from($coordTableBody.querySelectorAll('tr'), (row, index) => {
    const inputs = row.querySelectorAll('input');
    return {
      x: inputs[0]?.value ?? '',
      y: inputs[1]?.value ?? '',
      z: inputs.length > 2 ? inputs[2].value : coordinateDraft[index]?.z ?? '',
    };
  });
  $coordTableBody.innerHTML = '';

  // Re-create rows with current data
  if (coordinateDraft.length === 0) {
    // Add default empty rows
    for (let i = 0; i < 5; i++) {
      addTableRow();
    }
  } else {
    for (const row of coordinateDraft) {
      addTableRow({ x: row.x, y: row.y, z: row.z });
    }
  }
}

function getTableData(): Array<{ x: string; y: string; z: string }> {
  const rows = $coordTableBody.querySelectorAll('tr');
  const data: Array<{ x: string; y: string; z: string }> = [];

  rows.forEach((row) => {
    const inputs = row.querySelectorAll('input');
    const x = inputs[0]?.value.trim() || '';
    const y = inputs[1]?.value.trim() || '';
    const z = inputs[2]?.value.trim() || '';

    // Only include rows with at least some data
    if (x || y || z) {
      data.push({ x, y, z });
    }
  });

  return data;
}

function getValidatedTableCoordinates(): { x: number[]; y: number[]; z?: number[] } {
  const rows = getTableData();
  const x: number[] = [];
  const y: number[] = [];
  const z: number[] = [];
  rows.forEach((row, index) => {
    const raw = currentDimension === '3d' ? [row.x, row.y, row.z] : [row.x, row.y];
    if (raw.some(value => value === '')) throw new Error(`Linha ${index + 1}: preencha todas as coordenadas.`);
    const values = raw.map(value => parseLocaleNumber(value, true));
    const invalid = values.findIndex(value => !Number.isFinite(value));
    if (invalid >= 0) throw new Error(`Linha ${index + 1}, coluna ${invalid + 1}: número inválido.`);
    x.push(values[0]); y.push(values[1]);
    if (currentDimension === '3d') z.push(values[2]);
  });
  return currentDimension === '3d' ? { x, y, z } : { x, y };
}

function updateCoordCount(): void {
  const data = getTableData();
  const filled = data.filter((r) => r.x && r.y).length;
  $coordCount.textContent = `${filled} ponto${filled !== 1 ? 's' : ''}`;
}

function importPasteToTable(): void {
  const text = $inputCoordinates.value.trim();
  if (!text) return;

  try {
    const result = parseCoordinates(text);

    // Set dimension based on parsed data
    if (result.dimension === '3d') {
      setDimension('3d');
    } else {
      setDimension('2d');
    }

    // Clear table and populate
    $coordTableBody.innerHTML = '';
    coordinateDraft = [];

    if (result.dimension === '3d' && result.data3d) {
      for (let i = 0; i < result.data3d.x.length; i++) {
        addTableRow({
          x: String(result.data3d.x[i]),
          y: String(result.data3d.y[i]),
          z: String(result.data3d.z[i]),
        });
      }
      coordinateDraft = result.data3d.x.map((x, i) => ({ x: String(x), y: String(result.data3d!.y[i]), z: String(result.data3d!.z[i]) }));
    } else if (result.data2d) {
      for (let i = 0; i < result.data2d.x.length; i++) {
        addTableRow({
          x: String(result.data2d.x[i]),
          y: String(result.data2d.y[i]),
        });
      }
      coordinateDraft = result.data2d.x.map((x, i) => ({ x: String(x), y: String(result.data2d!.y[i]), z: '' }));
    }

    // Switch to table view to show the imported data
    setCoordSubtab('table');
    hideError();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    showError(message);
  }
}

$btnAddRow.addEventListener('click', () => {
  addTableRow();
  // Focus first cell of the new row
  const newRow = $coordTableBody.lastElementChild;
  const firstInput = newRow?.querySelector('input') as HTMLInputElement;
  if (firstInput) firstInput.focus();
});
$btnRemoveRow.addEventListener('click', removeLastTableRow);

if ($btnClearCoord) {
  $btnClearCoord.addEventListener('click', () => {
    $coordTableBody.innerHTML = '';
    coordinateDraft = [];
    for (let i = 0; i < 5; i++) addTableRow();
    $inputCoordinates.value = '';
    updateCoordCount();
    clearPlot($plotContainer);
    showPlaceholder();
    hasPlot = false;
    lastPlot = null;
  });
}

$btnImportPaste.addEventListener('click', importPasteToTable);

// ────────────────────────────────────────────────────────
// Error handling
// ────────────────────────────────────────────────────────

function showError(message: string): void {
  $errorDisplay.textContent = message;
  $errorDisplay.classList.remove('hidden');
}

function hideError(): void {
  $errorDisplay.classList.add('hidden');
  $errorDisplay.textContent = '';
}

// ────────────────────────────────────────────────────────
// Placeholder management
// ────────────────────────────────────────────────────────

function hidePlaceholder(): void {
  $plotPlaceholder.classList.add('hidden');
}

function showPlaceholder(): void {
  $plotPlaceholder.classList.remove('hidden');
}

// ────────────────────────────────────────────────────────
// History management
// ────────────────────────────────────────────────────────

function addToHistory(): void {
  if (!lastPlot) return;
  const entry: HistoryEntry = lastPlot.mode === 'function'
    ? {
        label: equations.filter(eq => eq.expr.trim()).map(eq => eq.expr).join(' • '),
        mode: 'function',
        dimension: lastPlot.dimension,
        equations: equations.filter(eq => eq.expr.trim()).map(eq => ({ ...eq, integral: eq.integral ? { ...eq.integral } : undefined })),
        timestamp: Date.now(),
      }
    : {
        label: `${lastPlot.x.length} pontos`,
        mode: 'coordinates',
        dimension: lastPlot.dimension,
        coordinates: { x: [...lastPlot.x], y: [...lastPlot.y], z: lastPlot.z ? [...lastPlot.z] : undefined },
        timestamp: Date.now(),
      };
  if (history.length > 0 && history[0].label === entry.label && history[0].mode === entry.mode) return;
  history.unshift(entry);
  if (history.length > 20) history.pop();

  renderHistory();
}

function renderHistory(): void {
  $historyList.innerHTML = '';

  if (history.length === 0) {
    const li = document.createElement('li');
    li.className = 'history-empty';
    li.textContent = 'Nenhuma equação plotada ainda';
    $historyList.appendChild(li);
    return;
  }

  for (const entry of history) {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <span class="history-dot"></span>
      <span class="history-expr">${escapeHtml(entry.label)}</span>
      <span class="history-dim ${entry.dimension === '3d' ? 'dim-3d' : ''}">${entry.dimension.toUpperCase()}</span>
    `;
    li.addEventListener('click', () => {
      setDimension(entry.dimension);
      if (entry.mode === 'function' && entry.equations) {
        equations = entry.equations.map(eq => ({ ...eq, id: generateId(), integral: eq.integral ? { ...eq.integral } : undefined }));
        renderEquationList();
        setMode('function');
        plotFunction();
      } else if (entry.coordinates) {
        coordinateDraft = entry.coordinates.x.map((x, index) => ({
          x: String(x), y: String(entry.coordinates!.y[index]), z: entry.coordinates!.z ? String(entry.coordinates!.z[index]) : '',
        }));
        $coordTableBody.innerHTML = '';
        coordinateDraft.forEach(row => addTableRow(row));
        setMode('coordinates');
        setCoordSubtab('table');
        plotCoordinatesFromTable();
      }
    });
    $historyList.appendChild(li);
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ────────────────────────────────────────────────────────
// Plot Functions
// ────────────────────────────────────────────────────────

function getAxisValues() {
  const read = (input: HTMLInputElement, fallback: number) => input.value.trim() === '' ? fallback : Number(input.value);
  const values = {
    xMin: read($xMin, -10), xMax: read($xMax, 10),
    yMin: read($yMin, -10), yMax: read($yMax, 10),
    zMin: read($zMin, -10), zMax: read($zMax, 10), steps: read($steps, 200),
  };
  if (!Object.values(values).every(Number.isFinite)) throw new Error('Os limites dos eixos e os passos devem ser números finitos.');
  if (values.xMin >= values.xMax || values.yMin >= values.yMax || values.zMin >= values.zMax) throw new Error('O limite mínimo deve ser menor que o máximo.');
  values.steps = Math.trunc(values.steps);
  if (values.steps < 10 || values.steps > 1000) throw new Error('Use entre 10 e 1000 passos.');
  return values;
}

async function plotFunction(): Promise<void> {
  hideError();
  const validEquations = equations.filter(eq => eq.expr.trim() !== '');

  if (validEquations.length === 0) {
    showError('Digite pelo menos uma expressão matemática.');
    return;
  }

  const is3D = currentDimension === '3d';
  
  // Extrai parâmetros e gera os sliders
  updateParameters(validEquations.map(e => e.expr));

  try {
    const { xMin, xMax, yMin, yMax, zMin, zMax, steps } = getAxisValues();
    hidePlaceholder();

    if (is3D) {
      const style3d = $selectStyle3d.value as PlotStyle3D;
      const items = validEquations.map(eq => ({
        data: evaluateGrid3D(eq.expr, xMin, xMax, yMin, yMax, steps, currentParameters),
        exprLabel: eq.expr,
        color: eq.color
      }));
      await renderPlot3D($plotContainer, items, style3d, { x: [xMin, xMax], y: [yMin, yMax], z: [zMin, zMax] });
      lastPlot = { mode: 'function', dimension: '3d', series2d: [], series3d: items.map(item => ({ label: item.exprLabel, data: item.data })) };
    } else {
      const style2d = $selectStyle2d.value as PlotStyle2D;
      const items = validEquations.map(eq => {
        const type = detectEquationType(eq.expr);
        let plotData: PlotData2D;
        let notable: NotablePoint[] = [];
        
        if (type === 'parametric') {
          plotData = evaluateParametric(eq.expr, 0, 2 * Math.PI, steps, currentParameters);
        } else if (type === 'polar') {
          plotData = evaluatePolar(eq.expr, 0, 2 * Math.PI, steps, currentParameters);
        } else {
          plotData = evaluateGrid2D(eq.expr, xMin, xMax, steps, currentParameters);
          if ($toggleAnalysis && $toggleAnalysis.checked) {
            notable = findNotablePoints(plotData, eq.expr, currentParameters);
          }
        }

        if (!plotData.y.some(Number.isFinite)) throw new Error(`A fórmula “${eq.expr}” não produziu valores reais no intervalo.`);
        const item: { data: PlotData2D; exprLabel: string; color: string; equationType: ReturnType<typeof detectEquationType>; integral?: { data: PlotData2D }; derivative?: { expression: string; data: PlotData2D }; notablePoints?: NotablePoint[] } = {
          data: plotData,
          exprLabel: eq.expr,
          color: eq.color,
          equationType: type,
          notablePoints: notable
        };
        
        if (eq.integral?.active && type === 'cartesian') {
          const area = calculateDefiniteIntegral(eq.expr, eq.integral.a, eq.integral.b, currentParameters);
          const intResultEl = document.getElementById(`int-result-${eq.id}`);
          if (intResultEl) intResultEl.innerText = `= ${area.toFixed(4)}`;
          
          item.integral = {
             data: evaluateGrid2D(eq.expr, eq.integral.a, eq.integral.b, Math.min(steps, 200), currentParameters)
          };
        }
        if (eq.derivative && type === 'cartesian') {
          item.derivative = evaluateDerivative(eq.expr, xMin, xMax, steps, currentParameters);
          const result = document.getElementById(`derivative-result-${eq.id}`);
          if (result) result.textContent = `f′(x) = ${item.derivative.expression} (tracejada)`;
        }
        return item;
      });

      // Find intersections if analysis is on
      if ($toggleAnalysis && $toggleAnalysis.checked) {
        const cartesianItems = items.filter(item => item.equationType === 'cartesian');
        const cartesianData = cartesianItems.map(i => i.data);
        const intersections = findIntersections(cartesianData, cartesianItems.map(item => item.exprLabel), currentParameters);
        if (intersections.length > 0 && items.length > 0) {
          if (!items[0].notablePoints) items[0].notablePoints = [];
          items[0].notablePoints.push(...intersections);
        }
      }

      const axisTypes: { x: 'linear' | 'log', y: 'linear' | 'log' } = {
        x: $xLog.checked ? 'log' : 'linear',
        y: $yLog.checked ? 'log' : 'linear'
      };

      await renderPlot2D($plotContainer, items, style2d, false, axisTypes, { x: [xMin, xMax], y: [yMin, yMax] });
      lastPlot = { mode: 'function', dimension: '2d', series2d: items.flatMap(item => [
        { label: item.exprLabel, data: item.data },
        ...(item.derivative ? [{ label: `Derivada de ${item.exprLabel}: ${item.derivative.expression}`, data: item.derivative.data }] : [])
      ]), series3d: [] };
    }

    hasPlot = true;
    addToHistory();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    showError(message);
  }
}

async function plotCoordinatesFromTable(): Promise<void> {
  hideError();

  try {
    const parsed = getValidatedTableCoordinates();
    if (parsed.x.length < 2) throw new Error('Insira pelo menos 2 pontos completos.');
    hidePlaceholder();
    resetColorCycle();

    if (currentDimension === '3d') {
      const style3d = $selectStyle3d.value as PlotStyle3D;
      const { x, y, z = [] } = parsed;

      await renderScatter3D($plotContainer, x, y, z, 'Coordenadas 3D', style3d);
      lastPlot = { mode: 'coordinates', dimension: '3d', x: [...x], y: [...y], z: [...z] };
    } else {
      const style2d = $selectStyle2d.value as PlotStyle2D;
      const { x, y } = parsed;

      const axisTypes: { x: 'linear' | 'log', y: 'linear' | 'log' } = {
        x: $xLog.checked ? 'log' : 'linear',
        y: $yLog.checked ? 'log' : 'linear'
      };

      let regressionData = undefined;
      if ($toggleTrendline && $toggleTrendline.checked) {
        const reg = calculateLinearRegression(x, y);
        if (reg) {
          const minX = Math.min(...x);
          const maxX = Math.max(...x);
          regressionData = {
            m: reg.m, b: reg.b, rSquared: reg.rSquared,
            lineData: { x: [minX, maxX], y: [reg.m * minX + reg.b, reg.m * maxX + reg.b] }
          };
        }
      }

      await renderScatter2D($plotContainer, { x, y }, 'Coordenadas', style2d, axisTypes, regressionData);
      lastPlot = { mode: 'coordinates', dimension: '2d', x: [...x], y: [...y] };
    }

    hasPlot = true;
    addToHistory();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    showError(message);
  }
}

async function plotCoordinatesFromPaste(): Promise<void> {
  hideError();
  const text = $inputCoordinates.value.trim();

  if (!text) {
    showError('Cole uma tabela de coordenadas.');
    return;
  }

  try {
    hidePlaceholder();
    resetColorCycle();

    const result = parseCoordinates(text);

    if (result.dimension === '3d' && result.data3d) {
      setDimension('3d');
      const style3d = $selectStyle3d.value as PlotStyle3D;
      await renderScatter3D(
        $plotContainer,
        result.data3d.x,
        result.data3d.y,
        result.data3d.z,
        'Coordenadas 3D',
        style3d
      );
      lastPlot = { mode: 'coordinates', dimension: '3d', x: [...result.data3d.x], y: [...result.data3d.y], z: [...result.data3d.z] };
    } else if (result.data2d) {
      setDimension('2d');
      const style2d = $selectStyle2d.value as PlotStyle2D;

      const axisTypes: { x: 'linear' | 'log', y: 'linear' | 'log' } = {
        x: $xLog.checked ? 'log' : 'linear',
        y: $yLog.checked ? 'log' : 'linear'
      };

      let regressionData = undefined;
      if ($toggleTrendline && $toggleTrendline.checked) {
        const reg = calculateLinearRegression(result.data2d.x, result.data2d.y);
        if (reg) {
          const minX = Math.min(...result.data2d.x);
          const maxX = Math.max(...result.data2d.x);
          regressionData = {
            m: reg.m, b: reg.b, rSquared: reg.rSquared,
            lineData: { x: [minX, maxX], y: [reg.m * minX + reg.b, reg.m * maxX + reg.b] }
          };
        }
      }

      await renderScatter2D($plotContainer, result.data2d, 'Coordenadas', style2d, axisTypes, regressionData);
      lastPlot = { mode: 'coordinates', dimension: '2d', x: [...result.data2d.x], y: [...result.data2d.y] };
    }

    hasPlot = true;
    addToHistory();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    showError(message);
  }
}

// ────────────────────────────────────────────────────────
// Main Plot Dispatch
// ────────────────────────────────────────────────────────

function handlePlot(): void {
  if (currentMode === 'function') {
    plotFunction();
  } else if (currentMode === 'thermo') {
    (document.getElementById('btn-calc-thermo') as HTMLButtonElement).click();
  } else if (currentCoordSubtab === 'table') {
    plotCoordinatesFromTable();
  } else {
    plotCoordinatesFromPaste();
  }
}

// ────────────────────────────────────────────────────────
// Clear All
// ────────────────────────────────────────────────────────

function handleClearAll(): void {
  clearPlot($plotContainer);
  equations = [];
  addEquation(); // Add an empty equation
  $inputCoordinates.value = '';
  hideError();
  showPlaceholder();
  setDimension('2d');

  // Reset table to empty
  $coordTableBody.innerHTML = '';
  coordinateDraft = [];
  for (let i = 0; i < 5; i++) addTableRow();

  hasPlot = false;
  lastPlot = null;
}

// ────────────────────────────────────────────────────────
// Event Listeners
// ────────────────────────────────────────────────────────

$btnPlot.addEventListener('click', handlePlot);
$btnClearAll.addEventListener('click', handleClearAll);

// Auto-update plot when styling/analysis/axes settings change
$selectStyle2d.addEventListener('change', () => { if (hasPlot) handlePlot(); });
$selectStyle3d.addEventListener('change', () => { if (hasPlot) handlePlot(); });
if ($toggleAnalysis) $toggleAnalysis.addEventListener('change', () => { if (hasPlot) handlePlot(); });
if ($toggleTrendline) $toggleTrendline.addEventListener('change', () => { if (hasPlot) handlePlot(); });
if ($xLog) $xLog.addEventListener('change', () => { if (hasPlot) handlePlot(); });
if ($yLog) $yLog.addEventListener('change', () => { if (hasPlot) handlePlot(); });

$btnAddEquation.addEventListener('click', () => {
  addEquation('');
});

$mathToolbar.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('btn-math')) {
    const insert = target.dataset.insert;
    if (insert && activeEquationInput) {
      const start = activeEquationInput.selectionStart || 0;
      const end = activeEquationInput.selectionEnd || 0;
      const val = activeEquationInput.value;
      activeEquationInput.value = val.substring(0, start) + insert + val.substring(end);
      
      // Update state
      const id = activeEquationInput.dataset.equationId;
      if (id) updateEquation(id, activeEquationInput.value);

      // Move cursor inside parenthesis if it ends with ()
      const newPos = insert.endsWith('()') ? start + insert.length - 1 : start + insert.length;
      activeEquationInput.setSelectionRange(newPos, newPos);
      activeEquationInput.focus();
    }
  }
});

// Ctrl+Enter in coordinates textarea to plot
$inputCoordinates.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    handlePlot();
  }
});

// Responsive resize
window.addEventListener('resize', () => {
  if (hasPlot) {
    Plotly.Plots.resize($plotContainer);
  }
});

// ────────────────────────────────────────────────────────
// Initialize
// ────────────────────────────────────────────────────────

// Initialize with one empty equation
addEquation();

// Add pulse animation to plot button initially
$btnPlot.classList.add('pulse');
$btnPlot.addEventListener(
  'click',
  () => {
    $btnPlot.classList.remove('pulse');
  },
  { once: true }
);

// Initialize coordinate table with 5 empty rows
for (let i = 0; i < 5; i++) addTableRow();

// Initialize history
renderHistory();
