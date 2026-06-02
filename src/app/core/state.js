// Central app state. Schema v2 groups related data by feature while preserving
// non-enumerable flat aliases for the existing no-framework render/event code.

const CURRENT_STATE_SCHEMA_VERSION=3;

var mode="specific";
var manualSide="left";
var ravenSubPage="calculator";

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
  const ui=isPlainObject(source) ? JSON.parse(JSON.stringify(source)) : {};
  ui.bagScanner=createEmptyScannerState();
  return ui;
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

var state=normalizeStateShape(DEFAULT_STATE);

var choiceBankExpanded=false;


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
