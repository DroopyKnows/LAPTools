// @ts-check
// Pure planning domain helpers.
// This file starts the planning boundary without changing current calculator behavior.

import {
  simplifyUpByLevelDomain
} from "../inventory/inventory-domain.js";

/**
 * Per-chest drop rate for the target item. Either a plain number (legacy) or an exact
 * rational {num,den} — e.g. left = {num:2,den:9}, right = {num:1,den:9}. The rational form
 * makes the rate self-documenting ("2 of 9 sides", not 0.2222) and computes floor(qty*p) as
 * floor(qty*num/den) — exact integer math in any runtime.
 * @typedef {number | {num: number, den: number}} Probability
 */

/**
 * Whole expected items from `qty` chests at drop rate `p`: floor(qty * p). A rational `p`
 * uses exact integer math (floor(qty*num/den)); a numeric `p` keeps the plain float floor.
 * (In V8 the two agree for 2/9 and 1/9 across the realistic range — verified — so the rational
 * form is a legibility/robustness choice, not a behavior change.)
 * @param {number} qty
 * @param {Probability} p
 * @returns {number}
 */
function floorExpectedItems(qty,p){
  const q=Number(qty||0);
  if(p && typeof p==="object") return Math.floor(q*Number(p.num||0)/Number(p.den||1));
  return Math.floor(q*Number(p||0));
}

/**
 * Whole target items expected from a random-chest plan: floor(qty * probability) per
 * level, then rolled up 3->1.
 * @param {LevelObject} plan random chests per level.
 * @param {Probability} probability drop rate for the target item (e.g. 2/9 or 1/9).
 * @param {number[]} [chestLevels]
 * @returns {LevelObject}
 */
function targetItemsFromRandomPlanDomain(plan,probability,chestLevels=[7,6,5,4,3,2,1]){
  /** @type {LevelObject} */
  const raw={};
  chestLevels.forEach(level=>{
    raw[level]=floorExpectedItems(Number((plan||{})[level]||0),probability);
  });
  return simplifyUpByLevelDomain(raw);
}

/**
 * Like {@link targetItemsFromRandomPlanDomain} but adds guaranteed choice chests
 * (which are whole target items directly) before rolling up.
 * @param {LevelObject} plan random chests per level.
 * @param {LevelObject} choice choice chests per level.
 * @param {Probability} probability
 * @param {number[]} [chestLevels]
 * @returns {LevelObject}
 */
function targetItemsFromPlanAndChoiceDomain(plan,choice,probability,chestLevels=[7,6,5,4,3,2,1]){
  /** @type {LevelObject} */
  const raw={};
  chestLevels.forEach(level=>{
    raw[level]=floorExpectedItems(Number((plan||{})[level]||0),probability)+Number((choice||{})[level]||0);
  });
  return simplifyUpByLevelDomain(raw);
}

/**
 * Floor each level, then roll 3->1 upward.
 * @param {LevelObject} source
 * @param {number} [maxLevel]
 * @returns {LevelObject}
 */
function simplifyWholeByLevelDomain(source,maxLevel=12){
  /** @type {LevelObject} */
  const result={};
  let carry=0;
  for(let level=1;level<=maxLevel;level++){
    const total=Math.floor(Number((source||{})[level]||0)+carry);
    if(level===maxLevel){
      if(total>0) result[level]=(result[level]||0)+total;
      carry=0;
    }else{
      const upgrades=Math.floor(total/3);
      const remainder=total-upgrades*3;
      if(remainder>0) result[level]=(result[level]||0)+remainder;
      carry=upgrades;
    }
  }
  return result;
}

/**
 * Add floored source quantities into target in place.
 * @param {LevelObject} target mutated and returned.
 * @param {LevelObject} source
 * @returns {LevelObject} target.
 */
function addRawWholeLevelsDomain(target,source){
  Object.keys(source||{}).forEach(levelKey=>{
    const level=Number(levelKey);
    const value=Math.floor(Number(source[levelKey]||0));
    if(value>0) target[level]=(target[level]||0)+value;
  });
  return target;
}

/**
 * source - subtractor per level (floored), keeping only positive results.
 * @param {LevelObject} source
 * @param {LevelObject} subtractor
 * @returns {LevelObject}
 */
function subtractWholeLevelsDomain(source,subtractor){
  /** @type {LevelObject} */
  const result={};
  Object.keys(source||{}).forEach(level=>{
    const value=Math.floor(Number(source[level]||0))-Math.floor(Number((subtractor||{})[level]||0));
    if(value>0) result[level]=value;
  });
  return result;
}

/**
 * Additional owned items gained from a random plan: floor(qty * probability) per
 * level, rolled up.
 * @param {LevelObject} plan
 * @param {Probability} probability
 * @returns {LevelObject}
 */
function calculateAdditionalOwnedFromPlanDomain(plan,probability){
  /** @type {LevelObject} */
  const rawWhole={};
  Object.keys(plan||{}).forEach(levelKey=>{
    const level=Number(levelKey);
    const qty=Number(plan[levelKey]||0);
    if(qty>0){
      const whole=floorExpectedItems(qty,probability);
      if(whole>0) rawWhole[level]=(rawWhole[level]||0)+whole;
    }
  });
  return simplifyWholeByLevelDomain(rawWhole);
}

/**
 * Like {@link calculateAdditionalOwnedFromPlanDomain} but ignoring one chest level
 * (used for the per-column "if only this level" estimates).
 * @param {LevelObject} plan
 * @param {Probability} probability
 * @param {number} excludedLevel
 * @returns {LevelObject}
 */
function calculateAdditionalOwnedFromPlanExcludingLevelDomain(plan,probability,excludedLevel){
  /** @type {LevelObject} */
  const rawWhole={};
  Object.keys(plan||{}).forEach(levelKey=>{
    const level=Number(levelKey);
    if(level===Number(excludedLevel)) return;
    const qty=Number(plan[levelKey]||0);
    if(qty>0){
      const whole=floorExpectedItems(qty,probability);
      if(whole>0) rawWhole[level]=(rawWhole[level]||0)+whole;
    }
  });
  return simplifyWholeByLevelDomain(rawWhole);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// RANDOM GENERATION LEDGER — generation primitives
// Every random chest makes exactly one item; these split that generation into side pools and
// carve out the target, leaving the non-target pools. The OTHER half of the ledger — allocating
// those pools across each side's roster + the count-conservation audit — lives in
// inventory/random-generation-ledger-domain.js. Together they are the ledger.
// ═══════════════════════════════════════════════════════════════════════════════════════════

/**
 * Deterministic left/right split of a random plan (2/3 of each chest's items land
 * on the left side, the remainder on the right).
 * @param {LevelObject} plan
 * @param {number[]} [chestLevels]
 * @returns {{left: LevelObject, right: LevelObject}}
 */
function deterministicSideTotalsFromRandomPlanDomain(plan,chestLevels=[7,6,5,4,3,2,1]){
  /** @type {LevelObject} */
  const left={};
  /** @type {LevelObject} */
  const right={};

  chestLevels.forEach(level=>{
    const qty=Math.floor(Number((plan||{})[level]||0));
    if(qty<=0) return;

    const leftQty=Math.round(qty*(2/3));
    const rightQty=qty-leftQty;

    if(leftQty>0) left[level]=(left[level]||0)+leftQty;
    if(rightQty>0) right[level]=(right[level]||0)+rightQty;
  });

  return {left,right};
}

/**
 * Raw (un-simplified) whole target items from a random plan.
 * @param {LevelObject} plan
 * @param {Probability} probability
 * @param {number[]} [chestLevels]
 * @returns {LevelObject}
 */
function targetItemsRawFromRandomPlanDomain(plan,probability,chestLevels=[7,6,5,4,3,2,1]){
  /** @type {LevelObject} */
  const target={};

  chestLevels.forEach(level=>{
    const qty=Math.floor(Number((plan||{})[level]||0));
    if(qty<=0) return;

    const targetQty=floorExpectedItems(qty,probability);
    if(targetQty>0) target[level]=(target[level]||0)+targetQty;
  });

  return target;
}

/**
 * Non-target items per side: the deterministic side split minus the target items
 * already counted on the target's own side.
 * @param {LevelObject} plan
 * @param {ItemSide} side the target item's side.
 * @param {Probability} probability
 * @param {number[]} [chestLevels]
 * @returns {{left: LevelObject, right: LevelObject}}
 */
function nontargetSideTotalsFromRandomPlanDomain(plan,side,probability,chestLevels=[7,6,5,4,3,2,1]){
  const sideTotals=deterministicSideTotalsFromRandomPlanDomain(plan,chestLevels);
  const targetRaw=targetItemsRawFromRandomPlanDomain(plan,probability,chestLevels);

  if(side==="left"){
    return {
      left:subtractWholeLevelsDomain(sideTotals.left,targetRaw),
      right:sideTotals.right
    };
  }

  return {
    left:sideTotals.left,
    right:subtractWholeLevelsDomain(sideTotals.right,targetRaw)
  };
}
// ═══════════════════ end RANDOM GENERATION LEDGER — generation primitives ═══════════════════

/**
 * Additional owned from a random plan plus guaranteed choice chests.
 * @param {LevelObject} plan
 * @param {LevelObject} choice
 * @param {Probability} probability
 * @returns {LevelObject}
 */
function calculateAdditionalOwnedFromPlanAndChoiceDomain(plan,choice,probability){
  /** @type {LevelObject} */
  const rawWhole={};

  Object.keys(plan||{}).forEach(levelKey=>{
    const level=Number(levelKey);
    const qty=Number(plan[levelKey]||0);
    if(qty>0){
      const whole=floorExpectedItems(qty,probability);
      if(whole>0) rawWhole[level]=(rawWhole[level]||0)+whole;
    }
  });

  addRawWholeLevelsDomain(rawWhole,choice);
  return simplifyWholeByLevelDomain(rawWhole);
}

/**
 * Raw (un-simplified) target additions from plan + choice.
 * @param {LevelObject} plan
 * @param {LevelObject} choice
 * @param {Probability} probability
 * @returns {LevelObject}
 */
function rawTargetAdditionsFromPlanAndChoiceDomain(plan,choice,probability){
  /** @type {LevelObject} */
  const rawWhole={};

  Object.keys(plan||{}).forEach(levelKey=>{
    const level=Number(levelKey);
    const qty=Math.floor(Number(plan[levelKey]||0));
    if(qty>0){
      const whole=floorExpectedItems(qty,probability);
      if(whole>0) rawWhole[level]=(rawWhole[level]||0)+whole;
    }
  });

  return addRawWholeLevelsDomain(rawWhole,choice);
}

/**
 * Effective owned for the "remaining items needed" view: current owned plus the
 * target items the plan + choice will add, rolled up.
 * @param {LevelObject} owned
 * @param {LevelObject} plan
 * @param {LevelObject} choice
 * @param {Probability} probability
 * @returns {LevelObject}
 */
function calculateEffectiveOwnedForRemainingItemsDomain(owned,plan,choice,probability){
  /** @type {LevelObject} */
  const rawCombined={};
  addRawWholeLevelsDomain(rawCombined,owned);
  addRawWholeLevelsDomain(rawCombined,rawTargetAdditionsFromPlanAndChoiceDomain(plan,choice,probability));
  return simplifyWholeByLevelDomain(rawCombined);
}

/**
 * Raw target additions from a plan, ignoring one chest level.
 * @param {LevelObject} plan
 * @param {Probability} probability
 * @param {number} excludedLevel
 * @returns {LevelObject}
 */
function rawTargetAdditionsFromPlanExcludingLevelDomain(plan,probability,excludedLevel){
  /** @type {LevelObject} */
  const rawWhole={};
  Object.keys(plan||{}).forEach(levelKey=>{
    const level=Number(levelKey);
    if(level===Number(excludedLevel)) return;
    const qty=Math.floor(Number(plan[levelKey]||0));
    if(qty>0){
      const whole=floorExpectedItems(qty,probability);
      if(whole>0) rawWhole[level]=(rawWhole[level]||0)+whole;
    }
  });
  return rawWhole;
}

/**
 * Effective owned for one chest column: owned + (plan target additions excluding
 * this level) + choice, rolled up.
 * @param {LevelObject} owned
 * @param {LevelObject} plan
 * @param {LevelObject} choice
 * @param {Probability} probability
 * @param {number} excludedLevel
 * @returns {LevelObject}
 */
function calculateEffectiveOwnedForRemainingChestColumnDomain(owned,plan,choice,probability,excludedLevel){
  /** @type {LevelObject} */
  const rawCombined={};
  addRawWholeLevelsDomain(rawCombined,owned);
  addRawWholeLevelsDomain(rawCombined,rawTargetAdditionsFromPlanExcludingLevelDomain(plan,probability,excludedLevel));
  addRawWholeLevelsDomain(rawCombined,choice);
  return simplifyWholeByLevelDomain(rawCombined);
}

/**
 * @param {LevelObject} plan
 * @param {Probability} probability
 * @param {number[]} [chestLevels]
 * @returns {LevelObject}
 */
function rawTargetFromRandomPlanDomain(plan,probability,chestLevels=[7,6,5,4,3,2,1]){
  return targetItemsRawFromRandomPlanDomain(plan,probability,chestLevels);
}

/**
 * @param {LevelObject} choice
 * @returns {LevelObject} a floored copy of the choice object.
 */
function rawChoiceObjectDomain(choice){
  /** @type {LevelObject} */
  const raw={};
  return addRawWholeLevelsDomain(raw,choice);
}

/**
 * Combine the three target-contribution sources and roll up to a final breakdown.
 * @param {{rawTargetRandom?: LevelObject, rawManualChoice?: LevelObject, rawRedeemedChoice?: LevelObject}} outputs
 * @returns {LevelObject}
 */
function finalBreakdownContributionDomain(outputs){
  /** @type {LevelObject} */
  const raw={};
  addRawWholeLevelsDomain(raw,(outputs&&outputs.rawTargetRandom)||{});
  addRawWholeLevelsDomain(raw,(outputs&&outputs.rawManualChoice)||{});
  addRawWholeLevelsDomain(raw,(outputs&&outputs.rawRedeemedChoice)||{});
  return simplifyUpByLevelDomain(raw);
}

export {
  floorExpectedItems,
  targetItemsFromRandomPlanDomain,
  targetItemsFromPlanAndChoiceDomain,
  simplifyWholeByLevelDomain,
  calculateAdditionalOwnedFromPlanDomain,
  calculateAdditionalOwnedFromPlanExcludingLevelDomain,
  deterministicSideTotalsFromRandomPlanDomain,
  targetItemsRawFromRandomPlanDomain,
  nontargetSideTotalsFromRandomPlanDomain,
  calculateAdditionalOwnedFromPlanAndChoiceDomain,
  rawTargetAdditionsFromPlanAndChoiceDomain,
  calculateEffectiveOwnedForRemainingItemsDomain,
  rawTargetAdditionsFromPlanExcludingLevelDomain,
  calculateEffectiveOwnedForRemainingChestColumnDomain,
  rawTargetFromRandomPlanDomain,
  rawChoiceObjectDomain,
  finalBreakdownContributionDomain
};
