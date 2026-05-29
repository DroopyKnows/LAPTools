    function init(){
      const saved=localStorage.getItem(STORAGE_KEY);
      if(saved){
        try{replaceStateWithNormalized(JSON.parse(saved));}catch(e){normalizeCurrentState();}
      }
      normalizeCurrentState();
      ensureBankObjects();
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      if(typeof applyGlobalDisplaySettings==="function") applyGlobalDisplaySettings();
      const scannerMount=document.getElementById("bagScannerMount");
      if(scannerMount && typeof renderBagScannerPanel==="function") scannerMount.innerHTML=renderBagScannerPanel();

      const target=document.getElementById("targetLevel");
      allItemLevels.forEach(level=>{
        const opt=document.createElement("option");
        opt.value=level;
        opt.textContent="Level "+level;
        if(level===7) opt.selected=true;
        target.appendChild(opt);
      });

      const highest=document.getElementById("highestOwned");
      allItemLevels.forEach(level=>{
        const opt=document.createElement("option");
        opt.value=level;
        opt.textContent="Level "+level;
        highest.appendChild(opt);
      });
      highest.value=state.highestGlobalOwned || 5;

      renderAll();
      if(typeof bindAppRouteEvents==="function") bindAppRouteEvents();
      if(typeof applyRouteFromHash==="function") applyRouteFromHash({skipScroll:true});
    }

    function captureActiveInputState(){
      const active=document.activeElement;
      if(!active || !active.matches || !active.matches("input, textarea, select")) return null;
      return {
        key:active.getAttribute("data-input-key"),
        id:active.id || "",
        name:active.getAttribute("name") || "",
        tag:active.tagName,
        type:active.getAttribute("type") || "",
        selectionStart:active.selectionStart,
        selectionEnd:active.selectionEnd,
        scrollY:window.scrollY
      };
    }

    function restoreActiveInputState(info){
      if(!info) return;
      requestAnimationFrame(()=>{
        let el=null;
        if(info.key) el=document.querySelector(`[data-input-key="${CSS.escape(info.key)}"]`);
        if(!el && info.id) el=document.getElementById(info.id);
        if(!el && info.name) el=document.querySelector(`[name="${CSS.escape(info.name)}"]`);
        if(el && typeof el.focus==="function"){
          el.focus({preventScroll:true});
          try{
            if(info.selectionStart!==null && info.selectionStart!==undefined && typeof el.setSelectionRange==="function"){
              el.setSelectionRange(info.selectionStart,info.selectionEnd);
            }
          }catch(e){}
        }
        if(typeof info.scrollY==="number") window.scrollTo(0,info.scrollY);
      });
    }

    function renderAll(){
      const activeInfo=captureActiveInputState();
      if(typeof applyGlobalDisplaySettings==="function") applyGlobalDisplaySettings();
      renderOwnedInputs();
      renderPlanInputs();
      renderGuaranteedInputs();
      calculateResults();
      if(typeof renderWhatIf==="function") renderWhatIf();
      renderInventory();
      renderInventoryRandomTables();
      if(typeof renderItemPlanSummary==="function") renderItemPlanSummary();
      save();
      restoreActiveInputState(activeInfo);
    }

init();

