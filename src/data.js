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
