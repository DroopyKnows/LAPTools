// What If sandbox rendering. This page uses Combined Inventory as its baseline and does not affect saved plans, Top Ups, or Choice Chest Bank.

function ensureWhatIfState(){
  state.whatIf=state.whatIf || {};
  state.whatIf.activeTab=state.whatIf.activeTab || "scenarios";
  state.whatIf.current=state.whatIf.current || {};
  state.whatIf.current.item=state.whatIf.current.item || "Heart of Wisdom";
  state.whatIf.current.targetLevel=Number(state.whatIf.current.targetLevel || 7);
  state.whatIf.current.random=state.whatIf.current.random || {};
  state.whatIf.current.choice=state.whatIf.current.choice || {};
  state.whatIf.current.showHigh=!!state.whatIf.current.showHigh;
  state.whatIf.current.name=state.whatIf.current.name || "";
  delete state.whatIf.current.name;
  delete state.whatIf.current.note;
  state.whatIf.current.previewOpen=!!state.whatIf.current.previewOpen;
  state.whatIf.current.nontargetBreakdownOpen=!!state.whatIf.current.nontargetBreakdownOpen;
  state.whatIf.current.baselineMode=state.whatIf.current.baselineMode || "current";
  state.whatIf.current.savedBaseline=state.whatIf.current.savedBaseline || null;
  state.whatIf.saved=Array.isArray(state.whatIf.saved) ? state.whatIf.saved : [];
  state.whatIf.expandedSnapshots=state.whatIf.expandedSnapshots || {};
}

function whatIfItem(){
  ensureWhatIfState();
  return ravenItems.find(x=>x.name===state.whatIf.current.item) || ravenItems[0];
}

function whatIfProbability(){
  return whatIfItem().side==="left" ? 2/9 : 1/9;
}

function whatIfLevelPills(obj, emptyText){
  return renderLevelPillGrid(obj,{
    levels: allItemLevels.slice().sort((a,b)=>b-a),
    transform: source=>simplifyUpByLevel(source || {}),
    gridClass:"whatif-pill-grid",
    pillClass:"whatif-pill",
    levelClass:"pill-level",
    qtyClass:"pill-qty",
    emptyHtml:renderEmptyState({title:"",message:emptyText,className:"empty-message",compact:true})
  });
}

function whatIfRawPills(obj, emptyText){
  return renderLevelPillGrid(obj,{
    levels: allItemLevels.slice().sort((a,b)=>b-a),
    gridClass:"whatif-pill-grid",
    pillClass:"whatif-pill",
    levelClass:"pill-level",
    qtyClass:"pill-qty",
    emptyHtml:renderEmptyState({title:"",message:emptyText,className:"empty-message",compact:true})
  });
}

function whatIfCompactInventoryRows(rows){
  return renderCompactInventoryRows(rows,{
    pillRenderer: obj=>whatIfLevelPills(obj || {}, "None")
  });
}

function getWhatIfBaselineForCurrent(){
  ensureWhatIfState();
  const item=whatIfItem();
  const saved=state.whatIf.current.savedBaseline;
  if(state.whatIf.current.baselineMode==="saved" && saved && saved.item===item.name){
    return {starting:saved.starting||{},combined:saved.combined||{},label:"Saved Inventory Baseline"};
  }
  const starting=(state.inventory.active && state.inventory.active[item.name]) || {};
  const combined=typeof combinedInventoryForItem==="function" ? combinedInventoryForItem(item.name) : starting;
  return {starting,combined,label:"Current Inventory Baseline"};
}

function renderWhatIfSetupPreview(){
  const card=document.getElementById("whatIfSetupPreviewCard");
  const body=document.getElementById("whatIfSetupPreviewBody");
  const wrap=document.getElementById("whatIfSetupInventoryPreview");
  if(!wrap) return;
  const open=!!state.whatIf.current.previewOpen;
  if(card) card.classList.toggle("open",open);
  if(body) body.classList.toggle("hidden",!open);
  const base=getWhatIfBaselineForCurrent();
  wrap.innerHTML=whatIfCompactInventoryRows([
    {label:"Starting Inventory",obj:base.starting},
    {label:"Combined Inventory",obj:base.combined}
  ]);
}

function renderWhatIfChestInputs(){
  ensureWhatIfState();
  const wrap=document.getElementById("whatIfChestInputs");
  if(!wrap) return;
  const levels=state.whatIf.current.showHigh ? [7,6,5,4,3,2,1] : [5,4,3,2,1];
  wrap.innerHTML=levels.map(level=>`
    <div class="compact-chest-row">
      <div class="compact-chest-level">Lvl ${level}</div>
      <div class="compact-chest-field">
        <label>Random</label>
        <input data-input-key="whatif-random-${level}" type="number" min="0" step="1" value="${state.whatIf.current.random[level]||""}" placeholder="0" data-action="setWhatIfChestValue" data-action-event="input" data-arg0="random" data-arg1="${level}" data-source2="value" />
      </div>
      <div class="compact-chest-field">
        <label>Choice</label>
        <input data-input-key="whatif-choice-${level}" type="number" min="0" step="1" value="${state.whatIf.current.choice[level]||""}" placeholder="0" data-action="setWhatIfChestValue" data-action-event="input" data-arg0="choice" data-arg1="${level}" data-source2="value" />
      </div>
    </div>
  `).join("");
}

function whatIfHasInputs(){
  ensureWhatIfState();
  return Object.values(state.whatIf.current.random||{}).some(v=>Number(v||0)>0) || Object.values(state.whatIf.current.choice||{}).some(v=>Number(v||0)>0);
}

function renderWhatIfScenario(){
  ensureWhatIfState();
  const item=whatIfItem();
  const p=whatIfProbability();
  const target=Math.max(1,Math.min(MAX_ITEM_LEVEL,Number(state.whatIf.current.targetLevel||7)));
  const random=state.whatIf.current.random || {};
  const choice=state.whatIf.current.choice || {};
  const baseline=getWhatIfBaselineForCurrent();
  const currentInventory=baseline.starting || {};
  const combined=baseline.combined || {};
  const rawScenarioAdds=rawTargetAdditionsFromPlanAndChoice(random,choice,p);
  const expected=simplifyUpByLevel(rawScenarioAdds);
  const after=simplifyUpByLevel(addLevelObjects(combined,rawScenarioAdds));

  const itemSelect=document.getElementById("whatIfTargetItem");
  if(itemSelect) itemSelect.value=item.name;
  const targetSelect=document.getElementById("whatIfTargetLevel");
  if(targetSelect) targetSelect.value=String(target);
  const high=document.getElementById("whatIfShowHighRandom");
  if(high) high.checked=!!state.whatIf.current.showHigh;
  const chance=document.getElementById("whatIfChanceValue");
  if(chance){
    chance.textContent=(p*100).toFixed(3)+"%";
    chance.classList.toggle("left-chance",item.side==="left");
    chance.classList.toggle("right-chance",item.side==="right");
  }

  renderWhatIfSetupPreview();
  renderWhatIfChestInputs();

  const summary=document.getElementById("whatIfChangeSummary");
  if(summary){
    summary.innerHTML=renderStateRows([
      {title:"Current Inventory",sub:`Manually entered inventory for ${item.name}.`,html:whatIfLevelPills(currentInventory,"No current inventory entered.")},
      {title:"Combined Inventory Baseline",sub:"Current Inventory plus calculated inventory from saved plans.",html:whatIfLevelPills(combined,"No combined inventory yet.")},
      {title:"What If Additions",sub:"Estimated target duplicates from this scenario.",html:whatIfLevelPills(expected,whatIfHasInputs()?"No target items expected.":"No What If chests entered yet.")},
      {title:"After What If",sub:"Combined Inventory plus this scenario.",html:whatIfLevelPills(after,"No inventory projected yet."),strong:true}
    ]);
  }

  const resultLevels=allItemLevels.filter(level=>level<=target);
  const remainingItems=resultLevels.map(level=>{
    const raw=requiredAtLevel(target,level);
    const ownedEq=levelObjectEquivalentAtLevel(calculateEffectiveOwnedForRemainingItems(combined,random,choice,p),level);
    const remaining=Math.max(0,raw-ownedEq);
    return remaining>0 ? String(Math.ceil(remaining)) : "-";
  });

  const chestResultLevels=state.whatIf.current.showHigh ? [7,6,5,4,3,2,1] : [5,4,3,2,1];
  const remainingChests=chestResultLevels.map(level=>{
    const effective=calculateEffectiveOwnedForRemainingChestColumn(combined,random,choice,p,level);
    const raw=requiredAtLevel(target,level);
    const ownedEq=levelObjectEquivalentAtLevel(effective,level);
    const remainingItems=Math.max(0,raw-ownedEq);
    const base=remainingItems>0 ? Math.ceil(remainingItems/p) : 0;
    const already=Number(random[level]||0);
    const need=Math.max(0,base-already);
    return need ? String(need) : "-";
  });

  makeFilteredResultTable("whatIfExpectedTable",estimatedDisplayLevels(expected),estimatedDisplayLevels(expected).map(level=>expected[level]?String(expected[level]):"-"),whatIfHasInputs()?"No target items expected.":"No What If chests entered yet.");

  const hasRemainingItems=remainingItems.some(v=>v!=="-");
  if(hasRemainingItems) makeRemainingItemsChunkedTable("whatIfItemsNeededTable",resultLevels,remainingItems,false);
  else {
    const el=document.getElementById("whatIfItemsNeededTable");
    if(el){ el.className="result-chunks"; el.innerHTML='<div class="success-message">Desired level met in this scenario.</div>'; }
  }
  const hasRemainingChests=remainingChests.some(v=>v!=="-");
  if(hasRemainingChests) makeTable("whatIfRemainingTable",chestResultLevels,remainingChests);
  else {
    const el=document.getElementById("whatIfRemainingTable");
    if(el){ el.className="success-message"; el.innerHTML="Desired level met in this scenario."; }
  }

  const nontarget=nontargetSideTotalsFromRandomPlan(random,item.side,p);
  const nontargetDisplay=chestLevels.map(level=>{
    const left=safeNum(nontarget.left[level]);
    const right=safeNum(nontarget.right[level]);
    if(left<=0 && right<=0) return "-";
    const parts=[];
    if(left>0) parts.push("L: "+Math.floor(left));
    if(right>0) parts.push("R: "+Math.floor(right));
    return parts.join(" / ");
  });
  makeFilteredResultTable("whatIfNontargetTable",chestLevels,nontargetDisplay,whatIfHasInputs()?"No non-target items expected.":"No What If chests entered yet.");
  const panel=document.getElementById("whatIfNontargetSideBreakdown");
  const btn=document.getElementById("whatIfNontargetBreakdownToggle");
  const isOpen=!!state.whatIf.current.nontargetBreakdownOpen;
  if(panel) panel.classList.toggle("open",isOpen);
  if(btn) btn.textContent=isOpen ? "Hide side breakdown" : "Show side breakdown";
  const leftVals=chestLevels.map(level=>safeNum(nontarget.left[level])>0 ? String(Math.floor(safeNum(nontarget.left[level]))) : "-");
  const rightVals=chestLevels.map(level=>safeNum(nontarget.right[level])>0 ? String(Math.floor(safeNum(nontarget.right[level]))) : "-");
  makeFilteredResultTable("whatIfNontargetLeftTable",chestLevels,leftVals,whatIfHasInputs()?"No left-side non-target items expected.":"No What If chests entered yet.");
  makeFilteredResultTable("whatIfNontargetRightTable",chestLevels,rightVals,whatIfHasInputs()?"No right-side non-target items expected.":"No What If chests entered yet.");
}

function renderSavedWhatIfScenarios(){
  ensureWhatIfState();
  const wrap=document.getElementById("savedWhatIfScenarios");
  if(!wrap) return;
  if(!state.whatIf.saved.length){
    wrap.innerHTML=renderEmptyState({title:'No saved scenarios yet.',message:'Saved What If scenarios will appear here.',className:'empty-message saved-empty'});
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
    const changed=baseline.fingerprint && baseline.fingerprint!==currentWhatIfBaselineFingerprint(itemName);
    const expanded=!!state.whatIf.expandedSnapshots[entry.id];
    return renderCompactActionCard({
      className:"saved-scenario-card compact-saved-card",
      expanded,
      onclick:`toggleSavedScenarioSnapshot('${entry.id}')`,
      title:entry.name || ((itemName||"Scenario")+" → Level "+(sc.targetLevel||7)),
      subtitle:date + (changed ? " · Inventory changed" : ""),
      note:entry.note || "",
      meta:`Random: ${randomCount} · Choice: ${choiceCount}`,
      actions:[
        {label:"Load",className:"ghost-btn",onclick:`loadWhatIfScenario('${entry.id}')`},
        {label:"Delete",className:"danger-btn",onclick:`deleteWhatIfScenario('${entry.id}')`}
      ],
      dropdownHtml:whatIfCompactInventoryRows([
        {label:"Starting Inventory",obj:baseline.starting||{}},
        {label:"Combined Inventory",obj:baseline.combined||{}},
        {label:"What If Inventory",obj:whatIfInventory||{}}
      ])
    });
  }).join("");
}

function renderWhatIf(){
  ensureWhatIfState();
  const scenarioBtn=document.getElementById("whatIfScenarioTab");
  const savedBtn=document.getElementById("whatIfSavedTab");
  const scenarioPanel=document.getElementById("whatIfScenarioPanel");
  const savedPanel=document.getElementById("whatIfSavedPanel");
  if(scenarioBtn) scenarioBtn.classList.toggle("active",state.whatIf.activeTab!=="saved");
  if(savedBtn) savedBtn.classList.toggle("active",state.whatIf.activeTab==="saved");
  if(scenarioPanel) scenarioPanel.classList.toggle("hidden",state.whatIf.activeTab==="saved");
  if(savedPanel) savedPanel.classList.toggle("hidden",state.whatIf.activeTab!=="saved");
  renderWhatIfScenario();
  renderSavedWhatIfScenarios();
}
