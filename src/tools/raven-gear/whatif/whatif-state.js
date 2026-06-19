// Whatif state-shape module. Ensures the whatif slice of state exists and provides the
// current item / probability / baseline. Pure leaf — calls no other whatif module.

import { ravenItems } from "../metadata/item-metadata.js";

export function createWhatIfStateModule(runtime) {
  // Runtime deps injected via runtime: the mutable `state` object and factory-created
  // closures (activeInventoryForItem / combinedInventoryForItem).
  const {
    state, activeInventoryForItem, combinedInventoryForItem,
  } = runtime;

function ensureWhatIfState(){
  state.whatIf=state.whatIf || {};
  state.whatIf.activeTab=state.whatIf.activeTab || "scenarios";
  state.whatIf.current=state.whatIf.current || {};
  state.whatIf.current.item=state.whatIf.current.item || "Heart of Wisdom";
  state.whatIf.current.targetLevel=Number(state.whatIf.current.targetLevel || 7);
  state.whatIf.current.random=state.whatIf.current.random || {};
  state.whatIf.current.choice=state.whatIf.current.choice || {};
  state.whatIf.current.topUpBundles=state.whatIf.current.topUpBundles || {daily1:0,daily2:0,weekly:0};
  state.whatIf.current.chestMainMode=state.whatIf.current.chestMainMode==="topup" ? "topup" : "chests";
  state.whatIf.current.showHigh=!!state.whatIf.current.showHigh;
  state.whatIf.current.name=state.whatIf.current.name || "";
  delete state.whatIf.current.name;
  delete state.whatIf.current.note;
  state.whatIf.current.previewOpen=!!state.whatIf.current.previewOpen;
  state.whatIf.current.nontargetBreakdownOpen=!!state.whatIf.current.nontargetBreakdownOpen;
  state.whatIf.current.baselineMode=state.whatIf.current.baselineMode || "current";
  state.whatIf.current.baselineSource=state.whatIf.current.baselineSource==="starting" ? "starting" : "combined";
  state.whatIf.current.savedBaseline=state.whatIf.current.savedBaseline || null;
  state.whatIf.saved=Array.isArray(state.whatIf.saved) ? state.whatIf.saved : [];
  state.whatIf.expandedSnapshots=state.whatIf.expandedSnapshots || {};
}

function whatIfItem(){
  ensureWhatIfState();
  return ravenItems.find(x=>x.name===state.whatIf.current.item) || ravenItems[0];
}

function whatIfProbability(){
  return whatIfItem().side==="left" ? 2/9 : 1/9;
}

function getWhatIfBaselineForCurrent(){
  ensureWhatIfState();
  const item=whatIfItem();
  const saved=state.whatIf.current.savedBaseline;
  if(state.whatIf.current.baselineMode==="saved" && saved && saved.item===item.name){
    return {item:item.name,starting:saved.starting||{},combined:saved.combined||{},techPoints:Number(saved.techPoints||0),label:"Saved Inventory Baseline"};
  }
  const starting=typeof activeInventoryForItem==="function" ? activeInventoryForItem(item.name) : ((state.inventory.active && state.inventory.active[item.name]) || {});
  const combined=typeof combinedInventoryForItem==="function" ? combinedInventoryForItem(item.name) : starting;
  const techPoints=Number(((state.inventoryTechPointsByItem || {})[item.name]) || 0);
  return {item:item.name,starting,combined,techPoints,label:"Current Inventory Baseline"};
}

  return {
    ensureWhatIfState,
    whatIfItem,
    whatIfProbability,
    getWhatIfBaselineForCurrent,
  };
}
