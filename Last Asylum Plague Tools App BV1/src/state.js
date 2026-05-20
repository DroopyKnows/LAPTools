// Central app state. Keep this shape backward-compatible with saved localStorage data.

let mode="specific";
let manualSide="left";
let ravenSubPage="calculator";

const DEFAULT_STATE={
  highestGlobalOwned:5,
  plans:{},
  guaranteed:{},
  inventory:{},
  manualOwned:{},
  manualPlan:{},
  manualGuaranteed:{},
  randomLeftovers:{},
  topUpBundles:{},
  perItemTopUpBundles:{},
  manualTopUpBundles:{},
  choiceBank:{},
  choiceBankRedeemed:{},
  manualChoiceBankRedeemed:{},
  inventoryInputFilter:"all",
  upgradedOwnedFilter:"all",
  upgradedOwnedViewMode:"combined",
  hideUnacquiredInventory:false,
  quickAdjustRandom:false,
  quickAdjustChoice:false,
  inventoryAdvancedMode:"breakdown",
  breakdownInventoryFilter:"all"
};

const state=JSON.parse(JSON.stringify(DEFAULT_STATE));

let choiceBankExpanded=false;
