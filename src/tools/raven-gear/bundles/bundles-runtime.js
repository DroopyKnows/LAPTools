// Raven Gear Top Up Bundle and Choice Chest Bank runtime helpers.
// Split out of raven-gear-runtime.js while preserving the original runtime-bound behavior.

export function createRavenGearBundlesModule(runtimeContext){
  const source = '// ===== src/math-bundles.js =====\n// Top Up Bundle and Choice Chest Bank math helpers.\n\n    function bundleRandomTotals(){\n      if(typeof bundleTotals!=="function") return {};\n      return bundleTotals().random || {};\n    }\n\n    function activeRandomPlanObject(){\n      return levelObjectPlus(currentPlanObject(),bundleRandomTotals());\n    }\n\n    function bundleTotalsForObject(bundleObj){\n      const random={};\n      const choice={};\n      Object.keys(topUpBundleDefinitions).forEach(key=>{\n        const qty=Math.floor(Number((bundleObj||{})[key]||0));\n        if(qty<=0) return;\n        const def=topUpBundleDefinitions[key];\n        Object.keys(def.random||{}).forEach(levelKey=>{\n          const level=Number(levelKey);\n          const amount=Math.floor(Number(def.random[levelKey]||0)*qty);\n          if(amount>0) random[level]=(random[level]||0)+amount;\n        });\n        Object.keys(def.choice||{}).forEach(levelKey=>{\n          const level=Number(levelKey);\n          const amount=Math.floor(Number(def.choice[levelKey]||0)*qty);\n          if(amount>0) choice[level]=(choice[level]||0)+amount;\n        });\n      });\n      return {random,choice};\n    }\n\n    function bundleTotals(){\n      return bundleTotalsForObject(currentTopUpBundleObject());\n    }\n\n    function manualTopUpChoiceObject(){\n      return mode==="manual" ? (bundleTotals().choice || {}) : {};\n    }\n\n    function totalChoiceObject(){\n      if(mode==="manual"){\n        return levelObjectPlus(currentGuaranteedObject(),manualTopUpChoiceObject());\n      }\n      return levelObjectPlus(currentGuaranteedObject(),currentBankRedeemedAsChoiceSource());\n    }\n\n    function currentChoiceBankEarnedHere(level){\n      if(mode==="manual") return 0;\n      const choice=(bundleTotals().choice || {});\n      return Math.max(0,Math.floor(Number(choice[level]||0)));\n    }\n\n    function topUpBundleObjectForItem(itemName){\n      if(state.perItemTopUpBundles && state.perItemTopUpBundles[itemName]){\n        return state.perItemTopUpBundles[itemName];\n      }\n      return {};\n    }\n\n    function bundleTotalsForItem(itemName){\n      if(typeof bundleTotalsForObject==="function"){\n        return bundleTotalsForObject(topUpBundleObjectForItem(itemName));\n      }\n      return {random:{},choice:{}};\n    }\n\n\n\n\n';
  const build = new Function("ctx", `
    with (ctx) {
      ${source}
      return {
        bundleRandomTotals: typeof bundleRandomTotals!=="undefined" ? bundleRandomTotals : undefined,
        activeRandomPlanObject: typeof activeRandomPlanObject!=="undefined" ? activeRandomPlanObject : undefined,
        bundleTotalsForObject: typeof bundleTotalsForObject!=="undefined" ? bundleTotalsForObject : undefined,
        bundleTotals: typeof bundleTotals!=="undefined" ? bundleTotals : undefined,
        manualTopUpChoiceObject: typeof manualTopUpChoiceObject!=="undefined" ? manualTopUpChoiceObject : undefined,
        totalChoiceObject: typeof totalChoiceObject!=="undefined" ? totalChoiceObject : undefined,
        currentChoiceBankEarnedHere: typeof currentChoiceBankEarnedHere!=="undefined" ? currentChoiceBankEarnedHere : undefined,
        topUpBundleObjectForItem: typeof topUpBundleObjectForItem!=="undefined" ? topUpBundleObjectForItem : undefined,
        bundleTotalsForItem: typeof bundleTotalsForItem!=="undefined" ? bundleTotalsForItem : undefined
      };
    }
  `);
  return build(runtimeContext);
}
