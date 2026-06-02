// Pure Raven Gear backup domain helpers.
// Builds and validates portable Raven Gear backup envelopes without touching DOM/localStorage.

import {
  domainIsPlainObject,
  domainToSafeInteger,
  normalizeInventoryDomain,
  isValidInventoryDomain
} from "../inventory/inventory-domain.js";

const DOMAIN_APP_BACKUP_TYPE="laptools-raven-gear-backup";
const DOMAIN_BACKUP_FORMAT_VERSION=3;

function backupStringDomain(value,fallback=""){
  if(value===undefined || value===null) return fallback;
  return String(value);
}

function getStateSchemaVersionDomain(source,maxVersion=Number.MAX_SAFE_INTEGER){
  if(!domainIsPlainObject(source)) return 0;
  const raw=source.schemaVersion ?? source.appStateSchemaVersion ?? source.stateSchemaVersion ?? 0;
  return domainToSafeInteger(raw,0,0,maxVersion);
}

function getBackupFormatVersionDomain(payload,maxVersion=DOMAIN_BACKUP_FORMAT_VERSION){
  if(!domainIsPlainObject(payload)) return 0;
  const raw=payload.backupVersion ?? payload.backupFormatVersion ?? payload.formatVersion ?? payload.version ?? payload.stateSchemaVersion ?? 0;
  if(typeof raw==="string"){
    const match=raw.match(/(\d+)$/);
    if(match) return domainToSafeInteger(match[1],0,0,maxVersion);
  }
  return domainToSafeInteger(raw,0,0,maxVersion);
}

function migrateBackupStateDomain(rawState,fromVersion=0,{getStateSchemaVersion=getStateSchemaVersionDomain}={}){
  const migrated=domainIsPlainObject(rawState) ? JSON.parse(JSON.stringify(rawState)) : {};
  if(migrated.randomLeftovers) delete migrated.randomLeftovers;
  if(!migrated.schemaVersion) migrated.schemaVersion=fromVersion || getStateSchemaVersion(migrated) || 0;
  return migrated;
}

function buildFullBackupPayloadDomain(appState,{appVersion="dev",stateSchemaVersion=0,backupVersion=DOMAIN_BACKUP_FORMAT_VERSION}={}){
  return {
    backupType:DOMAIN_APP_BACKUP_TYPE,
    backupVersion,
    appVersion,
    stateSchemaVersion,
    exportedAt:new Date().toISOString(),
    state:domainIsPlainObject(appState) ? JSON.parse(JSON.stringify(appState)) : {}
  };
}

function serializeAppStateDomain(appState,{normalizeState=(value)=>value}={}){
  return JSON.stringify(normalizeState(appState));
}

function parseBackupJsonDomain(text){
  try{
    const payload=JSON.parse(text);
    if(!domainIsPlainObject(payload)) return {ok:false,reason:"This file is not a valid backup JSON object."};
    return {ok:true,payload};
  }catch(error){
    return {ok:false,reason:"Could not read this backup file. Make sure it is valid JSON."};
  }
}

function normalizeBackupPayloadDomain(payload,{
  baseState={},
  normalizeState=(value)=>value,
  maxBackupVersion=DOMAIN_BACKUP_FORMAT_VERSION,
  getStateSchemaVersion=getStateSchemaVersionDomain,
  isUsableActiveInventory=(source)=>isValidInventoryDomain(normalizeInventoryDomain(source))
}={}){
  if(!domainIsPlainObject(payload)) return {ok:false,reason:"This backup file does not contain Raven Gear backup data."};

  const backupFormatVersion=getBackupFormatVersionDomain(payload,maxBackupVersion);
  let importedState=null;

  if(domainIsPlainObject(payload.state)){
    importedState=payload.state;
  }else if(domainIsPlainObject(payload.inventory)){
    importedState={...baseState,inventory:{...(baseState.inventory||{}),active:payload.inventory}};
  }else if(domainIsPlainObject(payload.activeInventory)){
    importedState={...baseState,inventory:{...(baseState.inventory||{}),active:payload.activeInventory}};
  }

  if(!importedState) return {ok:false,reason:"This backup file does not contain Raven Gear backup data."};

  try{
    const migrated=migrateBackupStateDomain(importedState,backupFormatVersion,{getStateSchemaVersion});
    const normalizedState=normalizeState(migrated);
    const activeInventory=normalizedState && normalizedState.inventory ? normalizedState.inventory.active : null;
    if(!isUsableActiveInventory(activeInventory)){
      return {ok:false,reason:"This backup contains invalid Active Inventory data."};
    }
    return {
      ok:true,
      state:normalizedState,
      backupFormatVersion,
      stateSchemaVersion:getStateSchemaVersion(normalizedState),
      exportedAt:backupStringDomain(payload.exportedAt,""),
      appVersion:backupStringDomain(payload.appVersion,"")
    };
  }catch(error){
    return {ok:false,reason:"This backup could not be normalized safely."};
  }
}

export {
  DOMAIN_APP_BACKUP_TYPE,
  DOMAIN_BACKUP_FORMAT_VERSION,
  backupStringDomain,
  getStateSchemaVersionDomain,
  getBackupFormatVersionDomain,
  migrateBackupStateDomain,
  buildFullBackupPayloadDomain,
  serializeAppStateDomain,
  parseBackupJsonDomain,
  normalizeBackupPayloadDomain
};
