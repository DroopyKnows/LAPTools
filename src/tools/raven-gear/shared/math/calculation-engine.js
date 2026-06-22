// The Raven Gear drop-rate calculation engine: a pure function of an explicit input bundle.
//
// This is the single source of truth for the gear calculation. It used to live inside
// calculator-render.js (a DOM-render module); it was extracted here so the engine is a
// real, importable unit with no view code around it. The app's Calculator, What If, and the
// live inspector (ui/_inspect) all call this one function — nobody re-approximates the math.
// It lives in shared/math (not calculator/) precisely because it's shared across those surfaces.
//
// Shape: createCalculationEngine(runtime) → { computeFromBundle, estimatedDisplayLevels,
// ratioForSide }. Like planning-math/inventory-math, it's a thin factory that reads the pure
// math/planning/inventory helpers off `runtime` at call time and pre-fills the metadata level
// lists — so it depends only on item-metadata statically and stays DOM-free. (It is NOT in the
// certified-pure LOGIC_FILES set for the same reason those *-math factories aren't: it is
// parameterized by runtime rather than self-contained.)

import { MAX_ITEM_LEVEL, allItemLevels, chestDefaultLevels, chestLevels } from "../../metadata/item-metadata.js";
import { computeRandomPlanAuditDomain, itemsBySide } from "../../inventory/random-generation-ledger-domain.js";

export function createCalculationEngine(runtime){

  // Levels worth showing for "new estimated inventory": the chest levels plus any level that
  // actually carries a value in obj. Used to drive the expected-items display grid.
  function estimatedDisplayLevels(obj){
    const set=new Set(chestLevels);
    Object.keys(obj||{}).forEach(levelKey=>{
      const level=Number(levelKey);
      if(level>=1 && level<=MAX_ITEM_LEVEL && Number(obj[levelKey]||0)>0) set.add(level);
    });
    return Array.from(set).sort((a,b)=>b-a);
  }

  /**
   * The calculator/What-If math inputs, source-agnostic. Every calculator surface builds one
   * of these and hands it to computeFromBundle — the engine reads nothing else, so the same
   * math drives the live preview, the calculator, and What If. (The display-only strings that
   * need the raw plan-vs-topup distinction are attached afterward by computeResults.)
   * @typedef {Object} CalcBundle
   * @property {LevelObject} baseline source/owned inventory before chests
   * @property {LevelObject} random   random chests (plan ⊕ top-up bundles), per level
   * @property {LevelObject} choice   choice chests (whole target items), per level
   * @property {{num:number,den:number}} p per-chest drop rate as an exact ratio (left 2/9, right 1/9)
   * @property {number} target target gear level
   * @property {ItemSide} side target item's side ("left"/"right")
   * @property {boolean} [showHighChests] include the L6-7 chest columns
   * @property {number} [banked] banked tech points (research projection only; 0 in the app path)
   */

  /** @param {ItemSide} side @returns {{num:number,den:number}} */
  function ratioForSide(side){ return side==="left" ? {num:2,den:9} : {num:1,den:9}; }

  // The drop-rate engine: a pure function of the CalcBundle, zero DOM and zero env reads.
  // This is the single source of truth the calculator, What If, and the live inspector all
  // call; renderResultsView/renderNontargetView are two card views over its returned model.
  //
  // The returned model carries the displayed figures AND the pipeline's intermediate stage
  // values (expectedTargetItems / effectiveOwned / nontargetTotals / research / randomAudit),
  // so a visualizer like the inspector reads ONE model instead of re-running the helpers.
  // ── Pipeline stages ─────────────────────────────────────────────────────────────────────
  // One named helper per inspector row. computeFromBundle (below) calls them in order, so its
  // body reads as the 6-stage pipeline instead of a wall of inline blocks.

  /** Stage 1 — whole expected target items from random + choice, rolled up; plus display arrays. */
  function expectedTargetItems(random,choice,p){
    const object=runtime.targetItemsFromPlanAndChoice(random,choice,p);
    const levels=estimatedDisplayLevels(object);
    const values=levels.map(level=>{ const v=object[level]||0; return v>0 ? String(v) : "-"; });
    return { object, levels, values };
  }

  /** Stage 3 / 3b — per level toward `target`: required − owned-equivalent (ceil); "-" when met.
   *  3 (vs the pool) and 3b (vs raw baseline) are the SAME computation over a different owned. */
  function remainingItemsNeeded(owned,target,levels){
    return levels.map(level=>{
      const raw=runtime.requiredAtLevel(target,level);
      const ownedEq=runtime.levelObjectEquivalentAtLevel(owned,level);
      const remaining=Math.max(0,raw-ownedEq);
      return remaining>0 ? String(Math.ceil(remaining)) : "-";
    });
  }

  /** Stage 4 — per column: ceil(remaining ÷ p), with that level's OWN planned chests excluded
   *  from the pool (no double-count), then minus the chests already planned there. */
  function remainingChestsNeeded(baseline,random,choice,p,target,levels){
    return levels.map(level=>{
      const columnPool=runtime.calculateEffectiveOwnedForRemainingChestColumn(baseline,random,choice,p,level);
      const raw=runtime.requiredAtLevel(target,level);
      const ownedEq=runtime.levelObjectEquivalentAtLevel(columnPool,level);
      const remainingItems=Math.max(0,raw-ownedEq);
      // chests needed = ceil(items / p), exact via the ratio (ceil(items·den/num)).
      const baseChestNeed=remainingItems>0 ? Math.ceil(remainingItems*Number(p.den)/Number(p.num)) : 0;
      const chestNeed=Math.max(0,baseChestNeed-Number(random[level]||0));
      return chestNeed ? String(chestNeed) : "-";
    });
  }

  /** Stage 5 — display arrays for the non-target side pools (per-side floors + an "L:/R:" composite). */
  function nonTargetBySideDisplay(nontargetTotals){
    const leftSideValues=runtime.valuesFromLevelObject(nontargetTotals.left,chestLevels);
    const rightSideValues=runtime.valuesFromLevelObject(nontargetTotals.right,chestLevels);
    const randomSideDisplayValues=chestLevels.map(level=>{
      const leftVal=runtime.safeNum(nontargetTotals.left[level]);
      const rightVal=runtime.safeNum(nontargetTotals.right[level]);
      if(leftVal<=0 && rightVal<=0) return "-";
      const parts=[];
      if(leftVal>0) parts.push("L: "+Math.floor(leftVal));
      if(rightVal>0) parts.push("R: "+Math.floor(rightVal));
      return parts.join(" / ");
    });
    return { leftSideValues, rightSideValues, randomSideDisplayValues };
  }

  /** @param {CalcBundle} bundle */
  function computeFromBundle(bundle){
    const baseline=bundle.baseline||{};
    const random=bundle.random||{};
    const choice=bundle.choice||{};
    const p=bundle.p;                          // {num,den}; threaded into the domain unchanged
    const target=bundle.target;
    const side=bundle.side;

    const itemResultLevels=allItemLevels.filter(level=>level<=target);
    const chestResultLevels=bundle.showHighChests ? chestLevels : chestDefaultLevels;

    // ── Stage 1 · Random generation ledger (the foundation) ──────────────────────────────
    // Every random chest makes exactly one item, split into side pools; the ledger is the
    // conserved accounting of that generation — target carved out, leftovers allocated, audited.
    // Stage 5 derives from it. (random-generation-ledger-domain.js, runtime injected as the math bag.)
    const roster=itemsBySide(side)||[];
    const ledger=roster.length ? computeRandomPlanAuditDomain(random,side,roster[0],runtime) : null;

    // ── Stage 1 · Expected target items (the hinge) ──────────────────────────────────────
    // Feeds BOTH the pool (Stage 2) and — as the carve-out already done inside the ledger —
    // the non-target leftovers (Stage 5).
    const expected=expectedTargetItems(random,choice,p);

    // ── Stage 2 · Pool = baseline + expected (rolled up) ─────────────────────────────────
    const pool=runtime.calculateEffectiveOwnedForRemainingItems(baseline,random,choice,p);

    // ── Stage 3 · Remaining items needed (vs pool) · 3b vs raw baseline ──────────────────
    const itemValues=remainingItemsNeeded(pool,target,itemResultLevels);
    const itemBaselineValues=remainingItemsNeeded(baseline,target,itemResultLevels);

    // ── Stage 4 · Remaining chests needed (per-column exclusion) ─────────────────────────
    const chestValues=remainingChestsNeeded(baseline,random,choice,p,target,chestResultLevels);

    // ── Stage 5 · Non-target items by side (derived from the ledger) ─────────────────────
    // The ledger already split generation and carved out the target, so non-target IS its
    // nontargetPools — proven byte-identical to nontargetSideTotalsFromRandomPlan. The fallback
    // only fires when there's no roster (no ledger), matching the prior behavior exactly.
    const nontargetTotals=ledger ? ledger.nontargetPools : runtime.nontargetSideTotalsFromRandomPlan(random,side,p);
    const nonTarget=nonTargetBySideDisplay(nontargetTotals);

    // ── Stage 6 · High-level research collapse of the pool ───────────────────────────────
    // Display-only + additive: the app leaves bundle.banked unset (0) and renders research
    // per-item elsewhere; the inspector drives it from the Banked input.
    const banked=Number(bundle.banked)||0;
    const research=runtime.consumeDuplicatesIntoResearch(pool,banked);

    const chanceText=(Number(p.num)/Number(p.den)*100).toFixed(3)+"%";

    // One model: the displayed figures + the pipeline intermediates, so a visualizer reads ONE
    // object instead of re-running the helpers.
    return {
      target, side,
      itemResultLevels, itemValues, itemBaselineValues,
      chestResultLevels, chestValues,
      estimatedLevels:expected.levels, expectedValues:expected.values,
      leftSideValues:nonTarget.leftSideValues, rightSideValues:nonTarget.rightSideValues, randomSideDisplayValues:nonTarget.randomSideDisplayValues,
      chanceText, chanceSide:side,
      // intermediates (the pipeline, surfaced)
      expectedTargetItems:expected.object,
      effectiveOwned:pool,
      nontargetTotals,
      research,
      randomAudit:ledger
    };
  }

  return { computeFromBundle, estimatedDisplayLevels, ratioForSide };
}
