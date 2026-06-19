// Calculator event-handler module. External helpers/data/state are read from runtime at call time.
// The timer wrappers setTimer/clearTimer are intentionally inner consts, not dependency properties.

import { chestLevels, ravenItems, topUpBundleDefinitions } from "../metadata/item-metadata.js";
import { initAllGrids } from "../ui/grid/grid.js";

export function createCalculatorEventsModule(runtime){
    function setMode(next){
      runtime.mode=next;
      runtime.byId("specificModeBtn").classList.toggle("active",runtime.mode==="specific");
      runtime.byId("manualModeBtn").classList.toggle("active",runtime.mode==="manual");
      runtime.byId("specificFields").classList.toggle("hidden",runtime.mode!=="specific");
      runtime.byId("manualFields").classList.toggle("hidden",runtime.mode!=="manual");
      runtime.renderAll();
    }

    function setManualSide(next){
      runtime.manualSide=next;
      runtime.byId("leftSideBtn").classList.toggle("active",runtime.manualSide==="left");
      runtime.byId("rightSideBtn").classList.toggle("active",runtime.manualSide==="right");
      runtime.renderAll();
    }

    function onTargetItemChange(){
      runtime.renderAll();
    }

    function setHighestOwned(value){
      const next=Number(value||0);
      if(next>=12) runtime.state.highestGlobalOwned=12;
      else runtime.state.highestGlobalOwned=next>=8 ? 8 : Math.max(1,Math.min(7,next||7));
      runtime.save();
      runtime.renderAll();
    }

    let calculatorInputRenderTimer=null;

    function isActiveCalculatorInput(){
      const active=document.activeElement;
      return !!(active && active.matches && active.matches('input[data-input-key^="owned-"], input[data-input-key^="plan-"], input[data-input-key^="guaranteed-"], input[data-input-key^="bundle-"], input[data-input-key^="redeem-"]'));
    }

    function bindCalculatorInputBlurRender(){
      const active=document.activeElement;
      if(!isActiveCalculatorInput() || !active || active.dataset.calculatorRenderOnBlur==="true") return;
      active.dataset.calculatorRenderOnBlur="true";
      active.addEventListener('blur',()=>{
        delete active.dataset.calculatorRenderOnBlur;
        const clearTimer=(typeof window!=="undefined" && window.clearTimeout) ? window.clearTimeout.bind(window) : clearTimeout;
        clearTimer(calculatorInputRenderTimer);
        runtime.renderAll();
      },{once:true});
    }

    function renderCalculatorInputLivePanels(){
      if(typeof runtime.renderOwnedTargetCollapsedSnapshot==="function") runtime.renderOwnedTargetCollapsedSnapshot();
      if(typeof runtime.renderChestInputCollapsedSnapshot==="function") runtime.renderChestInputCollapsedSnapshot();
      if(typeof runtime.renderBundleAppliedSummary==="function"){
        runtime.renderBundleAppliedSummary("topUpBundleAppliedSummary");
        runtime.renderBundleAppliedSummary("chestsBundleAppliedSummary");
      }
      if(typeof runtime.renderChoiceBankRedeem==="function"){
        const active=document.activeElement;
        const activeKey=(active && active.dataset && active.dataset.inputKey) || "";
        if(!String(activeKey).startsWith("redeem-")){
          runtime.renderChoiceBankRedeem("topUpChoiceBankRedeem");
          runtime.renderChoiceBankRedeem("chestsChoiceBankRedeem");
        }
      }
      initAllGrids(runtime.root || document);
    }

    function finishCalculatorInputUpdate(){
      runtime.save();
      const clearTimer=(typeof window!=="undefined" && window.clearTimeout) ? window.clearTimeout.bind(window) : clearTimeout;
      const setTimer=(typeof window!=="undefined" && window.setTimeout) ? window.setTimeout.bind(window) : setTimeout;
      clearTimer(calculatorInputRenderTimer);
      renderCalculatorInputLivePanels();
      if(isActiveCalculatorInput()){
        bindCalculatorInputBlurRender();
        calculatorInputRenderTimer=setTimer(()=>{
          if(isActiveCalculatorInput()) return;
          runtime.renderAll();
        },350);
        return;
      }
      runtime.renderAll();
    }

    function setGroupValue(group,level,value){
      if(group==="owned" && runtime.mode==="specific"){
        const itemName=runtime.selectedItemName();
        runtime.state.inventory.active=runtime.state.inventory.active || {};
        runtime.state.inventory.active[itemName]=runtime.state.inventory.active[itemName] || {};
        runtime.state.inventory.active[itemName][level]=Math.max(0,Math.floor(Number(value||0)));
        finishCalculatorInputUpdate();
        return;
      }
      const obj=getGroupObject(group);
      obj[level]=Math.max(0,Math.floor(Number(value||0)));
      finishCalculatorInputUpdate();
    }

    function adjustGroup(group,level,amount){
      if(group==="owned" && runtime.mode==="specific"){
        const itemName=runtime.selectedItemName();
        runtime.state.inventory.active=runtime.state.inventory.active || {};
        runtime.state.inventory.active[itemName]=runtime.state.inventory.active[itemName] || {};
        const current=Math.floor(Number(runtime.state.inventory.active[itemName][level]||0));
        runtime.state.inventory.active[itemName][level]=Math.max(0,current+Math.floor(Number(amount||0)));
        runtime.save();
        runtime.renderAll();
        return;
      }
      const obj=getGroupObject(group);
      obj[level]=Math.max(0,Math.floor(Number(obj[level]||0))+Math.floor(Number(amount||0)));
      runtime.save();
      runtime.renderAll();
    }

    function getGroupObject(group){
      if(group==="owned") return runtime.currentOwnedObject();
      if(group==="plan") return runtime.currentPlanObject();
      if(group==="guaranteed") return runtime.currentGuaranteedObject();
      return {};
    }

    function ensureBankObjects(){
      if(!runtime.state.topUpBundles) runtime.state.topUpBundles={daily1:0,daily2:0,weekly:0};
      if(!runtime.state.choiceBank && runtime.state.choiceChestBank) runtime.state.choiceBank=runtime.state.choiceChestBank;
      if(!runtime.state.choiceBank) runtime.state.choiceBank={};
      runtime.state.choiceChestBank=runtime.state.choiceBank;
      chestLevels.forEach(level=>{
        if(runtime.state.choiceBank[level]===undefined) runtime.state.choiceBank[level]=0;
      });
    }

    function choiceBankSourceObject(){
      return currentRedeemedBankObject ? currentRedeemedBankObject() : {};
    }

    function allTopUpBundleObjects(){
      // The choice bank pools ONLY per-item (specific-mode) top-up bundles. Manual-
      // mode bundles auto-apply their choice directly (manualTopUpChoiceObject) and
      // must NOT feed the bank — otherwise manual top-ups leak into the item-plan
      // bank and then "disappear" when syncChoiceBankFromDerived recomputes.
      const objects=[];
      if(runtime.state.perItemTopUpBundles){
        Object.values(runtime.state.perItemTopUpBundles).forEach(obj=>objects.push(obj));
      }
      if(!objects.length && runtime.state.topUpBundles) objects.push(runtime.state.topUpBundles);
      return objects;
    }

    function topUpChoiceTotalsAllPlans(){
      const totals={};
      allTopUpBundleObjects().forEach(bundleObj=>{
        Object.keys(topUpBundleDefinitions).forEach(key=>{
          const qty=Math.floor(Number((bundleObj||{})[key]||0));
          if(qty<=0) return;
          const def=topUpBundleDefinitions[key];
          Object.keys(def.choice||{}).forEach(levelKey=>{
            const level=Number(levelKey);
            const amount=Math.floor(Number(def.choice[levelKey]||0)*qty);
            if(amount>0) totals[level]=(totals[level]||0)+amount;
          });
        });
      });
      return totals;
    }

    function totalRedeemedChoiceAllPlans(){
      const totals={};
      if(runtime.state.choiceBankRedeemed){
        Object.values(runtime.state.choiceBankRedeemed).forEach(obj=>{
          Object.keys(obj||{}).forEach(levelKey=>{
            const level=Number(levelKey);
            const qty=Math.floor(Number(obj[levelKey]||0));
            if(qty>0) totals[level]=(totals[level]||0)+qty;
          });
        });
      }
      if(runtime.state.manualChoiceBankRedeemed){
        Object.keys(runtime.state.manualChoiceBankRedeemed||{}).forEach(levelKey=>{
          const level=Number(levelKey);
          const qty=Math.floor(Number(runtime.state.manualChoiceBankRedeemed[levelKey]||0));
          if(qty>0) totals[level]=(totals[level]||0)+qty;
        });
      }
      return totals;
    }

    function derivedChoiceBankAvailable(){
      const generated=topUpChoiceTotalsAllPlans();
      const redeemed=totalRedeemedChoiceAllPlans();
      const available={};
      const levels=new Set([...Object.keys(generated||{}),...Object.keys(redeemed||{})]);
      levels.forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.max(0,Math.floor(Number(generated[level]||0))-Math.floor(Number(redeemed[level]||0)));
        if(value>0) available[level]=value;
      });
      return available;
    }

    function syncChoiceBankFromDerived(){
      runtime.state.choiceBank=derivedChoiceBankAvailable();
      runtime.state.choiceChestBank=runtime.state.choiceBank;
      return runtime.state.choiceBank;
    }

    function availableChoiceBankAtLevel(level){
      ensureBankObjects();
      const available=derivedChoiceBankAvailable();
      runtime.state.choiceBank=available;
      runtime.state.choiceChestBank=runtime.state.choiceBank;
      return Math.max(0,Math.floor(Number(available[level]||0)));
    }

    function currentTopUpBundleObject(){
      ensureBankObjects();
      if(!runtime.state.perItemTopUpBundles) runtime.state.perItemTopUpBundles={};
      if(runtime.mode==="specific"){
        const item=runtime.selectedItemName();
        runtime.state.perItemTopUpBundles[item]=runtime.state.perItemTopUpBundles[item] || {daily1:0,daily2:0,weekly:0};
        return runtime.state.perItemTopUpBundles[item];
      }
      runtime.state.manualTopUpBundles=runtime.state.manualTopUpBundles || {daily1:0,daily2:0,weekly:0};
      return runtime.state.manualTopUpBundles;
    }

    function currentRedeemedBankObject(){
      if(!runtime.state.choiceBankRedeemed) runtime.state.choiceBankRedeemed={};
      if(runtime.mode==="specific"){
        const item=runtime.selectedItemName();
        runtime.state.choiceBankRedeemed[item]=runtime.state.choiceBankRedeemed[item]||{};
        return runtime.state.choiceBankRedeemed[item];
      }
      runtime.state.manualChoiceBankRedeemed=runtime.state.manualChoiceBankRedeemed||{};
      return runtime.state.manualChoiceBankRedeemed;
    }

    function currentBankRedeemedAsChoiceSource(){
      const redeemed=currentRedeemedBankObject();
      const result={};
      Object.keys(redeemed||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(redeemed[levelKey]||0));
        if(value>0) result[level]=value;
      });
      return result;
    }

    function redeemChoiceFromBank(level,amount){
      ensureBankObjects();
      amount=Math.floor(Number(amount||0));
      if(amount<=0) return;
      const available=availableChoiceBankAtLevel(level);
      const use=Math.min(available,amount);
      if(use<=0) return;

      const redeemed=currentRedeemedBankObject();
      redeemed[level]=(Number(redeemed[level]||0)+use);

      syncChoiceBankFromDerived();
      runtime.save();
      runtime.renderTopUpBundles();
      runtime.renderPlanInputs();
      runtime.renderAll();
    }

    function returnRedeemedChoiceToBank(level,amount){
      ensureBankObjects();
      const redeemed=currentRedeemedBankObject();
      const availableRedeemed=Math.floor(Number(redeemed[level]||0));
      const giveBack=Math.min(availableRedeemed,Math.floor(Number(amount||0)));
      if(giveBack<=0) return 0;
      redeemed[level]=availableRedeemed-giveBack;
      syncChoiceBankFromDerived();
      return giveBack;
    }

    function adjustRedeemedChoice(level,delta){
      const redeemed=currentRedeemedBankObject();
      const oldValue=Math.max(0,Math.floor(Number(redeemed[level]||0)));
      const next=Math.max(0,oldValue+Math.floor(Number(delta||0)));
      if(next<oldValue){
        redeemed[level]=next;
        syncChoiceBankFromDerived();
      }else if(next>oldValue){
        redeemChoiceFromBank(level,next-oldValue);
        return;
      }
      runtime.save();
      runtime.renderPlanInputs();
      runtime.renderTopUpBundles();
      runtime.renderAll();
    }

    function setRedeemedChoice(level,value){
      const redeemed=currentRedeemedBankObject();
      const oldValue=Math.max(0,Math.floor(Number(redeemed[level]||0)));
      const requested=Math.max(0,Math.floor(Number(value||0)));
      const maxReachable=oldValue+availableChoiceBankAtLevel(level);
      const next=Math.min(requested,maxReachable);
      redeemed[level]=next;
      syncChoiceBankFromDerived();
      if(isActiveCalculatorInput()){
        finishCalculatorInputUpdate();
        return;
      }
      runtime.save();
      runtime.renderPlanInputs();
      runtime.renderTopUpBundles();
      runtime.renderAll();
    }

    function removeAllRedeemedChoice(level){
      setRedeemedChoice(level,0);
    }

    async function resetTopUpsForCurrentItem(){
      const ok=await runtime.showConfirmModal({
        title:"Reset Top-Ups for This Item?",
        message:"This clears the top-up bundle quantities for the current item.",
        confirmLabel:"Reset Top-Ups",
        cancelLabel:"Cancel"
      });
      if(!ok) return;
      const obj=currentTopUpBundleObject();
      Object.keys(topUpBundleDefinitions).forEach(key=>obj[key]=0);

      const redeemed=currentRedeemedBankObject();
      Object.keys(redeemed||{}).forEach(levelKey=>redeemed[levelKey]=0);

      syncChoiceBankFromDerived();
      runtime.save();
      runtime.renderTopUpBundles();
      runtime.renderPlanInputs();
      runtime.renderAll();
    }

    async function resetTopUpsForAllItems(){
      const ok=await runtime.showConfirmModal({
        title:"Reset Top-Ups for All Items?",
        message:"This clears top-up bundle quantities for every item.",
        confirmLabel:"Reset All Top-Ups",
        cancelLabel:"Cancel"
      });
      if(!ok) return;
      ensureBankObjects();

      ravenItems.forEach(item=>{
        runtime.state.perItemTopUpBundles[item.name]=runtime.state.perItemTopUpBundles[item.name] || {};
        Object.keys(topUpBundleDefinitions).forEach(key=>{
          runtime.state.perItemTopUpBundles[item.name][key]=0;
        });

        runtime.state.choiceBankRedeemed[item.name]=runtime.state.choiceBankRedeemed[item.name] || {};
        Object.keys(runtime.state.choiceBankRedeemed[item.name] || {}).forEach(levelKey=>{
          runtime.state.choiceBankRedeemed[item.name][levelKey]=0;
        });
      });

      if(runtime.state.topUpBundles){
        Object.keys(topUpBundleDefinitions).forEach(key=>runtime.state.topUpBundles[key]=0);
      }

      syncChoiceBankFromDerived();
      runtime.save();
      runtime.renderTopUpBundles();
      runtime.renderPlanInputs();
      runtime.renderAll();
    }

    function saveBundleChoiceChestsToBank(){
      syncChoiceBankFromDerived();
      runtime.save();
      runtime.renderTopUpBundles();
      runtime.renderPlanInputs();
      runtime.renderAll();
    }

    function clampCurrentRedeemedChoicesToEarnedHere(){
      if(runtime.mode==="manual") return;
      const redeemed=currentRedeemedBankObject();
      const earned=(runtime.bundleTotals().choice || {});
      Object.keys(redeemed||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const maxHere=Math.max(0,Math.floor(Number(earned[level]||0)));
        const current=Math.max(0,Math.floor(Number(redeemed[level]||0)));
        redeemed[level]=Math.min(current,maxHere);
      });
    }

    function setBundleQty(key,value){
      ensureBankObjects();
      const next=Math.max(0,Math.floor(Number(value||0)));
      currentTopUpBundleObject()[key]=next;
      clampCurrentRedeemedChoicesToEarnedHere();
      syncChoiceBankFromDerived();
      if(isActiveCalculatorInput()){
        finishCalculatorInputUpdate();
        return;
      }
      runtime.save();
      runtime.renderTopUpBundles();
      runtime.renderPlanInputs();
      runtime.renderAll();
    }

    function adjustBundleQty(key,delta){
      setBundleQty(key,Number(currentTopUpBundleObject()[key]||0)+delta);
    }

    function applyBundleRandomsToCurrentPlan(){
      const totals=runtime.bundleTotals();
      Object.keys(totals.random||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const amount=Math.floor(Number(totals.random[levelKey]||0));
        if(amount>0){
          const plan=runtime.currentPlanObject();
          plan[level]=(Number(plan[level]||0)+amount);
        }
      });
      runtime.save();
      runtime.renderPlanInputs();
      runtime.renderAll();
    }

    function setChestMainMode(next){
      const chestActive=next==="chests";
      const chestsBtn=runtime.byId("chestsMainTab");
      const topUpBtn=runtime.byId("topUpBundlesTab");
      const chestsPanel=runtime.byId("chestsCombinedPanel");
      const topUpPanel=runtime.byId("topUpBundlesPanel");

      if(chestsBtn) chestsBtn.classList.toggle("active",chestActive);
      if(topUpBtn) topUpBtn.classList.toggle("active",!chestActive);
      if(chestsPanel) chestsPanel.classList.toggle("hidden",!chestActive);
      if(topUpPanel) topUpPanel.classList.toggle("hidden",chestActive);
      if(!chestActive) runtime.renderTopUpBundles();
    }

    function setChestInputMode(next){
      const randomActive=next==="random";
      const randomBtn=runtime.byId("randomChestTab");
      const choiceBtn=runtime.byId("choiceChestTab");
      const randomPanel=runtime.byId("randomChestPanel");
      const choicePanel=runtime.byId("choiceChestPanel");
      if(randomBtn) randomBtn.classList.toggle("active",randomActive);
      if(choiceBtn) choiceBtn.classList.toggle("active",!randomActive);
      if(randomPanel) randomPanel.classList.toggle("hidden",!randomActive);
      if(choicePanel) choicePanel.classList.toggle("hidden",randomActive);
    }

    function jumpToTargetLevel(){
      const goal=runtime.byId("goalCard");
      const target=runtime.byId("targetLevel");
      if(goal){
        goal.scrollIntoView({behavior:"smooth",block:"start"});
      }
      if(target){
        target.classList.remove("target-flash");
        void target.offsetWidth;
        target.classList.add("target-flash");
        setTimeout(()=>target.focus({preventScroll:true}),450);
      }
    }

    function toggleChoiceBankCollapse(){
      runtime.choiceBankExpanded = !runtime.choiceBankExpanded;
      const topUpContainer=runtime.byId("topUpChoiceBankRedeem");
      const chestsContainer=runtime.byId("chestsChoiceBankRedeem");
      if(topUpContainer) runtime.renderChoiceBankRedeem("topUpChoiceBankRedeem");
      if(chestsContainer) runtime.renderChoiceBankRedeem("chestsChoiceBankRedeem");
    }

  return {
    setMode,
    setManualSide,
    onTargetItemChange,
    setHighestOwned,
    setGroupValue,
    adjustGroup,
    getGroupObject,
    ensureBankObjects,
    choiceBankSourceObject,
    allTopUpBundleObjects,
    topUpChoiceTotalsAllPlans,
    totalRedeemedChoiceAllPlans,
    derivedChoiceBankAvailable,
    syncChoiceBankFromDerived,
    availableChoiceBankAtLevel,
    currentTopUpBundleObject,
    currentRedeemedBankObject,
    currentBankRedeemedAsChoiceSource,
    redeemChoiceFromBank,
    returnRedeemedChoiceToBank,
    adjustRedeemedChoice,
    setRedeemedChoice,
    removeAllRedeemedChoice,
    resetTopUpsForCurrentItem,
    resetTopUpsForAllItems,
    saveBundleChoiceChestsToBank,
    setBundleQty,
    adjustBundleQty,
    applyBundleRandomsToCurrentPlan,
    setChestMainMode,
    setChestInputMode,
    jumpToTargetLevel,
    toggleChoiceBankCollapse
  };
}
