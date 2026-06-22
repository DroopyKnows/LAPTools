// Inventory page "Advanced / Details" render surfaces: the Inventory Summary (breakdown)
// panel and the Item Plan audit view. These render inventory-tab DOM
// (#breakdownEstimatedInventoryList, #itemPlanSummaryList, #inventoryRandom*Table) — which is
// why this lives under inventory/, not calculator/ (it renders no calculator cards). Pure view
// layer over the runtime.* math. Shared pill/grid primitives (makeFilteredResultTable,
// renderTopUpCompactDetailPill, renderDualDetailCompactPill, levelPillGridMarkup) are read off
// the runtime, so this module is wired AFTER createCalculatorRenderModule.

import { allItemLevels, chestLevels, ravenItems } from "../metadata/item-metadata.js";
import { renderLargeDropdown } from "../calculator/calculator-ui-renderers.js";
import { initAllGrids } from "../ui/grid/grid.js";
import { renderPill2 } from "../ui/pill/pill.js";
import { uiLevelTone } from "../shared/ui/ui-helpers.js";

export function createInventoryBreakdownModule(runtime){
    function renderInventoryRandomTables(){
      const leftTotals={};
      const rightTotals={};

      if(typeof runtime.computeAllRawItemPlans==="function"){
        runtime.computeAllRawItemPlans().forEach(plan=>{
          runtime.addObjects(leftTotals,(plan.randomItemsLeftover && plan.randomItemsLeftover.left) || {});
          runtime.addObjects(rightTotals,(plan.randomItemsLeftover && plan.randomItemsLeftover.right) || {});
        });
      }

      const leftValues=chestLevels.map(level=>runtime.displayWhole(leftTotals[level]));
      const rightValues=chestLevels.map(level=>runtime.displayWhole(rightTotals[level]));

      runtime.makeFilteredResultTable("inventoryRandomLeftTable",chestLevels,leftValues,"No random left-side items detected from item plans.");
      runtime.makeFilteredResultTable("inventoryRandomRightTable",chestLevels,rightValues,"No random right-side items detected from item plans.");
    }

    function renderRawPills(obj,type){
      // I8/I9: G treatment via renderLevelPillGrid (sm, label inside, min sm,
      // no fill, engine minPerRow 2). The legacy type-class hooks
      // ("calculated"/"final") are dead — tone is the level rarity tone.
      return runtime.renderLevelPillGrid(obj,{
        levels: allItemLevels,
        pillSize:"sm",
        labelPlacement:"inside",
        min:"sm",
        fill:false,
        emptyHtml:`<div class="notice2 notice2--empty">None.</div>`,
        valueFormatter:value=>String(Math.floor(Number(value||0)))
      });
    }

    function renderSideAssignedSnapshotPills(obj,side,options={}){
      const levels=allItemLevels.filter(level=>Number((obj||{})[level]||0)>0);
      if(!levels.length) return `<div class="notice2 notice2--empty">None.</div>`;
      const entries=levels.map(level=>({
        level,
        value:String(Math.floor(Number((obj||{})[level]||0)))
      }));
      if(options.keepSnapshotGrid){
        return `
          <div class="grid2 grid2--min-sm grid2--gap-sm grid2--hug grid2--align-center" data-grid2 data-grid2-direction="bottom-up" data-grid2-min-per-row="2">
            ${entries.map(entry=>renderPill2({
              level:entry.level,
              qty:entry.value,
              toneClass:uiLevelTone(entry.level),
              size:"sm"
            })).join("")}
          </div>
        `;
      }
      return runtime.renderCompactPillRow(entries,{grid2Engine:true,minPerRow:3});
    }

    function renderMixedRandomPills(manualObj,topUpObj){
      const entries=[];
      Object.keys(manualObj||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(manualObj[levelKey]||0));
        if(value>0) entries.push({level,value,type:"manualRandom"});
      });
      Object.keys(topUpObj||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(topUpObj[levelKey]||0));
        if(value>0) entries.push({level,value,type:"topUpRandom"});
      });

      entries.sort((a,b)=>{
        if(b.level!==a.level) return b.level-a.level;
        if(a.type===b.type) return 0;
        return a.type==="manualRandom" ? -1 : 1;
      });

      if(!entries.length) return `<div class="notice2 notice2--empty">None.</div>`;

      // I8 "Random Chests Used": shared compact pills, source tones
      // (manual random = neutral, top-up random = green), engine grid.
      return runtime.renderCompactPillRow(entries,{grid2Engine:true});
    }

    function renderMixedChoicePills(manualObj,bankObj){
      const entries=[];
      Object.keys(manualObj||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(manualObj[levelKey]||0));
        if(value>0) entries.push({level,value,type:"manualChoice"});
      });
      Object.keys(bankObj||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(bankObj[levelKey]||0));
        if(value>0) entries.push({level,value,type:"topUpChoice"});
      });

      entries.sort((a,b)=>{
        if(b.level!==a.level) return b.level-a.level;
        if(a.type===b.type) return 0;
        return a.type==="manualChoice" ? -1 : 1;
      });

      if(!entries.length) return `<div class="notice2 notice2--empty">None.</div>`;

      // I8 "Raw Duplicates - Choice Chests": manual choice vs redeemed
      // bank/top-up choice (gold) source tones, engine grid.
      return runtime.renderCompactPillRow(entries,{grid2Engine:true});
    }

    function breakdownFilterMarkup(active){
      const current=active || "all";
      return `
        <div class="tabs2-unit tabs2-unit--label-left tabs2-unit--fill">
          <span class="tabs2__label tabs2__label--size-12">Filter:</span>
          ${runtime.renderFilterTabs({active:current,setter:"setBreakdownInventoryFilter",labels:{left:"Left",right:"Right",all:"All"}})}
        </div>
      `;
    }

    function breakdownDetailCardMarkup(title,bodyHtml){
      return `
        <div class="card2 card2--muted card2--sm">
          <div class="stack2 stack2--column stack2--gap-2">
            <div class="text2 text2--title">${title}</div>
            ${bodyHtml || ""}
          </div>
        </div>
      `;
    }

    function renderNontargetTChart(leftObj,rightObj){
      const leftHtml=runtime.levelObjectHasValues(leftObj || {})
        ? renderSideAssignedSnapshotPills(leftObj || {},"left")
        : `<div class="notice2 notice2--empty">None</div>`;
      const rightHtml=runtime.levelObjectHasValues(rightObj || {})
        ? renderSideAssignedSnapshotPills(rightObj || {},"right")
        : `<div class="notice2 notice2--empty">None</div>`;
      // C2 inner cards: muted sm, 2-up, inner gap 3.
      return `
        <div class="stack2 stack2--row stack2--gap-2 stack2--fill">
          <div class="card2 card2--muted card2--sm">
            <div class="stack2 stack2--column stack2--gap-3">
              <div class="card2__title">Left Inventory</div>
              <div>${leftHtml}</div>
            </div>
          </div>
          <div class="card2 card2--muted card2--sm">
            <div class="stack2 stack2--column stack2--gap-3">
              <div class="card2__title">Right Inventory</div>
              <div>${rightHtml}</div>
            </div>
          </div>
        </div>
      `;
    }

    function inventoryBreakdownExplainMarkup(){
      return `
        <div class="card2 card2--white card2--xs card2--collapsible" id="inventoryBreakdownExplain" data-more-info-section>
          <button class="card2__header card2__header--toggle card2__collapse-toggle" type="button" data-action="toggleCard" data-action-event="click" data-arg0="inventoryBreakdownExplain">
            <div class="card2__heading">
              <div class="card2__title card2__custom-header">Explain This Section</div>
              <div class="card2__chev">⌄</div>
            </div>
          </button>
          <div class="card2__content card2__content--after-header stack2 stack2--column stack2--gap-2">
            <div class="card2__body"><strong>Inventory Summary</strong> shows how each Raven item&rsquo;s estimated inventory is built. Each item card can include different sections depending on what data exists for that item.</div>
            <div class="card2__body"><strong>Current Inventory</strong> shows the items you manually entered for that Raven item.</div>
            <div class="card2__body"><strong>Random Chests Used</strong> shows source inputs for that item plan. <strong>Neutral pills</strong> are manual random chests. <strong>Green pills</strong> are top-up random chests.</div>
            <div class="card2__body"><strong>Raw Duplicates for [Item] - Random Chests</strong> shows estimated duplicate target items from random chests before final 3-to-1 simplification.</div>
            <div class="card2__body"><strong>Raw Duplicates for [Item] - Choice Chests</strong> shows guaranteed duplicate target items from manual choice chests or redeemed bank choice chests. Choice chest source values may use <strong>gold pills</strong> when they came from redeemed bank/top-up choice chests.</div>
            <div class="card2__body"><strong>Final Target Item Added</strong> shows the simplified/upgraded duplicate result credited to that Raven item.</div>
            <div class="card2__body"><strong>Allocated Non-target Items</strong> shows non-target gear assigned by destination. <strong>Blue pills</strong> go to <strong>Left Inventory</strong>, and <strong>purple pills</strong> go to <strong>Right Inventory</strong>.</div>
            <div class="card2__body"><strong>Allocated [Item] Duplicates From Other Plans</strong> shows duplicates credited to this item from other Raven item plans. The <strong>Show more</strong> expansion can list which specific item plans contributed those duplicates.</div>
            <div class="card2__body"><strong>Starting Inventory</strong> is the Current Inventory already entered for that item. <strong>Other Plans Total</strong> is the combined duplicate contribution coming from other item plans.</div>
            <div class="card2__body"><strong>Random Items Unassigned</strong> may appear elsewhere in inventory views when side-based random results cannot be confidently assigned to one specific Raven item.</div>
            <div class="card2__body">Some sections may not appear if there are no matching values for the selected item, side, filter, or saved plan.</div>
          </div>
        </div>
      `;
    }

    function renderBreakdownEstimatedInventory(){
      const wrap=runtime.byId("breakdownEstimatedInventoryList");
      if(!wrap) return;
      wrap.className="stack2 stack2--column stack2--gap-3";
      wrap.innerHTML="";

      const filter=runtime.state.breakdownInventoryFilter || "all";
      wrap.insertAdjacentHTML("beforeend", breakdownFilterMarkup(filter));

      let rendered=0;

      ravenItems.forEach(item=>{
        if(!runtime.shouldShowSide(item.side,filter)) return;

        const itemName=item.name;
        const outputs=runtime.computePlanOutputsForItem(itemName);
        const rawPlan=runtime.computeRawItemPlan(itemName);
        const contributionDetails=runtime.duplicateContributionDetailsForItem(itemName,itemName);
        const duplicatesFromOtherPlans=runtime.duplicatesFromOtherRawPlans(itemName,itemName);
        const currentInventory=(rawPlan && rawPlan.currentInventory) || ((runtime.state.inventory.active && runtime.state.inventory.active[itemName]) || {});

        const hasManualRandom=runtime.levelObjectHasValues(outputs.manualRandom || {});
        const hasTopUpRandom=runtime.levelObjectHasValues(outputs.topUpRandom || {});
        const hasRandomUsed=hasManualRandom || hasTopUpRandom;
        const hasRandomTarget=runtime.levelObjectHasValues(outputs.rawTargetRandom || {});
        const hasChoice=runtime.levelObjectHasValues(outputs.rawManualChoice || {}) || runtime.levelObjectHasValues(outputs.rawRedeemedChoice || {});
        const hasLeft=runtime.levelObjectHasValues(outputs.rawAssignedLeft || {});
        const hasRight=runtime.levelObjectHasValues(outputs.rawAssignedRight || {});
        const hasAssignable=hasLeft || hasRight;
        const finalContribution=runtime.finalBreakdownContribution(outputs);
        const hasFinal=runtime.levelObjectHasValues(finalContribution || {});
        const hasCurrentInventory=runtime.levelObjectHasValues(currentInventory || {});
        const hasOtherDuplicates=runtime.levelObjectHasValues(duplicatesFromOtherPlans || {});

        if(!hasRandomUsed && !hasRandomTarget && !hasChoice && !hasAssignable && !hasFinal && !hasCurrentInventory && !hasOtherDuplicates) return;

        const badgeClass=item.side==="right" ? "pill2 pill2--badge pill2--md pill2--tone-right" : "pill2 pill2--badge pill2--md pill2--tone-left";

        // I8 "Allocated … From Other Plans" rows: labeled-rows grid, 70px
        // label column (NO data-grid2 — labeled-rows is static CSS grid).
        const contributionRows=contributionDetails.length ? `<div class="grid2 grid2--labeled-rows" style="--grid2-label-col:70px">${contributionDetails.map(detail=>`
          <div class="grid2__row-label"><span>${detail.sourceItem} plan</span></div>
          <div class="grid2__row-body">${renderRawPills(detail.values || {},"calculated")}</div>
        `).join("")}</div>` : `<div class="notice2 notice2--empty">No duplicate contributions from other plans.</div>`;

        const bodyHtml=`
            ${(hasRandomUsed || hasRandomTarget) ? `
              <div class="stack2 stack2--column stack2--gap-2">
                ${hasRandomUsed ? breakdownDetailCardMarkup("Random Chests Used", renderMixedRandomPills(outputs.manualRandom || {}, outputs.topUpRandom || {})) : ""}
                ${hasRandomTarget ? breakdownDetailCardMarkup(`Raw Duplicates for ${itemName} - Random Chests`, renderRawPills(outputs.rawTargetRandom || {},"calculated")) : ""}
              </div>
            ` : ""}

            ${hasChoice ? breakdownDetailCardMarkup(`Raw Duplicates for ${itemName} - Choice Chests`, renderMixedChoicePills(outputs.rawManualChoice || {}, outputs.rawRedeemedChoice || {})) : ""}

            ${hasFinal ? breakdownDetailCardMarkup("Final Target Item Added", renderRawPills(finalContribution || {},"final")) : ""}

            ${hasAssignable ? breakdownDetailCardMarkup("Allocated Non-target Items", renderNontargetTChart(outputs.rawAssignedLeft || {}, outputs.rawAssignedRight || {})) : ""}

            ${(hasCurrentInventory || hasOtherDuplicates) ? breakdownDetailCardMarkup(`Allocated ${itemName} Duplicates From Other Plans`, `
                <div class="grid2 grid2--labeled-rows" style="--grid2-label-col:70px">
                  <div class="grid2__row-label"><span>Starting</span><span>Inventory</span></div>
                  <div class="grid2__row-body">${renderRawPills(currentInventory || {},"calculated")}</div>
                  <div class="grid2__row-label"><span>Other Plans</span><span>Total</span></div>
                  <div class="grid2__row-body">${renderRawPills(duplicatesFromOtherPlans || {},"calculated")}</div>
                </div>
                <details class="card2 card2--white card2--xs">
                  <summary class="card2__header card2__header--toggle">
                    <div class="card2__heading">
                      <div class="card2__title card2__custom-header">Show More</div>
                      <div class="card2__chev">⌄</div>
                    </div>
                  </summary>
                  <div class="card2__content card2__content--after-header">${contributionRows}</div>
                </details>
              `) : ""}

        `;
        wrap.insertAdjacentHTML("beforeend", renderLargeDropdown({
          attrs:`data-source-item="${runtime.uiEscapeAttr(itemName)}"`,
          title:itemName,
          badgeHtml:`<div class="${badgeClass}">${item.side.toUpperCase()}</div>`,
          bodyHtml
        }));
        rendered++;
      });

      if(rendered===0){
        const empty=document.createElement("div");
        empty.className="notice2 notice2--empty";
        empty.textContent="No inventory summary values detected yet.";
        wrap.appendChild(empty);
      }

      wrap.insertAdjacentHTML("beforeend", inventoryBreakdownExplainMarkup());
      initAllGrids(wrap);
    }

    function renderPlanSummaryPills(entries){
      if(!entries.length) return `<div class="notice2 notice2--empty">None.</div>`;
      // I9 "Random & Choice Chests Used": topupSource tones with bottom
      // captions (pill.js), engine grid (min md, hug, bottom-up, minPerRow 2).
      return `<div class="grid2 grid2--min-md grid2--gap-sm grid2--hug grid2--align-center" data-grid2 data-grid2-direction="bottom-up" data-grid2-min-per-row="2">${entries.map(entry=>runtime.renderTopUpCompactDetailPill({
          level:entry.level,
          value:entry.value,
          type:entry.kind==="choice" ? "choice" : "random",
          label:entry.kind==="choice" ? "Choice" : "Random",
          className:entry.source==="manual" ? "manual-source" : "topup-source"
        })).join("")}</div>`;
    }

    function chestsUsedSummaryEntries(outputs){
      const entries=[];
      const pushEntries=(obj,kind,source,label,className)=>{
        Object.keys(obj||{}).forEach(levelKey=>{
          const level=Number(levelKey);
          const value=Math.floor(Number(obj[levelKey]||0));
          if(value>0) entries.push({level,value,kind,source,label,className});
        });
      };

      pushEntries(outputs.rawManualChoice || {},"choice","manual","Choice Manual","choice-manual");
      pushEntries(outputs.rawRedeemedChoice || {},"choice","topup","Choice Bank","choice-bank");
      pushEntries(outputs.manualRandom || {},"random","manual","Random Manual","random-manual");
      pushEntries(outputs.topUpRandom || {},"random","topup","Random","random-topup");

      const kindRank={choice:0,random:1};
      const sourceRank={manual:0,topup:1};
      entries.sort((a,b)=>{
        if(b.level!==a.level) return b.level-a.level;
        if(kindRank[a.kind]!==kindRank[b.kind]) return kindRank[a.kind]-kindRank[b.kind];
        if(sourceRank[a.source]!==sourceRank[b.source]) return sourceRank[a.source]-sourceRank[b.source];
        return a.label.localeCompare(b.label);
      });

      return entries;
    }

    function renderSideLeftoverPills(leftObj,rightObj){
      const levels=allItemLevels.filter(level=>Number((leftObj||{})[level]||0)>0 || Number((rightObj||{})[level]||0)>0);
      if(!levels.length) return `<div class="notice2 notice2--empty">None.</div>`;
      return runtime.levelPillGridMarkup(levels.map(level=>{
          const parts=[];
          const left=Math.floor(Number((leftObj||{})[level]||0));
          const right=Math.floor(Number((rightObj||{})[level]||0));
          if(left>0) parts.push(`L: ${left}`);
          if(right>0) parts.push(`R: ${right}`);
          return runtime.renderDualDetailCompactPill({level,value:parts.join(" / ")});
        }),{minPerRow:2,minClass:"grid2--min-wide"});
    }

    function totalCalculatedInventoryRaw(itemName,targetRaw,otherPlanDuplicates){
      return runtime.addLevelObjects(
        (runtime.state.inventory.active && runtime.state.inventory.active[itemName]) || {},
        targetRaw || {},
        otherPlanDuplicates || {}
      );
    }

    function renderItemPlanSummary(){
      const wrap=runtime.byId("itemPlanSummaryList");
      if(!wrap) return;
      wrap.className="stack2 stack2--column stack2--gap-3";
      wrap.innerHTML="";

      const filter=runtime.state.breakdownInventoryFilter || "all";
      wrap.insertAdjacentHTML("beforeend", breakdownFilterMarkup(filter));

      let rendered=0;

      ravenItems.forEach(sourceItem=>{
        if(!runtime.shouldShowSide(sourceItem.side,filter)) return;
        const sourceName=sourceItem.name;
        const rawPlan=runtime.computeRawItemPlan(sourceName);
        const outputs=runtime.computePlanOutputsForItem(sourceName);
        const badgeClass=sourceItem.side==="right" ? "pill2 pill2--badge pill2--md pill2--tone-right" : "pill2 pill2--badge pill2--md pill2--tone-left";
        const targetRaw=runtime.targetDuplicatesForPlanRaw(rawPlan);
        const calculatedItemPlanInventory=runtime.calculatedItemPlanInventoryRawFromPlan(rawPlan);
        const duplicatesFromOtherPlans=runtime.duplicatesFromOtherRawPlans(sourceName,sourceName);
        const totalCalculatedInventory=totalCalculatedInventoryRaw(sourceName,targetRaw,duplicatesFromOtherPlans);
        const planLeftovers=(rawPlan && rawPlan.randomItemsLeftover) || {left:{},right:{}};

        const bodyHtml=`
            <div class="notice2 notice2--warn">Plan-level audit view. Intended for identifying anomalies in the logic.</div>

            ${breakdownDetailCardMarkup("Current Inventory", renderRawPills((rawPlan && rawPlan.currentInventory) || {},"calculated"))}

            ${breakdownDetailCardMarkup("Random &amp; Choice Chests Used", renderPlanSummaryPills(chestsUsedSummaryEntries(outputs)))}

            ${breakdownDetailCardMarkup("Estimated Target Items (RAW)", renderRawPills(targetRaw || {},"calculated"))}

            ${breakdownDetailCardMarkup("Calculated Item Plan Inventory (RAW)", renderRawPills(calculatedItemPlanInventory || {},"calculated"))}

            ${breakdownDetailCardMarkup(`${sourceName} Duplicates From Other Plans:`, renderRawPills(duplicatesFromOtherPlans || {},"calculated"))}

            <div class="card2 card2--muted card2--sm" data-audit-total-line>
              <div class="stack2 stack2--column stack2--gap-2">
                <div class="stack2 stack2--row stack2--gap-2 stack2--align-center stack2--justify-between">
                  <div class="text2 text2--title">Total Calculated Inventory</div>
                  <label class="toggle2 toggle2--text">
                    <input class="toggle2__input" type="checkbox" data-action="toggleAuditTotalView" data-action-event="change" />
                    <span class="toggle2__label">Simplify</span>
                  </label>
                </div>
                <div data-audit-total-raw>${renderRawPills(totalCalculatedInventory || {},"final")}</div>
                <div data-audit-total-simplified class="hidden">${renderRawPills(runtime.simplifyUpByLevel(totalCalculatedInventory || {}),"final")}</div>
              </div>
            </div>

            ${breakdownDetailCardMarkup("Non-target Items (LEFT)", renderSideAssignedSnapshotPills((rawPlan && rawPlan.nontargetPools && rawPlan.nontargetPools.left) || {},"left"))}

            ${breakdownDetailCardMarkup("Non-target Items (RIGHT)", renderSideAssignedSnapshotPills((rawPlan && rawPlan.nontargetPools && rawPlan.nontargetPools.right) || {},"right"))}

            ${breakdownDetailCardMarkup("Random Items Unassigned", renderSideLeftoverPills(planLeftovers.left || {}, planLeftovers.right || {}))}

            ${breakdownDetailCardMarkup("Balance Check", `
              <div class="grid2 grid2--min-md grid2--gap-sm grid2--fill grid2--align-center" data-grid2 data-grid2-cols="3">
                <output class="value-box2 value-box2--md value-box2--derived value-box2--readonly"><span class="value-box2__label">Random Chests</span><span class="value-box2__value">${rawPlan.audit.randomChestCount}</span></output>
                <output class="value-box2 value-box2--md value-box2--derived value-box2--readonly"><span class="value-box2__label">Generated</span><span class="value-box2__value">${rawPlan.audit.generatedCount}</span></output>
                <output class="value-box2 value-box2--md value-box2--derived value-box2--readonly"><span class="value-box2__label">Target</span><span class="value-box2__value">${rawPlan.audit.targetRandomCount}</span></output>
                <output class="value-box2 value-box2--md value-box2--derived value-box2--readonly"><span class="value-box2__label">Non-target</span><span class="value-box2__value">${rawPlan.audit.nontargetCount}</span></output>
                <output class="value-box2 value-box2--md value-box2--derived value-box2--readonly"><span class="value-box2__label">Allocated</span><span class="value-box2__value">${rawPlan.audit.allocatedCount}</span></output>
                <output class="value-box2 value-box2--md value-box2--derived value-box2--readonly"><span class="value-box2__label">Leftover</span><span class="value-box2__value">${rawPlan.audit.leftoverCount}</span></output>
                <output class="value-box2 value-box2--md value-box2--derived value-box2--readonly-badge ${rawPlan.audit.balances ? "value-box2--tone-positive" : "value-box2--tone-warn"}"><span class="value-box2__label">Balance</span><span class="value-box2__value">${rawPlan.audit.balances ? "OK" : "CHECK"}</span></output>
              </div>
            `)}

        `;
        wrap.insertAdjacentHTML("beforeend", renderLargeDropdown({
          attrs:`data-source-item="${runtime.uiEscapeAttr(sourceName)}"`,
          title:sourceName,
          badgeHtml:`<div class="${badgeClass}">${sourceItem.side.toUpperCase()}</div>`,
          bodyHtml
        }));
        rendered++;
      });

      if(rendered===0){
        const empty=document.createElement("div");
        empty.className="notice2 notice2--empty";
        empty.textContent="No item plans detected yet.";
        wrap.appendChild(empty);
      }
      initAllGrids(wrap);
    }

  return {
    renderInventoryRandomTables,
    renderRawPills,
    renderMixedRandomPills,
    renderMixedChoicePills,
    breakdownFilterMarkup,
    renderNontargetTChart,
    inventoryBreakdownExplainMarkup,
    renderBreakdownEstimatedInventory,
    renderPlanSummaryPills,
    chestsUsedSummaryEntries,
    renderSideLeftoverPills,
    totalCalculatedInventoryRaw,
    renderItemPlanSummary
  };
}
