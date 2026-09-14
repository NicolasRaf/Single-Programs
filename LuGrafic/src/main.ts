/**
 * main.ts — Orquestrador Principal do LuGrafic
 *
 * Conecta os módulos mathEngine, plotRenderer e coordinateParser
 * aos elementos da interface, gerencia estado e eventos.
 */

import './index.css';
import Plotly from 'plotly.js-dist-min';
import { evaluateGrid2D, evaluateGrid3D, is3DExpression, extractParameters, calculateDefiniteIntegral, detectEquationType, evaluateParametric, evaluatePolar, findNotablePoints, calculateLinearRegression, findIntersections, type PlotData2D, type NotablePoint } from './mathEngine';
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
import { parseCoordinates } from './coordinateParser';

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
  
  label.addEventListener('click', (e) => {
    const targetId = (e.currentTarget as HTMLElement).getAttribute('data-target');
    if (targetId) {
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        label.classList.toggle('collapsed');
        targetContent.classList.toggle('collapsed');
      }
    }
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
    if (currentMode === 'coordinates') {
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
  const data = getTableData().filter(r => r.x && r.y);
  if (data.length === 0) {
    showError('Nenhum dado de coordenada para exportar.');
    return;
  }
  let csv = currentDimension === '3d' ? 'X,Y,Z\n' : 'X,Y\n';
  data.forEach(c => {
    if (currentDimension === '3d') {
      csv += `${c.x},${c.y},${c.z}\n`;
    } else {
      csv += `${c.x},${c.y}\n`;
    }
  });
  triggerDownload(csv, 'lugrafic_coordenadas.csv');
}

function exportEquationsCSV() {
  const validEquations = equations.filter(eq => eq.expr.trim() !== '');
  if (validEquations.length === 0) {
    showError('Nenhuma equação válida para exportar.');
    return;
  }
  
  const steps = parseInt($steps.value) || 200;
  const xMin = parseFloat($xMin.value) || -10;
  const xMax = parseFloat($xMax.value) || 10;
  
  let csv = 'X';
  validEquations.forEach(eq => {
    csv += `,${eq.expr}`;
  });
  csv += '\n';
  
  // Basic CSV export assuming all evaluate on same grid
  // In a real scenario, parametric/polar have different bases.
  // Here we just use the first cartesian or standard linspace.
  const xVals = Array.from({length: steps}, (_, i) => xMin + (xMax - xMin) * i / (steps - 1));
  
  xVals.forEach((x, i) => {
    let row = `${x.toFixed(4)}`;
    validEquations.forEach(eq => {
      try {
        const type = detectEquationType(eq.expr);
        if (type === 'cartesian') {
          const plotData = evaluateGrid2D(eq.expr, xMin, xMax, steps, currentParameters);
          row += `,${plotData.y[i] !== undefined ? plotData.y[i].toFixed(4) : ''}`;
        } else {
          row += `,NA`; // Placeholder for parametric/polar since they don't share same X axis
        }
      } catch(e) {
        row += `,ERR`;
      }
    });
    csv += row + '\n';
  });
  
  triggerDownload(csv, 'lugrafic_equacoes.csv');
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
}

if ($toggleAnalysis) {
  $toggleAnalysis.addEventListener('change', () => {
    if (hasPlot) plotFunction();
  });
}

const $xMin = document.getElementById('x-min') as HTMLInputElement;
const $xMax = document.getElementById('x-max') as HTMLInputElement;
const $yMin = document.getElementById('y-min') as HTMLInputElement;
const $yMax = document.getElementById('y-max') as HTMLInputElement;
const $steps = document.getElementById('input-steps') as HTMLInputElement;

// ────────────────────────────────────────────────────────
// State
// ────────────────────────────────────────────────────────

type AppMode = 'function' | 'coordinates';
type Dimension = '2d' | '3d';
type CoordSubtab = 'table' | 'paste';

interface HistoryEntry {
  expression: string;
  dimension: Dimension;
  timestamp: number;
}

let currentMode: AppMode = 'function';
let currentDimension: Dimension = '2d';
let currentCoordSubtab: CoordSubtab = 'table';
let history: HistoryEntry[] = [];
let hasPlot = false;

// ────────────────────────────────────────────────────────
// Equation State Management
// ────────────────────────────────────────────────────────

interface EquationInput {
  id: string;
  expr: string;
  color: string;
  integral?: { active: boolean; a: number; b: number };
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
    input.placeholder = currentDimension === '3d' ? 'ex: sin(x)*cos(y)' : 'ex: sin(x)';
    input.spellcheck = false;
    input.autocomplete = 'off';
    
    input.addEventListener('focus', () => {
       activeEquationInput = input;
    });
    
    input.addEventListener('input', (e) => {
      updateEquation(eq.id, (e.target as HTMLInputElement).value);
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
    integralBtn.onclick = () => {
      if (!eq.integral) eq.integral = { active: false, a: 0, b: 1 };
      eq.integral.active = !eq.integral.active;
      renderEquationList();
      if (hasPlot) handlePlot();
    };
    
    row.appendChild(colorIndicator);
    row.appendChild(input);
    row.appendChild(suggestBtn);
    if (currentDimension === '2d') {
       row.appendChild(integralBtn);
    }
    if (equations.length > 1) {
       row.appendChild(removeBtn);
    }
    
    $equationList.appendChild(row);
    
    if (eq.integral?.active && currentDimension === '2d') {
      const intPanel = document.createElement('div');
      intPanel.className = 'integral-panel';
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
  $equationList.querySelectorAll('.equation-input').forEach(input => {
    (input as HTMLInputElement).placeholder = dim === '3d'
      ? 'ex: x^2 + y^2, sin(x)*cos(y)'
      : 'ex: sin(x), x^2 + 3*x - 1';
  });

  // Update coordinate table header
  updateCoordTableHeader();

  // Update coordinate label
  $coordLabelIcon.textContent = dim === '3d' ? 'XYZ' : 'XY';

  // Show/hide Z axis row
  $rowZAxis.style.display = dim === '3d' ? 'flex' : 'none';

  // Show/hide style selectors
  $selectStyle2d.style.display = dim === '2d' ? 'block' : 'none';
  $selectStyle3d.style.display = dim === '3d' ? 'block' : 'none';

  // Rebuild table rows to match dimension
  rebuildTableForDimension();
}

$btn2D.addEventListener('click', () => setDimension('2d'));
$btn3D.addEventListener('click', () => setDimension('3d'));



// ────────────────────────────────────────────────────────
// Input Mode Toggle (Function / Coordinates)
// ────────────────────────────────────────────────────────

function setMode(mode: AppMode): void {
  currentMode = mode;

  $tabFunction.classList.toggle('active', mode === 'function');
  $tabCoordinates.classList.toggle('active', mode === 'coordinates');

  $panelFunction.classList.toggle('hidden', mode !== 'function');
  $panelCoordinates.classList.toggle('hidden', mode !== 'coordinates');

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

  tr.innerHTML = `
    <td class="td-index">${index}</td>
    ${cols.map((col) => `
      <td>
        <input
          type="text"
          inputmode="decimal"
          class="coord-cell"
          data-col="${col}"
          placeholder="0"
          value="${(values && values[col as keyof typeof values]) || ''}"
        />
      </td>
    `).join('')}
  `;

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
  const currentData = getTableData();
  $coordTableBody.innerHTML = '';

  // Re-create rows with current data
  if (currentData.length === 0) {
    // Add default empty rows
    for (let i = 0; i < 5; i++) {
      addTableRow();
    }
  } else {
    for (const row of currentData) {
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

    if (result.dimension === '3d' && result.data3d) {
      for (let i = 0; i < result.data3d.x.length; i++) {
        addTableRow({
          x: String(result.data3d.x[i]),
          y: String(result.data3d.y[i]),
          z: String(result.data3d.z[i]),
        });
      }
    } else if (result.data2d) {
      for (let i = 0; i < result.data2d.x.length; i++) {
        addTableRow({
          x: String(result.data2d.x[i]),
          y: String(result.data2d.y[i]),
        });
      }
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
    for (let i = 0; i < 5; i++) addTableRow();
    $inputCoordinates.value = '';
    updateCoordCount();
    clearPlot($plotContainer);
    showPlaceholder();
    hasPlot = false;
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

function addToHistory(expression: string, dimension: Dimension): void {
  if (history.length > 0 && history[0].expression === expression) return;

  history.unshift({ expression, dimension, timestamp: Date.now() });
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
      <span class="history-expr">${escapeHtml(entry.expression)}</span>
      <span class="history-dim ${entry.dimension === '3d' ? 'dim-3d' : ''}">${entry.dimension.toUpperCase()}</span>
    `;
    li.addEventListener('click', () => {
      equations = [];
      addEquation(entry.expression);
      setMode('function');
      setDimension(entry.dimension);
      plotFunction();
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
  return {
    xMin: parseFloat($xMin.value) || -10,
    xMax: parseFloat($xMax.value) || 10,
    yMin: parseFloat($yMin.value) || -10,
    yMax: parseFloat($yMax.value) || 10,
    steps: parseInt($steps.value) || 200,
  };
}

async function plotFunction(): Promise<void> {
  hideError();
  const validEquations = equations.filter(eq => eq.expr.trim() !== '');

  if (validEquations.length === 0) {
    showError('Digite pelo menos uma expressão matemática.');
    return;
  }

  const { xMin, xMax, yMin, yMax, steps } = getAxisValues();
  const is3D = currentDimension === '3d';
  
  // Extrai parâmetros e gera os sliders
  updateParameters(validEquations.map(e => e.expr));

  try {
    hidePlaceholder();

    if (is3D) {
      const style3d = $selectStyle3d.value as PlotStyle3D;
      const items = validEquations.map(eq => ({
        data: evaluateGrid3D(eq.expr, xMin, xMax, yMin, yMax, steps, currentParameters),
        exprLabel: eq.expr,
        color: eq.color
      }));
      await renderPlot3D($plotContainer, items, style3d);
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
            notable = findNotablePoints(plotData);
          }
        }

        const item: { data: PlotData2D; exprLabel: string; color: string; integral?: { data: PlotData2D }; notablePoints?: NotablePoint[] } = {
          data: plotData,
          exprLabel: eq.expr,
          color: eq.color,
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
        return item;
      });

      // Find intersections if analysis is on
      if ($toggleAnalysis && $toggleAnalysis.checked) {
        const cartesianData = items.map(i => i.data);
        const intersections = findIntersections(cartesianData);
        if (intersections.length > 0 && items.length > 0) {
          if (!items[0].notablePoints) items[0].notablePoints = [];
          items[0].notablePoints.push(...intersections);
        }
      }

      const axisTypes: { x: 'linear' | 'log', y: 'linear' | 'log' } = {
        x: $xLog.checked ? 'log' : 'linear',
        y: $yLog.checked ? 'log' : 'linear'
      };

      await renderPlot2D($plotContainer, items, style2d, false, axisTypes);
    }

    hasPlot = true;
    addToHistory(validEquations.map(e => e.expr).join(', '), currentDimension);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    showError(message);
  }
}

async function plotCoordinatesFromTable(): Promise<void> {
  hideError();
  const data = getTableData();
  const filled = data.filter((r) => r.x && r.y);

  if (filled.length < 2) {
    showError('Insira pelo menos 2 pontos com valores X e Y.');
    return;
  }

  try {
    hidePlaceholder();
    resetColorCycle();

    if (currentDimension === '3d') {
      const style3d = $selectStyle3d.value as PlotStyle3D;
      const x = filled.map((r) => parseFloat(r.x)).filter((n) => !isNaN(n));
      const y = filled.map((r) => parseFloat(r.y)).filter((n) => !isNaN(n));
      const z = filled.map((r) => parseFloat(r.z)).filter((n) => !isNaN(n));

      if (z.length < 2) {
        showError('Para 3D, preencha também os valores de Z.');
        return;
      }

      await renderScatter3D($plotContainer, x, y, z, 'Coordenadas 3D', style3d);
    } else {
      const style2d = $selectStyle2d.value as PlotStyle2D;
      const x = filled.map((r) => parseFloat(r.x)).filter((n) => !isNaN(n));
      const y = filled.map((r) => parseFloat(r.y)).filter((n) => !isNaN(n));

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
    }

    hasPlot = true;
    addToHistory(`[${filled.length} pontos ${currentDimension.toUpperCase()}]`, currentDimension);
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
    }

    hasPlot = true;
    addToHistory(`[${result.pointCount} pontos ${result.dimension.toUpperCase()}]`, result.dimension);
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
  for (let i = 0; i < 5; i++) addTableRow();

  hasPlot = false;
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
      const id = equations.find(eq => eq.expr === val)?.id;
      if (id) updateEquation(id, activeEquationInput.value);

      // Move cursor inside parenthesis if it ends with ()
      const newPos = insert.endsWith('()') ? start + insert.length - 1 : start + insert.length;
      activeEquationInput.setSelectionRange(newPos, newPos);
      activeEquationInput.focus();
    }
  }
});

$btnDownloadPng.addEventListener('click', async () => {
  if (!hasPlot) {
    showError('Não há gráfico para baixar.');
    return;
  }
  const Plotly = await import('plotly.js-dist-min');
  Plotly.default.downloadImage($plotContainer, {
    format: 'png',
    filename: `lugrafic_plot`,
    height: 800,
    width: 1200
  });
});

$btnDownloadCsv.addEventListener('click', () => {
  if (!hasPlot) {
    showError('Não há dados para exportar.');
    return;
  }
  
  if (currentDimension === '3d') {
    showError('A exportação de superfícies 3D ainda não é suportada em CSV.');
    return;
  }
  
  const validEquations = equations.filter(eq => eq.expr.trim() !== '');
  if (validEquations.length === 0) return;
  
  const { xMin, xMax, steps } = getAxisValues();
  let csvContent = "data:text/csv;charset=utf-8,X";
  
  // Headers
  validEquations.forEach((eq, idx) => {
    csvContent += `,Y${idx+1} (${eq.expr})`;
  });
  csvContent += "\\r\\n";
  
  // First equation defines the X grid
  const baseData = evaluateGrid2D(validEquations[0].expr, xMin, xMax, steps);
  const xValues = baseData.x;
  
  // Data rows
  const allYData = validEquations.map(eq => evaluateGrid2D(eq.expr, xMin, xMax, steps).y);
  
  xValues.forEach((x, i) => {
    let row = `${x.toFixed(4)}`;
    allYData.forEach(yData => {
      row += `,${yData[i] !== null ? yData[i].toFixed(4) : ''}`;
    });
    csvContent += row + "\\r\\n";
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "lugrafic_dados.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
    import('plotly.js-dist-min').then((Plotly) => {
      Plotly.default.Plots.resize($plotContainer);
    });
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
