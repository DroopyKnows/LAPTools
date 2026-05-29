    function setInventoryArchiveMode(mode){
      state.inventoryArchiveMode=mode==="archived" ? "archived" : "active";
      save();
      renderInventory();
    }

    function setInventoryArchiveFilter(filter){
      state.inventoryArchiveFilter=(filter==="left"||filter==="right") ? filter : "all";
      save();
      renderInventory();
    }

    function toggleInventoryArchiveSnapshot(id){
      state.inventoryArchiveExpanded=state.inventoryArchiveExpanded || {};
      state.inventoryArchiveExpanded[id]=!state.inventoryArchiveExpanded[id];
      save();
      renderInventory();
    }

    function saveCurrentInventorySnapshot(){
      const name=prompt("Snapshot name",`Inventory ${new Date().toLocaleDateString()}`);
      if(name===null) return;
      const note=prompt("Optional note","");
      state.inventoryArchives=Array.isArray(state.inventoryArchives) ? state.inventoryArchives : [];
      state.inventoryArchives.unshift({
        id:String(Date.now()),
        name:(name||"Inventory Snapshot").trim()||"Inventory Snapshot",
        note:(note||"").trim(),
        savedAt:new Date().toISOString(),
        inventory:JSON.parse(JSON.stringify(state.inventory.active||{}))
      });
      state.inventoryArchiveMode="archived";
      save();
      renderInventory();
    }

    async function loadInventorySnapshot(id){
      const found=(state.inventoryArchives||[]).find(x=>x.id===id);
      if(!found) return;
      const shouldLoad=await showConfirmModal({
        title:"Load Archived Inventory?",
        message:"This will replace Active Inventory.",
        confirmLabel:"Replace Active Inventory",
        cancelLabel:"Cancel",
        confirmClass:"primary-btn"
      });
      if(!shouldLoad) return;
      state.inventory.active=JSON.parse(JSON.stringify(found.inventory||{}));
      ravenItems.forEach(item=>state.inventory.active[item.name]=state.inventory.active[item.name]||{});
      state.inventoryArchiveMode="active";
      save();
      renderAll();
    }

    async function deleteInventorySnapshot(id){
      const shouldDelete=await showConfirmModal({
        title:"Delete Archived Inventory?",
        message:"This snapshot will be removed from Archived Inventory.",
        confirmLabel:"Delete",
        cancelLabel:"Cancel",
        confirmClass:"danger-btn"
      });
      if(!shouldDelete) return;
      state.inventoryArchives=(state.inventoryArchives||[]).filter(x=>x.id!==id);
      save();
      renderInventory();
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

    function toggleResultsMoreInfo(){
      const el=document.getElementById("resultsMoreInfo");
      if(el) el.classList.toggle("more-info-open");
    }

    function toggleInventoryViewMoreInfo(){
      const el=document.getElementById("inventoryViewMoreInfo");
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


    let inventoryInputRenderTimer=null;
    function setInventory(itemName,level,value){
      state.inventory.active[itemName]=state.inventory.active[itemName]||{};
      state.inventory.active[itemName][level]=Math.max(0,Number(value||0));
      save();
      clearTimeout(inventoryInputRenderTimer);
      inventoryInputRenderTimer=setTimeout(()=>{
        if(document.activeElement && document.activeElement.matches && document.activeElement.matches('input[data-input-key^="inventory-"]')) return;
        renderAll();
      },350);
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
      ravenItems.forEach(item=>state.inventory.active[item.name]={});
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
