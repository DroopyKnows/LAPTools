// Pure-logic test suite — the DOM-free counterpart to logic-tests.js.
//
// Unlike logic-tests.js (which boots the whole hub in an iframe and reaches the
// logic through window globals), this suite imports the math + domain modules
// DIRECTLY and exercises them with plain inputs. No hub, no iframe, no DOM, no
// localStorage. It loads in milliseconds and its import closure stays entirely
// within src/tools/raven-gear/ — so it runs the logic exactly as a future React
// app would consume it. Open tests/pure-test-runner.html to run.
//
// The math layer is a factory (createMathModule(runtime)); the functions only
// read runtime.{state,mode,manualSide}, so a plain-object stub is enough. The
// domain layers are pure standalone exports — call them directly.

import { createMathModule } from "../src/tools/raven-gear/shared/math/index.js";
import {
  floorExpectedItems,
  targetItemsFromRandomPlanDomain,
  targetItemsFromPlanAndChoiceDomain,
  calculateAdditionalOwnedFromPlanDomain,
  calculateAdditionalOwnedFromPlanAndChoiceDomain,
  deterministicSideTotalsFromRandomPlanDomain,
  nontargetSideTotalsFromRandomPlanDomain,
  calculateEffectiveOwnedForRemainingItemsDomain
} from "../src/tools/raven-gear/planning/planning-domain.js";
import {
  simplifyUpByLevelDomain,
  addLevelObjectsDomain,
  subtractLevelObjectsDomain,
  levelObjectTotalCountDomain,
  levelObjectEquivalentAtLevelDomain,
  normalizeLevelObjectDomain,
  compactLevelObjectDomain,
  createEmptyInventoryDomain
} from "../src/tools/raven-gear/inventory/inventory-domain.js";
import { createPlanningMathModule } from "../src/tools/raven-gear/planning/planning-math.js";
import * as DomainPlanning from "../src/tools/raven-gear/planning/planning-domain.js";
import { computeRandomPlanAuditDomain, itemsBySide } from "../src/tools/raven-gear/inventory/random-generation-ledger-domain.js";
import {
  createEmptyScannerStateDomain,
  resetScannerStateInAppStateDomain,
  scannerNormalizeItemNameDomain,
  scannerInventoryFromFinalItemsDomain,
  scannerInventoryFromGlobalRowsDomain,
  scannerInventoryFromResultDomain,
  scannerDetectedCountDomain,
  scannerResultIssueReasonDomain,
  scannerAdaptWorkerResponseDomain,
  scannerIsDevExplanationDomain,
  scannerFirstCleanTextDomain,
  scannerHasReviewIssueDomain,
  scannerReviewReasonDomain
} from "../src/tools/raven-gear/scanner/scanner-domain.js";

// --- assert helpers (key-order-insensitive, mirrors logic-tests.js) ---
function stable(value){
  if(value && typeof value === "object" && !Array.isArray(value)){
    const out = {};
    Object.keys(value).sort((a,b)=>Number(a)-Number(b) || a.localeCompare(b)).forEach(k=>{ out[k]=stable(value[k]); });
    return out;
  }
  if(Array.isArray(value)) return value.map(stable);
  return value;
}
function stringify(value){ return JSON.stringify(stable(value)); }
function assert(condition, message){ if(!condition) throw new Error(message || "Assertion failed"); }
function eq(actual, expected, message){
  const a=stringify(actual), e=stringify(expected);
  if(a!==e) throw new Error(`${message || "Values did not match"}\n  expected: ${e}\n  actual:   ${a}`);
}

// Stub runtime for the math factory. Override per-test as needed.
function makeMath(over){
  const runtime = Object.assign({ state:{}, mode:"specific", manualSide:"left" }, over || {});
  return createMathModule(runtime);
}

// A fully-composed runtime (math + planning) — the math bag the random-plan audit is injected
// with, exactly as the app/inspector compose it.
function makeAuditRuntime(side){
  const runtime = { state:{}, mode:"manual", manualSide:side };
  Object.assign(runtime, createMathModule(runtime));
  runtime.DomainPlanning = DomainPlanning;
  Object.assign(runtime, createPlanningMathModule(runtime));
  return runtime;
}

const tests = [
  // ---------------- math: pure numeric helpers ----------------
  { name:"math: requiredAtLevel is 3^(target-level), 0 when target<level", run(){
    const m=makeMath();
    eq(m.requiredAtLevel(7,5), 9);
    eq(m.requiredAtLevel(5,5), 1);
    eq(m.requiredAtLevel(4,5), 0);
  }},
  { name:"math: getQty / safeNum / shouldShowSide / levelsWithValues", run(){
    const m=makeMath();
    eq(m.getQty({5:3},5), 3);
    eq(m.getQty(null,5), 0);
    eq(m.safeNum("3.5"), 3.5);
    eq(m.safeNum(Infinity), 0);
    eq(m.shouldShowSide("left","all"), true);
    eq(m.shouldShowSide("left","right"), false);
    eq(m.shouldShowSide("right","right"), true);
    eq(m.levelsWithValues({1:2,2:0,3:5},[1,2,3]), [1,3]);
    eq(m.levelObjectHasValues({1:0}), false);
    eq(m.levelObjectHasValues({1:2}), true);
  }},
  { name:"math: roundNice / displayWhole display rules", run(){
    const m=makeMath();
    eq(m.roundNice(9), "9");
    eq(m.roundNice(0), "-");
    eq(m.roundNice(-1), "-");
    eq(m.roundNice(2.5), "2.5");
    eq(m.displayWhole(3.9), "3");
    eq(m.displayWhole(0), "-");
  }},

  // ---------------- math: level-object math (3->1 upgrade chain) ----------------
  { name:"math: simplifyUpByLevel rolls 3-of-a-level up one level", run(){
    const m=makeMath();
    eq(m.simplifyUpByLevel({1:9}), {3:1});       // 9 L1 -> 3 L2 -> 1 L3
    eq(m.simplifyUpByLevel({1:10}), {1:1,3:1});  // 10 L1 -> 1 L1 + 1 L3
    eq(m.simplifyUpByLevel({1:3,2:2}), {3:1});   // carries across an occupied level
    eq(m.simplifyUpByLevel({1:2}), {1:2});       // below 3: no upgrade
  }},
  { name:"math: simplifyWholeByLevel floors then upgrades", run(){
    const m=makeMath();
    eq(m.simplifyWholeByLevel({5:9}), {7:1});    // 9 L5 -> 1 L7
    eq(m.simplifyWholeByLevel({1:10}), {1:1,3:1});
  }},
  { name:"math: addLevelObjects / subtractLevelObjects keep only >0", run(){
    const m=makeMath();
    eq(m.addLevelObjects({1:2},{1:3,2:1}), {1:5,2:1});
    eq(m.addLevelObjects({1:2},{1:-5}), {1:2});  // non-positive contributions ignored
    eq(m.subtractLevelObjects({2:5,3:2},{2:1}), {2:4,3:2});
    eq(m.subtractLevelObjects({2:1},{2:5}), {}); // underflow dropped
  }},
  { name:"math: equivalence / totals / plus / clone", run(){
    const m=makeMath();
    eq(m.levelObjectEquivalentAtLevel({3:1},1), 9);    // 1 L3 == 9 L1
    eq(m.levelObjectEquivalentAtLevel({2:1,5:1},3), 9); // L2 below 3 ignored, L5 -> 9
    eq(m.levelObjectTotalCount({1:2,3:1}), 3);
    eq(m.levelObjectPlus({1:2.7},{1:1}), {1:3});       // floors each side
    eq(m.cloneLevelObject({1:2,2:0,3:-1}), {1:2});     // drops 0 / negative
    eq(m.mergeLevelObjects({1:1},{1:2},{2:1}), {1:3,2:1});
  }},

  // ---------------- math: high-level (L8-12) research ----------------
  { name:"math: requiredTechPointsForLevel research cost = 3^L - 3^(L-1) (0 outside L8..L11)", run(){
    const m=makeMath();
    eq(m.requiredTechPointsForLevel(8), 4374);
    eq(m.requiredTechPointsForLevel(9), 13122);
    eq(m.requiredTechPointsForLevel(10), 39366);
    eq(m.requiredTechPointsForLevel(11), 118098);
    eq(m.requiredTechPointsForLevel(12), 0); // maxed, no further cost
    eq(m.requiredTechPointsForLevel(7), 0);  // low levels fuse, not research
  }},
  { name:"math: researchLevelForValue drops value onto the 3^(L-1) ladder; equivalentAtLevel is lossless", run(){
    const m=makeMath();
    eq(m.researchLevelForValue(2186), 0);    // below L8 base -> not high-level
    eq(m.researchLevelForValue(2187), 8);    // exactly L8 base
    eq(m.researchLevelForValue(6560), 8);    // just shy of L9
    eq(m.researchLevelForValue(6561), 9);    // exactly L9 base
    eq(m.researchLevelForValue(177147), 12); // L12 base
    eq(m.researchLevelForValue(999999), 12); // beyond cap stays L12
    // lossless L1-equivalent value (the research currency)
    eq(m.equivalentAtLevel({8:1},1), 2187);
    eq(m.equivalentAtLevel({7:2,6:2},1), 1944);                 // 2*729 + 2*243
    eq(m.equivalentAtLevel({1:2,2:2,3:2,4:2,5:2,6:2},1), 728);  // the 2/3-across scrap pile
  }},
  { name:"math: consumeDuplicatesIntoResearch collapses high-level gear into research", run(){
    const m=makeMath();
    // screenshot case: L8 carrying 2313 banked -> L8 @ 2313/4374 (52%)
    eq(m.consumeDuplicatesIntoResearch({8:1}, 2313), {isResearch:true,level:8,techPoints:2313,displayObject:{8:1}});
    // crossover sweep: L8 + 728 of otherwise-stranded scrap -> L8 @ 728/4374 (16%)
    eq(m.consumeDuplicatesIntoResearch({8:1,1:2,2:2,3:2,4:2,5:2,6:2}, 0), {isResearch:true,level:8,techPoints:728,displayObject:{8:1}});
    // banked alone can advance the level (4374 lifts L8 -> L9 exactly)
    eq(m.consumeDuplicatesIntoResearch({8:1}, 4374), {isResearch:true,level:9,techPoints:0,displayObject:{9:1}});
    // duplicates advance multiple levels (24 spare L7 lift L8 -> L10 exactly)
    eq(m.consumeDuplicatesIntoResearch({8:1,7:24}, 0), {isResearch:true,level:10,techPoints:0,displayObject:{10:1}});
    // L12 is the cap; overflow is carried as leftover points (display shows 100%)
    eq(m.consumeDuplicatesIntoResearch({12:1}, 100000), {isResearch:true,level:12,techPoints:100000,displayObject:{12:1}});
    // crossover: gear that only REACHES L8 after fusion (no key >=8 present) still researches.
    // {7:4} = 2916 -> L8 @ (2916-2187)/4374 = 729/4374 (16%); trigger is total value, not raw key.
    eq(m.consumeDuplicatesIntoResearch({7:4}, 0), {isResearch:true,level:8,techPoints:729,displayObject:{8:1}});
    // low-level item below the L8 base is untouched (caller fuses); banked echoes through.
    // {7:2} = 1458 < 2187, so even value-based triggering correctly leaves it alone.
    eq(m.consumeDuplicatesIntoResearch({7:2}, 50), {isResearch:false,level:0,techPoints:50,displayObject:{7:2}});
  }},
  { name:"math: excel rounding (>=0.95 rounds up) and side summary", run(){
    const m=makeMath();
    eq(m.excelWholeCount(0.95), 1);
    eq(m.excelWholeCount(0.94), 0);
    eq(m.excelWholeCount(2.96), 3);
    eq(m.excelRoundWhole(-1), 0);
    eq(m.makeSideSummaryText({1:1},{1:1}), "Both");
    eq(m.makeSideSummaryText({1:1},{}), "Left");
    eq(m.makeSideSummaryText({},{1:1}), "Right");
    eq(m.makeSideSummaryText({},{}), "-");
    eq(m.wholeExpectedFromRandom(9, 2/9), 2);
  }},

  // ---------------- math: state-aware selection (stub runtime) ----------------
  { name:"math+state: selectedItemName / selectedSide / probability", run(){
    eq(makeMath({state:{targetItem:"Sharp Beak"}}).selectedItemName(), "Sharp Beak");
    eq(makeMath().selectedItemName(), "Heart of Wisdom"); // default = first item
    eq(makeMath({mode:"specific", state:{targetItem:"Heart of Wisdom"}}).selectedSide(), "left");
    eq(makeMath({mode:"specific", state:{targetItem:"Attackers Claw"}}).selectedSide(), "right");
    eq(makeMath({mode:"manual", manualSide:"right"}).probability(), 1/9);
    eq(makeMath({mode:"manual", manualSide:"left"}).probability(), 2/9);
  }},
  { name:"math+state: visibleOwnedLevels follows the owned filter", run(){
    eq(makeMath({state:{ownedItemsFilter:"low"}}).visibleOwnedLevels(), [7,6,5,4,3,2,1]);
    eq(makeMath({state:{ownedItemsFilter:"all"}}).visibleOwnedLevels().length, 12);
    eq(makeMath({state:{ownedItemsFilter:"high"}}).visibleOwnedLevels().length, 12);
    eq(makeMath({state:{}}).visibleOwnedLevels(), [7,6,5,4,3,2,1]); // default low
  }},
  { name:"math+state: currentOwnedObject reads manual vs specific source", run(){
    eq(makeMath({mode:"manual", state:{manualOwned:{1:5}}}).currentOwnedObject(), {1:5});
    eq(makeMath({mode:"specific", state:{targetItem:"Sharp Beak", inventory:{active:{"Sharp Beak":{2:3}}}}}).currentOwnedObject(), {2:3});
  }},

  // ---------------- planning domain (pure) ----------------
  { name:"planning: targetItemsFromRandomPlan uses whole expected items", run(){
    eq(targetItemsFromRandomPlanDomain({1:9}, 2/9), {1:2});          // floor(9*2/9)=2
    eq(targetItemsFromPlanAndChoiceDomain({1:9},{1:1}, 2/9), {2:1}); // (2 + 1 choice) L1 -> 1 L2
  }},
  { name:"planning: floorExpectedItems ratio == numeric for 2/9 and 1/9 (behavior-neutral)", run(){
    // The calculator passes p as an exact ratio {num,den}; it must agree with the legacy
    // numeric p everywhere, so the bundle refactor changes no displayed number.
    for(const [num,den] of [[2,9],[1,9]]){
      for(let q=0;q<=120;q++){
        eq(floorExpectedItems(q,{num,den}), floorExpectedItems(q,num/den));
        eq(floorExpectedItems(q,{num,den}), Math.floor(q*num/den));   // exact integer math
      }
    }
    // boundary sanity: 9 chests @ 2/9 = exactly 2; @ 1/9 = exactly 1
    eq(floorExpectedItems(9,{num:2,den:9}), 2);
    eq(floorExpectedItems(9,{num:1,den:9}), 1);
  }},
  { name:"planning: domain fns give identical results for ratio vs numeric probability", run(){
    // Thread a ratio through the same domain fns the calculator calls and confirm the output
    // matches the numeric path exactly (the refactor's correctness contract).
    const r2={num:2,den:9}, n2=2/9;
    eq(targetItemsFromRandomPlanDomain({7:18,5:9}, r2), targetItemsFromRandomPlanDomain({7:18,5:9}, n2));
    eq(targetItemsFromPlanAndChoiceDomain({7:18},{7:1}, r2), targetItemsFromPlanAndChoiceDomain({7:18},{7:1}, n2));
    eq(calculateEffectiveOwnedForRemainingItemsDomain({7:2},{7:18},{}, r2),
       calculateEffectiveOwnedForRemainingItemsDomain({7:2},{7:18},{}, n2));
    eq(nontargetSideTotalsFromRandomPlanDomain({7:18,3:9},"left", r2),
       nontargetSideTotalsFromRandomPlanDomain({7:18,3:9},"left", n2));
  }},
  { name:"planning: calculateAdditionalOwnedFromPlan(+Choice)", run(){
    eq(calculateAdditionalOwnedFromPlanDomain({5:9}, 1), {7:1});                 // 9 L5 -> 1 L7
    eq(calculateAdditionalOwnedFromPlanAndChoiceDomain({5:9},{7:1}, 1), {7:2});  // + 1 guaranteed L7
  }},
  { name:"planning: deterministic + non-target side totals", run(){
    eq(deterministicSideTotalsFromRandomPlanDomain({7:9}), {left:{7:6},right:{7:3}});   // round(9*2/3)=6
    eq(deterministicSideTotalsFromRandomPlanDomain({7:10}), {left:{7:7},right:{7:3}});  // round(10*2/3)=7
    eq(nontargetSideTotalsFromRandomPlanDomain({7:9},"left", 2/9), {left:{7:4},right:{7:3}}); // left minus 2 target
  }},

  // ---------------- inventory domain (pure) ----------------
  { name:"inventory-domain: simplify / add / subtract / totals / equivalence", run(){
    eq(simplifyUpByLevelDomain({1:9}), {3:1});
    eq(simplifyUpByLevelDomain({1:8,2:1}), {1:2,3:1});
    eq(simplifyUpByLevelDomain({11:3,12:2}), {12:3});
    eq(addLevelObjectsDomain({1:2},{1:3,2:1}), {1:5,2:1});
    eq(addLevelObjectsDomain({1:2},{1:-2}), {});            // domain add allows signed cancel
    eq(subtractLevelObjectsDomain({2:5},{2:2}), {2:3});
    eq(subtractLevelObjectsDomain({2:2},{2:5}), {});
    eq(levelObjectTotalCountDomain({1:2,3:1}), 3);
    eq(levelObjectEquivalentAtLevelDomain({3:1},1), 9);
  }},
  { name:"inventory-domain: normalize / compact / createEmpty", run(){
    eq(normalizeLevelObjectDomain({1:2,99:5,4:"7",3:-1,5:0}), {1:2,4:7}); // bad level / non-positive dropped, string coerced
    eq(compactLevelObjectDomain({1:2,2:0,3:"5"}), {1:2,3:5});
    eq(createEmptyInventoryDomain(["A","B"]), {A:{},B:{}});
  }},

  // ---------------- scanner domain (pure) ----------------
  { name:"scanner-domain: empty state shape + reset into app state", run(){
    const empty={ lastScan:null, status:"", statusType:"", selectedFileNames:[], reviewOpen:false, requiresReview:false, issueReason:"" };
    eq(createEmptyScannerStateDomain(), empty);
    const appState={ ui:{ bagScanner:{ status:"stale", reviewOpen:true } } };
    const result=resetScannerStateInAppStateDomain(appState);
    eq(result.ui.bagScanner, empty);                     // slice replaced with a fresh empty state
    assert(result===appState, "should reset in place and return the same object");
    eq(resetScannerStateInAppStateDomain(null), null);   // malformed: no throw
    eq(resetScannerStateInAppStateDomain({}), {});        // missing ui: returned unchanged
  }},
  { name:"scanner-domain: normalizeItemName (canonical / alias / unknown)", run(){
    eq(scannerNormalizeItemNameDomain("Sharp Beak"), "Sharp Beak");          // exact canonical
    eq(scannerNormalizeItemNameDomain("  Sharp Beak  "), "Sharp Beak");      // trimmed
    eq(scannerNormalizeItemNameDomain("Attacker's Claw"), "Attackers Claw"); // alias, case-folded
    eq(scannerNormalizeItemNameDomain("tail of wind"), "Tail of Wind");      // lowercase alias
    eq(scannerNormalizeItemNameDomain("nonsense"), null);
    eq(scannerNormalizeItemNameDomain(null), null);
  }},
  { name:"scanner-domain: inventory from final-items map", run(){
    const inv=scannerInventoryFromFinalItemsDomain({
      "Sharp Beak":{1:2,3:1},
      "tail of wind":{2:"3"},   // alias name + string qty -> normalized
      "unknown item":{1:5}      // unrecognized -> dropped
    });
    eq(inv["Sharp Beak"], {1:2,3:1});
    eq(inv["Tail of Wind"], {2:3});
    eq(inv["Heart of Wisdom"], {});    // untouched item stays empty
    assert(!("unknown item" in inv), "unrecognized item should not appear");
    eq(scannerDetectedCountDomain(inv), 6);
  }},
  { name:"scanner-domain: inventory from global rows (accumulates, drops invalid)", run(){
    const inv=scannerInventoryFromGlobalRowsDomain([
      { tiles:[
        { item:"Sharp Beak", level:1, qty:2 },
        { item:"sharp beak", level:1, qty:1 },   // alias -> accumulates onto the same item
        { item:"Tail of Wind", level:3, qty:2 },
        { item:"Sharp Beak", level:99, qty:5 },  // bad level dropped
        { item:"Sharp Beak", level:2, qty:0 },   // non-positive dropped
        { item:"nope", level:1, qty:9 }          // unknown item dropped
      ] }
    ]);
    eq(inv["Sharp Beak"], {1:3});
    eq(inv["Tail of Wind"], {3:2});
    eq(scannerInventoryFromGlobalRowsDomain("not an array")["Sharp Beak"], {}); // malformed -> empty
  }},
  { name:"scanner-domain: inventory-from-result dispatch + detected count", run(){
    eq(scannerInventoryFromResultDomain({ items:{ "Sharp Beak":{1:2} } })["Sharp Beak"], {1:2});
    eq(scannerInventoryFromResultDomain({ globalRows:[{ tiles:[{ item:"Tail of Wind", level:2, qty:4 }] }] })["Tail of Wind"], {2:4});
    eq(scannerDetectedCountDomain(scannerInventoryFromResultDomain({})), 0); // neither shape -> empty
    eq(scannerDetectedCountDomain({ "X":null, "Y":{1:2,2:3} }), 5);          // tolerates null inner
  }},
  { name:"scanner-domain: issue-reason rules", run(){
    eq(scannerResultIssueReasonDomain(null, 0), "Scan failed. No scanner response was received.");
    eq(scannerResultIssueReasonDomain({}, 0), "No Raven items were detected.");
    eq(scannerResultIssueReasonDomain({ canAutoApply:false }, 5), "Review needed before applying this scan.");
    eq(scannerResultIssueReasonDomain({ isConsistent:false }, 5), "Review needed. The screenshots could not be matched cleanly.");
    eq(scannerResultIssueReasonDomain({ canAutoApply:true, isConsistent:true }, 5), "");
  }},
  { name:"scanner-domain: adaptWorkerResponse (rich shape, realistic worker result)", run(){
    // Mirrors the live Worker's result contract (worker src merge-results.js): items is
    // the canonical detection, warnings is always populated, conflicts gate auto-apply.
    const clean=scannerAdaptWorkerResponseDomain({
      ok:true, provider:"openai", compactJson:true,
      result:{
        items:{ "Sharp Beak":{1:2,3:1}, "Tail of Wind":{2:1} },
        canAutoApply:true, isConsistent:true, quantityConflicts:[],
        ignoredTiles:[{row:9}], uncertain:[], notes:["Image 1: ok"],
        warnings:["Review detected inventory before applying."], tiles:[], globalRows:[]
      }
    });
    eq(clean.detectedCount, 4);                 // 2 + 1 + 1
    eq(clean.canAutoApply, true);
    eq(clean.isConsistent, true);
    eq(clean.issueReason, "");
    eq(clean.warnings, []);                      // clean -> [issueReason] collapses to []
    eq(clean.notes, ["Image 1: ok"]);
    eq(clean.ignoredTiles.length, 1);
    eq(clean.quantityConflicts, []);
    eq(clean.inventory["Sharp Beak"], {1:2,3:1});
    assert(clean.result && clean.result.items, "passes the raw worker result through for the UI");

    // Row-alignment conflicts (worker sets both flags false together) -> review, no auto-apply.
    const conflicted=scannerAdaptWorkerResponseDomain({
      ok:true, result:{ items:{ "Sharp Beak":{1:1} }, canAutoApply:false, isConsistent:false, quantityConflicts:[{a:1}] }
    });
    eq(conflicted.canAutoApply, false);
    eq(conflicted.isConsistent, false);
    eq(conflicted.issueReason, "Review needed before applying this scan.");
    eq(conflicted.warnings, ["Review needed before applying this scan."]);
    eq(conflicted.quantityConflicts.length, 1);

    // Nothing detected -> review.
    const empty=scannerAdaptWorkerResponseDomain({ ok:true, result:{ items:{} } });
    eq(empty.detectedCount, 0);
    eq(empty.canAutoApply, false);
    eq(empty.issueReason, "No Raven items were detected.");
  }},
  { name:"scanner-domain: adaptWorkerResponse throws on failure envelopes", run(){
    let threw=false;
    try{ scannerAdaptWorkerResponseDomain(null); }catch(e){ threw=true; }
    assert(threw, "null response should throw");
    let message="";
    try{ scannerAdaptWorkerResponseDomain({ ok:false, errorMessage:"boom" }); }catch(e){ message=String(e && e.message); }
    eq(message, "boom"); // throws with the Worker's errorMessage
  }},

  { name:"scanner-domain: dev-explanation filter (pinned to worker boilerplate) + firstCleanText", run(){
    // These exact strings are the Worker's standing warnings (worker src merge-results.js),
    // so this pins the filter to the real contract.
    eq(scannerIsDevExplanationDomain("The scanner counts physical Raven tiles. Duplicate item+level tiles in the same screenshot are allowed and are counted separately."), true);
    eq(scannerIsDevExplanationDomain("For multi-image scans, the Worker aligns local screenshot rows into continued global row numbers and removes duplicate overlap rows."), true);
    eq(scannerIsDevExplanationDomain("Review detected inventory before applying."), false); // a real, surfaceable message
    eq(scannerIsDevExplanationDomain(null), false);
    eq(scannerFirstCleanTextDomain(["", "The scanner counts physical Raven tiles...", "Real reason here"]), "Real reason here");
    eq(scannerFirstCleanTextDomain(["worker aligns rows"]), ""); // all boilerplate -> ""
    eq(scannerFirstCleanTextDomain("not an array"), "");
  }},
  { name:"scanner-domain: review-issue + review-reason decisions", run(){
    eq(scannerHasReviewIssueDomain(null), false);
    eq(scannerHasReviewIssueDomain({ detectedCount:0 }), true);
    eq(scannerHasReviewIssueDomain({ detectedCount:5, canAutoApply:false }), true);
    eq(scannerHasReviewIssueDomain({ detectedCount:5, isConsistent:false }), true);
    eq(scannerHasReviewIssueDomain({ detectedCount:5, requiresReview:true }), true); // defensive legacy flag
    eq(scannerHasReviewIssueDomain({ detectedCount:5, canAutoApply:true, isConsistent:true }), false);

    eq(scannerReviewReasonDomain(null), "Scan failed. Please try again.");
    eq(scannerReviewReasonDomain({ detectedCount:0 }), "Scan failed. No Raven items were detected.");
    // Worker-supplied message wins (when not boilerplate).
    eq(scannerReviewReasonDomain({ detectedCount:5, result:{ reviewReason:"Custom worker reason" } }), "Custom worker reason");
    // A clean warning surfaces when there is no direct reason.
    eq(scannerReviewReasonDomain({ detectedCount:5, result:{}, warnings:["Real warning"], notes:[] }), "Real warning");
    // Boilerplate warnings are skipped -> generic fallback.
    eq(scannerReviewReasonDomain({ detectedCount:5, result:{}, warnings:["worker aligns rows"], notes:[] }), "Review needed before replacing Active Inventory.");
    // isConsistent:false -> its specific copy.
    eq(scannerReviewReasonDomain({ detectedCount:5, result:{}, warnings:[], notes:[], isConsistent:false }), "Review needed. The screenshots could not be matched cleanly.");
  }},

  // ---------------- cross-layer drift guards ----------------
  // The math layer and the domain layer carry parallel implementations of the
  // same primitives. These assert they stay in agreement, so a change to one
  // that silently diverges from the other fails here.
  { name:"audit: computeRandomPlanAuditDomain conserves counts (4/8/9 right-side examples)", run(){
    const rt=makeAuditRuntime("right");
    const name=itemsBySide("right")[0];
    const audit=n=>computeRandomPlanAuditDomain({7:n},"right",name,rt).audit;
    eq(audit(4),{randomChestCount:4,generatedCount:4,targetRandomCount:0,nontargetCount:4,allocatedCount:3,leftoverCount:1,balances:true});
    eq(audit(8),{randomChestCount:8,generatedCount:8,targetRandomCount:0,nontargetCount:8,allocatedCount:5,leftoverCount:3,balances:true});
    eq(audit(9),{randomChestCount:9,generatedCount:9,targetRandomCount:1,nontargetCount:8,allocatedCount:8,leftoverCount:0,balances:true});
    // Left side (p = 2/9) stays count-conserved too.
    const rtL=makeAuditRuntime("left");
    const aL=computeRandomPlanAuditDomain({7:9},"left",itemsBySide("left")[0],rtL).audit;
    eq(aL.generatedCount,9); eq(aL.targetRandomCount,2); eq(aL.balances,true);
  }},
  { name:"drift: math vs domain agree on the shared primitives", run(){
    const m=makeMath();
    eq(m.simplifyUpByLevel({1:10}), simplifyUpByLevelDomain({1:10}));
    eq(m.simplifyUpByLevel({1:8,2:1}), simplifyUpByLevelDomain({1:8,2:1}));
    eq(m.addLevelObjects({1:2},{2:3}), addLevelObjectsDomain({1:2},{2:3}));
    eq(m.levelObjectEquivalentAtLevel({4:2},1), levelObjectEquivalentAtLevelDomain({4:2},1));
    eq(m.levelObjectTotalCount({1:2,3:1}), levelObjectTotalCountDomain({1:2,3:1}));
  }}
];

// --- runner (renders to the page if present, else console) ---
function run(){
  const rows = tests.map(t=>{
    try { t.run(); return { name:t.name, ok:true }; }
    catch(err){ return { name:t.name, ok:false, error:String(err && err.message || err) }; }
  });
  const passed = rows.filter(r=>r.ok).length;
  const failed = rows.length - passed;

  const summaryEl = (typeof document!=="undefined") && document.getElementById("summary");
  const resultsEl = (typeof document!=="undefined") && document.getElementById("results");
  if(summaryEl && resultsEl){
    summaryEl.className = failed ? "fail" : "pass";
    summaryEl.textContent = `${failed ? "FAILED" : "PASSED"} — ${passed} passed, ${failed} failed`;
    resultsEl.innerHTML = rows.map(r=>
      `<div class="row ${r.ok?"pass":"fail"}"><span class="dot"></span><span class="name">${r.name}</span>${r.ok?"":`<pre class="err">${r.error.replace(/</g,"&lt;")}</pre>`}</div>`
    ).join("");
  }
  if(typeof console!=="undefined"){
    rows.forEach(r=> r.ok ? console.log("PASS", r.name) : console.error("FAIL", r.name, "\n"+r.error));
    console.log(`pure-logic: ${passed} passed, ${failed} failed`);
  }
  return { passed, failed, rows };
}

if(typeof document!=="undefined" && document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded", run, { once:true });
} else {
  run();
}

export { tests, run };
