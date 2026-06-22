// @ts-check
// Math core helpers: current selection, global state access, and common guards.
// Receives the runtime + a shared `api` bag so math helpers can call one another;
// external values (state, mode, manualSide, ravenItems, allItemLevels) are read from runtime.

import { ravenItems, allItemLevels } from "../../metadata/item-metadata.js";

/**
 * Selection/state/guard helpers. These are the only math helpers coupled to the
 * runtime (they read `runtime.state`, `runtime.mode`, `runtime.manualSide`).
 * @param {MathRuntime} runtime
 * @param {*} api shared helper bag, filled in by {@link createMathModule}.
 */
export function createMathCore(runtime, api){
  /**
   * The currently targeted item name (state is the source of truth).
   * @returns {string}
   */
  function selectedItemName(){
    // State is the source of truth (no live DOM read, so the engine is portable). The
    // <select id="targetItem"> is kept in sync with state.targetItem by onTargetItemChange
    // (write on change) and renderAll (reflect on render).
    return runtime.state.targetItem || ravenItems[0].name;
  }

  /**
   * Drop side of the active selection: explicit in manual mode, else the item's side.
   * @returns {ItemSide}
   */
  function selectedSide(){
    if(runtime.mode==="manual") return runtime.manualSide;
    const item=ravenItems.find(x=>x.name===api.selectedItemName());
    return item ? /** @type {ItemSide} */(item.side) : "left";
  }

  /**
   * Per-chest drop probability for the active side (left = 2/9, right = 1/9).
   * @returns {number}
   */
  function probability(){
    return api.selectedSide()==="left" ? 2/9 : 1/9;
  }

  /**
   * Levels visible under the Owned Items Filter ("low" -> L1-7, otherwise L1-12).
   * @returns {number[]}
   */
  function visibleOwnedLevels(){
    // Owned Items Filter: "low" (7-) shows L1-7; "high"/"all" render via the showHigh path.
    const maxVisible=(runtime.state.ownedItemsFilter || "low")==="low" ? 7 : 12;
    return allItemLevels.filter(level=>level<=maxVisible);
  }

  /**
   * Cloned owned inventory for an item (empty object when unknown).
   * @param {string} itemName
   * @returns {LevelObject}
   */
  function activeInventoryForItem(itemName){
    const active=(runtime.state.inventory && runtime.state.inventory.active && runtime.state.inventory.active[itemName]) || {};
    return typeof api.cloneLevelObject==="function" ? api.cloneLevelObject(active) : Object.assign({},active);
  }

  /**
   * Owned items for the active selection (per-item inventory in specific mode, the
   * shared manual bucket in manual mode).
   * @returns {LevelObject}
   */
  function currentOwnedObject(){
    if(runtime.mode==="specific") return api.activeInventoryForItem(api.selectedItemName());
    return runtime.state.manualOwned;
  }

  /**
   * Planned (random-chest) items for the active selection.
   * @returns {LevelObject}
   */
  function currentRandomObject(){
    if(runtime.mode==="specific") return runtime.state.plans[api.selectedItemName()] || {};
    return runtime.state.manualPlan;
  }

  /**
   * Guaranteed (choice-chest) items for the active selection.
   * @returns {LevelObject}
   */
  function currentGuaranteedObject(){
    if(runtime.mode==="specific") return runtime.state.guaranteed[api.selectedItemName()] || {};
    return runtime.state.manualGuaranteed;
  }

  /**
   * Quantity at a level, coerced to a finite number (0 when absent).
   * @param {LevelObject} obj
   * @param {number} level
   * @returns {number}
   */
  function getQty(obj,level){
    return Number((obj||{})[level] || 0);
  }

  /**
   * How many level-`level` items make one level-`target` item (3x per level up).
   * @param {number} target
   * @param {number} level
   * @returns {number}
   */
  function requiredAtLevel(target,level){
    if(target<level) return 0;
    return Math.pow(3,target-level);
  }

  /**
   * Format a positive number for display, collapsing near-integers; "-" for <= 0.
   * @param {number} n
   * @returns {string}
   */
  function roundNice(n){
    if(!isFinite(n)||n<=0) return "-";
    if(Math.abs(n-Math.round(n))<.00001) return String(Math.round(n));
    return String(Math.round(n*100)/100);
  }

  /**
   * Floor to a whole count for display; "-" for <= 0.
   * @param {number} value
   * @returns {string}
   */
  function displayWhole(value){
    const n=Math.floor(Number(value||0));
    return n>0 ? String(n) : "-";
  }

  /**
   * Coerce to a finite number, falling back to 0.
   * @param {*} value
   * @returns {number}
   */
  function safeNum(value){
    const n=Number(value || 0);
    return isFinite(n) ? n : 0;
  }

  /**
   * Whether a row of the given side should show under a side filter.
   * @param {string} side
   * @param {string} filter
   * @returns {boolean}
   */
  function shouldShowSide(side, filter){
    return filter==="all" || side===filter;
  }

  /**
   * Whether any level holds a positive quantity.
   * @param {LevelObject} obj
   * @returns {boolean}
   */
  function levelObjectHasValues(obj){
    return Object.values(obj||{}).some(v=>Number(v||0)>0);
  }

  /**
   * The subset of `levels` that hold a positive quantity in `obj`.
   * @param {LevelObject} obj
   * @param {number[]} levels
   * @returns {number[]}
   */
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
    currentRandomObject,
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
