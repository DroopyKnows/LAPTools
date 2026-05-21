// Calculation-critical helpers. Preserve workbook/game rounding and 3-to-1 upgrade behavior.

    function selectedItemName(){
      return document.getElementById("targetItem").value;
    }

    function selectedSide(){
      if(mode==="manual") return manualSide;
      const item=ravenItems.find(x=>x.name===selectedItemName());
      return item ? item.side : "left";
    }

    function probability(){
      return selectedSide()==="left" ? 2/9 : 1/9;
    }

    function visibleOwnedLevels(){
      return allItemLevels.filter(level=>level<=Number(state.highestGlobalOwned||10));
    }

    function currentOwnedObject(){
      if(mode==="specific") return state.inventory[selectedItemName()] || {};
      return state.manualOwned;
    }

    function currentPlanObject(){
      if(mode==="specific") return state.plans[selectedItemName()] || {};
      return state.manualPlan;
    }

    function currentGuaranteedObject(){
      if(mode==="specific") return state.guaranteed[selectedItemName()] || {};
      return state.manualGuaranteed;
    }

    function getQty(obj,level){
      return Number((obj||{})[level] || 0);
    }

    function equivalentAtLevel(obj,level){
      let total=0;
      Object.keys(obj||{}).forEach(k=>{
        const sourceLevel=Number(k);
        const qty=Number(obj[k]||0);
        if(sourceLevel>=level) total += qty*Math.pow(3,sourceLevel-level);
      });
      return total;
    }

    function equivalentFromHigherAndLower(obj,level){
      let fromHigher=0;
      let lowerRaw=0;

      allItemLevels.forEach(sourceLevel=>{
        const qty=getQty(obj,sourceLevel);
        if(!qty) return;

        if(sourceLevel>=level){
          fromHigher += qty*Math.pow(3,sourceLevel-level);
        }else{
          lowerRaw += qty/Math.pow(3,level-sourceLevel);
        }
      });

      return fromHigher + Math.floor(lowerRaw);
    }

    function requiredAtLevel(target,level){
      if(target<level) return 0;
      return Math.pow(3,target-level);
    }

    function roundNice(n){
      if(!isFinite(n)||n<=0) return "-";
      if(Math.abs(n-Math.round(n))<.00001) return String(Math.round(n));
      return String(Math.round(n*100)/100);
    }

    function excelWholeCount(value){
      const n=Number(value || 0);
      if(!isFinite(n) || n<=0) return 0;
      const whole=Math.floor(n);
      const decimal=n-whole;
      const rounded=decimal>=0.95 ? Math.ceil(n) : whole;
      return rounded>0 ? rounded : 0;
    }

    function excelDisplayWhole(value){
      const rounded=excelWholeCount(value);
      return rounded>0 ? String(rounded) : "-";
    }

    function addToLevelObject(target,level,value){
      target[level]=Math.round((Number(target[level]||0)+Number(value||0))*1000000)/1000000;
    }

    function addWholeToLevelObject(target,level,value){
      const n=Number(value||0);
      if(n>0) target[level]=Number(target[level]||0)+n;
    }

    function simplifyUpByLevel(source){
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

    function simplifyExcelHelper(source,maxLevel=7){
      const result={};
      let carry=0;

      for(let level=1;level<=maxLevel;level++){
        const total=Number(source[level]||0)+carry;

        if(level===maxLevel){
          result[level]=Math.round(total*1000000)/1000000;
          carry=0;
        }else{
          const upgrades=Math.floor(total/3);
          const remainder=total-upgrades*3;
          result[level]=Math.round(remainder*1000000)/1000000;
          carry=upgrades;
        }
      }

      return result;
    }

    function displayWholeByLevels(source,levels){
      return levels.map(level=>excelDisplayWhole(source[level]));
    }

    function targetItemsFromRandomPlan(plan,p){
      const raw={};
      chestLevels.forEach(level=>{
        raw[level]=Math.floor(getQty(plan,level)*p);
      });
      return simplifyUpByLevel(raw);
    }

    function targetItemsFromPlanAndChoice(plan,guaranteed,p){
      const raw={};
      chestLevels.forEach(level=>{
        raw[level]=Math.floor(getQty(plan,level)*p)+getQty(guaranteed,level);
      });
      return simplifyUpByLevel(raw);
    }

    function mergedOwnedWithAddtl(owned,addtl){
      const merged={};
      allItemLevels.forEach(level=>{
        const total=getQty(owned,level)+getQty(addtl,level);
        if(total>0) merged[level]=total;
      });
      return merged;
    }

    function addLevelObject(target,level,value){
      target[level]=Math.round((Number(target[level]||0)+Number(value||0))*100)/100;
    }

    function makeSideSummaryText(leftObj,rightObj){
      const leftTotal=Object.values(leftObj||{}).reduce((a,b)=>a+Number(b||0),0);
      const rightTotal=Object.values(rightObj||{}).reduce((a,b)=>a+Number(b||0),0);
      if(leftTotal<=0 && rightTotal<=0) return "-";
      if(leftTotal>0 && rightTotal>0) return "Both";
      return leftTotal>0 ? "Left" : "Right";
    }

    function wholeExpectedFromRandom(qty, p){
      return Math.floor(Number(qty || 0) * p);
    }

    function simplifyWholeByLevel(source){
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

    function calculateAdditionalOwnedFromPlan(plan, p){
      const rawWhole={};
      Object.keys(plan || {}).forEach(levelKey=>{
        const level=Number(levelKey);
        const qty=Number(plan[levelKey] || 0);
        if(qty>0){
          const whole=wholeExpectedFromRandom(qty, p);
          if(whole>0) rawWhole[level]=(rawWhole[level] || 0) + whole;
        }
      });
      return simplifyWholeByLevel(rawWhole);
    }

    function mergeLevelObjects(){
      const merged={};
      Array.from(arguments).forEach(obj=>{
        Object.keys(obj || {}).forEach(k=>{
          merged[k]=(merged[k] || 0) + Number(obj[k] || 0);
        });
      });
      return merged;
    }

    function calculateOwnedPlusPlanPlusChoice(owned, additionalOwned, guaranteed){
      return mergeLevelObjects(owned || {}, additionalOwned || {}, guaranteed || {});
    }

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

    function displayWhole(value){
      const n=Math.floor(Number(value||0));
      return n>0 ? String(n) : "-";
    }

    function safeNum(value){
      const n=Number(value || 0);
      return isFinite(n) ? n : 0;
    }

    function excelRoundWhole(value){
      const n=safeNum(value);
      if(n<=0) return 0;
      const whole=Math.floor(n);
      const decimal=n-whole;
      const rounded=decimal>=0.95 ? Math.ceil(n) : whole;
      return rounded>0 ? rounded : 0;
    }

    function simplifyBucketDecimal(rawByLevel){
      const result={};
      let carry=0;
      for(let level=1; level<=MAX_ITEM_LEVEL; level++){
        const total=safeNum(rawByLevel[level]) + carry;
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

    function displayRowFromSimplified(simplified){
      const display={};
      Object.keys(simplified || {}).forEach(level=>{
        const whole=excelRoundWhole(simplified[level]);
        if(whole>0) display[level]=(display[level]||0)+whole;
      });
      return display;
    }

    function fractionalRemainderFromSimplified(simplified){
      const remainder={};
      Object.keys(simplified || {}).forEach(level=>{
        const value=safeNum(simplified[level]);
        const whole=excelRoundWhole(value);
        const leftover=value-whole;
        if(leftover>0) remainder[level]=(remainder[level]||0)+leftover;
      });
      return remainder;
    }

    function addObjects(target, source){
      Object.keys(source || {}).forEach(level=>{
        target[level]=(target[level]||0)+safeNum(source[level]);
      });
      return target;
    }

    function addDisplayRows(rows){
      const total={};
      rows.forEach(row=>addObjects(total,row));
      return total;
    }

    function buildLeftoverHelperRows(plan, samePerItemProb, oppositePerItemProb){
      const sameRows=[];
      const oppositeRows=[];
      const sameFractionTotals={};
      const oppositeFractionTotals={};

      for(let i=0; i<2; i++){
        const raw={};
        chestLevels.forEach(level=>{
          const qty=safeNum(plan[level]);
          if(qty>0) raw[level]=qty*samePerItemProb;
        });
        const simplified=simplifyBucketDecimal(raw);
        const display=displayRowFromSimplified(simplified);
        const fractions=fractionalRemainderFromSimplified(simplified);
        sameRows.push(display);
        addObjects(sameFractionTotals,fractions);
      }

      const sameRemainderDisplay=displayRowFromSimplified(simplifyBucketDecimal(sameFractionTotals));
      sameRows.push(sameRemainderDisplay);

      for(let i=0; i<3; i++){
        const raw={};
        chestLevels.forEach(level=>{
          const qty=safeNum(plan[level]);
          if(qty>0) raw[level]=qty*oppositePerItemProb;
        });
        const simplified=simplifyBucketDecimal(raw);
        const display=displayRowFromSimplified(simplified);
        const fractions=fractionalRemainderFromSimplified(simplified);
        oppositeRows.push(display);
        addObjects(oppositeFractionTotals,fractions);
      }

      const oppositeRemainderDisplay=displayRowFromSimplified(simplifyBucketDecimal(oppositeFractionTotals));
      oppositeRows.push(oppositeRemainderDisplay);

      return {
        sameRows,
        oppositeRows,
        sameTotal:addDisplayRows(sameRows),
        oppositeTotal:addDisplayRows(oppositeRows),
        allTotal:addDisplayRows([...sameRows,...oppositeRows])
      };
    }

    function valuesFromLevelObject(obj, levels){
      return levels.map(level=>{
        const value=safeNum(obj[level]);
        return value>0 ? String(Math.floor(value)) : "-";
      });
    }

    function rawRandomSideTotals(plan, selectedSideValue){
      const left={};
      const right={};
      chestLevels.forEach(level=>{
        const qty=safeNum(plan[level]);
        if(qty<=0) return;

        if(selectedSideValue==="left"){
          // Target item is left. Left leftovers are the other 2 left items (2/9 each);
          // right leftovers are the 3 right items (1/9 each).
          left[level]=(left[level]||0)+excelRoundWhole(qty*(4/9));
          right[level]=(right[level]||0)+excelRoundWhole(qty*(3/9));
        }else{
          // Target item is right. Right leftovers are the other 2 right items (1/9 each);
          // left leftovers are the 3 left items (2/9 each).
          right[level]=(right[level]||0)+excelRoundWhole(qty*(2/9));
          left[level]=(left[level]||0)+excelRoundWhole(qty*(6/9));
        }
      });
      return {left,right};
    }

    function calculateAdditionalOwnedFromPlanExcludingLevel(plan, p, excludedLevel){
      const rawWhole={};
      Object.keys(plan || {}).forEach(levelKey=>{
        const level=Number(levelKey);
        if(level===Number(excludedLevel)) return;
        const qty=Number(plan[levelKey] || 0);
        if(qty>0){
          const whole=Math.floor(qty * p);
          if(whole>0) rawWhole[level]=(rawWhole[level] || 0) + whole;
        }
      });
      return simplifyWholeByLevel(rawWhole);
    }

    function deterministicSideTotalsFromRandomPlan(plan){
      const left={};
      const right={};

      chestLevels.forEach(level=>{
        const qty=Math.floor(Number(plan[level]||0));
        if(qty<=0) return;

        const leftQty=Math.round(qty*(2/3));
        const rightQty=qty-leftQty;

        if(leftQty>0) left[level]=(left[level]||0)+leftQty;
        if(rightQty>0) right[level]=(right[level]||0)+rightQty;
      });

      return {left,right};
    }

    function targetItemsRawFromRandomPlan(plan,p){
      const target={};

      chestLevels.forEach(level=>{
        const qty=Math.floor(Number(plan[level]||0));
        if(qty<=0) return;

        const targetQty=Math.floor(qty*p);
        if(targetQty>0) target[level]=(target[level]||0)+targetQty;
      });

      return target;
    }

    function subtractLevelObjects(source, subtractor){
      const result={};

      Object.keys(source||{}).forEach(level=>{
        const value=Math.floor(Number(source[level]||0))-Math.floor(Number((subtractor||{})[level]||0));
        if(value>0) result[level]=value;
      });

      return result;
    }

    function nontargetSideTotalsFromRandomPlan(plan,side,p){
      const sideTotals=deterministicSideTotalsFromRandomPlan(plan);
      const targetRaw=targetItemsRawFromRandomPlan(plan,p);

      if(side==="left"){
        return {
          left:subtractLevelObjects(sideTotals.left,targetRaw),
          right:sideTotals.right
        };
      }

      return {
        left:sideTotals.left,
        right:subtractLevelObjects(sideTotals.right,targetRaw)
      };
    }

    function calculateAdditionalOwnedFromPlanAndChoice(plan, guaranteed, p){
      const rawWhole={};

      Object.keys(plan || {}).forEach(levelKey=>{
        const level=Number(levelKey);
        const qty=Number(plan[levelKey] || 0);
        if(qty>0){
          const whole=Math.floor(qty * p);
          if(whole>0) rawWhole[level]=(rawWhole[level] || 0) + whole;
        }
      });

      Object.keys(guaranteed || {}).forEach(levelKey=>{
        const level=Number(levelKey);
        const qty=Math.floor(Number(guaranteed[levelKey] || 0));
        if(qty>0){
          rawWhole[level]=(rawWhole[level] || 0) + qty;
        }
      });

      return simplifyWholeByLevel(rawWhole);
    }

    function rawTargetAdditionsFromPlanAndChoice(plan, guaranteed, p){
      const rawWhole={};

      Object.keys(plan || {}).forEach(levelKey=>{
        const level=Number(levelKey);
        const qty=Math.floor(Number(plan[levelKey] || 0));
        if(qty>0){
          const whole=Math.floor(qty * p);
          if(whole>0) rawWhole[level]=(rawWhole[level] || 0) + whole;
        }
      });

      Object.keys(guaranteed || {}).forEach(levelKey=>{
        const level=Number(levelKey);
        const qty=Math.floor(Number(guaranteed[levelKey] || 0));
        if(qty>0){
          rawWhole[level]=(rawWhole[level] || 0) + qty;
        }
      });

      return rawWhole;
    }

    function calculateEffectiveOwnedForRemainingItems(owned, plan, guaranteed, p){
      const rawCombined={};

      Object.keys(owned || {}).forEach(levelKey=>{
        const level=Number(levelKey);
        const qty=Math.floor(Number(owned[levelKey] || 0));
        if(qty>0){
          rawCombined[level]=(rawCombined[level] || 0) + qty;
        }
      });

      const rawAdditions=rawTargetAdditionsFromPlanAndChoice(plan, guaranteed, p);
      Object.keys(rawAdditions || {}).forEach(levelKey=>{
        const level=Number(levelKey);
        const qty=Math.floor(Number(rawAdditions[levelKey] || 0));
        if(qty>0){
          rawCombined[level]=(rawCombined[level] || 0) + qty;
        }
      });

      return simplifyWholeByLevel(rawCombined);
    }

    function levelObjectPlus(a,b){
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

    function bundleRandomTotals(){
      if(typeof bundleTotals!=="function") return {};
      return bundleTotals().random || {};
    }

    function activeRandomPlanObject(){
      return levelObjectPlus(currentPlanObject(),bundleRandomTotals());
    }

    function bundleTotalsForObject(bundleObj){
      const random={};
      const choice={};
      Object.keys(topUpBundleDefinitions).forEach(key=>{
        const qty=Math.floor(Number((bundleObj||{})[key]||0));
        if(qty<=0) return;
        const def=topUpBundleDefinitions[key];
        Object.keys(def.random||{}).forEach(levelKey=>{
          const level=Number(levelKey);
          const amount=Math.floor(Number(def.random[levelKey]||0)*qty);
          if(amount>0) random[level]=(random[level]||0)+amount;
        });
        Object.keys(def.choice||{}).forEach(levelKey=>{
          const level=Number(levelKey);
          const amount=Math.floor(Number(def.choice[levelKey]||0)*qty);
          if(amount>0) choice[level]=(choice[level]||0)+amount;
        });
      });
      return {random,choice};
    }

    function bundleTotals(){
      return bundleTotalsForObject(currentTopUpBundleObject());
    }

    function manualTopUpChoiceObject(){
      return mode==="manual" ? (bundleTotals().choice || {}) : {};
    }

    function totalChoiceObject(){
      if(mode==="manual"){
        return levelObjectPlus(currentGuaranteedObject(),manualTopUpChoiceObject());
      }
      return levelObjectPlus(currentGuaranteedObject(),currentBankRedeemedAsChoiceSource());
    }

    function currentChoiceBankEarnedHere(level){
      if(mode==="manual") return 0;
      const choice=(bundleTotals().choice || {});
      return Math.max(0,Math.floor(Number(choice[level]||0)));
    }

    function itemsBySide(side){
      return ravenItems.filter(item=>item.side===side).map(item=>item.name);
    }

    function otherItemsOnSide(side, selectedName){
      return itemsBySide(side).filter(name=>name!==selectedName);
    }

    function cloneLevelObject(obj){
      const out={};
      Object.keys(obj||{}).forEach(k=>{
        const value=Number(obj[k]||0);
        if(value>0) out[k]=value;
      });
      return out;
    }

    function addLevelObjects(){
      const result={};
      Array.from(arguments).forEach(obj=>{
        Object.keys(obj||{}).forEach(k=>{
          const value=Number(obj[k]||0);
          if(value>0) result[k]=(result[k]||0)+value;
        });
      });
      return result;
    }

    function convertValuesArrayToLevelObject(levels, values){
      const obj={};
      levels.forEach((level,index)=>{
        const raw=values[index];
        if(raw && raw !== "-"){
          const parsed=Number(String(raw).replace(/[^0-9.-]/g,""));
          if(parsed>0) obj[level]=parsed;
        }
      });
      return obj;
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


    function levelObjectTotalCount(obj){
      return Object.values(obj||{}).reduce((sum,value)=>sum+Math.floor(Number(value||0)),0);
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

    function rawTargetAdditionsFromPlanExcludingLevel(plan, p, excludedLevel){
      const rawWhole={};
      Object.keys(plan || {}).forEach(levelKey=>{
        const level=Number(levelKey);
        if(level===Number(excludedLevel)) return;
        const qty=Math.floor(Number(plan[levelKey] || 0));
        if(qty>0){
          const whole=Math.floor(qty * p);
          if(whole>0) rawWhole[level]=(rawWhole[level] || 0) + whole;
        }
      });
      return rawWhole;
    }

    function calculateEffectiveOwnedForRemainingChestColumn(owned, plan, guaranteed, p, excludedLevel){
      const rawCombined={};

      addObjectsRaw(rawCombined,owned || {});
      addObjectsRaw(rawCombined,rawTargetAdditionsFromPlanExcludingLevel(plan,p,excludedLevel));
      addObjectsRaw(rawCombined,guaranteed || {});

      return simplifyWholeByLevel(rawCombined);
    }


    function computeRawItemPlan(itemName){
      const item=ravenItems.find(x=>x.name===itemName);
      if(!item){
        return null;
      }

      const currentInventory=cloneLevelObject((state.inventory && state.inventory[itemName]) || {});
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

    function totalCalculatedInventoryRawFromPlan(rawPlan){
      if(!rawPlan) return {};
      return addLevelObjects(
        calculatedItemPlanInventoryRawFromPlan(rawPlan),
        duplicatesFromOtherRawPlans(rawPlan.sourceItem,rawPlan.sourceItem)
      );
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
      return addLevelObjects((state.inventory && state.inventory[itemName]) || {}, projectedAdditionsForInventoryItem(itemName));
    }

    function totalRandomLeftoversBySide(side){
      const total={};
      computeAllRawItemPlans().forEach(plan=>{
        addObjects(total,(plan.randomItemsLeftover && plan.randomItemsLeftover[side]) || {});
      });
      return total;
    }

    function shouldShowSide(side, filter){
      return filter==="all" || side===filter;
    }

    function levelObjectHasValues(obj){
      return Object.values(obj||{}).some(v=>Number(v||0)>0);
    }

    function levelsWithValues(obj, levels){
      return levels.filter(level=>Number((obj||{})[level]||0)>0);
    }

    function addObjectsRaw(target,source){
      Object.keys(source||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(source[levelKey]||0));
        if(value>0) target[level]=(target[level]||0)+value;
      });
      return target;
    }

    function topUpBundleObjectForItem(itemName){
      if(state.perItemTopUpBundles && state.perItemTopUpBundles[itemName]){
        return state.perItemTopUpBundles[itemName];
      }
      return {};
    }

    function bundleTotalsForItem(itemName){
      if(typeof bundleTotalsForObject==="function"){
        return bundleTotalsForObject(topUpBundleObjectForItem(itemName));
      }
      return {random:{},choice:{}};
    }

    function rawTargetFromRandomPlan(plan,p){
      const raw={};
      chestLevels.forEach(level=>{
        const qty=Math.floor(Number((plan||{})[level]||0));
        const earned=Math.floor(qty*p);
        if(earned>0) raw[level]=(raw[level]||0)+earned;
      });
      return raw;
    }

    function rawChoiceObject(choiceObj){
      const raw={};
      Object.keys(choiceObj||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const qty=Math.floor(Number(choiceObj[levelKey]||0));
        if(qty>0) raw[level]=(raw[level]||0)+qty;
      });
      return raw;
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
        (state.inventory && state.inventory[itemName]) || {},
        projectedAdditionsForInventoryItem(itemName)
      );
    }

    function finalBreakdownContribution(outputs){
      const raw={};
      addObjectsRaw(raw,(outputs && outputs.rawTargetRandom) || {});
      addObjectsRaw(raw,(outputs && outputs.rawManualChoice) || {});
      addObjectsRaw(raw,(outputs && outputs.rawRedeemedChoice) || {});
      return simplifyUpByLevel(raw);
    }
