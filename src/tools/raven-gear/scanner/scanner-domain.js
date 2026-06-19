// Pure scanner domain helpers.
// Keeps scanner runtime state and Worker response handling outside UI code.

import {
  DOMAIN_RAVEN_ITEM_NAMES,
  DOMAIN_ITEM_LEVELS,
  createEmptyInventoryDomain,
  normalizeInventoryDomain
} from "../inventory/inventory-domain.js";
import { getRavenScannerItemAliases } from "../metadata/item-metadata.js";

const SCANNER_ITEM_ALIASES_DOMAIN=getRavenScannerItemAliases();

function createEmptyScannerStateDomain(){
  return {
    lastScan:null,
    status:"",
    statusType:"",
    selectedFileNames:[],
    reviewOpen:false,
    requiresReview:false,
    issueReason:""
  };
}

function resetScannerStateInAppStateDomain(appState){
  if(!appState || !appState.ui) return appState;
  appState.ui.bagScanner=createEmptyScannerStateDomain();
  return appState;
}

function scannerNormalizeItemNameDomain(name){
  const raw=String(name||"").trim();
  if(DOMAIN_RAVEN_ITEM_NAMES.includes(raw)) return raw;
  return SCANNER_ITEM_ALIASES_DOMAIN[raw.toLowerCase()] || null;
}

function scannerSafeQtyDomain(value){
  const qty=Math.floor(Number(value||0));
  return Number.isFinite(qty) && qty>0 ? qty : 0;
}

function scannerNormalizeLevelQtyDomain(levels){
  const out={};
  if(!levels || typeof levels!=="object" || Array.isArray(levels)) return out;
  const allowed=new Set(DOMAIN_ITEM_LEVELS.map(Number));
  Object.entries(levels).forEach(([levelKey,qtyValue])=>{
    const level=Number(levelKey);
    if(!allowed.has(level)) return;
    const qty=scannerSafeQtyDomain(qtyValue);
    if(qty>0) out[level]=qty;
  });
  return out;
}

function scannerInventoryFromFinalItemsDomain(items){
  const inventory=createEmptyInventoryDomain();
  if(!items || typeof items!=="object" || Array.isArray(items)) return inventory;
  Object.entries(items).forEach(([itemName,levels])=>{
    const normalizedName=scannerNormalizeItemNameDomain(itemName);
    if(!normalizedName) return;
    inventory[normalizedName]=scannerNormalizeLevelQtyDomain(levels);
  });
  return inventory;
}

function scannerInventoryFromGlobalRowsDomain(globalRows){
  const inventory=createEmptyInventoryDomain();
  if(!Array.isArray(globalRows)) return inventory;
  const allowed=new Set(DOMAIN_ITEM_LEVELS.map(Number));
  globalRows.forEach(row=>{
    const tiles=Array.isArray(row && row.tiles) ? row.tiles : [];
    tiles.forEach(tile=>{
      const normalizedName=scannerNormalizeItemNameDomain(tile && tile.item);
      const level=Number(tile && tile.level);
      const qty=scannerSafeQtyDomain(tile && tile.qty);
      if(!normalizedName || !allowed.has(level) || qty<=0) return;
      inventory[normalizedName][level]=(inventory[normalizedName][level]||0)+qty;
    });
  });
  return inventory;
}

function scannerInventoryFromResultDomain(result){
  if(result && result.items && typeof result.items==="object" && !Array.isArray(result.items)){
    return scannerInventoryFromFinalItemsDomain(result.items);
  }
  if(result && Array.isArray(result.globalRows)){
    return scannerInventoryFromGlobalRowsDomain(result.globalRows);
  }
  return createEmptyInventoryDomain();
}

function scannerDetectedCountDomain(inventory){
  return Object.values(inventory||{}).reduce((sum,levels)=>{
    return sum + Object.values(levels||{}).reduce((inner,value)=>inner+Number(value||0),0);
  },0);
}

function scannerResultIssueReasonDomain(result, detectedCount){
  if(!result) return "Scan failed. No scanner response was received.";
  if(detectedCount<=0) return "No Raven items were detected.";
  // Worker quantityConflicts are kept as diagnostics, but should not force review
  // when the Worker still provides a usable final inventory.
  if(result.canAutoApply===false) return "Review needed before applying this scan.";
  if(result.isConsistent===false) return "Review needed. The screenshots could not be matched cleanly.";
  return "";
}

function scannerAdaptWorkerResponseDomain(response){
  const result=response && response.result ? response.result : null;
  const inventory=normalizeInventoryDomain(scannerInventoryFromResultDomain(result));
  const detectedCount=scannerDetectedCountDomain(inventory);
  const issueReason=scannerResultIssueReasonDomain(result,detectedCount);
  const canAutoApply=!!result && detectedCount>0 && !issueReason && result.canAutoApply!==false && result.isConsistent!==false;

  return {
    ok:!!response && response.ok!==false && !!result,
    inventory,
    detectedCount,
    canAutoApply,
    requiresReview:!canAutoApply,
    issueReason,
    raw:response
  };
}

export {
  createEmptyScannerStateDomain,
  resetScannerStateInAppStateDomain,
  scannerNormalizeItemNameDomain,
  scannerInventoryFromFinalItemsDomain,
  scannerInventoryFromGlobalRowsDomain,
  scannerInventoryFromResultDomain,
  scannerDetectedCountDomain,
  scannerResultIssueReasonDomain,
  scannerAdaptWorkerResponseDomain
};
