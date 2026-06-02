// App v1.0.26 Raven Gear runtime coordinator.
// Contains Raven Gear module wiring while raven-gear-runtime.js remains a small public facade.

import { exposeAppBridge } from "../../../app/core/app-bridge.js";
import { exposeTestExports } from "../../../app/core/test-exports.js";
import * as AppData from "../../../app/core/data.js";
import * as AppActions from "../../../app/core/action-registry.js";
import * as DomainInventory from "../inventory/inventory-domain.js";
import { createInventoryMathModule } from "../inventory/inventory-math.js";
import { createInventoryRenderModule } from "../inventory/inventory-render.js";
import { createInventoryEventsModule } from "../inventory/inventory-events.js";
import * as DomainBackup from "../backups/raven-gear-backup.js";
import * as RavenGearBackupIO from "../backups/raven-gear-import-export.js";
import { createRavenGearBackupRuntimeModule } from "../backups/raven-gear-backup-runtime.js";
import * as DomainScanner from "../scanner/scanner-domain.js";
import * as ScannerAdapter from "../scanner/scanner-adapter.js";
import * as ScannerClient from "../scanner/scanner-client.js";
import { createScannerRenderModule } from "../scanner/scanner-render.js";
import { createScannerEventsModule } from "../scanner/scanner-events.js";
import { initializeHubHomeContent, setHomeCategory as setHubHomeCategory } from "../../../pages/home/home-render.js";
import * as DomainPlanning from "../planning/planning-domain.js";
import { createPlanningMathModule } from "../planning/planning-math.js";
import { createCalculatorRenderModule } from "../calculator/calculator-render.js";
import { createCalculatorEventsModule } from "../calculator/calculator-events.js";
import { createWhatIfModule } from "../whatif/whatif-runtime.js";
import { createSharedUiRuntimeModule } from "../../../shared/ui/ui-runtime.js";
import { createRavenGearSharedRuntimeModule } from "../shared/raven-gear-shared-runtime.js";
import { createRavenGearStateRuntimeModule } from "../shared/raven-gear-state-runtime.js";
import { createRavenGearBundlesModule } from "../bundles/bundles-runtime.js";
import { createRavenGearBootstrapModule } from "./raven-gear-bootstrap.js";
import { createRavenGearBridgeModule } from "./raven-gear-bridge.js";
import { createRavenGearRuntimeContext } from "./raven-gear-context.js";
import { createAppNavigationRuntimeModule } from "../../../app/navigation/app-navigation-runtime.js";
import { createDelegatedActionRuntimeModule } from "../../../app/events/delegated-actions.js";

const {
  CHEST_LEVELS,
  DEFAULT_CHEST_LEVELS,
  ITEM_LEVELS,
  MAX_CHEST_LEVEL,
  MAX_ITEM_LEVEL,
  RAVEN_ITEMS,
  STORAGE_KEY,
  allItemLevels,
  chestDefaultLevels,
  chestLevels,
  guaranteedDefaultLevels,
  ravenItems,
  topUpBundleDefinitions
}=AppData;

Object.assign(window,AppData);
AppActions.exposeActionRegistry(window);

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

const {
  BAG_SCANNER_WORKER_URL,
  getBagScannerWorkerUrl,
  normalizeScannerBaseUrl,
  scanBagItemsWithWorker
}=ScannerClient;

// App v1.0.13 ES module bundled entry.
// Existing source files are concatenated into one module scope to preserve the old shared runtime while using a module entry point.
// ===== src/state.js =====
// Loaded from src/tools/raven-gear/shared/raven-gear-state-runtime.js as a Raven Gear state module.

const ravenGearStateRuntime=createRavenGearStateRuntimeModule({
  allItemLevels,
  chestLevels,
  ravenItems,
  topUpBundleDefinitions
});

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
  normalizeUiState,
  normalizeStateShape,
  defineAlias,
  attachStateAliases,
  replaceStateWithNormalized,
  normalizeCurrentState,
  state,
}=ravenGearStateRuntime;

// Keep these runtime view flags mutable in this module scope because older
// event/render helpers still assign to them directly (mode=..., ravenSubPage=...).
// The state module owns persisted Raven Gear state; these are transient UI/runtime flags.
let mode=ravenGearStateRuntime.mode || "specific";
let manualSide=ravenGearStateRuntime.manualSide || "left";
let ravenSubPage=ravenGearStateRuntime.ravenSubPage || "calculator";
let choiceBankExpanded=!!ravenGearStateRuntime.choiceBankExpanded;

function getRavenSubPage(){
  return ravenSubPage;
}

function setRavenSubPageValue(value){
  ravenSubPage=value;
}

Object.assign(window,ravenGearStateRuntime,{mode,manualSide,ravenSubPage,choiceBankExpanded});




// ===== src/tools/raven-gear/backups/raven-gear-backup-runtime.js =====
// Raven Gear backup/contracts/storage helpers are bound below.

// ===== src/tools/raven-gear/shared/raven-gear-shared-runtime.js =====
// Shared Raven Gear math/runtime helpers are bound below.

// ===== src/math-plans.js =====
// Moved to src/tools/raven-gear/planning/planning-math.js.

// ===== src/tools/raven-gear/bundles/bundles-runtime.js =====
// Top Up Bundle and Choice Chest Bank helpers are bound below.

// ===== src/math-inventory.js =====
// Moved to src/tools/raven-gear/inventory/inventory-inventory.js and wired below.

// ===== src/math.js =====
// Legacy math entrypoint. Math helpers are split across math-core.js, math-levels.js, math-plans.js, math-bundles.js, and math-inventory.js.



// ===== src/tools/raven-gear/backups/raven-gear-backup-runtime.js =====
// Raven Gear data persistence, import, and export helpers are bound below.

// ===== src/shared/ui/ui-runtime.js =====
// Shared UI helpers moved to src/shared/ui/ui-runtime.js.
const {
  uiEscapeAttr,
  uiSplitActionArgs,
  uiActionArgAttrs,
  renderActionAttrs,
  uiNumber,
  uiLevelsWithPositiveValues,
  renderLevelPillGrid,
  renderCompactInventoryRows,
  renderFilterTabs,
  renderSoftChipButtons,
  renderSideBadge,
  renderUiActions,
  renderCompactActionCard,
  renderInventorySnapshotBlock,
  renderSingleCompactRow,
  renderStateRows,
  renderEmptyState,
  renderCollapsibleCard,
  renderSectionTitleBlock,
  renderButtonRow,
  renderMetaPillRow,
  renderResultSectionCard,
  renderInventoryItemCard,
  renderLevelInputGrid,
  ensureModalHost,
  closeAppModal,
  escapeModalValue,
  showInventorySnapshotModal,
  showConfirmModal,
  showChoiceModal
}=createSharedUiRuntimeModule();

// ===== src/tools/raven-gear/scanner/scanner-adapter.js =====
// Scanner adapter helpers now live in the Raven Gear scanner feature module.

// ===== src/tools/raven-gear/scanner/scanner-client.js =====
// Scanner Worker client helpers now live in the Raven Gear scanner feature module.


// ===== src/tools/raven-gear/scanner/scanner-render.js =====
// Scanner render helpers live in the Raven Gear scanner feature module.


// ===== src/app/navigation/app-navigation-runtime.js =====
// Hub routing, menu controls, home category switching, settings display, and Raven sub-page navigation live in app navigation.

const appNavigationRuntime=createAppNavigationRuntimeModule({
  getRavenSubPage,
  setRavenSubPageValue,
  getState:()=>state,
  save:()=>save(),
  getRenderWhatIf:()=>renderWhatIf,
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
  openGlobalMenu,
  closeGlobalMenu,
  setHomeCategory,
  initializeHomeContent,
  setRavenSubPage,
  toggleCard,
  toggleSettingsPanel,
  applyGlobalDisplaySettings,
  setGlobalSetting
}=appNavigationRuntime;

document.addEventListener("DOMContentLoaded",()=>{
  initializeHomeContent();
});


// ===== src/render-calculator.js =====
// Moved to src/tools/raven-gear/calculator/calculator-render.js.

// ===== src/render-whatif.js =====
// What If rendering moved to src/tools/raven-gear/whatif/whatif-runtime.js.

// ===== src/core/action-registry.js =====
// Loaded from src/core/action-registry.js as a real ES module.


// ===== src/events-navigation.js =====
// Raven sub-page and app shell navigation moved to src/app/navigation/app-navigation-runtime.js.


// ===== src/events-whatif.js =====
// What If events moved to src/tools/raven-gear/whatif/whatif-runtime.js.

// ===== src/events-calculator.js =====
// Moved to src/tools/raven-gear/calculator/calculator-events.js.

// ===== src/app/events/delegated-actions.js =====
// Centralized delegated event handling for rendered UI lives in the app events layer.

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
bindDelegatedUiEvents();

Object.assign(window,{
  bindDelegatedUiEvents,
  collectDelegatedArgs,
  delegatedActionNames,
  parseDelegatedDataValue,
  registerDelegatedActions,
  runNamedDelegatedAction
});


// ===== src/events.js =====
// Events are split into feature modules. See events-navigation.js, events-whatif.js, events-calculator.js, events-inventory.js, and events-core.js.




const resolveRavenRuntimeBinding=(name)=>eval(name);
const ravenRuntimeContext=createRavenGearRuntimeContext(resolveRavenRuntimeBinding);

const backupRuntime=createRavenGearBackupRuntimeModule(ravenRuntimeContext);
Object.assign(ravenRuntimeContext, backupRuntime);
const {
  APP_VERSION,
  APP_BACKUP_TYPE,
  APP_BACKUP_FORMAT_VERSION,
  createEmptyInventory,
  normalizeInventory,
  isValidInventory,
  createEmptyScannerState,
  resetScannerStateInAppState,
  normalizeScannerInventory,
  scannerInventoryIsUsable,
  getBackupFormatVersion,
  migrateBackupState,
  buildFullBackupPayload,
  parseBackupJson,
  normalizeBackupPayload,
  save,
  exportInventory,
  importInventory
}=backupRuntime;

Object.assign(window,backupRuntime);

const sharedRuntime=createRavenGearSharedRuntimeModule(ravenRuntimeContext);
Object.assign(ravenRuntimeContext, sharedRuntime);
const {
  selectedItemName,
  selectedSide,
  probability,
  visibleOwnedLevels,
  currentOwnedObject,
  currentPlanObject,
  currentGuaranteedObject,
  getQty,
  requiredAtLevel,
  roundNice,
  displayWhole,
  safeNum,
  shouldShowSide,
  levelObjectHasValues,
  levelsWithValues,
  equivalentAtLevel,
  equivalentFromHigherAndLower,
  excelWholeCount,
  excelDisplayWhole,
  addToLevelObject,
  addWholeToLevelObject,
  simplifyUpByLevel,
  simplifyExcelHelper,
  displayWholeByLevels,
  mergedOwnedWithAddtl,
  addLevelObject,
  makeSideSummaryText,
  wholeExpectedFromRandom,
  simplifyWholeByLevel,
  mergeLevelObjects,
  calculateOwnedPlusPlanPlusChoice,
  levelObjectEquivalentAtLevel,
  excelRoundWhole,
  simplifyBucketDecimal,
  displayRowFromSimplified,
  fractionalRemainderFromSimplified,
  addObjects,
  addDisplayRows,
  valuesFromLevelObject,
  levelObjectPlus,
  cloneLevelObject,
  addLevelObjects,
  convertValuesArrayToLevelObject,
  levelObjectTotalCount,
  subtractLevelObjects,
  addObjectsRaw
}=sharedRuntime;

const bundlesRuntime=createRavenGearBundlesModule(ravenRuntimeContext);
Object.assign(ravenRuntimeContext, bundlesRuntime);
const {
  bundleRandomTotals,
  activeRandomPlanObject,
  bundleTotalsForObject,
  bundleTotals,
  manualTopUpChoiceObject,
  totalChoiceObject,
  currentChoiceBankEarnedHere,
  topUpBundleObjectForItem,
  bundleTotalsForItem
}=bundlesRuntime;

const planningMathRuntime=createPlanningMathModule(ravenRuntimeContext);
Object.assign(ravenRuntimeContext, planningMathRuntime);
const {
  targetItemsFromRandomPlan,
  targetItemsFromPlanAndChoice,
  calculateAdditionalOwnedFromPlan,
  buildLeftoverHelperRows,
  rawRandomSideTotals,
  calculateAdditionalOwnedFromPlanExcludingLevel,
  deterministicSideTotalsFromRandomPlan,
  targetItemsRawFromRandomPlan,
  nontargetSideTotalsFromRandomPlan,
  calculateAdditionalOwnedFromPlanAndChoice,
  rawTargetAdditionsFromPlanAndChoice,
  calculateEffectiveOwnedForRemainingItems,
  rawTargetAdditionsFromPlanExcludingLevel,
  calculateEffectiveOwnedForRemainingChestColumn,
  rawTargetFromRandomPlan,
  rawChoiceObject,
  finalBreakdownContribution
}=planningMathRuntime;

const inventoryMathRuntime=createInventoryMathModule(ravenRuntimeContext);
Object.assign(ravenRuntimeContext, inventoryMathRuntime);
const {
  itemsBySide,
  otherItemsOnSide,
  buildAllocatedLeftoverObjects,
  allocatePoolToItems,
  getCombinedRandomChests,
  getCombinedChoiceChests,
  getRandomTargetDuplicatesForPlan,
  computeRawItemPlan,
  computeAllRawItemPlans,
  targetDuplicatesForPlanRaw,
  calculatedItemPlanInventoryRawFromPlan,
  duplicatesFromOtherRawPlans,
  duplicateContributionDetailsForItem,
  computePlanOutputsForItem,
  projectedAdditionsForInventoryItem,
  projectedOwnedForInventoryItem,
  totalRandomLeftoversBySide,
  rawAcquiredForInventoryItem,
  combinedInventoryForItem
}=inventoryMathRuntime;

const inventoryRenderRuntime=createInventoryRenderModule(ravenRuntimeContext);
Object.assign(ravenRuntimeContext, inventoryRenderRuntime);
const {
  updateSideFilterTabs,
  sideFilterMarkup,
  updateUpgradedOwnedViewTabs,
  upgradedViewModeMarkup,
  renderOwnedLevelList,
  sideFilterMarkupCompact,
  renderCompactLevelBoxes,
  inventoryDifferenceObject,
  renderCompactDifferenceBoxes,
  makeSideHeader,
  updateInventoryAdvancedTabs,
  inventoryViewMoreInfoMarkup,
  inventoryArchiveTabsMarkup,
  archiveSideFilterMarkup,
  compactInventoryCompareRows,
  renderArchivedInventoryList,
  renderInventory
}=inventoryRenderRuntime;

const inventoryEventsRuntime=createInventoryEventsModule(ravenRuntimeContext);
Object.assign(ravenRuntimeContext, inventoryEventsRuntime);
const {
  setInventoryArchiveMode,
  setInventoryArchiveFilter,
  toggleInventoryArchiveSnapshot,
  saveCurrentInventorySnapshot,
  loadInventorySnapshot,
  deleteInventorySnapshot,
  setInventoryInputFilter,
  setUpgradedOwnedFilter,
  setUpgradedOwnedViewMode,
  setHideUnacquiredInventory,
  toggleBreakdownSource,
  toggleLeftoverAppliedExplain,
  toggleInventoryBreakdownExplain,
  toggleResultsMoreInfo,
  toggleInventoryViewMoreInfo,
  setBreakdownInventoryFilter,
  setInventoryAdvancedMode,
  setInventory,
  resetCurrentPlan,
  resetAllPlans,
  resetInventory,
  toggleChestsUsedVisibility,
  toggleNontargetSideBreakdown,
  toggleMoreInfo
}=inventoryEventsRuntime;


const calculatorRenderRuntime=createCalculatorRenderModule(ravenRuntimeContext);
Object.assign(ravenRuntimeContext, calculatorRenderRuntime);
const {
  buildStepper,
  renderTopUpBundles,
  buildCombinedChestInputs,
  renderOwnedInputs,
  renderPlanInputs,
  renderGuaranteedInputs,
  makeUsageQuickAdjustSummary,
  makeTable,
  makePairedChunkTable,
  hasPlanInput,
  makeUsageSummary,
  makeFilteredResultTable,
  updateSideLeftoverLabels,
  updateTotalLeftoverItemsText,
  updateNontargetSideLabels,
  makeRemainingItemsChunkedTable,
  makeRemainingItemsResult,
  makeRemainingChestsResult,
  setRemainingSectionSubtexts,
  estimatedDisplayLevels,
  makeBundlePills,
  renderBundleAppliedSummary,
  renderChoiceBankRedeem,
  calculateResults,
  renderInventoryRandomTables,
  renderRawPills,
  renderMixedRandomPills,
  renderMixedChoicePills,
  breakdownFilterMarkup,
  renderNontargetTChart,
  inventoryBreakdownExplainMarkup,
  renderBreakdownEstimatedInventory,
  itemPlanHasAnyActivity,
  renderPlanSummaryPills,
  chestsUsedSummaryEntries,
  renderSideLeftoverPills,
  planLevelRemaindersForSide,
  planRandomLeftoversBySide,
  planSummaryShareLevelObject,
  duplicateCreditsForItemFromOtherPlans,
  calculatedItemPlanInventoryRaw,
  totalCalculatedInventoryRaw,
  renderItemPlanSummary
}=calculatorRenderRuntime;

const calculatorEventsRuntime=createCalculatorEventsModule(ravenRuntimeContext);
Object.assign(ravenRuntimeContext, calculatorEventsRuntime);
const {
  setMode,
  setManualSide,
  onTargetItemChange,
  setHighestOwned,
  setGroupValue,
  adjustGroup,
  getGroupObject,
  ensureBankObjects,
  choiceBankSourceObject,
  allTopUpBundleObjects,
  topUpChoiceTotalsAllPlans,
  totalRedeemedChoiceAllPlans,
  derivedChoiceBankAvailable,
  syncChoiceBankFromDerived,
  availableChoiceBankAtLevel,
  currentTopUpBundleObject,
  currentRedeemedBankObject,
  currentBankRedeemedAsChoiceSource,
  redeemChoiceFromBank,
  returnRedeemedChoiceToBank,
  adjustRedeemedChoice,
  setRedeemedChoice,
  removeAllRedeemedChoice,
  resetTopUpsForCurrentItem,
  resetTopUpsForAllItems,
  saveBundleChoiceChestsToBank,
  setBundleQty,
  adjustBundleQty,
  applyBundleRandomsToCurrentPlan,
  setChestMainMode,
  setChestInputMode,
  setQuickAdjust,
  jumpToTargetLevel,
  toggleChoiceBankCollapse
}=calculatorEventsRuntime;

const whatIfRuntime=createWhatIfModule(ravenRuntimeContext);
Object.assign(ravenRuntimeContext, whatIfRuntime);
const {
  ensureWhatIfState,
  whatIfItem,
  whatIfProbability,
  whatIfLevelPills,
  whatIfRawPills,
  whatIfCompactInventoryRows,
  getWhatIfBaselineForCurrent,
  renderWhatIfSetupPreview,
  renderWhatIfChestInputs,
  whatIfHasInputs,
  renderWhatIfScenario,
  renderSavedWhatIfScenarios,
  renderWhatIf,
  renderWhatIfPreserve,
  toggleWhatIfSetupPreview,
  toggleSavedScenarioSnapshot,
  toggleWhatIfNontargetSideBreakdown,
  buildWhatIfBaselineSnapshot,
  currentWhatIfBaselineFingerprint,
  setWhatIfScenarioText,
  setWhatIfTab,
  setWhatIfItem,
  setWhatIfTargetLevel,
  setWhatIfShowHigh,
  setWhatIfChestValue,
  adjustWhatIfChestValue,
  resetWhatIfScenario,
  saveWhatIfScenario,
  loadWhatIfScenario,
  deleteWhatIfScenario
}=whatIfRuntime;

// ===== src/app.js =====

// ===== src/tools/raven-gear/bootstrap/raven-gear-bootstrap.js =====
// Raven Gear boot/wiring helpers are bound below.

const ravenGearBootstrapRuntime=createRavenGearBootstrapModule(ravenRuntimeContext);
Object.assign(ravenRuntimeContext, ravenGearBootstrapRuntime);
const {
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
  renderAll
}=ravenGearBootstrapRuntime;

export function initializeRavenGearRuntimeState(){
  loadSavedAppState();
}

export function bootRavenGearScannerRuntimeModule(){
  bootScannerRuntime();
}

export function bootRavenGearInventoryRuntimeModule(){
  bootInventoryRuntime();
}

export function bootRavenGearCalculatorRuntimeModule(){
  bootCalculatorRuntime();
}

export function bootRavenGearNavigationRuntimeModule(){
  bootNavigationRuntime();
}

const ravenGearBridgeRuntime=createRavenGearBridgeModule(ravenRuntimeContext);
Object.assign(ravenRuntimeContext, ravenGearBridgeRuntime);

export const {
  exposeRavenGearRuntimeBridge,
  exposeRavenGearRuntimeTests
}=ravenGearBridgeRuntime;
