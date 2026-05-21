// UI event handlers and user actions.

    function setRavenSubPage(page){
      ravenSubPage=page;
      document.getElementById("calcTab").classList.toggle("active",page==="calculator");
      document.getElementById("inventoryTab").classList.toggle("active",page==="inventory");
      document.getElementById("calculatorSubPage").classList.toggle("hidden",page!=="calculator");
      document.getElementById("inventorySubPage").classList.toggle("hidden",page!=="inventory");
      window.scrollTo({top:0,behavior:"smooth"});
    }

    function toggleCard(id){
      document.getElementById(id).classList.toggle("open");
    }

    function setMode(next){
      mode=next;
      document.getElementById("specificModeBtn").classList.toggle("active",mode==="specific");
      document.getElementById("manualModeBtn").classList.toggle("active",mode==="manual");
      document.getElementById("specificFields").classList.toggle("hidden",mode!=="specific");
      document.getElementById("manualFields").classList.toggle("hidden",mode!=="manual");
      renderAll();
    }

    function setManualSide(next){
      manualSide=next;
      document.getElementById("leftSideBtn").classList.toggle("active",manualSide==="left");
      document.getElementById("rightSideBtn").classList.toggle("active",manualSide==="right");
      renderAll();
    }

    function onTargetItemChange(){
      renderAll();
    }

    function setHighestOwned(value){
      state.highestGlobalOwned=Number(value);
      save();
      renderAll();
    }

    function setGroupValue(group,level,value){
      const obj=getGroupObject(group);
      obj[level]=Math.max(0,Math.floor(Number(value||0)));
      save();
      renderAll();
    }

    function adjustGroup(group,level,amount){
      const obj=getGroupObject(group);
      obj[level]=Math.max(0,Math.floor(Number(obj[level]||0))+Math.floor(Number(amount||0)));
      save();
      renderAll();
    }

    function getGroupObject(group){
      if(group==="owned") return currentOwnedObject();
      if(group==="plan") return currentPlanObject();
      if(group==="guaranteed") return currentGuaranteedObject();
      return {};
    }

    function ensureBankObjects(){
      if(!state.topUpBundles) state.topUpBundles={daily1:0,daily2:0,weekly:0};
      if(!state.choiceBank && state.choiceChestBank) state.choiceBank=state.choiceChestBank;
      if(!state.choiceBank) state.choiceBank={};
      state.choiceChestBank=state.choiceBank;
      chestLevels.forEach(level=>{
        if(state.choiceBank[level]===undefined) state.choiceBank[level]=0;
      });
    }

    function choiceBankSourceObject(){
      return currentRedeemedBankObject ? currentRedeemedBankObject() : {};
    }

    function allTopUpBundleObjects(){
      const objects=[];
      if(state.perItemTopUpBundles){
        Object.values(state.perItemTopUpBundles).forEach(obj=>objects.push(obj));
      }
      if(state.manualTopUpBundles) objects.push(state.manualTopUpBundles);
      if(!objects.length && state.topUpBundles) objects.push(state.topUpBundles);
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
      if(state.choiceBankRedeemed){
        Object.values(state.choiceBankRedeemed).forEach(obj=>{
          Object.keys(obj||{}).forEach(levelKey=>{
            const level=Number(levelKey);
            const qty=Math.floor(Number(obj[levelKey]||0));
            if(qty>0) totals[level]=(totals[level]||0)+qty;
          });
        });
      }
      if(state.manualChoiceBankRedeemed){
        Object.keys(state.manualChoiceBankRedeemed||{}).forEach(levelKey=>{
          const level=Number(levelKey);
          const qty=Math.floor(Number(state.manualChoiceBankRedeemed[levelKey]||0));
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
      state.choiceBank=derivedChoiceBankAvailable();
      state.choiceChestBank=state.choiceBank;
      return state.choiceBank;
    }

    function availableChoiceBankAtLevel(level){
      ensureBankObjects();
      const available=derivedChoiceBankAvailable();
      state.choiceBank=available;
      state.choiceChestBank=state.choiceBank;
      return Math.max(0,Math.floor(Number(available[level]||0)));
    }

    function currentTopUpBundleObject(){
      ensureBankObjects();
      if(!state.perItemTopUpBundles) state.perItemTopUpBundles={};
      if(mode==="specific"){
        const item=selectedItemName();
        state.perItemTopUpBundles[item]=state.perItemTopUpBundles[item] || {daily1:0,daily2:0,weekly:0};
        return state.perItemTopUpBundles[item];
      }
      state.manualTopUpBundles=state.manualTopUpBundles || {daily1:0,daily2:0,weekly:0};
      return state.manualTopUpBundles;
    }

    function currentRedeemedBankObject(){
      if(!state.choiceBankRedeemed) state.choiceBankRedeemed={};
      if(mode==="specific"){
        const item=selectedItemName();
        state.choiceBankRedeemed[item]=state.choiceBankRedeemed[item]||{};
        return state.choiceBankRedeemed[item];
      }
      state.manualChoiceBankRedeemed=state.manualChoiceBankRedeemed||{};
      return state.manualChoiceBankRedeemed;
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
      save();
      renderTopUpBundles();
      renderPlanInputs();
      renderAll();
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
      save();
      renderPlanInputs();
      renderTopUpBundles();
      renderAll();
    }

    function setRedeemedChoice(level,value){
      const redeemed=currentRedeemedBankObject();
      const oldValue=Math.max(0,Math.floor(Number(redeemed[level]||0)));
      const next=Math.max(0,Math.floor(Number(value||0)));
      if(next<oldValue){
        redeemed[level]=next;
        syncChoiceBankFromDerived();
      }else if(next>oldValue){
        redeemChoiceFromBank(level,next-oldValue);
        return;
      }
      save();
      renderPlanInputs();
      renderTopUpBundles();
      renderAll();
    }

    function removeAllRedeemedChoice(level){
      setRedeemedChoice(level,0);
    }

    function resetTopUpsForCurrentItem(){
      const obj=currentTopUpBundleObject();
      Object.keys(topUpBundleDefinitions).forEach(key=>obj[key]=0);

      const redeemed=currentRedeemedBankObject();
      Object.keys(redeemed||{}).forEach(levelKey=>redeemed[levelKey]=0);

      syncChoiceBankFromDerived();
      save();
      renderTopUpBundles();
      renderPlanInputs();
      renderAll();
    }

    function resetTopUpsForAllItems(){
      ensureBankObjects();

      ravenItems.forEach(item=>{
        state.perItemTopUpBundles[item.name]=state.perItemTopUpBundles[item.name] || {};
        Object.keys(topUpBundleDefinitions).forEach(key=>{
          state.perItemTopUpBundles[item.name][key]=0;
        });

        state.choiceBankRedeemed[item.name]=state.choiceBankRedeemed[item.name] || {};
        Object.keys(state.choiceBankRedeemed[item.name] || {}).forEach(levelKey=>{
          state.choiceBankRedeemed[item.name][levelKey]=0;
        });
      });

      if(state.topUpBundles){
        Object.keys(topUpBundleDefinitions).forEach(key=>state.topUpBundles[key]=0);
      }

      syncChoiceBankFromDerived();
      save();
      renderTopUpBundles();
      renderPlanInputs();
      renderAll();
    }

    function saveBundleChoiceChestsToBank(){
      syncChoiceBankFromDerived();
      save();
      renderTopUpBundles();
      renderPlanInputs();
      renderAll();
    }

    function setBundleQty(key,value){
      ensureBankObjects();
      const next=Math.max(0,Math.floor(Number(value||0)));
      currentTopUpBundleObject()[key]=next;
      syncChoiceBankFromDerived();
      save();
      renderTopUpBundles();
      renderPlanInputs();
      renderAll();
    }

    function adjustBundleQty(key,delta){
      setBundleQty(key,Number(currentTopUpBundleObject()[key]||0)+delta);
    }

    function applyBundleRandomsToCurrentPlan(){
      const totals=bundleTotals();
      Object.keys(totals.random||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const amount=Math.floor(Number(totals.random[levelKey]||0));
        if(amount>0){
          const plan=currentPlanObject();
          plan[level]=(Number(plan[level]||0)+amount);
        }
      });
      save();
      renderPlanInputs();
      renderAll();
    }

    function setChestMainMode(next){
      const chestActive=next==="chests";
      const chestsBtn=document.getElementById("chestsMainTab");
      const topUpBtn=document.getElementById("topUpBundlesTab");
      const chestsPanel=document.getElementById("chestsCombinedPanel");
      const topUpPanel=document.getElementById("topUpBundlesPanel");

      if(chestsBtn) chestsBtn.classList.toggle("active",chestActive);
      if(topUpBtn) topUpBtn.classList.toggle("active",!chestActive);
      if(chestsPanel) chestsPanel.classList.toggle("hidden",!chestActive);
      if(topUpPanel) topUpPanel.classList.toggle("hidden",chestActive);
      if(!chestActive) renderTopUpBundles();
    }

    function setChestInputMode(next){
      const randomActive=next==="random";
      const randomBtn=document.getElementById("randomChestTab");
      const choiceBtn=document.getElementById("choiceChestTab");
      const randomPanel=document.getElementById("randomChestPanel");
      const choicePanel=document.getElementById("choiceChestPanel");
      if(randomBtn) randomBtn.classList.toggle("active",randomActive);
      if(choiceBtn) choiceBtn.classList.toggle("active",!randomActive);
      if(randomPanel) randomPanel.classList.toggle("hidden",!randomActive);
      if(choicePanel) choicePanel.classList.toggle("hidden",randomActive);
    }

function setQuickAdjust(group,checked){
      if(group==="plan") state.quickAdjustRandom=!!checked;
      if(group==="guaranteed") state.quickAdjustChoice=!!checked;
      save();
      calculateResults();
    }

    function jumpToTargetLevel(){
      const goal=document.getElementById("goalCard");
      const target=document.getElementById("targetLevel");
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
      choiceBankExpanded = !choiceBankExpanded;
      const topUpContainer=document.getElementById("topUpChoiceBankRedeem");
      const chestsContainer=document.getElementById("chestsChoiceBankRedeem");
      if(topUpContainer) renderChoiceBankRedeem("topUpChoiceBankRedeem");
      if(chestsContainer) renderChoiceBankRedeem("chestsChoiceBankRedeem");
    }

    function setInventoryInputFilter(filter){
      state.inventoryInputFilter=filter;
      updateSideFilterTabs("inventoryInput", filter);
      save();
      renderInventory();
    }

    function setUpgradedOwnedFilter(filter){
      state.upgradedOwnedFilter=filter;
      updateSideFilterTabs("upgradedOwned", filter);
      save();
      renderInventory();
    }

    function setUpgradedOwnedViewMode(mode){
      state.upgradedOwnedViewMode=mode;
      updateUpgradedOwnedViewTabs(mode);
      save();
      renderInventory();
    }

    function setHideUnacquiredInventory(checked){
      state.hideUnacquiredInventory=!!checked;
      save();
      renderInventory();
    }

    function toggleBreakdownSource(button){
      const card=button ? button.closest(".breakdown-source-card") : null;
      if(card) card.classList.toggle("open");
    }

    function toggleLeftoverAppliedExplain(){
      const el=document.getElementById("leftoverAppliedExplain");
      if(el) el.classList.toggle("more-info-open");
    }

    function toggleInventoryBreakdownExplain(){
      const el=document.getElementById("inventoryBreakdownExplain");
      if(el) el.classList.toggle("more-info-open");
    }

    function setBreakdownInventoryFilter(next){
      state.breakdownInventoryFilter=next;
      save();
      renderBreakdownEstimatedInventory();
    }

    function setInventoryAdvancedMode(next){
      state.inventoryAdvancedMode=next==="summary" ? "summary" : "breakdown";
      save();
      updateInventoryAdvancedTabs();
    }


    function setInventory(itemName,level,value){
      state.inventory[itemName]=state.inventory[itemName]||{};
      state.inventory[itemName][level]=Math.max(0,Number(value||0));
      save();
      renderAll();
    }

    function resetCurrentPlan(){
      if(mode==="specific"){
        state.plans[selectedItemName()]={};
        state.guaranteed[selectedItemName()]={};
      }else{
        state.manualPlan={};
        state.manualGuaranteed={};
      }
      save();
      renderAll();
    }

    function resetAllPlans(){
      ravenItems.forEach(item=>{
        state.plans[item.name]={};
        state.guaranteed[item.name]={};
      });
      state.manualPlan={};
      state.manualGuaranteed={};
      save();
      renderAll();
    }

    function resetInventory(){
      ravenItems.forEach(item=>state.inventory[item.name]={});
      state.manualOwned={};
      save();
      renderAll();
    }

    function toggleChestsUsedVisibility(){
      const box=document.getElementById("chestsUsedSummaryBlocks");
      const toggle=document.getElementById("hideChestsUsedToggle");
      if(box && toggle) box.classList.toggle("hidden", toggle.checked);
    }

    function toggleNontargetSideBreakdown(){
      const panel=document.getElementById("nontargetSideBreakdown");
      const btn=document.getElementById("nontargetBreakdownToggle");
      if(!panel) return;
      const isOpen=panel.classList.toggle("open");
      if(btn) btn.textContent=isOpen ? "Hide side breakdown" : "Show side breakdown";
    }

    function toggleMoreInfo(){
      const el=document.getElementById("advancedMoreInfo");
      if(el) el.classList.toggle("more-info-open");
    }
