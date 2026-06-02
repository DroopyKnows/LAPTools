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

  function resetBagScannerBeforeRun(){
    if(typeof resetScannerStateInAppState==="function") resetScannerStateInAppState();
    scannerRender.setBagScannerLastScan(null);
    const review=document.getElementById("bagScannerReview");
    if(review){
      review.classList.add("hidden");
      review.innerHTML="";
    }
  }

  function openBagScanner(){
    const card=document.getElementById("bagScannerCard");
    if(!card) return;
    card.classList.remove("hidden");
    card.classList.add("open");
    scannerRender.setBagScannerStatus("","");
    card.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function closeBagScanner(){
    bagScannerRunId++;
    purgeBagScannerData();
    const card=document.getElementById("bagScannerCard");
    if(card) card.classList.add("hidden");
  }

  function toggleBagScannerCard(){
    const card=document.getElementById("bagScannerCard");
    if(card) card.classList.toggle("open");
  }

  function setBagScannerFiles(event){
    const input=event && event.target ? event.target : document.getElementById("bagScannerFiles");
    const count=input && input.files ? input.files.length : 0;
    scannerRender.clearBagScannerReview();
    if(state && state.ui){
      state.ui.bagScanner=createEmptyScannerState();
      state.ui.bagScanner.selectedFileNames=input && input.files ? Array.from(input.files).map(file=>file.name) : [];
    }
    scannerRender.setBagScannerStatus(count ? `${count} screenshot${count===1 ? "" : "s"} selected.` : "","");
  }

  async function runBagScanner(){
    const files=document.getElementById("bagScannerFiles")?.files || [];
    const runId=++bagScannerRunId;
    resetBagScannerBeforeRun();
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
      cancelLabel:"Cancel",
      confirmClass:"primary-btn"
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
    setBagScannerFiles,
    toggleBagScannerCard
  };

  api.exports={
    get bagScannerRunId(){ return bagScannerRunId; },
    closeBagScanner,
    openBagScanner,
    purgeBagScannerData,
    replaceActiveInventoryFromBagScan,
    resetBagScannerBeforeRun,
    runBagScanner,
    setBagScannerFiles,
    toggleBagScannerCard
  };

  return api;
}
