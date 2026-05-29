// Math core helpers: current selection, global state access, and common guards.

    function selectedItemName(){
      return document.getElementById("targetItem").value;
    }

    function selectedSide(){
      if(mode==="manual") return manualSide;
      const item=ravenItems.find(x=>x.name===selectedItemName());
      return item ? item.side : "left";
    }

    function probability(){
      return selectedSide()==="left" ? 2/9 : 1/9;
    }

    function visibleOwnedLevels(){
      return allItemLevels.filter(level=>level<=Number(state.highestGlobalOwned||10));
    }

    function currentOwnedObject(){
      if(mode==="specific") return state.inventory.active[selectedItemName()] || {};
      return state.manualOwned;
    }

    function currentPlanObject(){
      if(mode==="specific") return state.plans[selectedItemName()] || {};
      return state.manualPlan;
    }

    function currentGuaranteedObject(){
      if(mode==="specific") return state.guaranteed[selectedItemName()] || {};
      return state.manualGuaranteed;
    }

    function getQty(obj,level){
      return Number((obj||{})[level] || 0);
    }

    function requiredAtLevel(target,level){
      if(target<level) return 0;
      return Math.pow(3,target-level);
    }

    function roundNice(n){
      if(!isFinite(n)||n<=0) return "-";
      if(Math.abs(n-Math.round(n))<.00001) return String(Math.round(n));
      return String(Math.round(n*100)/100);
    }

    function displayWhole(value){
      const n=Math.floor(Number(value||0));
      return n>0 ? String(n) : "-";
    }

    function safeNum(value){
      const n=Number(value || 0);
      return isFinite(n) ? n : 0;
    }

    function shouldShowSide(side, filter){
      return filter==="all" || side===filter;
    }

    function levelObjectHasValues(obj){
      return Object.values(obj||{}).some(v=>Number(v||0)>0);
    }

    function levelsWithValues(obj, levels){
      return levels.filter(level=>Number((obj||{})[level]||0)>0);
    }

