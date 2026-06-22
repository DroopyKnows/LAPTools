// @ts-check
// Random generation ledger — the allocation + audit half (the "balance check").
//
// The deterministic chain: every random chest makes exactly one item → split by the game's
// side table → subtract the target items already counted on the target's side → allocate each
// side's non-target pool evenly across that side's FIXED item roster (3 per side) → carry the
// remainder as leftover. Plus the count-conservation check: chests == generated, generated ==
// target + nontarget, nontarget == allocated + leftover. It depends only on the static rosters
// (not on any other item's plan), so it holds in an isolated/manual context too.
//
// LEDGER NOTE: the generation PRIMITIVES this builds on — deterministicSideTotalsFromRandomPlanDomain
// (the side split), targetItemsRawFromRandomPlanDomain (the target carve-out), and
// nontargetSideTotalsFromRandomPlanDomain — live in planning/planning-domain.js, grouped under its
// "RANDOM GENERATION LEDGER" section. This file is the second half: turning the non-target pools
// into per-item allocation + the conservation audit. Together they are the ledger.
//
// This file is the single source of truth for the audit: inventory-math.computeRawItemPlan and
// the calculation engine (shared/math/calculation-engine.js) both call computeRandomPlanAuditDomain.
//
// It is DOM-free and reads no runtime/app state, so it lives in the certified-pure logic layer.
// The level-object / planning primitives it orchestrates are PASSED IN via `math` rather than
// imported, on purpose: the runtime versions (floor-based) and the standalone *Domain versions
// (round-based) are NOT byte-identical in general, so injecting the caller's own helpers keeps
// the audit's output exactly what each caller produced before — zero drift, no integer-ness
// assumption. Both callers pass their fully-composed runtime as `math`.

import { getRavenItemNamesBySide, ravenItems } from "../metadata/item-metadata.js";

/** @param {string} side @returns {string[]} the item names on a side (the fixed roster). */
export function itemsBySide(side){
  if(typeof getRavenItemNamesBySide==="function") return getRavenItemNamesBySide(side);
  return ravenItems.filter(item=>item.side===side).map(item=>item.name);
}

/** @param {string} side @param {string} selectedName @returns {string[]} the side roster minus the target. */
export function otherItemsOnSide(side, selectedName){
  return itemsBySide(side).filter(name=>name!==selectedName);
}

/**
 * Spread a non-target pool evenly across a roster: each item gets floor(value / rosterSize) at
 * every level, and the per-level remainder is carried as leftover (never rounded into an item).
 * @param {Record<string|number,number>} pool
 * @param {string[]} itemNames
 * @returns {{allocatedByItem:Record<string,Record<number,number>>, leftover:Record<number,number>}}
 */
export function allocatePoolToItems(pool,itemNames){
  /** @type {Record<string,Record<number,number>>} */
  const allocatedByItem={};
  /** @type {Record<number,number>} */
  const leftover={};
  const divisor=Math.max(1,itemNames.length);

  itemNames.forEach(name=>allocatedByItem[name]={});

  Object.keys(pool||{}).forEach(levelKey=>{
    const level=Number(levelKey);
    const value=Math.floor(Number(pool[levelKey]||0));
    if(value<=0) return;

    const each=Math.floor(value/divisor);
    const rem=value % divisor;

    if(each>0){
      itemNames.forEach(name=>{
        allocatedByItem[name][level]=(allocatedByItem[name][level]||0)+each;
      });
    }
    if(rem>0) leftover[level]=(leftover[level]||0)+rem;
  });

  return {allocatedByItem,leftover};
}

/**
 * @typedef {Object} AuditMath the level-object + planning primitives the audit orchestrates.
 *   Each caller passes its own (the runtime bag) so output matches that caller exactly.
 * @property {(plan:Object,p:number)=>Object} rawTargetFromRandomPlan
 * @property {(plan:Object)=>{left:Object,right:Object}} deterministicSideTotalsFromRandomPlan
 * @property {(source:Object,subtractor:Object)=>Object} subtractLevelObjects
 * @property {(obj:Object)=>Object} cloneLevelObject
 * @property {(...objs:Object[])=>Object} addLevelObjects
 * @property {(obj:Object)=>number} levelObjectTotalCount
 */

/**
 * @param {Object} randomCombined random chests (manual ⊕ top-up), per level
 * @param {string} side the target item's side ("left"/"right")
 * @param {string} selectedName the target item's name (excluded from its same-side roster)
 * @param {AuditMath} math the caller's level-object/planning helpers (see typedef)
 */
export function computeRandomPlanAuditDomain(randomCombined, side, selectedName, math){
  const p=side==="left" ? 2/9 : 1/9;
  const oppositeSide=side==="left" ? "right" : "left";

  const randomTargetTotal=math.rawTargetFromRandomPlan(randomCombined,p);
  const randomSideGenerated=math.deterministicSideTotalsFromRandomPlan(randomCombined);

  const nontargetPools={
    left:side==="left" ? math.subtractLevelObjects(randomSideGenerated.left,randomTargetTotal) : math.cloneLevelObject(randomSideGenerated.left),
    right:side==="right" ? math.subtractLevelObjects(randomSideGenerated.right,randomTargetTotal) : math.cloneLevelObject(randomSideGenerated.right)
  };

  const sameSideItemNames=otherItemsOnSide(side,selectedName);
  const oppositeSideItemNames=itemsBySide(oppositeSide);

  const sameAllocation=allocatePoolToItems(nontargetPools[side] || {},sameSideItemNames);
  const oppositeAllocation=allocatePoolToItems(nontargetPools[oppositeSide] || {},oppositeSideItemNames);

  const randomItemsLeftover={left:{},right:{}};
  randomItemsLeftover[side]=sameAllocation.leftover || {};
  randomItemsLeftover[oppositeSide]=oppositeAllocation.leftover || {};

  /** @type {Record<string,Object>} */
  const assignedNontargetByItem={};
  Object.keys(sameAllocation.allocatedByItem||{}).forEach(name=>{
    assignedNontargetByItem[name]=math.addLevelObjects(assignedNontargetByItem[name]||{},sameAllocation.allocatedByItem[name]);
  });
  Object.keys(oppositeAllocation.allocatedByItem||{}).forEach(name=>{
    assignedNontargetByItem[name]=math.addLevelObjects(assignedNontargetByItem[name]||{},oppositeAllocation.allocatedByItem[name]);
  });

  const randomChestCount=math.levelObjectTotalCount(randomCombined);
  const generatedCount=math.levelObjectTotalCount(randomSideGenerated.left)+math.levelObjectTotalCount(randomSideGenerated.right);
  const targetRandomCount=math.levelObjectTotalCount(randomTargetTotal);
  const nontargetCount=math.levelObjectTotalCount(nontargetPools.left)+math.levelObjectTotalCount(nontargetPools.right);
  const allocatedCount=Object.values(assignedNontargetByItem).reduce((sum,obj)=>sum+math.levelObjectTotalCount(obj),0);
  const leftoverCount=math.levelObjectTotalCount(randomItemsLeftover.left)+math.levelObjectTotalCount(randomItemsLeftover.right);

  return {
    randomTargetTotal, randomSideGenerated, nontargetPools,
    sameSideItemNames, oppositeSideItemNames, oppositeSide,
    sameAllocation, oppositeAllocation, assignedNontargetByItem, randomItemsLeftover,
    audit:{
      randomChestCount,
      generatedCount,
      targetRandomCount,
      nontargetCount,
      allocatedCount,
      leftoverCount,
      balances:randomChestCount===generatedCount && generatedCount===(targetRandomCount+nontargetCount) && nontargetCount===(allocatedCount+leftoverCount)
    }
  };
}
