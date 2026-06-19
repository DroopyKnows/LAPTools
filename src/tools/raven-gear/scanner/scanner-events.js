// Raven Gear scanner event handlers.
// Kept feature-local so scanner behavior is not embedded in the shared Raven Gear runtime.

export function createScannerEventsModule(deps, scannerRender){
  const {
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
  }=deps;

  let bagScannerRunId=0;

  function resetBagScannerBeforeRun(options={}){
    if(typeof resetScannerStateInAppState==="function") resetScannerStateInAppState();
    scannerRender.setBagScannerLastScan(null);
    if(options.clearFiles) scannerRender.clearBagScannerFileInput();
    const review=deps.byId("bagScannerReview");
    if(review){
      review.classList.add("hidden");
      review.innerHTML="";
    }
  }

  // The scanner card is a lazily mounted block: render it into #bagScannerMount
  // on first open (never at tool boot), and unmount it on close.
  function openBagScanner(){
    const mount=deps.byId("bagScannerMount");
    if(!mount) return;
    if(!deps.byId("bagScannerCard")) mount.innerHTML=scannerRender.renderBagScannerPanel();
    scannerRender.setBagScannerStatus("","");
    const card=deps.byId("bagScannerCard");
    if(card) card.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function closeBagScanner(){
    bagScannerRunId++;
    purgeBagScannerData();
    const mount=deps.byId("bagScannerMount");
    if(mount) mount.innerHTML="";
  }

  function setBagScannerFiles(event){
    bagScannerRunId++;
    const input=event && event.target ? event.target : deps.byId("bagScannerFiles");
    const count=input && input.files ? input.files.length : 0;
    scannerRender.clearBagScannerReview();
    if(state && state.ui){
      state.ui.bagScanner=createEmptyScannerState();
      state.ui.bagScanner.selectedFileNames=input && input.files ? Array.from(input.files).map(file=>file.name) : [];
    }
    scannerRender.setBagScannerStatus(count ? `${count} screenshot${count===1 ? "" : "s"} selected.` : "","");
  }

  async function runBagScanner(){
    const input=deps.byId("bagScannerFiles");
    const files=Array.from(input?.files || []).filter(Boolean);
    const runId=++bagScannerRunId;
    resetBagScannerBeforeRun({clearFiles:true});
    scannerRender.setBagScannerStatus("Scanning bag items...","loading");
    try{
      const json=await scanBagItemsWithWorker(files);
      if(runId!==bagScannerRunId) return;
      const scan=scannerAdaptWorkerResponse(json);
      scannerRender.renderBagScannerReview(scan);
      scannerRender.setBagScannerStatus("Scan complete. Review results below.","ok");
    }catch(error){
      if(runId!==bagScannerRunId) return;
      resetBagScannerBeforeRun();
      scannerRender.setBagScannerStatus(error instanceof Error ? error.message : String(error),"error");
    }
  }

  async function replaceActiveInventoryFromBagScan(){
    const bagScannerLastScan=scannerRender.getBagScannerLastScan();
    if(!bagScannerLastScan || !bagScannerLastScan.inventory) return;
    const shouldReplace=await showConfirmModal({
      title:"Replace Active Inventory?",
      message:"This will replace the current Active Inventory with the scan results.",
      confirmLabel:"Replace Active Inventory",
      cancelLabel:"Cancel"
    });
    if(!shouldReplace) return;
    const replacementInventory=typeof normalizeInventory==="function" ? normalizeInventory(bagScannerLastScan.inventory) : JSON.parse(JSON.stringify(bagScannerLastScan.inventory));
    bagScannerRunId++;
    state.inventory.active=replacementInventory;
    ravenItems.forEach(item=>state.inventory.active[item.name]=state.inventory.active[item.name]||{});
    save();
    purgeBagScannerData();
    save();
    closeBagScanner();
    renderAll();
    setRavenSubPage("inventory");
  }

  function purgeBagScannerData(){
    bagScannerRunId++;
    if(typeof resetScannerStateInAppState==="function") resetScannerStateInAppState();
    scannerRender.clearBagScannerReview();
    scannerRender.clearBagScannerFileInput();
  }

  const api={
    closeBagScanner,
    openBagScanner,
    purgeBagScannerData,
    replaceActiveInventoryFromBagScan,
    resetBagScannerBeforeRun,
    runBagScanner,
    setBagScannerFiles
  };

  api.exports={
    get bagScannerRunId(){ return bagScannerRunId; },
    closeBagScanner,
    openBagScanner,
    purgeBagScannerData,
    replaceActiveInventoryFromBagScan,
    resetBagScannerBeforeRun,
    runBagScanner,
    setBagScannerFiles
  };

  return api;
}
