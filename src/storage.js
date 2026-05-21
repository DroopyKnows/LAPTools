// localStorage persistence and full-state backup import/export.

    function save(){
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    }

    function exportInventory(){
      const payload={
        version:"last-asylum-raven-full-backup-v2",
        exportedAt:new Date().toISOString(),
        state:state
      };
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;
      a.download="raven_gear_full_backup.json";
      a.click();
      URL.revokeObjectURL(url);
    }

    function importInventory(event){
      const file=event.target.files[0];
      if(!file) return;
      const reader=new FileReader();
      reader.onload=()=>{
        try{
          const payload=JSON.parse(reader.result);
          let importedState=null;

          if(payload && payload.state){
            importedState=payload.state;
          }else if(payload && payload.inventory){
            // Backward compatibility for older inventory-only backups.
            importedState={...state, inventory:payload.inventory};
          }

          if(!importedState){
            alert("This backup file does not contain Raven Gear backup data.");
            return;
          }

          Object.keys(state).forEach(key=>delete state[key]);
          if(importedState && importedState.randomLeftovers) delete importedState.randomLeftovers;
          Object.assign(state,JSON.parse(JSON.stringify(DEFAULT_STATE)),importedState);

          state.plans=state.plans||{};
          state.guaranteed=state.guaranteed||{};
          state.inventory=state.inventory||{};
          state.manualOwned=state.manualOwned||{};
          state.manualPlan=state.manualPlan||{};
          state.manualGuaranteed=state.manualGuaranteed||{};
          state.topUpBundles=state.topUpBundles||{};
          state.perItemTopUpBundles=state.perItemTopUpBundles||{};
          state.manualTopUpBundles=state.manualTopUpBundles||{};
          state.choiceBank=state.choiceBank||{};
          state.choiceBankRedeemed=state.choiceBankRedeemed||{};
          state.manualChoiceBankRedeemed=state.manualChoiceBankRedeemed||{};

          ravenItems.forEach(item=>{
            state.inventory[item.name]=state.inventory[item.name]||{};
            state.plans[item.name]=state.plans[item.name]||{};
            state.guaranteed[item.name]=state.guaranteed[item.name]||{};
            state.perItemTopUpBundles[item.name]=state.perItemTopUpBundles[item.name]||{};
            state.choiceBankRedeemed[item.name]=state.choiceBankRedeemed[item.name]||{};
          });

          ensureBankObjects();
          syncChoiceBankFromDerived();
          save();
          renderAll();
        }catch(e){
          alert("Could not import this backup file.");
        }
      };
      reader.readAsText(file);
      event.target.value="";
    }
