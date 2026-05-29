    function renderWhatIfPreserve(){
      const activeInfo=(typeof captureActiveInputState==="function") ? captureActiveInputState() : null;
      if(typeof renderWhatIf==="function") renderWhatIf();
      if(typeof restoreActiveInputState==="function") restoreActiveInputState(activeInfo);
    }

    function toggleWhatIfSetupPreview(){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      state.whatIf.current.previewOpen=!state.whatIf.current.previewOpen;
      save();
      renderWhatIfPreserve();
    }

    function toggleSavedScenarioSnapshot(id){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      state.whatIf.expandedSnapshots=state.whatIf.expandedSnapshots || {};
      state.whatIf.expandedSnapshots[id]=!state.whatIf.expandedSnapshots[id];
      save();
      renderWhatIfPreserve();
    }

    function toggleWhatIfNontargetSideBreakdown(){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      state.whatIf.current.nontargetBreakdownOpen=!state.whatIf.current.nontargetBreakdownOpen;
      save();
      renderWhatIfPreserve();
    }

    function inventorySnapshotForItem(itemName,source){
      return JSON.parse(JSON.stringify((source && source[itemName]) || {}));
    }

    function buildWhatIfBaselineSnapshot(itemName){
      const starting=inventorySnapshotForItem(itemName,state.inventory.active);
      const combined=typeof combinedInventoryForItem==="function" ? combinedInventoryForItem(itemName) : starting;
      return {
        item:itemName,
        starting:JSON.parse(JSON.stringify(starting||{})),
        combined:JSON.parse(JSON.stringify(combined||{})),
        fingerprint:JSON.stringify({startingRaw:starting||{},combinedRaw:combined||{},starting:simplifyUpByLevel(starting||{}),combined:simplifyUpByLevel(combined||{})})
      };
    }

    function currentWhatIfBaselineFingerprint(itemName){
      return buildWhatIfBaselineSnapshot(itemName).fingerprint;
    }

    function setWhatIfScenarioText(field,value){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      if(field==="name") state.whatIf.current.name=value;
      if(field==="note") state.whatIf.current.note=value;
      save();
    }

    function setWhatIfTab(tab){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      state.whatIf.activeTab=tab==="saved" ? "saved" : "scenarios";
      save();
      renderWhatIfPreserve();
    }

    function setWhatIfItem(value){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      state.whatIf.current.item=value;
      save();
      renderWhatIfPreserve();
    }

    function setWhatIfTargetLevel(value){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      state.whatIf.current.targetLevel=Math.max(1,Math.min(MAX_ITEM_LEVEL,Math.floor(Number(value||7))));
      save();
      renderWhatIfPreserve();
    }

    function setWhatIfShowHigh(checked){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      state.whatIf.current.showHigh=!!checked;
      save();
      renderWhatIfPreserve();
    }

    function setWhatIfChestValue(kind,level,value){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      const bucket=kind==="choice" ? state.whatIf.current.choice : state.whatIf.current.random;
      bucket[level]=Math.max(0,Math.floor(Number(value||0)));
      save();
      renderWhatIfPreserve();
    }

    function adjustWhatIfChestValue(kind,level,amount){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      const bucket=kind==="choice" ? state.whatIf.current.choice : state.whatIf.current.random;
      const next=Math.max(0,Math.floor(Number(bucket[level]||0))+Math.floor(Number(amount||0)));
      bucket[level]=next;
      save();
      renderWhatIfPreserve();
    }

    function resetWhatIfScenario(){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      const item=state.whatIf.current.item || "Heart of Wisdom";
      const targetLevel=state.whatIf.current.targetLevel || 7;
      state.whatIf.current={item,targetLevel,random:{},choice:{},showHigh:!!state.whatIf.current.showHigh,baselineMode:"current",savedBaseline:null,previewOpen:!!state.whatIf.current.previewOpen,nontargetBreakdownOpen:false};
      save();
      renderWhatIfPreserve();
    }

    function saveWhatIfScenario(){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      const current=JSON.parse(JSON.stringify(state.whatIf.current));
      const stamp=new Date();
      const baseline=buildWhatIfBaselineSnapshot(current.item || "Heart of Wisdom");
      current.baselineMode="current";
      current.savedBaseline=baseline;
      const nameInput=document.getElementById("whatIfSaveName");
      const noteInput=document.getElementById("whatIfSaveNote");
      const name=(nameInput?.value||"").trim() || `${current.item} → Level ${current.targetLevel}`;
      const note=(noteInput?.value||"").trim();
      state.whatIf.saved.unshift({
        id:String(Date.now()),
        name,
        note,
        savedAt:stamp.toISOString(),
        updatedAt:stamp.toISOString(),
        baseline,
        scenario:current
      });
      if(nameInput) nameInput.value="";
      if(noteInput) noteInput.value="";
      save();
      state.whatIf.activeTab="saved";
      renderWhatIfPreserve();
    }

    async function loadWhatIfScenario(id){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      const found=(state.whatIf.saved||[]).find(x=>x.id===id);
      if(!found) return;
      const loaded=JSON.parse(JSON.stringify(found.scenario || {}));
      const itemName=loaded.item || found.baseline?.item || "Heart of Wisdom";
      const savedBaseline=found.baseline || loaded.savedBaseline || buildWhatIfBaselineSnapshot(itemName);
      const changed=savedBaseline.fingerprint && savedBaseline.fingerprint!==currentWhatIfBaselineFingerprint(itemName);
      if(changed){
        const inventoryChoice=await showChoiceModal({
          title:"Inventory Has Changed",
          message:"The inventory baseline changed since this scenario was saved.",
          choices:[
            {value:"current",label:"Use Current Inventory",className:"primary-btn"},
            {value:"saved",label:"Keep Saved Inventory",className:"ghost-btn"}
          ],
          cancelLabel:"Cancel"
        });
        if(!inventoryChoice) return;
        if(inventoryChoice==="current"){
          const fresh=buildWhatIfBaselineSnapshot(itemName);
          loaded.baselineMode="current";
          loaded.savedBaseline=fresh;
          found.baseline=fresh;
          found.scenario=JSON.parse(JSON.stringify(loaded));
          found.updatedAt=new Date().toISOString();
        }else{
          loaded.baselineMode="saved";
          loaded.savedBaseline=savedBaseline;
        }
      }else{
        loaded.baselineMode="current";
        loaded.savedBaseline=savedBaseline;
      }
      state.whatIf.current=loaded;
      state.whatIf.activeTab="scenarios";
      save();
      renderWhatIfPreserve();
      window.scrollTo({top:0,behavior:"smooth"});
    }

    function deleteWhatIfScenario(id){
      if(typeof ensureWhatIfState==="function") ensureWhatIfState();
      state.whatIf.saved=(state.whatIf.saved||[]).filter(x=>x.id!==id);
      save();
      renderWhatIfPreserve();
    }
