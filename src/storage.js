// localStorage persistence and full-state backup import/export.

function save(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(normalizeStateShape(state)));
}

function exportInventory(){
  const payload=typeof buildFullBackupPayload==="function" ? buildFullBackupPayload() : {
    backupType:"laptools-full-app-backup",
    backupVersion:3,
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
  const input=event && event.target ? event.target : null;
  const file=input && input.files ? input.files[0] : null;
  if(!file) return;

  const reader=new FileReader();
  reader.onload=async ()=>{
    try{
      const parsed=typeof parseBackupJson==="function" ? parseBackupJson(reader.result) : {ok:true,payload:JSON.parse(reader.result)};
      if(!parsed.ok){
        alert(parsed.reason || "Could not read this backup file.");
        return;
      }

      const backup=typeof normalizeBackupPayload==="function" ? normalizeBackupPayload(parsed.payload) : {ok:true,state:parsed.payload.state || parsed.payload};
      if(!backup.ok || !backup.state){
        alert(backup.reason || "This backup file does not contain Raven Gear backup data.");
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

      replaceStateWithNormalized(backup.state);
      if(typeof resetScannerStateInAppState==="function") resetScannerStateInAppState();
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      ensureBankObjects();
      syncChoiceBankFromDerived();
      save();
      renderAll();
    }catch(error){
      alert("Could not import this backup file.");
    }finally{
      if(input) input.value="";
    }
  };
  reader.readAsText(file);
}


// v1.0.13 module bridge exports
Object.assign(window,{
  exportInventory,
  importInventory,
  save
});
