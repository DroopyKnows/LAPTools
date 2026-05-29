// Top Up Bundle and Choice Chest Bank math helpers.

    function bundleRandomTotals(){
      if(typeof bundleTotals!=="function") return {};
      return bundleTotals().random || {};
    }

    function activeRandomPlanObject(){
      return levelObjectPlus(currentPlanObject(),bundleRandomTotals());
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
      return bundleTotalsForObject(currentTopUpBundleObject());
    }

    function manualTopUpChoiceObject(){
      return mode==="manual" ? (bundleTotals().choice || {}) : {};
    }

    function totalChoiceObject(){
      if(mode==="manual"){
        return levelObjectPlus(currentGuaranteedObject(),manualTopUpChoiceObject());
      }
      return levelObjectPlus(currentGuaranteedObject(),currentBankRedeemedAsChoiceSource());
    }

    function currentChoiceBankEarnedHere(level){
      if(mode==="manual") return 0;
      const choice=(bundleTotals().choice || {});
      return Math.max(0,Math.floor(Number(choice[level]||0)));
    }

    function topUpBundleObjectForItem(itemName){
      if(state.perItemTopUpBundles && state.perItemTopUpBundles[itemName]){
        return state.perItemTopUpBundles[itemName];
      }
      return {};
    }

    function bundleTotalsForItem(itemName){
      if(typeof bundleTotalsForObject==="function"){
        return bundleTotalsForObject(topUpBundleObjectForItem(itemName));
      }
      return {random:{},choice:{}};
    }

