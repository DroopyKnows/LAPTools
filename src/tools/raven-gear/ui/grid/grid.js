// Runtime layout engine for grid2 — the one component that ships JS (responsive
// column count + row balancing can't be done in CSS alone).
//
// grid2 CSS styles rows/items but doesn't lay them out. This engine measures the
// container, derives a column count from --grid-min / --grid-gap, balances items
// into rows (getGridRowSizes), and (re)builds the .grid2__row / .grid2__item tree.
//
// Three ways to use it:
//   1. Observer (primary): observeGrids(root) once before the first render. New
//      engine grids init at the MutationObserver microtask, before paint.
//   2. Declarative sweep: emit `.grid2` + `data-grid2` + option attrs, items as DIRECT
//      children; initAllGrids(root) after a render initializes any the observer missed.
//      Attrs: data-grid2-cols, data-grid2-direction, data-grid2-min-per-row, data-grid2-max-width.
//   3. Imperative: initGrid2(el, opts) once the grid is in the DOM; returns a cleanup fn.

// --- pure row-balancing (getGridRowSizes) -----------------------------------
export function getGridRowSizes({ total, columns, direction = 'top-down', minPerRow = 0 }) {
  if (total <= 0) return [];

  const capacity = Math.max(1, Math.min(Math.floor(columns), total));
  const fullRows = Math.floor(total / capacity);
  const remainder = total % capacity;

  let sizes;
  if (remainder === 0) {
    sizes = Array(fullRows).fill(capacity);
  } else if (direction === 'bottom-up') {
    sizes = [remainder, ...Array(fullRows).fill(capacity)];
  } else {
    sizes = [...Array(fullRows).fill(capacity), remainder];
  }

  if (sizes.length === 1 || minPerRow <= 0) return sizes;

  const effectiveMin = Math.min(Math.floor(minPerRow), Math.floor(total / sizes.length));
  if (effectiveMin <= 0) return sizes;

  const rowIndexes = direction === 'bottom-up'
    ? sizes.map((_, i) => i)
    : sizes.map((_, i) => sizes.length - 1 - i);

  rowIndexes.forEach((targetIndex) => {
    while (sizes[targetIndex] < effectiveMin) {
      const donorIndex = rowIndexes.find((i) => i !== targetIndex && sizes[i] > effectiveMin);
      if (donorIndex === undefined) break;
      sizes[donorIndex] -= 1;
      sizes[targetIndex] += 1;
    }
  });

  return sizes;
}

// --- responsive engine ------------------------------------------------------
export function initGrid2(gridEl, { cols, direction = 'top-down', minPerRow = 0, maxItemWidth = null } = {}) {
  if (!gridEl) return () => {};

  // Capture the original item nodes once. We keep references in `items`, so
  // they survive being detached/re-parented across reflows.
  const items = Array.from(gridEl.children);
  const explicitCols = cols != null ? Math.max(1, Math.floor(cols)) : null;

  const build = (columns) => {
    const rowSizes = getGridRowSizes({ total: items.length, columns, direction, minPerRow });
    gridEl.replaceChildren();
    let idx = 0;
    for (const size of rowSizes) {
      const row = document.createElement('div');
      row.className = 'grid2__row';
      row.style.setProperty('--grid-row-items', String(size)); // flex CSS doesn't require it
      for (let i = 0; i < size; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid2__item';
        if (maxItemWidth) cell.style.maxWidth = maxItemWidth;
        cell.appendChild(items[idx++]); // move the original node into the cell
        row.appendChild(cell);
      }
      gridEl.appendChild(row);
    }
  };

  if (explicitCols) {
    build(explicitCols);
    return () => {};
  }

  const columnsForWidth = () => {
    const width = gridEl.getBoundingClientRect().width;
    if (!width) return null;
    const cs = getComputedStyle(gridEl);
    const minW = parseFloat(cs.getPropertyValue('--grid-min')) || 54;
    const gapW = parseFloat(cs.getPropertyValue('--grid-gap')) || 6;
    return Math.max(1, Math.min(items.length || 1, Math.floor((width + gapW) / (minW + gapW))));
  };

  let current = -1;
  let scheduled = false;
  const update = () => {
    // Self-disconnect: the app re-renders via innerHTML (fire-and-forget), so
    // discarded grids must clean up on their own — nobody holds the cleanup fn.
    // Never blocks a legitimate init: the initial update() below runs while
    // the element is connected; this only fires on observer ticks after a
    // re-render has thrown the element away.
    if (!gridEl.isConnected) { observer.disconnect(); return; }
    const c = columnsForWidth();
    if (c == null || c === current) return; // only rebuild when the column count actually changes
    current = c;
    build(c);
  };

  // rAF-guard the observer callback: rebuilding changes the grid's height, which
  // would re-fire the observer — the rAF + column-change guard prevent a loop.
  const onResize = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; update(); });
  };

  const observer = new ResizeObserver(onResize);
  observer.observe(gridEl);
  update(); // initial synchronous layout

  return () => observer.disconnect();
}

// --- attribute-driven auto-init ----------------------------------------------
const GRID2_PENDING_SELECTOR='.grid2[data-grid2]:not([data-grid2-init])';

function initGridFromAttrs(el) {
  el.setAttribute('data-grid2-init', '');
  initGrid2(el, {
    cols: el.dataset.grid2Cols ? Number(el.dataset.grid2Cols) : null,
    direction: el.dataset.grid2Direction || 'top-down',
    minPerRow: Number(el.dataset.grid2MinPerRow || 0),
    maxItemWidth: el.dataset.grid2MaxWidth || null
  });
}

// Root-scoped observer is the primary mechanism for fragment re-renders.
// MutationObserver callbacks run at the microtask checkpoint before paint.
export function observeGrids(root) {
  if (!root) return () => {};
  const observer=new MutationObserver((mutations)=>{
    mutations.forEach((mutation)=>{
      mutation.addedNodes.forEach((node)=>{
        if(node.nodeType!==1) return;
        if(node.matches(GRID2_PENDING_SELECTOR)) initGridFromAttrs(node);
        node.querySelectorAll(GRID2_PENDING_SELECTOR).forEach(initGridFromAttrs);
      });
    });
  });
  observer.observe(root,{childList:true,subtree:true});
  return ()=>observer.disconnect();
}

// --- declarative auto-init sweep ---------------------------------------------
// Call after each render pass, scoped to the tool root (keeps it
// standalone-clean): initAllGrids(root). Idempotent — already-initialized
// grids carry data-grid2-init and are skipped; re-rendered grids are fresh
// DOM without the marker and get picked up.
export function initAllGrids(scope) {
  if (!scope) return;
  scope.querySelectorAll(GRID2_PENDING_SELECTOR).forEach(initGridFromAttrs);
}
