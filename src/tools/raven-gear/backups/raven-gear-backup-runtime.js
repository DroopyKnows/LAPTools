// Raven Gear backup/storage runtime helpers.
// Keeps Raven Gear import/export behavior scoped to tools/raven-gear.

import { ravenItems, allItemLevels } from "../metadata/item-metadata.js";

export function createRavenGearBackupRuntimeModule(runtime){
  const APP_VERSION=runtime.RavenGearBackupIO.RAVEN_GEAR_APP_VERSION;
  const APP_BACKUP_TYPE=runtime.DomainBackup.DOMAIN_APP_BACKUP_TYPE;
  const APP_BACKUP_FORMAT_VERSION=runtime.DomainBackup.DOMAIN_BACKUP_FORMAT_VERSION;

  function createEmptyInventory(){
    const inventory={};
    ravenItems.forEach(item=>inventory[item.name]={});
    return inventory;
  }

  function normalizeInventory(source){
    return runtime.normalizeItemLevelMap(source,allItemLevels);
  }

  function isValidInventory(source){
    if(!runtime.isPlainObject(source)) return false;
    return ravenItems.every(item=>{
      const levels=source[item.name];
      if(!runtime.isPlainObject(levels)) return false;
      return Object.keys(levels).every(key=>{
        const level=Number(key);
        const qty=levels[key];
        return allItemLevels.map(Number).includes(level) && Number.isInteger(qty) && qty>=0;
      });
    });
  }

  function createEmptyScannerState(){
    return runtime.DomainScanner.createEmptyScannerStateDomain();
  }

  function resetScannerStateInAppState(){
    runtime.DomainScanner.resetScannerStateInAppStateDomain(runtime.state);
  }

  function normalizeScannerInventory(source){
    return normalizeInventory(source);
  }

  function scannerInventoryIsUsable(source){
    const inventory=normalizeInventory(source);
    return isValidInventory(inventory);
  }

  function getBackupFormatVersion(payload){
    return runtime.RavenGearBackupIO.getRavenGearBackupFormatVersion(payload,APP_BACKUP_FORMAT_VERSION);
  }

  function migrateBackupState(rawState, fromVersion){
    return runtime.RavenGearBackupIO.migrateRavenGearBackupState(rawState,fromVersion,{getStateSchemaVersion:runtime.getStateSchemaVersion});
  }

  function buildFullBackupPayload(){
    return runtime.RavenGearBackupIO.buildRavenGearBackupPayload({
      state:runtime.state,
      normalizeStateShape:runtime.normalizeStateShape,
      appVersion:APP_VERSION,
      stateSchemaVersion:runtime.CURRENT_STATE_SCHEMA_VERSION,
      backupVersion:APP_BACKUP_FORMAT_VERSION
    });
  }

  function parseBackupJson(text){
    return runtime.RavenGearBackupIO.parseRavenGearBackupJson(text);
  }

  function normalizeBackupPayload(payload){
    return runtime.RavenGearBackupIO.normalizeRavenGearBackupPayload(payload,{
      baseState:runtime.state,
      normalizeStateShape:runtime.normalizeStateShape,
      maxBackupVersion:APP_BACKUP_FORMAT_VERSION,
      getStateSchemaVersion:runtime.getStateSchemaVersion,
      isUsableActiveInventory:scannerInventoryIsUsable
    });
  }

  function save(){
    runtime.RavenGearBackupIO.saveRavenGearState({
      storageKey:runtime.STORAGE_KEY,
      state:runtime.state,
      normalizeStateShape:runtime.normalizeStateShape
    });
  }

  async function exportInventory(){
    // Offer an editable filename before downloading; default is date-stamped so repeat
    // backups don't overwrite each other. Cancelling the modal aborts the export.
    const defaultName=`raven_gear_backup_${new Date().toISOString().slice(0,10)}.json`;
    const filename=await runtime.showExportBackupModal({ defaultName, fallbackName:defaultName });
    if(!filename) return;
    runtime.RavenGearBackupIO.exportRavenGearBackup({
      buildBackupPayload:buildFullBackupPayload,
      filename
    });
  }

  function importInventory(event){
    runtime.RavenGearBackupIO.importRavenGearBackup(event,{
      parseBackupJson,
      normalizeBackupPayload,
      confirmImport:()=>runtime.showConfirmModal({
        title:"Import Backup?",
        message:"This will replace the current Raven Gear data with the backup file.",
        confirmLabel:"Import Backup",
        cancelLabel:"Cancel"
      }),
      replaceStateWithNormalized:runtime.replaceStateWithNormalized,
      resetScannerStateInAppState,
      ensureWhatIfState:runtime.ensureWhatIfState,
      ensureBankObjects:runtime.ensureBankObjects,
      syncChoiceBankFromDerived:runtime.syncChoiceBankFromDerived,
      save,
      renderAll:runtime.renderAll
    });
  }

  return {
    APP_VERSION,
    APP_BACKUP_TYPE,
    APP_BACKUP_FORMAT_VERSION,
    createEmptyInventory,
    normalizeInventory,
    isValidInventory,
    createEmptyScannerState,
    resetScannerStateInAppState,
    normalizeScannerInventory,
    scannerInventoryIsUsable,
    getBackupFormatVersion,
    migrateBackupState,
    buildFullBackupPayload,
    parseBackupJson,
    normalizeBackupPayload,
    save,
    exportInventory,
    importInventory
  };
}
