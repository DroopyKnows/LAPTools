// Calculator plan math: target items, remaining requirements, and side totals.

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

    function finalBreakdownContribution(outputs){
      const raw={};
      addObjectsRaw(raw,(outputs && outputs.rawTargetRandom) || {});
      addObjectsRaw(raw,(outputs && outputs.rawManualChoice) || {});
      addObjectsRaw(raw,(outputs && outputs.rawRedeemedChoice) || {});
      return simplifyUpByLevel(raw);
    }

