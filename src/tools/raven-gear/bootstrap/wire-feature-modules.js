// Raven Gear feature-module wiring.
// Creates each feature module and folds its exports into the shared ravenRuntimeDeps.
// The call order is load-bearing: every module receives the deps accumulated by the
// modules before it, so later modules can see earlier modules' exports.

import { createRavenGearBackupRuntimeModule } from "../backups/raven-gear-backup-runtime.js";
import { createRavenGearSharedRuntimeModule } from "../shared/raven-gear-shared-runtime.js";
import { createRavenGearBundlesModule } from "../bundles/bundles-runtime.js";
import { createPlanningMathModule } from "../planning/planning-math.js";
import { createInventoryMathModule } from "../inventory/inventory-math.js";
import { createInventoryRenderModule } from "../inventory/inventory-render.js";
import { createInventoryEventsModule } from "../inventory/inventory-events.js";
import { createCalculatorRenderModule } from "../calculator/calculator-render.js";
import { createInventoryBreakdownModule } from "../inventory/inventory-breakdown-render.js";
import { createCalculatorBlocks } from "../calculator/calculator-blocks.js";
import { createCalculatorEventsModule } from "../calculator/calculator-events.js";
import { createWhatIfModule } from "../whatif/whatif-runtime.js";
import { createWhatIfBlocks } from "../whatif/blocks/whatif-blocks.js";
import { createRavenGearBootstrapModule } from "./raven-gear-bootstrap.js";
import { createRavenGearBridgeModule } from "./raven-gear-bridge.js";

// Wire every Raven Gear feature module onto ravenRuntimeDeps (mutated in place) and
// return only the handful of references the coordinator itself uses downstream
// (navigation render callbacks, boot helpers, and the public bridge/tests exposers).
export function wireRavenGearFeatureModules(ravenRuntimeDeps){
  const backupRuntime=createRavenGearBackupRuntimeModule(ravenRuntimeDeps);
  Object.assign(ravenRuntimeDeps, backupRuntime);
  Object.assign(window, backupRuntime);

  const sharedRuntime=createRavenGearSharedRuntimeModule(ravenRuntimeDeps);
  Object.assign(ravenRuntimeDeps, sharedRuntime);

  const bundlesRuntime=createRavenGearBundlesModule(ravenRuntimeDeps);
  Object.assign(ravenRuntimeDeps, bundlesRuntime);

  const planningMathRuntime=createPlanningMathModule(ravenRuntimeDeps);
  Object.assign(ravenRuntimeDeps, planningMathRuntime);

  const inventoryMathRuntime=createInventoryMathModule(ravenRuntimeDeps);
  Object.assign(ravenRuntimeDeps, inventoryMathRuntime);

  const inventoryRenderRuntime=createInventoryRenderModule(ravenRuntimeDeps);
  Object.assign(ravenRuntimeDeps, inventoryRenderRuntime);

  const inventoryEventsRuntime=createInventoryEventsModule(ravenRuntimeDeps);
  Object.assign(ravenRuntimeDeps, inventoryEventsRuntime);

  const calculatorRenderRuntime=createCalculatorRenderModule(ravenRuntimeDeps);
  Object.assign(ravenRuntimeDeps, calculatorRenderRuntime);

  // Inventory Summary / Item-Plan audit render surfaces. Reads shared pill/grid
  // helpers off the runtime (makeFilteredResultTable, renderTopUpCompactDetailPill,
  // renderDualDetailCompactPill, levelPillGridMarkup), so it is wired right after
  // the calculator render module and before bootstrap (which drives it).
  const inventoryBreakdownRuntime=createInventoryBreakdownModule(ravenRuntimeDeps);
  Object.assign(ravenRuntimeDeps, inventoryBreakdownRuntime);

  // Calculator card blocks depend on the render module's view fns (computeResults
  // / renderResultsView / renderNontargetView) being present on the runtime, so
  // they are wired right after it and before bootstrap (which drives them).
  const calculatorBlocksRuntime=createCalculatorBlocks(ravenRuntimeDeps);
  Object.assign(ravenRuntimeDeps, calculatorBlocksRuntime);

  const calculatorEventsRuntime=createCalculatorEventsModule(ravenRuntimeDeps);
  Object.assign(ravenRuntimeDeps, calculatorEventsRuntime);

  const whatIfRuntime=createWhatIfModule(ravenRuntimeDeps);
  Object.assign(ravenRuntimeDeps, whatIfRuntime);

  // What If reuses the calculator's Results/Non-target blocks via a what-if env;
  // depends on both the calculator render module and the what-if state/render
  // modules already being present on the runtime, so it is wired after them.
  const whatIfBlocksRuntime=createWhatIfBlocks(ravenRuntimeDeps);
  Object.assign(ravenRuntimeDeps, whatIfBlocksRuntime);

  const ravenGearBootstrapRuntime=createRavenGearBootstrapModule(ravenRuntimeDeps);
  Object.assign(ravenRuntimeDeps, ravenGearBootstrapRuntime);

  const ravenGearBridgeRuntime=createRavenGearBridgeModule(ravenRuntimeDeps);
  Object.assign(ravenRuntimeDeps, ravenGearBridgeRuntime);

  return {
    save:backupRuntime.save,
    renderInventory:inventoryRenderRuntime.renderInventory,
    updateInventoryAdvancedTabs:inventoryRenderRuntime.updateInventoryAdvancedTabs,
    renderBreakdownEstimatedInventory:inventoryBreakdownRuntime.renderBreakdownEstimatedInventory,
    renderItemPlanSummary:inventoryBreakdownRuntime.renderItemPlanSummary,
    renderWhatIf:whatIfRuntime.renderWhatIf,
    loadSavedAppState:ravenGearBootstrapRuntime.loadSavedAppState,
    bootScannerRuntime:ravenGearBootstrapRuntime.bootScannerRuntime,
    bootInventoryRuntime:ravenGearBootstrapRuntime.bootInventoryRuntime,
    bootCalculatorRuntime:ravenGearBootstrapRuntime.bootCalculatorRuntime,
    bootNavigationRuntime:ravenGearBootstrapRuntime.bootNavigationRuntime,
    exposeRavenGearRuntimeBridge:ravenGearBridgeRuntime.exposeRavenGearRuntimeBridge,
    exposeRavenGearRuntimeTests:ravenGearBridgeRuntime.exposeRavenGearRuntimeTests
  };
}
