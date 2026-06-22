// @ts-check
// Pure scanner domain helpers.
// Keeps scanner runtime state and Worker response handling outside UI code.

import {
  DOMAIN_RAVEN_ITEM_NAMES,
  DOMAIN_ITEM_LEVELS,
  createEmptyInventoryDomain
} from "../inventory/inventory-domain.js";
import { getRavenScannerItemAliases } from "../metadata/item-metadata.js";

/**
 * Transient scanner UI state (lives at `state.ui.bagScanner`). Local to this domain —
 * not part of the persisted {@link RavenGearState} contract.
 * @typedef {Object} ScannerStateDomain
 * @property {*} lastScan last raw scan result, or null.
 * @property {string} status status line text.
 * @property {string} statusType status severity tag.
 * @property {string[]} selectedFileNames file names queued for scanning.
 * @property {boolean} reviewOpen whether the review panel is open.
 * @property {boolean} requiresReview whether the scan needs manual review.
 * @property {string} issueReason human-readable reason review is required.
 */

/**
 * The normalized, UI-ready view of a Worker scan response — the exact shape the
 * scanner review UI consumes. Mirrors what the live runtime path produces (the
 * scanner-adapter shim delegates here, so the two cannot drift).
 * @typedef {Object} ScannerAdaptedResponseDomain
 * @property {*} raw the original Worker response envelope.
 * @property {*} result the Worker `result` object (or the envelope when absent).
 * @property {ItemLevelMap} inventory detected inventory, per item.
 * @property {number} detectedCount total items detected across all levels.
 * @property {boolean} canAutoApply detected>0 and the Worker did not flag review.
 * @property {boolean} isConsistent whether the Worker matched screenshots cleanly.
 * @property {string} issueReason why review is required ("" when clean).
 * @property {string[]} warnings review messages (the issueReason, when present).
 * @property {*[]} notes Worker notes (image-prefixed).
 * @property {*[]} ignoredTiles tiles the Worker ignored (cut-off/artifact).
 * @property {*[]} uncertain tiles the Worker was unsure about.
 * @property {*[]} quantityConflicts row-alignment conflicts across screenshots.
 */

const SCANNER_ITEM_ALIASES_DOMAIN=getRavenScannerItemAliases();

/**
 * A fresh, empty scanner state.
 * @returns {ScannerStateDomain}
 */
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

/**
 * Reset the scanner slice of app state in place (no-op when state is malformed).
 * @param {RavenGearState} appState
 * @returns {RavenGearState}
 */
function resetScannerStateInAppStateDomain(appState){
  if(!appState || !appState.ui) return appState;
  appState.ui.bagScanner=createEmptyScannerStateDomain();
  return appState;
}

/**
 * Canonical item name for a detected/aliased name, or null when unrecognized.
 * @param {*} name
 * @returns {string|null}
 */
function scannerNormalizeItemNameDomain(name){
  const raw=String(name||"").trim();
  if(DOMAIN_RAVEN_ITEM_NAMES.includes(raw)) return raw;
  return SCANNER_ITEM_ALIASES_DOMAIN[raw.toLowerCase()] || null;
}

/**
 * Coerce a detected quantity to a positive floored integer (0 otherwise).
 * @param {*} value
 * @returns {number}
 */
function scannerSafeQtyDomain(value){
  const qty=Math.floor(Number(value||0));
  return Number.isFinite(qty) && qty>0 ? qty : 0;
}

/**
 * Clean a raw level->qty map: drop unknown levels and non-positive quantities.
 * @param {*} levels
 * @returns {LevelObject}
 */
function scannerNormalizeLevelQtyDomain(levels){
  /** @type {LevelObject} */
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

/**
 * Build a full inventory from the Worker's per-item final-items map.
 * @param {*} items
 * @returns {ItemLevelMap}
 */
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

/**
 * Build a full inventory by summing the Worker's per-tile global rows.
 * @param {*} globalRows
 * @returns {ItemLevelMap}
 */
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

/**
 * Build an inventory from whichever shape the Worker result provides.
 * @param {*} result
 * @returns {ItemLevelMap}
 */
function scannerInventoryFromResultDomain(result){
  if(result && result.items && typeof result.items==="object" && !Array.isArray(result.items)){
    return scannerInventoryFromFinalItemsDomain(result.items);
  }
  if(result && Array.isArray(result.globalRows)){
    return scannerInventoryFromGlobalRowsDomain(result.globalRows);
  }
  return createEmptyInventoryDomain();
}

/**
 * Total quantity detected across every item and level.
 * @param {ItemLevelMap} inventory
 * @returns {number}
 */
function scannerDetectedCountDomain(inventory){
  return Object.values(inventory||{}).reduce((sum,levels)=>{
    return sum + Object.values(levels||{}).reduce((inner,value)=>inner+Number(value||0),0);
  },0);
}

/**
 * Whether any Raven item was detected.
 * @param {ItemLevelMap} inventory
 * @returns {boolean}
 */
function scannerHasInventoryValuesDomain(inventory){
  return scannerDetectedCountDomain(inventory)>0;
}

/**
 * Why a scan needs review ("" when it can apply cleanly).
 * @param {*} result
 * @param {number} detectedCount
 * @returns {string}
 */
function scannerResultIssueReasonDomain(result, detectedCount){
  if(!result) return "Scan failed. No scanner response was received.";
  if(detectedCount<=0) return "No Raven items were detected.";
  // Worker quantityConflicts are kept as diagnostics, but should not force review
  // when the Worker still provides a usable final inventory.
  if(result.canAutoApply===false) return "Review needed before applying this scan.";
  if(result.isConsistent===false) return "Review needed. The screenshots could not be matched cleanly.";
  return "";
}

/**
 * Normalize a raw Worker response into the UI-ready adapted shape. Throws when the
 * response is missing or the Worker reported failure (`ok===false`) — the scanner UI
 * relies on this to surface the error. Reads the same fields the live Worker emits
 * (see the worker's merge-results.js: `result.items` is the canonical detection;
 * `quantityConflicts` gates auto-apply).
 * @param {*} json the Worker response envelope.
 * @returns {ScannerAdaptedResponseDomain}
 */
function scannerAdaptWorkerResponseDomain(json){
  if(!json || json.ok===false) throw new Error(json?.errorMessage || json?.error || "Scanner failed.");
  const result=json.result && typeof json.result==="object" ? json.result : json;
  const inventory=scannerInventoryFromResultDomain(result);
  const detectedCount=scannerDetectedCountDomain(inventory);
  const quantityConflicts=Array.isArray(result.quantityConflicts) ? result.quantityConflicts : [];
  const issueReason=scannerResultIssueReasonDomain(result,detectedCount);
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

/**
 * Whether a worker string is standing boilerplate/diagnostic text that should be
 * hidden from the user. Matches the Worker's always-present `warnings` copy (see the
 * worker's merge-results.js) — contract-coupled, hence it lives in the domain.
 * @param {*} text
 * @returns {boolean}
 */
function scannerIsDevExplanationDomain(text){
  const lower=String(text||"").toLowerCase();
  return (
    lower.includes("scanner counts physical raven tiles") ||
    lower.includes("duplicate item+level tiles") ||
    lower.includes("worker aligns") ||
    lower.includes("aligns local screenshot rows") ||
    lower.includes("continued global row numbers") ||
    lower.includes("duplicate overlap rows") ||
    lower.includes("trusted overlap") ||
    lower.includes("cut-off/artifact") ||
    lower.includes("row alignment creates conflicts")
  );
}

/**
 * First non-empty, non-boilerplate string from a list ("" when none).
 * @param {*} values
 * @returns {string}
 */
function scannerFirstCleanTextDomain(values){
  const list=Array.isArray(values) ? values : [];
  for(const value of list){
    const text=String(value||"").trim();
    if(text && !scannerIsDevExplanationDomain(text)) return text;
  }
  return "";
}

/**
 * Whether an adapted scan needs manual review before it can be applied.
 * @param {*} scan an adapted scan (see {@link ScannerAdaptedResponseDomain}).
 * @returns {boolean}
 */
function scannerHasReviewIssueDomain(scan){
  if(!scan) return false;
  if((scan.detectedCount||0)<=0) return true;
  if(scan.requiresReview===true) return true;
  if(scan.canAutoApply===false) return true;
  if(scan.isConsistent===false) return true;
  return false;
}

/**
 * The user-facing reason an adapted scan needs review: prefer a Worker-supplied
 * message, then a clean warning/note, then a generic fallback. Boilerplate
 * ({@link scannerIsDevExplanationDomain}) is filtered out.
 * @param {*} scan an adapted scan (see {@link ScannerAdaptedResponseDomain}).
 * @returns {string}
 */
function scannerReviewReasonDomain(scan){
  if(!scan) return "Scan failed. Please try again.";
  const result=scan.result || {};
  if((scan.detectedCount||0)<=0) return "Scan failed. No Raven items were detected.";

  const directReason=String(
    result.reviewReason ||
    result.errorReason ||
    result.warningMessage ||
    result.errorMessage ||
    result.error ||
    ""
  ).trim();
  if(directReason && !scannerIsDevExplanationDomain(directReason)) return directReason;

  const warning=scannerFirstCleanTextDomain(scan.warnings);
  if(warning) return warning;

  const note=scannerFirstCleanTextDomain(scan.notes);
  if(note) return note;

  if(scan.isConsistent===false) return "Review needed. The screenshots could not be matched cleanly.";
  if(scan.canAutoApply===false) return "Review needed before replacing Active Inventory.";
  return "Review needed before replacing Active Inventory.";
}

export {
  SCANNER_ITEM_ALIASES_DOMAIN,
  createEmptyScannerStateDomain,
  resetScannerStateInAppStateDomain,
  scannerNormalizeItemNameDomain,
  scannerSafeQtyDomain,
  scannerNormalizeLevelQtyDomain,
  scannerInventoryFromFinalItemsDomain,
  scannerInventoryFromGlobalRowsDomain,
  scannerInventoryFromResultDomain,
  scannerDetectedCountDomain,
  scannerHasInventoryValuesDomain,
  scannerResultIssueReasonDomain,
  scannerAdaptWorkerResponseDomain,
  scannerIsDevExplanationDomain,
  scannerFirstCleanTextDomain,
  scannerHasReviewIssueDomain,
  scannerReviewReasonDomain
};
