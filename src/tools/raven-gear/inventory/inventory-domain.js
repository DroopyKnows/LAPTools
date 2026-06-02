// Pure inventory domain helpers.
// No DOM, no localStorage, no app state mutation.

const DOMAIN_RAVEN_ITEM_NAMES=[
  "Heart of Wisdom",
  "Feather of Night",
  "Sharp Beak",
  "Tail of Wind",
  "Attackers Claw",
  "Eye of Perception"
];

const DOMAIN_ITEM_LEVELS=[12,11,10,9,8,7,6,5,4,3,2,1];
const DOMAIN_MAX_ITEM_LEVEL=12;

function domainIsPlainObject(value){
  return !!value && typeof value==="object" && !Array.isArray(value);
}

function domainToSafeInteger(value, fallback=0, min=0, max=Number.MAX_SAFE_INTEGER){
  const number=Number(value);
  if(!Number.isFinite(number)) return fallback;
  return Math.max(min,Math.min(max,Math.floor(number)));
}

function domainRound(value, digits=6){
  const factor=Math.pow(10,digits);
  return Math.round(Number(value||0)*factor)/factor;
}

function domainLevelKey(level){
  return String(Number(level));
}

function createEmptyInventoryDomain(itemNames=DOMAIN_RAVEN_ITEM_NAMES){
  const inventory={};
  itemNames.forEach(name=>inventory[name]={});
  return inventory;
}

function normalizeLevelObjectDomain(source, levels=DOMAIN_ITEM_LEVELS){
  const out={};
  if(!domainIsPlainObject(source)) return out;
  const allowed=new Set(levels.map(Number));
  Object.keys(source).forEach(key=>{
    const level=Number(key);
    if(!allowed.has(level)) return;
    const qty=domainToSafeInteger(source[key],0,0);
    if(qty>0) out[level]=qty;
  });
  return out;
}

function normalizeInventoryDomain(source, itemNames=DOMAIN_RAVEN_ITEM_NAMES, levels=DOMAIN_ITEM_LEVELS){
  const out={};
  itemNames.forEach(name=>{
    out[name]=normalizeLevelObjectDomain(domainIsPlainObject(source) ? source[name] : {}, levels);
  });
  return out;
}

function isValidInventoryDomain(source, itemNames=DOMAIN_RAVEN_ITEM_NAMES, levels=DOMAIN_ITEM_LEVELS){
  if(!domainIsPlainObject(source)) return false;
  const allowed=new Set(levels.map(Number));
  return itemNames.every(name=>{
    if(!domainIsPlainObject(source[name])) return false;
    return Object.keys(source[name]).every(key=>{
      const level=Number(key);
      const qty=source[name][key];
      return allowed.has(level) && Number.isInteger(qty) && qty>=0;
    });
  });
}

function compactLevelObjectDomain(source){
  const out={};
  Object.keys(source||{}).forEach(key=>{
    const qty=Number(source[key]||0);
    if(qty>0) out[Number(key)]=qty;
  });
  return out;
}

function addLevelObjectsDomain(...objects){
  const out={};
  objects.forEach(obj=>{
    Object.keys(obj||{}).forEach(key=>{
      const level=Number(key);
      const value=Number(obj[key]||0);
      if(!Number.isFinite(value) || value===0) return;
      out[level]=domainRound((out[level]||0)+value,6);
      if(out[level]===0) delete out[level];
    });
  });
  return out;
}

function subtractLevelObjectsDomain(a,b){
  const out={};
  const keys=new Set([...Object.keys(a||{}),...Object.keys(b||{})]);
  keys.forEach(key=>{
    const level=Number(key);
    const value=domainRound(Number((a||{})[key]||0)-Number((b||{})[key]||0),6);
    if(value>0) out[level]=value;
  });
  return out;
}

function levelObjectTotalCountDomain(source){
  return Object.values(source||{}).reduce((sum,value)=>sum+Number(value||0),0);
}

function levelObjectEquivalentAtLevelDomain(source,level){
  let total=0;
  Object.keys(source||{}).forEach(key=>{
    const sourceLevel=Number(key);
    const qty=Number(source[key]||0);
    if(sourceLevel>=level) total += qty*Math.pow(3,sourceLevel-level);
  });
  return total;
}

function simplifyUpByLevelDomain(source,maxLevel=DOMAIN_MAX_ITEM_LEVEL){
  const result={};
  let carry=0;

  for(let level=1;level<=maxLevel;level++){
    const total=Number(source && source[level] || 0)+carry;

    if(level===maxLevel){
      if(total>0) result[level]=domainRound(total,6);
      carry=0;
    }else{
      const upgrades=Math.floor(total/3);
      const remainder=total-upgrades*3;
      if(remainder>0) result[level]=domainRound(remainder,6);
      carry=upgrades;
    }
  }

  return result;
}

export {
  DOMAIN_RAVEN_ITEM_NAMES,
  DOMAIN_ITEM_LEVELS,
  DOMAIN_MAX_ITEM_LEVEL,
  domainIsPlainObject,
  domainToSafeInteger,
  createEmptyInventoryDomain,
  normalizeLevelObjectDomain,
  normalizeInventoryDomain,
  isValidInventoryDomain,
  compactLevelObjectDomain,
  addLevelObjectsDomain,
  subtractLevelObjectsDomain,
  levelObjectTotalCountDomain,
  levelObjectEquivalentAtLevelDomain,
  simplifyUpByLevelDomain
};
