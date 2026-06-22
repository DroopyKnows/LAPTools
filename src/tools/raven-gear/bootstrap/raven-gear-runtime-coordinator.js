// Raven Gear runtime coordinator
// Contains Raven Gear module wiring while raven-gear-runtime.js remains a small public facade.

import * as AppData from "../metadata/item-metadata.js";
import * as DomainInventory from "../inventory/inventory-domain.js";
import { createInventoryMathModule } from "../inventory/inventory-math.js";
import { createInventoryRenderModule } from "../inventory/inventory-render.js";
import { createInventoryEventsModule } from "../inventory/inventory-events.js";
import { renderInventoryItemCard, renderSingleCompactRow } from "../inventory/inventory-ui-renderers.js";
import * as DomainBackup from "../backups/raven-gear-backup.js";
import * as RavenGearBackupIO from "../backups/raven-gear-import-export.js";
import { createRavenGearBackupRuntimeModule } from "../backups/raven-gear-backup-runtime.js";
import * as DomainScanner from "../scanner/scanner-domain.js";
import * as ScannerAdapter from "../scanner/scanner-adapter.js";
import * as ScannerClient from "../scanner/scanner-client.js";
import { createScannerRenderModule } from "../scanner/scanner-render.js";
import { createScannerEventsModule } from "../scanner/scanner-events.js";
import { renderButtonRow, renderMetaPillRow, renderResultSectionCard, renderSectionTitleBlock } from "../scanner/scanner-ui-renderers.js";
import * as ScannerStorageCleanup from "../scanner/scanner-storage-cleanup.js";
import * as DomainPlanning from "../planning/planning-domain.js";
import { createPlanningMathModule } from "../planning/planning-math.js";
import { createCalculatorRenderModule } from "../calculator/calculator-render.js";
import { createCalculatorEventsModule } from "../calculator/calculator-events.js";
import { renderLargeDropdown } from "../calculator/calculator-ui-renderers.js";
import { createWhatIfModule } from "../whatif/whatif-runtime.js";
import { renderStateRows } from "../whatif/whatif-ui-renderers.js";
import { createSharedUiRuntimeModule } from "../shared/ui/ui-runtime.js";
import { createRavenGearSharedRuntimeModule } from "../shared/raven-gear-shared-runtime.js";
import * as ravenGearStateRuntime from "../shared/raven-gear-state.js";
import { createRavenGearBundlesModule } from "../bundles/bundles-runtime.js";
import { createRavenGearBootstrapModule } from "./raven-gear-bootstrap.js";
import { createRavenGearBridgeModule } from "./raven-gear-bridge.js";
import { wireRavenGearFeatureModules } from "./wire-feature-modules.js";
import { createAppNavigationRuntimeModule } from "../shared/navigation/app-navigation-runtime.js";
import { createDelegatedActionRuntimeModule } from "../shared/events/delegated-actions.js";
import {
  exposeRavenGearRuntimeState,
  getRavenSubPage,
  setRavenSubPageValue
} from "../shared/raven-gear-runtime-state.js";

const {
  CHEST_LEVELS,
  DEFAULT_CHEST_LEVELS,
  ITEM_LEVELS,
  MAX_CHEST_LEVEL,
  MAX_ITEM_LEVEL,
  RAVEN_ITEM_ID_BY_NAME,
  RAVEN_ITEM_IDS,
  RAVEN_ITEM_METADATA,
  RAVEN_ITEM_NAME_BY_ID,
  RAVEN_ITEM_SIDES,
  RAVEN_ITEM_SOURCES,
  RAVEN_ITEMS,
  STORAGE_KEY,
  allItemLevels,
  chestDefaultLevels,
  chestLevels,
  getRavenItemByName,
  getRavenItemMeta,
  getRavenItemNamesBySide,
  getRavenItemSourceClassName,
  getRavenItemSourceLabel,
  getRavenItemSourceMeta,
  getRavenItems,
  getRavenItemsBySide,
  getRavenScannerItemAliases,
  guaranteedDefaultLevels,
  isLeftSideItem,
  isRightSideItem,
  normalizeRavenItemId,
  ravenItems,
  topUpBundleDefinitions
}=AppData;

let runtimeApi=null;

function requireRavenGearHost(host){
  const required={
    exposeAppBridge:host && host.exposeAppBridge,
    exposeTestExports:host && host.exposeTestExports,
    exposeActionRegistry:host && host.exposeActionRegistry
  };
  const missing=Object.keys(required).filter(name=>typeof required[name]!=="function");
  if(missing.length) throw new Error(`Raven Gear host missing: ${missing.join(", ")}`);
  return {
    exposeAppBridge:required.exposeAppBridge,
    exposeTestExports:required.exposeTestExports,
    AppActions:{exposeActionRegistry:required.exposeActionRegistry}
  };
}

export function initRavenGearRuntime(host={}, context={}){
  if(runtimeApi) return runtimeApi;
  const {
    exposeAppBridge,
    exposeTestExports,
    AppActions
  }=requireRavenGearHost(host);

  // Mount root + root-scoped element accessor. Feature modules resolve shell
  // elements through `byId` (instead of document.getElementById) so all lookups
  // stay inside the tool's own mount root — required for the standalone harness
  // and any future multi-mount. Falls back to document when no root is provided.
  const ravenRootElement=(context && context.root)
    ? context.root
    : (typeof document!=="undefined" ? document.getElementById("ravenPage") : null);
  function byId(id){
    const scope=ravenRootElement || (typeof document!=="undefined" ? document : null);
    if(!scope) return null;
    return scope.querySelector("#"+CSS.escape(String(id)));
  }
  // Root-scoped selector lookups (same scope rule as byId) so attribute queries
  // stay inside the tool's mount root — required for the standalone harness and
  // for a clean remount, where document-wide queries could hit a stale root.
  function queryRoot(selector){
    const scope=ravenRootElement || (typeof document!=="undefined" ? document : null);
    return scope ? scope.querySelector(selector) : null;
  }
  function queryAllRoot(selector){
    const scope=ravenRootElement || (typeof document!=="undefined" ? document : null);
    return scope ? scope.querySelectorAll(selector) : [];
  }

  // Hub-shell services the tool gets from the host instead of importing src/app
  // or src/pages: hub-page routing tables, the hub active-page setter, and the
  // home-content hooks (home init itself is owned by the hub bootstrap).
  const hostNavigation=(host && host.navigation) || {};
  const {
    getHubPageRoutes,
    getHubPageHashes,
    getHubPageIds,
    setHubActivePageId,
    initializeHubHomeContent,
    setHubHomeCategory
  }=hostNavigation;

  // Expose hub data + action registry on window
Object.assign(window,AppData);
AppActions.exposeActionRegistry(window);

  // Scanner adapter + worker-client bindings
const {
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
}=ScannerAdapter;

Object.assign(window,ScannerStorageCleanup);

const {
  BAG_SCANNER_WORKER_URL,
  getBagScannerWorkerUrl,
  normalizeScannerBaseUrl,
  scanBagItemsWithWorker
}=ScannerClient;

// Raven Gear state

const {
  CURRENT_STATE_SCHEMA_VERSION,
  DEFAULT_STATE,
  cloneDefaultState,
  isPlainObject,
  toSafeInteger,
  toBoolean,
  cleanString,
  normalizeFilter,
  validRavenItemName,
  normalizeLevelObject,
  normalizeBooleanMap,
  normalizeItemLevelMap,
  normalizeBundleObject,
  normalizePerItemBundleMap,
  normalizeChoiceBankObject,
  normalizeChoiceBankRedeemedMap,
  normalizeWhatIfBaseline,
  normalizeWhatIfScenario,
  normalizeWhatIfSavedEntry,
  normalizeWhatIfState,
  normalizeInventoryArchiveEntry,
  getStateSchemaVersion,
  normalizeCalculatorState,
  normalizeInventoryState,
  normalizeSettingsState,
  createEmptyScannerUiState,
  normalizeUiState,
  normalizeStateShape,
  defineAlias,
  attachStateAliases,
  replaceStateWithNormalized,
  normalizeCurrentState,
  state,
}=ravenGearStateRuntime;

Object.assign(window,ravenGearStateRuntime);
exposeRavenGearRuntimeState(window);

// Shared UI rendering helpers
const {
  uiEscapeAttr,
  renderLevelPillGrid,
  renderCompactInventoryRows,
  renderFilterTabs,
  renderSoftChipButtons,
  renderInventorySnapshotBlock,
  renderEmptyState,
  ensureModalHost,
  closeAppModal,
  showInventorySnapshotModal,
  showConfirmModal,
  showChoiceModal
}=createSharedUiRuntimeModule();

Object.assign(window,{
  renderButtonRow,
  renderInventoryItemCard,
  renderLargeDropdown,
  renderMetaPillRow,
  renderResultSectionCard,
  renderSectionTitleBlock,
  renderSingleCompactRow,
  renderStateRows
});

// App navigation: routing, menu, settings, Raven sub-pages
const appNavigationRuntime=createAppNavigationRuntimeModule({
  getHubPageRoutes,
  getHubPageHashes,
  getHubPageIds,
  setHubActivePageId,
  getRavenSubPage,
  setRavenSubPageValue,
  getState:()=>state,
  save:()=>save(),
  getRenderWhatIf:()=>renderWhatIf,
  getRenderInventory:()=>renderInventory,
  getUpdateInventoryAdvancedTabs:()=>updateInventoryAdvancedTabs,
  getRenderBreakdownEstimatedInventory:()=>renderBreakdownEstimatedInventory,
  getRenderItemPlanSummary:()=>renderItemPlanSummary,
  initializeHubHomeContent,
  setHubHomeCategory
});

const {
  appPageRoutes,
  appPageHashes,
  ravenPageRoutes,
  cleanAppHash,
  appHashForPage,
  updateAppHash,
  showPage,
  applyRouteFromHash,
  bindAppRouteEvents,
  bindZoomGuard,
  setRavenSubPage,
  showRavenSettings,
  closeRavenSettings,
  toggleCard,
  applyGlobalDisplaySettings,
  setGlobalSetting
}=appNavigationRuntime;

// Hub chrome (global menu, home category/init) is owned by the hub, not the tool;
// those functions were dropped from the tool's navigation runtime during isolation.

// Delegated UI event wiring
const delegatedRuntime=createDelegatedActionRuntimeModule({
  getActionRegistry:()=>window.LAP_ACTIONS,
  getActionFunction:(name)=>window[name] || globalThis[name]
});

const {
  delegatedActionNames,
  registerDelegatedActions,
  parseDelegatedDataValue,
  collectDelegatedArgs,
  runNamedDelegatedAction,
  bindDelegatedUiEvents
}=delegatedRuntime;

registerDelegatedActions();

// Document/window-level listeners (delegated dispatch + hash routing) are bound
// per-mount via the runtime API, with an AbortController signal so unmount can
// remove them. Each bind is flag-guarded: in the hub the shell already bound
// them, so the tool's call is a no-op there (and unmount leaves the hub's intact).
function bindRavenGearUiEventListeners(signal){
  bindDelegatedUiEvents({ signal });
  if(typeof bindAppRouteEvents==="function") bindAppRouteEvents({ signal });
  if(typeof bindZoomGuard==="function") bindZoomGuard({ signal });
}

Object.assign(window,{
  bindDelegatedUiEvents,
  collectDelegatedArgs,
  delegatedActionNames,
  parseDelegatedDataValue,
  registerDelegatedActions,
  runNamedDelegatedAction
});

// Runtime binding table shared with every feature module.
// Holds the coordinator's top-level bindings; names not present resolve to undefined.
const ravenRuntimeBindings={
  byId, queryRoot, queryAllRoot, ravenRootElement, root:ravenRootElement,
  exposeAppBridge, exposeTestExports, AppData, AppActions, DomainInventory, createInventoryMathModule,
  createInventoryRenderModule, createInventoryEventsModule, DomainBackup, RavenGearBackupIO, createRavenGearBackupRuntimeModule, DomainScanner,
  ScannerAdapter, ScannerClient, createScannerRenderModule, createScannerEventsModule, ScannerStorageCleanup, initializeHubHomeContent,
  setHubHomeCategory, DomainPlanning, createPlanningMathModule, createCalculatorRenderModule, createCalculatorEventsModule, createWhatIfModule,
  createSharedUiRuntimeModule, createRavenGearSharedRuntimeModule, ravenGearStateRuntime, createRavenGearBundlesModule, createRavenGearBootstrapModule, createRavenGearBridgeModule,
  createAppNavigationRuntimeModule, createDelegatedActionRuntimeModule, CHEST_LEVELS, DEFAULT_CHEST_LEVELS, ITEM_LEVELS,
  MAX_CHEST_LEVEL, MAX_ITEM_LEVEL, RAVEN_ITEM_ID_BY_NAME, RAVEN_ITEM_IDS, RAVEN_ITEM_METADATA, RAVEN_ITEM_NAME_BY_ID,
  RAVEN_ITEM_SIDES, RAVEN_ITEM_SOURCES, RAVEN_ITEMS, STORAGE_KEY, allItemLevels, chestDefaultLevels,
  chestLevels, getRavenItemByName, getRavenItemMeta, getRavenItemNamesBySide, getRavenItemSourceClassName, getRavenItemSourceLabel,
  getRavenItemSourceMeta, getRavenItems, getRavenItemsBySide, getRavenScannerItemAliases, guaranteedDefaultLevels, isLeftSideItem,
  isRightSideItem, normalizeRavenItemId, ravenItems, topUpBundleDefinitions, SCANNER_ITEM_ALIASES, SCANNER_WORKER_ITEM_NAMES,
  scannerAdaptWorkerResponse, scannerDetectedCount, scannerEmptyInventory, scannerFirstIssueReason, scannerHasInventoryValues, scannerInventoryFromFinalItems,
  scannerInventoryFromGlobalRows, scannerInventoryFromResult, scannerNormalizeItemName, scannerNormalizeLevelQty, scannerSafeQty, BAG_SCANNER_WORKER_URL,
  getBagScannerWorkerUrl, normalizeScannerBaseUrl, scanBagItemsWithWorker, CURRENT_STATE_SCHEMA_VERSION, DEFAULT_STATE, cloneDefaultState,
  isPlainObject, toSafeInteger, toBoolean, cleanString, normalizeFilter, validRavenItemName,
  normalizeLevelObject, normalizeBooleanMap, normalizeItemLevelMap, normalizeBundleObject, normalizePerItemBundleMap, normalizeChoiceBankObject,
  normalizeChoiceBankRedeemedMap, normalizeWhatIfBaseline, normalizeWhatIfScenario, normalizeWhatIfSavedEntry, normalizeWhatIfState, normalizeInventoryArchiveEntry,
  getStateSchemaVersion, normalizeCalculatorState, normalizeInventoryState, normalizeSettingsState, createEmptyScannerUiState, normalizeUiState,
  normalizeStateShape, defineAlias, attachStateAliases, replaceStateWithNormalized, normalizeCurrentState, state,
  uiEscapeAttr, renderLevelPillGrid, renderCompactInventoryRows, renderFilterTabs, renderSoftChipButtons,
  renderInventorySnapshotBlock, renderEmptyState,
  ensureModalHost, closeAppModal, showInventorySnapshotModal,
  showConfirmModal, showChoiceModal, appPageRoutes, appPageHashes, ravenPageRoutes, cleanAppHash,
  appHashForPage, updateAppHash, showPage, applyRouteFromHash, bindAppRouteEvents, bindZoomGuard,
  setRavenSubPage, showRavenSettings, closeRavenSettings, toggleCard,
  applyGlobalDisplaySettings, setGlobalSetting, delegatedActionNames, registerDelegatedActions, parseDelegatedDataValue, collectDelegatedArgs,
  runNamedDelegatedAction, bindDelegatedUiEvents,
  appNavigationRuntime, delegatedRuntime, getRavenSubPage, setRavenSubPageValue
};
const ravenRuntimeDeps=exposeRavenGearRuntimeState(Object.assign(Object.create(globalThis),ravenRuntimeBindings));
Object.assign(ravenRuntimeDeps,ScannerStorageCleanup);

// Feature modules are created and wired in wire-feature-modules.js (call order is load-bearing).
const {
  save,
  renderInventory,
  updateInventoryAdvancedTabs,
  renderBreakdownEstimatedInventory,
  renderItemPlanSummary,
  renderWhatIf,
  loadSavedAppState,
  bootScannerRuntime,
  bootInventoryRuntime,
  bootCalculatorRuntime,
  bootNavigationRuntime,
  exposeRavenGearRuntimeBridge,
  exposeRavenGearRuntimeTests
}=wireRavenGearFeatureModules(ravenRuntimeDeps);

function initializeRavenGearRuntimeState(){
  loadSavedAppState();
}

function bootRavenGearScannerRuntimeModule(){
  bootScannerRuntime();
}

function bootRavenGearInventoryRuntimeModule(){
  bootInventoryRuntime();
}

function bootRavenGearCalculatorRuntimeModule(){
  bootCalculatorRuntime();
}

function bootRavenGearNavigationRuntimeModule(){
  bootNavigationRuntime();
}

  runtimeApi={
    initializeRavenGearRuntimeState,
    bootRavenGearScannerRuntimeModule,
    bootRavenGearInventoryRuntimeModule,
    bootRavenGearCalculatorRuntimeModule,
    bootRavenGearNavigationRuntimeModule,
    bindRavenGearUiEventListeners,
    exposeRavenGearRuntimeBridge,
    exposeRavenGearRuntimeTests
  };
  return runtimeApi;
}

function requireInitializedRuntime(){
  if(!runtimeApi) throw new Error("Raven Gear runtime has not been initialized.");
  return runtimeApi;
}

export function resetRavenGearRuntime(){
  // Drop the cached runtime so the next initRavenGearRuntime rebuilds every
  // binding (notably byId/queryRoot, which close over the mount root) against the
  // next mount's root instead of returning a runtime bound to the unmounted one.
  runtimeApi=null;
}

export function initializeRavenGearRuntimeState(){
  return requireInitializedRuntime().initializeRavenGearRuntimeState();
}

export function bootRavenGearScannerRuntimeModule(){
  return requireInitializedRuntime().bootRavenGearScannerRuntimeModule();
}

export function bootRavenGearInventoryRuntimeModule(){
  return requireInitializedRuntime().bootRavenGearInventoryRuntimeModule();
}

export function bootRavenGearCalculatorRuntimeModule(){
  return requireInitializedRuntime().bootRavenGearCalculatorRuntimeModule();
}

export function bootRavenGearNavigationRuntimeModule(){
  return requireInitializedRuntime().bootRavenGearNavigationRuntimeModule();
}

export function exposeRavenGearRuntimeBridge(){
  return requireInitializedRuntime().exposeRavenGearRuntimeBridge();
}

export function exposeRavenGearRuntimeTests(){
  return requireInitializedRuntime().exposeRavenGearRuntimeTests();
}
