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
