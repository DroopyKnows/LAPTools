// App v1.0.15 boot module.
// Keeps the existing bundled runtime intact, then delegates bridge/test exports.

import { exposeAppBridge } from "./app-bridge.js";
import { exposeTestExports } from "./test-exports.js";

// App v1.0.13 ES module bundled entry.
// Existing source files are concatenated into one module scope to preserve the old shared runtime while using a module entry point.



// ===== src/data.js =====
// Raven item data, level constants, storage key, and bundle definitions.

const STORAGE_KEY="lastAsylumPlagueToolsRavenGearV1";

const RAVEN_ITEMS=[
  {name:"Heart of Wisdom",side:"left"},
  {name:"Feather of Night",side:"left"},
  {name:"Sharp Beak",side:"left"},
  {name:"Tail of Wind",side:"right"},
  {name:"Attackers Claw",side:"right"},
  {name:"Eye of Perception",side:"right"}
];

const MAX_ITEM_LEVEL=12;
const MAX_CHEST_LEVEL=7;
const ITEM_LEVELS=[12,11,10,9,8,7,6,5,4,3,2,1];
const CHEST_LEVELS=[7,6,5,4,3,2,1];
const DEFAULT_CHEST_LEVELS=[5,4,3,2,1];

// Shared aliases used throughout the app.
const ravenItems=RAVEN_ITEMS;
const allItemLevels=ITEM_LEVELS;
const chestLevels=CHEST_LEVELS;
const chestDefaultLevels=DEFAULT_CHEST_LEVELS;
const guaranteedDefaultLevels=DEFAULT_CHEST_LEVELS;

const topUpBundleDefinitions={
  daily1:{
    title:"Tier 1",
    section:"Daily Must-Buy",
    random:{3:3,1:3},
    choice:{}
  },
  daily2:{
    title:"Tier 2",
    section:"Daily Must-Buy",
    random:{3:6,1:6},
    choice:{}
  },
  weekly:{
    title:"Weekly Special",
    section:"Weekly Special",
    random:{5:1,3:3},
    choice:{5:1}
  }
};


// v1.0.13 module bridge exports
Object.assign(window,{
  CHEST_LEVELS,
  DEFAULT_CHEST_LEVELS,
  ITEM_LEVELS,
  MAX_CHEST_LEVEL,
  MAX_ITEM_LEVEL,
  RAVEN_ITEMS,
  STORAGE_KEY,
  allItemLevels,
  chestDefaultLevels,
  chestLevels,
  guaranteedDefaultLevels,
  ravenItems,
  topUpBundleDefinitions
});



// ===== src/state.js =====
// Central app state. Schema v2 groups related data by feature while preserving
// non-enumerable flat aliases for the existing no-framework render/event code.

const CURRENT_STATE_SCHEMA_VERSION=3;

let mode="specific";
let manualSide="left";
let ravenSubPage="calculator";

const DEFAULT_STATE={
  schemaVersion:CURRENT_STATE_SCHEMA_VERSION,
  calculator:{
    highestGlobalOwned:5,
    plans:{},
    guaranteed:{},
    manualPlan:{},
    manualGuaranteed:{},
    topUpBundles:{},
    perItemTopUpBundles:{},
    manualTopUpBundles:{},
    choiceBank:{},
    choiceBankRedeemed:{},
    manualChoiceBankRedeemed:{},
    quickAdjustRandom:false,
    quickAdjustChoice:false
  },
  inventory:{
    active:{},
    manualOwned:{},
    inputFilter:"all",
    upgradedFilter:"all",
    upgradedViewMode:"combined",
    hideUnacquired:false,
    advancedMode:"breakdown",
    breakdownFilter:"all",
    archiveMode:"active",
    archiveFilter:"all",
    archives:[],
    archiveExpanded:{}
  },
  whatIf:{
    activeTab:"scenarios",
    current:{item:"Heart of Wisdom",targetLevel:7,random:{},choice:{},showHigh:false,baselineMode:"current",savedBaseline:null,previewOpen:false,nontargetBreakdownOpen:false},
    saved:[],
    expandedSnapshots:{}
  },
  settings:{
    hideMoreInformationSections:false,
    hideAdvancedSections:false
  },
  ui:{}
};

function cloneDefaultState(){
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function isPlainObject(value){
  return !!value && typeof value==="object" && !Array.isArray(value);
}

function toSafeInteger(value, fallback=0, min=0, max=Number.MAX_SAFE_INTEGER){
  const number=Number(value);
  if(!Number.isFinite(number)) return fallback;
  return Math.max(min,Math.min(max,Math.floor(number)));
}

function toBoolean(value){
  return value===true || value==="true" || value===1 || value==="1";
}

function cleanString(value, fallback=""){
  if(value===undefined || value===null) return fallback;
  return String(value);
}

function normalizeFilter(value, allowed, fallback){
  return allowed.includes(value) ? value : fallback;
}

function validRavenItemName(name){
  return ravenItems.some(item=>item.name===name) ? name : ravenItems[0].name;
}

function normalizeLevelObject(source, levels=allItemLevels){
  const out={};
  if(!isPlainObject(source)) return out;
  const allowed=new Set(levels.map(Number));
  Object.keys(source).forEach(key=>{
    const level=Number(key);
    if(!allowed.has(level)) return;
    const qty=toSafeInteger(source[key],0,0);
    if(qty>0) out[level]=qty;
  });
  return out;
}

function normalizeBooleanMap(source){
  const out={};
  if(!isPlainObject(source)) return out;
  Object.keys(source).forEach(key=>{
    if(source[key]) out[key]=true;
  });
  return out;
}

function normalizeItemLevelMap(source, levels=allItemLevels){
  const out={};
  ravenItems.forEach(item=>{
    out[item.name]=normalizeLevelObject(isPlainObject(source) ? source[item.name] : {}, levels);
  });
  return out;
}

function normalizeBundleObject(source){
  const out={};
  Object.keys(topUpBundleDefinitions).forEach(key=>{
    const qty=toSafeInteger(isPlainObject(source) ? source[key] : 0,0,0);
    out[key]=qty>0 ? qty : 0;
  });
  return out;
}

function normalizePerItemBundleMap(source){
  const out={};
  ravenItems.forEach(item=>{
    out[item.name]=normalizeBundleObject(isPlainObject(source) ? source[item.name] : {});
  });
  return out;
}

function normalizeChoiceBankObject(source){
  return normalizeLevelObject(source, chestLevels);
}

function normalizeChoiceBankRedeemedMap(source){
  return normalizeItemLevelMap(source, chestLevels);
}

function normalizeWhatIfBaseline(source, fallbackItem){
  if(!isPlainObject(source)) return null;
  const item=validRavenItemName(source.item || fallbackItem || ravenItems[0].name);
  return {
    item,
    starting:normalizeLevelObject(source.starting, allItemLevels),
    combined:normalizeLevelObject(source.combined, allItemLevels),
    fingerprint:cleanString(source.fingerprint,"")
  };
}

function normalizeWhatIfScenario(source){
  const src=isPlainObject(source) ? source : {};
  const item=validRavenItemName(src.item || ravenItems[0].name);
  const baseline=normalizeWhatIfBaseline(src.savedBaseline, item);
  return {
    item,
    targetLevel:toSafeInteger(src.targetLevel,7,1,MAX_ITEM_LEVEL),
    random:normalizeLevelObject(src.random, chestLevels),
    choice:normalizeLevelObject(src.choice, chestLevels),
    showHigh:toBoolean(src.showHigh),
    baselineMode:src.baselineMode==="saved" ? "saved" : "current",
    savedBaseline:baseline,
    previewOpen:toBoolean(src.previewOpen),
    nontargetBreakdownOpen:toBoolean(src.nontargetBreakdownOpen)
  };
}

function normalizeWhatIfSavedEntry(entry, index=0){
  const src=isPlainObject(entry) ? entry : {};
  const scenario=normalizeWhatIfScenario(src.scenario);
  const baseline=normalizeWhatIfBaseline(src.baseline, scenario.item) || normalizeWhatIfBaseline(scenario.savedBaseline, scenario.item);
  if(baseline && !scenario.savedBaseline) scenario.savedBaseline=baseline;
  return {
    id:cleanString(src.id,`scenario-${Date.now()}-${index}`),
    name:cleanString(src.name,"Saved Scenario"),
    note:cleanString(src.note,""),
    savedAt:cleanString(src.savedAt,src.updatedAt || new Date().toISOString()),
    updatedAt:cleanString(src.updatedAt,src.savedAt || new Date().toISOString()),
    scenario,
    baseline,
    preview:isPlainObject(src.preview) ? src.preview : null
  };
}

function normalizeWhatIfState(source){
  const src=isPlainObject(source) ? source : {};
  return {
    activeTab:src.activeTab==="saved" ? "saved" : "scenarios",
    current:normalizeWhatIfScenario(src.current),
    saved:Array.isArray(src.saved) ? src.saved.map(normalizeWhatIfSavedEntry) : [],
    expandedSnapshots:normalizeBooleanMap(src.expandedSnapshots)
  };
}

function normalizeInventoryArchiveEntry(entry, index=0){
  const src=isPlainObject(entry) ? entry : {};
  return {
    id:cleanString(src.id,`archive-${Date.now()}-${index}`),
    name:cleanString(src.name,"Inventory Snapshot"),
    note:cleanString(src.note,""),
    savedAt:cleanString(src.savedAt,src.createdAt || new Date().toISOString()),
    inventory:normalizeItemLevelMap(src.inventory, allItemLevels)
  };
}

function getStateSchemaVersion(source){
  if(!isPlainObject(source)) return 0;
  const raw=source.schemaVersion ?? source.appStateSchemaVersion ?? source.stateSchemaVersion ?? 0;
  return toSafeInteger(raw,0,0,CURRENT_STATE_SCHEMA_VERSION);
}

function normalizeCalculatorState(source){
  const src=isPlainObject(source) ? source : {};
  const legacy=source && !source.calculator ? source : {};
  const bankSource=isPlainObject(src.choiceBank) ? src.choiceBank : (isPlainObject(legacy.choiceBank) ? legacy.choiceBank : legacy.choiceChestBank);
  const choiceBank=normalizeChoiceBankObject(bankSource);
  return {
    highestGlobalOwned:toSafeInteger(src.highestGlobalOwned ?? legacy.highestGlobalOwned,DEFAULT_STATE.calculator.highestGlobalOwned,1,MAX_ITEM_LEVEL),
    plans:normalizeItemLevelMap(src.plans ?? legacy.plans, chestLevels),
    guaranteed:normalizeItemLevelMap(src.guaranteed ?? legacy.guaranteed, chestLevels),
    manualPlan:normalizeLevelObject(src.manualPlan ?? legacy.manualPlan, chestLevels),
    manualGuaranteed:normalizeLevelObject(src.manualGuaranteed ?? legacy.manualGuaranteed, chestLevels),
    topUpBundles:normalizeBundleObject(src.topUpBundles ?? legacy.topUpBundles),
    perItemTopUpBundles:normalizePerItemBundleMap(src.perItemTopUpBundles ?? legacy.perItemTopUpBundles),
    manualTopUpBundles:normalizeBundleObject(src.manualTopUpBundles ?? legacy.manualTopUpBundles),
    choiceBank,
    choiceBankRedeemed:normalizeChoiceBankRedeemedMap(src.choiceBankRedeemed ?? legacy.choiceBankRedeemed),
    manualChoiceBankRedeemed:normalizeChoiceBankObject(src.manualChoiceBankRedeemed ?? legacy.manualChoiceBankRedeemed),
    quickAdjustRandom:toBoolean(src.quickAdjustRandom ?? legacy.quickAdjustRandom),
    quickAdjustChoice:toBoolean(src.quickAdjustChoice ?? legacy.quickAdjustChoice)
  };
}

function normalizeInventoryState(source){
  const src=isPlainObject(source) ? source : {};
  const legacy=source && !source.inventory?.active ? source : {};
  return {
    active:normalizeItemLevelMap(src.active ?? legacy.inventory, allItemLevels),
    manualOwned:normalizeLevelObject(src.manualOwned ?? legacy.manualOwned, allItemLevels),
    inputFilter:normalizeFilter(src.inputFilter ?? legacy.inventoryInputFilter,["all","left","right"],DEFAULT_STATE.inventory.inputFilter),
    upgradedFilter:normalizeFilter(src.upgradedFilter ?? legacy.upgradedOwnedFilter,["all","left","right"],DEFAULT_STATE.inventory.upgradedFilter),
    upgradedViewMode:normalizeFilter(src.upgradedViewMode ?? legacy.upgradedOwnedViewMode,["combined","calculated"],DEFAULT_STATE.inventory.upgradedViewMode),
    hideUnacquired:toBoolean(src.hideUnacquired ?? legacy.hideUnacquiredInventory),
    advancedMode:normalizeFilter(src.advancedMode ?? legacy.inventoryAdvancedMode,["breakdown","audit","summary"],DEFAULT_STATE.inventory.advancedMode),
    breakdownFilter:normalizeFilter(src.breakdownFilter ?? legacy.breakdownInventoryFilter,["all","left","right"],DEFAULT_STATE.inventory.breakdownFilter),
    archiveMode:normalizeFilter(src.archiveMode ?? legacy.inventoryArchiveMode,["active","archived"],DEFAULT_STATE.inventory.archiveMode),
    archiveFilter:normalizeFilter(src.archiveFilter ?? legacy.inventoryArchiveFilter,["all","left","right"],DEFAULT_STATE.inventory.archiveFilter),
    archives:Array.isArray(src.archives ?? legacy.inventoryArchives) ? (src.archives ?? legacy.inventoryArchives).map(normalizeInventoryArchiveEntry) : [],
    archiveExpanded:normalizeBooleanMap(src.archiveExpanded ?? legacy.inventoryArchiveExpanded)
  };
}

function normalizeSettingsState(source){
  const src=isPlainObject(source) ? source : {};
  const legacy=source && !source.settings ? source : {};
  return {
    hideMoreInformationSections:toBoolean(src.hideMoreInformationSections ?? legacy.hideMoreInformationSections),
    hideAdvancedSections:toBoolean(src.hideAdvancedSections ?? legacy.hideAdvancedSections)
  };
}

function normalizeUiState(source){
  return isPlainObject(source) ? JSON.parse(JSON.stringify(source)) : {};
}

function normalizeStateShape(source){
  const src=isPlainObject(source) ? JSON.parse(JSON.stringify(source)) : {};
  const normalized={
    schemaVersion:CURRENT_STATE_SCHEMA_VERSION,
    calculator:normalizeCalculatorState(src.calculator || src),
    inventory:normalizeInventoryState(src.inventory && src.inventory.active ? src.inventory : src),
    whatIf:normalizeWhatIfState(src.whatIf),
    settings:normalizeSettingsState(src.settings || src),
    ui:normalizeUiState(src.ui)
  };
  return attachStateAliases(normalized);
}

function defineAlias(target, name, get, set){
  Object.defineProperty(target,name,{
    configurable:true,
    enumerable:false,
    get,
    set:value=>set(value)
  });
}

function attachStateAliases(target){
  if(!isPlainObject(target.calculator)) target.calculator=cloneDefaultState().calculator;
  if(!isPlainObject(target.inventory)) target.inventory=cloneDefaultState().inventory;
  if(!isPlainObject(target.whatIf)) target.whatIf=cloneDefaultState().whatIf;
  if(!isPlainObject(target.settings)) target.settings=cloneDefaultState().settings;
  if(!isPlainObject(target.ui)) target.ui={};

  defineAlias(target,"highestGlobalOwned",()=>target.calculator.highestGlobalOwned,value=>target.calculator.highestGlobalOwned=toSafeInteger(value,5,1,MAX_ITEM_LEVEL));
  defineAlias(target,"plans",()=>target.calculator.plans,value=>target.calculator.plans=normalizeItemLevelMap(value,chestLevels));
  defineAlias(target,"guaranteed",()=>target.calculator.guaranteed,value=>target.calculator.guaranteed=normalizeItemLevelMap(value,chestLevels));
  defineAlias(target,"manualPlan",()=>target.calculator.manualPlan,value=>target.calculator.manualPlan=normalizeLevelObject(value,chestLevels));
  defineAlias(target,"manualGuaranteed",()=>target.calculator.manualGuaranteed,value=>target.calculator.manualGuaranteed=normalizeLevelObject(value,chestLevels));
  defineAlias(target,"topUpBundles",()=>target.calculator.topUpBundles,value=>target.calculator.topUpBundles=normalizeBundleObject(value));
  defineAlias(target,"perItemTopUpBundles",()=>target.calculator.perItemTopUpBundles,value=>target.calculator.perItemTopUpBundles=normalizePerItemBundleMap(value));
  defineAlias(target,"manualTopUpBundles",()=>target.calculator.manualTopUpBundles,value=>target.calculator.manualTopUpBundles=normalizeBundleObject(value));
  defineAlias(target,"choiceBank",()=>target.calculator.choiceBank,value=>target.calculator.choiceBank=normalizeChoiceBankObject(value));
  defineAlias(target,"choiceChestBank",()=>target.calculator.choiceBank,value=>target.calculator.choiceBank=normalizeChoiceBankObject(value));
  defineAlias(target,"choiceBankRedeemed",()=>target.calculator.choiceBankRedeemed,value=>target.calculator.choiceBankRedeemed=normalizeChoiceBankRedeemedMap(value));
  defineAlias(target,"manualChoiceBankRedeemed",()=>target.calculator.manualChoiceBankRedeemed,value=>target.calculator.manualChoiceBankRedeemed=normalizeChoiceBankObject(value));
  defineAlias(target,"quickAdjustRandom",()=>target.calculator.quickAdjustRandom,value=>target.calculator.quickAdjustRandom=toBoolean(value));
  defineAlias(target,"quickAdjustChoice",()=>target.calculator.quickAdjustChoice,value=>target.calculator.quickAdjustChoice=toBoolean(value));

  defineAlias(target,"manualOwned",()=>target.inventory.manualOwned,value=>target.inventory.manualOwned=normalizeLevelObject(value,allItemLevels));
  defineAlias(target,"inventoryInputFilter",()=>target.inventory.inputFilter,value=>target.inventory.inputFilter=normalizeFilter(value,["all","left","right"],"all"));
  defineAlias(target,"upgradedOwnedFilter",()=>target.inventory.upgradedFilter,value=>target.inventory.upgradedFilter=normalizeFilter(value,["all","left","right"],"all"));
  defineAlias(target,"upgradedOwnedViewMode",()=>target.inventory.upgradedViewMode,value=>target.inventory.upgradedViewMode=normalizeFilter(value,["combined","calculated"],"combined"));
  defineAlias(target,"hideUnacquiredInventory",()=>target.inventory.hideUnacquired,value=>target.inventory.hideUnacquired=toBoolean(value));
  defineAlias(target,"inventoryAdvancedMode",()=>target.inventory.advancedMode,value=>target.inventory.advancedMode=normalizeFilter(value,["breakdown","audit","summary"],"breakdown"));
  defineAlias(target,"breakdownInventoryFilter",()=>target.inventory.breakdownFilter,value=>target.inventory.breakdownFilter=normalizeFilter(value,["all","left","right"],"all"));
  defineAlias(target,"inventoryArchiveMode",()=>target.inventory.archiveMode,value=>target.inventory.archiveMode=normalizeFilter(value,["active","archived"],"active"));
  defineAlias(target,"inventoryArchiveFilter",()=>target.inventory.archiveFilter,value=>target.inventory.archiveFilter=normalizeFilter(value,["all","left","right"],"all"));
  defineAlias(target,"inventoryArchives",()=>target.inventory.archives,value=>target.inventory.archives=Array.isArray(value)?value.map(normalizeInventoryArchiveEntry):[]);
  defineAlias(target,"inventoryArchiveExpanded",()=>target.inventory.archiveExpanded,value=>target.inventory.archiveExpanded=normalizeBooleanMap(value));

  defineAlias(target,"hideMoreInformationSections",()=>target.settings.hideMoreInformationSections,value=>target.settings.hideMoreInformationSections=toBoolean(value));
  defineAlias(target,"hideAdvancedSections",()=>target.settings.hideAdvancedSections,value=>target.settings.hideAdvancedSections=toBoolean(value));

  return target;
}

function replaceStateWithNormalized(source){
  const normalized=normalizeStateShape(source);
  Object.keys(state).forEach(key=>delete state[key]);
  Object.assign(state,normalized);
  attachStateAliases(state);
  return state;
}

function normalizeCurrentState(){
  return replaceStateWithNormalized(state);
}

let state=normalizeStateShape(DEFAULT_STATE);

let choiceBankExpanded=false;


// v1.0.13 module bridge exports
Object.assign(window,{
  CURRENT_STATE_SCHEMA_VERSION,
  DEFAULT_STATE,
  attachStateAliases,
  choiceBankExpanded,
  cleanString,
  cloneDefaultState,
  defineAlias,
  getStateSchemaVersion,
  isPlainObject,
  manualSide,
  mode,
  normalizeBooleanMap,
  normalizeBundleObject,
  normalizeCalculatorState,
  normalizeChoiceBankObject,
  normalizeChoiceBankRedeemedMap,
  normalizeCurrentState,
  normalizeFilter,
  normalizeInventoryArchiveEntry,
  normalizeInventoryState,
  normalizeItemLevelMap,
  normalizeLevelObject,
  normalizePerItemBundleMap,
  normalizeSettingsState,
  normalizeStateShape,
  normalizeUiState,
  normalizeWhatIfBaseline,
  normalizeWhatIfSavedEntry,
  normalizeWhatIfScenario,
  normalizeWhatIfState,
  ravenSubPage,
  replaceStateWithNormalized,
  state,
  toBoolean,
  toSafeInteger,
  validRavenItemName
});



// ===== src/contracts.js =====
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



// ===== src/math-core.js =====
// Math core helpers: current selection, global state access, and common guards.

    function selectedItemName(){
      return document.getElementById("targetItem").value;
    }

    function selectedSide(){
      if(mode==="manual") return manualSide;
      const item=ravenItems.find(x=>x.name===selectedItemName());
      return item ? item.side : "left";
    }

    function probability(){
      return selectedSide()==="left" ? 2/9 : 1/9;
    }

    function visibleOwnedLevels(){
      return allItemLevels.filter(level=>level<=Number(state.highestGlobalOwned||10));
    }

    function currentOwnedObject(){
      if(mode==="specific") return state.inventory.active[selectedItemName()] || {};
      return state.manualOwned;
    }

    function currentPlanObject(){
      if(mode==="specific") return state.plans[selectedItemName()] || {};
      return state.manualPlan;
    }

    function currentGuaranteedObject(){
      if(mode==="specific") return state.guaranteed[selectedItemName()] || {};
      return state.manualGuaranteed;
    }

    function getQty(obj,level){
      return Number((obj||{})[level] || 0);
    }

    function requiredAtLevel(target,level){
      if(target<level) return 0;
      return Math.pow(3,target-level);
    }

    function roundNice(n){
      if(!isFinite(n)||n<=0) return "-";
      if(Math.abs(n-Math.round(n))<.00001) return String(Math.round(n));
      return String(Math.round(n*100)/100);
    }

    function displayWhole(value){
      const n=Math.floor(Number(value||0));
      return n>0 ? String(n) : "-";
    }

    function safeNum(value){
      const n=Number(value || 0);
      return isFinite(n) ? n : 0;
    }

    function shouldShowSide(side, filter){
      return filter==="all" || side===filter;
    }

    function levelObjectHasValues(obj){
      return Object.values(obj||{}).some(v=>Number(v||0)>0);
    }

    function levelsWithValues(obj, levels){
      return levels.filter(level=>Number((obj||{})[level]||0)>0);
    }




// ===== src/math-levels.js =====
// Level-object helpers: rounding, merging, simplifying, and display conversion.

    function equivalentAtLevel(obj,level){
      let total=0;
      Object.keys(obj||{}).forEach(k=>{
        const sourceLevel=Number(k);
        const qty=Number(obj[k]||0);
        if(sourceLevel>=level) total += qty*Math.pow(3,sourceLevel-level);
      });
      return total;
    }

    function equivalentFromHigherAndLower(obj,level){
      let fromHigher=0;
      let lowerRaw=0;

      allItemLevels.forEach(sourceLevel=>{
        const qty=getQty(obj,sourceLevel);
        if(!qty) return;

        if(sourceLevel>=level){
          fromHigher += qty*Math.pow(3,sourceLevel-level);
        }else{
          lowerRaw += qty/Math.pow(3,level-sourceLevel);
        }
      });

      return fromHigher + Math.floor(lowerRaw);
    }

    function excelWholeCount(value){
      const n=Number(value || 0);
      if(!isFinite(n) || n<=0) return 0;
      const whole=Math.floor(n);
      const decimal=n-whole;
      const rounded=decimal>=0.95 ? Math.ceil(n) : whole;
      return rounded>0 ? rounded : 0;
    }

    function excelDisplayWhole(value){
      const rounded=excelWholeCount(value);
      return rounded>0 ? String(rounded) : "-";
    }

    function addToLevelObject(target,level,value){
      target[level]=Math.round((Number(target[level]||0)+Number(value||0))*1000000)/1000000;
    }

    function addWholeToLevelObject(target,level,value){
      const n=Number(value||0);
      if(n>0) target[level]=Number(target[level]||0)+n;
    }

    function simplifyUpByLevel(source){
      const result={};
      let carry=0;

      for(let level=1;level<=MAX_ITEM_LEVEL;level++){
        const total=Number(source[level]||0)+carry;

        if(level===MAX_ITEM_LEVEL){
          if(total>0) result[level]=Math.round(total*1000000)/1000000;
          carry=0;
        }else{
          const upgrades=Math.floor(total/3);
          const remainder=total-upgrades*3;
          if(remainder>0) result[level]=Math.round(remainder*1000000)/1000000;
          carry=upgrades;
        }
      }

      return result;
    }

    function simplifyExcelHelper(source,maxLevel=7){
      const result={};
      let carry=0;

      for(let level=1;level<=maxLevel;level++){
        const total=Number(source[level]||0)+carry;

        if(level===maxLevel){
          result[level]=Math.round(total*1000000)/1000000;
          carry=0;
        }else{
          const upgrades=Math.floor(total/3);
          const remainder=total-upgrades*3;
          result[level]=Math.round(remainder*1000000)/1000000;
          carry=upgrades;
        }
      }

      return result;
    }

    function displayWholeByLevels(source,levels){
      return levels.map(level=>excelDisplayWhole(source[level]));
    }

    function mergedOwnedWithAddtl(owned,addtl){
      const merged={};
      allItemLevels.forEach(level=>{
        const total=getQty(owned,level)+getQty(addtl,level);
        if(total>0) merged[level]=total;
      });
      return merged;
    }

    function addLevelObject(target,level,value){
      target[level]=Math.round((Number(target[level]||0)+Number(value||0))*100)/100;
    }

    function makeSideSummaryText(leftObj,rightObj){
      const leftTotal=Object.values(leftObj||{}).reduce((a,b)=>a+Number(b||0),0);
      const rightTotal=Object.values(rightObj||{}).reduce((a,b)=>a+Number(b||0),0);
      if(leftTotal<=0 && rightTotal<=0) return "-";
      if(leftTotal>0 && rightTotal>0) return "Both";
      return leftTotal>0 ? "Left" : "Right";
    }

    function wholeExpectedFromRandom(qty, p){
      return Math.floor(Number(qty || 0) * p);
    }

    function simplifyWholeByLevel(source){
      const result={};
      let carry=0;
      for(let level=1; level<=MAX_ITEM_LEVEL; level++){
        const total=Math.floor(Number(source[level] || 0) + carry);
        if(level===MAX_ITEM_LEVEL){
          if(total>0) result[level]=(result[level]||0)+total;
          carry=0;
        }else{
          const upgrades=Math.floor(total/3);
          const remainder=total-(upgrades*3);
          if(remainder>0) result[level]=(result[level]||0)+remainder;
          carry=upgrades;
        }
      }
      return result;
    }

    function mergeLevelObjects(){
      const merged={};
      Array.from(arguments).forEach(obj=>{
        Object.keys(obj || {}).forEach(k=>{
          merged[k]=(merged[k] || 0) + Number(obj[k] || 0);
        });
      });
      return merged;
    }

    function calculateOwnedPlusPlanPlusChoice(owned, additionalOwned, guaranteed){
      return mergeLevelObjects(owned || {}, additionalOwned || {}, guaranteed || {});
    }

    function levelObjectEquivalentAtLevel(obj, level){
      let total=0;
      Object.keys(obj || {}).forEach(k=>{
        const sourceLevel=Number(k);
        const qty=Math.floor(Number(obj[k] || 0));
        if(sourceLevel>=level && qty>0){
          total += qty*Math.pow(3, sourceLevel-level);
        }
      });
      return total;
    }

    function excelRoundWhole(value){
      const n=safeNum(value);
      if(n<=0) return 0;
      const whole=Math.floor(n);
      const decimal=n-whole;
      const rounded=decimal>=0.95 ? Math.ceil(n) : whole;
      return rounded>0 ? rounded : 0;
    }

    function simplifyBucketDecimal(rawByLevel){
      const result={};
      let carry=0;
      for(let level=1; level<=MAX_ITEM_LEVEL; level++){
        const total=safeNum(rawByLevel[level]) + carry;
        if(level===MAX_ITEM_LEVEL){
          if(total>0) result[level]=(result[level]||0)+total;
          carry=0;
        }else{
          const upgrades=Math.floor(total/3);
          const remainder=total-(upgrades*3);
          if(remainder>0) result[level]=(result[level]||0)+remainder;
          carry=upgrades;
        }
      }
      return result;
    }

    function displayRowFromSimplified(simplified){
      const display={};
      Object.keys(simplified || {}).forEach(level=>{
        const whole=excelRoundWhole(simplified[level]);
        if(whole>0) display[level]=(display[level]||0)+whole;
      });
      return display;
    }

    function fractionalRemainderFromSimplified(simplified){
      const remainder={};
      Object.keys(simplified || {}).forEach(level=>{
        const value=safeNum(simplified[level]);
        const whole=excelRoundWhole(value);
        const leftover=value-whole;
        if(leftover>0) remainder[level]=(remainder[level]||0)+leftover;
      });
      return remainder;
    }

    function addObjects(target, source){
      Object.keys(source || {}).forEach(level=>{
        target[level]=(target[level]||0)+safeNum(source[level]);
      });
      return target;
    }

    function addDisplayRows(rows){
      const total={};
      rows.forEach(row=>addObjects(total,row));
      return total;
    }

    function valuesFromLevelObject(obj, levels){
      return levels.map(level=>{
        const value=safeNum(obj[level]);
        return value>0 ? String(Math.floor(value)) : "-";
      });
    }

    function levelObjectPlus(a,b){
      const result={};
      Object.keys(a||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(a[levelKey]||0));
        if(value>0) result[level]=(result[level]||0)+value;
      });
      Object.keys(b||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(b[levelKey]||0));
        if(value>0) result[level]=(result[level]||0)+value;
      });
      return result;
    }

    function cloneLevelObject(obj){
      const out={};
      Object.keys(obj||{}).forEach(k=>{
        const value=Number(obj[k]||0);
        if(value>0) out[k]=value;
      });
      return out;
    }

    function addLevelObjects(){
      const result={};
      Array.from(arguments).forEach(obj=>{
        Object.keys(obj||{}).forEach(k=>{
          const value=Number(obj[k]||0);
          if(value>0) result[k]=(result[k]||0)+value;
        });
      });
      return result;
    }

    function convertValuesArrayToLevelObject(levels, values){
      const obj={};
      levels.forEach((level,index)=>{
        const raw=values[index];
        if(raw && raw !== "-"){
          const parsed=Number(String(raw).replace(/[^0-9.-]/g,""));
          if(parsed>0) obj[level]=parsed;
        }
      });
      return obj;
    }

    function levelObjectTotalCount(obj){
      return Object.values(obj||{}).reduce((sum,value)=>sum+Math.floor(Number(value||0)),0);
    }

    function subtractLevelObjects(source, subtractor){
      const result={};

      Object.keys(source||{}).forEach(level=>{
        const value=Math.floor(Number(source[level]||0))-Math.floor(Number((subtractor||{})[level]||0));
        if(value>0) result[level]=value;
      });

      return result;
    }

    function addObjectsRaw(target,source){
      Object.keys(source||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(source[levelKey]||0));
        if(value>0) target[level]=(target[level]||0)+value;
      });
      return target;
    }




// ===== src/math-plans.js =====
// Calculator plan math: target items, remaining requirements, and side totals.

    function targetItemsFromRandomPlan(plan,p){
      const raw={};
      chestLevels.forEach(level=>{
        raw[level]=Math.floor(getQty(plan,level)*p);
      });
      return simplifyUpByLevel(raw);
    }

    function targetItemsFromPlanAndChoice(plan,guaranteed,p){
      const raw={};
      chestLevels.forEach(level=>{
        raw[level]=Math.floor(getQty(plan,level)*p)+getQty(guaranteed,level);
      });
      return simplifyUpByLevel(raw);
    }

    function calculateAdditionalOwnedFromPlan(plan, p){
      const rawWhole={};
      Object.keys(plan || {}).forEach(levelKey=>{
        const level=Number(levelKey);
        const qty=Number(plan[levelKey] || 0);
        if(qty>0){
          const whole=wholeExpectedFromRandom(qty, p);
          if(whole>0) rawWhole[level]=(rawWhole[level] || 0) + whole;
        }
      });
      return simplifyWholeByLevel(rawWhole);
    }

    function buildLeftoverHelperRows(plan, samePerItemProb, oppositePerItemProb){
      const sameRows=[];
      const oppositeRows=[];
      const sameFractionTotals={};
      const oppositeFractionTotals={};

      for(let i=0; i<2; i++){
        const raw={};
        chestLevels.forEach(level=>{
          const qty=safeNum(plan[level]);
          if(qty>0) raw[level]=qty*samePerItemProb;
        });
        const simplified=simplifyBucketDecimal(raw);
        const display=displayRowFromSimplified(simplified);
        const fractions=fractionalRemainderFromSimplified(simplified);
        sameRows.push(display);
        addObjects(sameFractionTotals,fractions);
      }

      const sameRemainderDisplay=displayRowFromSimplified(simplifyBucketDecimal(sameFractionTotals));
      sameRows.push(sameRemainderDisplay);

      for(let i=0; i<3; i++){
        const raw={};
        chestLevels.forEach(level=>{
          const qty=safeNum(plan[level]);
          if(qty>0) raw[level]=qty*oppositePerItemProb;
        });
        const simplified=simplifyBucketDecimal(raw);
        const display=displayRowFromSimplified(simplified);
        const fractions=fractionalRemainderFromSimplified(simplified);
        oppositeRows.push(display);
        addObjects(oppositeFractionTotals,fractions);
      }

      const oppositeRemainderDisplay=displayRowFromSimplified(simplifyBucketDecimal(oppositeFractionTotals));
      oppositeRows.push(oppositeRemainderDisplay);

      return {
        sameRows,
        oppositeRows,
        sameTotal:addDisplayRows(sameRows),
        oppositeTotal:addDisplayRows(oppositeRows),
        allTotal:addDisplayRows([...sameRows,...oppositeRows])
      };
    }

    function rawRandomSideTotals(plan, selectedSideValue){
      const left={};
      const right={};
      chestLevels.forEach(level=>{
        const qty=safeNum(plan[level]);
        if(qty<=0) return;

        if(selectedSideValue==="left"){
          // Target item is left. Left leftovers are the other 2 left items (2/9 each);
          // right leftovers are the 3 right items (1/9 each).
          left[level]=(left[level]||0)+excelRoundWhole(qty*(4/9));
          right[level]=(right[level]||0)+excelRoundWhole(qty*(3/9));
        }else{
          // Target item is right. Right leftovers are the other 2 right items (1/9 each);
          // left leftovers are the 3 left items (2/9 each).
          right[level]=(right[level]||0)+excelRoundWhole(qty*(2/9));
          left[level]=(left[level]||0)+excelRoundWhole(qty*(6/9));
        }
      });
      return {left,right};
    }

    function calculateAdditionalOwnedFromPlanExcludingLevel(plan, p, excludedLevel){
      const rawWhole={};
      Object.keys(plan || {}).forEach(levelKey=>{
        const level=Number(levelKey);
        if(level===Number(excludedLevel)) return;
        const qty=Number(plan[levelKey] || 0);
        if(qty>0){
          const whole=Math.floor(qty * p);
          if(whole>0) rawWhole[level]=(rawWhole[level] || 0) + whole;
        }
      });
      return simplifyWholeByLevel(rawWhole);
    }

    function deterministicSideTotalsFromRandomPlan(plan){
      const left={};
      const right={};

      chestLevels.forEach(level=>{
        const qty=Math.floor(Number(plan[level]||0));
        if(qty<=0) return;

        const leftQty=Math.round(qty*(2/3));
        const rightQty=qty-leftQty;

        if(leftQty>0) left[level]=(left[level]||0)+leftQty;
        if(rightQty>0) right[level]=(right[level]||0)+rightQty;
      });

      return {left,right};
    }

    function targetItemsRawFromRandomPlan(plan,p){
      const target={};

      chestLevels.forEach(level=>{
        const qty=Math.floor(Number(plan[level]||0));
        if(qty<=0) return;

        const targetQty=Math.floor(qty*p);
        if(targetQty>0) target[level]=(target[level]||0)+targetQty;
      });

      return target;
    }

    function nontargetSideTotalsFromRandomPlan(plan,side,p){
      const sideTotals=deterministicSideTotalsFromRandomPlan(plan);
      const targetRaw=targetItemsRawFromRandomPlan(plan,p);

      if(side==="left"){
        return {
          left:subtractLevelObjects(sideTotals.left,targetRaw),
          right:sideTotals.right
        };
      }

      return {
        left:sideTotals.left,
        right:subtractLevelObjects(sideTotals.right,targetRaw)
      };
    }

    function calculateAdditionalOwnedFromPlanAndChoice(plan, guaranteed, p){
      const rawWhole={};

      Object.keys(plan || {}).forEach(levelKey=>{
        const level=Number(levelKey);
        const qty=Number(plan[levelKey] || 0);
        if(qty>0){
          const whole=Math.floor(qty * p);
          if(whole>0) rawWhole[level]=(rawWhole[level] || 0) + whole;
        }
      });

      Object.keys(guaranteed || {}).forEach(levelKey=>{
        const level=Number(levelKey);
        const qty=Math.floor(Number(guaranteed[levelKey] || 0));
        if(qty>0){
          rawWhole[level]=(rawWhole[level] || 0) + qty;
        }
      });

      return simplifyWholeByLevel(rawWhole);
    }

    function rawTargetAdditionsFromPlanAndChoice(plan, guaranteed, p){
      const rawWhole={};

      Object.keys(plan || {}).forEach(levelKey=>{
        const level=Number(levelKey);
        const qty=Math.floor(Number(plan[levelKey] || 0));
        if(qty>0){
          const whole=Math.floor(qty * p);
          if(whole>0) rawWhole[level]=(rawWhole[level] || 0) + whole;
        }
      });

      Object.keys(guaranteed || {}).forEach(levelKey=>{
        const level=Number(levelKey);
        const qty=Math.floor(Number(guaranteed[levelKey] || 0));
        if(qty>0){
          rawWhole[level]=(rawWhole[level] || 0) + qty;
        }
      });

      return rawWhole;
    }

    function calculateEffectiveOwnedForRemainingItems(owned, plan, guaranteed, p){
      const rawCombined={};

      Object.keys(owned || {}).forEach(levelKey=>{
        const level=Number(levelKey);
        const qty=Math.floor(Number(owned[levelKey] || 0));
        if(qty>0){
          rawCombined[level]=(rawCombined[level] || 0) + qty;
        }
      });

      const rawAdditions=rawTargetAdditionsFromPlanAndChoice(plan, guaranteed, p);
      Object.keys(rawAdditions || {}).forEach(levelKey=>{
        const level=Number(levelKey);
        const qty=Math.floor(Number(rawAdditions[levelKey] || 0));
        if(qty>0){
          rawCombined[level]=(rawCombined[level] || 0) + qty;
        }
      });

      return simplifyWholeByLevel(rawCombined);
    }

    function rawTargetAdditionsFromPlanExcludingLevel(plan, p, excludedLevel){
      const rawWhole={};
      Object.keys(plan || {}).forEach(levelKey=>{
        const level=Number(levelKey);
        if(level===Number(excludedLevel)) return;
        const qty=Math.floor(Number(plan[levelKey] || 0));
        if(qty>0){
          const whole=Math.floor(qty * p);
          if(whole>0) rawWhole[level]=(rawWhole[level] || 0) + whole;
        }
      });
      return rawWhole;
    }

    function calculateEffectiveOwnedForRemainingChestColumn(owned, plan, guaranteed, p, excludedLevel){
      const rawCombined={};

      addObjectsRaw(rawCombined,owned || {});
      addObjectsRaw(rawCombined,rawTargetAdditionsFromPlanExcludingLevel(plan,p,excludedLevel));
      addObjectsRaw(rawCombined,guaranteed || {});

      return simplifyWholeByLevel(rawCombined);
    }

    function rawTargetFromRandomPlan(plan,p){
      const raw={};
      chestLevels.forEach(level=>{
        const qty=Math.floor(Number((plan||{})[level]||0));
        const earned=Math.floor(qty*p);
        if(earned>0) raw[level]=(raw[level]||0)+earned;
      });
      return raw;
    }

    function rawChoiceObject(choiceObj){
      const raw={};
      Object.keys(choiceObj||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const qty=Math.floor(Number(choiceObj[levelKey]||0));
        if(qty>0) raw[level]=(raw[level]||0)+qty;
      });
      return raw;
    }

    function finalBreakdownContribution(outputs){
      const raw={};
      addObjectsRaw(raw,(outputs && outputs.rawTargetRandom) || {});
      addObjectsRaw(raw,(outputs && outputs.rawManualChoice) || {});
      addObjectsRaw(raw,(outputs && outputs.rawRedeemedChoice) || {});
      return simplifyUpByLevel(raw);
    }




// ===== src/math-bundles.js =====
// Top Up Bundle and Choice Chest Bank math helpers.

    function bundleRandomTotals(){
      if(typeof bundleTotals!=="function") return {};
      return bundleTotals().random || {};
    }

    function activeRandomPlanObject(){
      return levelObjectPlus(currentPlanObject(),bundleRandomTotals());
    }

    function bundleTotalsForObject(bundleObj){
      const random={};
      const choice={};
      Object.keys(topUpBundleDefinitions).forEach(key=>{
        const qty=Math.floor(Number((bundleObj||{})[key]||0));
        if(qty<=0) return;
        const def=topUpBundleDefinitions[key];
        Object.keys(def.random||{}).forEach(levelKey=>{
          const level=Number(levelKey);
          const amount=Math.floor(Number(def.random[levelKey]||0)*qty);
          if(amount>0) random[level]=(random[level]||0)+amount;
        });
        Object.keys(def.choice||{}).forEach(levelKey=>{
          const level=Number(levelKey);
          const amount=Math.floor(Number(def.choice[levelKey]||0)*qty);
          if(amount>0) choice[level]=(choice[level]||0)+amount;
        });
      });
      return {random,choice};
    }

    function bundleTotals(){
      return bundleTotalsForObject(currentTopUpBundleObject());
    }

    function manualTopUpChoiceObject(){
      return mode==="manual" ? (bundleTotals().choice || {}) : {};
    }

    function totalChoiceObject(){
      if(mode==="manual"){
        return levelObjectPlus(currentGuaranteedObject(),manualTopUpChoiceObject());
      }
      return levelObjectPlus(currentGuaranteedObject(),currentBankRedeemedAsChoiceSource());
    }

    function currentChoiceBankEarnedHere(level){
      if(mode==="manual") return 0;
      const choice=(bundleTotals().choice || {});
      return Math.max(0,Math.floor(Number(choice[level]||0)));
    }

    function topUpBundleObjectForItem(itemName){
      if(state.perItemTopUpBundles && state.perItemTopUpBundles[itemName]){
        return state.perItemTopUpBundles[itemName];
      }
      return {};
    }

    function bundleTotalsForItem(itemName){
      if(typeof bundleTotalsForObject==="function"){
        return bundleTotalsForObject(topUpBundleObjectForItem(itemName));
      }
      return {random:{},choice:{}};
    }




// ===== src/math-inventory.js =====
// Inventory projection/allocation math and raw audit model helpers.

    function itemsBySide(side){
      return ravenItems.filter(item=>item.side===side).map(item=>item.name);
    }

    function otherItemsOnSide(side, selectedName){
      return itemsBySide(side).filter(name=>name!==selectedName);
    }

    function buildAllocatedLeftoverObjects(plan, selectedSideValue){
      // Returns per-side arrays of item-bucket objects, using the same same/opposite split basis
      // used by the calculator's side leftover sections.
      const samePerItemProb = selectedSideValue === "left" ? 2/9 : 1/9;
      const oppositePerItemProb = selectedSideValue === "left" ? 1/9 : 2/9;

      const sameBuckets=[];
      const oppositeBuckets=[];

      for(let i=0;i<2;i++){
        const raw={};
        chestLevels.forEach(level=>{
          const qty=Number(plan[level]||0);
          if(qty>0) raw[level]=qty*samePerItemProb;
        });
        const simplified=simplifyBucketDecimal ? simplifyBucketDecimal(raw) : simplifyUpByLevel(raw);
        const display=displayRowFromSimplified ? displayRowFromSimplified(simplified) : simplifyWholeByLevel(raw);
        sameBuckets.push(display);
      }

      for(let i=0;i<3;i++){
        const raw={};
        chestLevels.forEach(level=>{
          const qty=Number(plan[level]||0);
          if(qty>0) raw[level]=qty*oppositePerItemProb;
        });
        const simplified=simplifyBucketDecimal ? simplifyBucketDecimal(raw) : simplifyUpByLevel(raw);
        const display=displayRowFromSimplified ? displayRowFromSimplified(simplified) : simplifyWholeByLevel(raw);
        oppositeBuckets.push(display);
      }

      if(selectedSideValue==="left"){
        return { leftBuckets:sameBuckets, rightBuckets:oppositeBuckets };
      }
      return { leftBuckets:oppositeBuckets, rightBuckets:sameBuckets };
    }

    function allocatePoolToItems(pool,itemNames){
      const allocatedByItem={};
      const leftover={};
      const divisor=Math.max(1,itemNames.length);

      itemNames.forEach(name=>allocatedByItem[name]={});

      Object.keys(pool||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(pool[levelKey]||0));
        if(value<=0) return;

        const each=Math.floor(value/divisor);
        const rem=value % divisor;

        if(each>0){
          itemNames.forEach(name=>{
            allocatedByItem[name][level]=(allocatedByItem[name][level]||0)+each;
          });
        }
        if(rem>0) leftover[level]=(leftover[level]||0)+rem;
      });

      return {allocatedByItem,leftover};
    }

    function getCombinedRandomChests(rawPlan){
      if(!rawPlan || !rawPlan.randomChests) return {};
      return addLevelObjects(rawPlan.randomChests.manual || {}, rawPlan.randomChests.topUp || {});
    }

    function getCombinedChoiceChests(rawPlan){
      if(!rawPlan || !rawPlan.choiceChests) return {};
      return addLevelObjects(rawPlan.choiceChests.manual || {}, rawPlan.choiceChests.redeemed || {});
    }

    function getRandomTargetDuplicatesForPlan(rawPlan){
      if(!rawPlan) return {};
      const item=ravenItems.find(x=>x.name===rawPlan.sourceItem);
      if(!item) return {};
      const p=item.side==="left" ? 2/9 : 1/9;
      return rawTargetFromRandomPlan(getCombinedRandomChests(rawPlan),p);
    }

    function computeRawItemPlan(itemName){
      const item=ravenItems.find(x=>x.name===itemName);
      if(!item){
        return null;
      }

      const currentInventory=cloneLevelObject((state.inventory.active && state.inventory.active[itemName]) || {});
      const randomManual=cloneLevelObject((state.plans && state.plans[itemName]) || {});
      const bundleTotals=bundleTotalsForItem(itemName);
      const randomTopUp=cloneLevelObject((bundleTotals && bundleTotals.random) || {});
      const randomCombined=addLevelObjects(randomManual,randomTopUp);

      const choiceManual=cloneLevelObject((state.guaranteed && state.guaranteed[itemName]) || {});
      const choiceRedeemed=cloneLevelObject((state.choiceBankRedeemed && state.choiceBankRedeemed[itemName]) || {});

      const p=item.side==="left" ? 2/9 : 1/9;

      const randomTargetTotal=rawTargetFromRandomPlan(randomCombined,p);

      const targetDuplicates={
        random:randomTargetTotal,
        choiceManual:rawChoiceObject(choiceManual),
        choiceRedeemed:rawChoiceObject(choiceRedeemed)
      };

      const randomSideGenerated=deterministicSideTotalsFromRandomPlan(randomCombined);

      const nontargetPools={
        left:item.side==="left" ? subtractLevelObjects(randomSideGenerated.left,randomTargetTotal) : cloneLevelObject(randomSideGenerated.left),
        right:item.side==="right" ? subtractLevelObjects(randomSideGenerated.right,randomTargetTotal) : cloneLevelObject(randomSideGenerated.right)
      };

      const sameSideItemNames=otherItemsOnSide(item.side,itemName);
      const oppositeSide=item.side==="left" ? "right" : "left";
      const oppositeSideItemNames=itemsBySide(oppositeSide);

      const sameAllocation=allocatePoolToItems(nontargetPools[item.side] || {},sameSideItemNames);
      const oppositeAllocation=allocatePoolToItems(nontargetPools[oppositeSide] || {},oppositeSideItemNames);

      const randomItemsLeftover={left:{},right:{}};
      randomItemsLeftover[item.side]=sameAllocation.leftover || {};
      randomItemsLeftover[oppositeSide]=oppositeAllocation.leftover || {};

      const assignedNontargetByItem={};
      Object.keys(sameAllocation.allocatedByItem||{}).forEach(name=>{
        assignedNontargetByItem[name]=addLevelObjects(assignedNontargetByItem[name]||{},sameAllocation.allocatedByItem[name]);
      });
      Object.keys(oppositeAllocation.allocatedByItem||{}).forEach(name=>{
        assignedNontargetByItem[name]=addLevelObjects(assignedNontargetByItem[name]||{},oppositeAllocation.allocatedByItem[name]);
      });

      const rawRandomChestCount=levelObjectTotalCount(randomCombined);
      const generatedCount=levelObjectTotalCount(randomSideGenerated.left)+levelObjectTotalCount(randomSideGenerated.right);
      const targetRandomCount=levelObjectTotalCount(randomTargetTotal);
      const nontargetCount=levelObjectTotalCount(nontargetPools.left)+levelObjectTotalCount(nontargetPools.right);
      const allocatedCount=Object.values(assignedNontargetByItem).reduce((sum,obj)=>sum+levelObjectTotalCount(obj),0);
      const leftoverCount=levelObjectTotalCount(randomItemsLeftover.left)+levelObjectTotalCount(randomItemsLeftover.right);

      return {
        sourceItem:itemName,
        sourceSide:item.side,
        currentInventory,
        randomChests:{
          manual:randomManual,
          topUp:randomTopUp
        },
        choiceChests:{
          manual:choiceManual,
          redeemed:choiceRedeemed
        },
        targetDuplicates,
        randomSideGenerated,
        nontargetPools,
        allocation:{
          sameSide:{
            side:item.side,
            appliesTo:sameSideItemNames,
            allocatedByItem:sameAllocation.allocatedByItem || {},
            leftover:sameAllocation.leftover || {}
          },
          oppositeSide:{
            side:oppositeSide,
            appliesTo:oppositeSideItemNames,
            allocatedByItem:oppositeAllocation.allocatedByItem || {},
            leftover:oppositeAllocation.leftover || {}
          }
        },
        assignedNontargetByItem,
        randomItemsLeftover,
        audit:{
          randomChestCount:rawRandomChestCount,
          generatedCount,
          targetRandomCount,
          nontargetCount,
          allocatedCount,
          leftoverCount,
          balances:rawRandomChestCount===generatedCount && generatedCount===(targetRandomCount+nontargetCount) && nontargetCount===(allocatedCount+leftoverCount)
        }
      };
    }

    function computeAllRawItemPlans(){
      return ravenItems.map(item=>computeRawItemPlan(item.name)).filter(Boolean);
    }

    function targetDuplicatesForPlanRaw(rawPlan){
      if(!rawPlan || !rawPlan.targetDuplicates) return {};
      return addLevelObjects(
        rawPlan.targetDuplicates.random || getRandomTargetDuplicatesForPlan(rawPlan),
        rawPlan.targetDuplicates.choiceManual || {},
        rawPlan.targetDuplicates.choiceRedeemed || {}
      );
    }

    function calculatedItemPlanInventoryRawFromPlan(rawPlan){
      if(!rawPlan) return {};
      return addLevelObjects(rawPlan.currentInventory || {}, targetDuplicatesForPlanRaw(rawPlan));
    }

    function duplicatesFromOtherRawPlans(itemName,excludeSourceName){
      const total={};
      computeAllRawItemPlans().forEach(plan=>{
        if(!plan || plan.sourceItem===excludeSourceName) return;
        const assigned=(plan.assignedNontargetByItem && plan.assignedNontargetByItem[itemName]) || {};
        addObjects(total,assigned);
      });
      return total;
    }

    function duplicateContributionDetailsForItem(itemName,excludeSourceName){
      const details=[];
      computeAllRawItemPlans().forEach(plan=>{
        if(!plan || plan.sourceItem===excludeSourceName) return;
        const assigned=(plan.assignedNontargetByItem && plan.assignedNontargetByItem[itemName]) || {};
        if(levelObjectHasValues(assigned)){
          details.push({sourceItem:plan.sourceItem, values:assigned});
        }
      });
      return details;
    }

    function computePlanOutputsForItem(itemName){
      const rawPlan=computeRawItemPlan(itemName);
      if(!rawPlan) return {
        additionalOwned:{},
        rawTargetRandom:{},
        rawManualChoice:{},
        rawRedeemedChoice:{},
        rawChoice:{},
        rawAssignedLeft:{},
        rawAssignedRight:{},
        leftBuckets:[],
        rightBuckets:[],
        randomLeft:{},
        randomRight:{},
        manualRandom:{},
        topUpRandom:{},
        combinedRandom:{},
        rawPlan:null
      };

      const rawTargetRandom=rawPlan.targetDuplicates.random || getRandomTargetDuplicatesForPlan(rawPlan);
      const rawManualChoice=rawPlan.targetDuplicates.choiceManual || {};
      const rawRedeemedChoice=rawPlan.targetDuplicates.choiceRedeemed || {};
      const rawChoice=addLevelObjects(rawManualChoice,rawRedeemedChoice);
      const additionalOwned=simplifyUpByLevel(targetDuplicatesForPlanRaw(rawPlan));

      const rawAssignedLeft={};
      const rawAssignedRight={};
      Object.keys(rawPlan.assignedNontargetByItem || {}).forEach(itemNameKey=>{
        const item=ravenItems.find(x=>x.name===itemNameKey);
        if(!item) return;
        if(item.side==="left") addObjectsRaw(rawAssignedLeft,rawPlan.assignedNontargetByItem[itemNameKey]);
        if(item.side==="right") addObjectsRaw(rawAssignedRight,rawPlan.assignedNontargetByItem[itemNameKey]);
      });

      return {
        additionalOwned,
        rawTargetRandom,
        rawManualChoice,
        rawRedeemedChoice,
        rawChoice,
        rawAssignedLeft,
        rawAssignedRight,
        leftBuckets:Object.keys(rawPlan.allocation.sameSide.side==="left" ? rawPlan.allocation.sameSide.allocatedByItem : rawPlan.allocation.oppositeSide.allocatedByItem).map(name=>(rawPlan.allocation.sameSide.side==="left" ? rawPlan.allocation.sameSide.allocatedByItem[name] : rawPlan.allocation.oppositeSide.allocatedByItem[name])),
        rightBuckets:Object.keys(rawPlan.allocation.sameSide.side==="right" ? rawPlan.allocation.sameSide.allocatedByItem : rawPlan.allocation.oppositeSide.allocatedByItem).map(name=>(rawPlan.allocation.sameSide.side==="right" ? rawPlan.allocation.sameSide.allocatedByItem[name] : rawPlan.allocation.oppositeSide.allocatedByItem[name])),
        randomLeft:rawPlan.nontargetPools.left || {},
        randomRight:rawPlan.nontargetPools.right || {},
        manualRandom:rawPlan.randomChests.manual || {},
        topUpRandom:rawPlan.randomChests.topUp || {},
        combinedRandom:getCombinedRandomChests(rawPlan),
        rawPlan
      };
    }

    function projectedAdditionsForInventoryItem(inventoryItemName){
      const total={};

      computeAllRawItemPlans().forEach(plan=>{
        if(!plan) return;
        if(plan.sourceItem===inventoryItemName){
          addObjects(total,targetDuplicatesForPlanRaw(plan));
        }
        addObjects(total,(plan.assignedNontargetByItem && plan.assignedNontargetByItem[inventoryItemName]) || {});
      });

      return total;
    }

    function projectedOwnedForInventoryItem(itemName){
      return addLevelObjects((state.inventory.active && state.inventory.active[itemName]) || {}, projectedAdditionsForInventoryItem(itemName));
    }

    function totalRandomLeftoversBySide(side){
      const total={};
      computeAllRawItemPlans().forEach(plan=>{
        addObjects(total,(plan.randomItemsLeftover && plan.randomItemsLeftover[side]) || {});
      });
      return total;
    }

    function rawAcquiredForInventoryItem(inventoryItemName){
      const total={};
      const targetItem=ravenItems.find(x=>x.name===inventoryItemName);
      if(!targetItem) return total;

      ravenItems.forEach(sourceItem=>{
        const sourceName=sourceItem.name;
        const outputs=computePlanOutputsForItem(sourceName);

        if(sourceName===inventoryItemName){
          addObjectsRaw(total,outputs.rawTargetRandom || {});
          addObjectsRaw(total,outputs.rawManualChoice || {});
          addObjectsRaw(total,outputs.rawRedeemedChoice || {});
        }

        if(targetItem.side==="left" && Array.isArray(outputs.leftBuckets)){
          outputs.leftBuckets.forEach(bucket=>addObjectsRaw(total,bucket));
        }
        if(targetItem.side==="right" && Array.isArray(outputs.rightBuckets)){
          outputs.rightBuckets.forEach(bucket=>addObjectsRaw(total,bucket));
        }
      });

      return total;
    }

    function combinedInventoryForItem(itemName){
      return addLevelObjects(
        (state.inventory.active && state.inventory.active[itemName]) || {},
        projectedAdditionsForInventoryItem(itemName)
      );
    }




// ===== src/math.js =====
// Legacy math entrypoint. Math helpers are split across math-core.js, math-levels.js, math-plans.js, math-bundles.js, and math-inventory.js.



// ===== src/storage.js =====
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



// ===== src/ui-components.js =====
// Shared UI rendering helpers.
// These helpers keep repeated app patterns consistent without changing app behavior.


function uiEscapeAttr(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/"/g,"&quot;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}

function uiSplitActionArgs(source){
  const args=[];
  let current="";
  let quote=null;
  let depth=0;
  for(let i=0;i<String(source||"").length;i++){
    const ch=source[i];
    const prev=source[i-1];
    if(quote){
      current+=ch;
      if(ch===quote && prev!=="\\") quote=null;
      continue;
    }
    if(ch==="'" || ch==='"' || ch==='`'){
      quote=ch;
      current+=ch;
      continue;
    }
    if(ch==="(" || ch==="[" || ch==="{") depth++;
    if(ch===")" || ch==="]" || ch==="}") depth=Math.max(0,depth-1);
    if(ch==="," && depth===0){
      args.push(current.trim());
      current="";
      continue;
    }
    current+=ch;
  }
  if(current.trim()) args.push(current.trim());
  return args;
}

function uiActionArgAttrs(args){
  return (args || []).map((arg,index)=>{
    const value=String(arg || "").trim();
    if(value==="this.value") return ` data-source${index}="value"`;
    if(value==="this.checked") return ` data-source${index}="checked"`;
    if(value==="event") return ` data-source${index}="event"`;
    if(value==="this") return ` data-source${index}="element"`;
    const quoted=(value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"')) || (value.startsWith('`') && value.endsWith('`'));
    const clean=quoted ? value.slice(1,-1) : value;
    const typeAttr=quoted ? ` data-arg${index}-type="string"` : "";
    return ` data-arg${index}="${uiEscapeAttr(clean)}"${typeAttr}`;
  }).join("");
}

function renderActionAttrs(action,eventType){
  const evt=eventType || "click";
  if(!action) return "";
  if(typeof action==="object"){
    const args=(action.args || []).map((arg,index)=>` data-arg${index}="${uiEscapeAttr(arg)}"`).join("");
    return ` data-action="${uiEscapeAttr(action.name || action.action || "")}" data-action-event="${evt}"${args}`;
  }
  const source=String(action).trim().replace(/;$/g,"");
  if(source==="document.getElementById('importFile').click()" || source==='document.getElementById("importFile").click()'){
    return ` data-action="openImportFile" data-action-event="${evt}"`;
  }
  const showClose=source.match(/^showPage\((.*)\);\s*closeGlobalMenu\(\)$/);
  if(showClose){
    const page=showClose[1].trim().replace(/^['"`]|['"`]$/g,"");
    return ` data-action="navigateAndCloseMenu" data-action-event="${evt}" data-page="${uiEscapeAttr(page)}"`;
  }
  const match=source.match(/^([A-Za-z_$][\w$]*)\((.*)\)$/);
  if(match){
    const name=match[1];
    const args=match[2].trim() ? uiSplitActionArgs(match[2]) : [];
    return ` data-action="${uiEscapeAttr(name)}" data-action-event="${evt}"${uiActionArgAttrs(args)}`;
  }
  return ` data-action="${uiEscapeAttr(source)}" data-action-event="${evt}"`;
}

function uiNumber(value){
  return Math.floor(Number(value || 0));
}

function uiLevelsWithPositiveValues(obj, levels){
  return (levels || []).filter(level=>uiNumber((obj || {})[level]) > 0);
}

function renderLevelPillGrid(obj, options){
  const cfg=Object.assign({
    levels: (typeof allItemLevels!=="undefined" ? allItemLevels : []),
    gridClass: "compact-readout-grid",
    pillClass: "compact-readout-cell",
    levelClass: "th",
    qtyClass: "td",
    emptyHtml: "",
    transform: null,
    valueFormatter: value=>String(typeof roundNice==="function" ? roundNice(value) : value),
    includeZero: false
  }, options || {});
  const source=cfg.transform ? cfg.transform(obj || {}) : (obj || {});
  const shown=(cfg.levels || []).filter(level=>{
    const value=uiNumber(source[level]);
    return cfg.includeZero ? value!==0 : value>0;
  });
  if(!shown.length) return cfg.emptyHtml || "";
  return `
    <div class="${cfg.gridClass}">
      ${shown.map(level=>{
        const value=uiNumber(source[level]);
        const extraClass=typeof cfg.cellClassForValue==="function" ? cfg.cellClassForValue(value, level) : "";
        return `<div class="${cfg.pillClass}${extraClass ? ` ${extraClass}` : ""}"><div class="${cfg.levelClass}">L${level}</div><div class="${cfg.qtyClass}">${cfg.valueFormatter(value, level)}</div></div>`;
      }).join("")}
    </div>
  `;
}

function renderCompactInventoryRows(rows, options){
  const cfg=Object.assign({
    wrapperClass: "scenario-compact-view",
    rowClass: "scenario-compact-row",
    labelClass: "scenario-compact-label",
    valuesClass: "scenario-compact-values",
    emptyHtml: '<div class="empty-message mini-empty">None</div>',
    pillRenderer: obj=>renderLevelPillGrid(obj, {levels: (typeof allItemLevels!=="undefined" ? allItemLevels : []), emptyHtml: '<div class="empty-message mini-empty">None</div>'})
  }, options || {});
  return `<div class="${cfg.wrapperClass}">${(rows || []).map(row=>`
    <div class="${cfg.rowClass}">
      <div class="${cfg.labelClass}">${row.label}</div>
      <div class="${cfg.valuesClass}">${cfg.pillRenderer(row.obj || {}, row) || cfg.emptyHtml}</div>
    </div>
  `).join("")}</div>`;
}

function renderFilterTabs(options){
  const cfg=Object.assign({
    active: "all",
    values: ["left", "right", "all"],
    labels: {left:"Left", right:"Right", all:"All"},
    setter: "",
    idPrefix: "",
    wrapperClass: "side-filter-tabs compact",
    buttonClass: "tab"
  }, options || {});
  return `<div class="${cfg.wrapperClass}">
    ${cfg.values.map(value=>`<button ${cfg.idPrefix ? `id="${cfg.idPrefix}-${value}"` : ""} class="${cfg.buttonClass} ${cfg.active===value ? "active" : ""}" data-action="${cfg.setter}" data-action-event="click" data-arg0="${value}">${cfg.labels[value] || value}</button>`).join("")}
  </div>`;
}

function renderSoftChipButtons(buttons, options){
  const cfg=Object.assign({wrapperClass:"home-mini-actions home-soft-chips", buttonClass:""}, options || {});
  return `<div class="${cfg.wrapperClass}">
    ${(buttons || []).map(btn=>`<button type="button"${cfg.buttonClass ? ` class="${cfg.buttonClass}"` : ""}${renderActionAttrs(btn.action || btn.onclick,"click")}>${btn.label}</button>`).join("")}
  </div>`;
}

function renderSideBadge(side){
  const normalized=String(side || "left").toLowerCase();
  const badgeClass=normalized==="right" ? "side-badge right" : "side-badge";
  return `<div class="${badgeClass}">${normalized.toUpperCase()}</div>`;
}

function renderUiActions(buttons, options){
  const cfg=Object.assign({wrapperClass:"saved-scenario-actions", stopPropagation:true}, options || {});
  if(!buttons || !buttons.length) return "";
  return `<div class="${cfg.wrapperClass}"${cfg.stopPropagation ? ' data-stop-propagation="true"' : ""}>
    ${buttons.map(btn=>`<button class="${btn.className || "ghost-btn"}"${renderActionAttrs(btn.action || btn.onclick,"click")}>${btn.label}</button>`).join("")}
  </div>`;
}

function renderCompactActionCard(config){
  const cfg=Object.assign({
    className:"saved-scenario-card compact-saved-card",
    expanded:false,
    onclick:"",
    title:"",
    subtitle:"",
    note:"",
    meta:"",
    actions:[],
    dropdownHtml:"",
    dropdownClass:"saved-snapshot-dropdown"
  }, config || {});
  const expandedClass=cfg.expanded ? "open" : "";
  const onclickAttr=cfg.onclick ? renderActionAttrs(cfg.action || cfg.onclick,"click") : "";
  return `<div class="${cfg.className} ${expandedClass}"${onclickAttr}>
    <div class="saved-scenario-top">
      <div class="saved-scenario-main">
        <div class="saved-scenario-title">${cfg.title}</div>
        ${cfg.subtitle ? `<div class="section-sub">${cfg.subtitle}</div>` : ""}
        ${cfg.note ? `<div class="saved-scenario-note">${cfg.note}</div>` : ""}
        ${cfg.meta ? `<div class="saved-scenario-meta">${cfg.meta}</div>` : ""}
      </div>
      ${renderUiActions(cfg.actions)}
    </div>
    ${cfg.dropdownHtml ? `<div class="${cfg.dropdownClass} ${cfg.expanded ? "" : "hidden"}">${cfg.dropdownHtml}</div>` : ""}
  </div>`;
}

function renderInventorySnapshotBlock(config){
  const cfg=Object.assign({
    className:"archive-item-block",
    title:"",
    side:null,
    rows:[],
    extraHtml:"",
    rowRenderer:null
  }, config || {});
  const sideHtml=cfg.side ? renderSideBadge(cfg.side) : "";
  const rowsHtml=cfg.rowRenderer ? cfg.rowRenderer(cfg.rows || []) : renderCompactInventoryRows(cfg.rows || []);
  return `<div class="${cfg.className}">
    <div class="inventory-head compact-head"><div class="item-name">${cfg.title}</div>${sideHtml}</div>
    ${rowsHtml}
    ${cfg.extraHtml || ""}
  </div>`;
}

function renderSingleCompactRow(label, valuesHtml, options){
  const cfg=Object.assign({wrapperClass:"scenario-compact-view", rowClass:"scenario-compact-row", labelClass:"scenario-compact-label", valuesClass:"scenario-compact-values"}, options || {});
  return `<div class="${cfg.wrapperClass}">
    <div class="${cfg.rowClass}">
      <div class="${cfg.labelClass}">${label}</div>
      <div class="${cfg.valuesClass}">${valuesHtml}</div>
    </div>
  </div>`;
}

function renderStateRows(rows, options){
  const cfg=Object.assign({rowClass:"whatif-summary-row", titleClass:"whatif-summary-title", subClass:"section-sub", valueRenderer:null}, options || {});
  return (rows || []).map(row=>`<div class="${cfg.rowClass}${row.strong ? " strong" : ""}">
    <div><div class="${cfg.titleClass}">${row.title}</div>${row.sub ? `<div class="${cfg.subClass}">${row.sub}</div>` : ""}</div>
    ${cfg.valueRenderer ? cfg.valueRenderer(row) : (row.html || "")}
  </div>`).join("");
}

function renderEmptyState(config){
  const cfg=Object.assign({
    title:"Nothing to show yet.",
    message:"",
    className:"empty-message",
    compact:false,
    icon:"",
    actions:[]
  }, typeof config==="string" ? {message:config} : (config || {}));
  const classes=[cfg.className];
  if(cfg.compact) classes.push("mini-empty");
  return `<div class="${classes.join(" ")}">
    ${cfg.icon ? `<div class="empty-state-icon">${cfg.icon}</div>` : ""}
    ${cfg.title ? `<div class="empty-state-title">${cfg.title}</div>` : ""}
    ${cfg.message ? `<div class="empty-state-message">${cfg.message}</div>` : ""}
    ${cfg.actions && cfg.actions.length ? `<div class="empty-state-actions">${cfg.actions.map(action=>`<button class="${action.className || "ghost-btn"}"${renderActionAttrs(action.action || action.onclick,"click")}>${action.label}</button>`).join("")}</div>` : ""}
  </div>`;
}

function renderCollapsibleCard(config){
  const cfg=Object.assign({
    id:"",
    className:"card",
    open:false,
    openClass:"open",
    title:"",
    subtitle:"",
    titleClass:"section-title",
    subClass:"section-sub",
    bodyHtml:"",
    bodyClass:"section-body",
    buttonClass:"section-button",
    attrs:"",
    headerRightHtml:"",
    dataAdvanced:false,
    toggleFn:null
  }, config || {});
  const idAttr=cfg.id ? ` id="${cfg.id}"` : "";
  const openClass=cfg.open ? ` ${cfg.openClass}` : "";
  const advancedAttr=cfg.dataAdvanced ? " data-advanced-section" : "";
  const attrs=cfg.attrs ? ` ${cfg.attrs}` : "";
  const toggle=cfg.toggleFn || (cfg.id ? `toggleCard('${cfg.id}')` : "");
  return `<section class="${cfg.className}${openClass}"${idAttr}${advancedAttr}${attrs}>
    <button class="${cfg.buttonClass}" type="button"${renderActionAttrs(toggle,"click")}>
      <div>
        <div class="${cfg.titleClass}">${cfg.title}</div>
        ${cfg.subtitle ? `<div class="${cfg.subClass}">${cfg.subtitle}</div>` : ""}
      </div>
      ${cfg.headerRightHtml || `<div class="chev">⌄</div>`}
    </button>
    <div class="${cfg.bodyClass}">${cfg.bodyHtml || ""}</div>
  </section>`;
}


function renderSectionTitleBlock(config){
  const cfg=Object.assign({
    title:"",
    subtitle:"",
    titleClass:"section-title",
    subClass:"section-sub",
    wrapperClass:""
  }, config || {});
  return `${cfg.wrapperClass ? `<div class="${cfg.wrapperClass}">` : ""}
    ${cfg.title ? `<div class="${cfg.titleClass}">${cfg.title}</div>` : ""}
    ${cfg.subtitle ? `<div class="${cfg.subClass}">${cfg.subtitle}</div>` : ""}
  ${cfg.wrapperClass ? "</div>" : ""}`;
}

function renderButtonRow(buttons, options){
  const cfg=Object.assign({wrapperClass:"button-row", stopPropagation:false}, options || {});
  if(!buttons || !buttons.length) return "";
  return `<div class="${cfg.wrapperClass}"${cfg.stopPropagation ? ' data-stop-propagation="true"' : ""}>
    ${buttons.map(btn=>`<button class="${btn.className || "ghost-btn"}" type="button"${renderActionAttrs(btn.action || btn.onclick,"click")}>${btn.label}</button>`).join("")}
  </div>`;
}

function renderMetaPillRow(pills, options){
  const cfg=Object.assign({wrapperClass:"scanner-meta-row", pillClass:"scanner-meta-pill"}, options || {});
  if(!pills || !pills.length) return "";
  return `<div class="${cfg.wrapperClass}">
    ${pills.map(pill=>{
      if(typeof pill==="string") return `<span class="${cfg.pillClass}">${pill}</span>`;
      return `<span class="${cfg.pillClass}${pill.className ? ` ${pill.className}` : ""}">${pill.label || ""}</span>`;
    }).join("")}
  </div>`;
}

function renderResultSectionCard(config){
  const cfg=Object.assign({
    className:"result-section-card",
    title:"",
    subtitle:"",
    headerRightHtml:"",
    bodyHtml:"",
    actions:[]
  }, config || {});
  return `<div class="${cfg.className}">
    ${(cfg.title || cfg.subtitle || cfg.headerRightHtml) ? `
      <div class="result-head">
        <div>${renderSectionTitleBlock({title:cfg.title,subtitle:cfg.subtitle})}</div>
        ${cfg.headerRightHtml || ""}
      </div>
    ` : ""}
    ${cfg.bodyHtml || ""}
    ${renderButtonRow(cfg.actions,{wrapperClass:"button-row scanner-actions-row"})}
  </div>`;
}

function renderInventoryItemCard(config){
  const cfg=Object.assign({
    className:"inventory-item",
    title:"",
    subtitle:"",
    side:null,
    badgeHtml:"",
    bodyHtml:"",
    headerExtraHtml:""
  }, config || {});
  const badge=cfg.badgeHtml || (cfg.side ? renderSideBadge(cfg.side) : "");
  return `<div class="${cfg.className}">
    <div class="inventory-head">
      <div>
        <div class="item-name">${cfg.title}</div>
        ${cfg.subtitle ? `<div class="random-leftover-subtext">${cfg.subtitle}</div>` : ""}
      </div>
      ${cfg.headerExtraHtml || badge}
    </div>
    ${cfg.bodyHtml || ""}
  </div>`;
}

function renderLevelInputGrid(config){
  const cfg=Object.assign({
    itemName:"",
    levels:[],
    values:{},
    inputKeyPrefix:"inventory",
    action:"setInventory"
  }, config || {});
  return `<div class="mini-grid">
    ${(cfg.levels || []).map(level=>`
      <div class="mini-cell">
        <label>L${level}</label>
        <input data-input-key="${cfg.inputKeyPrefix}-${cfg.itemName}-${level}" type="number" min="0" step="1" value="${(cfg.values || {})[level]||""}" placeholder="0" data-action="${cfg.action}" data-action-event="input" data-arg0="${cfg.itemName}" data-arg1="${level}" data-source2="value" />
      </div>
    `).join("")}
  </div>`;
}

function ensureModalHost(){
  let host=document.getElementById("appModalHost");
  if(host) return host;
  host=document.createElement("div");
  host.id="appModalHost";
  host.className="app-modal-host hidden";
  document.body.appendChild(host);
  return host;
}

function closeAppModal(){
  const host=document.getElementById("appModalHost");
  if(!host) return;
  host.classList.add("hidden");
  host.innerHTML="";
}


function escapeModalValue(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

function showInventorySnapshotModal(config){
  const cfg=Object.assign({
    title:"Save Current Inventory Snapshot",
    message:"Name this snapshot and optionally add a note.",
    defaultName:`Inventory ${new Date().toLocaleDateString()}`,
    defaultNote:"",
    nameLabel:"Snapshot Name",
    noteLabel:"Optional Note",
    fallbackName:"Inventory Snapshot",
    confirmLabel:"Save Snapshot",
    cancelLabel:"Cancel"
  }, config || {});
  return new Promise(resolve=>{
    const host=ensureModalHost();
    const finish=value=>{ closeAppModal(); resolve(value); };
    host.className="app-modal-host";
    host.innerHTML=`
      <div class="app-modal-scrim" data-modal-cancel></div>
      <form class="app-modal-card" role="dialog" aria-modal="true" aria-labelledby="appModalTitle" data-snapshot-modal>
        <div class="app-modal-title" id="appModalTitle">${cfg.title}</div>
        ${cfg.message ? `<div class="app-modal-message">${cfg.message}</div>` : ""}
        <div class="field-full">
          <label for="snapshotNameInput">${cfg.nameLabel}</label>
          <input id="snapshotNameInput" type="text" value="${escapeModalValue(cfg.defaultName)}" autocomplete="off" />
        </div>
        <div class="field-full">
          <label for="snapshotNoteInput">${cfg.noteLabel}</label>
          <input id="snapshotNoteInput" type="text" value="${escapeModalValue(cfg.defaultNote)}" autocomplete="off" />
        </div>
        <div class="app-modal-actions" style="margin-top:16px">
          <button type="button" class="ghost-btn" data-modal-cancel>${cfg.cancelLabel}</button>
          <button type="submit" class="primary-btn" data-modal-confirm>${cfg.confirmLabel}</button>
        </div>
      </form>
    `;
    host.querySelectorAll("[data-modal-cancel]").forEach(el=>el.addEventListener("click",()=>finish(null),{once:true}));
    const form=host.querySelector("[data-snapshot-modal]");
    const nameInput=host.querySelector("#snapshotNameInput");
    if(nameInput) nameInput.focus();
    if(form){
      form.addEventListener("submit",event=>{
        event.preventDefault();
        const name=(host.querySelector("#snapshotNameInput")?.value || "").trim() || cfg.fallbackName;
        const note=(host.querySelector("#snapshotNoteInput")?.value || "").trim();
        finish({name,note});
      },{once:true});
    }
  });
}

function showConfirmModal(config){
  const cfg=Object.assign({
    title:"Are you sure?",
    message:"",
    confirmLabel:"Confirm",
    cancelLabel:"Cancel",
    confirmClass:"primary-btn",
    cancelClass:"ghost-btn"
  }, config || {});
  return new Promise(resolve=>{
    const host=ensureModalHost();
    const finish=value=>{ closeAppModal(); resolve(value); };
    host.className="app-modal-host";
    host.innerHTML=`
      <div class="app-modal-scrim" data-modal-cancel></div>
      <div class="app-modal-card" role="dialog" aria-modal="true" aria-labelledby="appModalTitle">
        <div class="app-modal-title" id="appModalTitle">${cfg.title}</div>
        ${cfg.message ? `<div class="app-modal-message">${cfg.message}</div>` : ""}
        <div class="app-modal-actions">
          <button type="button" class="${cfg.cancelClass}" data-modal-cancel>${cfg.cancelLabel}</button>
          <button type="button" class="${cfg.confirmClass}" data-modal-confirm>${cfg.confirmLabel}</button>
        </div>
      </div>
    `;
    host.querySelectorAll("[data-modal-cancel]").forEach(el=>el.addEventListener("click",()=>finish(false),{once:true}));
    const confirm=host.querySelector("[data-modal-confirm]");
    if(confirm) confirm.addEventListener("click",()=>finish(true),{once:true});
  });
}

function showChoiceModal(config){
  const cfg=Object.assign({
    title:"Choose an option",
    message:"",
    choices:[]
  }, config || {});
  return new Promise(resolve=>{
    const host=ensureModalHost();
    const finish=value=>{ closeAppModal(); resolve(value); };
    host.className="app-modal-host";
    host.innerHTML=`
      <div class="app-modal-scrim" data-modal-cancel></div>
      <div class="app-modal-card" role="dialog" aria-modal="true" aria-labelledby="appModalTitle">
        <div class="app-modal-title" id="appModalTitle">${cfg.title}</div>
        ${cfg.message ? `<div class="app-modal-message">${cfg.message}</div>` : ""}
        <div class="app-modal-actions stacked">
          ${(cfg.choices || []).map(choice=>`<button type="button" class="${choice.className || "ghost-btn"}" data-modal-choice="${choice.value}">${choice.label}</button>`).join("")}
          <button type="button" class="ghost-btn" data-modal-cancel>${cfg.cancelLabel || "Cancel"}</button>
        </div>
      </div>
    `;
    host.querySelectorAll("[data-modal-cancel]").forEach(el=>el.addEventListener("click",()=>finish(null),{once:true}));
    host.querySelectorAll("[data-modal-choice]").forEach(el=>el.addEventListener("click",()=>finish(el.getAttribute("data-modal-choice")),{once:true}));
  });
}


// v1.0.13 module bridge exports
Object.assign(window,{
  closeAppModal,
  ensureModalHost,
  escapeModalValue,
  renderActionAttrs,
  renderButtonRow,
  renderCollapsibleCard,
  renderCompactActionCard,
  renderCompactInventoryRows,
  renderEmptyState,
  renderFilterTabs,
  renderInventoryItemCard,
  renderInventorySnapshotBlock,
  renderLevelInputGrid,
  renderLevelPillGrid,
  renderMetaPillRow,
  renderResultSectionCard,
  renderSectionTitleBlock,
  renderSideBadge,
  renderSingleCompactRow,
  renderSoftChipButtons,
  renderStateRows,
  renderUiActions,
  showChoiceModal,
  showConfirmModal,
  showInventorySnapshotModal,
  uiActionArgAttrs,
  uiEscapeAttr,
  uiLevelsWithPositiveValues,
  uiNumber,
  uiSplitActionArgs
});



// ===== src/scanner-adapter.js =====
const SCANNER_WORKER_ITEM_NAMES=[
  "Heart of Wisdom",
  "Feather of Night",
  "Sharp Beak",
  "Tail of Wind",
  "Attackers Claw",
  "Eye of Perception"
];

const SCANNER_ITEM_ALIASES={
  "attacker's claw":"Attackers Claw",
  "attackers claw":"Attackers Claw",
  "attacker claw":"Attackers Claw",
  "heart of wisdom":"Heart of Wisdom",
  "feather of night":"Feather of Night",
  "sharp beak":"Sharp Beak",
  "tail of wind":"Tail of Wind",
  "eye of perception":"Eye of Perception"
};

function scannerNormalizeItemName(name){
  const raw=String(name||"").trim();
  const direct=ravenItems.find(item=>item.name===raw);
  if(direct) return direct.name;
  const workerDirect=SCANNER_WORKER_ITEM_NAMES.find(item=>item===raw);
  if(workerDirect) return workerDirect;
  return SCANNER_ITEM_ALIASES[raw.toLowerCase()] || null;
}

function scannerEmptyInventory(){
  const out={};
  ravenItems.forEach(item=>out[item.name]={});
  return out;
}

function scannerSafeQty(value){
  const qty=Math.floor(Number(value||0));
  return Number.isFinite(qty) && qty>0 ? qty : 0;
}

function scannerNormalizeLevelQty(levels){
  const out={};
  if(!levels || typeof levels!=="object" || Array.isArray(levels)) return out;
  const allowedLevels=new Set(allItemLevels.map(level=>Number(level)));
  Object.entries(levels).forEach(([levelKey,qtyValue])=>{
    const level=Number(levelKey);
    if(!allowedLevels.has(level)) return;
    const qty=scannerSafeQty(qtyValue);
    if(qty>0) out[level]=qty;
  });
  return out;
}

function scannerInventoryFromFinalItems(items){
  const inventory=scannerEmptyInventory();
  if(!items || typeof items!=="object" || Array.isArray(items)) return inventory;
  Object.entries(items).forEach(([itemName,levels])=>{
    const normalizedName=scannerNormalizeItemName(itemName);
    if(!normalizedName) return;
    inventory[normalizedName]=scannerNormalizeLevelQty(levels);
  });
  return inventory;
}

function scannerInventoryFromGlobalRows(globalRows){
  const inventory=scannerEmptyInventory();
  if(!Array.isArray(globalRows)) return inventory;
  const allowedLevels=new Set(allItemLevels.map(level=>Number(level)));
  globalRows.forEach(row=>{
    const tiles=Array.isArray(row && row.tiles) ? row.tiles : [];
    tiles.forEach(tile=>{
      const normalizedName=scannerNormalizeItemName(tile && tile.item);
      const level=Number(tile && tile.level);
      const qty=scannerSafeQty(tile && tile.qty);
      if(!normalizedName || !allowedLevels.has(level) || qty<=0) return;
      inventory[normalizedName][level]=(inventory[normalizedName][level]||0)+qty;
    });
  });
  return inventory;
}

function scannerInventoryFromResult(result){
  if(result && result.items && typeof result.items==="object" && !Array.isArray(result.items)){
    return scannerInventoryFromFinalItems(result.items);
  }
  if(result && Array.isArray(result.globalRows)){
    return scannerInventoryFromGlobalRows(result.globalRows);
  }
  return scannerEmptyInventory();
}

function scannerDetectedCount(inventory){
  let total=0;
  ravenItems.forEach(item=>{
    Object.values((inventory||{})[item.name]||{}).forEach(qty=>{
      total+=scannerSafeQty(qty);
    });
  });
  return total;
}

function scannerHasInventoryValues(inventory){
  return scannerDetectedCount(inventory)>0;
}

function scannerFirstIssueReason(result,inventory){
  if(!scannerHasInventoryValues(inventory)) return "No Raven items were detected.";
  const quantityConflicts=Array.isArray(result && result.quantityConflicts) ? result.quantityConflicts : [];
  if(quantityConflicts.length) return quantityConflicts.length===1 ? "Review needed. One row conflicted between screenshots." : `Review needed. ${quantityConflicts.length} rows conflicted between screenshots.`;
  if(result && result.canAutoApply===false) return "Review needed before applying this scan.";
  if(result && result.isConsistent===false) return "Review needed. The screenshots could not be matched cleanly.";
  return "";
}

function scannerAdaptWorkerResponse(json){
  if(!json || json.ok===false) throw new Error(json?.errorMessage || json?.error || "Scanner failed.");
  const result=json.result && typeof json.result==="object" ? json.result : json;
  const inventory=scannerInventoryFromResult(result);
  const detectedCount=scannerDetectedCount(inventory);
  const quantityConflicts=Array.isArray(result.quantityConflicts) ? result.quantityConflicts : [];
  const issueReason=scannerFirstIssueReason(result,inventory);
  return {
    raw:json,
    result,
    inventory,
    detectedCount,
    canAutoApply:detectedCount>0 && result.canAutoApply!==false && result.isConsistent!==false && quantityConflicts.length===0,
    isConsistent:result.isConsistent!==false && quantityConflicts.length===0,
    issueReason,
    warnings:issueReason ? [issueReason] : [],
    notes:Array.isArray(result.notes) ? result.notes : [],
    ignoredTiles:Array.isArray(result.ignoredTiles) ? result.ignoredTiles : [],
    uncertain:Array.isArray(result.uncertain) ? result.uncertain : [],
    quantityConflicts
  };
}


// v1.0.13 module bridge exports
Object.assign(window,{
  SCANNER_ITEM_ALIASES,
  SCANNER_WORKER_ITEM_NAMES,
  scannerAdaptWorkerResponse,
  scannerDetectedCount,
  scannerEmptyInventory,
  scannerFirstIssueReason,
  scannerHasInventoryValues,
  scannerInventoryFromFinalItems,
  scannerInventoryFromGlobalRows,
  scannerInventoryFromResult,
  scannerNormalizeItemName,
  scannerNormalizeLevelQty,
  scannerSafeQty
});



// ===== src/scanner-client.js =====
const BAG_SCANNER_WORKER_URL = "https://laptools-openai-worker.andrewpeoples98.workers.dev";

function normalizeScannerBaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/g, "");
}

function getBagScannerWorkerUrl() {
  return normalizeScannerBaseUrl(BAG_SCANNER_WORKER_URL);
}

async function scanBagItemsWithWorker(filesOrBaseUrl, maybeFiles, maybeOptions) {
  const usingOldSignature = typeof filesOrBaseUrl === "string";
  const files = usingOldSignature ? maybeFiles : filesOrBaseUrl;
  const options = usingOldSignature ? maybeOptions : maybeFiles;

  const list = Array.from(files || []).filter(Boolean);
  if (!list.length) throw new Error("Choose one or more screenshots first.");

  const baseUrl = getBagScannerWorkerUrl();
  if (!baseUrl) throw new Error("Scanner is not configured yet.");

  const formData = new FormData();
  list.forEach(file => formData.append("images", file));

  const debug = options && options.debug ? "?debug=1" : "";
  const res = await fetch(`${baseUrl}/scan-inventory${debug}`, {
    method: "POST",
    body: formData
  });

  let json = null;
  try { json = await res.json(); } catch (e) { json = null; }

  if (!res.ok) {
    throw new Error(json?.errorMessage || json?.error || `Scanner request failed (${res.status}).`);
  }

  return json;
}


// v1.0.13 module bridge exports
Object.assign(window,{
  BAG_SCANNER_WORKER_URL,
  getBagScannerWorkerUrl,
  normalizeScannerBaseUrl
});



// ===== src/render-scanner.js =====
let bagScannerLastScan=null;

function renderBagScannerPanel(){
  return `
    <section class="card hidden" id="bagScannerCard">
      <button class="section-button" type="button" data-action="toggleBagScannerCard" data-action-event="click">
        <div>
          <div class="section-title">Scan Bag Items</div>
          <div class="section-sub">Upload Raven bag screenshots and review detected items before replacing Active Inventory.</div>
        </div>
        <div class="chev">⌄</div>
      </button>
      <div class="section-body scanner-body">
        <div class="scanner-field-grid">
          <label class="scanner-field">
            <span>Bag Screenshots</span>
            <input id="bagScannerFiles" type="file" accept="image/*" multiple data-action="setBagScannerFiles" data-action-event="change" data-source0="event" />
          </label>
        </div>
        <div class="button-row scanner-actions-row">
          <button class="ghost-btn backup-btn" type="button" data-action="closeBagScanner" data-action-event="click">Cancel</button>
          <button class="ghost-btn snapshot-style-btn" type="button" data-action="runBagScanner" data-action-event="click">Scan Bag Items</button>
        </div>
        <div id="bagScannerStatus" class="scanner-status"></div>
        <div id="bagScannerReview" class="scanner-review hidden"></div>
      </div>
    </section>
  `;
}

function renderBagScannerInventory(inventory){
  const blocks=ravenItems.map(item=>{
    const values=(inventory||{})[item.name]||{};
    if(!levelObjectHasValues(values)) return "";
    return renderInventorySnapshotBlock({
      className:"archive-item-block scanner-item-block",
      title:item.name,
      side:item.side,
      rows:[{label:"Detected Items",obj:values}],
      rowRenderer:rows=>renderCompactInventoryRows(rows,{pillRenderer:obj=>renderCompactLevelBoxes(obj,allItemLevels) || renderEmptyState({title:'',message:'None',className:'empty-message',compact:true})})
    });
  }).filter(Boolean).join("");
  return blocks || renderEmptyState({title:"No Raven items detected.",message:"Try a clearer screenshot.",className:"section-empty-message"});
}

function scannerHasReviewIssue(scan){
  if(!scan) return false;
  if((scan.detectedCount||0)<=0) return true;
  if(scan.requiresReview===true) return true;
  if(scan.canAutoApply===false) return true;
  if(scan.isConsistent===false) return true;
  return false;
}

function scannerIsDevExplanation(text){
  const lower=String(text||"").toLowerCase();
  return (
    lower.includes("scanner counts physical raven tiles") ||
    lower.includes("duplicate item+level tiles") ||
    lower.includes("worker aligns") ||
    lower.includes("aligns local screenshot rows") ||
    lower.includes("continued global row numbers") ||
    lower.includes("duplicate overlap rows") ||
    lower.includes("trusted overlap") ||
    lower.includes("cut-off/artifact") ||
    lower.includes("row alignment creates conflicts")
  );
}

function scannerFirstCleanText(values){
  const list=Array.isArray(values) ? values : [];
  for(const value of list){
    const text=String(value||"").trim();
    if(text && !scannerIsDevExplanation(text)) return text;
  }
  return "";
}

function scannerReviewReason(scan){
  if(!scan) return "Scan failed. Please try again.";
  const result=scan.result || {};
  if((scan.detectedCount||0)<=0) return "Scan failed. No Raven items were detected.";

  const directReason=String(
    result.reviewReason ||
    result.errorReason ||
    result.warningMessage ||
    result.errorMessage ||
    result.error ||
    ""
  ).trim();
  if(directReason && !scannerIsDevExplanation(directReason)) return directReason;

  const warning=scannerFirstCleanText(scan.warnings);
  if(warning) return warning;

  const note=scannerFirstCleanText(scan.notes);
  if(note) return note;

  if(scan.isConsistent===false) return "Review needed. The screenshots could not be matched cleanly.";
  if(scan.canAutoApply===false) return "Review needed before replacing Active Inventory.";
  return "Review needed before replacing Active Inventory.";
}

function renderBagScannerIssue(scan){
  if(!scannerHasReviewIssue(scan)) return "";
  return `<div class="scanner-warning-list scanner-simple-message"><div>${uiEscapeAttr(scannerReviewReason(scan))}</div></div>`;
}

function renderBagScannerReview(scan){
  const review=document.getElementById("bagScannerReview");
  if(!review) return;
  bagScannerLastScan=scan;
  const ignoredCount=(scan.ignoredTiles||[]).length;
  const uncertainCount=(scan.uncertain||[]).length;
  const needsReview=scannerHasReviewIssue(scan);
  review.classList.remove("hidden");
  review.innerHTML=renderResultSectionCard({
    className:"result-section-card scanner-review-card",
    title:"Review Scan Results",
    subtitle:`Detected ${roundNice(scan.detectedCount||0)} total Raven item${(scan.detectedCount||0)===1 ? "" : "s"}.`,
    bodyHtml:`
      ${renderMetaPillRow([
        {label:needsReview ? "Review needed" : "Ready to apply",className:needsReview ? "warn" : "ok"},
        {label:`Ignored: ${roundNice(ignoredCount)}`},
        {label:`Uncertain: ${roundNice(uncertainCount)}`}
      ])}
      ${renderBagScannerIssue(scan)}
      <div class="scanner-result-list">${renderBagScannerInventory(scan.inventory)}</div>
    `,
    actions:[
      {label:"Clear Results",className:"ghost-btn backup-btn",action:"purgeBagScannerData"},
      {label:"Replace Active Inventory",className:"ghost-btn snapshot-style-btn",action:"replaceActiveInventoryFromBagScan"}
    ]
  });
}

function setBagScannerStatus(message,type){
  const status=document.getElementById("bagScannerStatus");
  if(!status) return;
  status.className=`scanner-status ${type||""}`.trim();
  status.textContent=message||"";
}

function clearBagScannerReview(){
  bagScannerLastScan=null;
  const review=document.getElementById("bagScannerReview");
  if(review){
    review.classList.add("hidden");
    review.innerHTML="";
  }
  setBagScannerStatus("","");
}

function clearBagScannerFileInput(){
  const input=document.getElementById("bagScannerFiles");
  if(input) input.value="";
}

function purgeBagScannerData(){
  bagScannerLastScan=null;
  if(typeof resetScannerStateInAppState==="function") resetScannerStateInAppState();
  clearBagScannerReview();
  clearBagScannerFileInput();
}


// v1.0.13 module bridge exports
Object.assign(window,{
  bagScannerLastScan,
  clearBagScannerFileInput,
  clearBagScannerReview,
  purgeBagScannerData,
  renderBagScannerInventory,
  renderBagScannerIssue,
  renderBagScannerPanel,
  renderBagScannerReview,
  scannerFirstCleanText,
  scannerHasReviewIssue,
  scannerIsDevExplanation,
  scannerReviewReason,
  setBagScannerStatus
});



// ===== src/render-home.js =====
    const appPageRoutes={
      home:"homePage",
      raven:"ravenPage",
      calculator:"ravenPage",
      inventory:"ravenPage",
      whatif:"ravenPage",
      "what-if":"ravenPage",
      settings:"settingsPage",
      guides:"guidesPage",
      other:"otherPage",
      about:"aboutPage",
      faq:"faqPage",
      "report-bug":"reportBugPage"
    };

    const appPageHashes={
      homePage:"home",
      ravenPage:"raven/calculator",
      settingsPage:"settings",
      guidesPage:"guides",
      otherPage:"other",
      aboutPage:"about",
      faqPage:"faq",
      reportBugPage:"report-bug"
    };

    const ravenPageRoutes={
      calculator:"calculator",
      inventory:"inventory",
      whatif:"whatif",
      "what-if":"whatif"
    };

    let applyingAppRoute=false;

    function cleanAppHash(value){
      return String(value || "")
        .replace(/^#/,"")
        .replace(/^\/+/,"")
        .replace(/\/+$/g,"")
        .trim()
        .toLowerCase();
    }

    function appHashForPage(id){
      if(id==="ravenPage") return `raven/${ravenSubPage || "calculator"}`;
      return appPageHashes[id] || "home";
    }

    function updateAppHash(hash,replace){
      if(applyingAppRoute) return;
      const clean=cleanAppHash(hash) || "home";
      const target=`#${clean}`;
      if(window.location.hash===target) return;
      if(replace) history.replaceState(null,"",target);
      else history.pushState(null,"",target);
    }

    function showPage(id,options){
      const opts=options || {};
      const pageIds=["homePage","ravenPage","settingsPage","guidesPage","otherPage","aboutPage","faqPage","reportBugPage"];
      const targetId=pageIds.includes(id) ? id : "homePage";
      pageIds.forEach(pageId=>{
        const el=document.getElementById(pageId);
        if(el) el.classList.toggle("hidden",pageId!==targetId);
      });
      if(typeof applyGlobalDisplaySettings==="function") applyGlobalDisplaySettings();
      if(!opts.skipHash) updateAppHash(appHashForPage(targetId),!!opts.replaceHash);
      if(!opts.skipScroll) window.scrollTo({top:0,behavior:opts.instantScroll ? "auto" : "smooth"});
    }

    function applyRouteFromHash(options){
      const opts=options || {};
      const route=cleanAppHash(window.location.hash);
      const parts=(route || "home").split("/").filter(Boolean);
      const main=parts[0] || "home";
      const sub=parts[1] || "";
      const pageId=appPageRoutes[main] || "homePage";
      applyingAppRoute=true;
      showPage(pageId,{skipHash:true,skipScroll:!!opts.skipScroll,instantScroll:true});
      if(pageId==="ravenPage"){
        const ravenRoute=ravenPageRoutes[sub] || (main==="inventory" ? "inventory" : main==="whatif" || main==="what-if" ? "whatif" : "calculator");
        if(typeof setRavenSubPage==="function") setRavenSubPage(ravenRoute,{skipHash:true,skipScroll:!!opts.skipScroll,instantScroll:true});
      }
      applyingAppRoute=false;
      if(!route) updateAppHash("home",true);
      else if(pageId==="ravenPage" && main==="raven" && !sub) updateAppHash("raven/calculator",true);
    }

    function bindAppRouteEvents(){
      if(window.__lapAppRouteEventsBound) return;
      window.__lapAppRouteEventsBound=true;
      window.addEventListener("hashchange",()=>applyRouteFromHash());
      window.addEventListener("popstate",()=>applyRouteFromHash());
    }

    function openGlobalMenu(){
      const panel=document.getElementById("globalMenuPanel");
      const scrim=document.getElementById("menuScrim");
      if(panel){ panel.classList.add("open"); panel.setAttribute("aria-hidden","false"); }
      if(scrim) scrim.classList.remove("hidden");
    }

    function closeGlobalMenu(){
      const panel=document.getElementById("globalMenuPanel");
      const scrim=document.getElementById("menuScrim");
      if(panel){ panel.classList.remove("open"); panel.setAttribute("aria-hidden","true"); }
      if(scrim) scrim.classList.add("hidden");
    }


    function buildHomeHelpCard(){
      const card=document.createElement("div");
      card.className="home-feature-card static-card home-help-card";
      card.innerHTML=`
        <div class="home-feature-icon blue-icon help-icon-text">?</div>
        <div class="home-feature-copy">
          <div class="home-feature-title">Need Help?</div>
          <div class="home-feature-sub">Learn more about this project or address an issue.</div>
          ${renderSoftChipButtons([
            {label:"About",onclick:"showPage('aboutPage')"},
            {label:"FAQ",onclick:"showPage('faqPage')"},
            {label:"Report Bug",onclick:"showPage('reportBugPage')"}
          ])}
        </div>
      `;
      return card;
    }

    function removeExistingHomeHelpCards(){
      document.querySelectorAll(".home-help-card").forEach(el=>el.remove());
      document.querySelectorAll("#homeOtherPanel .home-feature-card").forEach(card=>{
        const title=card.querySelector(".home-feature-title");
        if(title && title.textContent.trim()==="Need Help?") card.remove();
      });
    }

    function placeHomeHelpCard(category){
      removeExistingHomeHelpCards();
      const target=document.getElementById(category==="other" ? "homeOtherPanel" : category==="guides" ? "homeGuidesPanel" : "homeToolsPanel");
      if(!target) return;
      const help=buildHomeHelpCard();
      if(category==="other") target.prepend(help);
      else target.append(help);
    }

    function setHomeCategory(category){
      const categories=["tools","guides","other"];
      const activeCategory=categories.includes(category) ? category : "tools";
      categories.forEach(name=>{
        const tab=document.getElementById("homeTab"+name.charAt(0).toUpperCase()+name.slice(1));
        const panel=document.getElementById("home"+name.charAt(0).toUpperCase()+name.slice(1)+"Panel");
        if(tab) tab.classList.toggle("active",name===activeCategory);
        if(panel) panel.classList.toggle("hidden",name!==activeCategory);
      });
      placeHomeHelpCard(activeCategory);
    }

    document.addEventListener("DOMContentLoaded",()=>{
      const activeTab=document.querySelector(".home-category-tab.active");
      const initial=activeTab && activeTab.id ? activeTab.id.replace("homeTab","").toLowerCase() : "tools";
      setHomeCategory(initial);
    });



// ===== src/render-calculator.js =====
// Calculator rendering and result-table helpers.

    function buildStepper(containerId,group,levels){
      const wrap=document.getElementById(containerId);
      wrap.innerHTML="";
      const obj=getGroupObject(group);

      levels.forEach(level=>{
        const row=document.createElement("div");
        row.className="level-row";
        row.innerHTML=`
          <div>
            <div class="level-name">Level ${level}</div>
            <div class="level-help">Quantity</div>
          </div>
          <div class="stepper">
            <button data-action="adjustGroup" data-action-event="click" data-arg0="${group}" data-arg1="${level}" data-arg2="-1">−</button>
            <input data-input-key="${group}-${level}" type="number" min="0" step="1" value="${obj[level]||""}" placeholder="0" data-action="setGroupValue" data-action-event="input" data-arg0="${group}" data-arg1="${level}" data-source2="value" />
            <button data-action="adjustGroup" data-action-event="click" data-arg0="${group}" data-arg1="${level}" data-arg2="1">+</button>
          </div>
        `;
        wrap.appendChild(row);
      });
    
      renderBundleAppliedSummary("chestsBundleAppliedSummary");
      renderChoiceBankRedeem("chestsChoiceBankRedeem");
    }

    function renderTopUpBundles(){
      ensureBankObjects();
      const wrap=document.getElementById("topUpBundlesContent");
      if(!wrap) return;

      const bundleCard=(key)=>{
        const def=topUpBundleDefinitions[key];
        const qty=Math.floor(Number(currentTopUpBundleObject()[key]||0));
        return `
          <div class="bundle-card">
            <div class="bundle-card-head">
              <div class="bundle-card-title">${def.title}</div>
              <div class="bundle-qty-control">
                <button data-action="adjustBundleQty" data-action-event="click" data-arg0="${key}" data-arg1="-1">−</button>
                <input data-input-key="bundle-${key}" type="number" min="0" step="1" value="${qty || ""}" placeholder="0" data-action="setBundleQty" data-action-event="input" data-arg0="${key}" data-source1="value" />
                <button data-action="adjustBundleQty" data-action-event="click" data-arg0="${key}" data-arg1="1">+</button>
              </div>
            </div>
            ${makeBundlePills(def.random,"random",def.choice)}
          </div>
        `;
      };

      wrap.innerHTML=`
        <div class="section-sub">Quickly add chest quantities based on popular top up options.</div>

        <div class="bundle-summary" id="topUpBundleAppliedSummary"></div>
        <div id="topUpChoiceBankRedeem"></div>

        <div class="bundle-section">
          <div class="bundle-section-title">Daily Must-Buy</div>
          ${bundleCard("daily1")}
          ${bundleCard("daily2")}
        </div>

        <div class="bundle-section">
          <div class="bundle-section-title">Weekly Special</div>
          ${bundleCard("weekly")}
        </div>

        <div class="button-row">
          
          <button class="danger-btn" data-action="resetTopUpsForCurrentItem" data-action-event="click">Reset Top Ups for this item</button>
        </div>
      `;

      renderBundleAppliedSummary("topUpBundleAppliedSummary");
      renderChoiceBankRedeem("topUpChoiceBankRedeem");
    }

    function buildCombinedChestInputs(containerId,levels){
      const wrap=document.getElementById(containerId);
      if(!wrap) return;
      wrap.innerHTML="";

      const plan=currentPlanObject();
      const guaranteed=currentGuaranteedObject();

      levels.forEach(level=>{
        const row=document.createElement("div");
        row.className="compact-chest-row";
        row.innerHTML=`
          <div class="compact-chest-level">Lvl ${level}</div>
          <div class="compact-chest-field">
            <label>Random</label>
            <input data-input-key="plan-${level}" type="number" min="0" step="1" value="${plan[level]||""}" placeholder="0" data-action="setGroupValue" data-action-event="input" data-arg0="plan" data-arg1="${level}" data-source2="value" />
          </div>
          <div class="compact-chest-field">
            <label>Choice</label>
            <input data-input-key="guaranteed-${level}" type="number" min="0" step="1" value="${guaranteed[level]||""}" placeholder="0" data-action="setGroupValue" data-action-event="input" data-arg0="guaranteed" data-arg1="${level}" data-source2="value" />
          </div>
        `;
        wrap.appendChild(row);
      });
    }

    function renderOwnedInputs(){
      const levels=visibleOwnedLevels();
      buildStepper("ownedInputs","owned",levels);
    }

    function renderPlanInputs(){
      const showHigh=document.getElementById("showHighRandom")?.checked;
      const levels=showHigh ? [7,6,5,4,3,2,1] : [5,4,3,2,1];

      if(document.getElementById("combinedChestInputs")){
        buildCombinedChestInputs("combinedChestInputs",levels);
        return;
      }

      buildStepper("planInputs","plan",levels);
    }

    function renderGuaranteedInputs(){
      const showHigh=document.getElementById("showHighRandom")?.checked || document.getElementById("showHighGuaranteed")?.checked;
      const levels=showHigh ? [7,6,5,4,3,2,1] : guaranteedDefaultLevels;

      if(document.getElementById("combinedChestInputs")){
        buildCombinedChestInputs("combinedChestInputs",levels);
        return;
      }

      buildStepper("guaranteedInputs","guaranteed",levels);
    }

    function makeUsageQuickAdjustSummary(id,obj,group,emptyMessage,topUpObj){
      const wrap=document.getElementById(id);
      if(!wrap) return;
      wrap.innerHTML="";
      const manualEntries=Object.keys(obj||{}).map(k=>({level:Number(k), value:Number(obj[k]||0)})).filter(x=>x.value>0).sort((a,b)=>b.level-a.level);
      const sourceEntries=Object.keys(topUpObj||{}).map(k=>({level:Number(k), value:Number(topUpObj[k]||0)})).filter(x=>x.value>0).sort((a,b)=>b.level-a.level);
      const quick = group==="plan" ? !!state.quickAdjustRandom : !!state.quickAdjustChoice;
      if(!manualEntries.length && !sourceEntries.length){
        const msg=document.createElement("div");
        msg.className="empty-message";
        msg.textContent=emptyMessage;
        wrap.appendChild(msg);
        return;
      }
      const renderPills=(entries,cls)=>{
        const pills=document.createElement("div");
        pills.className=quick && group==="plan" ? "quick-topup-pill-grid" : "compact-usage-pills";
        entries.forEach(entry=>{
          const pill=document.createElement("div");
          pill.className=cls;
          pill.innerHTML=`<div class="pill-level">L${entry.level}</div><div class="pill-qty">${Math.floor(entry.value)}</div>`;
          pills.appendChild(pill);
        });
        wrap.appendChild(pills);
      };
      if(!quick){
        if(manualEntries.length){
          if(sourceEntries.length){
            const label=document.createElement("div");
            label.className="usage-source-label";
            label.textContent=group==="guaranteed" ? "Manual Choice Chests" : "Manual";
            wrap.appendChild(label);
          }
          renderPills(manualEntries,"compact-usage-pill");
        }
        if(sourceEntries.length){
          const label=document.createElement("div");
          label.className="usage-source-label";
          label.textContent=group==="guaranteed" ? (mode==="manual" ? "Top Up Bundle Choice Chests" : "Redeemed From Choice Chest Bank") : "Top Up Bundles";
          wrap.appendChild(label);
          renderPills(sourceEntries,group==="guaranteed" ? "compact-usage-pill manual-topup-choice" : "compact-usage-pill topup");
        }
        return;
      }
      if(manualEntries.length){
        const label=document.createElement("div");
        label.className="source-subtitle";
        label.textContent=group==="guaranteed" ? "Manual Choice Chests" : "Manual Random Chests";
        wrap.appendChild(label);
        manualEntries.forEach(entry=>{
          const line=document.createElement("div");
          line.className="quick-adjust-line";
          line.innerHTML=`<span>Lvl ${entry.level}</span><span class="quick-adjust-controls"><button data-action="adjustGroup" data-action-event="click" data-arg0="${group}" data-arg1="${entry.level}" data-arg2="-1">−</button><input data-input-key="quick-${group}-${entry.level}" type="number" min="0" step="1" value="${Math.floor(entry.value)}" data-action="setGroupValue" data-action-event="input" data-arg0="${group}" data-arg1="${entry.level}" data-source2="value" /><button data-action="adjustGroup" data-action-event="click" data-arg0="${group}" data-arg1="${entry.level}" data-arg2="1">+</button></span>`;
          wrap.appendChild(line);
        });
      }
      if(sourceEntries.length){
        const label=document.createElement("div");
        label.className="source-subtitle";
        label.textContent=group==="guaranteed" ? (mode==="manual" ? "Top Up Bundle Choice Chests" : "Redeemed From Choice Chest Bank") : "Top Up Bundles";
        wrap.appendChild(label);
        if(group==="guaranteed" && mode==="specific"){
          sourceEntries.forEach(entry=>{
            const line=document.createElement("div");
            line.className="bank-adjust-line";
            line.innerHTML=`<span>Lvl ${entry.level}</span><span class="quick-adjust-controls"><button data-action="adjustRedeemedChoice" data-action-event="click" data-arg0="${entry.level}" data-arg1="-1">−</button><input data-input-key="redeemed-${entry.level}" type="number" min="0" step="1" value="${Math.floor(entry.value)}" data-action="setRedeemedChoice" data-action-event="input" data-arg0="${entry.level}" data-source1="value" /><button data-action="redeemChoiceFromBank" data-action-event="click" data-arg0="${entry.level}" data-arg1="1">+</button></span>`;
            wrap.appendChild(line);
          });
        }else{
          renderPills(sourceEntries,group==="guaranteed" ? "compact-usage-pill manual-topup-choice" : "compact-usage-pill topup");
        }
      }
    }

    function makeTable(id,levels,values){
      const grid=document.getElementById(id);
      grid.className="result-table cols-"+Math.min(levels.length,10);
      if(levels.length===10) grid.className="result-table cols-10";
      if(levels.length===7) grid.className="result-table cols-7";
      if(levels.length===5) grid.className="result-table cols-5";
      grid.innerHTML="";
      levels.forEach(level=>{
        const th=document.createElement("div");
        th.className="th";
        th.textContent="L"+level;
        grid.appendChild(th);
      });
      values.forEach(value=>{
        const td=document.createElement("div");
        td.className="td";
        td.textContent=value;
        grid.appendChild(td);
      });
    }

    function makePairedChunkTable(id,levels,values){
      const wrap=document.getElementById(id);
      wrap.className="result-chunks";
      wrap.innerHTML="";

      for(let i=0;i<levels.length;i+=5){
        const chunkLevels=levels.slice(i,i+5);
        const chunkValues=values.slice(i,i+5);
        const chunk=document.createElement("div");
        chunk.className="result-chunk cols-"+chunkLevels.length;

        chunkLevels.forEach(level=>{
          const th=document.createElement("div");
          th.className="th";
          th.textContent="L"+level;
          chunk.appendChild(th);
        });

        chunkValues.forEach(value=>{
          const td=document.createElement("div");
          td.className="td";
          td.textContent=value;
          chunk.appendChild(td);
        });

        wrap.appendChild(chunk);
      }
    }

    function hasPlanInput(){
      return Object.values(currentPlanObject()||{}).some(v=>Number(v||0)>0);
    }

    function makeUsageSummary(id,obj,emptyMessage){
      const wrap=document.getElementById(id);
      if(!wrap) return;
      wrap.innerHTML="";
      const entries=Object.keys(obj||{})
        .map(k=>({level:Number(k), value:Number(obj[k]||0)}))
        .filter(x=>x.value>0)
        .sort((a,b)=>b.level-a.level);
      if(!entries.length){
        const msg=document.createElement("div");
        msg.className="empty-message";
        msg.textContent=emptyMessage;
        wrap.appendChild(msg);
        return;
      }
      entries.forEach(entry=>{
        const line=document.createElement("div");
        line.className="usage-line";
        line.innerHTML=`<span>Lvl ${entry.level}</span><span>${Math.floor(entry.value)}</span>`;
        wrap.appendChild(line);
      });
    }

    function makeFilteredResultTable(id,levels,values,emptyMessage){
      const filtered=[];
      levels.forEach((level,index)=>{
        const value=values[index];
        if(value !== "-" && value !== "" && value !== null && value !== undefined){
          filtered.push({level,value});
        }
      });

      const grid=document.getElementById(id);
      if(!grid) return;
      grid.className=filtered.length ? "compact-result" : "empty-message";
      grid.innerHTML="";

      if(!filtered.length){
        grid.textContent=emptyMessage;
        return;
      }

      filtered.forEach(entry=>{
        const wrap=document.createElement("div");
        wrap.innerHTML=`<div class="th">L${entry.level}</div><div class="td">${entry.value}</div>`;
        grid.appendChild(wrap);
      });
    }

    function updateSideLeftoverLabels(){
      const side = selectedSide();
      const leftSub = document.getElementById("leftSideLeftoversSub");
      const rightSub = document.getElementById("rightSideLeftoversSub");

      if(leftSub){
        leftSub.textContent = side === "left"
          ? "Split between the other 2 same-side items."
          : "Split between the other 3 opposite-side items.";
      }

      if(rightSub){
        rightSub.textContent = side === "right"
          ? "Split between the other 2 same-side items."
          : "Split between the other 3 opposite-side items.";
      }
    }

    function updateTotalLeftoverItemsText(){
      const el=document.getElementById("totalLeftoverItemsSub");
      if(!el) return;

      if(mode==="manual"){
        el.textContent="Items that were earned from random chests, but weren’t duplicates of the manual item in mind.";
      }else{
        el.textContent=`Items that were earned from random chests, but weren’t duplicates of the ${selectedItemName()}.`;
      }
    }

    function updateNontargetSideLabels(){
      const side = selectedSide();
      const leftSub = document.getElementById("leftSideLeftoversSub");
      const rightSub = document.getElementById("rightSideLeftoversSub");

      if(leftSub){
        leftSub.textContent = side === "left"
          ? "Split between the other 2 same-side items."
          : "Split between the other 3 opposite-side items.";
      }

      if(rightSub){
        rightSub.textContent = side === "right"
          ? "Split between the other 2 same-side items."
          : "Split between the other 3 opposite-side items.";
      }
    }

    function makeRemainingItemsChunkedTable(id,levels,values,showAll){
      const wrap=document.getElementById(id);
      if(!wrap) return;

      wrap.className="result-chunks";
      wrap.innerHTML="";

      const topLevels=levels.slice(0,3);
      const topValues=values.slice(0,3);
      const lowerLevels=levels.slice(3);
      const lowerValues=values.slice(3);

      const makeCell=(level,value)=>{
        const cell=document.createElement("div");
        cell.innerHTML=`<div class="th">L${level}</div><div class="td">${value}</div>`;
        return cell;
      };

      if(topLevels.length){
        const top=document.createElement("div");
        top.className="remaining-items-top3";
        topLevels.forEach((level,index)=>top.appendChild(makeCell(level,topValues[index])));
        wrap.appendChild(top);
      }

      if(lowerLevels.length){
        const lower=document.createElement("div");
        lower.className="remaining-items-lower";
        lowerLevels.forEach((level,index)=>lower.appendChild(makeCell(level,lowerValues[index])));
        wrap.appendChild(lower);
      }
    }

    function makeRemainingItemsResult(id,levels,values,targetLevel){
      const hasRemaining=values.some(value=>value !== "-" && value !== "" && value !== null && value !== undefined);
      if(hasRemaining){
        makeRemainingItemsChunkedTable(id,levels,values,false);
        return;
      }

      const wrap=document.getElementById(id);
      if(!wrap) return;
      wrap.className="result-chunks";
      wrap.innerHTML="";

      const msg=document.createElement("div");
      msg.className="success-message";
      msg.textContent="Congratulations! Desired level met!";
      wrap.appendChild(msg);

      const sub=document.createElement("div");
      sub.className="success-subtext";
      sub.textContent="See new estimated inventory below.";
      wrap.appendChild(sub);

      if(mode==="specific"){
        const snapshotLevels=[targetLevel, targetLevel-1, targetLevel-2].filter(level=>level>=1 && level<=MAX_ITEM_LEVEL);
        let combined={};
        if(typeof projectedOwnedForInventoryItem === "function"){
          combined=projectedOwnedForInventoryItem(selectedItemName());
        }else{
          combined=calculateOwnedPlusPlanPlusChoice(currentOwnedObject(),calculateAdditionalOwnedFromPlanAndChoice(currentPlanObject(),currentGuaranteedObject(),probability()),{});
        }
        const simplified=simplifyUpByLevel(combined);

        const grid=document.createElement("div");
        grid.className="compact-result";
        snapshotLevels.forEach(level=>{
          const cell=document.createElement("div");
          cell.innerHTML=`<div class="th">L${level}</div><div class="td">${simplified[level]?roundNice(simplified[level]):"-"}</div>`;
          grid.appendChild(cell);
        });
        wrap.appendChild(grid);
      }
    }

    function makeRemainingChestsResult(id,levels,values){
      const hasRemaining=values.some(value=>value !== "-" && value !== "" && value !== null && value !== undefined);
      if(hasRemaining){
        makeTable(id,levels,values);
        return;
      }

      const grid=document.getElementById(id);
      if(!grid) return;
      grid.className="success-message";
      grid.innerHTML="Congratulations! Desired level met!";
    }

    function setRemainingSectionSubtexts(itemsHasRemaining,chestsHasRemaining){
      const itemSub=document.getElementById("remainingItemsSubtext");
      const chestSub=document.getElementById("remainingChestsSubtext");

      if(itemSub) itemSub.classList.toggle("subtext-hidden",!itemsHasRemaining);
      if(chestSub) chestSub.classList.toggle("subtext-hidden",!chestsHasRemaining);
    }

    function estimatedDisplayLevels(obj){
      const set=new Set(chestLevels);
      Object.keys(obj||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        if(level>=1 && level<=MAX_ITEM_LEVEL && Number(obj[levelKey]||0)>0) set.add(level);
      });
      return Array.from(set).sort((a,b)=>b-a);
    }

    function makeBundlePills(randomObj,type,choiceObj){
      let entries=[];

      if(choiceObj){
        Object.keys(choiceObj||{}).forEach(levelKey=>{
          const level=Number(levelKey);
          const value=Math.floor(Number(choiceObj[levelKey]||0));
          if(value>0) entries.push({level,value,type:"choice"});
        });
        Object.keys(randomObj||{}).forEach(levelKey=>{
          const level=Number(levelKey);
          const value=Math.floor(Number(randomObj[levelKey]||0));
          if(value>0) entries.push({level,value,type:"random"});
        });

        entries.sort((a,b)=>{
          if(b.level!==a.level) return b.level-a.level;
          if(a.type===b.type) return 0;
          return a.type==="choice" ? -1 : 1;
        });
      }else{
        Object.keys(randomObj||{}).forEach(levelKey=>{
          const level=Number(levelKey);
          const value=Math.floor(Number(randomObj[levelKey]||0));
          if(value>0) entries.push({level,value,type});
        });
        entries.sort((a,b)=>b.level-a.level);
      }

      if(!entries.length){
        return `<div class="empty-message" style="margin-top:0;">No bundle chests selected yet.</div>`;
      }

      return `<div class="bundle-pill-row">
        ${entries.map(entry=>`
          <div class="bundle-pill-wrap">
            <div class="pill-level">L${entry.level}</div>
            <div class="bundle-pill ${entry.type}">
              <div class="bundle-pill-qty">${Math.floor(entry.value)}</div>
              <div class="bundle-pill-type">${entry.type}</div>
            </div>
          </div>
        `).join("")}
      </div>`;
    }

    function renderBundleAppliedSummary(containerId){
      const el=document.getElementById(containerId);
      if(!el) return;

      const totals=bundleTotals();
      const choiceShown = mode==="manual" ? (totals.choice || {}) : currentBankRedeemedAsChoiceSource();

      const hasRandom=Object.values(totals.random||{}).some(v=>Number(v)>0);
      const hasChoice=Object.values(choiceShown||{}).some(v=>Number(v)>0);

      el.innerHTML=`
        <div class="bundle-summary-title">Applied From Top Up Bundles / Choice Chest Bank</div>
        ${hasRandom || hasChoice ? makeBundlePills(totals.random,"random",choiceShown) : `<div class="empty-message" style="margin-top:0;">No bundle chests selected yet.</div>`}
      `;
    }

function renderChoiceBankRedeem(containerId){
      const el=document.getElementById(containerId);
      if(!el) return;
      if(mode==="manual"){ el.innerHTML=""; return; }
      ensureBankObjects();
      syncChoiceBankFromDerived();
      const generatedHere=bundleTotals().choice || {};
      const levels=new Set([...chestLevels,...Object.keys(generatedHere||{}).map(Number),...Object.keys(currentRedeemedBankObject()||{}).map(Number)]);
      const entries=Array.from(levels).map(level=>({
        level,
        earnedHere:currentChoiceBankEarnedHere(level),
        value:availableChoiceBankAtLevel(level),
        redeemed:Math.floor(Number(currentRedeemedBankObject()[level]||0))
      })).filter(x=>x.earnedHere>0 || x.value>0 || x.redeemed>0).sort((a,b)=>b.level-a.level);
      if(!entries.length){ el.innerHTML=""; return; }
      el.innerHTML=`<div class="choice-bank-card ${choiceBankExpanded ? "choice-bank-open" : ""}">
        <button class="choice-bank-toggle" type="button" data-action="toggleChoiceBankCollapse" data-action-event="click">
          <span>Choice Chest Bank Available</span>
          <span class="chev">⌄</span>
        </button>
        <div class="choice-bank-body">
          ${entries.map(entry=>`<div class="redeem-row">
            <div class="redeem-level">Lvl ${entry.level}</div>
            <div class="redeem-available">${entry.earnedHere} earned here · ${entry.value} available${entry.redeemed>0 ? ` · ${entry.redeemed} redeemed here` : ""}</div>
            <div class="redeem-actions">
              <button data-action="redeemChoiceFromBank" data-action-event="click" data-arg0="${entry.level}" data-arg1="1">+1</button>
              <button data-action="adjustRedeemedChoice" data-action-event="click" data-arg0="${entry.level}" data-arg1="-1">-1</button>
              <button data-action="redeemChoiceFromBank" data-action-event="click" data-arg0="${entry.level}" data-arg1="${entry.value}">Use all</button>
              <button data-action="removeAllRedeemedChoice" data-action-event="click" data-arg0="${entry.level}">Remove all</button>
            </div>
          </div>`).join("")}
        </div>
      </div>`;
    }

    function calculateResults(){
      updateNontargetSideLabels();
      updateTotalLeftoverItemsText();
      updateSideLeftoverLabels();
      const p=probability();
      const target=Number(document.getElementById("targetLevel").value||7);
      const owned=currentOwnedObject();
      const plan=currentPlanObject();
      const guaranteed=currentGuaranteedObject();
      const totalChoice=totalChoiceObject();
      const bundleRandom=bundleRandomTotals();
      const activePlan=levelObjectPlus(plan,bundleRandom);

      const additionalOwned=calculateAdditionalOwnedFromPlan(activePlan,p);
      const additionalOwnedForRemainingItems=calculateAdditionalOwnedFromPlanAndChoice(activePlan,totalChoice,p);
      const effectiveOwned=calculateOwnedPlusPlanPlusChoice(owned,additionalOwned,totalChoice);
      const effectiveOwnedForItems=calculateEffectiveOwnedForRemainingItems(owned,activePlan,totalChoice,p);

      const itemResultLevels=allItemLevels.filter(level=>level<=target);
      const showHighChests=document.getElementById("showHighChestLevels")?.checked;
      const chestResultLevels=showHighChests ? chestLevels : chestDefaultLevels;

      const itemValues=itemResultLevels.map(level=>{
        const raw=requiredAtLevel(target,level);
        const ownedEq=levelObjectEquivalentAtLevel(effectiveOwnedForItems,level);
        const remaining=Math.max(0,raw-ownedEq);
        return remaining>0 ? String(Math.ceil(remaining)) : "-";
      });

      const chestValues=chestResultLevels.map(level=>{
        const effectiveOwnedForChestColumn=calculateEffectiveOwnedForRemainingChestColumn(owned,activePlan,totalChoice,p,level);
        const raw=requiredAtLevel(target,level);
        const ownedEq=levelObjectEquivalentAtLevel(effectiveOwnedForChestColumn,level);
        const remainingItems=Math.max(0,raw-ownedEq);
        const baseChestNeed=remainingItems>0 ? Math.ceil(remainingItems/p) : 0;
        const planSameLevel=Number(activePlan[level]||0);
        const chestNeed=Math.max(0,baseChestNeed-planSameLevel);
        return chestNeed ? String(chestNeed) : "-";
      });

      const expectedAddtlOwned=targetItemsFromPlanAndChoice(activePlan,totalChoice,p);
      const estimatedLevels=estimatedDisplayLevels(expectedAddtlOwned);
      const expectedValues=estimatedLevels.map(level=>{
        const val=expectedAddtlOwned[level]||0;
        return val>0 ? String(val) : "-";
      });

      const side=selectedSide();

      // Deterministic nontarget logic:
      // Every random chest creates exactly one item.
      // Side totals use the actual game drop table: Left = 2/3, Right = 1/3.
      // Target items are then subtracted from the selected target item's side.
      const nontargetTotals=nontargetSideTotalsFromRandomPlan(activePlan,side,p);

      const leftSideValues=valuesFromLevelObject(nontargetTotals.left,chestLevels);
      const rightSideValues=valuesFromLevelObject(nontargetTotals.right,chestLevels);

      const randomSideDisplayValues=chestLevels.map(level=>{
        const leftVal=safeNum(nontargetTotals.left[level]);
        const rightVal=safeNum(nontargetTotals.right[level]);
        if(leftVal<=0 && rightVal<=0) return "-";
        const parts=[];
        if(leftVal>0) parts.push("L: "+Math.floor(leftVal));
        if(rightVal>0) parts.push("R: "+Math.floor(rightVal));
        return parts.join(" / ");
      });

      const noPlanMessage=hasPlanInput() || Object.values(bundleRandom||{}).some(v=>Number(v||0)>0) ? "No leftovers expected." : "No planned chests entered yet.";

      setRemainingSectionSubtexts(
        itemValues.some(value=>value !== "-" && value !== "" && value !== null && value !== undefined),
        chestValues.some(value=>value !== "-" && value !== "" && value !== null && value !== undefined)
      );

      makeRemainingItemsResult("itemsNeededTable",itemResultLevels,itemValues,target);
      makeRemainingChestsResult("remainingTable",chestResultLevels,chestValues);
      makeFilteredResultTable("expectedTable",estimatedLevels,expectedValues,hasPlanInput() ? "No target items expected." : "No planned chests entered yet.");
      makeFilteredResultTable("sameSideTable",chestLevels,leftSideValues,noPlanMessage);
      makeFilteredResultTable("oppositeSideTable",chestLevels,rightSideValues,noPlanMessage);
      makeFilteredResultTable("randomSideLeftoverTable",chestLevels,randomSideDisplayValues,noPlanMessage);

      makeUsageQuickAdjustSummary("randomUsedSummary",plan,"plan","No random chests used.",bundleRandom);
      makeUsageQuickAdjustSummary("choiceUsedSummary",guaranteed,"guaranteed","No choice chests used.",mode==="manual" ? manualTopUpChoiceObject() : currentBankRedeemedAsChoiceSource());

      const qRandom=document.getElementById("quickAdjustRandom");
      const qChoice=document.getElementById("quickAdjustChoice");
      if(qRandom) qRandom.checked=!!state.quickAdjustRandom;
      if(qChoice) qChoice.checked=!!state.quickAdjustChoice;

      const chanceText=(p*100).toFixed(3)+"%";
      const chanceEl=document.getElementById("chanceValue");
      const chanceManualEl=document.getElementById("chanceValueManual");
      const chanceSide=selectedSide();
      [chanceEl,chanceManualEl].forEach(el=>{
        if(!el) return;
        el.textContent=chanceText;
        el.classList.toggle("left-chance",chanceSide==="left");
        el.classList.toggle("right-chance",chanceSide==="right");
      });
      const expectedSub=document.getElementById("expectedTargetSubtext");
      if(expectedSub){
        const itemLabel=mode==="specific" ? selectedItemName() : "target";
        expectedSub.textContent=`Duplicate ${itemLabel} gear acquired from random and choice chests.`;
      }

      toggleChestsUsedVisibility();
    }

    function renderInventoryRandomTables(){
      const leftTotals={};
      const rightTotals={};

      if(typeof computeAllRawItemPlans==="function"){
        computeAllRawItemPlans().forEach(plan=>{
          addObjects(leftTotals,(plan.randomItemsLeftover && plan.randomItemsLeftover.left) || {});
          addObjects(rightTotals,(plan.randomItemsLeftover && plan.randomItemsLeftover.right) || {});
        });
      }

      const leftValues=chestLevels.map(level=>displayWhole(leftTotals[level]));
      const rightValues=chestLevels.map(level=>displayWhole(rightTotals[level]));

      makeFilteredResultTable("inventoryRandomLeftTable",chestLevels,leftValues,"No random left-side items detected from item plans.");
      makeFilteredResultTable("inventoryRandomRightTable",chestLevels,rightValues,"No random right-side items detected from item plans.");
    }


// v1.0.13 module bridge exports
Object.assign(window,{
  renderChoiceBankRedeem
});



// ===== src/render-inventory.js =====
// Inventory rendering and view helpers.

    function updateSideFilterTabs(prefix, filter){
      ["left","right","all"].forEach(value=>{
        const el=document.getElementById(prefix+"-"+value);
        if(el) el.classList.toggle("active", value===filter);
      });
    }

    function sideFilterMarkup(prefix, active){
      const setter = prefix==="inventoryInput" ? "setInventoryInputFilter" : "setUpgradedOwnedFilter";
      return `
        <div class="side-filter-tabs">
          <button id="${prefix}-left" class="tab ${active==="left" ? "active" : ""}" data-action="${setter}" data-action-event="click" data-arg0="left">Left</button>
          <button id="${prefix}-right" class="tab ${active==="right" ? "active" : ""}" data-action="${setter}" data-action-event="click" data-arg0="right">Right</button>
          <button id="${prefix}-all" class="tab ${active==="all" ? "active" : ""}" data-action="${setter}" data-action-event="click" data-arg0="all">All Items</button>
        </div>
      `;
    }

    function updateUpgradedOwnedViewTabs(mode){
      ["combined","calculated"].forEach(value=>{
        const el=document.getElementById("upgradedView-"+value);
        if(el) el.classList.toggle("active", value===mode);
      });
    }

    function upgradedViewModeMarkup(active){
      return `
        <div class="inventory-view-tabs">
          <button id="upgradedView-combined" class="tab ${active==="combined" ? "active" : ""}" data-action="setUpgradedOwnedViewMode" data-action-event="click" data-arg0="combined">Combined Inventory</button>
          <button id="upgradedView-calculated" class="tab ${active==="calculated" ? "active" : ""}" data-action="setUpgradedOwnedViewMode" data-action-event="click" data-arg0="calculated">Calculated Inventory</button>
        </div>
        <div class="inventory-view-note">
          ${active==="combined"
            ? "Combines your inventory with all item plan results."
            : "Shows only projected additions from saved plans."}
        </div>
      `;
    }

    function renderOwnedLevelList(obj, levels){
      const shown=levelsWithValues(obj,levels);
      if(!shown.length){
        return renderEmptyState({title:'',message:'No acquired items yet.',className:'empty-message',compact:true});
      }
      return `
        <div class="owned-level-list">
          ${shown.map(level=>`
            <div class="owned-level-line">
              <span class="level">L${level}</span>
              <span>${roundNice(obj[level])}</span>
            </div>
          `).join("")}
        </div>
      `;
    }

    function sideFilterMarkupCompact(prefix, active){
      const setter = prefix==="inventoryInput" ? "setInventoryInputFilter" : "setUpgradedOwnedFilter";
      return `
        <div class="subtle-filter-row">
          <span>Filter:</span>
          ${renderFilterTabs({idPrefix:prefix,active,setter,labels:{left:"Left",right:"Right",all:"All"}})}
        </div>
      `;
    }

function renderCompactLevelBoxes(obj, levels){
      return renderLevelPillGrid(obj,{levels,emptyHtml:""});
    }


    function inventoryDifferenceObject(active, archived){
      const diff={};
      allItemLevels.forEach(level=>{
        const value=Math.floor(Number((active||{})[level]||0))-Math.floor(Number((archived||{})[level]||0));
        if(value!==0) diff[level]=value;
      });
      return diff;
    }

    function renderCompactDifferenceBoxes(obj, levels){
      const shown=levels.filter(level=>Number((obj||{})[level]||0)!==0);
      if(!shown.length) return renderEmptyState({title:'',message:'No Change',className:'empty-message',compact:true});
      return `
        <div class="compact-readout-grid diff-grid">
          ${shown.map(level=>{
            const value=Number(obj[level]||0);
            const display=value>0 ? `+${roundNice(value)}` : String(roundNice(value));
            return `<div class="compact-readout-cell diff-cell ${value>0 ? "positive" : "negative"}"><div class="th">L${level}</div><div class="td">${display}</div></div>`;
          }).join("")}
        </div>
      `;
    }
    function makeSideHeader(sideLabel, includeHideToggle=false, hideUnacquired=false){
      return `
        <div class="side-section-header">
          <div class="side-section-title">${sideLabel}</div>
          ${includeHideToggle ? `
            <label class="hide-unacquired-inline">
              <input type="checkbox" ${hideUnacquired ? "checked" : ""} data-action="setHideUnacquiredInventory" data-action-event="change" data-source0="checked" />
              <span>Hide unacquired</span>
            </label>
          ` : ""}
        </div>
      `;
    }

    function updateInventoryAdvancedTabs(){
      const mode=(state.inventoryAdvancedMode==="summary") ? "summary" : "breakdown";
      const breakdownTab=document.getElementById("inventoryAdvancedBreakdownTab");
      const summaryTab=document.getElementById("inventoryAdvancedSummaryTab");
      const breakdownPanel=document.getElementById("inventoryAdvancedBreakdownPanel");
      const summaryPanel=document.getElementById("inventoryAdvancedSummaryPanel");

      if(breakdownTab) breakdownTab.classList.toggle("active",mode==="breakdown");
      if(summaryTab) summaryTab.classList.toggle("active",mode==="summary");

      if(breakdownPanel) breakdownPanel.classList.toggle("hidden",mode!=="breakdown");
      if(summaryPanel) summaryPanel.classList.toggle("hidden",mode!=="summary");

      if(mode==="breakdown" && typeof renderBreakdownEstimatedInventory==="function"){
        renderBreakdownEstimatedInventory();
      }
      if(mode==="summary" && typeof renderItemPlanSummary==="function"){
        renderItemPlanSummary();
      }
    }




    function inventoryViewMoreInfoMarkup(){
      return renderCollapsibleCard({
        id:"inventoryViewMoreInfo",
        className:"more-info-card inventory-view-more-info-card",
        openClass:"more-info-open",
        title:"More Information",
        titleClass:"more-info-title",
        bodyClass:"more-info-body",
        buttonClass:"more-info-toggle",
        toggleFn:"toggleInventoryViewMoreInfo()",
        attrs:"data-more-info-section",
        bodyHtml:`
          <p><strong>Combined Inventory</strong> shows your estimated full inventory after applying saved item plans.</p>
          <p>It combines <strong>Current Inventory</strong>, which is what you manually entered, with <strong>Calculated Inventory</strong>, which is what the app estimates from saved item plans.</p>
          <p>Use Combined Inventory when you want to see what your inventory should look like after planned random chests, choice chests, allocated non-target items, and unassigned random items are included.</p>
          <p><strong>Calculated Inventory</strong> shows only the items added from saved item plans. It does not include your manually entered Current Inventory.</p>
          <p>Calculated Inventory can include estimated target-item duplicates, guaranteed choice-chest duplicates, allocated non-target items, and <strong>Random Items Unassigned</strong>.</p>
          <p><strong>Combined Inventory</strong> = Current Inventory + Calculated Inventory.</p>
          <p><strong>Calculated Inventory</strong> = only the additional items from item plans.</p>
          <p>If an item appears in Combined Inventory but not Calculated Inventory, that item came only from Current Inventory. If an item appears in Calculated Inventory, it was added by one or more saved item plans.</p>
        `
      });
    }

    function inventoryArchiveTabsMarkup(active){
      return `
        <div class="inventory-view-tabs archive-master-tabs">
          <button class="tab ${active!=="archived" ? "active" : ""}" data-action="setInventoryArchiveMode" data-action-event="click" data-arg0="active">Active Inventory</button>
          <button class="tab ${active==="archived" ? "active" : ""}" data-action="setInventoryArchiveMode" data-action-event="click" data-arg0="archived">Archived Inventory</button>
        </div>
      `;
    }

    function archiveSideFilterMarkup(active){
      return `
        <div class="subtle-filter-row archive-filter-row">
          <span>Filter:</span>
          ${renderFilterTabs({active,setter:"setInventoryArchiveFilter",labels:{left:"Left",right:"Right",all:"All"}})}
        </div>
      `;
    }

    function compactInventoryCompareRows(labelsAndObjects){
      return renderCompactInventoryRows(labelsAndObjects,{
        pillRenderer: obj=>renderCompactLevelBoxes(simplifyUpByLevel(obj||{}),allItemLevels) || renderEmptyState({title:'',message:'None',className:'empty-message',compact:true})
      });
    }

    function renderArchivedInventoryList(list){
      const archives=Array.isArray(state.inventoryArchives) ? state.inventoryArchives : [];
      const filter=state.inventoryArchiveFilter || "all";
      state.inventoryArchiveExpanded=state.inventoryArchiveExpanded || {};
      list.insertAdjacentHTML("beforeend", inventoryArchiveTabsMarkup("archived"));
      list.insertAdjacentHTML("beforeend", archiveSideFilterMarkup(filter));
      if(!archives.length){
        list.insertAdjacentHTML("beforeend", renderEmptyState({title:'No archived inventories yet.',message:'Saved inventory snapshots will appear here.',className:'empty-message saved-empty'}));
        return;
      }
      archives.forEach(entry=>{
        const expanded=!!state.inventoryArchiveExpanded[entry.id];
        const date=entry.savedAt ? new Date(entry.savedAt).toLocaleString() : "Archived inventory";
        const itemBlocks=ravenItems.filter(item=>filter==="all" || item.side===filter).map(item=>{
          const archived=(entry.inventory||{})[item.name]||{};
          const active=(state.inventory.active||{})[item.name]||{};
          if(!levelObjectHasValues(archived) && !levelObjectHasValues(active)) return "";
          const diff=inventoryDifferenceObject(simplifyUpByLevel(active),simplifyUpByLevel(archived));
          return renderInventorySnapshotBlock({
            title:item.name,
            side:item.side,
            rows:[
              {label:"Archived Inventory",obj:archived},
              {label:"Active Inventory",obj:active}
            ],
            rowRenderer:compactInventoryCompareRows,
            extraHtml:renderSingleCompactRow("Inventory Difference",renderCompactDifferenceBoxes(diff,allItemLevels),{wrapperClass:"scenario-compact-view inventory-difference-row"})
          });
        }).filter(Boolean).join("");
        list.insertAdjacentHTML("beforeend",renderCompactActionCard({
          className:"saved-scenario-card inventory-archive-card compact-saved-card",
          expanded,
          onclick:`toggleInventoryArchiveSnapshot('${entry.id}')`,
          title:entry.name||"Inventory Snapshot",
          subtitle:date,
          note:entry.note || "",
          actions:[
            {label:"Load",className:"ghost-btn",onclick:`loadInventorySnapshot('${entry.id}')`},
            {label:"Delete",className:"danger-btn",onclick:`deleteInventorySnapshot('${entry.id}')`}
          ],
          dropdownClass:"archive-items-wrap saved-snapshot-dropdown",
          dropdownHtml:itemBlocks || renderEmptyState({title:'',message:'Snapshot is empty for this filter.',className:'empty-message',compact:true})
        }));
      });
    }

    function renderInventory(){
      const list=document.getElementById("inventoryList");
      const upgraded=document.getElementById("upgradedInventoryList");
      if(!list || !upgraded) return;

      list.innerHTML="";
      upgraded.innerHTML="";

      const archiveMode=state.inventoryArchiveMode || "active";
      if(archiveMode==="archived"){
        renderArchivedInventoryList(list);
        upgraded.insertAdjacentHTML("beforeend", upgradedViewModeMarkup(state.upgradedOwnedViewMode || "combined"));
        upgraded.insertAdjacentHTML("beforeend", renderEmptyState({title:'Archived Inventory Selected',message:'Switch back to Active Inventory to edit current values.',className:'section-empty-message'}));
        updateUpgradedOwnedViewTabs(state.upgradedOwnedViewMode || "combined");
        return;
      }

      const inputFilter=state.inventoryInputFilter || "all";
      const upgradedFilter=state.upgradedOwnedFilter || "all";
      const upgradedViewMode=state.upgradedOwnedViewMode || "combined";
      const hideUnacquired=!!state.hideUnacquiredInventory;

      list.insertAdjacentHTML("beforeend", inventoryArchiveTabsMarkup("active"));
      list.insertAdjacentHTML("beforeend", sideFilterMarkupCompact("inventoryInput", inputFilter));

      upgraded.insertAdjacentHTML("beforeend", upgradedViewModeMarkup(upgradedViewMode));
      upgraded.insertAdjacentHTML("beforeend", sideFilterMarkupCompact("upgradedOwned", upgradedFilter));

      const renderInventoryInputSection=(sideLabel)=>{
        const side=sideLabel.toLowerCase();
        if(!shouldShowSide(side,inputFilter)) return;

        const heading=document.createElement("div");
        heading.innerHTML=makeSideHeader(sideLabel,true,hideUnacquired);
        list.appendChild(heading.firstElementChild);

        ravenItems.filter(item=>item.side===side).forEach(item=>{
          const card=document.createElement("div");

          const visibleLevels=allItemLevels.filter(level=>{
            if(!hideUnacquired) return true;
            return Number(state.inventory.active[item.name]?.[level]||0)>0;
          });

          if(hideUnacquired && !visibleLevels.length) return;

          card.innerHTML=renderInventoryItemCard({
            title:item.name,
            side:item.side,
            bodyHtml:renderLevelInputGrid({
              itemName:item.name,
              levels:visibleLevels,
              values:state.inventory.active[item.name] || {}
            })
          });
          list.appendChild(card.firstElementChild);
        });
      };

      const renderUpgradedSideSection=(sideLabel)=>{
        const side=sideLabel.toLowerCase();
        if(!shouldShowSide(side,upgradedFilter)) return;

        const heading=document.createElement("div");
        heading.innerHTML=makeSideHeader(sideLabel,false,false);
        upgraded.appendChild(heading.firstElementChild);

        let renderedCount=0;

        ravenItems.filter(item=>item.side===side).forEach(item=>{
          const calculated=projectedAdditionsForInventoryItem(item.name);
          const sourceObject = upgradedViewMode==="calculated"
            ? calculated
            : combinedInventoryForItem(item.name);

          const simplified=simplifyUpByLevel(sourceObject);
          if(!levelObjectHasValues(simplified)) return;

          const upCard=document.createElement("div");
          upCard.innerHTML=renderInventoryItemCard({
            title:item.name,
            side:item.side,
            bodyHtml:renderCompactLevelBoxes(simplified,allItemLevels)
          });
          upgraded.appendChild(upCard.firstElementChild);
          renderedCount++;
        });

        const randomTotal=totalRandomLeftoversBySide(side);
        if(levelObjectHasValues(randomTotal)){
          const randomCard=document.createElement("div");
          randomCard.innerHTML=renderInventoryItemCard({
            title:"Random Items Left Over",
            subtitle:"Could be for any item on this side.",
            side,
            bodyHtml:renderCompactLevelBoxes(randomTotal,chestLevels)
          });
          upgraded.appendChild(randomCard.firstElementChild);
          renderedCount++;
        }

        if(renderedCount===0){
          const empty=document.createElement("div");
          empty.className="section-empty-message";
          empty.innerHTML = upgradedViewMode==="calculated"
            ? "No additional items for this side detected from item plans."
            : "No <strong>Current Inventory</strong> inputs or estimated items from item plans detected for this side.";
          upgraded.appendChild(empty);
        }
      };

      renderInventoryInputSection("LEFT");
      renderInventoryInputSection("RIGHT");

      renderUpgradedSideSection("LEFT");
      renderUpgradedSideSection("RIGHT");
      upgraded.insertAdjacentHTML("beforeend", inventoryViewMoreInfoMarkup());

      updateSideFilterTabs("inventoryInput", inputFilter);
      updateSideFilterTabs("upgradedOwned", upgradedFilter);
      updateUpgradedOwnedViewTabs(upgradedViewMode);
      renderBreakdownEstimatedInventory();
      renderInventoryRandomTables();
      updateInventoryAdvancedTabs();
    }


// v1.0.13 module bridge exports
Object.assign(window,{
  renderCompactLevelBoxes
});



// ===== src/render-breakdown.js =====
// Estimated inventory breakdown rendering helpers.

    function renderRawPills(obj,type){
      return renderLevelPillGrid(obj,{
        levels: allItemLevels,
        gridClass:"raw-pill-grid",
        pillClass:`raw-pill ${type||""}`.trim(),
        levelClass:"pill-level",
        qtyClass:"pill-qty",
        emptyHtml:`<div class="empty-message" style="margin-top:0;">None.</div>`,
        valueFormatter:value=>String(Math.floor(Number(value||0)))
      });
    }

    function renderMixedRandomPills(manualObj,topUpObj){
      const entries=[];
      Object.keys(manualObj||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(manualObj[levelKey]||0));
        if(value>0) entries.push({level,value,type:"manual"});
      });
      Object.keys(topUpObj||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(topUpObj[levelKey]||0));
        if(value>0) entries.push({level,value,type:"topup"});
      });

      entries.sort((a,b)=>{
        if(b.level!==a.level) return b.level-a.level;
        if(a.type===b.type) return 0;
        return a.type==="manual" ? -1 : 1;
      });

      if(!entries.length) return `<div class="empty-message" style="margin-top:0;">None.</div>`;

      return `<div class="raw-pill-grid">
        ${entries.map(entry=>`
          <div class="raw-pill ${entry.type}">
            <div class="pill-level">L${entry.level}</div>
            <div class="pill-qty">${Math.floor(entry.value)}</div>
          </div>
        `).join("")}
      </div>`;
    }

    function renderMixedChoicePills(manualObj,bankObj){
      const entries=[];
      Object.keys(manualObj||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(manualObj[levelKey]||0));
        if(value>0) entries.push({level,value,type:"choice"});
      });
      Object.keys(bankObj||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(bankObj[levelKey]||0));
        if(value>0) entries.push({level,value,type:"bank"});
      });

      entries.sort((a,b)=>{
        if(b.level!==a.level) return b.level-a.level;
        if(a.type===b.type) return 0;
        return a.type==="choice" ? -1 : 1;
      });

      if(!entries.length) return `<div class="empty-message" style="margin-top:0;">None.</div>`;

      return `<div class="raw-pill-grid">
        ${entries.map(entry=>`
          <div class="raw-pill ${entry.type}">
            <div class="pill-level">L${entry.level}</div>
            <div class="pill-qty">${Math.floor(entry.value)}</div>
          </div>
        `).join("")}
      </div>`;
    }

    function breakdownFilterMarkup(active){
      const current=active || "all";
      return `
        <div class="breakdown-filter-row">
          <span>Filter:</span>
          ${renderFilterTabs({active:current,setter:"setBreakdownInventoryFilter",labels:{left:"Left",right:"Right",all:"All"}})}
        </div>
      `;
    }

    function renderNontargetTChart(leftObj,rightObj){
      const leftHtml=levelObjectHasValues(leftObj || {})
        ? renderRawPills(leftObj || {},"left-dest")
        : `<div class="nontarget-t-empty">None</div>`;
      const rightHtml=levelObjectHasValues(rightObj || {})
        ? renderRawPills(rightObj || {},"right-dest")
        : `<div class="nontarget-t-empty">None</div>`;
      return `
        <div class="nontarget-t-chart">
          <div class="nontarget-t-col">
            <div class="nontarget-t-heading"><span class="side-text-left">Left Inventory</span></div>
            <div class="nontarget-t-pill-grid">${leftHtml}</div>
          </div>
          <div class="nontarget-t-col">
            <div class="nontarget-t-heading"><span class="side-text-right">Right Inventory</span></div>
            <div class="nontarget-t-pill-grid">${rightHtml}</div>
          </div>
        </div>
      `;
    }


    function inventoryBreakdownExplainMarkup(){
      return `
        <div class="more-info-card inventory-explain-card" id="inventoryBreakdownExplain" data-more-info-section>
          <button class="more-info-toggle" data-action="toggleInventoryBreakdownExplain" data-action-event="click">
            <div class="more-info-title">Explain this section.</div>
            <div class="chev">⌄</div>
          </button>
          <div class="more-info-body">
            <p><strong>Inventory Summary</strong> shows how each Raven item’s estimated inventory is built. Each item card can include different sections depending on what data exists for that item.</p>
            <p><strong>Current Inventory</strong> shows the items you manually entered for that Raven item.</p>
            <p><strong>Random Chests Used</strong> shows source inputs for that item plan. <span class="explain-neutral">Neutral pills</span> are manual random chests. <span class="explain-green">Green pills</span> are top-up random chests.</p>
            <p><strong>Raw Duplicates for [Item] - Random Chests</strong> shows estimated duplicate target items from random chests before final 3-to-1 simplification.</p>
            <p><strong>Raw Duplicates for [Item] - Choice Chests</strong> shows guaranteed duplicate target items from manual choice chests or redeemed bank choice chests. Choice chest source values may use <span class="explain-gold">gold pills</span> when they came from redeemed bank/top-up choice chests.</p>
            <p><strong>Final Target Item Added</strong> shows the simplified/upgraded duplicate result credited to that Raven item.</p>
            <p><strong>Allocated Non-target Items</strong> shows non-target gear assigned by destination. <span class="explain-blue">Blue pills</span> go to <span class="side-text-left">Left Inventory</span>, and <span class="explain-purple">purple pills</span> go to <span class="side-text-right">Right Inventory</span>.</p>
            <p><strong>Allocated [Item] Duplicates From Other Plans</strong> shows duplicates credited to this item from other Raven item plans. The <strong>Show more</strong> expansion can list which specific item plans contributed those duplicates.</p>
            <p><strong>Starting Inventory</strong> is the Current Inventory already entered for that item. <strong>Other Plans Total</strong> is the combined duplicate contribution coming from other item plans.</p>
            <p><strong>Random Items Unassigned</strong> may appear elsewhere in inventory views when side-based random results cannot be confidently assigned to one specific Raven item.</p>
            <p>Some sections may not appear if there are no matching values for the selected item, side, filter, or saved plan.</p>
          </div>
        </div>
      `;
    }


    function renderBreakdownEstimatedInventory(){
      const wrap=document.getElementById("breakdownEstimatedInventoryList");
      if(!wrap) return;
      wrap.innerHTML="";

      const filter=state.breakdownInventoryFilter || "all";
      wrap.insertAdjacentHTML("beforeend", breakdownFilterMarkup(filter));

      let rendered=0;

      ravenItems.forEach(item=>{
        if(!shouldShowSide(item.side,filter)) return;

        const itemName=item.name;
        const outputs=computePlanOutputsForItem(itemName);
        const rawPlan=computeRawItemPlan(itemName);
        const contributionDetails=duplicateContributionDetailsForItem(itemName,itemName);
        const duplicatesFromOtherPlans=duplicatesFromOtherRawPlans(itemName,itemName);
        const currentInventory=(rawPlan && rawPlan.currentInventory) || ((state.inventory.active && state.inventory.active[itemName]) || {});

        const hasManualRandom=levelObjectHasValues(outputs.manualRandom || {});
        const hasTopUpRandom=levelObjectHasValues(outputs.topUpRandom || {});
        const hasRandomUsed=hasManualRandom || hasTopUpRandom;
        const hasRandomTarget=levelObjectHasValues(outputs.rawTargetRandom || {});
        const hasChoice=levelObjectHasValues(outputs.rawManualChoice || {}) || levelObjectHasValues(outputs.rawRedeemedChoice || {});
        const hasLeft=levelObjectHasValues(outputs.rawAssignedLeft || {});
        const hasRight=levelObjectHasValues(outputs.rawAssignedRight || {});
        const hasAssignable=hasLeft || hasRight;
        const finalContribution=finalBreakdownContribution(outputs);
        const hasFinal=levelObjectHasValues(finalContribution || {});
        const hasCurrentInventory=levelObjectHasValues(currentInventory || {});
        const hasOtherDuplicates=levelObjectHasValues(duplicatesFromOtherPlans || {});

        if(!hasRandomUsed && !hasRandomTarget && !hasChoice && !hasAssignable && !hasFinal && !hasCurrentInventory && !hasOtherDuplicates) return;

        const badgeClass=item.side==="right" ? "side-badge right" : "side-badge";
        const card=document.createElement("div");
        card.className="breakdown-source-card";
        card.setAttribute("data-source-item",itemName);

        const contributionRows=contributionDetails.length ? contributionDetails.map(detail=>`
          <div class="contribution-row">
            <div class="contribution-source">${detail.sourceItem} plan</div>
            ${renderRawPills(detail.values || {},"calculated")}
          </div>
        `).join("") : `<div class="empty-message" style="margin-top:0;">No duplicate contributions from other plans.</div>`;

        card.innerHTML=`
          <button class="breakdown-source-toggle" type="button" data-action="toggleBreakdownSource" data-action-event="click" data-source0="element">
            <div class="breakdown-source-title">
              <div class="breakdown-source-name">${itemName}</div>
            </div>
            <div class="breakdown-source-right">
              <div class="${badgeClass}">${item.side.toUpperCase()}</div>
              <div class="breakdown-card-chev">⌄</div>
            </div>
          </button>
          <div class="breakdown-source-body">
            ${(hasRandomUsed || hasRandomTarget) ? `
              <div class="breakdown-random-group">
                ${hasRandomUsed ? `
                  <div class="breakdown-line">
                    <div class="breakdown-line-title">Random Chests Used</div>
                    ${renderMixedRandomPills(outputs.manualRandom || {}, outputs.topUpRandom || {})}
                  </div>
                ` : ""}
                ${hasRandomTarget ? `
                  <div class="breakdown-line">
                    <div class="breakdown-line-title">Raw Duplicates for ${itemName} - Random Chests</div>
                    ${renderRawPills(outputs.rawTargetRandom || {},"calculated")}
                  </div>
                ` : ""}
              </div>
            ` : ""}

            ${hasChoice ? `
              <div class="breakdown-line">
                <div class="breakdown-line-title">Raw Duplicates for ${itemName} - Choice Chests</div>
                ${renderMixedChoicePills(outputs.rawManualChoice || {}, outputs.rawRedeemedChoice || {})}
              </div>
            ` : ""}

            ${hasFinal ? `
              <div class="breakdown-line breakdown-final-line">
                <div class="breakdown-line-title">Final Target Item Added</div>
                ${renderRawPills(finalContribution || {},"final")}
              </div>
            ` : ""}

            ${hasAssignable ? `
              <div class="breakdown-line">
                <div class="breakdown-line-title">Allocated Non-target Items</div>
                ${renderNontargetTChart(outputs.rawAssignedLeft || {}, outputs.rawAssignedRight || {})}
              </div>
            ` : ""}

            ${(hasCurrentInventory || hasOtherDuplicates) ? `
              <div class="breakdown-line allocated-other-plans-line">
                <div class="breakdown-line-title">Allocated ${itemName} Duplicates From Other Plans</div>
                <div class="contribution-row">
                  <div class="contribution-source">Starting Inventory</div>
                  ${renderRawPills(currentInventory || {},"calculated")}
                </div>
                <div class="contribution-row">
                  <div class="contribution-source">Other Plans Total</div>
                  ${renderRawPills(duplicatesFromOtherPlans || {},"calculated")}
                </div>
                <details class="show-more-contributions">
                  <summary>Show more</summary>
                  <div class="contribution-detail-list">${contributionRows}</div>
                </details>
              </div>
            ` : ""}
          </div>
        `;

        wrap.appendChild(card);
        rendered++;
      });

      if(rendered===0){
        const empty=document.createElement("div");
        empty.className="section-empty-message";
        empty.textContent="No inventory summary values detected yet.";
        wrap.appendChild(empty);
      }

      wrap.insertAdjacentHTML("beforeend", inventoryBreakdownExplainMarkup());
    }



    function itemPlanHasAnyActivity(itemName){
      const outputs=computePlanOutputsForItem(itemName);
      return levelObjectHasValues((state.inventory.active && state.inventory.active[itemName]) || {})
        || levelObjectHasValues(outputs.manualRandom || {})
        || levelObjectHasValues(outputs.topUpRandom || {})
        || levelObjectHasValues(outputs.rawManualChoice || {})
        || levelObjectHasValues(outputs.rawRedeemedChoice || {})
        || levelObjectHasValues(outputs.rawTargetRandom || {})
        || levelObjectHasValues(outputs.rawChoice || {})
        || levelObjectHasValues(outputs.randomLeft || {})
        || levelObjectHasValues(outputs.randomRight || {});
    }

    function renderPlanSummaryPills(entries){
      if(!entries.length) return `<div class="empty-message" style="margin-top:0;">None.</div>`;
      return `<div class="plan-summary-pill-grid">
        ${entries.map(entry=>`
          <div class="plan-summary-pill ${entry.className || ""}">
            <div class="pill-level">L${entry.level}</div>
            <div class="pill-qty">${Math.floor(Number(entry.value||0))}</div>
            <div class="pill-source">${entry.label}</div>
          </div>
        `).join("")}
      </div>`;
    }

    function chestsUsedSummaryEntries(outputs){
      const entries=[];
      const pushEntries=(obj,kind,source,label,className)=>{
        Object.keys(obj||{}).forEach(levelKey=>{
          const level=Number(levelKey);
          const value=Math.floor(Number(obj[levelKey]||0));
          if(value>0) entries.push({level,value,kind,source,label,className});
        });
      };

      pushEntries(outputs.rawManualChoice || {},"choice","manual","Choice Manual","choice-manual");
      pushEntries(outputs.rawRedeemedChoice || {},"choice","topup","Choice Bank","choice-bank");
      pushEntries(outputs.manualRandom || {},"random","manual","Random Manual","random-manual");
      pushEntries(outputs.topUpRandom || {},"random","topup","Random Top Up","random-topup");

      const kindRank={choice:0,random:1};
      const sourceRank={manual:0,topup:1};
      entries.sort((a,b)=>{
        if(b.level!==a.level) return b.level-a.level;
        if(kindRank[a.kind]!==kindRank[b.kind]) return kindRank[a.kind]-kindRank[b.kind];
        if(sourceRank[a.source]!==sourceRank[b.source]) return sourceRank[a.source]-sourceRank[b.source];
        return a.label.localeCompare(b.label);
      });

      return entries;
    }

    function renderSideLeftoverPills(leftObj,rightObj){
      const levels=allItemLevels.filter(level=>Number((leftObj||{})[level]||0)>0 || Number((rightObj||{})[level]||0)>0);
      if(!levels.length) return `<div class="empty-message" style="margin-top:0;">None.</div>`;
      return `<div class="raw-pill-grid">
        ${levels.map(level=>{
          const parts=[];
          const left=Math.floor(Number((leftObj||{})[level]||0));
          const right=Math.floor(Number((rightObj||{})[level]||0));
          if(left>0) parts.push(`L: ${left}`);
          if(right>0) parts.push(`R: ${right}`);
          return `
            <div class="raw-pill summary-leftover">
              <div class="pill-level">L${level}</div>
              <div class="pill-qty">${parts.join(" / ")}</div>
            </div>
          `;
        }).join("")}
      </div>`;
    }

    function planLevelRemaindersForSide(pool, divisor){
      const remainder={};
      Object.keys(pool||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(pool[levelKey]||0));
        const rem=value % divisor;
        if(rem>0) remainder[level]=rem;
      });
      return remainder;
    }

    function planRandomLeftoversBySide(sourceItem, outputs){
      return {
        left: planLevelRemaindersForSide(outputs.randomLeft || {}, sourceItem.side==="left" ? 2 : 3),
        right: planLevelRemaindersForSide(outputs.randomRight || {}, sourceItem.side==="right" ? 2 : 3)
      };
    }



    function planSummaryShareLevelObject(pool,divisor){
      const result={};
      const safeDivisor=Math.max(1,Math.floor(Number(divisor||1)));
      Object.keys(pool||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(pool[levelKey]||0));
        const share=Math.floor(value/safeDivisor);
        if(share>0) result[level]=share;
      });
      return result;
    }

    function duplicateCreditsForItemFromOtherPlans(inventoryItemName, excludeSourceName){
      const total={};
      ravenItems.forEach(sourceItem=>{
        const sourceName=sourceItem.name;
        if(sourceName===excludeSourceName) return;

        const outputs=computePlanOutputsForItem(sourceName);

        if(sourceName===inventoryItemName){
          addObjects(total, outputs.additionalOwned || {});
          return;
        }

        const sameSideItems=otherItemsOnSide(sourceItem.side,sourceName);
        const oppositeSide=sourceItem.side==="left" ? "right" : "left";
        const oppositeItems=itemsBySide(oppositeSide);

        if(sameSideItems.includes(inventoryItemName)){
          const divisor=sourceItem.side==="left" ? 2 : 3;
          addObjects(total, planSummaryShareLevelObject(outputs.randomLeft || {}, divisor));
        }

        if(oppositeItems.includes(inventoryItemName)){
          const divisor=sourceItem.side==="right" ? 2 : 3;
          addObjects(total, planSummaryShareLevelObject(outputs.randomRight || {}, divisor));
        }
      });
      return total;
    }

    function calculatedItemPlanInventoryRaw(itemName,targetRaw){
      return addLevelObjects((state.inventory.active && state.inventory.active[itemName]) || {}, targetRaw || {});
    }

    function totalCalculatedInventoryRaw(itemName,targetRaw,otherPlanDuplicates){
      return addLevelObjects(
        (state.inventory.active && state.inventory.active[itemName]) || {},
        targetRaw || {},
        otherPlanDuplicates || {}
      );
    }


    function renderItemPlanSummary(){
      const wrap=document.getElementById("itemPlanSummaryList");
      if(!wrap) return;
      wrap.innerHTML="";

      let rendered=0;

      ravenItems.forEach(sourceItem=>{
        const sourceName=sourceItem.name;
        const rawPlan=computeRawItemPlan(sourceName);
        const outputs=computePlanOutputsForItem(sourceName);
        const badgeClass=sourceItem.side==="right" ? "side-badge right" : "side-badge";
        const targetRaw=targetDuplicatesForPlanRaw(rawPlan);
        const calculatedItemPlanInventory=calculatedItemPlanInventoryRawFromPlan(rawPlan);
        const duplicatesFromOtherPlans=duplicatesFromOtherRawPlans(sourceName,sourceName);
        const totalCalculatedInventory=totalCalculatedInventoryRaw(sourceName,targetRaw,duplicatesFromOtherPlans);
        const planLeftovers=(rawPlan && rawPlan.randomItemsLeftover) || {left:{},right:{}};

        const card=document.createElement("div");
        card.className="breakdown-source-card item-plan-summary-card";
        card.setAttribute("data-source-item",sourceName);

        card.innerHTML=`
          <button class="breakdown-source-toggle" type="button" data-action="toggleBreakdownSource" data-action-event="click" data-source0="element">
            <div class="breakdown-source-title">
              <div class="breakdown-source-name">${sourceName}</div>
            </div>
            <div class="breakdown-source-right">
              <div class="${badgeClass}">${sourceItem.side.toUpperCase()}</div>
              <div class="breakdown-card-chev">⌄</div>
            </div>
          </button>
          <div class="breakdown-source-body">
            <div class="plan-summary-note">Plan-level audit view. Intended for identifying anomalies in the logic.</div>

            <div class="breakdown-line">
              <div class="breakdown-line-title">Current Inventory</div>
              ${renderRawPills((rawPlan && rawPlan.currentInventory) || {},"calculated")}
            </div>

            <div class="breakdown-line">
              <div class="breakdown-line-title">Random &amp; Choice Chests Used</div>
              ${renderPlanSummaryPills(chestsUsedSummaryEntries(outputs))}
            </div>

            <div class="breakdown-line">
              <div class="breakdown-line-title">Estimated Target Items (RAW)</div>
              ${renderRawPills(targetRaw || {},"calculated")}
            </div>
<div class="breakdown-line plan-summary-calculation-line">
              <div class="breakdown-line-title">Calculated Item Plan Inventory (RAW)</div>
              ${renderRawPills(calculatedItemPlanInventory || {},"calculated")}
            </div>

            <div class="breakdown-line plan-summary-calculation-line">
              <div class="breakdown-line-title">${sourceName} Duplicates From Other Plans:</div>
              ${renderRawPills(duplicatesFromOtherPlans || {},"calculated")}
            </div>

            <div class="breakdown-line plan-summary-calculation-line audit-total-line">
              <div class="audit-total-heading">
                <div class="breakdown-line-title">Total Calculated Inventory</div>
                <label class="audit-simplify-toggle">
                  <input type="checkbox" data-action="toggleAuditTotalView" data-action-event="change" />
                  <span>Simplify</span>
                </label>
              </div>
              <div class="audit-total-raw">${renderRawPills(totalCalculatedInventory || {},"final")}</div>
              <div class="audit-total-simplified hidden">${renderRawPills(simplifyUpByLevel(totalCalculatedInventory || {}),"final")}</div>
            </div>

            <div class="breakdown-line">
              <div class="breakdown-line-title">Non-target Items (LEFT)</div>
              ${renderRawPills((rawPlan && rawPlan.nontargetPools && rawPlan.nontargetPools.left) || {},"left-dest")}
            </div>

            <div class="breakdown-line">
              <div class="breakdown-line-title">Non-target Items (RIGHT)</div>
              ${renderRawPills((rawPlan && rawPlan.nontargetPools && rawPlan.nontargetPools.right) || {},"right-dest")}
            </div>

            <div class="breakdown-line">
              <div class="breakdown-line-title">Random Items Unassigned</div>
              ${renderSideLeftoverPills(planLeftovers.left || {}, planLeftovers.right || {})}
            </div>

            <div class="breakdown-line plan-summary-control-line">
              <div class="breakdown-line-title">Balance Check</div>
              <div class="plan-summary-control-grid">
                <div><span>Random Chests</span><strong>${rawPlan.audit.randomChestCount}</strong></div>
                <div><span>Generated</span><strong>${rawPlan.audit.generatedCount}</strong></div>
                <div><span>Target</span><strong>${rawPlan.audit.targetRandomCount}</strong></div>
                <div><span>Non-target</span><strong>${rawPlan.audit.nontargetCount}</strong></div>
                <div><span>Allocated</span><strong>${rawPlan.audit.allocatedCount}</strong></div>
                <div><span>Leftover</span><strong>${rawPlan.audit.leftoverCount}</strong></div>
                <div class="${rawPlan.audit.balances ? "ok" : "bad"}"><span>Balance</span><strong>${rawPlan.audit.balances ? "OK" : "CHECK"}</strong></div>
              </div>
            </div>
          </div>
        `;

        wrap.appendChild(card);
        rendered++;
      });

      if(rendered===0){
        const empty=document.createElement("div");
        empty.className="section-empty-message";
        empty.textContent="No item plans detected yet.";
        wrap.appendChild(empty);
      }
    }



// ===== src/render-whatif.js =====
// What If sandbox rendering. This page uses Combined Inventory as its baseline and does not affect saved plans, Top Ups, or Choice Chest Bank.

function ensureWhatIfState(){
  state.whatIf=state.whatIf || {};
  state.whatIf.activeTab=state.whatIf.activeTab || "scenarios";
  state.whatIf.current=state.whatIf.current || {};
  state.whatIf.current.item=state.whatIf.current.item || "Heart of Wisdom";
  state.whatIf.current.targetLevel=Number(state.whatIf.current.targetLevel || 7);
  state.whatIf.current.random=state.whatIf.current.random || {};
  state.whatIf.current.choice=state.whatIf.current.choice || {};
  state.whatIf.current.showHigh=!!state.whatIf.current.showHigh;
  state.whatIf.current.name=state.whatIf.current.name || "";
  delete state.whatIf.current.name;
  delete state.whatIf.current.note;
  state.whatIf.current.previewOpen=!!state.whatIf.current.previewOpen;
  state.whatIf.current.nontargetBreakdownOpen=!!state.whatIf.current.nontargetBreakdownOpen;
  state.whatIf.current.baselineMode=state.whatIf.current.baselineMode || "current";
  state.whatIf.current.savedBaseline=state.whatIf.current.savedBaseline || null;
  state.whatIf.saved=Array.isArray(state.whatIf.saved) ? state.whatIf.saved : [];
  state.whatIf.expandedSnapshots=state.whatIf.expandedSnapshots || {};
}

function whatIfItem(){
  ensureWhatIfState();
  return ravenItems.find(x=>x.name===state.whatIf.current.item) || ravenItems[0];
}

function whatIfProbability(){
  return whatIfItem().side==="left" ? 2/9 : 1/9;
}

function whatIfLevelPills(obj, emptyText){
  return renderLevelPillGrid(obj,{
    levels: allItemLevels.slice().sort((a,b)=>b-a),
    transform: source=>simplifyUpByLevel(source || {}),
    gridClass:"whatif-pill-grid",
    pillClass:"whatif-pill",
    levelClass:"pill-level",
    qtyClass:"pill-qty",
    emptyHtml:renderEmptyState({title:"",message:emptyText,className:"empty-message",compact:true})
  });
}

function whatIfRawPills(obj, emptyText){
  return renderLevelPillGrid(obj,{
    levels: allItemLevels.slice().sort((a,b)=>b-a),
    gridClass:"whatif-pill-grid",
    pillClass:"whatif-pill",
    levelClass:"pill-level",
    qtyClass:"pill-qty",
    emptyHtml:renderEmptyState({title:"",message:emptyText,className:"empty-message",compact:true})
  });
}

function whatIfCompactInventoryRows(rows){
  return renderCompactInventoryRows(rows,{
    pillRenderer: obj=>whatIfLevelPills(obj || {}, "None")
  });
}

function getWhatIfBaselineForCurrent(){
  ensureWhatIfState();
  const item=whatIfItem();
  const saved=state.whatIf.current.savedBaseline;
  if(state.whatIf.current.baselineMode==="saved" && saved && saved.item===item.name){
    return {starting:saved.starting||{},combined:saved.combined||{},label:"Saved Inventory Baseline"};
  }
  const starting=(state.inventory.active && state.inventory.active[item.name]) || {};
  const combined=typeof combinedInventoryForItem==="function" ? combinedInventoryForItem(item.name) : starting;
  return {starting,combined,label:"Current Inventory Baseline"};
}

function renderWhatIfSetupPreview(){
  const card=document.getElementById("whatIfSetupPreviewCard");
  const body=document.getElementById("whatIfSetupPreviewBody");
  const wrap=document.getElementById("whatIfSetupInventoryPreview");
  if(!wrap) return;
  const open=!!state.whatIf.current.previewOpen;
  if(card) card.classList.toggle("open",open);
  if(body) body.classList.toggle("hidden",!open);
  const base=getWhatIfBaselineForCurrent();
  wrap.innerHTML=whatIfCompactInventoryRows([
    {label:"Starting Inventory",obj:base.starting},
    {label:"Combined Inventory",obj:base.combined}
  ]);
}

function renderWhatIfChestInputs(){
  ensureWhatIfState();
  const wrap=document.getElementById("whatIfChestInputs");
  if(!wrap) return;
  const levels=state.whatIf.current.showHigh ? [7,6,5,4,3,2,1] : [5,4,3,2,1];
  wrap.innerHTML=levels.map(level=>`
    <div class="compact-chest-row">
      <div class="compact-chest-level">Lvl ${level}</div>
      <div class="compact-chest-field">
        <label>Random</label>
        <input data-input-key="whatif-random-${level}" type="number" min="0" step="1" value="${state.whatIf.current.random[level]||""}" placeholder="0" data-action="setWhatIfChestValue" data-action-event="input" data-arg0="random" data-arg1="${level}" data-source2="value" />
      </div>
      <div class="compact-chest-field">
        <label>Choice</label>
        <input data-input-key="whatif-choice-${level}" type="number" min="0" step="1" value="${state.whatIf.current.choice[level]||""}" placeholder="0" data-action="setWhatIfChestValue" data-action-event="input" data-arg0="choice" data-arg1="${level}" data-source2="value" />
      </div>
    </div>
  `).join("");
}

function whatIfHasInputs(){
  ensureWhatIfState();
  return Object.values(state.whatIf.current.random||{}).some(v=>Number(v||0)>0) || Object.values(state.whatIf.current.choice||{}).some(v=>Number(v||0)>0);
}

function renderWhatIfScenario(){
  ensureWhatIfState();
  const item=whatIfItem();
  const p=whatIfProbability();
  const target=Math.max(1,Math.min(MAX_ITEM_LEVEL,Number(state.whatIf.current.targetLevel||7)));
  const random=state.whatIf.current.random || {};
  const choice=state.whatIf.current.choice || {};
  const baseline=getWhatIfBaselineForCurrent();
  const currentInventory=baseline.starting || {};
  const combined=baseline.combined || {};
  const rawScenarioAdds=rawTargetAdditionsFromPlanAndChoice(random,choice,p);
  const expected=simplifyUpByLevel(rawScenarioAdds);
  const after=simplifyUpByLevel(addLevelObjects(combined,rawScenarioAdds));

  const itemSelect=document.getElementById("whatIfTargetItem");
  if(itemSelect) itemSelect.value=item.name;
  const targetSelect=document.getElementById("whatIfTargetLevel");
  if(targetSelect) targetSelect.value=String(target);
  const high=document.getElementById("whatIfShowHighRandom");
  if(high) high.checked=!!state.whatIf.current.showHigh;
  const chance=document.getElementById("whatIfChanceValue");
  if(chance){
    chance.textContent=(p*100).toFixed(3)+"%";
    chance.classList.toggle("left-chance",item.side==="left");
    chance.classList.toggle("right-chance",item.side==="right");
  }

  renderWhatIfSetupPreview();
  renderWhatIfChestInputs();

  const summary=document.getElementById("whatIfChangeSummary");
  if(summary){
    summary.innerHTML=renderStateRows([
      {title:"Current Inventory",sub:`Manually entered inventory for ${item.name}.`,html:whatIfLevelPills(currentInventory,"No current inventory entered.")},
      {title:"Combined Inventory Baseline",sub:"Current Inventory plus calculated inventory from saved plans.",html:whatIfLevelPills(combined,"No combined inventory yet.")},
      {title:"What If Additions",sub:"Estimated target duplicates from this scenario.",html:whatIfLevelPills(expected,whatIfHasInputs()?"No target items expected.":"No What If chests entered yet.")},
      {title:"After What If",sub:"Combined Inventory plus this scenario.",html:whatIfLevelPills(after,"No inventory projected yet."),strong:true}
    ]);
  }

  const resultLevels=allItemLevels.filter(level=>level<=target);
  const remainingItems=resultLevels.map(level=>{
    const raw=requiredAtLevel(target,level);
    const ownedEq=levelObjectEquivalentAtLevel(calculateEffectiveOwnedForRemainingItems(combined,random,choice,p),level);
    const remaining=Math.max(0,raw-ownedEq);
    return remaining>0 ? String(Math.ceil(remaining)) : "-";
  });

  const chestResultLevels=state.whatIf.current.showHigh ? [7,6,5,4,3,2,1] : [5,4,3,2,1];
  const remainingChests=chestResultLevels.map(level=>{
    const effective=calculateEffectiveOwnedForRemainingChestColumn(combined,random,choice,p,level);
    const raw=requiredAtLevel(target,level);
    const ownedEq=levelObjectEquivalentAtLevel(effective,level);
    const remainingItems=Math.max(0,raw-ownedEq);
    const base=remainingItems>0 ? Math.ceil(remainingItems/p) : 0;
    const already=Number(random[level]||0);
    const need=Math.max(0,base-already);
    return need ? String(need) : "-";
  });

  makeFilteredResultTable("whatIfExpectedTable",estimatedDisplayLevels(expected),estimatedDisplayLevels(expected).map(level=>expected[level]?String(expected[level]):"-"),whatIfHasInputs()?"No target items expected.":"No What If chests entered yet.");

  const hasRemainingItems=remainingItems.some(v=>v!=="-");
  if(hasRemainingItems) makeRemainingItemsChunkedTable("whatIfItemsNeededTable",resultLevels,remainingItems,false);
  else {
    const el=document.getElementById("whatIfItemsNeededTable");
    if(el){ el.className="result-chunks"; el.innerHTML='<div class="success-message">Desired level met in this scenario.</div>'; }
  }
  const hasRemainingChests=remainingChests.some(v=>v!=="-");
  if(hasRemainingChests) makeTable("whatIfRemainingTable",chestResultLevels,remainingChests);
  else {
    const el=document.getElementById("whatIfRemainingTable");
    if(el){ el.className="success-message"; el.innerHTML="Desired level met in this scenario."; }
  }

  const nontarget=nontargetSideTotalsFromRandomPlan(random,item.side,p);
  const nontargetDisplay=chestLevels.map(level=>{
    const left=safeNum(nontarget.left[level]);
    const right=safeNum(nontarget.right[level]);
    if(left<=0 && right<=0) return "-";
    const parts=[];
    if(left>0) parts.push("L: "+Math.floor(left));
    if(right>0) parts.push("R: "+Math.floor(right));
    return parts.join(" / ");
  });
  makeFilteredResultTable("whatIfNontargetTable",chestLevels,nontargetDisplay,whatIfHasInputs()?"No non-target items expected.":"No What If chests entered yet.");
  const panel=document.getElementById("whatIfNontargetSideBreakdown");
  const btn=document.getElementById("whatIfNontargetBreakdownToggle");
  const isOpen=!!state.whatIf.current.nontargetBreakdownOpen;
  if(panel) panel.classList.toggle("open",isOpen);
  if(btn) btn.textContent=isOpen ? "Hide side breakdown" : "Show side breakdown";
  const leftVals=chestLevels.map(level=>safeNum(nontarget.left[level])>0 ? String(Math.floor(safeNum(nontarget.left[level]))) : "-");
  const rightVals=chestLevels.map(level=>safeNum(nontarget.right[level])>0 ? String(Math.floor(safeNum(nontarget.right[level]))) : "-");
  makeFilteredResultTable("whatIfNontargetLeftTable",chestLevels,leftVals,whatIfHasInputs()?"No left-side non-target items expected.":"No What If chests entered yet.");
  makeFilteredResultTable("whatIfNontargetRightTable",chestLevels,rightVals,whatIfHasInputs()?"No right-side non-target items expected.":"No What If chests entered yet.");
}

function renderSavedWhatIfScenarios(){
  ensureWhatIfState();
  const wrap=document.getElementById("savedWhatIfScenarios");
  if(!wrap) return;
  if(!state.whatIf.saved.length){
    wrap.innerHTML=renderEmptyState({title:'No saved scenarios yet.',message:'Saved What If scenarios will appear here.',className:'empty-message saved-empty'});
    return;
  }
  wrap.innerHTML=state.whatIf.saved.map(entry=>{
    const sc=entry.scenario || {};
    const itemName=sc.item || entry.baseline?.item || "Heart of Wisdom";
    const item=ravenItems.find(x=>x.name===itemName) || ravenItems[0];
    const p=item.side==="left" ? 2/9 : 1/9;
    const baseline=entry.baseline || sc.savedBaseline || {starting:{},combined:{}};
    const rawAdds=rawTargetAdditionsFromPlanAndChoice(sc.random||{},sc.choice||{},p);
    const whatIfInventory=simplifyUpByLevel(addLevelObjects(baseline.combined||{},rawAdds));
    const randomCount=Object.values(sc.random||{}).reduce((a,b)=>a+Math.floor(Number(b||0)),0);
    const choiceCount=Object.values(sc.choice||{}).reduce((a,b)=>a+Math.floor(Number(b||0)),0);
    const date=entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : (entry.savedAt ? new Date(entry.savedAt).toLocaleString() : "Saved scenario");
    const changed=baseline.fingerprint && baseline.fingerprint!==currentWhatIfBaselineFingerprint(itemName);
    const expanded=!!state.whatIf.expandedSnapshots[entry.id];
    return renderCompactActionCard({
      className:"saved-scenario-card compact-saved-card",
      expanded,
      onclick:`toggleSavedScenarioSnapshot('${entry.id}')`,
      title:entry.name || ((itemName||"Scenario")+" → Level "+(sc.targetLevel||7)),
      subtitle:date + (changed ? " · Inventory changed" : ""),
      note:entry.note || "",
      meta:`Random: ${randomCount} · Choice: ${choiceCount}`,
      actions:[
        {label:"Load",className:"ghost-btn",onclick:`loadWhatIfScenario('${entry.id}')`},
        {label:"Delete",className:"danger-btn",onclick:`deleteWhatIfScenario('${entry.id}')`}
      ],
      dropdownHtml:whatIfCompactInventoryRows([
        {label:"Starting Inventory",obj:baseline.starting||{}},
        {label:"Combined Inventory",obj:baseline.combined||{}},
        {label:"What If Inventory",obj:whatIfInventory||{}}
      ])
    });
  }).join("");
}

function renderWhatIf(){
  ensureWhatIfState();
  const scenarioBtn=document.getElementById("whatIfScenarioTab");
  const savedBtn=document.getElementById("whatIfSavedTab");
  const scenarioPanel=document.getElementById("whatIfScenarioPanel");
  const savedPanel=document.getElementById("whatIfSavedPanel");
  if(scenarioBtn) scenarioBtn.classList.toggle("active",state.whatIf.activeTab!=="saved");
  if(savedBtn) savedBtn.classList.toggle("active",state.whatIf.activeTab==="saved");
  if(scenarioPanel) scenarioPanel.classList.toggle("hidden",state.whatIf.activeTab==="saved");
  if(savedPanel) savedPanel.classList.toggle("hidden",state.whatIf.activeTab!=="saved");
  renderWhatIfScenario();
  renderSavedWhatIfScenarios();
}


// v1.0.13 module bridge exports
Object.assign(window,{
  ensureWhatIfState,
  getWhatIfBaselineForCurrent,
  renderSavedWhatIfScenarios,
  renderWhatIf,
  renderWhatIfChestInputs,
  renderWhatIfScenario,
  renderWhatIfSetupPreview,
  whatIfCompactInventoryRows,
  whatIfHasInputs,
  whatIfItem,
  whatIfLevelPills,
  whatIfProbability,
  whatIfRawPills
});



// ===== src/action-registry.js =====
// Lightweight app action registry.
// Keeps data-action handling explicit while preserving the current global-script app structure.
(function(){
  const actions=new Map();

  function registerAction(name,handler){
    if(!name || typeof handler!=="function") return;
    actions.set(name,handler);
  }

  function registerActions(map){
    if(!map || typeof map!=="object") return;
    Object.keys(map).forEach(name=>registerAction(name,map[name]));
  }

  function registerWindowAction(name){
    registerAction(name,({args})=>{
      const fn=window[name] || globalThis[name];
      if(typeof fn!=="function") return undefined;
      return fn(...(Array.isArray(args)?args:[]));
    });
  }

  function registerWindowActions(names){
    if(!Array.isArray(names)) return;
    names.forEach(registerWindowAction);
  }

  function hasAction(name){
    return actions.has(name);
  }

  function runAction(name,context){
    const handler=actions.get(name);
    if(typeof handler!=="function") return false;
    handler(context || {});
    return true;
  }

  window.LAP_ACTIONS={
    registerAction,
    registerActions,
    registerWindowAction,
    registerWindowActions,
    hasAction,
    runAction
  };
})();



// ===== src/events-navigation.js =====
    function setRavenSubPage(page,options){
      const opts=options || {};
      const normalized=page==="what-if" ? "whatif" : page;
      ravenSubPage=["whatif","calculator","inventory"].includes(normalized) ? normalized : "calculator";
      const whatIfTab=document.getElementById("whatIfTab");
      const calcTab=document.getElementById("calcTab");
      const inventoryTab=document.getElementById("inventoryTab");
      if(whatIfTab) whatIfTab.classList.toggle("active",ravenSubPage==="whatif");
      if(calcTab) calcTab.classList.toggle("active",ravenSubPage==="calculator");
      if(inventoryTab) inventoryTab.classList.toggle("active",ravenSubPage==="inventory");
      const whatIfPage=document.getElementById("whatIfSubPage");
      if(whatIfPage) whatIfPage.classList.toggle("hidden",ravenSubPage!=="whatif");
      const calculatorPage=document.getElementById("calculatorSubPage");
      const inventoryPage=document.getElementById("inventorySubPage");
      if(calculatorPage) calculatorPage.classList.toggle("hidden",ravenSubPage!=="calculator");
      if(inventoryPage) inventoryPage.classList.toggle("hidden",ravenSubPage!=="inventory");
      if(ravenSubPage==="whatif" && typeof renderWhatIf==="function") renderWhatIf();
      if(!opts.skipHash && typeof updateAppHash==="function") updateAppHash(`raven/${ravenSubPage}`,!!opts.replaceHash);
      if(!opts.skipScroll) window.scrollTo({top:0,behavior:opts.instantScroll ? "auto" : "smooth"});
    }

    function toggleCard(id){
      document.getElementById(id).classList.toggle("open");
    }

    function toggleSettingsPanel(){
      const panel=document.getElementById("settingsPanel");
      const tile=document.getElementById("settingsTile");
      if(!panel) return;
      const isOpen=panel.classList.toggle("open");
      if(tile) tile.classList.toggle("active",isOpen);
    }

    function applyGlobalDisplaySettings(){
      document.body.classList.toggle("hide-more-info-sections",!!state.hideMoreInformationSections);
      document.body.classList.toggle("hide-advanced-sections",!!state.hideAdvancedSections);
      const moreToggle=document.getElementById("hideMoreInformationSetting");
      const advancedToggle=document.getElementById("hideAdvancedSetting");
      if(moreToggle) moreToggle.checked=!!state.hideMoreInformationSections;
      if(advancedToggle) advancedToggle.checked=!!state.hideAdvancedSections;
    }

    function setGlobalSetting(setting,checked){
      if(setting==="moreInfo") state.hideMoreInformationSections=!!checked;
      if(setting==="advanced") state.hideAdvancedSections=!!checked;
      save();
      applyGlobalDisplaySettings();
    }



// ===== src/events-whatif.js =====
    function renderWhatIfPreserve(){
      const activeInfo=(typeof captureActiveInputState==="function") ? captureActiveInputState() : null;
      if(typeof renderWhatIf==="function") renderWhatIf();
      if(typeof restoreActiveInputState==="function") restoreActiveInputState(activeInfo);
    }

    function toggleWhatIfSetupPreview(){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      state.whatIf.current.previewOpen=!state.whatIf.current.previewOpen;
      save();
      renderWhatIfPreserve();
    }

    function toggleSavedScenarioSnapshot(id){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      state.whatIf.expandedSnapshots=state.whatIf.expandedSnapshots || {};
      state.whatIf.expandedSnapshots[id]=!state.whatIf.expandedSnapshots[id];
      save();
      renderWhatIfPreserve();
    }

    function toggleWhatIfNontargetSideBreakdown(){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      state.whatIf.current.nontargetBreakdownOpen=!state.whatIf.current.nontargetBreakdownOpen;
      save();
      renderWhatIfPreserve();
    }

    function inventorySnapshotForItem(itemName,source){
      return JSON.parse(JSON.stringify((source && source[itemName]) || {}));
    }

    function buildWhatIfBaselineSnapshot(itemName){
      const starting=inventorySnapshotForItem(itemName,state.inventory.active);
      const combined=typeof combinedInventoryForItem==="function" ? combinedInventoryForItem(itemName) : starting;
      return {
        item:itemName,
        starting:JSON.parse(JSON.stringify(starting||{})),
        combined:JSON.parse(JSON.stringify(combined||{})),
        fingerprint:JSON.stringify({startingRaw:starting||{},combinedRaw:combined||{},starting:simplifyUpByLevel(starting||{}),combined:simplifyUpByLevel(combined||{})})
      };
    }

    function currentWhatIfBaselineFingerprint(itemName){
      return buildWhatIfBaselineSnapshot(itemName).fingerprint;
    }

    function setWhatIfScenarioText(field,value){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      if(field==="name") state.whatIf.current.name=value;
      if(field==="note") state.whatIf.current.note=value;
      save();
    }

    function setWhatIfTab(tab){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      state.whatIf.activeTab=tab==="saved" ? "saved" : "scenarios";
      save();
      renderWhatIfPreserve();
    }

    function setWhatIfItem(value){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      state.whatIf.current.item=value;
      save();
      renderWhatIfPreserve();
    }

    function setWhatIfTargetLevel(value){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      state.whatIf.current.targetLevel=Math.max(1,Math.min(MAX_ITEM_LEVEL,Math.floor(Number(value||7))));
      save();
      renderWhatIfPreserve();
    }

    function setWhatIfShowHigh(checked){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      state.whatIf.current.showHigh=!!checked;
      save();
      renderWhatIfPreserve();
    }

    function setWhatIfChestValue(kind,level,value){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      const bucket=kind==="choice" ? state.whatIf.current.choice : state.whatIf.current.random;
      bucket[level]=Math.max(0,Math.floor(Number(value||0)));
      save();
      renderWhatIfPreserve();
    }

    function adjustWhatIfChestValue(kind,level,amount){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      const bucket=kind==="choice" ? state.whatIf.current.choice : state.whatIf.current.random;
      const next=Math.max(0,Math.floor(Number(bucket[level]||0))+Math.floor(Number(amount||0)));
      bucket[level]=next;
      save();
      renderWhatIfPreserve();
    }

    function resetWhatIfScenario(){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      const item=state.whatIf.current.item || "Heart of Wisdom";
      const targetLevel=state.whatIf.current.targetLevel || 7;
      state.whatIf.current={item,targetLevel,random:{},choice:{},showHigh:!!state.whatIf.current.showHigh,baselineMode:"current",savedBaseline:null,previewOpen:!!state.whatIf.current.previewOpen,nontargetBreakdownOpen:false};
      save();
      renderWhatIfPreserve();
    }

    async function saveWhatIfScenario(){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      const current=JSON.parse(JSON.stringify(state.whatIf.current));
      const defaultName=`${current.item || "Scenario"} → Level ${current.targetLevel || 7}`;
      const details=await showInventorySnapshotModal({
        title:"Save Current Scenario",
        message:"Name this What If scenario and optionally add a note.",
        defaultName,
        defaultNote:current.note || "",
        nameLabel:"Scenario Name",
        noteLabel:"Optional Note",
        fallbackName:defaultName,
        confirmLabel:"Save Scenario",
        cancelLabel:"Cancel"
      });
      if(!details) return;
      const stamp=new Date();
      const baseline=buildWhatIfBaselineSnapshot(current.item || "Heart of Wisdom");
      current.name=details.name;
      current.note=details.note;
      current.baselineMode="current";
      current.savedBaseline=baseline;
      state.whatIf.saved.unshift({
        id:String(Date.now()),
        name:details.name,
        note:details.note,
        savedAt:stamp.toISOString(),
        updatedAt:stamp.toISOString(),
        baseline,
        scenario:current
      });
      save();
      state.whatIf.activeTab="saved";
      renderWhatIfPreserve();
    }

    async function loadWhatIfScenario(id){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      const found=(state.whatIf.saved||[]).find(x=>x.id===id);
      if(!found) return;
      const shouldLoad=await showConfirmModal({
        title:"Load Saved Scenario?",
        message:"This will replace the current What If setup with the saved scenario.",
        confirmLabel:"Load Scenario",
        cancelLabel:"Cancel",
        confirmClass:"primary-btn"
      });
      if(!shouldLoad) return;
      const loaded=JSON.parse(JSON.stringify(found.scenario || {}));
      const itemName=loaded.item || found.baseline?.item || "Heart of Wisdom";
      const savedBaseline=found.baseline || loaded.savedBaseline || buildWhatIfBaselineSnapshot(itemName);
      const changed=savedBaseline.fingerprint && savedBaseline.fingerprint!==currentWhatIfBaselineFingerprint(itemName);
      if(changed){
        const inventoryChoice=await showChoiceModal({
          title:"Inventory Has Changed",
          message:"The inventory baseline changed since this scenario was saved.",
          choices:[
            {value:"current",label:"Use Current Inventory",className:"primary-btn"},
            {value:"saved",label:"Keep Saved Inventory",className:"ghost-btn"}
          ],
          cancelLabel:"Cancel"
        });
        if(!inventoryChoice) return;
        if(inventoryChoice==="current"){
          const fresh=buildWhatIfBaselineSnapshot(itemName);
          loaded.baselineMode="current";
          loaded.savedBaseline=fresh;
          found.baseline=fresh;
          found.scenario=JSON.parse(JSON.stringify(loaded));
          found.updatedAt=new Date().toISOString();
        }else{
          loaded.baselineMode="saved";
          loaded.savedBaseline=savedBaseline;
        }
      }else{
        loaded.baselineMode="current";
        loaded.savedBaseline=savedBaseline;
      }
      state.whatIf.current=loaded;
      state.whatIf.activeTab="scenarios";
      save();
      renderWhatIfPreserve();
      window.scrollTo({top:0,behavior:"smooth"});
    }

    async function deleteWhatIfScenario(id){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      const found=(state.whatIf.saved||[]).find(x=>x.id===id);
      if(!found) return;
      const shouldDelete=await showConfirmModal({
        title:"Delete Saved Scenario?",
        message:"This saved What If scenario will be permanently removed.",
        confirmLabel:"Delete",
        cancelLabel:"Cancel",
        confirmClass:"danger-btn"
      });
      if(!shouldDelete) return;
      state.whatIf.saved=(state.whatIf.saved||[]).filter(x=>x.id!==id);
      save();
      renderWhatIfPreserve();
    }



// ===== src/events-calculator.js =====
    function setMode(next){
      mode=next;
      document.getElementById("specificModeBtn").classList.toggle("active",mode==="specific");
      document.getElementById("manualModeBtn").classList.toggle("active",mode==="manual");
      document.getElementById("specificFields").classList.toggle("hidden",mode!=="specific");
      document.getElementById("manualFields").classList.toggle("hidden",mode!=="manual");
      renderAll();
    }

    function setManualSide(next){
      manualSide=next;
      document.getElementById("leftSideBtn").classList.toggle("active",manualSide==="left");
      document.getElementById("rightSideBtn").classList.toggle("active",manualSide==="right");
      renderAll();
    }

    function onTargetItemChange(){
      renderAll();
    }

    function setHighestOwned(value){
      state.highestGlobalOwned=Number(value);
      save();
      renderAll();
    }

    function setGroupValue(group,level,value){
      const obj=getGroupObject(group);
      obj[level]=Math.max(0,Math.floor(Number(value||0)));
      save();
      renderAll();
    }

    function adjustGroup(group,level,amount){
      const obj=getGroupObject(group);
      obj[level]=Math.max(0,Math.floor(Number(obj[level]||0))+Math.floor(Number(amount||0)));
      save();
      renderAll();
    }

    function getGroupObject(group){
      if(group==="owned") return currentOwnedObject();
      if(group==="plan") return currentPlanObject();
      if(group==="guaranteed") return currentGuaranteedObject();
      return {};
    }

    function ensureBankObjects(){
      if(!state.topUpBundles) state.topUpBundles={daily1:0,daily2:0,weekly:0};
      if(!state.choiceBank && state.choiceChestBank) state.choiceBank=state.choiceChestBank;
      if(!state.choiceBank) state.choiceBank={};
      state.choiceChestBank=state.choiceBank;
      chestLevels.forEach(level=>{
        if(state.choiceBank[level]===undefined) state.choiceBank[level]=0;
      });
    }

    function choiceBankSourceObject(){
      return currentRedeemedBankObject ? currentRedeemedBankObject() : {};
    }

    function allTopUpBundleObjects(){
      const objects=[];
      if(state.perItemTopUpBundles){
        Object.values(state.perItemTopUpBundles).forEach(obj=>objects.push(obj));
      }
      if(state.manualTopUpBundles) objects.push(state.manualTopUpBundles);
      if(!objects.length && state.topUpBundles) objects.push(state.topUpBundles);
      return objects;
    }

    function topUpChoiceTotalsAllPlans(){
      const totals={};
      allTopUpBundleObjects().forEach(bundleObj=>{
        Object.keys(topUpBundleDefinitions).forEach(key=>{
          const qty=Math.floor(Number((bundleObj||{})[key]||0));
          if(qty<=0) return;
          const def=topUpBundleDefinitions[key];
          Object.keys(def.choice||{}).forEach(levelKey=>{
            const level=Number(levelKey);
            const amount=Math.floor(Number(def.choice[levelKey]||0)*qty);
            if(amount>0) totals[level]=(totals[level]||0)+amount;
          });
        });
      });
      return totals;
    }

    function totalRedeemedChoiceAllPlans(){
      const totals={};
      if(state.choiceBankRedeemed){
        Object.values(state.choiceBankRedeemed).forEach(obj=>{
          Object.keys(obj||{}).forEach(levelKey=>{
            const level=Number(levelKey);
            const qty=Math.floor(Number(obj[levelKey]||0));
            if(qty>0) totals[level]=(totals[level]||0)+qty;
          });
        });
      }
      if(state.manualChoiceBankRedeemed){
        Object.keys(state.manualChoiceBankRedeemed||{}).forEach(levelKey=>{
          const level=Number(levelKey);
          const qty=Math.floor(Number(state.manualChoiceBankRedeemed[levelKey]||0));
          if(qty>0) totals[level]=(totals[level]||0)+qty;
        });
      }
      return totals;
    }

    function derivedChoiceBankAvailable(){
      const generated=topUpChoiceTotalsAllPlans();
      const redeemed=totalRedeemedChoiceAllPlans();
      const available={};
      const levels=new Set([...Object.keys(generated||{}),...Object.keys(redeemed||{})]);
      levels.forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.max(0,Math.floor(Number(generated[level]||0))-Math.floor(Number(redeemed[level]||0)));
        if(value>0) available[level]=value;
      });
      return available;
    }

    function syncChoiceBankFromDerived(){
      state.choiceBank=derivedChoiceBankAvailable();
      state.choiceChestBank=state.choiceBank;
      return state.choiceBank;
    }

    function availableChoiceBankAtLevel(level){
      ensureBankObjects();
      const available=derivedChoiceBankAvailable();
      state.choiceBank=available;
      state.choiceChestBank=state.choiceBank;
      return Math.max(0,Math.floor(Number(available[level]||0)));
    }

    function currentTopUpBundleObject(){
      ensureBankObjects();
      if(!state.perItemTopUpBundles) state.perItemTopUpBundles={};
      if(mode==="specific"){
        const item=selectedItemName();
        state.perItemTopUpBundles[item]=state.perItemTopUpBundles[item] || {daily1:0,daily2:0,weekly:0};
        return state.perItemTopUpBundles[item];
      }
      state.manualTopUpBundles=state.manualTopUpBundles || {daily1:0,daily2:0,weekly:0};
      return state.manualTopUpBundles;
    }

    function currentRedeemedBankObject(){
      if(!state.choiceBankRedeemed) state.choiceBankRedeemed={};
      if(mode==="specific"){
        const item=selectedItemName();
        state.choiceBankRedeemed[item]=state.choiceBankRedeemed[item]||{};
        return state.choiceBankRedeemed[item];
      }
      state.manualChoiceBankRedeemed=state.manualChoiceBankRedeemed||{};
      return state.manualChoiceBankRedeemed;
    }

    function currentBankRedeemedAsChoiceSource(){
      const redeemed=currentRedeemedBankObject();
      const result={};
      Object.keys(redeemed||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(redeemed[levelKey]||0));
        if(value>0) result[level]=value;
      });
      return result;
    }

    function redeemChoiceFromBank(level,amount){
      ensureBankObjects();
      amount=Math.floor(Number(amount||0));
      if(amount<=0) return;
      const available=availableChoiceBankAtLevel(level);
      const use=Math.min(available,amount);
      if(use<=0) return;

      const redeemed=currentRedeemedBankObject();
      redeemed[level]=(Number(redeemed[level]||0)+use);

      syncChoiceBankFromDerived();
      save();
      renderTopUpBundles();
      renderPlanInputs();
      renderAll();
    }

    function returnRedeemedChoiceToBank(level,amount){
      ensureBankObjects();
      const redeemed=currentRedeemedBankObject();
      const availableRedeemed=Math.floor(Number(redeemed[level]||0));
      const giveBack=Math.min(availableRedeemed,Math.floor(Number(amount||0)));
      if(giveBack<=0) return 0;
      redeemed[level]=availableRedeemed-giveBack;
      syncChoiceBankFromDerived();
      return giveBack;
    }

    function adjustRedeemedChoice(level,delta){
      const redeemed=currentRedeemedBankObject();
      const oldValue=Math.max(0,Math.floor(Number(redeemed[level]||0)));
      const next=Math.max(0,oldValue+Math.floor(Number(delta||0)));
      if(next<oldValue){
        redeemed[level]=next;
        syncChoiceBankFromDerived();
      }else if(next>oldValue){
        redeemChoiceFromBank(level,next-oldValue);
        return;
      }
      save();
      renderPlanInputs();
      renderTopUpBundles();
      renderAll();
    }

    function setRedeemedChoice(level,value){
      const redeemed=currentRedeemedBankObject();
      const oldValue=Math.max(0,Math.floor(Number(redeemed[level]||0)));
      const next=Math.max(0,Math.floor(Number(value||0)));
      if(next<oldValue){
        redeemed[level]=next;
        syncChoiceBankFromDerived();
      }else if(next>oldValue){
        redeemChoiceFromBank(level,next-oldValue);
        return;
      }
      save();
      renderPlanInputs();
      renderTopUpBundles();
      renderAll();
    }

    function removeAllRedeemedChoice(level){
      setRedeemedChoice(level,0);
    }

    function resetTopUpsForCurrentItem(){
      const obj=currentTopUpBundleObject();
      Object.keys(topUpBundleDefinitions).forEach(key=>obj[key]=0);

      const redeemed=currentRedeemedBankObject();
      Object.keys(redeemed||{}).forEach(levelKey=>redeemed[levelKey]=0);

      syncChoiceBankFromDerived();
      save();
      renderTopUpBundles();
      renderPlanInputs();
      renderAll();
    }

    function resetTopUpsForAllItems(){
      ensureBankObjects();

      ravenItems.forEach(item=>{
        state.perItemTopUpBundles[item.name]=state.perItemTopUpBundles[item.name] || {};
        Object.keys(topUpBundleDefinitions).forEach(key=>{
          state.perItemTopUpBundles[item.name][key]=0;
        });

        state.choiceBankRedeemed[item.name]=state.choiceBankRedeemed[item.name] || {};
        Object.keys(state.choiceBankRedeemed[item.name] || {}).forEach(levelKey=>{
          state.choiceBankRedeemed[item.name][levelKey]=0;
        });
      });

      if(state.topUpBundles){
        Object.keys(topUpBundleDefinitions).forEach(key=>state.topUpBundles[key]=0);
      }

      syncChoiceBankFromDerived();
      save();
      renderTopUpBundles();
      renderPlanInputs();
      renderAll();
    }

    function saveBundleChoiceChestsToBank(){
      syncChoiceBankFromDerived();
      save();
      renderTopUpBundles();
      renderPlanInputs();
      renderAll();
    }

    function setBundleQty(key,value){
      ensureBankObjects();
      const next=Math.max(0,Math.floor(Number(value||0)));
      currentTopUpBundleObject()[key]=next;
      syncChoiceBankFromDerived();
      save();
      renderTopUpBundles();
      renderPlanInputs();
      renderAll();
    }

    function adjustBundleQty(key,delta){
      setBundleQty(key,Number(currentTopUpBundleObject()[key]||0)+delta);
    }

    function applyBundleRandomsToCurrentPlan(){
      const totals=bundleTotals();
      Object.keys(totals.random||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const amount=Math.floor(Number(totals.random[levelKey]||0));
        if(amount>0){
          const plan=currentPlanObject();
          plan[level]=(Number(plan[level]||0)+amount);
        }
      });
      save();
      renderPlanInputs();
      renderAll();
    }

    function setChestMainMode(next){
      const chestActive=next==="chests";
      const chestsBtn=document.getElementById("chestsMainTab");
      const topUpBtn=document.getElementById("topUpBundlesTab");
      const chestsPanel=document.getElementById("chestsCombinedPanel");
      const topUpPanel=document.getElementById("topUpBundlesPanel");

      if(chestsBtn) chestsBtn.classList.toggle("active",chestActive);
      if(topUpBtn) topUpBtn.classList.toggle("active",!chestActive);
      if(chestsPanel) chestsPanel.classList.toggle("hidden",!chestActive);
      if(topUpPanel) topUpPanel.classList.toggle("hidden",chestActive);
      if(!chestActive) renderTopUpBundles();
    }

    function setChestInputMode(next){
      const randomActive=next==="random";
      const randomBtn=document.getElementById("randomChestTab");
      const choiceBtn=document.getElementById("choiceChestTab");
      const randomPanel=document.getElementById("randomChestPanel");
      const choicePanel=document.getElementById("choiceChestPanel");
      if(randomBtn) randomBtn.classList.toggle("active",randomActive);
      if(choiceBtn) choiceBtn.classList.toggle("active",!randomActive);
      if(randomPanel) randomPanel.classList.toggle("hidden",!randomActive);
      if(choicePanel) choicePanel.classList.toggle("hidden",randomActive);
    }

function setQuickAdjust(group,checked){
      if(group==="plan") state.quickAdjustRandom=!!checked;
      if(group==="guaranteed") state.quickAdjustChoice=!!checked;
      save();
      calculateResults();
    }

    function jumpToTargetLevel(){
      const goal=document.getElementById("goalCard");
      const target=document.getElementById("targetLevel");
      if(goal){
        goal.scrollIntoView({behavior:"smooth",block:"start"});
      }
      if(target){
        target.classList.remove("target-flash");
        void target.offsetWidth;
        target.classList.add("target-flash");
        setTimeout(()=>target.focus({preventScroll:true}),450);
      }
    }

    function toggleChoiceBankCollapse(){
      choiceBankExpanded = !choiceBankExpanded;
      const topUpContainer=document.getElementById("topUpChoiceBankRedeem");
      const chestsContainer=document.getElementById("chestsChoiceBankRedeem");
      if(topUpContainer) renderChoiceBankRedeem("topUpChoiceBankRedeem");
      if(chestsContainer) renderChoiceBankRedeem("chestsChoiceBankRedeem");
    }


// v1.0.13 module bridge exports
Object.assign(window,{
  setQuickAdjust
});



// ===== src/events-inventory.js =====
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

    async function saveCurrentInventorySnapshot(){
      const snapshot=await showInventorySnapshotModal({
        defaultName:`Inventory ${new Date().toLocaleDateString()}`
      });
      if(!snapshot) return;
      state.inventoryArchives=Array.isArray(state.inventoryArchives) ? state.inventoryArchives : [];
      state.inventoryArchives.unshift({
        id:String(Date.now()),
        name:(snapshot.name||"Inventory Snapshot").trim()||"Inventory Snapshot",
        note:(snapshot.note||"").trim(),
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

    async function resetInventory(){
      const shouldReset=await showConfirmModal({
        title:"Reset Active Inventory?",
        message:"This clears all current Raven inventory values and cannot be undone.",
        confirmLabel:"Reset Active Inventory",
        cancelLabel:"Cancel",
        confirmClass:"danger-btn"
      });
      if(!shouldReset) return;
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



// ===== src/events-scanner.js =====
let bagScannerRunId=0;

function resetBagScannerBeforeRun(){
  if(typeof resetScannerStateInAppState==="function") resetScannerStateInAppState();
  bagScannerLastScan=null;
  const review=document.getElementById("bagScannerReview");
  if(review){
    review.classList.add("hidden");
    review.innerHTML="";
  }
}

function openBagScanner(){
  const card=document.getElementById("bagScannerCard");
  if(!card) return;
  card.classList.remove("hidden");
  card.classList.add("open");
  setBagScannerStatus("","");
  card.scrollIntoView({behavior:"smooth",block:"start"});
}

function closeBagScanner(){
  bagScannerRunId++;
  purgeBagScannerData();
  const card=document.getElementById("bagScannerCard");
  if(card) card.classList.add("hidden");
}

function toggleBagScannerCard(){
  const card=document.getElementById("bagScannerCard");
  if(card) card.classList.toggle("open");
}

function setBagScannerFiles(event){
  const input=event && event.target ? event.target : document.getElementById("bagScannerFiles");
  const count=input && input.files ? input.files.length : 0;
  clearBagScannerReview();
  if(state && state.ui){
    state.ui.bagScanner=createEmptyScannerState();
    state.ui.bagScanner.selectedFileNames=input && input.files ? Array.from(input.files).map(file=>file.name) : [];
  }
  setBagScannerStatus(count ? `${count} screenshot${count===1 ? "" : "s"} selected.` : "","");
}

async function runBagScanner(){
  const files=document.getElementById("bagScannerFiles")?.files || [];
  const runId=++bagScannerRunId;
  resetBagScannerBeforeRun();
  setBagScannerStatus("Scanning bag items...","loading");
  try{
    const json=await scanBagItemsWithWorker(files);
    if(runId!==bagScannerRunId) return;
    const scan=scannerAdaptWorkerResponse(json);
    renderBagScannerReview(scan);
    setBagScannerStatus("Scan complete. Review results below.","ok");
  }catch(error){
    if(runId!==bagScannerRunId) return;
    resetBagScannerBeforeRun();
    setBagScannerStatus(error instanceof Error ? error.message : String(error),"error");
  }
}

async function replaceActiveInventoryFromBagScan(){
  if(!bagScannerLastScan || !bagScannerLastScan.inventory) return;
  const shouldReplace=await showConfirmModal({
    title:"Replace Active Inventory?",
    message:"This will replace the current Active Inventory with the scan results.",
    confirmLabel:"Replace Active Inventory",
    cancelLabel:"Cancel",
    confirmClass:"primary-btn"
  });
  if(!shouldReplace) return;
  const replacementInventory=typeof normalizeInventory==="function" ? normalizeInventory(bagScannerLastScan.inventory) : JSON.parse(JSON.stringify(bagScannerLastScan.inventory));
  bagScannerRunId++;
  state.inventory.active=replacementInventory;
  ravenItems.forEach(item=>state.inventory.active[item.name]=state.inventory.active[item.name]||{});
  save();
  purgeBagScannerData();
  save();
  closeBagScanner();
  renderAll();
  setRavenSubPage("inventory");
}


// v1.0.13 module bridge exports
Object.assign(window,{
  bagScannerRunId,
  closeBagScanner,
  openBagScanner,
  resetBagScannerBeforeRun,
  setBagScannerFiles,
  toggleBagScannerCard
});



// ===== src/events-core.js =====
// Centralized delegated event handling for rendered UI.
// Markup declares named actions with data-action and data-* arguments.
const delegatedActionNames = [
  "showPage","closeGlobalMenu","openGlobalMenu","setHomeCategory","setRavenSubPage","setWhatIfTab",
  "setWhatIfItem","setWhatIfTargetLevel","setWhatIfShowHigh","setWhatIfChestValue","resetWhatIfScenario",
  "toggleWhatIfSetupPreview","toggleWhatIfNontargetSideBreakdown","saveWhatIfScenario","toggleSavedScenarioSnapshot",
  "loadWhatIfScenario","deleteWhatIfScenario","setMode","setManualSide","onTargetItemChange","renderAll",
  "setHighestOwned","toggleCard","setChestMainMode","renderPlanInputs","renderGuaranteedInputs",
  "resetTopUpsForCurrentItem","resetTopUpsForAllItems","resetCurrentPlan","resetAllPlans","toggleChestsUsedVisibility",
  "setQuickAdjust","jumpToTargetLevel","toggleResultsMoreInfo","toggleNontargetSideBreakdown","toggleMoreInfo",
  "exportInventory","importInventory","saveCurrentInventorySnapshot","resetInventory","setInventoryArchiveMode",
  "setInventoryAdvancedMode","setInventory","setHideUnacquiredInventory","setUpgradedOwnedViewMode",
  "setInventoryInputFilter","setUpgradedOwnedFilter","setInventoryArchiveFilter","setBreakdownInventoryFilter",
  "toggleInventoryArchiveSnapshot","loadInventorySnapshot","deleteInventorySnapshot","openBagScanner","closeBagScanner","toggleBagScannerCard","setBagScannerFiles","runBagScanner","clearBagScannerReview","purgeBagScannerData","replaceActiveInventoryFromBagScan","setGlobalSetting",
  "toggleInventoryBreakdownExplain","toggleBreakdownSource","adjustGroup","setGroupValue","adjustBundleQty",
  "setBundleQty","toggleChoiceBankCollapse","redeemChoiceFromBank","adjustRedeemedChoice","setRedeemedChoice",
  "removeAllRedeemedChoice"
];

function registerDelegatedActions(){
  if(!window.LAP_ACTIONS) return;

  window.LAP_ACTIONS.registerWindowActions(delegatedActionNames);

  window.LAP_ACTIONS.registerActions({
    openImportFile({event,element}){
      const input=document.getElementById('importFile');
      if(input) input.click();
    },
    navigateAndCloseMenu({event,element}){
      const page=element && element.dataset ? element.dataset.page : "";
      if(page && typeof showPage==="function") showPage(page);
      if(typeof closeGlobalMenu==="function") closeGlobalMenu();
    },
    refreshChestInputs(){
      if(typeof renderPlanInputs==="function") renderPlanInputs();
      if(typeof renderGuaranteedInputs==="function") renderGuaranteedInputs();
      if(typeof renderAll==="function") renderAll();
    },
    toggleAuditTotalView({event,element}){
      const line=element ? element.closest('.audit-total-line') : null;
      if(!line) return;
      const raw=line.querySelector('.audit-total-raw');
      const simplified=line.querySelector('.audit-total-simplified');
      if(raw) raw.classList.toggle('hidden',element.checked);
      if(simplified) simplified.classList.toggle('hidden',!element.checked);
    }
  });
}

function parseDelegatedDataValue(value,type){
  if(value===undefined) return undefined;
  if(type==="string") return String(value);
  if(type==="number") return Number(value);
  if(value==="true") return true;
  if(value==="false") return false;
  if(value==="null") return null;
  return value;
}

function collectDelegatedArgs(element,event){
  const args=[];
  for(let index=0; index<20; index++){
    const sourceKey=`source${index}`;
    const argKey=`arg${index}`;
    if(element.dataset[sourceKey]){
      const source=element.dataset[sourceKey];
      if(source==="value") args.push(element.value);
      else if(source==="checked") args.push(element.checked);
      else if(source==="event") args.push(event);
      else if(source==="element") args.push(element);
      else args.push(undefined);
      continue;
    }
    if(Object.prototype.hasOwnProperty.call(element.dataset,argKey)){
      const typeKey=`arg${index}Type`;
      args.push(parseDelegatedDataValue(element.dataset[argKey],element.dataset[typeKey]));
      continue;
    }
    break;
  }
  return args;
}

function runNamedDelegatedAction(element,event){
  const action=element.dataset.action;
  if(!action || !window.LAP_ACTIONS) return;

  window.LAP_ACTIONS.runAction(action,{
    action,
    args:collectDelegatedArgs(element,event),
    event,
    element
  });
}

function bindDelegatedUiEvents(){
  if(window.__lapDelegatedUiEventsBound) return;
  window.__lapDelegatedUiEventsBound=true;

  ["click","change","input"].forEach(eventName=>{
    document.addEventListener(eventName,event=>{
      const stopNode=event.target.closest('[data-stop-propagation="true"]');
      if(stopNode && eventName==="click") event.stopPropagation();
      const target=event.target.closest(`[data-action][data-action-event="${eventName}"]`);
      if(!target) return;
      if(eventName==="click") event.preventDefault();
      runNamedDelegatedAction(target,event);
    });
  });
}

registerDelegatedActions();
bindDelegatedUiEvents();


// v1.0.13 module bridge exports
Object.assign(window,{
  bindDelegatedUiEvents,
  collectDelegatedArgs,
  delegatedActionNames,
  parseDelegatedDataValue,
  registerDelegatedActions,
  runNamedDelegatedAction
});



// ===== src/events.js =====
// Events are split into feature modules. See events-navigation.js, events-whatif.js, events-calculator.js, events-inventory.js, and events-core.js.



// ===== src/app.js =====
    function init(){
      const saved=localStorage.getItem(STORAGE_KEY);
      if(saved){
        try{replaceStateWithNormalized(JSON.parse(saved));}catch(e){normalizeCurrentState();}
      }
      normalizeCurrentState();
      if(typeof resetScannerStateInAppState==="function") resetScannerStateInAppState();
      ensureBankObjects();
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      if(typeof applyGlobalDisplaySettings==="function") applyGlobalDisplaySettings();
      const scannerMount=document.getElementById("bagScannerMount");
      if(scannerMount && typeof renderBagScannerPanel==="function") scannerMount.innerHTML=renderBagScannerPanel();

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
      if(typeof bindAppRouteEvents==="function") bindAppRouteEvents();
      if(typeof applyRouteFromHash==="function") applyRouteFromHash({skipScroll:true});
    }

    function captureActiveInputState(){
      const active=document.activeElement;
      if(!active || !active.matches || !active.matches("input, textarea, select")) return null;
      return {
        key:active.getAttribute("data-input-key"),
        id:active.id || "",
        name:active.getAttribute("name") || "",
        tag:active.tagName,
        type:active.getAttribute("type") || "",
        selectionStart:active.selectionStart,
        selectionEnd:active.selectionEnd,
        scrollY:window.scrollY
      };
    }

    function restoreActiveInputState(info){
      if(!info) return;
      requestAnimationFrame(()=>{
        let el=null;
        if(info.key) el=document.querySelector(`[data-input-key="${CSS.escape(info.key)}"]`);
        if(!el && info.id) el=document.getElementById(info.id);
        if(!el && info.name) el=document.querySelector(`[name="${CSS.escape(info.name)}"]`);
        if(el && typeof el.focus==="function"){
          el.focus({preventScroll:true});
          try{
            if(info.selectionStart!==null && info.selectionStart!==undefined && typeof el.setSelectionRange==="function"){
              el.setSelectionRange(info.selectionStart,info.selectionEnd);
            }
          }catch(e){}
        }
        if(typeof info.scrollY==="number") window.scrollTo(0,info.scrollY);
      });
    }

    function renderAll(){
      const activeInfo=captureActiveInputState();
      if(typeof applyGlobalDisplaySettings==="function") applyGlobalDisplaySettings();
      renderOwnedInputs();
      renderPlanInputs();
      renderGuaranteedInputs();
      calculateResults();
      if(typeof renderWhatIf==="function") renderWhatIf();
      renderInventory();
      renderInventoryRandomTables();
      if(typeof renderItemPlanSummary==="function") renderItemPlanSummary();
      save();
      restoreActiveInputState(activeInfo);
    }








export function bootApp(){
  init();
  window.LAP_MODULE_BRIDGE_VERSION="1.0.15-bundled-split";
  exposeAppBridge({
    showPage: typeof showPage!=="undefined" ? showPage : undefined,
    closeGlobalMenu: typeof closeGlobalMenu!=="undefined" ? closeGlobalMenu : undefined,
    openGlobalMenu: typeof openGlobalMenu!=="undefined" ? openGlobalMenu : undefined,
    setHomeCategory: typeof setHomeCategory!=="undefined" ? setHomeCategory : undefined,
    setRavenSubPage: typeof setRavenSubPage!=="undefined" ? setRavenSubPage : undefined,
    setWhatIfTab: typeof setWhatIfTab!=="undefined" ? setWhatIfTab : undefined,
    setWhatIfItem: typeof setWhatIfItem!=="undefined" ? setWhatIfItem : undefined,
    setWhatIfTargetLevel: typeof setWhatIfTargetLevel!=="undefined" ? setWhatIfTargetLevel : undefined,
    setWhatIfShowHigh: typeof setWhatIfShowHigh!=="undefined" ? setWhatIfShowHigh : undefined,
    setWhatIfChestValue: typeof setWhatIfChestValue!=="undefined" ? setWhatIfChestValue : undefined,
    resetWhatIfScenario: typeof resetWhatIfScenario!=="undefined" ? resetWhatIfScenario : undefined,
    toggleWhatIfSetupPreview: typeof toggleWhatIfSetupPreview!=="undefined" ? toggleWhatIfSetupPreview : undefined,
    toggleWhatIfNontargetSideBreakdown: typeof toggleWhatIfNontargetSideBreakdown!=="undefined" ? toggleWhatIfNontargetSideBreakdown : undefined,
    saveWhatIfScenario: typeof saveWhatIfScenario!=="undefined" ? saveWhatIfScenario : undefined,
    toggleSavedScenarioSnapshot: typeof toggleSavedScenarioSnapshot!=="undefined" ? toggleSavedScenarioSnapshot : undefined,
    loadWhatIfScenario: typeof loadWhatIfScenario!=="undefined" ? loadWhatIfScenario : undefined,
    deleteWhatIfScenario: typeof deleteWhatIfScenario!=="undefined" ? deleteWhatIfScenario : undefined,
    setMode: typeof setMode!=="undefined" ? setMode : undefined,
    setManualSide: typeof setManualSide!=="undefined" ? setManualSide : undefined,
    onTargetItemChange: typeof onTargetItemChange!=="undefined" ? onTargetItemChange : undefined,
    renderAll: typeof renderAll!=="undefined" ? renderAll : undefined,
    setHighestOwned: typeof setHighestOwned!=="undefined" ? setHighestOwned : undefined,
    toggleCard: typeof toggleCard!=="undefined" ? toggleCard : undefined,
    setChestMainMode: typeof setChestMainMode!=="undefined" ? setChestMainMode : undefined,
    renderPlanInputs: typeof renderPlanInputs!=="undefined" ? renderPlanInputs : undefined,
    renderGuaranteedInputs: typeof renderGuaranteedInputs!=="undefined" ? renderGuaranteedInputs : undefined,
    resetTopUpsForCurrentItem: typeof resetTopUpsForCurrentItem!=="undefined" ? resetTopUpsForCurrentItem : undefined,
    resetTopUpsForAllItems: typeof resetTopUpsForAllItems!=="undefined" ? resetTopUpsForAllItems : undefined,
    resetCurrentPlan: typeof resetCurrentPlan!=="undefined" ? resetCurrentPlan : undefined,
    resetAllPlans: typeof resetAllPlans!=="undefined" ? resetAllPlans : undefined,
    toggleChestsUsedVisibility: typeof toggleChestsUsedVisibility!=="undefined" ? toggleChestsUsedVisibility : undefined,
    setQuickAdjust: typeof setQuickAdjust!=="undefined" ? setQuickAdjust : undefined,
    jumpToTargetLevel: typeof jumpToTargetLevel!=="undefined" ? jumpToTargetLevel : undefined,
    toggleResultsMoreInfo: typeof toggleResultsMoreInfo!=="undefined" ? toggleResultsMoreInfo : undefined,
    toggleNontargetSideBreakdown: typeof toggleNontargetSideBreakdown!=="undefined" ? toggleNontargetSideBreakdown : undefined,
    toggleMoreInfo: typeof toggleMoreInfo!=="undefined" ? toggleMoreInfo : undefined,
    exportInventory: typeof exportInventory!=="undefined" ? exportInventory : undefined,
    importInventory: typeof importInventory!=="undefined" ? importInventory : undefined,
    saveCurrentInventorySnapshot: typeof saveCurrentInventorySnapshot!=="undefined" ? saveCurrentInventorySnapshot : undefined,
    resetInventory: typeof resetInventory!=="undefined" ? resetInventory : undefined,
    setInventoryArchiveMode: typeof setInventoryArchiveMode!=="undefined" ? setInventoryArchiveMode : undefined,
    setInventoryAdvancedMode: typeof setInventoryAdvancedMode!=="undefined" ? setInventoryAdvancedMode : undefined,
    setInventory: typeof setInventory!=="undefined" ? setInventory : undefined,
    setHideUnacquiredInventory: typeof setHideUnacquiredInventory!=="undefined" ? setHideUnacquiredInventory : undefined,
    setUpgradedOwnedViewMode: typeof setUpgradedOwnedViewMode!=="undefined" ? setUpgradedOwnedViewMode : undefined,
    setInventoryInputFilter: typeof setInventoryInputFilter!=="undefined" ? setInventoryInputFilter : undefined,
    setUpgradedOwnedFilter: typeof setUpgradedOwnedFilter!=="undefined" ? setUpgradedOwnedFilter : undefined,
    setInventoryArchiveFilter: typeof setInventoryArchiveFilter!=="undefined" ? setInventoryArchiveFilter : undefined,
    setBreakdownInventoryFilter: typeof setBreakdownInventoryFilter!=="undefined" ? setBreakdownInventoryFilter : undefined,
    toggleInventoryArchiveSnapshot: typeof toggleInventoryArchiveSnapshot!=="undefined" ? toggleInventoryArchiveSnapshot : undefined,
    loadInventorySnapshot: typeof loadInventorySnapshot!=="undefined" ? loadInventorySnapshot : undefined,
    deleteInventorySnapshot: typeof deleteInventorySnapshot!=="undefined" ? deleteInventorySnapshot : undefined,
    openBagScanner: typeof openBagScanner!=="undefined" ? openBagScanner : undefined,
    closeBagScanner: typeof closeBagScanner!=="undefined" ? closeBagScanner : undefined,
    toggleBagScannerCard: typeof toggleBagScannerCard!=="undefined" ? toggleBagScannerCard : undefined,
    setBagScannerFiles: typeof setBagScannerFiles!=="undefined" ? setBagScannerFiles : undefined,
    runBagScanner: typeof runBagScanner!=="undefined" ? runBagScanner : undefined,
    clearBagScannerReview: typeof clearBagScannerReview!=="undefined" ? clearBagScannerReview : undefined,
    purgeBagScannerData: typeof purgeBagScannerData!=="undefined" ? purgeBagScannerData : undefined,
    replaceActiveInventoryFromBagScan: typeof replaceActiveInventoryFromBagScan!=="undefined" ? replaceActiveInventoryFromBagScan : undefined,
    setGlobalSetting: typeof setGlobalSetting!=="undefined" ? setGlobalSetting : undefined,
    toggleInventoryBreakdownExplain: typeof toggleInventoryBreakdownExplain!=="undefined" ? toggleInventoryBreakdownExplain : undefined,
    toggleBreakdownSource: typeof toggleBreakdownSource!=="undefined" ? toggleBreakdownSource : undefined,
    adjustGroup: typeof adjustGroup!=="undefined" ? adjustGroup : undefined,
    setGroupValue: typeof setGroupValue!=="undefined" ? setGroupValue : undefined,
    adjustBundleQty: typeof adjustBundleQty!=="undefined" ? adjustBundleQty : undefined,
    setBundleQty: typeof setBundleQty!=="undefined" ? setBundleQty : undefined,
    toggleChoiceBankCollapse: typeof toggleChoiceBankCollapse!=="undefined" ? toggleChoiceBankCollapse : undefined,
    redeemChoiceFromBank: typeof redeemChoiceFromBank!=="undefined" ? redeemChoiceFromBank : undefined,
    adjustRedeemedChoice: typeof adjustRedeemedChoice!=="undefined" ? adjustRedeemedChoice : undefined,
    setRedeemedChoice: typeof setRedeemedChoice!=="undefined" ? setRedeemedChoice : undefined,
    removeAllRedeemedChoice: typeof removeAllRedeemedChoice!=="undefined" ? removeAllRedeemedChoice : undefined,
    bindAppRouteEvents: typeof bindAppRouteEvents!=="undefined" ? bindAppRouteEvents : undefined,
    applyRouteFromHash: typeof applyRouteFromHash!=="undefined" ? applyRouteFromHash : undefined,
    renderInventory: typeof renderInventory!=="undefined" ? renderInventory : undefined,
    renderWhatIf: typeof renderWhatIf!=="undefined" ? renderWhatIf : undefined,
    renderHomePanels: typeof renderHomePanels!=="undefined" ? renderHomePanels : undefined,
    save: typeof save!=="undefined" ? save : undefined,
    load: typeof load!=="undefined" ? load : undefined,
    normalizeStateShape: typeof normalizeStateShape!=="undefined" ? normalizeStateShape : undefined,
    showConfirmModal: typeof showConfirmModal!=="undefined" ? showConfirmModal : undefined,
    showFormModal: typeof showFormModal!=="undefined" ? showFormModal : undefined,
    renderSoftChipButtons: typeof renderSoftChipButtons!=="undefined" ? renderSoftChipButtons : undefined
  });
  exposeTestExports({
    addLevelObjects: typeof addLevelObjects!=="undefined" ? addLevelObjects : undefined,
    subtractLevelObjects: typeof subtractLevelObjects!=="undefined" ? subtractLevelObjects : undefined,
    levelObjectTotalCount: typeof levelObjectTotalCount!=="undefined" ? levelObjectTotalCount : undefined,
    levelObjectEquivalentAtLevel: typeof levelObjectEquivalentAtLevel!=="undefined" ? levelObjectEquivalentAtLevel : undefined,
    simplifyUpByLevel: typeof simplifyUpByLevel!=="undefined" ? simplifyUpByLevel : undefined,
    simplifyWholeByLevel: typeof simplifyWholeByLevel!=="undefined" ? simplifyWholeByLevel : undefined,
    simplifyBucketDecimal: typeof simplifyBucketDecimal!=="undefined" ? simplifyBucketDecimal : undefined,
    targetItemsFromRandomPlan: typeof targetItemsFromRandomPlan!=="undefined" ? targetItemsFromRandomPlan : undefined,
    targetItemsFromPlanAndChoice: typeof targetItemsFromPlanAndChoice!=="undefined" ? targetItemsFromPlanAndChoice : undefined,
    calculateAdditionalOwnedFromPlan: typeof calculateAdditionalOwnedFromPlan!=="undefined" ? calculateAdditionalOwnedFromPlan : undefined,
    normalizeBackupPayload: typeof normalizeBackupPayload!=="undefined" ? normalizeBackupPayload : undefined,
    parseBackupJson: typeof parseBackupJson!=="undefined" ? parseBackupJson : undefined,
    buildFullBackupPayload: typeof buildFullBackupPayload!=="undefined" ? buildFullBackupPayload : undefined,
    scannerAdaptWorkerResponse: typeof scannerAdaptWorkerResponse!=="undefined" ? scannerAdaptWorkerResponse : undefined
  });
}
