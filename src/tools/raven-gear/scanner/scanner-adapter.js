// Scanner worker-response adapter — thin naming shim over the canonical pure
// implementation in scanner-domain.js (// @ts-check-typed + behavior-tested by
// tests/pure-logic-tests.js). Kept ONLY so the runtime wiring, which destructures
// these exact names, is unchanged; all behavior now lives in scanner-domain.js, so
// the live adapter and the pure module can no longer drift.

import { DOMAIN_RAVEN_ITEM_NAMES, createEmptyInventoryDomain } from "../inventory/inventory-domain.js";
import {
  SCANNER_ITEM_ALIASES_DOMAIN,
  scannerSafeQtyDomain,
  scannerNormalizeItemNameDomain,
  scannerNormalizeLevelQtyDomain,
  scannerInventoryFromFinalItemsDomain,
  scannerInventoryFromGlobalRowsDomain,
  scannerInventoryFromResultDomain,
  scannerDetectedCountDomain,
  scannerHasInventoryValuesDomain,
  scannerResultIssueReasonDomain,
  scannerAdaptWorkerResponseDomain
} from "./scanner-domain.js";

const SCANNER_ITEM_ALIASES = SCANNER_ITEM_ALIASES_DOMAIN;
const SCANNER_WORKER_ITEM_NAMES = DOMAIN_RAVEN_ITEM_NAMES;
const scannerSafeQty = scannerSafeQtyDomain;
const scannerNormalizeItemName = scannerNormalizeItemNameDomain;
const scannerNormalizeLevelQty = scannerNormalizeLevelQtyDomain;
const scannerInventoryFromFinalItems = scannerInventoryFromFinalItemsDomain;
const scannerInventoryFromGlobalRows = scannerInventoryFromGlobalRowsDomain;
const scannerInventoryFromResult = scannerInventoryFromResultDomain;
const scannerDetectedCount = scannerDetectedCountDomain;
const scannerHasInventoryValues = scannerHasInventoryValuesDomain;
const scannerAdaptWorkerResponse = scannerAdaptWorkerResponseDomain;

// No-arg empty inventory (the legacy name took no args; preserve that exactly).
function scannerEmptyInventory(){
  return createEmptyInventoryDomain();
}

// Legacy (result, inventory) signature, expressed via the canonical (result, count) helper.
function scannerFirstIssueReason(result, inventory){
  return scannerResultIssueReasonDomain(result, scannerDetectedCountDomain(inventory));
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

// Legacy globals
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
