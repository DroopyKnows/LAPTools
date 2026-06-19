// Whatif scenarios module. Save / load / delete / fingerprint of saved scenarios;
// baseline snapshots. `inventorySnapshotForItem` is private. Reaches state/render via runtime.

export function createWhatIfScenariosModule(runtime) {
  // External dependencies destructured from runtime at module-init time.
  // Functions, the runtime state object, and module-init constants are
  // captured by reference here — they're stable for the lifetime of runtime.
  // Future context removal work: replace this block with explicit `import` statements.
  const {
    state, save, activeInventoryForItem, combinedInventoryForItem,
    simplifyUpByLevel, showConfirmModal, showInventorySnapshotModal,
    showChoiceModal,
  } = runtime;

function inventorySnapshotForItem(itemName,source){
      return JSON.parse(JSON.stringify((source && source[itemName]) || {}));
    }

function buildWhatIfBaselineSnapshot(itemName){
      const starting=typeof activeInventoryForItem==="function" ? activeInventoryForItem(itemName) : inventorySnapshotForItem(itemName,state.inventory.active);
      const combined=typeof combinedInventoryForItem==="function" ? combinedInventoryForItem(itemName) : starting;
      const techPoints=Number(((state.inventoryTechPointsByItem || {})[itemName]) || 0);
      return {
        item:itemName,
        starting:JSON.parse(JSON.stringify(starting||{})),
        combined:JSON.parse(JSON.stringify(combined||{})),
        techPoints,
        fingerprint:JSON.stringify({startingRaw:starting||{},combinedRaw:combined||{},starting:simplifyUpByLevel(starting||{}),combined:simplifyUpByLevel(combined||{}),techPoints})
      };
    }

function currentWhatIfBaselineFingerprint(itemName){
      return buildWhatIfBaselineSnapshot(itemName).fingerprint;
    }

async function saveWhatIfScenario(){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      const current=JSON.parse(JSON.stringify(state.whatIf.current));
      const defaultName=`${current.item || "Scenario"} → Level ${current.targetLevel || 7}`;
      const details=await showInventorySnapshotModal({
        title:"Save Current Scenario",
        message:"Name this What If scenario and optionally add a note.",
        defaultName,
        defaultNote:current.note || "",
        nameLabel:"Scenario Name",
        noteLabel:"Optional Note",
        fallbackName:defaultName,
        confirmLabel:"Save Scenario",
        cancelLabel:"Cancel"
      });
      if(!details) return;
      const stamp=new Date();
      const baseline=buildWhatIfBaselineSnapshot(current.item || "Heart of Wisdom");
      current.name=details.name;
      current.note=details.note;
      current.baselineMode="current";
      current.savedBaseline=baseline;
      state.whatIf.saved.unshift({
        id:String(Date.now()),
        name:details.name,
        note:details.note,
        savedAt:stamp.toISOString(),
        updatedAt:stamp.toISOString(),
        baseline,
        scenario:current
      });
      save();
      state.whatIf.activeTab="saved";
      runtime.renderWhatIfPreserve();
    }

async function loadWhatIfScenario(id){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      const found=(state.whatIf.saved||[]).find(x=>x.id===id);
      if(!found) return;
      const shouldLoad=await showConfirmModal({
        title:"Load Saved Scenario?",
        message:"This will replace the current What If setup with the saved scenario.",
        confirmLabel:"Load Scenario",
        cancelLabel:"Cancel"
      });
      if(!shouldLoad) return;
      const loaded=JSON.parse(JSON.stringify(found.scenario || {}));
      const itemName=loaded.item || found.baseline?.item || "Heart of Wisdom";
      const savedBaseline=found.baseline || loaded.savedBaseline || buildWhatIfBaselineSnapshot(itemName);
      const changed=savedBaseline.fingerprint && savedBaseline.fingerprint!==currentWhatIfBaselineFingerprint(itemName);
      if(changed){
        const inventoryChoice=await showChoiceModal({
          title:"Inventory Has Changed",
          message:"The inventory baseline changed since this scenario was saved.",
          choices:[
            {value:"current",label:"Use Current Inventory",className:"button2 button2--sm button2--primary primary-btn"},
            {value:"saved",label:"Keep Saved Inventory",className:"button2 button2--sm button2--ghost ghost-btn"}
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
      runtime.renderWhatIfPreserve();
      window.scrollTo({top:0,behavior:"smooth"});
    }

async function deleteWhatIfScenario(id){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      const found=(state.whatIf.saved||[]).find(x=>x.id===id);
      if(!found) return;
      const shouldDelete=await showConfirmModal({
        title:"Delete Saved Scenario?",
        message:"This saved What If scenario will be permanently removed.",
        confirmLabel:"Delete",
        cancelLabel:"Cancel"
      });
      if(!shouldDelete) return;
      state.whatIf.saved=(state.whatIf.saved||[]).filter(x=>x.id!==id);
      save();
      runtime.renderWhatIfPreserve();
    }

function toggleSavedScenarioSnapshot(id){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      state.whatIf.expandedSnapshots=state.whatIf.expandedSnapshots || {};
      state.whatIf.expandedSnapshots[id]=!state.whatIf.expandedSnapshots[id];
      save();
      runtime.renderWhatIfPreserve();
    }


  return {
    buildWhatIfBaselineSnapshot,
    currentWhatIfBaselineFingerprint,
    saveWhatIfScenario,
    loadWhatIfScenario,
    deleteWhatIfScenario,
    toggleSavedScenarioSnapshot,
  };
}
