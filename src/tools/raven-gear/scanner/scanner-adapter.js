import { ravenItems, allItemLevels } from "../../../app/core/data.js";

const SCANNER_WORKER_ITEM_NAMES=[
  "Heart of Wisdom",
  "Feather of Night",
  "Sharp Beak",
  "Tail of Wind",
  "Attackers Claw",
  "Eye of Perception"
];

const SCANNER_ITEM_ALIASES={
  "attacker's claw":"Attackers Claw",
  "attackers claw":"Attackers Claw",
  "attacker claw":"Attackers Claw",
  "heart of wisdom":"Heart of Wisdom",
  "feather of night":"Feather of Night",
  "sharp beak":"Sharp Beak",
  "tail of wind":"Tail of Wind",
  "eye of perception":"Eye of Perception"
};

function scannerNormalizeItemName(name){
  const raw=String(name||"").trim();
  const direct=ravenItems.find(item=>item.name===raw);
  if(direct) return direct.name;
  const workerDirect=SCANNER_WORKER_ITEM_NAMES.find(item=>item===raw);
  if(workerDirect) return workerDirect;
  return SCANNER_ITEM_ALIASES[raw.toLowerCase()] || null;
}

function scannerEmptyInventory(){
  const out={};
  ravenItems.forEach(item=>out[item.name]={});
  return out;
}

function scannerSafeQty(value){
  const qty=Math.floor(Number(value||0));
  return Number.isFinite(qty) && qty>0 ? qty : 0;
}

function scannerNormalizeLevelQty(levels){
  const out={};
  if(!levels || typeof levels!=="object" || Array.isArray(levels)) return out;
  const allowedLevels=new Set(allItemLevels.map(level=>Number(level)));
  Object.entries(levels).forEach(([levelKey,qtyValue])=>{
    const level=Number(levelKey);
    if(!allowedLevels.has(level)) return;
    const qty=scannerSafeQty(qtyValue);
    if(qty>0) out[level]=qty;
  });
  return out;
}

function scannerInventoryFromFinalItems(items){
  const inventory=scannerEmptyInventory();
  if(!items || typeof items!=="object" || Array.isArray(items)) return inventory;
  Object.entries(items).forEach(([itemName,levels])=>{
    const normalizedName=scannerNormalizeItemName(itemName);
    if(!normalizedName) return;
    inventory[normalizedName]=scannerNormalizeLevelQty(levels);
  });
  return inventory;
}

function scannerInventoryFromGlobalRows(globalRows){
  const inventory=scannerEmptyInventory();
  if(!Array.isArray(globalRows)) return inventory;
  const allowedLevels=new Set(allItemLevels.map(level=>Number(level)));
  globalRows.forEach(row=>{
    const tiles=Array.isArray(row && row.tiles) ? row.tiles : [];
    tiles.forEach(tile=>{
      const normalizedName=scannerNormalizeItemName(tile && tile.item);
      const level=Number(tile && tile.level);
      const qty=scannerSafeQty(tile && tile.qty);
      if(!normalizedName || !allowedLevels.has(level) || qty<=0) return;
      inventory[normalizedName][level]=(inventory[normalizedName][level]||0)+qty;
    });
  });
  return inventory;
}

function scannerInventoryFromResult(result){
  if(result && result.items && typeof result.items==="object" && !Array.isArray(result.items)){
    return scannerInventoryFromFinalItems(result.items);
  }
  if(result && Array.isArray(result.globalRows)){
    return scannerInventoryFromGlobalRows(result.globalRows);
  }
  return scannerEmptyInventory();
}

function scannerDetectedCount(inventory){
  let total=0;
  ravenItems.forEach(item=>{
    Object.values((inventory||{})[item.name]||{}).forEach(qty=>{
      total+=scannerSafeQty(qty);
    });
  });
  return total;
}

function scannerHasInventoryValues(inventory){
  return scannerDetectedCount(inventory)>0;
}

function scannerFirstIssueReason(result,inventory){
  if(!scannerHasInventoryValues(inventory)) return "No Raven items were detected.";
  // Worker quantityConflicts can be a diagnostic artifact from overlapping screenshots.
  // The adapter should trust the normalized final inventory unless the Worker explicitly
  // marks the scan non-auto-applicable or inconsistent.
  if(result && result.canAutoApply===false) return "Review needed before applying this scan.";
  if(result && result.isConsistent===false) return "Review needed. The screenshots could not be matched cleanly.";
  return "";
}

function scannerAdaptWorkerResponse(json){
  if(!json || json.ok===false) throw new Error(json?.errorMessage || json?.error || "Scanner failed.");
  const result=json.result && typeof json.result==="object" ? json.result : json;
  const inventory=scannerInventoryFromResult(result);
  const detectedCount=scannerDetectedCount(inventory);
  const quantityConflicts=Array.isArray(result.quantityConflicts) ? result.quantityConflicts : [];
  const issueReason=scannerFirstIssueReason(result,inventory);
  return {
    raw:json,
    result,
    inventory,
    detectedCount,
    canAutoApply:detectedCount>0 && result.canAutoApply!==false && result.isConsistent!==false,
    isConsistent:result.isConsistent!==false,
    issueReason,
    warnings:issueReason ? [issueReason] : [],
    notes:Array.isArray(result.notes) ? result.notes : [],
    ignoredTiles:Array.isArray(result.ignoredTiles) ? result.ignoredTiles : [],
    uncertain:Array.isArray(result.uncertain) ? result.uncertain : [],
    quantityConflicts
  };
}

export {
  SCANNER_ITEM_ALIASES,
  SCANNER_WORKER_ITEM_NAMES,
  scannerAdaptWorkerResponse,
  scannerDetectedCount,
  scannerEmptyInventory,
  scannerFirstIssueReason,
  scannerHasInventoryValues,
  scannerInventoryFromFinalItems,
  scannerInventoryFromGlobalRows,
  scannerInventoryFromResult,
  scannerNormalizeItemName,
  scannerNormalizeLevelQty,
  scannerSafeQty
};

// v1.0.13 module bridge exports
if(typeof window!=="undefined"){
  Object.assign(window,{
    SCANNER_ITEM_ALIASES,
    SCANNER_WORKER_ITEM_NAMES,
    scannerAdaptWorkerResponse,
    scannerDetectedCount,
    scannerEmptyInventory,
    scannerFirstIssueReason,
    scannerHasInventoryValues,
    scannerInventoryFromFinalItems,
    scannerInventoryFromGlobalRows,
    scannerInventoryFromResult,
    scannerNormalizeItemName,
    scannerNormalizeLevelQty,
    scannerSafeQty
  });
}
