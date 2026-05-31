// Converts AI Bag Scanner Worker results into the app's Active Inventory shape.

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
  return SCANNER_ITEM_ALIASES[raw.toLowerCase()] || null;
}

function scannerEmptyInventory(){
  const out={};
  ravenItems.forEach(item=>out[item.name]={});
  return out;
}

function scannerNormalizeLevelQty(levels){
  const out={};
  if(!levels || typeof levels!=="object") return out;
  Object.entries(levels).forEach(([levelKey,qtyValue])=>{
    const level=Number(levelKey);
    if(!allItemLevels.includes(level)) return;
    const qty=Math.max(0,Math.floor(Number(qtyValue||0)));
    if(qty>0) out[level]=qty;
  });
  return out;
}

function scannerInventoryFromResult(result){
  const inventory=scannerEmptyInventory();
  const items=result && result.items && typeof result.items==="object" ? result.items : {};
  Object.entries(items).forEach(([itemName,levels])=>{
    const normalizedName=scannerNormalizeItemName(itemName);
    if(!normalizedName) return;
    inventory[normalizedName]=scannerNormalizeLevelQty(levels);
  });
  return inventory;
}

function scannerDetectedCount(inventory){
  let total=0;
  ravenItems.forEach(item=>{
    Object.values((inventory||{})[item.name]||{}).forEach(qty=>total+=Math.max(0,Math.floor(Number(qty||0))));
  });
  return total;
}

function scannerHasInventoryValues(inventory){
  return scannerDetectedCount(inventory)>0;
}

function scannerAdaptWorkerResponse(json){
  if(!json || json.ok===false) throw new Error(json?.errorMessage || json?.error || "Scanner failed.");
  const result=json.result || json;
  const inventory=scannerInventoryFromResult(result);
  return {
    raw:json,
    result,
    inventory,
    detectedCount:scannerDetectedCount(inventory),
    canAutoApply:result.canAutoApply!==false,
    isConsistent:result.isConsistent!==false,
    warnings:Array.isArray(result.warnings) ? result.warnings : [],
    notes:Array.isArray(result.notes) ? result.notes : [],
    ignoredTiles:Array.isArray(result.ignoredTiles) ? result.ignoredTiles : [],
    uncertain:Array.isArray(result.uncertain) ? result.uncertain : []
  };
}
