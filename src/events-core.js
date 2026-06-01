// Centralized delegated event handling for rendered UI.
// Markup declares named actions with data-action and data-* arguments.
const delegatedActionNames = [
  "showPage","closeGlobalMenu","openGlobalMenu","setHomeCategory","setRavenSubPage","setWhatIfTab",
  "setWhatIfItem","setWhatIfTargetLevel","setWhatIfShowHigh","setWhatIfChestValue","resetWhatIfScenario",
  "toggleWhatIfSetupPreview","toggleWhatIfNontargetSideBreakdown","saveWhatIfScenario","toggleSavedScenarioSnapshot",
  "loadWhatIfScenario","deleteWhatIfScenario","setMode","setManualSide","onTargetItemChange","renderAll",
  "setHighestOwned","toggleCard","setChestMainMode","renderPlanInputs","renderGuaranteedInputs",
  "resetTopUpsForCurrentItem","resetTopUpsForAllItems","resetCurrentPlan","resetAllPlans","toggleChestsUsedVisibility",
  "setQuickAdjust","jumpToTargetLevel","toggleResultsMoreInfo","toggleNontargetSideBreakdown","toggleMoreInfo",
  "exportInventory","importInventory","saveCurrentInventorySnapshot","resetInventory","setInventoryArchiveMode",
  "setInventoryAdvancedMode","setInventory","setHideUnacquiredInventory","setUpgradedOwnedViewMode",
  "setInventoryInputFilter","setUpgradedOwnedFilter","setInventoryArchiveFilter","setBreakdownInventoryFilter",
  "toggleInventoryArchiveSnapshot","loadInventorySnapshot","deleteInventorySnapshot","openBagScanner","closeBagScanner","toggleBagScannerCard","setBagScannerFiles","runBagScanner","clearBagScannerReview","purgeBagScannerData","replaceActiveInventoryFromBagScan","setGlobalSetting",
  "toggleInventoryBreakdownExplain","toggleBreakdownSource","adjustGroup","setGroupValue","adjustBundleQty",
  "setBundleQty","toggleChoiceBankCollapse","redeemChoiceFromBank","adjustRedeemedChoice","setRedeemedChoice",
  "removeAllRedeemedChoice"
];

function registerDelegatedActions(){
  if(!window.LAP_ACTIONS) return;

  window.LAP_ACTIONS.registerWindowActions(delegatedActionNames);

  window.LAP_ACTIONS.registerActions({
    openImportFile({event,element}){
      const input=document.getElementById('importFile');
      if(input) input.click();
    },
    navigateAndCloseMenu({event,element}){
      const page=element && element.dataset ? element.dataset.page : "";
      if(page && typeof showPage==="function") showPage(page);
      if(typeof closeGlobalMenu==="function") closeGlobalMenu();
    },
    refreshChestInputs(){
      if(typeof renderPlanInputs==="function") renderPlanInputs();
      if(typeof renderGuaranteedInputs==="function") renderGuaranteedInputs();
      if(typeof renderAll==="function") renderAll();
    },
    toggleAuditTotalView({event,element}){
      const line=element ? element.closest('.audit-total-line') : null;
      if(!line) return;
      const raw=line.querySelector('.audit-total-raw');
      const simplified=line.querySelector('.audit-total-simplified');
      if(raw) raw.classList.toggle('hidden',element.checked);
      if(simplified) simplified.classList.toggle('hidden',!element.checked);
    }
  });
}

function parseDelegatedDataValue(value,type){
  if(value===undefined) return undefined;
  if(type==="string") return String(value);
  if(type==="number") return Number(value);
  if(value==="true") return true;
  if(value==="false") return false;
  if(value==="null") return null;
  return value;
}

function collectDelegatedArgs(element,event){
  const args=[];
  for(let index=0; index<20; index++){
    const sourceKey=`source${index}`;
    const argKey=`arg${index}`;
    if(element.dataset[sourceKey]){
      const source=element.dataset[sourceKey];
      if(source==="value") args.push(element.value);
      else if(source==="checked") args.push(element.checked);
      else if(source==="event") args.push(event);
      else if(source==="element") args.push(element);
      else args.push(undefined);
      continue;
    }
    if(Object.prototype.hasOwnProperty.call(element.dataset,argKey)){
      const typeKey=`arg${index}Type`;
      args.push(parseDelegatedDataValue(element.dataset[argKey],element.dataset[typeKey]));
      continue;
    }
    break;
  }
  return args;
}

function runNamedDelegatedAction(element,event){
  const action=element.dataset.action;
  if(!action || !window.LAP_ACTIONS) return;

  window.LAP_ACTIONS.runAction(action,{
    action,
    args:collectDelegatedArgs(element,event),
    event,
    element
  });
}

function bindDelegatedUiEvents(){
  if(window.__lapDelegatedUiEventsBound) return;
  window.__lapDelegatedUiEventsBound=true;

  ["click","change","input"].forEach(eventName=>{
    document.addEventListener(eventName,event=>{
      const stopNode=event.target.closest('[data-stop-propagation="true"]');
      if(stopNode && eventName==="click") event.stopPropagation();
      const target=event.target.closest(`[data-action][data-action-event="${eventName}"]`);
      if(!target) return;
      if(eventName==="click") event.preventDefault();
      runNamedDelegatedAction(target,event);
    });
  });
}

registerDelegatedActions();
bindDelegatedUiEvents();


// v1.0.13 module bridge exports
Object.assign(window,{
  bindDelegatedUiEvents,
  collectDelegatedArgs,
  delegatedActionNames,
  parseDelegatedDataValue,
  registerDelegatedActions,
  runNamedDelegatedAction
});
