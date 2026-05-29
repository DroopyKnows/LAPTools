// localStorage persistence and full-state backup import/export.

    function save(){
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    }

    function exportInventory(){
      const payload={
        version:"last-asylum-raven-full-backup-v2",
        stateSchemaVersion:CURRENT_STATE_SCHEMA_VERSION,
        exportedAt:new Date().toISOString(),
        state:normalizeStateShape(state)
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
      reader.onload=async ()=>{
        try{
          const payload=JSON.parse(reader.result);
          let importedState=null;

          if(payload && payload.state){
            importedState=payload.state;
          }else if(payload && payload.inventory){
            // Backward compatibility for older inventory-only backups.
            importedState={...state, inventory:{...state.inventory, active:payload.inventory}};
          }

          if(!importedState){
            alert("This backup file does not contain Raven Gear backup data.");
            return;
          }

          const shouldImport=await showConfirmModal({
            title:"Import Backup?",
            message:"This will replace the current app data with the backup file.",
            confirmLabel:"Import Backup",
            cancelLabel:"Cancel",
            confirmClass:"primary-btn"
          });
          if(!shouldImport) return;

          if(importedState && importedState.randomLeftovers) delete importedState.randomLeftovers;
          replaceStateWithNormalized(importedState);
          if(typeof ensureWhatIfState==="function") ensureWhatIfState();
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
