// Inventory projection/allocation math and raw audit model helpers.

    function itemsBySide(side){
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
        const simplified=simplifyBucketDecimal ? simplifyBucketDecimal(raw) : simplifyUpByLevel(raw);
        const display=displayRowFromSimplified ? displayRowFromSimplified(simplified) : simplifyWholeByLevel(raw);
        sameBuckets.push(display);
      }

      for(let i=0;i<3;i++){
        const raw={};
        chestLevels.forEach(level=>{
          const qty=Number(plan[level]||0);
          if(qty>0) raw[level]=qty*oppositePerItemProb;
        });
        const simplified=simplifyBucketDecimal ? simplifyBucketDecimal(raw) : simplifyUpByLevel(raw);
        const display=displayRowFromSimplified ? displayRowFromSimplified(simplified) : simplifyWholeByLevel(raw);
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
      return addLevelObjects(rawPlan.randomChests.manual || {}, rawPlan.randomChests.topUp || {});
    }

    function getCombinedChoiceChests(rawPlan){
      if(!rawPlan || !rawPlan.choiceChests) return {};
      return addLevelObjects(rawPlan.choiceChests.manual || {}, rawPlan.choiceChests.redeemed || {});
    }

    function getRandomTargetDuplicatesForPlan(rawPlan){
      if(!rawPlan) return {};
      const item=ravenItems.find(x=>x.name===rawPlan.sourceItem);
      if(!item) return {};
      const p=item.side==="left" ? 2/9 : 1/9;
      return rawTargetFromRandomPlan(getCombinedRandomChests(rawPlan),p);
    }

    function computeRawItemPlan(itemName){
      const item=ravenItems.find(x=>x.name===itemName);
      if(!item){
        return null;
      }

      const currentInventory=cloneLevelObject((state.inventory.active && state.inventory.active[itemName]) || {});
      const randomManual=cloneLevelObject((state.plans && state.plans[itemName]) || {});
      const bundleTotals=bundleTotalsForItem(itemName);
      const randomTopUp=cloneLevelObject((bundleTotals && bundleTotals.random) || {});
      const randomCombined=addLevelObjects(randomManual,randomTopUp);

      const choiceManual=cloneLevelObject((state.guaranteed && state.guaranteed[itemName]) || {});
      const choiceRedeemed=cloneLevelObject((state.choiceBankRedeemed && state.choiceBankRedeemed[itemName]) || {});

      const p=item.side==="left" ? 2/9 : 1/9;

      const randomTargetTotal=rawTargetFromRandomPlan(randomCombined,p);

      const targetDuplicates={
        random:randomTargetTotal,
        choiceManual:rawChoiceObject(choiceManual),
        choiceRedeemed:rawChoiceObject(choiceRedeemed)
      };

      const randomSideGenerated=deterministicSideTotalsFromRandomPlan(randomCombined);

      const nontargetPools={
        left:item.side==="left" ? subtractLevelObjects(randomSideGenerated.left,randomTargetTotal) : cloneLevelObject(randomSideGenerated.left),
        right:item.side==="right" ? subtractLevelObjects(randomSideGenerated.right,randomTargetTotal) : cloneLevelObject(randomSideGenerated.right)
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
        assignedNontargetByItem[name]=addLevelObjects(assignedNontargetByItem[name]||{},sameAllocation.allocatedByItem[name]);
      });
      Object.keys(oppositeAllocation.allocatedByItem||{}).forEach(name=>{
        assignedNontargetByItem[name]=addLevelObjects(assignedNontargetByItem[name]||{},oppositeAllocation.allocatedByItem[name]);
      });

      const rawRandomChestCount=levelObjectTotalCount(randomCombined);
      const generatedCount=levelObjectTotalCount(randomSideGenerated.left)+levelObjectTotalCount(randomSideGenerated.right);
      const targetRandomCount=levelObjectTotalCount(randomTargetTotal);
      const nontargetCount=levelObjectTotalCount(nontargetPools.left)+levelObjectTotalCount(nontargetPools.right);
      const allocatedCount=Object.values(assignedNontargetByItem).reduce((sum,obj)=>sum+levelObjectTotalCount(obj),0);
      const leftoverCount=levelObjectTotalCount(randomItemsLeftover.left)+levelObjectTotalCount(randomItemsLeftover.right);

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
      return ravenItems.map(item=>computeRawItemPlan(item.name)).filter(Boolean);
    }

    function targetDuplicatesForPlanRaw(rawPlan){
      if(!rawPlan || !rawPlan.targetDuplicates) return {};
      return addLevelObjects(
        rawPlan.targetDuplicates.random || getRandomTargetDuplicatesForPlan(rawPlan),
        rawPlan.targetDuplicates.choiceManual || {},
        rawPlan.targetDuplicates.choiceRedeemed || {}
      );
    }

    function calculatedItemPlanInventoryRawFromPlan(rawPlan){
      if(!rawPlan) return {};
      return addLevelObjects(rawPlan.currentInventory || {}, targetDuplicatesForPlanRaw(rawPlan));
    }

    function duplicatesFromOtherRawPlans(itemName,excludeSourceName){
      const total={};
      computeAllRawItemPlans().forEach(plan=>{
        if(!plan || plan.sourceItem===excludeSourceName) return;
        const assigned=(plan.assignedNontargetByItem && plan.assignedNontargetByItem[itemName]) || {};
        addObjects(total,assigned);
      });
      return total;
    }

    function duplicateContributionDetailsForItem(itemName,excludeSourceName){
      const details=[];
      computeAllRawItemPlans().forEach(plan=>{
        if(!plan || plan.sourceItem===excludeSourceName) return;
        const assigned=(plan.assignedNontargetByItem && plan.assignedNontargetByItem[itemName]) || {};
        if(levelObjectHasValues(assigned)){
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
      const rawChoice=addLevelObjects(rawManualChoice,rawRedeemedChoice);
      const additionalOwned=simplifyUpByLevel(targetDuplicatesForPlanRaw(rawPlan));

      const rawAssignedLeft={};
      const rawAssignedRight={};
      Object.keys(rawPlan.assignedNontargetByItem || {}).forEach(itemNameKey=>{
        const item=ravenItems.find(x=>x.name===itemNameKey);
        if(!item) return;
        if(item.side==="left") addObjectsRaw(rawAssignedLeft,rawPlan.assignedNontargetByItem[itemNameKey]);
        if(item.side==="right") addObjectsRaw(rawAssignedRight,rawPlan.assignedNontargetByItem[itemNameKey]);
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
          addObjects(total,targetDuplicatesForPlanRaw(plan));
        }
        addObjects(total,(plan.assignedNontargetByItem && plan.assignedNontargetByItem[inventoryItemName]) || {});
      });

      return total;
    }

    function projectedOwnedForInventoryItem(itemName){
      return addLevelObjects((state.inventory.active && state.inventory.active[itemName]) || {}, projectedAdditionsForInventoryItem(itemName));
    }

    function totalRandomLeftoversBySide(side){
      const total={};
      computeAllRawItemPlans().forEach(plan=>{
        addObjects(total,(plan.randomItemsLeftover && plan.randomItemsLeftover[side]) || {});
      });
      return total;
    }

    function rawAcquiredForInventoryItem(inventoryItemName){
      const total={};
      const targetItem=ravenItems.find(x=>x.name===inventoryItemName);
      if(!targetItem) return total;

      ravenItems.forEach(sourceItem=>{
        const sourceName=sourceItem.name;
        const outputs=computePlanOutputsForItem(sourceName);

        if(sourceName===inventoryItemName){
          addObjectsRaw(total,outputs.rawTargetRandom || {});
          addObjectsRaw(total,outputs.rawManualChoice || {});
          addObjectsRaw(total,outputs.rawRedeemedChoice || {});
        }

        if(targetItem.side==="left" && Array.isArray(outputs.leftBuckets)){
          outputs.leftBuckets.forEach(bucket=>addObjectsRaw(total,bucket));
        }
        if(targetItem.side==="right" && Array.isArray(outputs.rightBuckets)){
          outputs.rightBuckets.forEach(bucket=>addObjectsRaw(total,bucket));
        }
      });

      return total;
    }

    function combinedInventoryForItem(itemName){
      return addLevelObjects(
        (state.inventory.active && state.inventory.active[itemName]) || {},
        projectedAdditionsForInventoryItem(itemName)
      );
    }

