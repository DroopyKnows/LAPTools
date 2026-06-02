// Raven Gear backup/storage runtime helpers.
// Keeps Raven Gear import/export behavior scoped to tools/raven-gear.

export function createRavenGearBackupRuntimeModule(ctx){
  const APP_VERSION=ctx.RavenGearBackupIO.RAVEN_GEAR_APP_VERSION;
  const APP_BACKUP_TYPE=ctx.DomainBackup.DOMAIN_APP_BACKUP_TYPE;
  const APP_BACKUP_FORMAT_VERSION=ctx.DomainBackup.DOMAIN_BACKUP_FORMAT_VERSION;

  function createEmptyInventory(){
    const inventory={};
    ctx.ravenItems.forEach(item=>inventory[item.name]={});
    return inventory;
  }

  function normalizeInventory(source){
    return ctx.normalizeItemLevelMap(source,ctx.allItemLevels);
  }

  function isValidInventory(source){
    if(!ctx.isPlainObject(source)) return false;
    return ctx.ravenItems.every(item=>{
      const levels=source[item.name];
      if(!ctx.isPlainObject(levels)) return false;
      return Object.keys(levels).every(key=>{
        const level=Number(key);
        const qty=levels[key];
        return ctx.allItemLevels.map(Number).includes(level) && Number.isInteger(qty) && qty>=0;
      });
    });
  }

  function createEmptyScannerState(){
    return ctx.DomainScanner.createEmptyScannerStateDomain();
  }

  function resetScannerStateInAppState(){
    ctx.DomainScanner.resetScannerStateInAppStateDomain(ctx.state);
  }

  function normalizeScannerInventory(source){
    return normalizeInventory(source);
  }

  function scannerInventoryIsUsable(source){
    const inventory=normalizeInventory(source);
    return isValidInventory(inventory);
  }

  function getBackupFormatVersion(payload){
    return ctx.RavenGearBackupIO.getRavenGearBackupFormatVersion(payload,APP_BACKUP_FORMAT_VERSION);
  }

  function migrateBackupState(rawState, fromVersion){
    return ctx.RavenGearBackupIO.migrateRavenGearBackupState(rawState,fromVersion,{getStateSchemaVersion:ctx.getStateSchemaVersion});
  }

  function buildFullBackupPayload(){
    return ctx.RavenGearBackupIO.buildRavenGearBackupPayload({
      state:ctx.state,
      normalizeStateShape:ctx.normalizeStateShape,
      appVersion:APP_VERSION,
      stateSchemaVersion:ctx.CURRENT_STATE_SCHEMA_VERSION,
      backupVersion:APP_BACKUP_FORMAT_VERSION
    });
  }

  function parseBackupJson(text){
    return ctx.RavenGearBackupIO.parseRavenGearBackupJson(text);
  }

  function normalizeBackupPayload(payload){
    return ctx.RavenGearBackupIO.normalizeRavenGearBackupPayload(payload,{
      baseState:ctx.state,
      normalizeStateShape:ctx.normalizeStateShape,
      maxBackupVersion:APP_BACKUP_FORMAT_VERSION,
      getStateSchemaVersion:ctx.getStateSchemaVersion,
      isUsableActiveInventory:scannerInventoryIsUsable
    });
  }

  function save(){
    ctx.RavenGearBackupIO.saveRavenGearState({
      storageKey:ctx.STORAGE_KEY,
      state:ctx.state,
      normalizeStateShape:ctx.normalizeStateShape
    });
  }

  function exportInventory(){
    ctx.RavenGearBackupIO.exportRavenGearBackup({
      buildBackupPayload:buildFullBackupPayload
    });
  }

  function importInventory(event){
    ctx.RavenGearBackupIO.importRavenGearBackup(event,{
      parseBackupJson,
      normalizeBackupPayload,
      confirmImport:()=>ctx.showConfirmModal({
        title:"Import Backup?",
        message:"This will replace the current Raven Gear data with the backup file.",
        confirmLabel:"Import Backup",
        cancelLabel:"Cancel",
        confirmClass:"primary-btn"
      }),
      replaceStateWithNormalized:ctx.replaceStateWithNormalized,
      resetScannerStateInAppState,
      ensureWhatIfState:ctx.ensureWhatIfState,
      ensureBankObjects:ctx.ensureBankObjects,
      syncChoiceBankFromDerived:ctx.syncChoiceBankFromDerived,
      save,
      renderAll:ctx.renderAll
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
