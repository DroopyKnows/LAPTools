// What If card blocks — mounts the SAME Chest Inputs / Results / Non-target blocks
// the calculator uses, in the What If sandbox. The whatIfEnv supplies prefix:"whatIf"
// (globally unique ids), scenario-state data accessors, What-If action names, and
// bank:false. The cards run the exact same render + drop-rate math as the calculator
// (one computeResults(whatIfEnv) model → two views), so What If is a true replica.
//
// Differences from the calculator (per the single-item sandbox): NO choice-chest
// bank, and top-up CHOICE chests are applied automatically (folded straight into the
// scenario item's choice total). Top-up bundles are scenario-local + editable.

import { renderChestInputCardMarkup } from "../../blocks/chest-input-card.block.js";
import { renderResultsCardMarkup } from "../../blocks/results-card.block.js";
import { renderNontargetCardMarkup } from "../../blocks/nontarget-card.block.js";
import { MAX_ITEM_LEVEL } from "../../metadata/item-metadata.js";

// Single source of truth for the What If card markup options — used by both the
// shell (to lay out the DOM) and the block instances below.
export const WHATIF_CHEST_OPTIONS={
  prefix:"whatIf",
  title:"What If Chest Inputs",
  subtext:"Temporary random and choice chests for this scenario.",
  bank:false,
  resetMode:"sandbox",
  actions:{
    setChestMainMode:"setWhatIfChestMainMode",
    refreshInputs:"refreshWhatIfChestInputs",
    resetTopUpsCurrent:"resetWhatIfTopUps",
    resetTopUpsAll:"resetWhatIfTopUps",
    resetPlanCurrent:"resetWhatIfPlan",
    resetPlanAll:"resetWhatIfPlan"
  }
};
export const WHATIF_RESULTS_OPTIONS={
  prefix:"whatIf",
  title:"What If Results",
  subtext:"Estimated outcome from this scenario.",
  open:true,
  actions:{ jumpToTargetLevel:"jumpToWhatIfTargetLevel", showHighChests:"setWhatIfShowHighChests" }
};
export const WHATIF_NONTARGET_OPTIONS={
  prefix:"whatIf",
  title:"What If Non-target Items Obtained",
  subtext:"Non-target items estimated from this scenario.",
  actions:{ toggleSideBreakdown:"toggleNontargetSideBreakdown" }
};
// Inventory Change Summary block options for What If. The id / contentId are pinned to the
// original hardcoded ids so the committed CSS (violet strong-row override + the
// #whatIfSummaryCard grid-alignment rule in ui/_bridge/layout-parity.css) keeps matching, and
// the markup stays identical to the pre-refactor inline section. The What-If row DATA is still
// built by whatif-results.js (scenario-aware: baseline toggle, top-up-folded plan), rendered
// into #whatIfChangeSummary via renderStateRows — only the card chrome moved into the block.
export const WHATIF_CHANGE_SUMMARY_OPTIONS={
  id:"whatIfSummaryCard",
  contentId:"whatIfChangeSummary",
  title:"Inventory Change Summary",
  subtext:"Current Inventory, Combined Inventory baseline, and scenario result.",
  open:true
};

export function createWhatIfBlocks(runtime){
  const state=runtime.state;
  const prefix="whatIf";

  // Owned base before chests = the Scenario Setup Starting/Combined toggle choice.
  function baseOwned(){
    const base=runtime.getWhatIfBaselineForCurrent();
    return (state.whatIf.current.baselineSource==="starting" ? base.starting : base.combined) || {};
  }

  // Scenario-local top-up bundle totals (editable in the What If chest card).
  function bundleTotalsFor(){
    return runtime.bundleTotalsForObject(state.whatIf.current.topUpBundles || {}) || { random:{}, choice:{} };
  }

  const env={
    prefix,
    byId: id => runtime.byId(id),
    probability: () => runtime.whatIfProbability(),
    targetLevel: () => Math.max(1, Math.min(MAX_ITEM_LEVEL, Number(state.whatIf.current.targetLevel||7))),
    ownedObject: baseOwned,
    randomObject: () => state.whatIf.current.random || {},
    guaranteedObject: () => state.whatIf.current.choice || {},
    // Bank off: top-up choice folds directly into the item's choice total.
    totalChoiceObject: () => runtime.levelObjectPlus(state.whatIf.current.choice || {}, bundleTotalsFor().choice || {}),
    bundleRandomTotals: () => bundleTotalsFor().random || {},
    // Chest-card render/write surface:
    bundleObject: () => (state.whatIf.current.topUpBundles = state.whatIf.current.topUpBundles || {daily1:0,daily2:0,weekly:0}),
    bundleTotals: () => bundleTotalsFor(),
    bank: false,
    actions: {
      setGroupValue:"setWhatIfGroupValue",
      adjustGroup:"adjustWhatIfGroup",
      setBundleQty:"setWhatIfBundleQty",
      adjustBundleQty:"adjustWhatIfBundleQty"
    },
    showHighRandom: () => !!state.whatIf.current.showHigh,
    showHighChests: () => !!state.whatIf.current.showHighChests,
    side: () => runtime.whatIfItem().side,
    subjectLabel: () => runtime.whatIfItem().name,
    isManual: () => false,
    itemLabel: () => runtime.whatIfItem().name,
    showMetSnapshot: () => true,
    projectedOwned: () => {
      const bt=bundleTotalsFor();
      const activePlan=runtime.levelObjectPlus(state.whatIf.current.random||{}, bt.random||{});
      const totalChoice=runtime.levelObjectPlus(state.whatIf.current.choice||{}, bt.choice||{});
      return runtime.calculateOwnedPlusPlanPlusChoice(
        baseOwned(),
        runtime.calculateAdditionalOwnedFromPlanAndChoice(activePlan, totalChoice, runtime.whatIfProbability()),
        {}
      );
    },
    chanceIds: ["whatIfChanceValue"]
  };

  // Sync the chest card's persisted tab + show-high state into the DOM (the card
  // markup is injected once; render only repopulates inner content).
  function syncChestChrome(){
    const chestActive=state.whatIf.current.chestMainMode!=="topup";
    const set=(id,cls,on)=>{ const el=runtime.byId(id); if(el) el.classList.toggle(cls,on); };
    set(prefix+"chestsMainTab","active",chestActive);
    set(prefix+"topUpBundlesTab","active",!chestActive);
    set(prefix+"chestsCombinedPanel","hidden",!chestActive);
    set(prefix+"topUpBundlesPanel","hidden",chestActive);
    const hi=runtime.byId(prefix+"showHighRandom");
    if(hi) hi.checked=!!state.whatIf.current.showHigh;
    const hiChests=runtime.byId(prefix+"showHighChestLevels");
    if(hiChests) hiChests.checked=!!state.whatIf.current.showHighChests;
  }

  const chest={
    id: prefix+"chestInputCard",
    markup: renderChestInputCardMarkup(WHATIF_CHEST_OPTIONS),
    render(){
      const levels=env.showHighRandom() ? [7,6,5,4,3,2,1] : [5,4,3,2,1];
      runtime.buildCombinedChestInputs(prefix+"combinedChestInputs", levels, env);
      runtime.renderTopUpBundles(env);   // also renders the chest collapsed snapshot
      syncChestChrome();
    }
  };

  const results={
    id: prefix+"resultsCard",
    markup: renderResultsCardMarkup(WHATIF_RESULTS_OPTIONS),
    render(model){ runtime.renderResultsView(model || runtime.computeResults(env), env); }
  };

  const nontarget={
    id: prefix+"nontargetCard",
    markup: renderNontargetCardMarkup(WHATIF_NONTARGET_OPTIONS),
    render(model){ runtime.renderNontargetView(model || runtime.computeResults(env), env); }
  };

  // Chest inputs first, then one compute pass → both result views (mirrors renderAll).
  function renderWhatIfCards(){
    chest.render();
    const model=runtime.computeResults(env);
    results.render(model);
    nontarget.render(model);
  }

  return { whatIfBlocks:{ env, chest, results, nontarget, renderWhatIfCards } };
}
