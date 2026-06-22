// @ts-check
// Level-object helpers: rounding, merging, simplifying, and display conversion.
// Cross-helper calls go through the shared `api` bag; runtime constants
// (MAX_ITEM_LEVEL, allItemLevels) are read from runtime.

import { MAX_ITEM_LEVEL, allItemLevels } from "../../metadata/item-metadata.js";

/**
 * Pure level-object math + display helpers. Unlike core.js these are independent of
 * `runtime` (it is accepted for signature symmetry but unused); cross-helper calls
 * go through the shared `api` bag.
 * @param {MathRuntime} runtime
 * @param {*} api shared helper bag, filled in by {@link createMathModule}.
 */
export function createMathLevels(runtime, api){
  /**
   * Value of `obj` expressed in units of `level`, rolling higher levels down at 3x.
   * @param {LevelObject} obj
   * @param {number} level
   * @returns {number}
   */
  function equivalentAtLevel(obj,level){
    let total=0;
    Object.keys(obj||{}).forEach(k=>{
      const sourceLevel=Number(k);
      const qty=Number(obj[k]||0);
      if(sourceLevel>=level) total += qty*Math.pow(3,sourceLevel-level);
    });
    return total;
  }

  /**
   * Whole count for a value, rounding up only at >= .95 (the spreadsheet rule).
   * @param {number} value
   * @returns {number}
   */
  function excelWholeCount(value){
    const n=Number(value || 0);
    if(!isFinite(n) || n<=0) return 0;
    const whole=Math.floor(n);
    const decimal=n-whole;
    const rounded=decimal>=0.95 ? Math.ceil(n) : whole;
    return rounded>0 ? rounded : 0;
  }

  /**
   * Roll 3-of-a-level up into one of the next level, carrying to MAX_ITEM_LEVEL.
   * @param {LevelObject} source
   * @returns {LevelObject}
   */
  function simplifyUpByLevel(source){
    /** @type {LevelObject} */
    const result={};
    let carry=0;

    for(let level=1;level<=MAX_ITEM_LEVEL;level++){
      const total=Number(source[level]||0)+carry;

      if(level===MAX_ITEM_LEVEL){
        if(total>0) result[level]=Math.round(total*1000000)/1000000;
        carry=0;
      }else{
        const upgrades=Math.floor(total/3);
        const remainder=total-upgrades*3;
        if(remainder>0) result[level]=Math.round(remainder*1000000)/1000000;
        carry=upgrades;
      }
    }

    return result;
  }

  /**
   * "Left" / "Right" / "Both" / "-" summary of which sides carry any quantity.
   * @param {LevelObject} leftObj
   * @param {LevelObject} rightObj
   * @returns {string}
   */
  function makeSideSummaryText(leftObj,rightObj){
    const leftTotal=Object.values(leftObj||{}).reduce((a,b)=>a+Number(b||0),0);
    const rightTotal=Object.values(rightObj||{}).reduce((a,b)=>a+Number(b||0),0);
    if(leftTotal<=0 && rightTotal<=0) return "-";
    if(leftTotal>0 && rightTotal>0) return "Both";
    return leftTotal>0 ? "Left" : "Right";
  }

  /**
   * Whole expected drops from `qty` random chests at probability `p`.
   * @param {number} qty
   * @param {number} p
   * @returns {number}
   */
  function wholeExpectedFromRandom(qty, p){
    return Math.floor(Number(qty || 0) * p);
  }

  /**
   * Integer-only roll-up: floor each level, carry 3-of-a-level upward.
   * @param {LevelObject} source
   * @returns {LevelObject}
   */
  function simplifyWholeByLevel(source){
    /** @type {LevelObject} */
    const result={};
    let carry=0;
    for(let level=1; level<=MAX_ITEM_LEVEL; level++){
      const total=Math.floor(Number(source[level] || 0) + carry);
      if(level===MAX_ITEM_LEVEL){
        if(total>0) result[level]=(result[level]||0)+total;
        carry=0;
      }else{
        const upgrades=Math.floor(total/3);
        const remainder=total-(upgrades*3);
        if(remainder>0) result[level]=(result[level]||0)+remainder;
        carry=upgrades;
      }
    }
    return result;
  }

  /**
   * Per-level sum of any number of level objects (raw, no roll-up).
   * @param {...LevelObject} objects
   * @returns {LevelObject}
   */
  function mergeLevelObjects(){
    /** @type {LevelObject} */
    const merged={};
    Array.from(arguments).forEach(obj=>{
      Object.keys(obj || {}).forEach(k=>{
        merged[k]=(merged[k] || 0) + Number(obj[k] || 0);
      });
    });
    return merged;
  }

  /**
   * Owned + additional owned + guaranteed, merged per level.
   * @param {LevelObject} owned
   * @param {LevelObject} additionalOwned
   * @param {LevelObject} guaranteed
   * @returns {LevelObject}
   */
  function calculateOwnedPlusPlanPlusChoice(owned, additionalOwned, guaranteed){
    return api.mergeLevelObjects(owned || {}, additionalOwned || {}, guaranteed || {});
  }

  /**
   * Equivalent value at `level` from whole (floored) quantities at or above it.
   * @param {LevelObject} obj
   * @param {number} level
   * @returns {number}
   */
  function levelObjectEquivalentAtLevel(obj, level){
    let total=0;
    Object.keys(obj || {}).forEach(k=>{
      const sourceLevel=Number(k);
      const qty=Math.floor(Number(obj[k] || 0));
      if(sourceLevel>=level && qty>0){
        total += qty*Math.pow(3, sourceLevel-level);
      }
    });
    return total;
  }

  /**
   * Whole count using the >= .95 round-up rule (via {@link safeNum}).
   * @param {number} value
   * @returns {number}
   */
  function excelRoundWhole(value){
    const n=api.safeNum(value);
    if(n<=0) return 0;
    const whole=Math.floor(n);
    const decimal=n-whole;
    const rounded=decimal>=0.95 ? Math.ceil(n) : whole;
    return rounded>0 ? rounded : 0;
  }

  /**
   * Decimal-preserving roll-up: carry 3-of-a-level upward, keep fractional remainders.
   * @param {LevelObject} rawByLevel
   * @returns {LevelObject}
   */
  function simplifyBucketDecimal(rawByLevel){
    /** @type {LevelObject} */
    const result={};
    let carry=0;
    for(let level=1; level<=MAX_ITEM_LEVEL; level++){
      const total=api.safeNum(rawByLevel[level]) + carry;
      if(level===MAX_ITEM_LEVEL){
        if(total>0) result[level]=(result[level]||0)+total;
        carry=0;
      }else{
        const upgrades=Math.floor(total/3);
        const remainder=total-(upgrades*3);
        if(remainder>0) result[level]=(result[level]||0)+remainder;
        carry=upgrades;
      }
    }
    return result;
  }

  /**
   * Whole-count display row from a simplified (possibly fractional) level object.
   * @param {LevelObject} simplified
   * @returns {LevelObject}
   */
  function displayRowFromSimplified(simplified){
    /** @type {LevelObject} */
    const display={};
    Object.keys(simplified || {}).forEach(level=>{
      const whole=api.excelRoundWhole(simplified[level]);
      if(whole>0) display[level]=(display[level]||0)+whole;
    });
    return display;
  }

  /**
   * Add `source` into `target` per level (mutates and returns target).
   * @param {LevelObject} target
   * @param {LevelObject} source
   * @returns {LevelObject}
   */
  function addObjects(target, source){
    Object.keys(source || {}).forEach(level=>{
      target[level]=(target[level]||0)+api.safeNum(source[level]);
    });
    return target;
  }

  /**
   * Floored display strings for `obj` at each of `levels`; "-" for non-positive.
   * @param {LevelObject} obj
   * @param {number[]} levels
   * @returns {string[]}
   */
  function valuesFromLevelObject(obj, levels){
    return levels.map(level=>{
      const value=api.safeNum(obj[level]);
      return value>0 ? String(Math.floor(value)) : "-";
    });
  }

  /**
   * Per-level sum of two level objects using floored, positive-only quantities.
   * @param {LevelObject} a
   * @param {LevelObject} b
   * @returns {LevelObject}
   */
  function levelObjectPlus(a,b){
    /** @type {LevelObject} */
    const result={};
    Object.keys(a||{}).forEach(levelKey=>{
      const level=Number(levelKey);
      const value=Math.floor(Number(a[levelKey]||0));
      if(value>0) result[level]=(result[level]||0)+value;
    });
    Object.keys(b||{}).forEach(levelKey=>{
      const level=Number(levelKey);
      const value=Math.floor(Number(b[levelKey]||0));
      if(value>0) result[level]=(result[level]||0)+value;
    });
    return result;
  }

  /**
   * Shallow copy keeping only positive quantities.
   * @param {LevelObject} obj
   * @returns {LevelObject}
   */
  function cloneLevelObject(obj){
    /** @type {LevelObject} */
    const out={};
    Object.keys(obj||{}).forEach(k=>{
      const value=Number(obj[k]||0);
      if(value>0) out[k]=value;
    });
    return out;
  }

  /**
   * Per-level sum of any number of level objects, positive quantities only.
   * @param {...LevelObject} objects
   * @returns {LevelObject}
   */
  function addLevelObjects(){
    /** @type {LevelObject} */
    const result={};
    Array.from(arguments).forEach(obj=>{
      Object.keys(obj||{}).forEach(k=>{
        const value=Number(obj[k]||0);
        if(value>0) result[k]=(result[k]||0)+value;
      });
    });
    return result;
  }

  /**
   * Total floored quantity across all levels.
   * @param {LevelObject} obj
   * @returns {number}
   */
  function levelObjectTotalCount(obj){
    return Object.values(obj||{}).reduce((sum,value)=>sum+Math.floor(Number(value||0)),0);
  }

  /**
   * `source - subtractor` per level on floored quantities, keeping positive results.
   * @param {LevelObject} source
   * @param {LevelObject} subtractor
   * @returns {LevelObject}
   */
  function subtractLevelObjects(source, subtractor){
    /** @type {LevelObject} */
    const result={};

    Object.keys(source||{}).forEach(level=>{
      const value=Math.floor(Number(source[level]||0))-Math.floor(Number((subtractor||{})[level]||0));
      if(value>0) result[level]=value;
    });

    return result;
  }

  /**
   * Add floored, positive `source` quantities into `target` (mutates and returns it).
   * @param {LevelObject} target
   * @param {LevelObject} source
   * @returns {LevelObject}
   */
  function addObjectsRaw(target,source){
    Object.keys(source||{}).forEach(levelKey=>{
      const level=Number(levelKey);
      const value=Math.floor(Number(source[levelKey]||0));
      if(value>0) target[level]=(target[level]||0)+value;
    });
    return target;
  }

  /**
   * @typedef {Object} ResearchProjection
   * @property {boolean} isResearch true when the item's highest level is >=8 and its gear
   *   was collapsed into a single high-level item plus research points.
   * @property {number} level reachable high level (8..12); 0 when not high-level.
   * @property {number} techPoints points banked toward the next level (the remainder past
   *   `level`); echoes the input `banked` when not high-level.
   * @property {LevelObject} displayObject `{ [level]: 1 }` when research, else the input.
   */

  // High-level (L8-12) "research" economy. Past L8, gear can't be fused; each duplicate is
  // spent as tech points worth its lossless L1-equivalent value (equivalentAtLevel(obj,1)),
  // and climbing one level costs 3^L - 3^(L-1). A high-level item is always single-copy.
  const RESEARCH_MIN_LEVEL=8;

  /**
   * Tech points to climb from `level` to the next (3^L - 3^(L-1)); 0 outside the L8..L11
   * research band (L12 is maxed; low levels fuse instead of research).
   * @param {number} level
   * @returns {number}
   */
  function requiredTechPointsForLevel(level){
    const current=Number(level||0);
    if(current>=RESEARCH_MIN_LEVEL && current<MAX_ITEM_LEVEL) return Math.pow(3,current)-Math.pow(3,current-1);
    return 0;
  }

  /**
   * Highest research level (8..12) whose base value 3^(L-1) is covered by `value`; 0 when
   * `value` is below the L8 base.
   * @param {number} value lossless L1-equivalent total plus banked tech points
   * @returns {number}
   */
  function researchLevelForValue(value){
    const v=Number(value||0);
    for(let level=MAX_ITEM_LEVEL;level>=RESEARCH_MIN_LEVEL;level--){
      if(v>=Math.pow(3,level-1)) return level;
    }
    return 0;
  }

  /**
   * Collapse a high-level item's gear into research progress. Triggers on TOTAL VALUE, not the
   * raw highest level present: total value V = equivalentAtLevel(obj,1) + banked is dropped onto
   * the 3^(L-1) ladder; when V covers the L8 base (>=2187) the gear can fuse to a single,
   * single-copy high-level item, so every duplicate is consumed into the reachable level and the
   * points remaining toward the next. This is what makes the crossover work: a projection that
   * only REACHES L8 after fusion (e.g. {7:4} = 2916) switches to "L8 @ %" instead of showing the
   * raw fused stack. Below the L8 base the object is returned untouched for the caller to fuse.
   * @param {LevelObject} obj merged inventory (high-level item + duplicates + projected adds)
   * @param {number} [banked] research points already accrued (state tech points)
   * @returns {ResearchProjection}
   */
  function consumeDuplicatesIntoResearch(obj,banked){
    /** @type {LevelObject} */
    const source=obj||{};
    const value=equivalentAtLevel(source,1)+Math.max(0,Number(banked||0));
    const level=researchLevelForValue(value);
    if(level<RESEARCH_MIN_LEVEL) return {isResearch:false,level:0,techPoints:Number(banked||0),displayObject:source};
    /** @type {LevelObject} */
    const displayObject={};
    displayObject[level]=1;
    return {isResearch:true,level,techPoints:value-Math.pow(3,level-1),displayObject};
  }

  return {
    equivalentAtLevel,
    excelWholeCount,
    simplifyUpByLevel,
    makeSideSummaryText,
    wholeExpectedFromRandom,
    simplifyWholeByLevel,
    mergeLevelObjects,
    calculateOwnedPlusPlanPlusChoice,
    levelObjectEquivalentAtLevel,
    excelRoundWhole,
    simplifyBucketDecimal,
    displayRowFromSimplified,
    addObjects,
    valuesFromLevelObject,
    levelObjectPlus,
    cloneLevelObject,
    addLevelObjects,
    levelObjectTotalCount,
    subtractLevelObjects,
    addObjectsRaw,
    requiredTechPointsForLevel,
    researchLevelForValue,
    consumeDuplicatesIntoResearch
  };
}
