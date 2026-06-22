// @ts-check
// Pure inventory domain helpers.
// No DOM, no localStorage, no app state mutation.

import {
  ITEM_LEVELS,
  MAX_ITEM_LEVEL,
  getRavenItems
} from "../metadata/item-metadata.js";

const DOMAIN_RAVEN_ITEM_NAMES=getRavenItems().map(item=>item.name);
const DOMAIN_ITEM_LEVELS=ITEM_LEVELS;
const DOMAIN_MAX_ITEM_LEVEL=MAX_ITEM_LEVEL;

/**
 * @param {unknown} value
 * @returns {boolean} true when value is a non-null, non-array object.
 */
function domainIsPlainObject(value){
  return !!value && typeof value==="object" && !Array.isArray(value);
}

/**
 * Coerce to a clamped, floored integer, falling back when not finite.
 * @param {unknown} value
 * @param {number} [fallback]
 * @param {number} [min]
 * @param {number} [max]
 * @returns {number}
 */
function domainToSafeInteger(value, fallback=0, min=0, max=Number.MAX_SAFE_INTEGER){
  const number=Number(value);
  if(!Number.isFinite(number)) return fallback;
  return Math.max(min,Math.min(max,Math.floor(number)));
}

/**
 * @param {number} value
 * @param {number} [digits]
 * @returns {number} value rounded to `digits` decimal places.
 */
function domainRound(value, digits=6){
  const factor=Math.pow(10,digits);
  return Math.round(Number(value||0)*factor)/factor;
}

/**
 * @param {number|string} level
 * @returns {string}
 */
function domainLevelKey(level){
  return String(Number(level));
}

/**
 * An inventory with an empty {@link LevelObject} for every item.
 * @param {string[]} [itemNames]
 * @returns {ItemLevelMap}
 */
function createEmptyInventoryDomain(itemNames=DOMAIN_RAVEN_ITEM_NAMES){
  /** @type {ItemLevelMap} */
  const inventory={};
  itemNames.forEach(name=>inventory[name]={});
  return inventory;
}

/**
 * Drop unknown levels and non-positive quantities; floor the rest.
 * @param {unknown} source
 * @param {number[]} [levels] allowed levels (defaults to all item levels).
 * @returns {LevelObject}
 */
function normalizeLevelObjectDomain(source, levels=DOMAIN_ITEM_LEVELS){
  /** @type {LevelObject} */
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

/**
 * Normalize a whole inventory: one cleaned {@link LevelObject} per known item.
 * @param {unknown} source
 * @param {string[]} [itemNames]
 * @param {number[]} [levels]
 * @returns {ItemLevelMap}
 */
function normalizeInventoryDomain(source, itemNames=DOMAIN_RAVEN_ITEM_NAMES, levels=DOMAIN_ITEM_LEVELS){
  /** @type {ItemLevelMap} */
  const out={};
  itemNames.forEach(name=>{
    out[name]=normalizeLevelObjectDomain(domainIsPlainObject(source) ? source[name] : {}, levels);
  });
  return out;
}

/**
 * @param {unknown} source
 * @param {string[]} [itemNames]
 * @param {number[]} [levels]
 * @returns {boolean} true when every item maps allowed levels to non-negative integers.
 */
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

/**
 * Drop non-positive entries and renumber keys.
 * @param {Record<string, unknown>} source
 * @returns {LevelObject}
 */
function compactLevelObjectDomain(source){
  /** @type {LevelObject} */
  const out={};
  Object.keys(source||{}).forEach(key=>{
    const qty=Number(source[key]||0);
    if(qty>0) out[Number(key)]=qty;
  });
  return out;
}

/**
 * Sum any number of level objects per level (contributions may be signed; a level
 * that nets to zero is dropped).
 * @param {...LevelObject} objects
 * @returns {LevelObject}
 */
function addLevelObjectsDomain(...objects){
  /** @type {LevelObject} */
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

/**
 * a - b per level, keeping only positive results.
 * @param {LevelObject} a
 * @param {LevelObject} b
 * @returns {LevelObject}
 */
function subtractLevelObjectsDomain(a,b){
  /** @type {LevelObject} */
  const out={};
  const keys=new Set([...Object.keys(a||{}),...Object.keys(b||{})]);
  keys.forEach(key=>{
    const level=Number(key);
    const value=domainRound(Number((a||{})[key]||0)-Number((b||{})[key]||0),6);
    if(value>0) out[level]=value;
  });
  return out;
}

/**
 * @param {LevelObject} source
 * @returns {number} total quantity across all levels.
 */
function levelObjectTotalCountDomain(source){
  return Object.values(source||{}).reduce((sum,value)=>sum+Number(value||0),0);
}

/**
 * Value of an inventory expressed in units of `level`, rolling higher levels down
 * at 3x per level (a level-(n+1) item is worth 3 level-n items).
 * @param {LevelObject} source
 * @param {number} level
 * @returns {number}
 */
function levelObjectEquivalentAtLevelDomain(source,level){
  let total=0;
  Object.keys(source||{}).forEach(key=>{
    const sourceLevel=Number(key);
    const qty=Number(source[key]||0);
    if(sourceLevel>=level) total += qty*Math.pow(3,sourceLevel-level);
  });
  return total;
}

/**
 * Roll 3-of-a-level up into one of the next level, carrying upward.
 * @param {LevelObject} source
 * @param {number} [maxLevel]
 * @returns {LevelObject}
 */
function simplifyUpByLevelDomain(source,maxLevel=DOMAIN_MAX_ITEM_LEVEL){
  /** @type {LevelObject} */
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
