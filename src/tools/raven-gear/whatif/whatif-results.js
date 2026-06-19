// Whatif results module. Renders the scenario's Setup sync + Inventory Change Summary,
// then drives the shared Results / Non-target card blocks (one computeResults(whatIfEnv)
// pass → two views, via runtime.whatIfBlocks).

import { chestLevels, allItemLevels, MAX_ITEM_LEVEL } from "../metadata/item-metadata.js";
import { renderStateRows } from "./whatif-ui-renderers.js";

export function createWhatIfResultsModule(runtime) {
  const {
    state, safeNum,
    simplifyUpByLevel, requiredAtLevel, levelObjectEquivalentAtLevel,
    addLevelObjects, rawTargetAdditionsFromPlanAndChoice,
    nontargetSideTotalsFromRandomPlan, makeDualDetailCompactPillTable,
    makeLevelValuePillTable, makeRemainingItemsChunkedTable,
    estimatedDisplayLevels,
    calculateEffectiveOwnedForRemainingItems,
    calculateEffectiveOwnedForRemainingChestColumn, renderCompactLevelBoxes,
    renderEmptyState, save,
  } = runtime;

function whatIfHasInputs(){
  runtime.ensureWhatIfState();
  return Object.values(state.whatIf.current.random||{}).some(v=>Number(v||0)>0) || Object.values(state.whatIf.current.choice||{}).some(v=>Number(v||0)>0);
}

function renderWhatIfScenario(){
  runtime.ensureWhatIfState();
  const item=runtime.whatIfItem();
  const p=runtime.whatIfProbability();
  const target=Math.max(1,Math.min(MAX_ITEM_LEVEL,Number(state.whatIf.current.targetLevel||7)));
  const random=state.whatIf.current.random || {};
  const choice=state.whatIf.current.choice || {};
  // Scenario-local top-up bundles (edited in the What If chest card).
  const bt=runtime.bundleTotalsForObject(state.whatIf.current.topUpBundles||{}) || {random:{},choice:{}};
  const effPlan=runtime.levelObjectPlus(random, bt.random||{});
  const effChoice=runtime.levelObjectPlus(choice, bt.choice||{});
  const baseline=runtime.getWhatIfBaselineForCurrent();
  const currentInventory=baseline.starting || {};
  const combined=baseline.combined || {};
  const source=state.whatIf.current.baselineSource==="starting" ? "starting" : "combined";
  const ownedBase=source==="starting" ? currentInventory : combined;
  const rawScenarioAdds=rawTargetAdditionsFromPlanAndChoice(effPlan,effChoice,p);
  const expected=simplifyUpByLevel(rawScenarioAdds);
  const after=simplifyUpByLevel(addLevelObjects(ownedBase,rawScenarioAdds));

  // Scenario Setup: keep the selects, showHigh, and baseline toggle in sync with
  // state. (Chance is set by the Results block via the whatIf env's chanceIds.)
  const itemSelect=runtime.byId("whatIfTargetItem");
  if(itemSelect) itemSelect.value=item.name;
  const targetSelect=runtime.byId("whatIfTargetLevel");
  if(targetSelect) targetSelect.value=String(target);
  const bStart=runtime.byId("whatIfBaselineStarting");
  const bComb=runtime.byId("whatIfBaselineCombined");
  if(bStart) bStart.classList.toggle("active",source==="starting");
  if(bComb) bComb.classList.toggle("active",source==="combined");

  runtime.renderWhatIfSetupPreview();

  const summary=runtime.byId("whatIfChangeSummary");
  if(summary){
    const compactSummaryPills=(obj,emptyText)=>renderCompactLevelBoxes(obj || {}, allItemLevels, {itemName:item.name,techPoints:baseline.techPoints}) || renderEmptyState({title:"",message:emptyText,className:"notice2 notice2--empty",compact:true});
    summary.innerHTML=renderStateRows([
      {title:"Current Inventory",sub:`Manually entered inventory for ${item.name}.`,html:compactSummaryPills(currentInventory,"No current inventory entered.")},
      {title:"Combined Inventory Baseline",sub:"Current Inventory plus calculated inventory from saved plans.",html:compactSummaryPills(combined,"No combined inventory yet.")},
      {title:"What If Additions",sub:"Estimated target duplicates from this scenario.",html:compactSummaryPills(expected,whatIfHasInputs()?"No target items expected.":"No What If chests entered yet.")},
      {title:"After What If",sub:"Selected baseline plus this scenario.",html:compactSummaryPills(after,"No inventory projected yet."),strong:true}
    ]);
  }

  // Results + Non-target: shared blocks, one compute → two views.
  if(runtime.whatIfBlocks) runtime.whatIfBlocks.renderWhatIfCards();
}

function toggleWhatIfNontargetSideBreakdown(){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      state.whatIf.current.nontargetBreakdownOpen=!state.whatIf.current.nontargetBreakdownOpen;
      save();
      runtime.renderWhatIfPreserve();
    }


  return {
    whatIfHasInputs,
    renderWhatIfScenario,
    toggleWhatIfNontargetSideBreakdown,
  };
}
