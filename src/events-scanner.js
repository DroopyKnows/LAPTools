// AI Bag Scanner event handlers.

let bagScannerRunId=0;

function resetBagScannerBeforeRun(){
  bagScannerLastScan=null;
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
  setBagScannerStatus("","");
  card.scrollIntoView({behavior:"smooth",block:"start"});
}

function closeBagScanner(){
  const card=document.getElementById("bagScannerCard");
  if(card) card.classList.add("hidden");
  clearBagScannerReview();
}

function toggleBagScannerCard(){
  const card=document.getElementById("bagScannerCard");
  if(card) card.classList.toggle("open");
}

function setBagScannerFiles(event){
  const input=event && event.target ? event.target : document.getElementById("bagScannerFiles");
  const count=input && input.files ? input.files.length : 0;
  clearBagScannerReview();
  setBagScannerStatus(count ? `${count} screenshot${count===1 ? "" : "s"} selected.` : "","");
}

async function runBagScanner(){
  const files=document.getElementById("bagScannerFiles")?.files || [];
  const runId=++bagScannerRunId;
  resetBagScannerBeforeRun();
  setBagScannerStatus("Scanning bag items...","loading");
  try{
    const json=await scanBagItemsWithWorker(files);
    if(runId!==bagScannerRunId) return;
    const scan=scannerAdaptWorkerResponse(json);
    renderBagScannerReview(scan);
    setBagScannerStatus("Scan complete. Review results below.","ok");
  }catch(error){
    if(runId!==bagScannerRunId) return;
    resetBagScannerBeforeRun();
    setBagScannerStatus(error instanceof Error ? error.message : String(error),"error");
  }
}

async function replaceActiveInventoryFromBagScan(){
  if(!bagScannerLastScan || !bagScannerLastScan.inventory) return;
  const shouldReplace=await showConfirmModal({
    title:"Replace Active Inventory?",
    message:"This will replace the current Active Inventory with the scan results.",
    confirmLabel:"Replace Active Inventory",
    cancelLabel:"Cancel",
    confirmClass:"primary-btn"
  });
  if(!shouldReplace) return;
  const replacementInventory=JSON.parse(JSON.stringify(bagScannerLastScan.inventory));
  bagScannerRunId++;
  clearBagScannerReview();
  state.inventory.active=replacementInventory;
  ravenItems.forEach(item=>state.inventory.active[item.name]=state.inventory.active[item.name]||{});
  save();
  closeBagScanner();
  renderAll();
  setRavenSubPage("inventory");
}
