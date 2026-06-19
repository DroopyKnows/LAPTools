// Whatif render module. Renders the what-if tab UI (setup preview, chest inputs,
// saved-scenarios list, top-level renderWhatIf orchestrator). Reaches state/scenarios/
// results via runtime; render <-> results forms a cycle resolved at call time.

import { ravenItems, allItemLevels } from "../metadata/item-metadata.js";
import { initAllGrids } from "../ui/grid/grid.js";

export function createWhatIfRenderModule(runtime) {
  // Runtime deps injected via runtime: mutable `state` + factory-created render/math closures.
  const {
    state, simplifyUpByLevel, renderEmptyState,
    renderInventoryDisplayPills, renderLevelPillGrid,
    renderCompactInventoryRows, renderCompactLevelBoxes,
    rawTargetAdditionsFromPlanAndChoice, addLevelObjects,
    captureActiveInputState, restoreActiveInputState,
  } = runtime;

function whatIfLevelPills(obj, emptyText, options={}){
  const cfg={
    levels: allItemLevels.slice().sort((a,b)=>b-a),
    transform: source=>simplifyUpByLevel(source || {}),
    gridClass:"level-value-pill-grid whatif-pill-grid",
    pillClass:"level-value-pill",
    levelClass:"pill-level",
    qtyClass:"pill-qty",
    emptyHtml:renderEmptyState({title:"",message:emptyText,className:"notice2 notice2--empty",compact:true}),
    itemName:options.itemName,
    techPoints:options.techPoints
  };
  return typeof renderInventoryDisplayPills==="function" ? renderInventoryDisplayPills(obj,cfg) : renderLevelPillGrid(obj,cfg);
}

function whatIfRawPills(obj, emptyText, options={}){
  const cfg={
    levels: allItemLevels.slice().sort((a,b)=>b-a),
    gridClass:"level-value-pill-grid whatif-pill-grid",
    pillClass:"level-value-pill",
    levelClass:"pill-level",
    qtyClass:"pill-qty",
    emptyHtml:renderEmptyState({title:"",message:emptyText,className:"notice2 notice2--empty",compact:true}),
    itemName:options.itemName,
    techPoints:options.techPoints
  };
  return typeof renderInventoryDisplayPills==="function" ? renderInventoryDisplayPills(obj,cfg) : renderLevelPillGrid(obj,cfg);
}

function whatIfCompactInventoryRows(rows){
  // each row is a static grid2--labeled-rows grid (NEVER data-grid2); row bodies are
  // the compact pills. Label column matches archived compare rows at 50px.
  return renderCompactInventoryRows(rows,{
    wrapperClass:"stack2 stack2--column stack2--gap-2",
    rowClass:"grid2 grid2--labeled-rows grid2--gap-sm",
    rowStyle:"--grid2-label-col:50px",
    labelClass:"grid2__row-label",
    valuesClass:"grid2__row-body",
    pillRenderer: (obj,row)=>renderCompactLevelBoxes(obj || {}, allItemLevels, {itemName:row.itemName,techPoints:row.techPoints}) || renderEmptyState({title:"",message:"None",className:"notice2 notice2--empty",compact:true})
  });
}

function renderWhatIfSetupPreview(){
  const card=runtime.byId("whatIfSetupPreviewCard");
  const wrap=runtime.byId("whatIfSetupInventoryPreview");
  if(!wrap) return;
  const open=!!state.whatIf.current.previewOpen;
  // Clean collapse: .card2--collapsible:not(.card2--open) .card2__content hides the body.
  if(card) card.classList.toggle("card2--open",open);
  const base=runtime.getWhatIfBaselineForCurrent();
  wrap.innerHTML=whatIfCompactInventoryRows([
    {label:"<span>Starting</span><span>Inventory</span>",obj:base.starting,itemName:base.item,techPoints:base.techPoints},
    {label:"<span>Combined</span><span>Inventory</span>",obj:base.combined,itemName:base.item,techPoints:base.techPoints}
  ]);
}

function renderSavedWhatIfScenarios(){
  runtime.ensureWhatIfState();
  const wrap=runtime.byId("savedWhatIfScenarios");
  if(!wrap) return;
  if(!state.whatIf.saved.length){
    wrap.innerHTML=renderEmptyState({title:'No saved scenarios yet.',message:'Saved What If scenarios will appear here.',className:'notice2 notice2--empty'});
    return;
  }
  wrap.innerHTML=state.whatIf.saved.map(entry=>{
    const sc=entry.scenario || {};
    const itemName=sc.item || entry.baseline?.item || "Heart of Wisdom";
    const item=ravenItems.find(x=>x.name===itemName) || ravenItems[0];
    const p=item.side==="left" ? 2/9 : 1/9;
    const baseline=entry.baseline || sc.savedBaseline || {starting:{},combined:{}};
    const rawAdds=rawTargetAdditionsFromPlanAndChoice(sc.random||{},sc.choice||{},p);
    const whatIfInventory=simplifyUpByLevel(addLevelObjects(baseline.combined||{},rawAdds));
    const randomCount=Object.values(sc.random||{}).reduce((a,b)=>a+Math.floor(Number(b||0)),0);
    const choiceCount=Object.values(sc.choice||{}).reduce((a,b)=>a+Math.floor(Number(b||0)),0);
    const date=entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : (entry.savedAt ? new Date(entry.savedAt).toLocaleString() : "Saved scenario");
    const changed=baseline.fingerprint && baseline.fingerprint!==runtime.currentWhatIfBaselineFingerprint(itemName);
    const expanded=!!state.whatIf.expandedSnapshots[entry.id];
    const safeId=runtime.uiEscapeAttr(entry.id);
    const title=runtime.uiEscapeAttr(entry.name || ((itemName||"Scenario")+" → Level "+(sc.targetLevel||7)));
    const subtitle=runtime.uiEscapeAttr(date) + (changed ? ` · <span class="text2--danger">Inventory changed</span>` : "");
    const note=entry.note ? runtime.uiEscapeAttr(entry.note) : "";
    const meta=runtime.uiEscapeAttr(`Random: ${randomCount} · Choice: ${choiceCount}`);
    const bodyHtml=whatIfCompactInventoryRows([
      {label:"<span>Starting</span><span>Inventory</span>",obj:baseline.starting||{},itemName,techPoints:baseline.techPoints},
      {label:"<span>Combined</span><span>Inventory</span>",obj:baseline.combined||{},itemName,techPoints:baseline.techPoints},
      {label:"<span>What If</span><span>Inventory</span>",obj:whatIfInventory||{},itemName,techPoints:baseline.techPoints}
    ]);
    return `<div class="card2 card2--white card2--md card2--collapsible ${expanded ? "card2--open" : ""}">
      <div class="card2__header">
        <div class="stack2 stack2--row stack2--gap-2 stack2--align-start stack2--fill-hug">
          <button class="card2__header card2__header--toggle card2__collapse-toggle" type="button" data-action="toggleSavedScenarioSnapshot" data-action-event="click" data-arg0="${safeId}">
            <div class="card2__heading">
              <div class="card2__text card2__text--left">
                <div class="card2__title">${title}</div>
                <div class="card2__body">${subtitle}</div>
                <div class="text2 text2--subtle" style="margin-top:4px;">${meta}</div>
                ${note ? `<div class="text2 text2--subtle">${note}</div>` : ""}
              </div>
            </div>
          </button>
          <div class="stack2 stack2--row stack2--gap-2 stack2--align-center stack2--wrap card2__action" data-stop-propagation="true">
            <button class="button2 button2--sm button2--positive" data-action="loadWhatIfScenario" data-action-event="click" data-arg0="${safeId}">Load</button>
            <button class="button2 button2--sm button2--danger" data-action="deleteWhatIfScenario" data-action-event="click" data-arg0="${safeId}">Delete</button>
          </div>
        </div>
      </div>
      <div class="card2__content card2__content--after-header stack2 stack2--column stack2--gap-3">${bodyHtml}</div>
    </div>`;
  }).join("");
}

function renderWhatIf(){
  runtime.ensureWhatIfState();
  const scenarioBtn=runtime.byId("whatIfScenarioTab");
  const savedBtn=runtime.byId("whatIfSavedTab");
  const scenarioPanel=runtime.byId("whatIfScenarioPanel");
  const savedPanel=runtime.byId("whatIfSavedPanel");
  if(scenarioBtn) scenarioBtn.classList.toggle("active",state.whatIf.activeTab!=="saved");
  if(savedBtn) savedBtn.classList.toggle("active",state.whatIf.activeTab==="saved");
  if(scenarioPanel) scenarioPanel.classList.toggle("hidden",state.whatIf.activeTab==="saved");
  if(savedPanel) savedPanel.classList.toggle("hidden",state.whatIf.activeTab!=="saved");
  runtime.renderWhatIfScenario();
  renderSavedWhatIfScenarios();
  initAllGrids(runtime.root || document);
}

function renderWhatIfPreserve(){
      const activeInfo=(typeof captureActiveInputState==="function") ? captureActiveInputState() : null;
      if(typeof renderWhatIf==="function") renderWhatIf();
      if(typeof restoreActiveInputState==="function") restoreActiveInputState(activeInfo);
    }


  return {
    whatIfLevelPills,
    whatIfRawPills,
    whatIfCompactInventoryRows,
    renderWhatIfSetupPreview,
    renderSavedWhatIfScenarios,
    renderWhatIf,
    renderWhatIfPreserve,
  };
}
