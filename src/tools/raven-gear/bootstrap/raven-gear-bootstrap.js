// Raven Gear feature boot/wiring: builds the scanner/inventory/calculator/navigation
// runtimes plus the shared renderAll(). External dependencies are destructured from runtime;
// the typeof-guarded ones destructure to undefined when absent and are checked before use.

import { initAllGrids, observeGrids } from "../ui/grid/grid.js";

export function createRavenGearBootstrapModule(runtime) {
  const {
    // root-scoped element accessors
    byId, queryRoot,
    // app state + persistence
    state, save, STORAGE_KEY,
    replaceStateWithNormalized, normalizeCurrentState,
    // metadata
    allItemLevels, ravenItems,
    // scanner-feature module factories + their needed primitives
    createScannerRenderModule, createScannerEventsModule,
    createEmptyScannerState, normalizeInventory,
    scanBagItemsWithWorker, scannerAdaptWorkerResponse,
    setRavenSubPage, showConfirmModal,
    // UI primitives
    levelObjectHasValues, renderCompactInventoryRows, renderCompactLevelBoxes,
    renderEmptyState, renderInventorySnapshotBlock, roundNice, uiEscapeAttr,
    // calc/inv-events render entry points (called inside renderAll)
    renderOwnedInputs, renderPlanInputs, renderGuaranteedInputs,
    calculateResults, renderInventory, renderInventoryRandomTables,
    ensureBankObjects,
    // defensively typeof-guarded — destructure to undefined if absent on runtime
    resetScannerStateInAppState, ensureWhatIfState, applyGlobalDisplaySettings,
    renderWhatIf, renderItemPlanSummary, bindAppRouteEvents, applyRouteFromHash,
  } = runtime;

  runtime.disconnectGridObserver=observeGrids(runtime.root || document);

  // Cached scanner-runtime singletons; ensureScannerFeatureRuntime lazily fills them on first call.
  let scannerRenderRuntime=null;
  let scannerEventsRuntime=null;

  function ensureScannerFeatureRuntime(){
    if(scannerRenderRuntime && scannerEventsRuntime) return {render:scannerRenderRuntime, events:scannerEventsRuntime};
    scannerRenderRuntime=createScannerRenderModule({
      byId,
      allItemLevels,
      levelObjectHasValues,
      ravenItems,
      renderCompactInventoryRows,
      renderCompactLevelBoxes,
      renderEmptyState,
      renderInventorySnapshotBlock,
      roundNice,
      uiEscapeAttr
    });
    scannerEventsRuntime=createScannerEventsModule({
      byId,
      createEmptyScannerState,
      normalizeInventory,
      ravenItems,
      renderAll,
      resetScannerStateInAppState,
      save,
      scanBagItemsWithWorker,
      scannerAdaptWorkerResponse,
      setRavenSubPage,
      showConfirmModal,
      state
    }, scannerRenderRuntime);
    Object.assign(window,scannerRenderRuntime.exports,scannerEventsRuntime.exports);
    return {render:scannerRenderRuntime, events:scannerEventsRuntime};
  }

  function loadSavedAppState(){
    const saved=localStorage.getItem(STORAGE_KEY);
    if(saved){
      try{replaceStateWithNormalized(JSON.parse(saved));}catch(e){normalizeCurrentState();}
    }
    normalizeCurrentState();
  }

  function bootScannerRuntime(){
    ensureScannerFeatureRuntime();
    if(typeof resetScannerStateInAppState==="function") resetScannerStateInAppState();
    // The bag scanner card is lazily mounted into #bagScannerMount on first
    // openBagScanner — not rendered at boot.
  }

  function bootInventoryRuntime(){
    ensureBankObjects();
  }

  function bootCalculatorRuntime(){
    if(typeof ensureWhatIfState==="function") ensureWhatIfState();
    if(typeof applyGlobalDisplaySettings==="function") applyGlobalDisplaySettings();

    const target=byId("targetLevel");
    if(target && !target.options.length){
      allItemLevels.forEach(level=>{
        const opt=document.createElement("option");
        opt.value=level;
        opt.textContent="Level "+level;
        if(level===7) opt.selected=true;
        target.appendChild(opt);
      });
    }

    renderAll();
  }

  function bootNavigationRuntime(){
    // Route-event listeners are bound per-mount via bindRavenGearUiEventListeners
    // (abortable on unmount); here we only apply the current hash once.
    if(typeof applyRouteFromHash==="function") applyRouteFromHash({skipScroll:true});
  }

  function captureActiveInputState(){
    const active=document.activeElement;
    if(!active || !active.matches || !active.matches("input, textarea, select")) return null;
    return {
      key:active.getAttribute("data-input-key"),
      id:active.id || "",
      name:active.getAttribute("name") || "",
      tag:active.tagName,
      type:active.getAttribute("type") || "",
      selectionStart:active.selectionStart,
      selectionEnd:active.selectionEnd,
      scrollY:window.scrollY
    };
  }

  function restoreActiveInputState(info){
    if(!info) return;
    requestAnimationFrame(()=>{
      let el=null;
      if(info.key) el=queryRoot(`[data-input-key="${CSS.escape(info.key)}"]`);
      if(!el && info.id) el=byId(info.id);
      if(!el && info.name) el=queryRoot(`[name="${CSS.escape(info.name)}"]`);
      if(el && typeof el.focus==="function"){
        el.focus({preventScroll:true});
        try{
          if(info.selectionStart!==null && info.selectionStart!==undefined && typeof el.setSelectionRange==="function"){
            el.setSelectionRange(info.selectionStart,info.selectionEnd);
          }
        }catch(e){}
      }
      if(typeof info.scrollY==="number") window.scrollTo(0,info.scrollY);
    });
  }

  function renderAll(){
    const activeInfo=captureActiveInputState();
    if(typeof applyGlobalDisplaySettings==="function") applyGlobalDisplaySettings();
    applyLevel8NoticeVisibility();
    renderOwnedInputs();
    // Calculator chest reset options: 4 (this item / all items) in specific mode,
    // 2 (plans / top ups) in manual mode — manual is a sandbox-style environment.
    const resetConnected=byId("chestResetConnected");
    const resetSandbox=byId("chestResetSandbox");
    if(resetConnected) resetConnected.classList.toggle("hidden",runtime.mode==="manual");
    if(resetSandbox) resetSandbox.classList.toggle("hidden",runtime.mode!=="manual");
    // Calculator cards render through their mountable blocks: the Chest Inputs
    // block refreshes its inputs, then ONE computeResults() model feeds the
    // Results and Non-target blocks (two views of the same compute).
    const blocks=runtime.calculatorBlocks;
    if(blocks){
      blocks.chest.render();
      const model=runtime.computeResults();
      blocks.results.render(model);
      blocks.nontarget.render(model);
    }else{
      renderPlanInputs();
      renderGuaranteedInputs();
      calculateResults();
    }
    if(typeof renderWhatIf==="function") renderWhatIf();
    renderInventory();
    renderInventoryRandomTables();
    if(typeof renderItemPlanSummary==="function") renderItemPlanSummary();
    initAllGrids(runtime.root || document);
    save();
    restoreActiveInputState(activeInfo);
  }

  // "Level 8+ logic unfinished" page notice — dismissal persisted in
  // state.settings.dismissedMessages (cleared by Reset Do Not Show Again).
  function level8NoticeDismissed(){
    return !!(state.settings && state.settings.dismissedMessages && state.settings.dismissedMessages.level8Logic);
  }
  function applyLevel8NoticeVisibility(){
    const el=byId("level8Notice");
    if(el) el.hidden=level8NoticeDismissed();
  }
  function dismissLevel8Notice(){
    state.settings=state.settings || {};
    state.settings.dismissedMessages=state.settings.dismissedMessages || {};
    state.settings.dismissedMessages.level8Logic=true;
    save();
    applyLevel8NoticeVisibility();
  }

  return {
    scannerRenderRuntime,
    scannerEventsRuntime,
    ensureScannerFeatureRuntime,
    loadSavedAppState,
    bootScannerRuntime,
    bootInventoryRuntime,
    bootCalculatorRuntime,
    bootNavigationRuntime,
    captureActiveInputState,
    restoreActiveInputState,
    renderAll,
    dismissLevel8Notice,
  };
}
