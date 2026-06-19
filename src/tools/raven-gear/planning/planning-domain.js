// Pure planning domain helpers.
// This file starts the planning boundary without changing current calculator behavior.

import {
  simplifyUpByLevelDomain
} from "../inventory/inventory-domain.js";

function targetItemsFromRandomPlanDomain(plan,probability,chestLevels=[7,6,5,4,3,2,1]){
  const raw={};
  chestLevels.forEach(level=>{
    raw[level]=Math.floor(Number((plan||{})[level]||0)*Number(probability||0));
  });
  return simplifyUpByLevelDomain(raw);
}

function targetItemsFromPlanAndChoiceDomain(plan,choice,probability,chestLevels=[7,6,5,4,3,2,1]){
  const raw={};
  chestLevels.forEach(level=>{
    raw[level]=Math.floor(Number((plan||{})[level]||0)*Number(probability||0))+Number((choice||{})[level]||0);
  });
  return simplifyUpByLevelDomain(raw);
}

function simplifyWholeByLevelDomain(source,maxLevel=12){
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

function addRawWholeLevelsDomain(target,source){
  Object.keys(source||{}).forEach(levelKey=>{
    const level=Number(levelKey);
    const value=Math.floor(Number(source[levelKey]||0));
    if(value>0) target[level]=(target[level]||0)+value;
  });
  return target;
}

function subtractWholeLevelsDomain(source,subtractor){
  const result={};
  Object.keys(source||{}).forEach(level=>{
    const value=Math.floor(Number(source[level]||0))-Math.floor(Number((subtractor||{})[level]||0));
    if(value>0) result[level]=value;
  });
  return result;
}

function calculateAdditionalOwnedFromPlanDomain(plan,probability){
  const rawWhole={};
  Object.keys(plan||{}).forEach(levelKey=>{
    const level=Number(levelKey);
    const qty=Number(plan[levelKey]||0);
    if(qty>0){
      const whole=Math.floor(qty*probability);
      if(whole>0) rawWhole[level]=(rawWhole[level]||0)+whole;
    }
  });
  return simplifyWholeByLevelDomain(rawWhole);
}

function calculateAdditionalOwnedFromPlanExcludingLevelDomain(plan,probability,excludedLevel){
  const rawWhole={};
  Object.keys(plan||{}).forEach(levelKey=>{
    const level=Number(levelKey);
    if(level===Number(excludedLevel)) return;
    const qty=Number(plan[levelKey]||0);
    if(qty>0){
      const whole=Math.floor(qty*probability);
      if(whole>0) rawWhole[level]=(rawWhole[level]||0)+whole;
    }
  });
  return simplifyWholeByLevelDomain(rawWhole);
}

function deterministicSideTotalsFromRandomPlanDomain(plan,chestLevels=[7,6,5,4,3,2,1]){
  const left={};
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

function targetItemsRawFromRandomPlanDomain(plan,probability,chestLevels=[7,6,5,4,3,2,1]){
  const target={};

  chestLevels.forEach(level=>{
    const qty=Math.floor(Number((plan||{})[level]||0));
    if(qty<=0) return;

    const targetQty=Math.floor(qty*probability);
    if(targetQty>0) target[level]=(target[level]||0)+targetQty;
  });

  return target;
}

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

function calculateAdditionalOwnedFromPlanAndChoiceDomain(plan,choice,probability){
  const rawWhole={};

  Object.keys(plan||{}).forEach(levelKey=>{
    const level=Number(levelKey);
    const qty=Number(plan[levelKey]||0);
    if(qty>0){
      const whole=Math.floor(qty*probability);
      if(whole>0) rawWhole[level]=(rawWhole[level]||0)+whole;
    }
  });

  addRawWholeLevelsDomain(rawWhole,choice);
  return simplifyWholeByLevelDomain(rawWhole);
}

function rawTargetAdditionsFromPlanAndChoiceDomain(plan,choice,probability){
  const rawWhole={};

  Object.keys(plan||{}).forEach(levelKey=>{
    const level=Number(levelKey);
    const qty=Math.floor(Number(plan[levelKey]||0));
    if(qty>0){
      const whole=Math.floor(qty*probability);
      if(whole>0) rawWhole[level]=(rawWhole[level]||0)+whole;
    }
  });

  return addRawWholeLevelsDomain(rawWhole,choice);
}

function calculateEffectiveOwnedForRemainingItemsDomain(owned,plan,choice,probability){
  const rawCombined={};
  addRawWholeLevelsDomain(rawCombined,owned);
  addRawWholeLevelsDomain(rawCombined,rawTargetAdditionsFromPlanAndChoiceDomain(plan,choice,probability));
  return simplifyWholeByLevelDomain(rawCombined);
}

function rawTargetAdditionsFromPlanExcludingLevelDomain(plan,probability,excludedLevel){
  const rawWhole={};
  Object.keys(plan||{}).forEach(levelKey=>{
    const level=Number(levelKey);
    if(level===Number(excludedLevel)) return;
    const qty=Math.floor(Number(plan[levelKey]||0));
    if(qty>0){
      const whole=Math.floor(qty*probability);
      if(whole>0) rawWhole[level]=(rawWhole[level]||0)+whole;
    }
  });
  return rawWhole;
}

function calculateEffectiveOwnedForRemainingChestColumnDomain(owned,plan,choice,probability,excludedLevel){
  const rawCombined={};
  addRawWholeLevelsDomain(rawCombined,owned);
  addRawWholeLevelsDomain(rawCombined,rawTargetAdditionsFromPlanExcludingLevelDomain(plan,probability,excludedLevel));
  addRawWholeLevelsDomain(rawCombined,choice);
  return simplifyWholeByLevelDomain(rawCombined);
}

function rawTargetFromRandomPlanDomain(plan,probability,chestLevels=[7,6,5,4,3,2,1]){
  return targetItemsRawFromRandomPlanDomain(plan,probability,chestLevels);
}

function rawChoiceObjectDomain(choice){
  const raw={};
  return addRawWholeLevelsDomain(raw,choice);
}

function finalBreakdownContributionDomain(outputs){
  const raw={};
  addRawWholeLevelsDomain(raw,(outputs&&outputs.rawTargetRandom)||{});
  addRawWholeLevelsDomain(raw,(outputs&&outputs.rawManualChoice)||{});
  addRawWholeLevelsDomain(raw,(outputs&&outputs.rawRedeemedChoice)||{});
  return simplifyUpByLevelDomain(raw);
}

export {
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
