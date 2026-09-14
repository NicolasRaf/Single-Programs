/**
 * main.ts — Orquestrador Principal do LuGrafic
 *
 * Conecta os módulos mathEngine, plotRenderer e coordinateParser
 * aos elementos da interface, gerencia estado e eventos.
 */

import './index.css';
import { evaluateGrid2D, evaluateGrid3D, is3DExpression } from './mathEngine';
import {
  renderPlot2D,
  renderPlot3D,
  renderScatter2D,
  renderScatter3D,
  clearPlot,
  resetColorCycle,
  nextColor,
  PlotStyle2D,
  PlotStyle3D,
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
const $plotContainer = document.getElementById('plot-container') as HTMLDivElement;
const $plotPlaceholder = document.getElementById('plot-placeholder') as HTMLDivElement;
const $errorDisplay = document.getElementById('error-display') as HTMLDivElement;
const $historyList = document.getElementById('history-list') as HTMLUListElement;
const $rowZAxis = document.getElementById('row-z-axis') as HTMLDivElement;

const $selectStyle2d = document.getElementById('select-style-2d') as HTMLSelectElement;
const $selectStyle3d = document.getElementById('select-style-3d') as HTMLSelectElement;
const $panelStyle = document.getElementById('panel-style') as HTMLDivElement;

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
}

let equations: EquationInput[] = [];
let activeEquationInput: HTMLInputElement | null = null;

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
  equations.forEach((eq, index) => {
    const row = document.createElement('div');
    row.className = 'equation-row';
    
    const colorIndicator = document.createElement('div');
    colorIndicator.className = 'equation-color';
    colorIndicator.style.backgroundColor = eq.color;
    
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
    
    row.appendChild(colorIndicator);
    row.appendChild(input);
    if (equations.length > 1) {
       row.appendChild(removeBtn);
    }
    
    $equationList.appendChild(row);
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
  $inputEquation.placeholder = dim === '3d'
    ? 'ex: x^2 + y^2, sin(x)*cos(y)'
    : 'ex: sin(x), x^2 + 3*x - 1';

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
    $inputEquation.focus();
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
  firstInput?.focus();
});
$btnRemoveRow.addEventListener('click', removeLastTableRow);
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
      $inputEquation.value = entry.expression;
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

  try {
    hidePlaceholder();

    if (is3D) {
      const style3d = $selectStyle3d.value as PlotStyle3D;
      const items = validEquations.map(eq => ({
        data: evaluateGrid3D(eq.expr, xMin, xMax, yMin, yMax, steps),
        exprLabel: eq.expr,
        color: eq.color
      }));
      await renderPlot3D($plotContainer, items, style3d);
    } else {
      const style2d = $selectStyle2d.value as PlotStyle2D;
      const items = validEquations.map(eq => ({
        data: evaluateGrid2D(eq.expr, xMin, xMax, steps),
        exprLabel: eq.expr,
        color: eq.color
      }));
      await renderPlot2D($plotContainer, items, style2d);
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

      await renderScatter2D($plotContainer, { x, y }, 'Coordenadas', style2d);
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
      await renderScatter2D($plotContainer, result.data2d, 'Coordenadas', style2d);
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
  $inputEquation.value = '';
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

$selectStyle2d.addEventListener('change', () => {
  if (hasPlot && currentDimension === '2d') handlePlot();
});
$selectStyle3d.addEventListener('change', () => {
  if (hasPlot && currentDimension === '3d') handlePlot();
});

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
    width: 1200,
    scale: 2
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
