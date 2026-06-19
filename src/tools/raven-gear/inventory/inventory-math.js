// Inventory projection/allocation math and raw audit model helpers.
// Runtime helpers + the mutable `state` are read from runtime at call time.

import { chestLevels, getRavenItemByName, getRavenItemNamesBySide, getRavenItems, ravenItems } from "../metadata/item-metadata.js";

export function createInventoryMathModule(runtime){

    function itemMetaForName(itemName){
      return typeof getRavenItemByName==="function" ? getRavenItemByName(itemName) : null;
    }

    function ravenItemList(){
      return typeof getRavenItems==="function" ? getRavenItems() : ravenItems;
    }

    function itemsBySide(side){
      if(typeof getRavenItemNamesBySide==="function") return getRavenItemNamesBySide(side);
      return ravenItems.filter(item=>item.side===side).map(item=>item.name);
    }

    function otherItemsOnSide(side, selectedName){
      return itemsBySide(side).filter(name=>name!==selectedName);
    }

    function buildAllocatedLeftoverObjects(plan, selectedSideValue){
      // Returns per-side arrays of item-bucket objects, using the same same/opposite split basis
      // used by the calculator's side leftover sections.
      const samePerItemProb = selectedSideValue === "left" ? 2/9 : 1/9;
      const oppositePerItemProb = selectedSideValue === "left" ? 1/9 : 2/9;

      const sameBuckets=[];
      const oppositeBuckets=[];

      for(let i=0;i<2;i++){
        const raw={};
        chestLevels.forEach(level=>{
          const qty=Number(plan[level]||0);
          if(qty>0) raw[level]=qty*samePerItemProb;
        });
        const simplified=runtime.simplifyBucketDecimal ? runtime.simplifyBucketDecimal(raw) : runtime.simplifyUpByLevel(raw);
        const display=runtime.displayRowFromSimplified ? runtime.displayRowFromSimplified(simplified) : runtime.simplifyWholeByLevel(raw);
        sameBuckets.push(display);
      }

      for(let i=0;i<3;i++){
        const raw={};
        chestLevels.forEach(level=>{
          const qty=Number(plan[level]||0);
          if(qty>0) raw[level]=qty*oppositePerItemProb;
        });
        const simplified=runtime.simplifyBucketDecimal ? runtime.simplifyBucketDecimal(raw) : runtime.simplifyUpByLevel(raw);
        const display=runtime.displayRowFromSimplified ? runtime.displayRowFromSimplified(simplified) : runtime.simplifyWholeByLevel(raw);
        oppositeBuckets.push(display);
      }

      if(selectedSideValue==="left"){
        return { leftBuckets:sameBuckets, rightBuckets:oppositeBuckets };
      }
      return { leftBuckets:oppositeBuckets, rightBuckets:sameBuckets };
    }

    function allocatePoolToItems(pool,itemNames){
      const allocatedByItem={};
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

    function getCombinedRandomChests(rawPlan){
      if(!rawPlan || !rawPlan.randomChests) return {};
      return runtime.addLevelObjects(rawPlan.randomChests.manual || {}, rawPlan.randomChests.topUp || {});
    }

    function getCombinedChoiceChests(rawPlan){
      if(!rawPlan || !rawPlan.choiceChests) return {};
      return runtime.addLevelObjects(rawPlan.choiceChests.manual || {}, rawPlan.choiceChests.redeemed || {});
    }

    function getRandomTargetDuplicatesForPlan(rawPlan){
      if(!rawPlan) return {};
      const item=itemMetaForName(rawPlan.sourceItem) || ravenItems.find(x=>x.name===rawPlan.sourceItem);
      if(!item) return {};
      const p=item.side==="left" ? 2/9 : 1/9;
      return runtime.rawTargetFromRandomPlan(getCombinedRandomChests(rawPlan),p);
    }

    function computeRawItemPlan(itemName){
      const item=itemMetaForName(itemName) || ravenItems.find(x=>x.name===itemName);
      if(!item){
        return null;
      }

      const currentInventory=runtime.cloneLevelObject(runtime.activeInventoryForItem(itemName));
      const randomManual=runtime.cloneLevelObject((runtime.state.plans && runtime.state.plans[itemName]) || {});
      const bundleTotals=runtime.bundleTotalsForItem(itemName);
      const randomTopUp=runtime.cloneLevelObject((bundleTotals && bundleTotals.random) || {});
      const randomCombined=runtime.addLevelObjects(randomManual,randomTopUp);

      const choiceManual=runtime.cloneLevelObject((runtime.state.guaranteed && runtime.state.guaranteed[itemName]) || {});
      const choiceRedeemed=runtime.cloneLevelObject((runtime.state.choiceBankRedeemed && runtime.state.choiceBankRedeemed[itemName]) || {});

      const p=item.side==="left" ? 2/9 : 1/9;

      const randomTargetTotal=runtime.rawTargetFromRandomPlan(randomCombined,p);

      const targetDuplicates={
        random:randomTargetTotal,
        choiceManual:runtime.rawChoiceObject(choiceManual),
        choiceRedeemed:runtime.rawChoiceObject(choiceRedeemed)
      };

      const randomSideGenerated=runtime.deterministicSideTotalsFromRandomPlan(randomCombined);

      const nontargetPools={
        left:item.side==="left" ? runtime.subtractLevelObjects(randomSideGenerated.left,randomTargetTotal) : runtime.cloneLevelObject(randomSideGenerated.left),
        right:item.side==="right" ? runtime.subtractLevelObjects(randomSideGenerated.right,randomTargetTotal) : runtime.cloneLevelObject(randomSideGenerated.right)
      };

      const sameSideItemNames=otherItemsOnSide(item.side,itemName);
      const oppositeSide=item.side==="left" ? "right" : "left";
      const oppositeSideItemNames=itemsBySide(oppositeSide);

      const sameAllocation=allocatePoolToItems(nontargetPools[item.side] || {},sameSideItemNames);
      const oppositeAllocation=allocatePoolToItems(nontargetPools[oppositeSide] || {},oppositeSideItemNames);

      const randomItemsLeftover={left:{},right:{}};
      randomItemsLeftover[item.side]=sameAllocation.leftover || {};
      randomItemsLeftover[oppositeSide]=oppositeAllocation.leftover || {};

      const assignedNontargetByItem={};
      Object.keys(sameAllocation.allocatedByItem||{}).forEach(name=>{
        assignedNontargetByItem[name]=runtime.addLevelObjects(assignedNontargetByItem[name]||{},sameAllocation.allocatedByItem[name]);
      });
      Object.keys(oppositeAllocation.allocatedByItem||{}).forEach(name=>{
        assignedNontargetByItem[name]=runtime.addLevelObjects(assignedNontargetByItem[name]||{},oppositeAllocation.allocatedByItem[name]);
      });

      const rawRandomChestCount=runtime.levelObjectTotalCount(randomCombined);
      const generatedCount=runtime.levelObjectTotalCount(randomSideGenerated.left)+runtime.levelObjectTotalCount(randomSideGenerated.right);
      const targetRandomCount=runtime.levelObjectTotalCount(randomTargetTotal);
      const nontargetCount=runtime.levelObjectTotalCount(nontargetPools.left)+runtime.levelObjectTotalCount(nontargetPools.right);
      const allocatedCount=Object.values(assignedNontargetByItem).reduce((sum,obj)=>sum+runtime.levelObjectTotalCount(obj),0);
      const leftoverCount=runtime.levelObjectTotalCount(randomItemsLeftover.left)+runtime.levelObjectTotalCount(randomItemsLeftover.right);

      return {
        sourceItem:itemName,
        sourceSide:item.side,
        currentInventory,
        randomChests:{
          manual:randomManual,
          topUp:randomTopUp
        },
        choiceChests:{
          manual:choiceManual,
          redeemed:choiceRedeemed
        },
        targetDuplicates,
        randomSideGenerated,
        nontargetPools,
        allocation:{
          sameSide:{
            side:item.side,
            appliesTo:sameSideItemNames,
            allocatedByItem:sameAllocation.allocatedByItem || {},
            leftover:sameAllocation.leftover || {}
          },
          oppositeSide:{
            side:oppositeSide,
            appliesTo:oppositeSideItemNames,
            allocatedByItem:oppositeAllocation.allocatedByItem || {},
            leftover:oppositeAllocation.leftover || {}
          }
        },
        assignedNontargetByItem,
        randomItemsLeftover,
        audit:{
          randomChestCount:rawRandomChestCount,
          generatedCount,
          targetRandomCount,
          nontargetCount,
          allocatedCount,
          leftoverCount,
          balances:rawRandomChestCount===generatedCount && generatedCount===(targetRandomCount+nontargetCount) && nontargetCount===(allocatedCount+leftoverCount)
        }
      };
    }

    function computeAllRawItemPlans(){
      return ravenItemList().map(item=>computeRawItemPlan(item.name)).filter(Boolean);
    }

    function targetDuplicatesForPlanRaw(rawPlan){
      if(!rawPlan || !rawPlan.targetDuplicates) return {};
      return runtime.addLevelObjects(
        rawPlan.targetDuplicates.random || getRandomTargetDuplicatesForPlan(rawPlan),
        rawPlan.targetDuplicates.choiceManual || {},
        rawPlan.targetDuplicates.choiceRedeemed || {}
      );
    }

    function calculatedItemPlanInventoryRawFromPlan(rawPlan){
      if(!rawPlan) return {};
      return runtime.addLevelObjects(rawPlan.currentInventory || {}, targetDuplicatesForPlanRaw(rawPlan));
    }

    function duplicatesFromOtherRawPlans(itemName,excludeSourceName){
      const total={};
      computeAllRawItemPlans().forEach(plan=>{
        if(!plan || plan.sourceItem===excludeSourceName) return;
        const assigned=(plan.assignedNontargetByItem && plan.assignedNontargetByItem[itemName]) || {};
        runtime.addObjects(total,assigned);
      });
      return total;
    }

    function duplicateContributionDetailsForItem(itemName,excludeSourceName){
      const details=[];
      computeAllRawItemPlans().forEach(plan=>{
        if(!plan || plan.sourceItem===excludeSourceName) return;
        const assigned=(plan.assignedNontargetByItem && plan.assignedNontargetByItem[itemName]) || {};
        if(runtime.levelObjectHasValues(assigned)){
          details.push({sourceItem:plan.sourceItem, values:assigned});
        }
      });
      return details;
    }

    function computePlanOutputsForItem(itemName){
      const rawPlan=computeRawItemPlan(itemName);
      if(!rawPlan) return {
        additionalOwned:{},
        rawTargetRandom:{},
        rawManualChoice:{},
        rawRedeemedChoice:{},
        rawChoice:{},
        rawAssignedLeft:{},
        rawAssignedRight:{},
        leftBuckets:[],
        rightBuckets:[],
        randomLeft:{},
        randomRight:{},
        manualRandom:{},
        topUpRandom:{},
        combinedRandom:{},
        rawPlan:null
      };

      const rawTargetRandom=rawPlan.targetDuplicates.random || getRandomTargetDuplicatesForPlan(rawPlan);
      const rawManualChoice=rawPlan.targetDuplicates.choiceManual || {};
      const rawRedeemedChoice=rawPlan.targetDuplicates.choiceRedeemed || {};
      const rawChoice=runtime.addLevelObjects(rawManualChoice,rawRedeemedChoice);
      const additionalOwned=runtime.simplifyUpByLevel(targetDuplicatesForPlanRaw(rawPlan));

      const rawAssignedLeft={};
      const rawAssignedRight={};
      Object.keys(rawPlan.assignedNontargetByItem || {}).forEach(itemNameKey=>{
        const item=itemMetaForName(itemNameKey) || ravenItems.find(x=>x.name===itemNameKey);
        if(!item) return;
        if(item.side==="left") runtime.addObjectsRaw(rawAssignedLeft,rawPlan.assignedNontargetByItem[itemNameKey]);
        if(item.side==="right") runtime.addObjectsRaw(rawAssignedRight,rawPlan.assignedNontargetByItem[itemNameKey]);
      });

      return {
        additionalOwned,
        rawTargetRandom,
        rawManualChoice,
        rawRedeemedChoice,
        rawChoice,
        rawAssignedLeft,
        rawAssignedRight,
        leftBuckets:Object.keys(rawPlan.allocation.sameSide.side==="left" ? rawPlan.allocation.sameSide.allocatedByItem : rawPlan.allocation.oppositeSide.allocatedByItem).map(name=>(rawPlan.allocation.sameSide.side==="left" ? rawPlan.allocation.sameSide.allocatedByItem[name] : rawPlan.allocation.oppositeSide.allocatedByItem[name])),
        rightBuckets:Object.keys(rawPlan.allocation.sameSide.side==="right" ? rawPlan.allocation.sameSide.allocatedByItem : rawPlan.allocation.oppositeSide.allocatedByItem).map(name=>(rawPlan.allocation.sameSide.side==="right" ? rawPlan.allocation.sameSide.allocatedByItem[name] : rawPlan.allocation.oppositeSide.allocatedByItem[name])),
        randomLeft:rawPlan.nontargetPools.left || {},
        randomRight:rawPlan.nontargetPools.right || {},
        manualRandom:rawPlan.randomChests.manual || {},
        topUpRandom:rawPlan.randomChests.topUp || {},
        combinedRandom:getCombinedRandomChests(rawPlan),
        rawPlan
      };
    }

    function projectedAdditionsForInventoryItem(inventoryItemName){
      const total={};

      computeAllRawItemPlans().forEach(plan=>{
        if(!plan) return;
        if(plan.sourceItem===inventoryItemName){
          runtime.addObjects(total,targetDuplicatesForPlanRaw(plan));
        }
        runtime.addObjects(total,(plan.assignedNontargetByItem && plan.assignedNontargetByItem[inventoryItemName]) || {});
      });

      return total;
    }

    function projectedOwnedForInventoryItem(itemName){
      return runtime.addLevelObjects(runtime.activeInventoryForItem(itemName), projectedAdditionsForInventoryItem(itemName));
    }

    function totalRandomLeftoversBySide(side){
      const total={};
      computeAllRawItemPlans().forEach(plan=>{
        runtime.addObjects(total,(plan.randomItemsLeftover && plan.randomItemsLeftover[side]) || {});
      });
      return total;
    }

    function rawAcquiredForInventoryItem(inventoryItemName){
      const total={};
      const targetItem=itemMetaForName(inventoryItemName) || ravenItems.find(x=>x.name===inventoryItemName);
      if(!targetItem) return total;

      ravenItemList().forEach(sourceItem=>{
        const sourceName=sourceItem.name;
        const outputs=computePlanOutputsForItem(sourceName);

        if(sourceName===inventoryItemName){
          runtime.addObjectsRaw(total,outputs.rawTargetRandom || {});
          runtime.addObjectsRaw(total,outputs.rawManualChoice || {});
          runtime.addObjectsRaw(total,outputs.rawRedeemedChoice || {});
        }

        if(targetItem.side==="left" && Array.isArray(outputs.leftBuckets)){
          outputs.leftBuckets.forEach(bucket=>runtime.addObjectsRaw(total,bucket));
        }
        if(targetItem.side==="right" && Array.isArray(outputs.rightBuckets)){
          outputs.rightBuckets.forEach(bucket=>runtime.addObjectsRaw(total,bucket));
        }
      });

      return total;
    }

    function combinedInventoryForItem(itemName){
      return runtime.addLevelObjects(
        runtime.activeInventoryForItem(itemName),
        projectedAdditionsForInventoryItem(itemName)
      );
    }

  return {
    itemsBySide,
    otherItemsOnSide,
    buildAllocatedLeftoverObjects,
    allocatePoolToItems,
    getCombinedRandomChests,
    getCombinedChoiceChests,
    getRandomTargetDuplicatesForPlan,
    computeRawItemPlan,
    computeAllRawItemPlans,
    targetDuplicatesForPlanRaw,
    calculatedItemPlanInventoryRawFromPlan,
    duplicatesFromOtherRawPlans,
    duplicateContributionDetailsForItem,
    computePlanOutputsForItem,
    projectedAdditionsForInventoryItem,
    projectedOwnedForInventoryItem,
    totalRandomLeftoversBySide,
    rawAcquiredForInventoryItem,
    combinedInventoryForItem
  };
}
