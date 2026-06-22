// Inventory event-handler module. External helpers/data/state are read from runtime at call time.
// Note: `mode` is locally shadowed in three places (two params + one let in openTechPointsModal);
// those bodies use the local, not runtime.mode.

import { ravenItems, MANUAL_HIGH_LEVEL_KEY } from "../metadata/item-metadata.js";

export function createInventoryEventsModule(runtime){
    function setInventoryArchiveMode(mode){
      runtime.state.inventoryArchiveMode=mode==="archived" ? "archived" : "active";
      runtime.save();
      runtime.renderInventory();
    }

    function setInventoryArchiveFilter(filter){
      runtime.state.inventoryArchiveFilter=(filter==="left"||filter==="right") ? filter : "all";
      runtime.save();
      runtime.renderInventory();
    }

    function toggleInventoryArchiveSnapshot(id){
      runtime.state.inventoryArchiveExpanded=runtime.state.inventoryArchiveExpanded || {};
      runtime.state.inventoryArchiveExpanded[id]=!runtime.state.inventoryArchiveExpanded[id];
      runtime.save();
      runtime.renderInventory();
    }

    async function saveCurrentInventorySnapshot(){
      const snapshot=await runtime.showInventorySnapshotModal({
        defaultName:`Inventory ${new Date().toLocaleDateString()}`
      });
      if(!snapshot) return;
      runtime.state.inventoryArchives=Array.isArray(runtime.state.inventoryArchives) ? runtime.state.inventoryArchives : [];
      runtime.state.inventoryArchives.unshift({
        id:String(Date.now()),
        name:(snapshot.name||"Inventory Snapshot").trim()||"Inventory Snapshot",
        note:(snapshot.note||"").trim(),
        savedAt:new Date().toISOString(),
        inventory:JSON.parse(JSON.stringify(runtime.state.inventory.active||{})),
        techPointsByItem:JSON.parse(JSON.stringify((runtime.state.inventory && runtime.state.inventory.techPointsByItem) || runtime.state.inventoryTechPointsByItem || {}))
      });
      runtime.state.inventoryArchiveMode="archived";
      runtime.save();
      runtime.renderInventory();
    }

    async function loadInventorySnapshot(id){
      const found=(runtime.state.inventoryArchives||[]).find(x=>x.id===id);
      if(!found) return;
      const shouldLoad=await runtime.showConfirmModal({
        title:"Load Archived Inventory?",
        message:"This will replace Active Inventory.",
        confirmLabel:"Replace Active Inventory",
        cancelLabel:"Cancel"
      });
      if(!shouldLoad) return;
      runtime.state.inventory.active=JSON.parse(JSON.stringify(found.inventory||{}));
      runtime.state.inventory.techPointsByItem=JSON.parse(JSON.stringify(found.techPointsByItem || found.inventoryTechPointsByItem || {}));
      runtime.state.inventoryTechPointsByItem=runtime.state.inventory.techPointsByItem;
      ravenItems.forEach(item=>runtime.state.inventory.active[item.name]=runtime.state.inventory.active[item.name]||{});
      runtime.state.inventoryArchiveMode="active";
      runtime.save();
      runtime.renderAll();
    }

    async function deleteInventorySnapshot(id){
      const shouldDelete=await runtime.showConfirmModal({
        title:"Delete Archived Inventory?",
        message:"This snapshot will be removed from Archived Inventory.",
        confirmLabel:"Delete",
        cancelLabel:"Cancel"
      });
      if(!shouldDelete) return;
      runtime.state.inventoryArchives=(runtime.state.inventoryArchives||[]).filter(x=>x.id!==id);
      runtime.save();
      runtime.renderInventory();
    }

    function setInventoryInputFilter(filter){
      runtime.state.inventoryInputFilter=filter;
      runtime.updateSideFilterTabs("inventoryInput", filter);
      runtime.save();
      runtime.renderInventory();
    }

    function setUpgradedOwnedFilter(filter){
      runtime.state.upgradedOwnedFilter=filter;
      runtime.updateSideFilterTabs("upgradedOwned", filter);
      runtime.save();
      runtime.renderInventory();
    }

    function setUpgradedOwnedViewMode(mode){
      runtime.state.upgradedOwnedViewMode=mode;
      runtime.updateUpgradedOwnedViewTabs(mode);
      runtime.save();
      runtime.renderInventory();
    }

    function setHideUnacquiredInventory(checked){
      runtime.state.hideUnacquiredInventory=!!checked;
      runtime.save();
      runtime.renderInventory();
    }

    function setInventoryEquippedOnly(checked){
      runtime.state.ui=runtime.state.ui || {};
      runtime.state.ui.inventoryEquippedOnly=!!checked;
      runtime.save();
      runtime.renderInventory();
    }

    function setInventoryLevelRange(itemName,range){
      runtime.state.inventoryLevelRangeByItem=runtime.state.inventoryLevelRangeByItem || {};
      runtime.state.inventoryLevelRangeByItem[itemName]=range==="8-12" ? "8-12" : "1-7";
      runtime.save();
      runtime.renderInventory();
    }

    function toggleInventoryLevelRange(itemName){
      const current=(runtime.state.inventoryLevelRangeByItem||{})[itemName]==="8-12" ? "8-12" : "1-7";
      setInventoryLevelRange(itemName,current==="8-12" ? "1-7" : "8-12");
    }

    // Owned-level store for a high-level key. Manual mode (MANUAL_HIGH_LEVEL_KEY) keeps its
    // equipped level in the manual owned object; a real item uses its active map entry. `create`
    // ensures the container exists for writes.
    function highLevelOwnedStore(itemName,create){
      if(itemName===MANUAL_HIGH_LEVEL_KEY){
        if(create) runtime.state.manualOwned=runtime.state.manualOwned || {};
        return runtime.state.manualOwned || {};
      }
      if(create){
        runtime.state.inventory.active=runtime.state.inventory.active || {};
        runtime.state.inventory.active[itemName]=runtime.state.inventory.active[itemName] || {};
      }
      return (runtime.state.inventory.active||{})[itemName] || {};
    }

    function inventoryHasLevelsOneToSeven(itemName){
      const values=highLevelOwnedStore(itemName,false);
      return [1,2,3,4,5,6,7].some(level=>Number(values[level]||0)>0);
    }

    function clearInventoryLevelsOneToSeven(itemName){
      if(!itemName) return;
      const values=highLevelOwnedStore(itemName,true);
      [1,2,3,4,5,6,7].forEach(level=>{ delete values[level]; });
    }

    function activeHighLevelForItem(itemName){
      const values=highLevelOwnedStore(itemName,false);
      for(let level=12;level>=8;level--){
        if(Number(values[level]||0)>0) return level;
      }
      return 0;
    }

    function ensureDismissedMessages(){
      runtime.state.settings=runtime.state.settings || {};
      runtime.state.settings.dismissedMessages=runtime.state.settings.dismissedMessages || {};
      return runtime.state.settings.dismissedMessages;
    }

    function highLevelClearPromptDismissed(){
      return !!ensureDismissedMessages().highLevelInventoryClear;
    }

    function showHighLevelInventoryClearPrompt(){
      return new Promise(resolve=>{
        const host=runtime.ensureModalHost();
        const finish=value=>{
          const checkbox=host.querySelector("#highLevelClearDoNotShowAgain");
          const doNotShowAgain=!!(checkbox && checkbox.checked);
          runtime.closeAppModal();
          resolve(Object.assign({doNotShowAgain},value||{choice:"manual"}));
        };
        host.className="modal2";
        host.innerHTML=`
          <div class="modal2__scrim" data-modal-scrim></div>
          <div class="modal2__panel modal2__panel--md" role="dialog" aria-modal="true" aria-labelledby="appModalTitle">
            <div class="modal2__title" id="appModalTitle">Clearing All Level 1-7 Items Is Recommended</div>
            <div class="modal2__content stack2 stack2--column stack2--gap-2">
              <div class="modal2__message">Raven Gear upgrades to level 9 and above don't require the 3-to-1 upgrade conversion system. For this reason, all duplicates should be consumed, and then the points from the duplicates should be input into the Tech Points field.</div>
              <label class="toggle2">
                <input class="toggle2__checkbox" id="highLevelClearDoNotShowAgain" type="checkbox" />
                <span class="toggle2__label">Do not show again</span>
              </label>
              <div class="modal2__actions modal2__actions--stacked">
                <button type="button" class="button2 button2--sm button2--danger" data-modal-clear>Remove All Lvl 1–7 Items</button>
                <button type="button" class="button2 button2--sm button2--ghost" data-modal-manual>I Will Do It Manually</button>
              </div>
            </div>
          </div>
        `;
        host.querySelectorAll("[data-modal-manual]").forEach(el=>el.addEventListener("click",()=>finish({choice:"manual"}),{once:true}));
        const clearButton=host.querySelector("[data-modal-clear]");
        if(clearButton) clearButton.addEventListener("click",()=>finish({choice:"clear"}),{once:true});
      });
    }

    async function resetDoNotShowAgainMessages(control){
      if(control) control.checked=false;
      const shouldReset=await runtime.showConfirmModal({
        title:"Reset Do Not Show Again Messages?",
        message:"Dismissed recommendation popups will be shown again.",
        confirmLabel:"Reset",
        cancelLabel:"Cancel"
      });
      if(control) control.checked=false;
      if(!shouldReset) return;
      runtime.state.settings=runtime.state.settings || {};
      runtime.state.settings.dismissedMessages={};
      runtime.save();
    }

    function clearInventoryTechPointsForItem(itemName){
      if(!itemName) return;
      if(itemName===MANUAL_HIGH_LEVEL_KEY){ runtime.state.manualTechPoints=0; return; }
      runtime.state.inventory=runtime.state.inventory || {};
      runtime.state.inventory.techPointsByItem=runtime.state.inventory.techPointsByItem || {};
      delete runtime.state.inventory.techPointsByItem[itemName];
      if(runtime.state.inventoryTechPointsByItem){
        delete runtime.state.inventoryTechPointsByItem[itemName];
      }
    }

    async function setInventoryHighLevel(itemName,level){
      const nextLevel=Number(level||0);
      if(nextLevel<8 || nextLevel>12) return;
      const values=highLevelOwnedStore(itemName,true);
      const currentLevel=activeHighLevelForItem(itemName);
      if(currentLevel===nextLevel){
        [8,9,10,11,12].forEach(l=>{ delete values[l]; });
        clearInventoryTechPointsForItem(itemName);
      }else{
        if(inventoryHasLevelsOneToSeven(itemName) && !highLevelClearPromptDismissed()){
          const promptResult=await showHighLevelInventoryClearPrompt();
          if(promptResult && promptResult.doNotShowAgain){
            ensureDismissedMessages().highLevelInventoryClear=true;
          }
          if(promptResult && promptResult.choice==="clear"){
            clearInventoryLevelsOneToSeven(itemName);
          }
        }
        [8,9,10,11,12].forEach(l=>{
          if(l===nextLevel) values[l]=1;
          else delete values[l];
        });
      }
      if(runtime.state.inventoryHighLevelByItem && Object.prototype.hasOwnProperty.call(runtime.state.inventoryHighLevelByItem,itemName)){
        delete runtime.state.inventoryHighLevelByItem[itemName];
      }
      runtime.save();
      runtime.renderAll();
    }

    function setInventoryTechPoints(itemName,value){
      const nextValue=Math.max(0,Math.floor(Number(value||0)));
      if(itemName===MANUAL_HIGH_LEVEL_KEY){
        runtime.state.manualTechPoints=nextValue;
      }else{
        runtime.state.inventoryTechPointsByItem=runtime.state.inventoryTechPointsByItem || {};
        runtime.state.inventoryTechPointsByItem[itemName]=nextValue;
      }
      runtime.save();

      const selected=activeHighLevelForItem(itemName);
      const required=runtime.requiredTechPointsForLevel(selected);
      const left=Math.max(required-nextValue,0);
      const percent=required>0 ? Math.min(100,Math.floor((nextValue/required)*100)) : (selected===12 ? 100 : 0);
      const format=amount=>typeof runtime.roundNice==='function' ? runtime.roundNice(amount) : String(amount);
      const updateText=(attr,text)=>{
        runtime.queryAllRoot('['+attr+']').forEach(el=>{
          if(el.getAttribute(attr)===itemName) el.textContent=text;
        });
      };
      updateText('data-tech-required-for', required ? format(required) : '—');
      updateText('data-tech-left-for', required ? format(left) : '—');
      updateText('data-tech-progress-percent-for', String(percent)+'%');
      runtime.queryAllRoot('[data-tech-progress-fill-for]').forEach(el=>{
        if(el.getAttribute('data-tech-progress-fill-for')===itemName) el.style.width=String(percent)+'%';
      });
      runtime.queryAllRoot('[data-tech-points-input-for]').forEach(el=>{
        if(el.getAttribute('data-tech-points-input-for')===itemName) el.value=nextValue || '';
      });
    }

    function openTechPointsModal(itemName,initialMode){
      const selected=activeHighLevelForItem(itemName);
      const required=runtime.requiredTechPointsForLevel(selected);
      if(!required) return;
      const format=amount=>typeof runtime.roundNice==='function' ? runtime.roundNice(amount) : String(amount);
      // Manual mode reads/writes its tech points from the manual slice; real items use the map.
      const techPointsForKey=name=> name===MANUAL_HIGH_LEVEL_KEY
        ? Math.max(0,Math.floor(Number(runtime.state.manualTechPoints||0)))
        : Number((runtime.state.inventoryTechPointsByItem || {})[name] || 0);
      const current=techPointsForKey(itemName);
      const currentPercent=required>0 ? Math.min(100,Math.max(0,Math.round((current/required)*100))) : 0;
      const host=runtime.ensureModalHost();
      let mode=initialMode==="percent" ? "percent" : "points";
      let activeItem=itemName;

      const pointsFromPercent=value=>{
        const pct=Math.min(100,Math.max(0,Number(value||0)));
        return Math.round(requiredTechPointsForModal(activeItem)*(pct/100));
      };
      const requiredTechPointsForModal=name=>{
        const level=activeHighLevelForItem(name);
        return (level>=8 && level<=11) ? Math.pow(3,level)-Math.pow(3,level-1) : 0;
      };
      const currentPointsFor=name=>techPointsForKey(name);
      const currentPercentFor=name=>{
        const req=requiredTechPointsForModal(name);
        if(!req) return 0;
        return Math.min(100,Math.max(0,Math.round((currentPointsFor(name)/req)*100)));
      };
      const render=()=>{
        const activeLevel=activeHighLevelForItem(activeItem);
        const activeName=activeItem===MANUAL_HIGH_LEVEL_KEY ? "Manual" : activeItem;
        const activeRequired=requiredTechPointsForModal(activeItem);
        const activePoints=currentPointsFor(activeItem);
        const activePercent=currentPercentFor(activeItem);
        host.className="modal2";
        host.innerHTML=`
          <div class="modal2__scrim" data-modal-scrim></div>
          <div class="modal2__panel modal2__panel--md" role="dialog" aria-modal="true" aria-labelledby="appModalTitle">
            <div class="modal2__title" id="appModalTitle">Enter Tech Points</div>
            <div class="modal2__subtitle">${activeName} L${activeLevel} research progress.</div>
            <div class="modal2__content stack2 stack2--column stack2--gap-2">
              <div class="tabs2 tabs2--sm tabs2--neutral" style="--tabs-cols:2" role="tablist" aria-label="Tech Points input mode">
                <button type="button" class="tabs2__tab ${mode==="points" ? "tabs2__tab--active" : ""}" data-tech-mode="points">Tech Points</button>
                <button type="button" class="tabs2__tab ${mode==="percent" ? "tabs2__tab--active" : ""}" data-tech-mode="percent">Tech %</button>
              </div>
              <div class="stack2 stack2--row stack2--gap-4 stack2--fill">
                <span class="value-box2-unit value-box2-unit--above">
                  <span class="value-box2__label value-box2__label--above">${mode==="percent" ? "Tech %" : "Tech Points"}</span>
                  <div class="value-box2 value-box2--md value-box2--manual value-box2--stepper">
                    <button type="button" class="button2 button2--md button2--step-ghost" data-tech-step="-1" aria-label="Decrease">&minus;</button>
                    <span class="value-box2__content">${mode==="percent"
                      ? `<input class="value-box2__input" id="techPercentModalInput" type="number" min="0" max="100" step="1" inputmode="decimal" value="${activePercent || ""}" placeholder="0" />`
                      : `<input class="value-box2__input" id="techPointsModalInput" type="number" min="0" step="1" inputmode="numeric" value="${activePoints || ""}" placeholder="0" />`}</span>
                    <button type="button" class="button2 button2--md button2--step-ghost" data-tech-step="1" aria-label="Increase">+</button>
                  </div>
                </span>
                <span class="value-box2-unit value-box2-unit--above">
                  <span class="value-box2__label value-box2__label--above">${mode==="percent" ? "Calculated" : "Required"}</span>
                  <output class="value-box2 value-box2--md value-box2--derived value-box2--readonly"><span class="value-box2__value">${mode==="percent"
                    ? `<span id="techPercentModalPreview">${format(Math.round(activeRequired*(activePercent/100)))}</span>`
                    : format(activeRequired)}</span></output>
                </span>
              </div>
              <div class="modal2__actions modal2__actions--input">
                <button type="button" class="button2 button2--sm button2--ghost" data-modal-cancel>Cancel</button>
                <button type="button" class="button2 button2--sm button2--primary" data-modal-apply>Apply</button>
              </div>
            </div>
          </div>
        `;
        const close=()=>runtime.closeAppModal();
        host.querySelectorAll('[data-modal-cancel]').forEach(el=>el.addEventListener('click',close,{once:true}));
        host.querySelectorAll('[data-tech-mode]').forEach(el=>el.addEventListener('click',()=>{
          mode=el.getAttribute('data-tech-mode')==="percent" ? "percent" : "points";
          render();
        }));
        const stepInput=()=>host.querySelector(mode==="percent" ? '#techPercentModalInput' : '#techPointsModalInput');
        host.querySelectorAll('[data-tech-step]').forEach(el=>el.addEventListener('click',()=>{
          const input=stepInput();
          if(!input) return;
          const dir=Number(el.getAttribute('data-tech-step'))||0;
          // Tech Points targets run into the thousands, so its +/- jumps by 100; Tech % steps by 1.
          const delta=dir*(mode==="percent" ? 1 : 100);
          const max=mode==="percent" ? 100 : Infinity;
          const next=Math.max(0,Math.min(max,Math.floor(Number(input.value||0))+delta));
          input.value=String(next);
          input.dispatchEvent(new Event('input',{bubbles:true}));
          // No focus() here — stepping must stay keyboard-free on mobile.
        }));
        const percentInput=host.querySelector('#techPercentModalInput');
        const preview=host.querySelector('#techPercentModalPreview');
        if(percentInput && preview){
          percentInput.addEventListener('input',()=>{
            const req=requiredTechPointsForModal(activeItem);
            const pct=Math.min(100,Math.max(0,Number(percentInput.value||0)));
            preview.textContent=format(Math.round(req*(pct/100)));
          });
        }
        const apply=host.querySelector('[data-modal-apply]');
        if(apply) apply.addEventListener('click',()=>{
          let nextPoints=0;
          if(mode==="percent"){
            const percentEl=host.querySelector('#techPercentModalInput');
            const req=requiredTechPointsForModal(activeItem);
            const pct=Math.min(100,Math.max(0,Number(percentEl ? percentEl.value : 0)));
            nextPoints=Math.round(req*(pct/100));
          }else{
            const pointsEl=host.querySelector('#techPointsModalInput');
            nextPoints=Math.max(0,Math.floor(Number(pointsEl ? pointsEl.value : 0)));
          }
          runtime.closeAppModal();
          setInventoryTechPoints(activeItem,nextPoints);
          runtime.renderAll();
        },{once:true});
        // No auto-focus: the keyboard must not pop up with the modal. Tapping the
        // field focuses it and lets the OS scroll it into view.
      };
      render();
    }

    function toggleBreakdownSource(button){
      const card=button ? button.closest("[data-large-dropdown]") : null;
      if(card) card.classList.toggle("card2--open");
    }


    function setBreakdownInventoryFilter(next){
      runtime.state.breakdownInventoryFilter=next;
      runtime.save();
      if(typeof runtime.renderBreakdownEstimatedInventory==="function") runtime.renderBreakdownEstimatedInventory();
      if(typeof runtime.renderItemPlanSummary==="function") runtime.renderItemPlanSummary();
    }

    function setInventoryAdvancedMode(next){
      runtime.state.inventoryAdvancedMode=next==="summary" ? "summary" : "breakdown";
      runtime.save();
      runtime.updateInventoryAdvancedTabs();
    }


    let inventoryInputRenderTimer=null;
    function setInventory(itemName,level,value){
      runtime.state.inventory.active[itemName]=runtime.state.inventory.active[itemName]||{};
      runtime.state.inventory.active[itemName][level]=Math.max(0,Number(value||0));
      runtime.save();
      clearTimeout(inventoryInputRenderTimer);
      inventoryInputRenderTimer=setTimeout(()=>{
        if(document.activeElement && document.activeElement.matches && document.activeElement.matches('input[data-input-key^="inventory-"]')) return;
        runtime.renderAll();
      },350);
    }

    function adjustInventory(itemName,level,delta){
      const lvl=Number(level||0);
      const step=Number(delta||0);
      runtime.state.inventory.active[itemName]=runtime.state.inventory.active[itemName]||{};
      const current=Number(runtime.state.inventory.active[itemName][lvl]||0);
      const next=Math.max(0,Math.floor(current+step));
      runtime.state.inventory.active[itemName][lvl]=next;
      runtime.save();
      runtime.renderAll();
    }

    async function resetCurrentPlan(){
      const ok=await runtime.showConfirmModal({
        title:"Reset Plan for This Item?",
        message:"This clears your current plan and guaranteed selections.",
        confirmLabel:"Reset Plan",
        cancelLabel:"Cancel"
      });
      if(!ok) return;
      if(runtime.mode==="specific"){
        runtime.state.plans[runtime.selectedItemName()]={};
        runtime.state.guaranteed[runtime.selectedItemName()]={};
      }else{
        runtime.state.manualPlan={};
        runtime.state.manualGuaranteed={};
      }
      runtime.save();
      runtime.renderAll();
    }

    async function resetAllPlans(){
      const ok=await runtime.showConfirmModal({
        title:"Reset Plans for All Items?",
        message:"This clears every item's plan and guaranteed selections.",
        confirmLabel:"Reset All Plans",
        cancelLabel:"Cancel"
      });
      if(!ok) return;
      ravenItems.forEach(item=>{
        runtime.state.plans[item.name]={};
        runtime.state.guaranteed[item.name]={};
      });
      runtime.state.manualPlan={};
      runtime.state.manualGuaranteed={};
      runtime.save();
      runtime.renderAll();
    }

    async function resetInventory(){
      const shouldReset=await runtime.showConfirmModal({
        title:"Reset Active Inventory?",
        message:"This clears all current Raven inventory values and cannot be undone.",
        confirmLabel:"Reset Active Inventory",
        cancelLabel:"Cancel"
      });
      if(!shouldReset) return;
      ravenItems.forEach(item=>runtime.state.inventory.active[item.name]={});
      runtime.state.manualOwned={};
      runtime.save();
      runtime.renderAll();
    }

    function toggleChestsUsedVisibility(){
      const box=runtime.byId("chestsUsedSummaryBlocks");
      const toggle=runtime.byId("hideChestsUsedToggle");
      if(box && toggle) box.classList.toggle("hidden", toggle.checked);
    }

    function toggleNontargetSideBreakdown(prefix){
      const pre=prefix||"";
      const panel=runtime.byId(pre+"nontargetSideBreakdown");
      const input=runtime.byId(pre+"nontargetBreakdownToggle");
      if(!panel) return;
      // Now a toggle2--text checkbox: drive the panel from its checked state
      // (the pill highlight is handled by CSS :checked). Fall back to a plain
      // toggle if the control isn't a checkbox.
      const isOpen=input && input.type==="checkbox" ? input.checked : panel.classList.toggle("open");
      panel.classList.toggle("open",isOpen);
      panel.hidden=!isOpen;
    }

  return {
    setInventoryArchiveMode,
    setInventoryArchiveFilter,
    toggleInventoryArchiveSnapshot,
    saveCurrentInventorySnapshot,
    loadInventorySnapshot,
    deleteInventorySnapshot,
    setInventoryInputFilter,
    setUpgradedOwnedFilter,
    setUpgradedOwnedViewMode,
    setHideUnacquiredInventory,
    setInventoryEquippedOnly,
    setInventoryLevelRange,
    toggleInventoryLevelRange,
    setInventoryHighLevel,
    resetDoNotShowAgainMessages,
    setInventoryTechPoints,
    openTechPointsModal,
    toggleBreakdownSource,
    setBreakdownInventoryFilter,
    setInventoryAdvancedMode,
    setInventory,
    adjustInventory,
    resetCurrentPlan,
    resetAllPlans,
    resetInventory,
    toggleNontargetSideBreakdown
  };
}
