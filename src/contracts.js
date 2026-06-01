const APP_VERSION="1.0.15";
const APP_BACKUP_TYPE="laptools-full-app-backup";
const APP_BACKUP_FORMAT_VERSION=3;

function createEmptyInventory(){
  const inventory={};
  ravenItems.forEach(item=>inventory[item.name]={});
  return inventory;
}

function normalizeInventory(source){
  return normalizeItemLevelMap(source,allItemLevels);
}

function isValidInventory(source){
  if(!isPlainObject(source)) return false;
  return ravenItems.every(item=>{
    const levels=source[item.name];
    if(!isPlainObject(levels)) return false;
    return Object.keys(levels).every(key=>{
      const level=Number(key);
      const qty=levels[key];
      return allItemLevels.map(Number).includes(level) && Number.isInteger(qty) && qty>=0;
    });
  });
}

function createEmptyScannerState(){
  return {
    lastScan:null,
    status:"",
    statusType:"",
    selectedFileNames:[],
    reviewOpen:false,
    requiresReview:false,
    issueReason:""
  };
}

function resetScannerStateInAppState(){
  if(!state || !state.ui) return;
  state.ui.bagScanner=createEmptyScannerState();
}

function normalizeScannerInventory(source){
  return normalizeInventory(source);
}

function scannerInventoryIsUsable(source){
  const inventory=normalizeInventory(source);
  return isValidInventory(inventory);
}

function getBackupFormatVersion(payload){
  if(!isPlainObject(payload)) return 0;
  const raw=payload.backupVersion ?? payload.backupFormatVersion ?? payload.formatVersion ?? payload.version ?? payload.stateSchemaVersion ?? 0;
  if(typeof raw==="string"){
    const match=raw.match(/(\d+)$/);
    if(match) return toSafeInteger(match[1],0,0,APP_BACKUP_FORMAT_VERSION);
  }
  return toSafeInteger(raw,0,0,APP_BACKUP_FORMAT_VERSION);
}

function migrateBackupState(rawState, fromVersion){
  const migrated=isPlainObject(rawState) ? JSON.parse(JSON.stringify(rawState)) : {};
  if(migrated.randomLeftovers) delete migrated.randomLeftovers;
  if(!migrated.schemaVersion) migrated.schemaVersion=fromVersion || getStateSchemaVersion(migrated) || 0;
  return migrated;
}

function buildFullBackupPayload(){
  const normalizedState=normalizeStateShape(state);
  return {
    backupType:APP_BACKUP_TYPE,
    backupVersion:APP_BACKUP_FORMAT_VERSION,
    appVersion:APP_VERSION,
    stateSchemaVersion:CURRENT_STATE_SCHEMA_VERSION,
    exportedAt:new Date().toISOString(),
    state:normalizedState
  };
}

function parseBackupJson(text){
  try{
    const payload=JSON.parse(text);
    if(!isPlainObject(payload)) return {ok:false,reason:"This file is not a valid backup JSON object."};
    return {ok:true,payload};
  }catch(error){
    return {ok:false,reason:"Could not read this backup file. Make sure it is valid JSON."};
  }
}

function normalizeBackupPayload(payload){
  if(!isPlainObject(payload)) return {ok:false,reason:"This backup file does not contain Raven Gear backup data."};

  let importedState=null;
  let backupFormatVersion=getBackupFormatVersion(payload);

  if(isPlainObject(payload.state)){
    importedState=payload.state;
  }else if(isPlainObject(payload.inventory)){
    importedState={...state,inventory:{...state.inventory,active:payload.inventory}};
  }else if(isPlainObject(payload.activeInventory)){
    importedState={...state,inventory:{...state.inventory,active:payload.activeInventory}};
  }

  if(!importedState) return {ok:false,reason:"This backup file does not contain Raven Gear backup data."};

  try{
    const migrated=migrateBackupState(importedState,backupFormatVersion);
    const normalizedState=normalizeStateShape(migrated);
    if(!scannerInventoryIsUsable(normalizedState.inventory.active)){
      return {ok:false,reason:"This backup contains invalid Active Inventory data."};
    }
    return {
      ok:true,
      state:normalizedState,
      backupFormatVersion,
      stateSchemaVersion:getStateSchemaVersion(normalizedState),
      exportedAt:cleanString(payload.exportedAt,""),
      appVersion:cleanString(payload.appVersion,"")
    };
  }catch(error){
    return {ok:false,reason:"This backup could not be normalized safely."};
  }
}


// v1.0.13 module bridge exports
Object.assign(window,{
  APP_BACKUP_FORMAT_VERSION,
  APP_BACKUP_TYPE,
  APP_VERSION,
  buildFullBackupPayload,
  createEmptyInventory,
  createEmptyScannerState,
  getBackupFormatVersion,
  isValidInventory,
  migrateBackupState,
  normalizeBackupPayload,
  normalizeInventory,
  normalizeScannerInventory,
  parseBackupJson,
  resetScannerStateInAppState,
  scannerInventoryIsUsable
});
