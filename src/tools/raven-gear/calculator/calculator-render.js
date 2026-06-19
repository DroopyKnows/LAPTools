// Calculator rendering and result-table helpers.
// External helpers/data/state are read from runtime at call time; internal helpers call lexically.
// Note: resultsSnapshotPillEntry's `pillMode` param is named to avoid shadowing the runtime `mode`.

import { MAX_ITEM_LEVEL, allItemLevels, chestDefaultLevels, chestLevels, guaranteedDefaultLevels, topUpBundleDefinitions } from "../metadata/item-metadata.js";
import { renderPill2 } from "../ui/pill/pill.js";
import { uiLevelTone } from "../shared/ui/ui-helpers.js";

export function createCalculatorRenderModule(runtime){
    // ── Environment adapter ──
    // Everything the Results / Non-target compute + views read from the page's "current
    // selection" lives behind this `env`, so the same code can drive a second instance
    // (What If) via a different env. Pure drop-rate math stays on runtime (env-independent).
    const calculatorEnv = {
      prefix: "",
      byId: id => runtime.byId(id),
      probability: () => runtime.probability(),
      targetLevel: () => Number(runtime.byId("targetLevel").value || 7),
      ownedObject: () => runtime.currentOwnedObject(),
      planObject: () => runtime.currentPlanObject(),
      guaranteedObject: () => runtime.currentGuaranteedObject(),
      totalChoiceObject: () => runtime.totalChoiceObject(),
      bundleRandomTotals: () => runtime.bundleRandomTotals(),
      // Chest-input write/render surface (the chest card subsystem):
      bundleObject: () => runtime.currentTopUpBundleObject(),
      bundleTotals: () => runtime.bundleTotals(),
      showHighRandom: () => !!(runtime.byId("showHighRandom") && runtime.byId("showHighRandom").checked),
      // Manual mode is a bankless sandbox (like What If): no choice-chest bank, and
      // top-up CHOICE chests auto-apply. Derive bank from mode so every env.bank
      // consumer routes manual through the same bank-off path as What If's bank:false.
      get bank(){ return runtime.mode !== "manual"; },
      actions: { setGroupValue:"setGroupValue", adjustGroup:"adjustGroup", setBundleQty:"setBundleQty", adjustBundleQty:"adjustBundleQty" },
      showHighChests: () => !!(runtime.byId("showHighChestLevels") && runtime.byId("showHighChestLevels").checked),
      side: () => runtime.selectedSide(),
      subjectLabel: () => runtime.mode === "specific" ? runtime.selectedItemName() : "target",
      isManual: () => runtime.mode === "manual",
      itemLabel: () => runtime.selectedItemName(),
      showMetSnapshot: () => runtime.mode === "specific",
      projectedOwned: () => (typeof runtime.projectedOwnedForInventoryItem === "function")
        ? runtime.projectedOwnedForInventoryItem(runtime.selectedItemName())
        : runtime.calculateOwnedPlusPlanPlusChoice(runtime.currentOwnedObject(), runtime.calculateAdditionalOwnedFromPlanAndChoice(runtime.currentPlanObject(), runtime.currentGuaranteedObject(), runtime.probability()), {}),
      chanceIds: ["chanceValue", "chanceValueManual"]
    };

    // base pill (default mode, md, level tone, label above) for imperative tables whose
    // values are pre-formatted display strings ("L:/R:" composites, decimals) that the
    // shared renderLevelPillGrid would numeric-filter/floor away.
    function levelPillUnit(level,value){
      const toneClass=uiLevelTone(level);
      return `<span class="pill2-unit pill2-unit--above ${toneClass}"><span class="pill2__level pill2__level--above">L${level}</span><span class="pill2 pill2--md ${toneClass}"><span class="pill2__qty">${value}</span></span></span>`;
    }

    // fixed-2 engine grid, min lg, gap md, fill, bottom-up, maxItemWidth 50% — shared by
    // the manual-mode stepper list and the specific-mode Lvl 7-1 grid.
    function ownedStepperGridMarkup(cells){
      return `<div class="grid2 grid2--min-lg grid2--gap-md grid2--fill grid2--align-center" data-grid2 data-grid2-cols="2" data-grid2-direction="bottom-up" data-grid2-max-width="50%">${cells}</div>`;
    }

    function buildStepper(containerId,group,levels){
      const wrap=runtime.byId(containerId);
      const obj=runtime.getGroupObject(group);

      const cells=levels.map(level=>`
        <span class="value-box2-unit value-box2-unit--above">
          <span class="value-box2__label value-box2__label--above">Level ${level}</span>
          <div class="value-box2 value-box2--sm value-box2--manual value-box2--stepper">
            <button type="button" class="button2 button2--sm button2--step-ghost" aria-label="Decrease Level ${level}" data-action="adjustGroup" data-action-event="click" data-arg0="${group}" data-arg1="${level}" data-arg2="-1">&minus;</button>
            <span class="value-box2__content"><input class="value-box2__input" data-input-key="${group}-${level}" type="number" min="0" step="1" value="${obj[level]||""}" placeholder="0" data-action="setGroupValue" data-action-event="input" data-arg0="${group}" data-arg1="${level}" data-source2="value" /></span>
            <button type="button" class="button2 button2--sm button2--step-ghost" aria-label="Increase Level ${level}" data-action="adjustGroup" data-action-event="click" data-arg0="${group}" data-arg1="${level}" data-arg2="1">+</button>
          </div>
        </span>
      `).join("");
      wrap.innerHTML=ownedStepperGridMarkup(cells);

      renderBundleAppliedSummary("chestsBundleAppliedSummary");
      renderChoiceBankRedeem("chestsChoiceBankRedeem");
    }

    function renderQuantityStepperInput(options={}){
      const label=String(options.label || "Quantity");
      const safeLabel=runtime.uiEscapeAttr(label);
      const className=["value-box2","value-box2--sm","value-box2--manual","value-box2--stepper", options.className || ""].filter(Boolean).join(" ");
      const value=options.value==null ? "" : String(options.value);
      const safeValue=runtime.uiEscapeAttr(value);
      const inputAttrs=options.inputAttrs || "";
      const decreaseAttrs=options.decreaseAttrs || "";
      const increaseAttrs=options.increaseAttrs || "";
      return `
        <span class="value-box2-unit" aria-label="${safeLabel}">
          <div class="${className}">
            <button type="button" class="button2 button2--sm button2--step-ghost" aria-label="Decrease ${safeLabel}" ${decreaseAttrs}>&minus;</button>
            <span class="value-box2__content"><input class="value-box2__input" type="text" inputmode="numeric" pattern="[0-9]*" value="${safeValue}" placeholder="0" ${inputAttrs} /></span>
            <button type="button" class="button2 button2--sm button2--step-ghost" aria-label="Increase ${safeLabel}" ${increaseAttrs}>+</button>
          </div>
        </span>
      `;
    }

    function renderBundleQuantityField(key,title,qty,env=calculatorEnv){
      const safeKey=runtime.uiEscapeAttr(key);
      return renderQuantityStepperInput({
        label:`${title} Quantity`,
        value:qty || "",
        inputAttrs:`data-input-key="${env.prefix}bundle-${safeKey}" data-action="${env.actions.setBundleQty}" data-action-event="input" data-arg0="${safeKey}" data-source1="value"`,
        decreaseAttrs:`data-action="${env.actions.adjustBundleQty}" data-action-event="click" data-arg0="${safeKey}" data-arg1="-1" data-arg1-type="number"`,
        increaseAttrs:`data-action="${env.actions.adjustBundleQty}" data-action-event="click" data-arg0="${safeKey}" data-arg1="1" data-arg1-type="number"`
      });
    }

    function renderBundleCard(key,options={},env=calculatorEnv){
      const def=options.definition || topUpBundleDefinitions[key];
      if(!def) return "";
      const qty=Math.floor(Number((options.bundleObject || env.bundleObject())[key]||0));
      const title=String(options.title || [def.section,def.title].filter(Boolean).join(": ") || key);
      // bundle title/quantity sit above the contents with label-like spacing;
      // pills remain on an empty card2 background.
      const wrapClass=["stack2","stack2--column","stack2--gap-0.5", options.className || ""].filter(Boolean).join(" ");
      const attrs=options.attrs ? ` ${options.attrs}` : "";
      return `
        <div class="${wrapClass}"${attrs}>
          <div class="stack2 stack2--row stack2--gap-2 stack2--align-end stack2--fill-hug">
            <div class="text2 text2--title">${runtime.uiEscapeAttr(title)}</div>
            <div style="width:130px">${renderBundleQuantityField(key,title,qty,env)}</div>
          </div>
          <div class="card2 card2--white card2--sm">
            ${makeBundlePills(def.random,"random",def.choice)}
          </div>
        </div>
      `;
    }

    function renderTopUpBundles(env=calculatorEnv){
      if(env.bank!==false) runtime.ensureBankObjects();
      const wrap=runtime.byId(env.prefix+"topUpBundlesContent");
      if(!wrap) return;
      const bankSlot=env.bank!==false ? `<div id="${env.prefix}topUpChoiceBankRedeem"></div>` : "";

      wrap.innerHTML=`
        <div class="stack2 stack2--column stack2--gap-0.5">
          <div class="text2 text2--subtle text2--align-center">Quickly add chest quantities based on popular top up options.</div>
          <div class="stack2 stack2--column stack2--gap-5">
            <div id="${env.prefix}topUpBundleAppliedSummary"></div>
            ${bankSlot}

            ${renderBundleCard("daily1",{title:"Daily Must-Buy: Tier 1"},env)}
            ${renderBundleCard("daily2",{title:"Daily Must-Buy: Tier 2"},env)}
            ${renderBundleCard("weekly",{title:"Weekly Special"},env)}
          </div>
        </div>
      `;

      renderBundleAppliedSummary(env.prefix+"topUpBundleAppliedSummary",env);
      if(env.bank!==false) renderChoiceBankRedeem(env.prefix+"topUpChoiceBankRedeem");
      renderChestInputCollapsedSnapshot(env);
    }

    function buildCombinedChestInputs(containerId,levels,env=calculatorEnv){
      const wrap=runtime.byId(containerId);
      if(!wrap) return;
      wrap.innerHTML="";

      const plan=env.planObject();
      const guaranteed=env.guaranteedObject();

      // labeled-rows grid (label col 30px, NO data-grid2), each level row on an empty
      // card2 background. Stepper buttons: adjustGroup wiring matches buildStepper;
      // adjustGroup coerces via Math.floor(Number(amount||0)).
      levels.forEach(level=>{
        const row=document.createElement("div");
        row.className="card2 card2--white card2--sm";
        row.innerHTML=`
          <div class="grid2 grid2--labeled-rows" style="--grid2-label-col:30px">
            <div class="grid2__row-label"><span>Lv. ${level}</span></div>
            <div class="grid2__row-body">
              <div class="stack2 stack2--row stack2--gap-2 stack2--fill" style="width:100%">
                <span class="value-box2-unit value-box2-unit--above">
                  <span class="value-box2__label value-box2__label--above">Random</span>
                  <div class="value-box2 value-box2--sm value-box2--manual value-box2--stepper">
                    <button type="button" class="button2 button2--sm button2--step-ghost" aria-label="Decrease Random Lvl ${level}" data-action="${env.actions.adjustGroup}" data-action-event="click" data-arg0="plan" data-arg1="${level}" data-arg2="-1">&minus;</button>
                    <span class="value-box2__content"><input class="value-box2__input" data-input-key="${env.prefix}plan-${level}" type="number" min="0" step="1" value="${plan[level]||""}" placeholder="0" data-action="${env.actions.setGroupValue}" data-action-event="input" data-arg0="plan" data-arg1="${level}" data-source2="value" /></span>
                    <button type="button" class="button2 button2--sm button2--step-ghost" aria-label="Increase Random Lvl ${level}" data-action="${env.actions.adjustGroup}" data-action-event="click" data-arg0="plan" data-arg1="${level}" data-arg2="1">+</button>
                  </div>
                </span>
                <span class="value-box2-unit value-box2-unit--above">
                  <span class="value-box2__label value-box2__label--above">Choice</span>
                  <div class="value-box2 value-box2--sm value-box2--manual value-box2--stepper">
                    <button type="button" class="button2 button2--sm button2--step-ghost" aria-label="Decrease Choice Lvl ${level}" data-action="${env.actions.adjustGroup}" data-action-event="click" data-arg0="guaranteed" data-arg1="${level}" data-arg2="-1">&minus;</button>
                    <span class="value-box2__content"><input class="value-box2__input" data-input-key="${env.prefix}guaranteed-${level}" type="number" min="0" step="1" value="${guaranteed[level]||""}" placeholder="0" data-action="${env.actions.setGroupValue}" data-action-event="input" data-arg0="guaranteed" data-arg1="${level}" data-source2="value" /></span>
                    <button type="button" class="button2 button2--sm button2--step-ghost" aria-label="Increase Choice Lvl ${level}" data-action="${env.actions.adjustGroup}" data-action-event="click" data-arg0="guaranteed" data-arg1="${level}" data-arg2="1">+</button>
                  </div>
                </span>
              </div>
            </div>
          </div>
        `;
        wrap.appendChild(row);
      });

      renderBundleAppliedSummary(env.prefix+"chestsBundleAppliedSummary",env);
      if(env.bank!==false) renderChoiceBankRedeem(env.prefix+"chestsChoiceBankRedeem");
    }

    function ownedTargetQuantityCell(itemName,level,values){
      const safeName=runtime.uiEscapeAttr(itemName);
      const value=values[level]||"";
      return `
        <span class="value-box2-unit value-box2-unit--above">
          <span class="value-box2__label value-box2__label--above">Level ${level}</span>
          <div class="value-box2 value-box2--sm value-box2--manual value-box2--stepper">
            <button type="button" class="button2 button2--sm button2--step-ghost" aria-label="Decrease Level ${level}" data-action="adjustGroup" data-action-event="click" data-arg0="owned" data-arg1="${level}" data-arg2="-1">&minus;</button>
            <span class="value-box2__content"><input class="value-box2__input" data-input-key="owned-${safeName}-${level}" type="number" min="0" step="1" inputmode="numeric" value="${value}" placeholder="0" data-action="setGroupValue" data-action-event="input" data-arg0="owned" data-arg1="${level}" data-source2="value" /></span>
            <button type="button" class="button2 button2--sm button2--step-ghost" aria-label="Increase Level ${level}" data-action="adjustGroup" data-action-event="click" data-arg0="owned" data-arg1="${level}" data-arg2="1">+</button>
          </div>
        </span>
      `;
    }

    function renderOwnedLowerLevelRows(itemName,values,levels){
      const shown=(levels && levels.length ? levels : [7,6,5,4,3,2,1]).slice().sort((a,b)=>b-a);
      return ownedStepperGridMarkup(shown.map(level=>ownedTargetQuantityCell(itemName,level,values)).join(""));
    }

    function renderCollapsedSnapshotEmpty(message){
      return `<div class="notice2 notice2--empty">${message}</div>`;
    }

    // Snapshots fill two slots — the collapsed header-extra and the open in-content
    // card (governed by the card.css `snapshots` setting). Usually identical html;
    // pass a distinct openHtml when the two views differ (Results drops the met notice).
    function writeSnapshotSlots(prefix,collapsedId,openId,collapsedHtml,openHtml){
      const collapsed=runtime.byId(prefix+collapsedId);
      if(collapsed) collapsed.innerHTML=collapsedHtml;
      const open=runtime.byId(prefix+openId);
      if(open) open.innerHTML=openHtml===undefined?collapsedHtml:openHtml;
    }

    function renderOwnedTargetCollapsedSnapshot(){
      const collapsed=runtime.byId("ownedCollapsedSnapshot");
      const open=runtime.byId("ownedOpenSnapshot");
      if(!collapsed && !open) return;
      // no shrink-wrapping wrapper — the engine grid must measure the full slot width.
      let html="";
      if(runtime.mode==="specific"){
        const itemName=runtime.selectedItemName();
        const values=(runtime.state.inventory && runtime.state.inventory.active && runtime.state.inventory.active[itemName]) || {};
        const boxes=typeof runtime.renderCompactLevelBoxes==="function"
          ? runtime.renderCompactLevelBoxes(values,allItemLevels,{itemName})
          : "";
        html=boxes || renderCollapsedSnapshotEmpty("No current inventory entered.");
      }
      if(collapsed) collapsed.innerHTML=html;
      // The open slot is a padded card; hide it when empty (manual mode) so there's
      // no empty box atop the owned content.
      if(open){ open.innerHTML=html; open.hidden=!html; }
    }

    function chestSnapshotEntries(env=calculatorEnv){
      const entries=[];
      const pushEntries=(obj,type)=>{
        Object.keys(obj||{}).forEach(levelKey=>{
          const level=Number(levelKey);
          const value=Math.floor(Number(obj[levelKey]||0));
          if(value>0) entries.push({level,value,type});
        });
      };
      pushEntries(env.planObject(),"manual-random");
      pushEntries(env.guaranteedObject(),"manual-choice");
      const totals=env.bundleTotals ? env.bundleTotals() : {random:{},choice:{}};
      pushEntries(totals.random || {},"tu-random");
      // bank off (What If): top-up choice is auto-applied, so show it directly.
      const choiceSource = env.bank===false ? (totals.choice || {}) : (typeof runtime.currentBankRedeemedAsChoiceSource==="function" ? runtime.currentBankRedeemedAsChoiceSource() : {});
      pushEntries(choiceSource || {},"tu-choice");
      entries.sort((a,b)=>{
        if(b.level!==a.level) return b.level-a.level;
        const rank={"tu-random":0,"tu-choice":1,"manual-random":2,"manual-choice":3};
        return (rank[a.type]||0)-(rank[b.type]||0);
      });
      return entries;
    }

    function renderChestInputCollapsedSnapshot(env=calculatorEnv){
      const entries=chestSnapshotEntries(env);
      // C4: engine grid, minPerRow 3; tones resolve from the entry source
      // metadata (manual-random / manual-choice / tu-random / tu-choice).
      const html=entries.length
        ? runtime.renderCompactPillRow(entries.map(entry=>({
            level:entry.level,
            value:entry.value,
            type:entry.type,
            title:entry.type.replace("-"," ")
          })),{grid2Engine:true,minPerRow:3})
        : renderCollapsedSnapshotEmpty("No chest inputs entered yet.");
      writeSnapshotSlots(env.prefix,"chestCollapsedSnapshot","chestOpenSnapshot",html);
    }

    function resultSnapshotRemainingNumber(value){
      if(value === "-" || value === "" || value === null || value === undefined) return 0;
      return Math.max(0,Math.ceil(Number(value||0)));
    }

    function formatSignedRequirementChange(change){
      const n=Number(change||0);
      if(!isFinite(n) || Math.abs(n)<0.00001) return "-";
      const absText=runtime.roundNice(Math.abs(n));
      if(absText==="-") return "-";
      return n<0 ? `-${absText}` : `+${absText}`;
    }

    function resultsSnapshotEntry(levels,baselineValues,values,level){
      const index=(levels||[]).indexOf(level);
      const baseline=resultSnapshotRemainingNumber((baselineValues||[])[index]);
      const remaining=resultSnapshotRemainingNumber((values||[])[index]);
      const change=remaining-baseline;
      const changeDisplay=formatSignedRequirementChange(change);
      const changeClass=change<0 ? "negative" : "neutral";
      return {
        level,
        baseline,
        remaining,
        change,
        remainingDisplay:remaining>0 ? String(runtime.roundNice(remaining)) : "-",
        changeDisplay,
        changeClass
      };
    }

    function resultsSnapshotEntries(levels,baselineValues,values){
      const sourceLevels=(levels||[]).filter(level=>level>=1 && level<=7).sort((a,b)=>b-a);
      const entries=sourceLevels.map(level=>resultsSnapshotEntry(levels,baselineValues,values,level));
      const relevant=entries.filter(entry=>entry.baseline>0 || entry.remaining>0 || entry.change!==0);
      return relevant.slice(0,3);
    }

    function resultsSnapshotPillEntry(entry,pillMode){
      const isChange=pillMode==="change";
      const value=isChange ? entry.changeDisplay : entry.remainingDisplay;
      const type=isChange ? `requirement-change ${entry.changeClass}` : "required";
      return {level:entry.level,value,type};
    }

    function resultsHaveRemaining(values){
      return (values||[]).some(value=>value !== "-" && value !== "" && value !== null && value !== undefined);
    }

    function renderResultsChangeGroup(entries){
      if(!entries.length || !entries.some(entry=>entry.change!==0)){
        return `<div class="notice2 notice2--empty">No Change</div>`;
      }
      // C5: fixed-3, semantic tones; the legacy rowClass is ignored by the
      // shared renderer and dropped.
      return runtime.renderCompactPillRow(entries.map(entry=>resultsSnapshotPillEntry(entry,"change")),{cols:3});
    }

    function renderResultsSnapshotGroup(bodyHtml,caption){
      return `
        <div class="stack2 stack2--column stack2--gap-0 stack2--align-center results-snapshot-group">
          <div class="stack2 stack2--row stack2--justify-center results-snapshot-pill-row">${bodyHtml}</div>
          <div class="grid2__caption">${caption}</div>
        </div>
      `;
    }

    function renderResultsCollapsedSnapshot(levels,values,baselineValues,env=calculatorEnv){
      const entries=resultsSnapshotEntries(levels,baselineValues,values);
      const complete=!resultsHaveRemaining(values);
      const changeMarkup=renderResultsChangeGroup(entries);
      // C5/C6: two snapshot groups sit side-by-side in a stack2 row; each
      // group centers its pills, including the single "No Change" pill.
      let collapsedHtml,openHtml;
      if(complete){
        const changeGroup=renderResultsSnapshotGroup(changeMarkup,"Item Requirement Change");
        // Collapsed keeps the "met" notice; the open snapshot drops it — the
        // per-subsection met states already convey it in the expanded view.
        collapsedHtml=`
          <div class="stack2 stack2--column stack2--gap-2 stack2--align-center">
            <div class="notice2 notice2--positive">Congratulations! Desired level met!</div>
            ${changeGroup}
          </div>
        `;
        openHtml=`
          <div class="stack2 stack2--column stack2--gap-2 stack2--align-center">
            ${changeGroup}
          </div>
        `;
      }else{
        const requiredPills=runtime.renderCompactPillRow(entries.map(entry=>resultsSnapshotPillEntry(entry,"required")),{cols:3});
        collapsedHtml=`
          <div class="stack2 stack2--row stack2--gap-6 stack2--justify-center stack2--align-start stack2--fill results-snapshot-stack">
            ${renderResultsSnapshotGroup(changeMarkup,"Item Requirement Change")}
            ${renderResultsSnapshotGroup(requiredPills,"Items Still Required")}
          </div>
        `;
        openHtml=collapsedHtml;
      }
      writeSnapshotSlots(env.prefix,"resultsCollapsedSnapshot","resultsOpenSnapshot",collapsedHtml,openHtml);
    }

    function renderAssignedNontargetPills(values){
      const entries=[];
      chestLevels.forEach((level,index)=>{
        const value=(values||[])[index];
        if(value === "-" || value === "" || value === null || value === undefined) return;
        entries.push({level,value});
      });
      return entries.length ? runtime.renderCompactPillRow(entries,{grid2Engine:true,minPerRow:2}) : `<div class="notice2 notice2--empty">-</div>`;
    }

    function renderNontargetAssignedSnapshot(leftValues,rightValues,env=calculatorEnv){
      const html=`
        <div class="stack2 stack2--row stack2--gap-6 stack2--justify-center stack2--align-start stack2--fill">
          <div class="stack2 stack2--column stack2--gap-0 stack2--align-stretch">
            <div>${renderAssignedNontargetPills(leftValues)}</div>
            <div class="grid2__caption">Items Assigned Left</div>
          </div>
          <div class="stack2 stack2--column stack2--gap-0 stack2--align-stretch">
            <div>${renderAssignedNontargetPills(rightValues)}</div>
            <div class="grid2__caption">Items Assigned Right</div>
          </div>
        </div>
      `;
      ["nontargetCollapsedSnapshot","nontargetAssignedSnapshot"].forEach(id=>{
        const el=runtime.byId(env.prefix+id);
        if(el) el.innerHTML=html;
      });
    }

    function updateOwnedTargetViewTabs(view){
      const normalized=Number(view||7)>=12 ? "all" : Number(view||7)>=8 ? "high" : "low";
      [
        ["ownedViewLow","low"],
        ["ownedViewHigh","high"],
        ["ownedViewAll","all"]
      ].forEach(([id,value])=>{
        const el=runtime.byId(id);
        if(!el) return;
        const active=value===normalized;
        el.classList.toggle("active",active);
        el.setAttribute("aria-pressed",active ? "true" : "false");
      });
    }

    function renderOwnedInputs(){
      const wrap=runtime.byId("ownedInputs");
      if(!wrap) return;
      const view=Number(runtime.state.highestGlobalOwned||7);
      const showHigh=view>=8;
      const showAll=view>=12;
      updateOwnedTargetViewTabs(view);
      renderOwnedTargetCollapsedSnapshot();
      if(!showHigh){
        if(runtime.mode!=="specific"){
          const levels=runtime.visibleOwnedLevels();
          buildStepper("ownedInputs","owned",levels);
          return;
        }
        const itemName=runtime.selectedItemName();
        const values=(runtime.state.inventory && runtime.state.inventory.active && runtime.state.inventory.active[itemName]) || {};
        wrap.innerHTML=renderOwnedLowerLevelRows(itemName,values,[7,6,5,4,3,2,1]);
        return;
      }
      if(runtime.mode!=="specific"){
        wrap.innerHTML=runtime.renderEmptyState({title:"",message:"Level 8+ owned target input is only available in Specific Item runtime.mode.",className:"notice2 notice2--empty",compact:true});
        return;
      }
      const itemName=runtime.selectedItemName();
      const values=(runtime.state.inventory && runtime.state.inventory.active && runtime.state.inventory.active[itemName]) || {};
      const lowerHtml=renderOwnedLowerLevelRows(itemName,values,[7,6,5,4,3,2,1]);
      const lowerCardHtml=`
        <section class="card2 card2--white card2--xs card2--collapsible" id="ownedLowerLevelsCard">
          <button class="card2__header card2__header--toggle card2__collapse-toggle stack2 stack2--row stack2--align-center stack2--justify-between" data-action="toggleCard" data-action-event="click" data-arg0="ownedLowerLevelsCard" type="button">
            <span class="card2__title">Show Level 1-7</span>
            <span class="card2__chev">⌄</span>
          </button>
          <div class="card2__content card2__content--after-header">
            ${lowerHtml}
          </div>
        </section>
      `;
      const highLevelHtml=typeof runtime.renderHighLevelInventoryPanel==="function"
        ? runtime.renderHighLevelInventoryPanel(itemName,{extraContentHtml:showAll ? "" : lowerCardHtml})
        : "";
      wrap.innerHTML=showAll ? `
        <div class="owned-target-high-level-panel">
          ${highLevelHtml}
          <div class="owned-target-lower-level-body owned-target-all-levels-body">
            ${lowerHtml}
          </div>
        </div>
      ` : `
        <div class="owned-target-high-level-panel">
          ${highLevelHtml || `<div class="stack2 stack2--column stack2--gap-3">${lowerCardHtml}</div>`}
        </div>
      `;
    }

    function renderPlanInputs(){
      const showHigh=runtime.byId("showHighRandom")?.checked;
      const levels=showHigh ? [7,6,5,4,3,2,1] : [5,4,3,2,1];

      if(runtime.byId("combinedChestInputs")){
        buildCombinedChestInputs("combinedChestInputs",levels);
        renderChestInputCollapsedSnapshot();
        return;
      }

      buildStepper("planInputs","plan",levels);
      renderChestInputCollapsedSnapshot();
    }

    function renderGuaranteedInputs(){
      const showHigh=runtime.byId("showHighRandom")?.checked || runtime.byId("showHighGuaranteed")?.checked;
      const levels=showHigh ? [7,6,5,4,3,2,1] : guaranteedDefaultLevels;

      if(runtime.byId("combinedChestInputs")){
        buildCombinedChestInputs("combinedChestInputs",levels);
        renderChestInputCollapsedSnapshot();
        return;
      }

      buildStepper("guaranteedInputs","guaranteed",levels);
      renderChestInputCollapsedSnapshot();
    }

    function isDisplayedLevelValue(value){
      return value !== "-" && value !== "" && value !== null && value !== undefined;
    }

    // base grid (md, fill, label above) with minPerRow 3, hand-emitted because the
    // values are pre-formatted display strings.
    function levelPillGridMarkup(entries,options={}){
      const minPerRow=options.minPerRow===undefined ? 3 : options.minPerRow;
      const maxItemWidthAttr=options.maxItemWidth ? ` data-grid2-max-width="${options.maxItemWidth}"` : "";
      const minClass=options.minClass || "grid2--min-md";
      return `<div class="grid2 ${minClass} grid2--gap-sm grid2--fill grid2--align-center" data-grid2 data-grid2-direction="bottom-up" data-grid2-min-per-row="${minPerRow}"${maxItemWidthAttr}>${entries.join("")}</div>`;
    }

    function makeLevelValuePillTable(id,levels,values,emptyMessage){
      const filtered=[];
      levels.forEach((level,index)=>{
        const value=values[index];
        if(isDisplayedLevelValue(value)) filtered.push({level,value});
      });

      const grid=runtime.byId(id);
      if(!grid) return;
      grid.className="";

      if(!filtered.length){
        grid.innerHTML=`<div class="notice2 notice2--empty">${emptyMessage || "None."}</div>`;
        return;
      }

      grid.innerHTML=levelPillGridMarkup(filtered.map(entry=>levelPillUnit(entry.level,entry.value)));
    }

    function hasPlanInput(){
      return Object.values(runtime.currentPlanObject()||{}).some(v=>Number(v||0)>0);
    }

    function renderDualDetailCompactPill(entry={}){
      const level=Math.floor(Number(entry.level || 0));
      const value=entry.value == null ? "" : String(entry.value);
      if(level<=0 || value==="" || value==="-") return "";
      return renderPill2({
        level,
        qty:value,
        toneClass:uiLevelTone(level),
        size:"sm"
      });
    }

    function compactLevelPillGridMarkup(entries,options={}){
      const minPerRow=options.minPerRow===undefined ? 2 : options.minPerRow;
      const maxItemWidthAttr=options.maxItemWidth ? ` data-grid2-max-width="${options.maxItemWidth}"` : "";
      const fillClass=options.fill===true ? "grid2--fill" : "grid2--hug";
      const minClass=options.minClass || "grid2--min-sm";
      return `<div class="grid2 ${minClass} grid2--gap-sm ${fillClass} grid2--align-center" data-grid2 data-grid2-direction="bottom-up" data-grid2-min-per-row="${minPerRow}"${maxItemWidthAttr}>${entries.join("")}</div>`;
    }

    function makeDualDetailCompactPillTable(id,levels,values,emptyMessage){
      const filtered=[];
      levels.forEach((level,index)=>{
        const value=values[index];
        if(value !== "-" && value !== "" && value !== null && value !== undefined){
          filtered.push({level,value});
        }
      });

      const grid=runtime.byId(id);
      if(!grid) return;
      grid.className="";

      if(!filtered.length){
        grid.innerHTML=`<div class="notice2 notice2--empty">${emptyMessage}</div>`;
        return;
      }

      if(id.endsWith("sameSideTable") || id.endsWith("oppositeSideTable")){
        grid.innerHTML=runtime.renderCompactPillRow(filtered,{grid2Engine:true,minPerRow:2});
        return;
      }

      grid.innerHTML=compactLevelPillGridMarkup(filtered.map(entry=>renderDualDetailCompactPill(entry)),{minPerRow:2,minClass:"grid2--min-wide"});
    }

    function makeFilteredResultTable(id,levels,values,emptyMessage){
      const filtered=[];
      levels.forEach((level,index)=>{
        const value=values[index];
        if(value !== "-" && value !== "" && value !== null && value !== undefined){
          filtered.push({level,value});
        }
      });

      const grid=runtime.byId(id);
      if(!grid) return;
      grid.className="";

      if(!filtered.length){
        grid.innerHTML=`<div class="notice2 notice2--empty">${emptyMessage}</div>`;
        return;
      }

      grid.innerHTML=runtime.renderCompactPillRow(filtered,{grid2Engine:true,minPerRow:2});
    }

    function updateSideLeftoverLabels(){
      const side = runtime.selectedSide();
      const leftSub = runtime.byId("leftSideLeftoversSub");
      const rightSub = runtime.byId("rightSideLeftoversSub");

      if(leftSub){
        leftSub.textContent = side === "left"
          ? "Split between the other 2 same-side items."
          : "Split between the other 3 opposite-side items.";
      }

      if(rightSub){
        rightSub.textContent = side === "right"
          ? "Split between the other 2 same-side items."
          : "Split between the other 3 opposite-side items.";
      }
    }

    function updateTotalLeftoverItemsText(env=calculatorEnv){
      const el=runtime.byId(env.prefix+"totalLeftoverItemsSub");
      if(!el) return;

      if(env.isManual()){
        el.textContent="Items that were earned from random chests, but weren&rsquo;t duplicates of the manual item in mind.";
      }else{
        el.textContent=`Items that were earned from random chests, but weren&rsquo;t duplicates of the ${env.itemLabel()}.`;
      }
    }

    function makeRemainingItemsChunkedTable(id,levels,values,showAll){
      const wrap=runtime.byId(id);
      if(!wrap) return;

      wrap.className="";

      // one engine grid (minPerRow 3); levels with no remaining value ("-") are
      // filtered like every other results grid.
      const filtered=[];
      levels.forEach((level,index)=>{
        const value=values[index];
        if(isDisplayedLevelValue(value)) filtered.push({level,value});
      });

      if(!filtered.length){
        wrap.innerHTML="";
        return;
      }

      wrap.innerHTML=levelPillGridMarkup(filtered.map(entry=>levelPillUnit(entry.level,entry.value)));
    }

    function makeRemainingItemsResult(id,levels,values,targetLevel,env=calculatorEnv){
      const hasRemaining=values.some(value=>value !== "-" && value !== "" && value !== null && value !== undefined);
      if(hasRemaining){
        makeRemainingItemsChunkedTable(id,levels,values,false);
        return;
      }

      const wrap=runtime.byId(id);
      if(!wrap) return;
      wrap.className="";

      let snapshotHtml="";
      if(env.showMetSnapshot()){
        const snapshotLevels=[targetLevel, targetLevel-1, targetLevel-2].filter(level=>level>=1 && level<=MAX_ITEM_LEVEL);
        const combined=env.projectedOwned() || {};
        const simplified=runtime.simplifyUpByLevel(combined);
        snapshotHtml=levelPillGridMarkup(snapshotLevels.map(level=>levelPillUnit(level,simplified[level]?runtime.roundNice(simplified[level]):"-")));
      }

      wrap.innerHTML=`
        <div class="stack2 stack2--column stack2--gap-0">
          <div class="notice2 notice2--positive">Congratulations! Desired level met!</div>
          <div class="grid2__caption">See new estimated inventory below.</div>
          ${snapshotHtml}
        </div>
      `;
    }

    function makeRemainingChestsResult(id,levels,values){
      const hasRemaining=values.some(value=>value !== "-" && value !== "" && value !== null && value !== undefined);
      if(hasRemaining){
        makeLevelValuePillTable(id,levels,values);
        return;
      }

      const grid=runtime.byId(id);
      if(!grid) return;
      grid.className="";
      grid.innerHTML=`<div class="notice2 notice2--positive">Congratulations! Desired level met!</div>`;
    }

    function setRemainingSectionSubtexts(itemsHasRemaining,chestsHasRemaining,env=calculatorEnv){
      const itemSub=runtime.byId(env.prefix+"remainingItemsSubtext");
      const chestSub=runtime.byId(env.prefix+"remainingChestsSubtext");

      if(itemSub) itemSub.hidden=!itemsHasRemaining;
      if(chestSub) chestSub.hidden=!chestsHasRemaining;
    }

    function estimatedDisplayLevels(obj){
      const set=new Set(chestLevels);
      Object.keys(obj||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        if(level>=1 && level<=MAX_ITEM_LEVEL && Number(obj[levelKey]||0)>0) set.add(level);
      });
      return Array.from(set).sort((a,b)=>b-a);
    }

    function topUpDetailLabel(value){
      const text=String(value || "").trim();
      if(!text) return "";
      return text.replace(/[-_]+/g," ").replace(/\b\w/g,letter=>letter.toUpperCase());
    }

    function renderTopUpCompactDetailPill(entry={}){
      const level=Math.floor(Number(entry.level || 0));
      const value=Math.floor(Number(entry.value || 0));
      if(level<=0 || value<=0) return "";
      const type=String(entry.type || entry.kind || "random").toLowerCase();
      const kind=type==="choice" ? "choice" : "random";
      // C1 / I9 pill: pill2 sm compact, topupSource tone via pill.js, source
      // word as bottom caption. entry.className ("manual-source") marks
      // manual-entered chests in the I9 audit list; everything else here is
      // top-up sourced.
      const origin=String(entry.className || "").split(/\s+/).includes("manual-source") ? "manual" : "topUp";
      const label=topUpDetailLabel(entry.label || entry.typeLabel || kind);
      return renderPill2({source:{origin,kind},level,qty:String(value),caption:label,size:"sm"});
    }

    function makeBundlePills(randomObj,type,choiceObj){
      let entries=[];

      if(choiceObj){
        Object.keys(choiceObj||{}).forEach(levelKey=>{
          const level=Number(levelKey);
          const value=Math.floor(Number(choiceObj[levelKey]||0));
          if(value>0) entries.push({level,value,type:"choice"});
        });
        Object.keys(randomObj||{}).forEach(levelKey=>{
          const level=Number(levelKey);
          const value=Math.floor(Number(randomObj[levelKey]||0));
          if(value>0) entries.push({level,value,type:"random"});
        });

        entries.sort((a,b)=>{
          if(b.level!==a.level) return b.level-a.level;
          if(a.type===b.type) return 0;
          return a.type==="choice" ? -1 : 1;
        });
      }else{
        Object.keys(randomObj||{}).forEach(levelKey=>{
          const level=Number(levelKey);
          const value=Math.floor(Number(randomObj[levelKey]||0));
          if(value>0) entries.push({level,value,type});
        });
        entries.sort((a,b)=>b.level-a.level);
      }

      if(!entries.length){
        return `<div class="notice2 notice2--empty">No bundle chests selected yet.</div>`;
      }

      // static row (non-fill wrappers carry grid2--hug grid2--align-center).
      return `<div class="grid2 grid2--min-sm grid2--gap-sm grid2--hug grid2--align-center"><div class="grid2__row">
        ${entries.map(entry=>`<div class="grid2__item">${renderTopUpCompactDetailPill(entry)}</div>`).join("")}
      </div></div>`;
    }

    function renderBundleAppliedSummary(containerId,env=calculatorEnv){
      const el=runtime.byId(containerId);
      if(!el) return;

      const totals=env.bundleTotals();
      // bank off (What If): top-up choice is auto-applied, so show the bundle
      // choice directly (not bank-redeemed) and drop the bank from the title.
      const choiceShown = env.bank===false ? (totals.choice || {}) : runtime.currentBankRedeemedAsChoiceSource();
      const title = env.bank===false ? "Applied From Top Up Bundles" : "Applied From Top Up Bundles / Choice Chest Bank";

      const hasRandom=Object.values(totals.random||{}).some(v=>Number(v)>0);
      const hasChoice=Object.values(choiceShown||{}).some(v=>Number(v)>0);

      if(!hasRandom && !hasChoice){
        el.hidden=true;
        el.innerHTML="";
        return;
      }
      el.hidden=false;
      el.innerHTML=`
        <div class="card2 card2--muted card2--sm">
          <div class="stack2 stack2--column stack2--gap-3">
            <div class="card2__title card2__title--muted">${title}</div>
            ${makeBundlePills(totals.random,"random",choiceShown)}
          </div>
        </div>
      `;
    }

    function renderChoiceBankRedeem(containerId){
      const el=runtime.byId(containerId);
      if(!el) return;
      // calculator-only renderer; calculatorEnv.bank===false ⟺ manual mode.
      if(calculatorEnv.bank===false){ el.hidden=true; el.innerHTML=""; return; }
      runtime.ensureBankObjects();
      runtime.syncChoiceBankFromDerived();
      const generatedHere=runtime.bundleTotals().choice || {};
      const levels=new Set([...chestLevels,...Object.keys(generatedHere||{}).map(Number),...Object.keys(runtime.currentRedeemedBankObject()||{}).map(Number)]);
      const entries=Array.from(levels).map(level=>({
        level,
        earnedHere:runtime.currentChoiceBankEarnedHere(level),
        value:runtime.availableChoiceBankAtLevel(level),
        redeemed:Math.floor(Number(runtime.currentRedeemedBankObject()[level]||0))
      })).filter(x=>x.earnedHere>0 || x.value>0 || x.redeemed>0).sort((a,b)=>b.level-a.level);
      if(!entries.length){ el.hidden=true; el.innerHTML=""; return; }
      el.hidden=false;
      const openClass=runtime.choiceBankExpanded ? " card2--open" : "";
      const bodyHtml=`
        <div class="stack2 stack2--column stack2--gap-2">
          ${entries.map(entry=>`<div class="card2 card2--amber-soft card2--sm">
            <div class="stack2 stack2--column stack2--gap-3">
              <div class="stack2 stack2--row stack2--gap-3 stack2--justify-between stack2--align-center">
                <div class="text2 text2--label text2--choice">Lvl ${entry.level}</div>
                <div class="text2 text2--label text2--choice text2--align-right">${entry.value} available</div>
              </div>
              <div class="text2 text2--heavy-detail text2--align-center">${entry.earnedHere} earned here${entry.redeemed>0 ? ` · ${entry.redeemed} redeemed here` : ""}</div>
              <div class="grid2 grid2--min-sm grid2--gap-sm grid2--fill grid2--align-center">
                <div class="grid2__row">
                  <div class="grid2__item"><button type="button" class="button2 button2--sm button2--choice" data-action="redeemChoiceFromBank" data-action-event="click" data-arg0="${entry.level}" data-arg1="1">+1</button></div>
                  <div class="grid2__item"><button type="button" class="button2 button2--sm button2--choice" data-action="adjustRedeemedChoice" data-action-event="click" data-arg0="${entry.level}" data-arg1="-1">-1</button></div>
                  <div class="grid2__item"><button type="button" class="button2 button2--sm button2--choice" data-action="redeemChoiceFromBank" data-action-event="click" data-arg0="${entry.level}" data-arg1="${entry.value}">Use all</button></div>
                  <div class="grid2__item"><button type="button" class="button2 button2--sm button2--choice" data-action="removeAllRedeemedChoice" data-action-event="click" data-arg0="${entry.level}">Remove all</button></div>
                </div>
              </div>
            </div>
          </div>`).join("")}
        </div>
      `;
      el.innerHTML=`
        <div class="card2 card2--amber card2--xs card2--collapsible${openClass}" id="${containerId}Dropdown">
          <button class="card2__header card2__header--toggle card2__collapse-toggle" type="button" data-action="toggleChoiceBankCollapse" data-action-event="click">
            <div class="card2__heading">
              <div class="card2__title card2__title--muted card2__custom-header">Choice Chest Bank Available</div>
              <div class="card2__chev">⌄</div>
            </div>
          </button>
          <div class="card2__content card2__content--after-header">${bodyHtml}</div>
        </div>
      `;
    }

    // ── Results + Non-target: ONE compute, TWO card views ───────────────────
    // computeResults() does the drop-rate math and returns a plain model with
    // zero DOM writes; renderResultsView(model) and renderNontargetView(model)
    // are the two card-block views over that single model. calculateResults()
    // remains as the backwards-compatible "compute + render both" entry point.
    function computeResults(env=calculatorEnv){
      const p=env.probability();
      const target=env.targetLevel();
      const owned=env.ownedObject();
      const plan=env.planObject();
      const guaranteed=env.guaranteedObject();
      const totalChoice=env.totalChoiceObject();
      const bundleRandom=env.bundleRandomTotals();
      const activePlan=runtime.levelObjectPlus(plan,bundleRandom);
      const planHasInput=Object.values(plan||{}).some(v=>Number(v||0)>0);

      const additionalOwned=runtime.calculateAdditionalOwnedFromPlan(activePlan,p);
      const additionalOwnedForRemainingItems=runtime.calculateAdditionalOwnedFromPlanAndChoice(activePlan,totalChoice,p);
      const effectiveOwned=runtime.calculateOwnedPlusPlanPlusChoice(owned,additionalOwned,totalChoice);
      const effectiveOwnedForItems=runtime.calculateEffectiveOwnedForRemainingItems(owned,activePlan,totalChoice,p);

      const itemResultLevels=allItemLevels.filter(level=>level<=target);
      const showHighChests=env.showHighChests();
      const chestResultLevels=showHighChests ? chestLevels : chestDefaultLevels;

      const itemBaselineValues=itemResultLevels.map(level=>{
        const raw=runtime.requiredAtLevel(target,level);
        const ownedEq=runtime.levelObjectEquivalentAtLevel(owned,level);
        const remaining=Math.max(0,raw-ownedEq);
        return remaining>0 ? String(Math.ceil(remaining)) : "-";
      });

      const itemValues=itemResultLevels.map(level=>{
        const raw=runtime.requiredAtLevel(target,level);
        const ownedEq=runtime.levelObjectEquivalentAtLevel(effectiveOwnedForItems,level);
        const remaining=Math.max(0,raw-ownedEq);
        return remaining>0 ? String(Math.ceil(remaining)) : "-";
      });

      const chestValues=chestResultLevels.map(level=>{
        const effectiveOwnedForChestColumn=runtime.calculateEffectiveOwnedForRemainingChestColumn(owned,activePlan,totalChoice,p,level);
        const raw=runtime.requiredAtLevel(target,level);
        const ownedEq=runtime.levelObjectEquivalentAtLevel(effectiveOwnedForChestColumn,level);
        const remainingItems=Math.max(0,raw-ownedEq);
        const baseChestNeed=remainingItems>0 ? Math.ceil(remainingItems/p) : 0;
        const planSameLevel=Number(activePlan[level]||0);
        const chestNeed=Math.max(0,baseChestNeed-planSameLevel);
        return chestNeed ? String(chestNeed) : "-";
      });

      const expectedAddtlOwned=runtime.targetItemsFromPlanAndChoice(activePlan,totalChoice,p);
      const estimatedLevels=estimatedDisplayLevels(expectedAddtlOwned);
      const expectedValues=estimatedLevels.map(level=>{
        const val=expectedAddtlOwned[level]||0;
        return val>0 ? String(val) : "-";
      });

      const side=env.side();

      // Deterministic nontarget logic:
      // Every random chest creates exactly one item.
      // Side totals use the actual game drop table: Left = 2/3, Right = 1/3.
      // Target items are then subtracted from the selected target item's side.
      const nontargetTotals=runtime.nontargetSideTotalsFromRandomPlan(activePlan,side,p);

      const leftSideValues=runtime.valuesFromLevelObject(nontargetTotals.left,chestLevels);
      const rightSideValues=runtime.valuesFromLevelObject(nontargetTotals.right,chestLevels);

      const randomSideDisplayValues=chestLevels.map(level=>{
        const leftVal=runtime.safeNum(nontargetTotals.left[level]);
        const rightVal=runtime.safeNum(nontargetTotals.right[level]);
        if(leftVal<=0 && rightVal<=0) return "-";
        const parts=[];
        if(leftVal>0) parts.push("L: "+Math.floor(leftVal));
        if(rightVal>0) parts.push("R: "+Math.floor(rightVal));
        return parts.join(" / ");
      });

      const noPlanMessage=planHasInput || Object.values(bundleRandom||{}).some(v=>Number(v||0)>0) ? "No leftovers expected." : "No planned chests entered yet.";
      const expectedEmptyMessage=planHasInput ? "No target items expected." : "No planned chests entered yet.";
      const chanceText=(p*100).toFixed(3)+"%";
      const expectedSubLabel=env.subjectLabel();

      // One compute pass → a plain model that the two card views read from.
      return {
        target, side,
        itemResultLevels, itemValues, itemBaselineValues,
        chestResultLevels, chestValues,
        estimatedLevels, expectedValues, expectedEmptyMessage,
        leftSideValues, rightSideValues, randomSideDisplayValues,
        noPlanMessage, chanceText, chanceSide:side, expectedSubLabel
      };
    }

    // Results card view over the computeResults() model. `env` scopes ids/labels.
    function renderResultsView(model,env=calculatorEnv){
      const p=env.prefix;
      setRemainingSectionSubtexts(
        model.itemValues.some(value=>value !== "-" && value !== "" && value !== null && value !== undefined),
        model.chestValues.some(value=>value !== "-" && value !== "" && value !== null && value !== undefined),
        env
      );

      makeRemainingItemsResult(p+"itemsNeededTable",model.itemResultLevels,model.itemValues,model.target,env);
      renderResultsCollapsedSnapshot(model.itemResultLevels,model.itemValues,model.itemBaselineValues,env);
      makeRemainingChestsResult(p+"remainingTable",model.chestResultLevels,model.chestValues);
      makeLevelValuePillTable(p+"expectedTable",model.estimatedLevels,model.expectedValues,model.expectedEmptyMessage);

      (env.chanceIds||[]).forEach(id=>{
        const el=runtime.byId(id);
        if(!el) return;
        el.textContent=model.chanceText;
        el.classList.toggle("value-box2--tone-left",model.chanceSide==="left");
        el.classList.toggle("value-box2--tone-right",model.chanceSide==="right");
      });
      const expectedSub=env.byId(p+"expectedTargetSubtext");
      if(expectedSub){
        expectedSub.textContent=`Duplicate ${model.expectedSubLabel} gear acquired from random and choice chests.`;
      }
    }

    // Non-target card view over the computeResults() model. `env` scopes ids/labels.
    function renderNontargetView(model,env=calculatorEnv){
      const p=env.prefix;
      updateTotalLeftoverItemsText(env);
      updateSideLeftoverLabels();
      makeDualDetailCompactPillTable(p+"sameSideTable",chestLevels,model.leftSideValues,model.noPlanMessage);
      makeDualDetailCompactPillTable(p+"oppositeSideTable",chestLevels,model.rightSideValues,model.noPlanMessage);
      makeDualDetailCompactPillTable(p+"randomSideLeftoverTable",chestLevels,model.randomSideDisplayValues,model.noPlanMessage);
      renderNontargetAssignedSnapshot(model.leftSideValues,model.rightSideValues,env);
    }

    // Backwards-compatible single entry: one compute, both card views (calculator env).
    function calculateResults(){
      const model=computeResults();
      renderResultsView(model);
      renderNontargetView(model);
    }

  // Legacy global: some delegated/global dispatch paths resolve this off window.
  Object.assign(window,{ renderChoiceBankRedeem });

  return {
    buildStepper,
    renderTopUpBundles,
    renderBundleCard,
    renderQuantityStepperInput,
    renderTopUpCompactDetailPill,
    buildCombinedChestInputs,
    renderOwnedInputs,
    renderPlanInputs,
    renderGuaranteedInputs,
    hasPlanInput,
    makeFilteredResultTable,
    renderDualDetailCompactPill,
    levelPillGridMarkup,
    makeDualDetailCompactPillTable,
    makeLevelValuePillTable,
    updateSideLeftoverLabels,
    updateTotalLeftoverItemsText,
    makeRemainingItemsChunkedTable,
    makeRemainingItemsResult,
    makeRemainingChestsResult,
    setRemainingSectionSubtexts,
    estimatedDisplayLevels,
    makeBundlePills,
    renderBundleAppliedSummary,
    renderChoiceBankRedeem,
    calculateResults,
    computeResults,
    renderResultsView,
    renderNontargetView
  };
}
