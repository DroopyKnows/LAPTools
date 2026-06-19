// Calculator plan math: target items, remaining requirements, and side totals.
// Domain delegations (DomainPlanning.*) and math helpers are read from runtime at call time.

import { chestLevels } from "../metadata/item-metadata.js";

export function createPlanningMathModule(runtime){
    function targetItemsFromRandomPlan(plan,p){
      return runtime.DomainPlanning.targetItemsFromRandomPlanDomain(plan,p,chestLevels);
    }

    function targetItemsFromPlanAndChoice(plan,guaranteed,p){
      return runtime.DomainPlanning.targetItemsFromPlanAndChoiceDomain(plan,guaranteed,p,chestLevels);
    }

    function calculateAdditionalOwnedFromPlan(plan, p){
      return runtime.DomainPlanning.calculateAdditionalOwnedFromPlanDomain(plan,p);
    }

    function buildLeftoverHelperRows(plan, samePerItemProb, oppositePerItemProb){
      const sameRows=[];
      const oppositeRows=[];
      const sameFractionTotals={};
      const oppositeFractionTotals={};

      for(let i=0; i<2; i++){
        const raw={};
        chestLevels.forEach(level=>{
          const qty=runtime.safeNum(plan[level]);
          if(qty>0) raw[level]=qty*samePerItemProb;
        });
        const simplified=runtime.simplifyBucketDecimal(raw);
        const display=runtime.displayRowFromSimplified(simplified);
        const fractions=runtime.fractionalRemainderFromSimplified(simplified);
        sameRows.push(display);
        runtime.addObjects(sameFractionTotals,fractions);
      }

      const sameRemainderDisplay=runtime.displayRowFromSimplified(runtime.simplifyBucketDecimal(sameFractionTotals));
      sameRows.push(sameRemainderDisplay);

      for(let i=0; i<3; i++){
        const raw={};
        chestLevels.forEach(level=>{
          const qty=runtime.safeNum(plan[level]);
          if(qty>0) raw[level]=qty*oppositePerItemProb;
        });
        const simplified=runtime.simplifyBucketDecimal(raw);
        const display=runtime.displayRowFromSimplified(simplified);
        const fractions=runtime.fractionalRemainderFromSimplified(simplified);
        oppositeRows.push(display);
        runtime.addObjects(oppositeFractionTotals,fractions);
      }

      const oppositeRemainderDisplay=runtime.displayRowFromSimplified(runtime.simplifyBucketDecimal(oppositeFractionTotals));
      oppositeRows.push(oppositeRemainderDisplay);

      return {
        sameRows,
        oppositeRows,
        sameTotal:runtime.addDisplayRows(sameRows),
        oppositeTotal:runtime.addDisplayRows(oppositeRows),
        allTotal:runtime.addDisplayRows([...sameRows,...oppositeRows])
      };
    }

    function rawRandomSideTotals(plan, selectedSideValue){
      const left={};
      const right={};
      chestLevels.forEach(level=>{
        const qty=runtime.safeNum(plan[level]);
        if(qty<=0) return;

        if(selectedSideValue==="left"){
          // Target item is left. Left leftovers are the other 2 left items (2/9 each);
          // right leftovers are the 3 right items (1/9 each).
          left[level]=(left[level]||0)+runtime.excelRoundWhole(qty*(4/9));
          right[level]=(right[level]||0)+runtime.excelRoundWhole(qty*(3/9));
        }else{
          // Target item is right. Right leftovers are the other 2 right items (1/9 each);
          // left leftovers are the 3 left items (2/9 each).
          right[level]=(right[level]||0)+runtime.excelRoundWhole(qty*(2/9));
          left[level]=(left[level]||0)+runtime.excelRoundWhole(qty*(6/9));
        }
      });
      return {left,right};
    }

    function calculateAdditionalOwnedFromPlanExcludingLevel(plan, p, excludedLevel){
      return runtime.DomainPlanning.calculateAdditionalOwnedFromPlanExcludingLevelDomain(plan,p,excludedLevel);
    }

    function deterministicSideTotalsFromRandomPlan(plan){
      return runtime.DomainPlanning.deterministicSideTotalsFromRandomPlanDomain(plan,chestLevels);
    }

    function targetItemsRawFromRandomPlan(plan,p){
      return runtime.DomainPlanning.targetItemsRawFromRandomPlanDomain(plan,p,chestLevels);
    }

    function nontargetSideTotalsFromRandomPlan(plan,side,p){
      return runtime.DomainPlanning.nontargetSideTotalsFromRandomPlanDomain(plan,side,p,chestLevels);
    }

    function calculateAdditionalOwnedFromPlanAndChoice(plan, guaranteed, p){
      return runtime.DomainPlanning.calculateAdditionalOwnedFromPlanAndChoiceDomain(plan,guaranteed,p);
    }

    function rawTargetAdditionsFromPlanAndChoice(plan, guaranteed, p){
      return runtime.DomainPlanning.rawTargetAdditionsFromPlanAndChoiceDomain(plan,guaranteed,p);
    }

    function calculateEffectiveOwnedForRemainingItems(owned, plan, guaranteed, p){
      return runtime.DomainPlanning.calculateEffectiveOwnedForRemainingItemsDomain(owned,plan,guaranteed,p);
    }

    function rawTargetAdditionsFromPlanExcludingLevel(plan, p, excludedLevel){
      return runtime.DomainPlanning.rawTargetAdditionsFromPlanExcludingLevelDomain(plan,p,excludedLevel);
    }

    function calculateEffectiveOwnedForRemainingChestColumn(owned, plan, guaranteed, p, excludedLevel){
      return runtime.DomainPlanning.calculateEffectiveOwnedForRemainingChestColumnDomain(owned,plan,guaranteed,p,excludedLevel);
    }

    function rawTargetFromRandomPlan(plan,p){
      return runtime.DomainPlanning.rawTargetFromRandomPlanDomain(plan,p,chestLevels);
    }

    function rawChoiceObject(choiceObj){
      return runtime.DomainPlanning.rawChoiceObjectDomain(choiceObj);
    }

    function finalBreakdownContribution(outputs){
      return runtime.DomainPlanning.finalBreakdownContributionDomain(outputs);
    }





  return {
    targetItemsFromRandomPlan,
    targetItemsFromPlanAndChoice,
    calculateAdditionalOwnedFromPlan,
    buildLeftoverHelperRows,
    rawRandomSideTotals,
    calculateAdditionalOwnedFromPlanExcludingLevel,
    deterministicSideTotalsFromRandomPlan,
    targetItemsRawFromRandomPlan,
    nontargetSideTotalsFromRandomPlan,
    calculateAdditionalOwnedFromPlanAndChoice,
    rawTargetAdditionsFromPlanAndChoice,
    calculateEffectiveOwnedForRemainingItems,
    rawTargetAdditionsFromPlanExcludingLevel,
    calculateEffectiveOwnedForRemainingChestColumn,
    rawTargetFromRandomPlan,
    rawChoiceObject,
    finalBreakdownContribution
  };
}
