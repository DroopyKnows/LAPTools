// Top Up Bundle and Choice Chest Bank math helpers.
// External values (mode, state, bundle definitions, choice/plan helpers) are read from runtime at call time.

import { topUpBundleDefinitions } from "../metadata/item-metadata.js";

export function createRavenGearBundlesModule(runtime){
    function bundleRandomTotals(){
      if(typeof bundleTotals!=="function") return {};
      return bundleTotals().random || {};
    }

    function activeRandomPlanObject(){
      return runtime.levelObjectPlus(runtime.currentRandomObject(),bundleRandomTotals());
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
      return bundleTotalsForObject(runtime.currentTopUpBundleObject());
    }

    function manualTopUpChoiceObject(){
      return runtime.mode==="manual" ? (bundleTotals().choice || {}) : {};
    }

    function totalChoiceObject(){
      if(runtime.mode==="manual"){
        return runtime.levelObjectPlus(runtime.currentGuaranteedObject(),manualTopUpChoiceObject());
      }
      return runtime.levelObjectPlus(runtime.currentGuaranteedObject(),runtime.currentBankRedeemedAsChoiceSource());
    }

    function currentChoiceBankEarnedHere(level){
      if(runtime.mode==="manual") return 0;
      const choice=(bundleTotals().choice || {});
      return Math.max(0,Math.floor(Number(choice[level]||0)));
    }

    function topUpBundleObjectForItem(itemName){
      if(runtime.state.perItemTopUpBundles && runtime.state.perItemTopUpBundles[itemName]){
        return runtime.state.perItemTopUpBundles[itemName];
      }
      return {};
    }

    function bundleTotalsForItem(itemName){
      if(typeof bundleTotalsForObject==="function"){
        return bundleTotalsForObject(topUpBundleObjectForItem(itemName));
      }
      return {random:{},choice:{}};
    }





  return {
    bundleRandomTotals,
    activeRandomPlanObject,
    bundleTotalsForObject,
    bundleTotals,
    manualTopUpChoiceObject,
    totalChoiceObject,
    currentChoiceBankEarnedHere,
    topUpBundleObjectForItem,
    bundleTotalsForItem
  };
}
