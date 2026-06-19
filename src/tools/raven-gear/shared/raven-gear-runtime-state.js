// Mutable Raven Gear runtime flags that are not persisted as app state.

let mode="specific";
let manualSide="left";
let ravenSubPage="calculator";
let choiceBankExpanded=false;

export function getMode(){
  return mode;
}

export function setModeValue(value){
  mode=value==="manual" ? "manual" : "specific";
}

export function getManualSide(){
  return manualSide;
}

export function setManualSideValue(value){
  manualSide=value==="right" ? "right" : "left";
}

export function getRavenSubPage(){
  return ravenSubPage;
}

export function setRavenSubPageValue(value){
  ravenSubPage=value || "calculator";
}

export function getChoiceBankExpanded(){
  return !!choiceBankExpanded;
}

export function setChoiceBankExpandedValue(value){
  choiceBankExpanded=!!value;
}

export function exposeRavenGearRuntimeState(target){
  if(!target) return target;
  Object.defineProperties(target,{
    mode:{get:getMode,set:setModeValue,configurable:true,enumerable:true},
    manualSide:{get:getManualSide,set:setManualSideValue,configurable:true,enumerable:true},
    ravenSubPage:{get:getRavenSubPage,set:setRavenSubPageValue,configurable:true,enumerable:true},
    choiceBankExpanded:{get:getChoiceBankExpanded,set:setChoiceBankExpandedValue,configurable:true,enumerable:true}
  });
  return target;
}
