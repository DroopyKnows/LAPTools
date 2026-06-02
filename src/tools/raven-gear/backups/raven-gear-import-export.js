// Raven Gear backup/import-export runtime helpers.
// Keeps Raven Gear data backup behavior under the Raven Gear tool instead of app/core.

import * as DomainBackup from "./raven-gear-backup.js";

const RAVEN_GEAR_BACKUP_FILENAME="raven_gear_backup.json";
const RAVEN_GEAR_APP_VERSION="1.0.26";

function buildRavenGearBackupPayload({
  state,
  normalizeStateShape=(value)=>value,
  appVersion=RAVEN_GEAR_APP_VERSION,
  stateSchemaVersion=0,
  backupVersion=DomainBackup.DOMAIN_BACKUP_FORMAT_VERSION
}={}){
  return DomainBackup.buildFullBackupPayloadDomain(normalizeStateShape(state),{
    appVersion,
    stateSchemaVersion,
    backupVersion
  });
}

function getRavenGearBackupFormatVersion(payload,maxVersion=DomainBackup.DOMAIN_BACKUP_FORMAT_VERSION){
  return DomainBackup.getBackupFormatVersionDomain(payload,maxVersion);
}

function migrateRavenGearBackupState(rawState,fromVersion,{getStateSchemaVersion}={}){
  return DomainBackup.migrateBackupStateDomain(rawState,fromVersion,{getStateSchemaVersion});
}

function parseRavenGearBackupJson(text){
  return DomainBackup.parseBackupJsonDomain(text);
}

function normalizeRavenGearBackupPayload(payload,{
  baseState={},
  normalizeStateShape=(value)=>value,
  maxBackupVersion=DomainBackup.DOMAIN_BACKUP_FORMAT_VERSION,
  getStateSchemaVersion,
  isUsableActiveInventory
}={}){
  return DomainBackup.normalizeBackupPayloadDomain(payload,{
    baseState,
    normalizeState:normalizeStateShape,
    maxBackupVersion,
    getStateSchemaVersion,
    isUsableActiveInventory
  });
}

function saveRavenGearState({storageKey,state,normalizeStateShape=(value)=>value,localStorageRef=globalThis.localStorage}={}){
  if(!storageKey || !localStorageRef) return;
  localStorageRef.setItem(storageKey,DomainBackup.serializeAppStateDomain(state,{normalizeState:normalizeStateShape}));
}

function exportRavenGearBackup({
  buildBackupPayload,
  documentRef=globalThis.document,
  urlRef=globalThis.URL,
  BlobCtor=globalThis.Blob,
  filename=RAVEN_GEAR_BACKUP_FILENAME
}={}){
  if(typeof buildBackupPayload!=="function") return;
  const payload=buildBackupPayload();
  const blob=new BlobCtor([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url=urlRef.createObjectURL(blob);
  const anchor=documentRef.createElement("a");
  anchor.href=url;
  anchor.download=filename;
  anchor.click();
  urlRef.revokeObjectURL(url);
}

function importRavenGearBackup(event,{
  parseBackupJson=parseRavenGearBackupJson,
  normalizeBackupPayload,
  confirmImport,
  replaceStateWithNormalized,
  resetScannerStateInAppState,
  ensureWhatIfState,
  ensureBankObjects,
  syncChoiceBankFromDerived,
  save,
  renderAll,
  alertRef=globalThis.alert,
  FileReaderCtor=globalThis.FileReader
}={}){
  const input=event && event.target ? event.target : null;
  const file=input && input.files ? input.files[0] : null;
  if(!file || typeof FileReaderCtor!=="function") return;

  const reader=new FileReaderCtor();
  reader.onload=async ()=>{
    try{
      const parsed=parseBackupJson(reader.result);
      if(!parsed.ok){
        alertRef(parsed.reason || "Could not read this backup file.");
        return;
      }

      const backup=normalizeBackupPayload(parsed.payload);
      if(!backup.ok || !backup.state){
        alertRef(backup.reason || "This backup file does not contain Raven Gear backup data.");
        return;
      }

      const shouldImport=await confirmImport();
      if(!shouldImport) return;

      replaceStateWithNormalized(backup.state);
      if(typeof resetScannerStateInAppState==="function") resetScannerStateInAppState();
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      ensureBankObjects();
      syncChoiceBankFromDerived();
      save();
      renderAll();
    }catch(error){
      alertRef("Could not import this backup file.");
    }finally{
      if(input) input.value="";
    }
  };
  reader.readAsText(file);
}

export {
  RAVEN_GEAR_APP_VERSION,
  RAVEN_GEAR_BACKUP_FILENAME,
  buildRavenGearBackupPayload,
  getRavenGearBackupFormatVersion,
  migrateRavenGearBackupState,
  parseRavenGearBackupJson,
  normalizeRavenGearBackupPayload,
  saveRavenGearState,
  exportRavenGearBackup,
  importRavenGearBackup
};
