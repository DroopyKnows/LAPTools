// App bootstrap and top-level render cycle.

    function init(){
      const saved=localStorage.getItem(STORAGE_KEY);
      if(saved){
        try{Object.assign(state,JSON.parse(saved));}catch(e){}
      }
      ravenItems.forEach(item=>{
        state.plans[item.name]=state.plans[item.name]||{};
        state.guaranteed[item.name]=state.guaranteed[item.name]||{};
        state.inventory[item.name]=state.inventory[item.name]||{};
        state.perItemTopUpBundles[item.name]=state.perItemTopUpBundles[item.name]||{};
        state.choiceBankRedeemed[item.name]=state.choiceBankRedeemed[item.name]||{};
      });
      ensureBankObjects();

      const target=document.getElementById("targetLevel");
      allItemLevels.forEach(level=>{
        const opt=document.createElement("option");
        opt.value=level;
        opt.textContent="Level "+level;
        if(level===7) opt.selected=true;
        target.appendChild(opt);
      });

      const highest=document.getElementById("highestOwned");
      allItemLevels.forEach(level=>{
        const opt=document.createElement("option");
        opt.value=level;
        opt.textContent="Level "+level;
        highest.appendChild(opt);
      });
      highest.value=state.highestGlobalOwned || 5;

      renderAll();
    }

    function renderAll(){
      renderOwnedInputs();
      renderPlanInputs();
      renderGuaranteedInputs();
      calculateResults();
      renderInventory();
      renderInventoryRandomTables();
      if(typeof renderItemPlanSummary==="function") renderItemPlanSummary();
      save();
    }

init();

