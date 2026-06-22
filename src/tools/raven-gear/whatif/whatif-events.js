// Whatif events module. Event handlers wired to UI inputs/buttons; top of the whatif
// call chain (nothing else in whatif calls back in). Reaches state/render via runtime.

import { MAX_ITEM_LEVEL } from "../metadata/item-metadata.js";

export function createWhatIfEventsModule(runtime) {
  // Runtime deps still injected via explicit dependencies: mutable `state` + `save` callback.
  const {
    state, save,
  } = runtime;

function toggleWhatIfSetupPreview(){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      state.whatIf.current.previewOpen=!state.whatIf.current.previewOpen;
      save();
      runtime.renderWhatIfPreserve();
    }

function setWhatIfScenarioText(field,value){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      if(field==="name") state.whatIf.current.name=value;
      if(field==="note") state.whatIf.current.note=value;
      save();
    }

function setWhatIfTab(tab){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      state.whatIf.activeTab=tab==="saved" ? "saved" : "scenarios";
      save();
      runtime.renderWhatIfPreserve();
    }

function setWhatIfItem(value){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      state.whatIf.current.item=value;
      save();
      runtime.renderWhatIfPreserve();
    }

function setWhatIfTargetLevel(value){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      state.whatIf.current.targetLevel=Math.max(1,Math.min(MAX_ITEM_LEVEL,Math.floor(Number(value||7))));
      save();
      runtime.renderWhatIfPreserve();
    }

function setWhatIfShowHigh(checked){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      state.whatIf.current.showHigh=!!checked;
      save();
      runtime.renderWhatIfPreserve();
    }

function setWhatIfChestValue(kind,level,value){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      const bucket=kind==="choice" ? state.whatIf.current.choice : state.whatIf.current.random;
      bucket[level]=Math.max(0,Math.floor(Number(value||0)));
      save();
      runtime.renderWhatIfPreserve();
    }

function adjustWhatIfChestValue(kind,level,amount){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      const bucket=kind==="choice" ? state.whatIf.current.choice : state.whatIf.current.random;
      const next=Math.max(0,Math.floor(Number(bucket[level]||0))+Math.floor(Number(amount||0)));
      bucket[level]=next;
      save();
      runtime.renderWhatIfPreserve();
    }

function resetWhatIfScenario(){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      const item=state.whatIf.current.item || "Heart of Wisdom";
      const targetLevel=state.whatIf.current.targetLevel || 7;
      const baselineSource=state.whatIf.current.baselineSource || "combined";
      state.whatIf.current={item,targetLevel,random:{},choice:{},topUpBundles:{daily1:0,daily2:0,weekly:0},chestMainMode:"chests",showHigh:!!state.whatIf.current.showHigh,showHighChests:!!state.whatIf.current.showHighChests,baselineMode:"current",baselineSource,savedBaseline:null,previewOpen:!!state.whatIf.current.previewOpen,nontargetBreakdownOpen:false};
      save();
      runtime.renderWhatIfPreserve();
    }

// Scenario Setup baseline source: which inventory snapshot the cards use as the
// "owned base" before chests — Starting (active) vs Combined inventory.
function setWhatIfBaselineSource(value){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      state.whatIf.current.baselineSource=value==="starting" ? "starting" : "combined";
      save();
      runtime.renderWhatIfPreserve();
    }

// Results-level "Show Lvl 6–7": controlled input — receives the checkbox state
// (data-source0="checked") into the scenario state (DOM-free engine), persist, re-render.
function setWhatIfShowHighChests(checked){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      state.whatIf.current.showHighChests=!!checked;
      save();
      runtime.renderWhatIfPreserve();
    }

// "Change Target Lvl": mirror jumpToTargetLevel for the What If scenario setup.
function jumpToWhatIfTargetLevel(){
      const setup=runtime.byId("whatIfScenarioPanel");
      const target=runtime.byId("whatIfTargetLevel");
      if(setup) setup.scrollIntoView({behavior:"smooth",block:"start"});
      if(target){
        target.classList.remove("target-flash");
        void target.offsetWidth;
        target.classList.add("target-flash");
        setTimeout(()=>target.focus({preventScroll:true}),450);
      }
    }

// ── What If chest-card write path ───────────────────────────────────────────
// Scenario-scoped equivalents of the calculator's chest actions; the env-
// parameterized chest renderers emit these action names for the What If env.
function whatIfGroupObject(group){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      return group==="guaranteed" ? state.whatIf.current.choice : state.whatIf.current.random;
    }

function setWhatIfGroupValue(group,level,value){
      const obj=whatIfGroupObject(group);
      obj[level]=Math.max(0,Math.floor(Number(value||0)));
      save();
      runtime.renderWhatIfPreserve();
    }

function adjustWhatIfGroup(group,level,amount){
      const obj=whatIfGroupObject(group);
      obj[level]=Math.max(0,Math.floor(Number(obj[level]||0))+Math.floor(Number(amount||0)));
      save();
      runtime.renderWhatIfPreserve();
    }

function setWhatIfBundleQty(key,value){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      state.whatIf.current.topUpBundles[key]=Math.max(0,Math.floor(Number(value||0)));
      save();
      runtime.renderWhatIfPreserve();
    }

function adjustWhatIfBundleQty(key,delta){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      const cur=Math.floor(Number(state.whatIf.current.topUpBundles[key]||0));
      state.whatIf.current.topUpBundles[key]=Math.max(0,cur+Math.floor(Number(delta||0)));
      save();
      runtime.renderWhatIfPreserve();
    }

function setWhatIfChestMainMode(next){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      const chestActive=next!=="topup";
      state.whatIf.current.chestMainMode=chestActive ? "chests" : "topup";
      const chestsBtn=runtime.byId("whatIfchestsMainTab");
      const topUpBtn=runtime.byId("whatIftopUpBundlesTab");
      const chestsPanel=runtime.byId("whatIfchestsCombinedPanel");
      const topUpPanel=runtime.byId("whatIftopUpBundlesPanel");
      if(chestsBtn) chestsBtn.classList.toggle("active",chestActive);
      if(topUpBtn) topUpBtn.classList.toggle("active",!chestActive);
      if(chestsPanel) chestsPanel.classList.toggle("hidden",!chestActive);
      if(topUpPanel) topUpPanel.classList.toggle("hidden",chestActive);
      save();
    }

function refreshWhatIfChestInputs(checked){
      // Chest-level "Show Lv 6+": receives the checkbox state (data-source0="checked")
      // into the scenario state, persist, re-render.
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      state.whatIf.current.showHigh=!!checked;
      save();
      runtime.renderWhatIfPreserve();
    }

function resetWhatIfPlan(){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      state.whatIf.current.random={};
      state.whatIf.current.choice={};
      save();
      runtime.renderWhatIfPreserve();
    }

function resetWhatIfTopUps(){
      if(typeof runtime.ensureWhatIfState==="function") runtime.ensureWhatIfState();
      state.whatIf.current.topUpBundles={daily1:0,daily2:0,weekly:0};
      save();
      runtime.renderWhatIfPreserve();
    }


  return {
    toggleWhatIfSetupPreview,
    setWhatIfScenarioText,
    setWhatIfTab,
    setWhatIfItem,
    setWhatIfTargetLevel,
    setWhatIfShowHigh,
    setWhatIfChestValue,
    adjustWhatIfChestValue,
    resetWhatIfScenario,
    setWhatIfBaselineSource,
    setWhatIfShowHighChests,
    jumpToWhatIfTargetLevel,
    setWhatIfGroupValue,
    adjustWhatIfGroup,
    setWhatIfBundleQty,
    adjustWhatIfBundleQty,
    setWhatIfChestMainMode,
    refreshWhatIfChestInputs,
    resetWhatIfPlan,
    resetWhatIfTopUps,
  };
}
