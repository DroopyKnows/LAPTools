// Math core helpers: current selection, global state access, and common guards.
// Receives the runtime + a shared `api` bag so math helpers can call one another;
// external values (state, mode, manualSide, ravenItems, allItemLevels) are read from runtime.

import { ravenItems, allItemLevels } from "../../metadata/item-metadata.js";

export function createMathCore(runtime, api){
  function selectedItemName(){
    return runtime.byId("targetItem").value;
  }

  function selectedSide(){
    if(runtime.mode==="manual") return runtime.manualSide;
    const item=ravenItems.find(x=>x.name===api.selectedItemName());
    return item ? item.side : "left";
  }

  function probability(){
    return api.selectedSide()==="left" ? 2/9 : 1/9;
  }

  function visibleOwnedLevels(){
    const highest=Number(runtime.state.highestGlobalOwned || 7);
    const maxVisible=highest>=8 ? 7 : highest;
    return allItemLevels.filter(level=>level<=maxVisible);
  }

  function activeInventoryForItem(itemName){
    const active=(runtime.state.inventory && runtime.state.inventory.active && runtime.state.inventory.active[itemName]) || {};
    return typeof api.cloneLevelObject==="function" ? api.cloneLevelObject(active) : Object.assign({},active);
  }

  function currentOwnedObject(){
    if(runtime.mode==="specific") return api.activeInventoryForItem(api.selectedItemName());
    return runtime.state.manualOwned;
  }

  function currentPlanObject(){
    if(runtime.mode==="specific") return runtime.state.plans[api.selectedItemName()] || {};
    return runtime.state.manualPlan;
  }

  function currentGuaranteedObject(){
    if(runtime.mode==="specific") return runtime.state.guaranteed[api.selectedItemName()] || {};
    return runtime.state.manualGuaranteed;
  }

  function getQty(obj,level){
    return Number((obj||{})[level] || 0);
  }

  function requiredAtLevel(target,level){
    if(target<level) return 0;
    return Math.pow(3,target-level);
  }

  function roundNice(n){
    if(!isFinite(n)||n<=0) return "-";
    if(Math.abs(n-Math.round(n))<.00001) return String(Math.round(n));
    return String(Math.round(n*100)/100);
  }

  function displayWhole(value){
    const n=Math.floor(Number(value||0));
    return n>0 ? String(n) : "-";
  }

  function safeNum(value){
    const n=Number(value || 0);
    return isFinite(n) ? n : 0;
  }

  function shouldShowSide(side, filter){
    return filter==="all" || side===filter;
  }

  function levelObjectHasValues(obj){
    return Object.values(obj||{}).some(v=>Number(v||0)>0);
  }

  function levelsWithValues(obj, levels){
    return levels.filter(level=>Number((obj||{})[level]||0)>0);
  }

  return {
    selectedItemName,
    selectedSide,
    probability,
    visibleOwnedLevels,
    activeInventoryForItem,
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
    levelsWithValues
  };
}
