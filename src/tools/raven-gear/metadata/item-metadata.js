// Raven Gear item metadata: items, levels, chests, bundles, and the storage key.

const STORAGE_KEY="siroxHub.ravenGear.1";

const RAVEN_ITEM_METADATA=[
  {
    id:"heartOfWisdom",
    name:"Heart of Wisdom",
    side:"left",
    order:1,
    shortName:"Heart",
    supportsHighLevels:true,
    minLevel:1,
    maxLevel:12,
    fusionMaxLevel:8,
    researchMinLevel:8,
    researchMaxLevel:12,
    scanAliases:["heart of wisdom"]
  },
  {
    id:"featherOfNight",
    name:"Feather of Night",
    side:"left",
    order:2,
    shortName:"Feather",
    supportsHighLevels:true,
    minLevel:1,
    maxLevel:12,
    fusionMaxLevel:8,
    researchMinLevel:8,
    researchMaxLevel:12,
    scanAliases:["feather of night"]
  },
  {
    id:"sharpBeak",
    name:"Sharp Beak",
    side:"left",
    order:3,
    shortName:"Beak",
    supportsHighLevels:true,
    minLevel:1,
    maxLevel:12,
    fusionMaxLevel:8,
    researchMinLevel:8,
    researchMaxLevel:12,
    scanAliases:["sharp beak"]
  },
  {
    id:"tailOfWind",
    name:"Tail of Wind",
    side:"right",
    order:4,
    shortName:"Tail",
    supportsHighLevels:true,
    minLevel:1,
    maxLevel:12,
    fusionMaxLevel:8,
    researchMinLevel:8,
    researchMaxLevel:12,
    scanAliases:["tail of wind"]
  },
  {
    id:"attackersClaw",
    name:"Attackers Claw",
    side:"right",
    order:5,
    shortName:"Claw",
    supportsHighLevels:true,
    minLevel:1,
    maxLevel:12,
    fusionMaxLevel:8,
    researchMinLevel:8,
    researchMaxLevel:12,
    scanAliases:["attacker's claw","attackers claw","attacker claw"]
  },
  {
    id:"eyeOfPerception",
    name:"Eye of Perception",
    side:"right",
    order:6,
    shortName:"Eye",
    supportsHighLevels:true,
    minLevel:1,
    maxLevel:12,
    fusionMaxLevel:8,
    researchMinLevel:8,
    researchMaxLevel:12,
    scanAliases:["eye of perception"]
  }
];

const RAVEN_ITEMS=RAVEN_ITEM_METADATA
  .slice()
  .sort((a,b)=>a.order-b.order)
  .map(({name,side})=>({name,side}));

const RAVEN_ITEM_IDS=RAVEN_ITEM_METADATA.map(item=>item.id);
const RAVEN_ITEM_NAME_BY_ID=Object.fromEntries(RAVEN_ITEM_METADATA.map(item=>[item.id,item.name]));
const RAVEN_ITEM_ID_BY_NAME=Object.fromEntries(RAVEN_ITEM_METADATA.map(item=>[item.name,item.id]));

const RAVEN_ITEM_SIDES={
  left:{id:"left",label:"Left",order:1},
  right:{id:"right",label:"Right",order:2}
};

const RAVEN_ITEM_SOURCES={
  scan:{
    id:"scan",
    label:"Scan",
    category:"inventory",
    origin:"scanner"
  },
  manual:{
    id:"manual",
    label:"Manual",
    category:"inventory",
    origin:"user"
  },
  randomChest:{
    id:"randomChest",
    label:"Random Chest",
    auditLabel:"Random Manual",
    className:"random-manual",
    category:"chest",
    origin:"manual"
  },
  choiceChest:{
    id:"choiceChest",
    label:"Choice Chest",
    auditLabel:"Choice Manual",
    className:"choice-manual",
    category:"chest",
    origin:"manual"
  },
  topUpRandomChest:{
    id:"topUpRandomChest",
    label:"Top Up Random Chest",
    auditLabel:"Random",
    className:"random-topup",
    category:"topUp",
    origin:"topUp"
  },
  topUpChoiceChest:{
    id:"topUpChoiceChest",
    label:"Top Up Choice Chest",
    auditLabel:"Choice",
    className:"manual-topup-choice",
    category:"topUp",
    origin:"topUp"
  },
  bankedChoiceChest:{
    id:"bankedChoiceChest",
    label:"Banked Choice Chest",
    auditLabel:"Choice Bank",
    className:"choice-bank",
    category:"banked",
    origin:"choiceBank"
  },
  calculated:{
    id:"calculated",
    label:"Calculated",
    category:"derived",
    origin:"calculated"
  },
  whatIf:{
    id:"whatIf",
    label:"What If",
    category:"scenario",
    origin:"whatIf"
  }
};

const MAX_ITEM_LEVEL=12;
const MAX_CHEST_LEVEL=7;
// Sentinel "item name" for manual mode's high-level/tech state. Manual mode has no real item,
// so the shared high-level UI/handlers are wired with this key, which the high-level readers
// and setters route to the manual state slices (manualOwned + manualTechPoints) instead of the
// per-item maps. It is intentionally NOT a member of RAVEN_ITEMS, so item enumerations never see it.
const MANUAL_HIGH_LEVEL_KEY="__manual__";
const ITEM_LEVELS=[12,11,10,9,8,7,6,5,4,3,2,1];
const CHEST_LEVELS=[7,6,5,4,3,2,1];
const DEFAULT_CHEST_LEVELS=[5,4,3,2,1];

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

function normalizeRavenItemId(itemId){
  const raw=String(itemId||"").trim();
  if(RAVEN_ITEM_NAME_BY_ID[raw]) return raw;
  return RAVEN_ITEM_ID_BY_NAME[raw] || null;
}

function getRavenItemMeta(itemId){
  const normalizedId=normalizeRavenItemId(itemId);
  return RAVEN_ITEM_METADATA.find(item=>item.id===normalizedId) || null;
}

function getRavenItemByName(name){
  return getRavenItemMeta(name);
}

function getRavenItems(){
  return RAVEN_ITEM_METADATA.slice().sort((a,b)=>a.order-b.order);
}

function getRavenItemsBySide(side){
  return getRavenItems().filter(item=>item.side===side);
}

function getRavenItemNamesBySide(side){
  return getRavenItemsBySide(side).map(item=>item.name);
}

function isLeftSideItem(itemId){
  const item=getRavenItemMeta(itemId);
  return !!item && item.side==="left";
}

function isRightSideItem(itemId){
  const item=getRavenItemMeta(itemId);
  return !!item && item.side==="right";
}

function getRavenItemSourceMeta(sourceId){
  return RAVEN_ITEM_SOURCES[sourceId] || null;
}

function getRavenItemSourceLabel(sourceId,labelKey="label"){
  const meta=getRavenItemSourceMeta(sourceId);
  return meta ? (meta[labelKey] || meta.label || meta.id) : String(sourceId||"");
}

function getRavenItemSourceClassName(sourceId){
  const meta=getRavenItemSourceMeta(sourceId);
  return meta ? (meta.className || meta.id) : String(sourceId||"");
}

function getRavenScannerItemAliases(){
  const aliases={};
  getRavenItems().forEach(item=>{
    (item.scanAliases || []).forEach(alias=>{ aliases[alias]=item.name; });
  });
  return aliases;
}

export {
  CHEST_LEVELS,
  DEFAULT_CHEST_LEVELS,
  ITEM_LEVELS,
  MANUAL_HIGH_LEVEL_KEY,
  MAX_CHEST_LEVEL,
  MAX_ITEM_LEVEL,
  RAVEN_ITEM_ID_BY_NAME,
  RAVEN_ITEM_IDS,
  RAVEN_ITEM_METADATA,
  RAVEN_ITEM_NAME_BY_ID,
  RAVEN_ITEM_SIDES,
  RAVEN_ITEM_SOURCES,
  RAVEN_ITEMS,
  STORAGE_KEY,
  allItemLevels,
  chestDefaultLevels,
  chestLevels,
  getRavenItemByName,
  getRavenItemMeta,
  getRavenItemNamesBySide,
  getRavenItemSourceClassName,
  getRavenItemSourceLabel,
  getRavenItemSourceMeta,
  getRavenItems,
  getRavenItemsBySide,
  getRavenScannerItemAliases,
  guaranteedDefaultLevels,
  isLeftSideItem,
  isRightSideItem,
  normalizeRavenItemId,
  ravenItems,
  topUpBundleDefinitions
};
