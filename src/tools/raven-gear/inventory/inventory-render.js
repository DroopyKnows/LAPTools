// Inventory rendering and view helpers.
// External helpers/data/state are read from runtime at call time; internal helpers call lexically.

import { allItemLevels, chestLevels, ravenItems } from "../metadata/item-metadata.js";
import { createInventoryPillRenderers } from "../shared/ui/inventory-pill-renderers.js";
import { renderInventoryItemCard, renderSingleCompactRow } from "./inventory-ui-renderers.js";
import { pill2SourceClassName, pill2SourceCaption } from "../ui/pill/pill.js";
import { initAllGrids } from "../ui/grid/grid.js";
import { uiValueBoxLevelTone } from "../shared/ui/ui-helpers.js";

export function createInventoryRenderModule(runtime){
    function updateSideFilterTabs(prefix, filter){
      ["left","right","all"].forEach(value=>{
        const el=runtime.byId(prefix+"-"+value);
        if(el) el.classList.toggle("active", value===filter);
      });
    }

    function sideFilterMarkup(prefix, active){
      const setter = prefix==="inventoryInput" ? "setInventoryInputFilter" : "setUpgradedOwnedFilter";
      return `
        <div class="tabs2 tabs2--sm tabs2--neutral" style="--tabs-cols:3">
          <button id="${prefix}-left" class="tabs2__tab ${active==="left" ? "active" : ""}" data-action="${setter}" data-action-event="click" data-arg0="left">Left</button>
          <button id="${prefix}-right" class="tabs2__tab ${active==="right" ? "active" : ""}" data-action="${setter}" data-action-event="click" data-arg0="right">Right</button>
          <button id="${prefix}-all" class="tabs2__tab ${active==="all" ? "active" : ""}" data-action="${setter}" data-action-event="click" data-arg0="all">All Items</button>
        </div>
      `;
    }

    function updateUpgradedOwnedViewTabs(mode){
      ["combined","calculated"].forEach(value=>{
        const el=runtime.byId("upgradedView-"+value);
        if(el) el.classList.toggle("active", value===mode);
      });
    }

    function upgradedViewModeMarkup(active){
      // view-mode toggles use tabs2 md neutral, matching the archive master tab pair;
      // selection runs on the JS-toggled .active state.
      return `
        <div class="tabs2 tabs2--md tabs2--neutral" style="--tabs-cols:2" role="group" aria-label="Estimated inventory view mode">
          <button id="upgradedView-combined" type="button" class="tabs2__tab ${active==="combined" ? "active" : ""}" data-action="setUpgradedOwnedViewMode" data-action-event="click" data-arg0="combined">Combined Inventory</button>
          <button id="upgradedView-calculated" type="button" class="tabs2__tab ${active==="calculated" ? "active" : ""}" data-action="setUpgradedOwnedViewMode" data-action-event="click" data-arg0="calculated">Calculated Inventory</button>
        </div>
        <div class="text2 text2--subtle text2--align-center">
          ${active==="combined"
            ? "Combines your inventory with all item plan results."
            : "Shows only projected additions from saved plans."}
        </div>
      `;
    }

    function inventoryLevelRangeForItem(itemName){
      const map=runtime.state.inventoryLevelRangeByItem || {};
      return map[itemName]==="8-12" ? "8-12" : "1-7";
    }

    function inventoryInputLevelsForRange(itemName){
      const range=inventoryLevelRangeForItem(itemName);
      return allItemLevels.filter(level=>range==="8-12" ? level>=8 : level<=7);
    }

    function highLevelForItem(itemName){
      const values=(runtime.state.inventory && runtime.state.inventory.active && runtime.state.inventory.active[itemName]) || {};
      for(let level=12;level>=8;level--){
        if(Number(values[level]||0)>0) return level;
      }
      return 0;
    }

    function techPointsForItem(itemName){
      const map=runtime.state.inventoryTechPointsByItem || {};
      return Math.max(0,Math.floor(Number(map[itemName]||0)));
    }

    function requiredTechPointsForLevel(level){
      const current=Number(level||0);
      if(current>=8 && current<=11) return Math.pow(3,current)-Math.pow(3,current-1);
      return 0;
    }

    function getInventoryItemDisplayModel(itemName,values,options={}){
      const source=values || {};
      const levels=(options.levels || allItemLevels || []).slice().sort((a,b)=>b-a);
      const shown=levels.filter(level=>Number(source[level]||0)>0);
      const equippedLevel=shown.length ? shown[0] : 0;
      const equippedQty=equippedLevel ? Math.floor(Number(source[equippedLevel]||0)) : 0;
      const isHighLevel=equippedLevel>=8;
      const techSource=options.techPointsByItem || runtime.state.inventoryTechPointsByItem || (runtime.state.inventory && runtime.state.inventory.techPointsByItem) || {};
      const techPoints=Math.max(0,Math.floor(Number(options.techPoints!==undefined ? options.techPoints : techSource[itemName] || 0)));
      const requiredTechPoints=isHighLevel ? requiredTechPointsForLevel(equippedLevel) : 0;
      const researchPercent=requiredTechPoints>0 ? Math.min(100,Math.floor((techPoints/requiredTechPoints)*100)) : (equippedLevel===12 ? 100 : null);
      const equippedDisplayValue=isHighLevel ? `${researchPercent||0}%` : (equippedQty>0 ? runtime.roundNice(equippedQty) : "");
      const duplicateLevels=shown.filter(level=>level!==equippedLevel).map(level=>({level,qty:Math.floor(Number(source[level]||0))}));
      return {itemName,equippedLevel,equippedQty,equippedDisplayValue,isHighLevel,techPoints,requiredTechPoints,researchPercent,duplicateLevels,shownLevels:shown};
    }

    function compactInventoryValueFormatter(itemName,options={}){
      return (value,level)=>{
        if(Number(level)>=8){
          const model=getInventoryItemDisplayModel(itemName,{[level]:value},options);
          if(model.isHighLevel) return model.equippedDisplayValue || "0%";
        }
        return String(runtime.roundNice(value));
      };
    }

    function compactPillClassTokens(value){
      return String(value||"").split(/\s+/).map(x=>x.trim()).filter(Boolean);
    }

    // Level → pill2 level-rarity tone (L1 gray, L2 green, L3 blue, L4 purple, L5-7 gold, L8+ red).
    function compactPillLevelToneClass(level){
      const n=Number(level)||0;
      if(n>=8) return "pill2--tone-levelRed";
      if(n>=5) return "pill2--tone-levelGold";
      if(n===4) return "pill2--tone-levelPurple";
      if(n===3) return "pill2--tone-levelBlue";
      if(n===2) return "pill2--tone-levelGreen";
      return "pill2--tone-levelGray";
    }

    // entry.type → pill2 tone: source strings (manual-random / manual-choice / tu-random /
    // tu-choice) resolve through pill.js; negative|good|reduction are positive-toned;
    // neutral|required|requirement-change are neutral; left/right are side tones;
    // everything else falls back to the level rarity tone.
    function compactPillToneClass(type,className,level){
      const sourceTone=pill2SourceClassName(type);
      if(sourceTone) return sourceTone;
      const tokens=new Set([
        ...compactPillClassTokens(type),
        ...compactPillClassTokens(className)
      ]);
      if(tokens.has("left")) return "pill2--tone-left";
      if(tokens.has("right")) return "pill2--tone-right";
      // semantic tones: inventory difference gains are positive, losses are warn.
      // The negative/good/reduction branch below stays so requirement-change consumers keep their meaning.
      if(tokens.has("gain")) return "pill2--tone-positive";
      if(tokens.has("loss")) return "pill2--tone-warn";
      if(tokens.has("negative") || tokens.has("good") || tokens.has("reduction")) return "pill2--tone-positive";
      if(tokens.has("neutral") || tokens.has("required") || tokens.has("requirement-change")) return "pill2--tone-neutral";
      return compactPillLevelToneClass(level);
    }

    function renderCompactPill(entry={}){
      const level=Number(entry.level || entry.lvl || 0);
      const value=entry.value!==undefined ? entry.value : (entry.qty!==undefined ? entry.qty : "");
      const type=entry.type || entry.sourceType || entry.side || entry.tone || "";
      // shared compact pill: pill2 sm compact, level+qty inside, tone param-driven, optional caption.
      const toneClass=compactPillToneClass(type,entry.className,level);
      const caption=entry.caption !== undefined && entry.caption !== null ? String(entry.caption) : pill2SourceCaption(entry.captionSource || "");
      const title=entry.title ? ` title="${runtime.uiEscapeAttr(entry.title)}"` : "";
      return `<span class="pill2-unit pill2-unit--inside ${toneClass}"${title}><span class="pill2 pill2--sm pill2--compact ${toneClass}">`+
        `<span class="pill2__level">L${level}</span>`+
        `<span class="pill2__qty">${value}</span>`+
        `${caption ? `<span class="pill2__caption">${caption}</span>` : ""}`+
        `</span></span>`;
    }

    function renderCompactPillRow(entries,options={}){
      const emptyHtml=options.emptyHtml || "";
      const list=(entries||[]).filter(Boolean);
      if(!list.length) return emptyHtml;
      const cols=Math.floor(Number(options.cols||0));
      if(cols>0){
        // fixed-N: explicit column count — initGrid2's fixed-cols path builds the
        // row/item tree synchronously and skips the ResizeObserver.
        return `<div class="grid2 grid2--min-sm grid2--gap-sm grid2--hug grid2--align-center" data-grid2 data-grid2-cols="${cols}">${list.map(entry=>renderCompactPill(entry)).join("")}</div>`;
      }
      if(options.grid2Engine){
        // engine grid (min-sm, gap-sm, no fill, bottom-up, minPerRow 2); pills DIRECT children for initAllGrids.
        const minPerRow=options.minPerRow===undefined ? 2 : options.minPerRow;
        return `<div class="grid2 grid2--min-sm grid2--gap-sm grid2--hug grid2--align-center" data-grid2 data-grid2-direction="bottom-up" data-grid2-min-per-row="${minPerRow}">${list.map(entry=>renderCompactPill(entry)).join("")}</div>`;
      }
      // static single row (min-sm, gap-sm, NO engine attrs).
      return `<div class="grid2 grid2--min-sm grid2--gap-sm grid2--hug grid2--align-center"><div class="grid2__row">${list.map(entry=>`<div class="grid2__item">${renderCompactPill(entry)}</div>`).join("")}</div></div>`;
    }

    const {
      renderCompactLevelBoxes,
      renderInventoryDisplayPills
    }=createInventoryPillRenderers(runtime,{
      compactInventoryValueFormatter,
      renderCompactPillRow
    });

    function inventoryArchiveTabsMarkup(active){
      // master tab pair is pure tabs2; active state is styled via the state bridge (.tabs2__tab.active).
      return `
        <div class="tabs2 tabs2--md tabs2--neutral" style="--tabs-cols:2" role="group" aria-label="Inventory archive mode">
          <button type="button" class="tabs2__tab ${active!=="archived" ? "active" : ""}" data-action="setInventoryArchiveMode" data-action-event="click" data-arg0="active">Active Inventory</button>
          <button type="button" class="tabs2__tab ${active==="archived" ? "active" : ""}" data-action="setInventoryArchiveMode" data-action-event="click" data-arg0="archived">Archived Inventory</button>
        </div>
      `;
    }

    function archiveSideFilterMarkup(active){
      return `
        <div class="tabs2-unit tabs2-unit--label-left tabs2-unit--fill">
          <span class="tabs2__label tabs2__label--size-12">Filter:</span>
          ${runtime.renderFilterTabs({active,setter:"setInventoryArchiveFilter",labels:{left:"Left",right:"Right",all:"All"}})}
        </div>
      `;
    }

    function compactInventoryCompareRows(labelsAndObjects){
      // one labeled-rows grid (50px label col for archived compare rows, NO data-grid2 —
      // static CSS grid); row bodies are the shared compact pills, level tone.
      const rowBody=(row)=>{
        const source=runtime.simplifyUpByLevel(row.obj||{});
        const shown=allItemLevels.filter(level=>Number(source[level]||0)>0);
        if(!shown.length) return runtime.renderEmptyState({title:'',message:'None',className:'notice2 notice2--empty',compact:true});
        const valueFormatter=row.itemName ? compactInventoryValueFormatter(row.itemName,{techPoints:row.techPoints}) : (value=>String(runtime.roundNice(value)));
        return shown.map(level=>renderCompactPill({level,value:valueFormatter(Number(source[level]||0),level)})).join("");
      };
      return `<div class="grid2 grid2--labeled-rows grid2--gap-sm" style="--grid2-label-col:50px">
        ${(labelsAndObjects||[]).map(row=>`<div class="grid2__row-label">${row.label}</div><div class="grid2__row-body">${rowBody(row)}</div>`).join("")}
      </div>`;
    }

    function renderArchivedInventorySnapshotBlock(config){
      const cfg=Object.assign({title:"", side:null, rows:[], extraHtml:""}, config || {});
      const rowsHtml=compactInventoryCompareRows(cfg.rows || []);
      return renderInventoryItemCard({
        title:cfg.title,
        side:cfg.side,
        bodyHtml:`<div class="stack2 stack2--column stack2--gap-2">${rowsHtml}${cfg.extraHtml || ""}</div>`
      });
    }

    function renderArchivedInventoryCard(entry, expanded, itemBlocks){
      const safeId=runtime.uiEscapeAttr(entry.id);
      const title=entry.name || "Inventory Snapshot";
      const date=entry.savedAt ? new Date(entry.savedAt).toLocaleString() : "Archived inventory";
      const note=entry.note || "";
      const bodyHtml=itemBlocks || runtime.renderEmptyState({title:'',message:'Snapshot is empty for this filter.',className:'notice2 notice2--empty',compact:true});
      return `<div class="card2 card2--white card2--md card2--collapsible ${expanded ? "card2--open" : ""}">
        <div class="card2__header">
          <div class="stack2 stack2--row stack2--gap-2 stack2--align-start stack2--fill-hug">
            <button class="card2__header card2__header--toggle card2__collapse-toggle" type="button" data-action="toggleInventoryArchiveSnapshot" data-action-event="click" data-arg0="${safeId}">
              <div class="card2__heading">
                <div class="card2__text card2__text--left">
                  <div class="card2__title">${title}</div>
                  <div class="card2__body">${date}</div>
                  ${note ? `<div class="text2 text2--subtle">${note}</div>` : ""}
                </div>
              </div>
            </button>
            <div class="stack2 stack2--row stack2--gap-2 stack2--align-center stack2--wrap card2__action" data-stop-propagation="true">
              <button class="button2 button2--sm button2--positive" data-action="loadInventorySnapshot" data-action-event="click" data-arg0="${safeId}">Load</button>
              <button class="button2 button2--sm button2--danger" data-action="deleteInventorySnapshot" data-action-event="click" data-arg0="${safeId}">Delete</button>
            </div>
          </div>
        </div>
        <div class="card2__content card2__content--after-header stack2 stack2--column stack2--gap-3">${bodyHtml}</div>
      </div>`;
    }

    function renderArchivedInventoryList(list){
      const archives=Array.isArray(runtime.state.inventoryArchives) ? runtime.state.inventoryArchives : [];
      const filter=runtime.state.inventoryArchiveFilter || "all";
      runtime.state.inventoryArchiveExpanded=runtime.state.inventoryArchiveExpanded || {};
      const archiveControls=document.createElement("div");
      archiveControls.className="stack2 stack2--column stack2--gap-3";
      archiveControls.innerHTML=`${inventoryArchiveTabsMarkup("archived")}${archiveSideFilterMarkup(filter)}`;
      list.appendChild(archiveControls);
      if(!archives.length){
        list.insertAdjacentHTML("beforeend", runtime.renderEmptyState({title:'No archived inventories yet.',message:'Saved inventory snapshots will appear here.',className:'notice2 notice2--empty'}));
        return;
      }
      const archiveStack=document.createElement("div");
      archiveStack.className="stack2 stack2--column stack2--gap-3";
      list.appendChild(archiveStack);
      archives.forEach(entry=>{
        const expanded=!!runtime.state.inventoryArchiveExpanded[entry.id];
        const itemBlocks=ravenItems.filter(item=>filter==="all" || item.side===filter).map(item=>{
          const archived=(entry.inventory||{})[item.name]||{};
          const active=(runtime.state.inventory.active||{})[item.name]||{};
          const archivedTech=((entry.techPointsByItem || entry.inventoryTechPointsByItem || {})[item.name]) || 0;
          const activeTech=((runtime.state.inventoryTechPointsByItem || {})[item.name]) || 0;
          if(!runtime.levelObjectHasValues(archived) && !runtime.levelObjectHasValues(active)) return "";
          const diff=inventoryDifferenceObject(runtime.simplifyUpByLevel(active),runtime.simplifyUpByLevel(archived));
          return renderArchivedInventorySnapshotBlock({
            title:item.name,
            side:item.side,
            rows:[
              {label:"Archived<br>Inventory",obj:archived,itemName:item.name,techPoints:archivedTech},
              {label:"Active<br>Inventory",obj:active,itemName:item.name,techPoints:activeTech}
            ],
            extraHtml:renderSingleCompactRow("Inventory<br>Difference",renderCompactDifferenceBoxes(diff,allItemLevels),{labelCol:"50px"})
          });
        }).filter(Boolean).join("");
        archiveStack.insertAdjacentHTML("beforeend",renderArchivedInventoryCard(entry,expanded,itemBlocks));
      });
    }

    function inventoryLevelRangeToggleMarkup(itemName){
      const active=inventoryLevelRangeForItem(itemName);
      const safeName=runtime.uiEscapeAttr(itemName);
      // range filter tabs are tabs2 xs; the one-action wrapper wiring (toggleInventoryLevelRange).
      return `
        <span class="tabs2 tabs2--xs tabs2--neutral" style="--tabs-cols:2" role="button" tabindex="0" aria-label="Toggle inventory level range for ${safeName}" data-action="toggleInventoryLevelRange" data-action-event="click" data-arg0="${safeName}">
          <button type="button" tabindex="-1" class="tabs2__tab ${active!=="8-12" ? "active" : ""}" aria-pressed="${active!=="8-12" ? "true" : "false"}">1-7</button>
          <button type="button" tabindex="-1" class="tabs2__tab ${active==="8-12" ? "active" : ""}" aria-pressed="${active==="8-12" ? "true" : "false"}">8-12</button>
        </span>
      `;
    }

    function activeInventoryTitleMarkup(itemName, showRangeToggle=true){
      return `<span class="stack2 stack2--inline stack2--row stack2--gap-2 stack2--align-center inventory-item-title-row"><span>${itemName}</span>${showRangeToggle ? inventoryLevelRangeToggleMarkup(itemName) : ""}</span>`;
    }

    function renderActiveInvCell(itemName,level,values){
      const safeName=runtime.uiEscapeAttr(itemName);
      const value=(values||{})[level]||"";
      // value-box2 sm stepper with step-ghost buttons, label above. setInventory/adjustInventory wiring.
      return `
        <span class="value-box2-unit value-box2-unit--above">
          <span class="value-box2__label value-box2__label--above">L${level}</span>
          <div class="value-box2 value-box2--sm value-box2--manual value-box2--stepper">
            <button type="button" class="button2 button2--sm button2--step-ghost" data-action="adjustInventory" data-action-event="click" data-arg0="${safeName}" data-arg1="${level}" data-arg2="-1" data-arg2-type="number">&minus;</button>
            <span class="value-box2__content"><input class="value-box2__input" data-input-key="inventory-${safeName}-${level}" type="number" min="0" step="1" inputmode="numeric" value="${value}" placeholder="0" data-action="setInventory" data-action-event="input" data-arg0="${safeName}" data-arg1="${level}" data-source2="value" /></span>
            <button type="button" class="button2 button2--sm button2--step-ghost" data-action="adjustInventory" data-action-event="click" data-arg0="${safeName}" data-arg1="${level}" data-arg2="1" data-arg2-type="number">+</button>
          </div>
        </span>
      `;
    }

    function renderStandardInventoryInputGrid(itemName, levels, values, options={}){
      const shown=(levels||[]).filter(level=>Number(level)<=7).sort((a,b)=>b-a);
      // fixed-2 engine grid, min-lg, gap-md, fill, bottom-up, maxItemWidth 50%;
      // stepper cells are DIRECT children so the engine builds the row/item tree.
      return `<div class="grid2 grid2--min-lg grid2--gap-md grid2--fill grid2--align-center" data-grid2 data-grid2-cols="2" data-grid2-direction="bottom-up" data-grid2-max-width="50%">
        ${shown.map(level=>renderActiveInvCell(itemName,level,values)).join("")}
      </div>`;
    }

    function highLevelTechMarkup(itemName,options={}){
      const selected=highLevelForItem(itemName);
      const techPoints=techPointsForItem(itemName);
      const required=requiredTechPointsForLevel(selected);
      const left=Math.max(required-techPoints,0);
      const percent=required>0 ? Math.min(100,Math.floor((techPoints/required)*100)) : (selected===12 ? 100 : 0);
      // box row — the Tech Points box keeps its modal trigger (openTechPointsModal)
      // but wears the derived/readonly look like the Required / Left boxes; progress is progress-bar2.
      return `
          <div class="stack2 stack2--row stack2--gap-4 ${options.hideLeft ? "stack2--justify-center" : "stack2--fill"}">
            <span class="value-box2-unit value-box2-unit--above">
              <span class="value-box2__label value-box2__label--above">Tech Points</span>
              <div class="value-box2 value-box2--sm value-box2--derived value-box2--modal">
                <span class="value-box2__content"><input class="value-box2__input" data-tech-points-input-for="${runtime.uiEscapeAttr(itemName)}" data-input-key="inventory-tech-${itemName}" type="text" inputmode="none" readonly value="${techPoints||""}" placeholder="0" data-action="openTechPointsModal" data-action-event="click" data-arg0="${runtime.uiEscapeAttr(itemName)}" /></span>
              </div>
            </span>
            <span class="value-box2-unit value-box2-unit--above">
              <span class="value-box2__label value-box2__label--above">Required</span>
              <output class="value-box2 value-box2--sm value-box2--derived value-box2--readonly"><span class="value-box2__value" data-tech-required-for="${runtime.uiEscapeAttr(itemName)}">${required ? runtime.roundNice(required) : "—"}</span></output>
            </span>
            ${options.hideLeft ? "" : `<span class="value-box2-unit value-box2-unit--above">
              <span class="value-box2__label value-box2__label--above">Left</span>
              <output class="value-box2 value-box2--sm value-box2--derived value-box2--readonly"><span class="value-box2__value" data-tech-left-for="${runtime.uiEscapeAttr(itemName)}">${required ? runtime.roundNice(left) : "—"}</span></output>
            </span>`}
          </div>
          <div class="progress-bar2 progress-bar2--sm progress-bar2--primary">
            <div class="progress-bar2__track"><div class="progress-bar2__fill" data-tech-progress-fill-for="${runtime.uiEscapeAttr(itemName)}" style="width:${percent}%"></div></div>
            <span class="progress-bar2__percent" data-tech-progress-percent-for="${runtime.uiEscapeAttr(itemName)}">${percent}%</span>
          </div>
      `;
    }

    function renderHighLevelInventoryPanel(itemName,options={}){
      const selected=highLevelForItem(itemName);
      const extraContentHtml=options.extraContentHtml || "";
      // the L12–L8 selector is pill-select2 with --pill-select-cols:5; selection runs on
      // the JS-toggled .active (state-bridge), setInventoryHighLevel wiring.
      return `
        <div class="stack2 stack2--column stack2--gap-3">
          <div class="pill-select2 pill-select2--sm" style="--pill-select-cols:5" role="radiogroup" aria-label="Current high level for ${runtime.uiEscapeAttr(itemName)}">
            ${[12,11,10,9,8].map(level=>`
              <button type="button" class="pill-select2__option ${selected===level ? "active" : ""}" data-action="setInventoryHighLevel" data-action-event="click" data-arg0="${runtime.uiEscapeAttr(itemName)}" data-arg1="${level}" aria-pressed="${selected===level ? "true" : "false"}">L${level}</button>
            `).join("")}
          </div>
          ${highLevelTechMarkup(itemName,options)}
          ${extraContentHtml}
        </div>
      `;
    }

    function balancedLevelRows(count){
      const known={
        1:[1],2:[2],3:[3],4:[4],5:[5],6:[6],7:[7],8:[8],9:[4,5],10:[5,5],11:[5,6],12:[6,6]
      };
      if(known[count]) return known[count];
      const rows=[];
      let remaining=count;
      while(remaining>0){
        const take=remaining>8 ? Math.min(6,remaining) : Math.min(8,remaining);
        rows.push(take);
        remaining-=take;
      }
      return rows;
    }

    function researchPercentForItem(itemName,level){
      const required=requiredTechPointsForLevel(level);
      if(level===12 && required===0) return 100;
      if(!required) return 0;
      return Math.min(100,Math.floor((techPointsForItem(itemName)/required)*100));
    }

    function renderEquippedInventoryBar(itemName,values,level){
      const isHighLevel=Number(level)>=8;
      const detail=isHighLevel ? `${researchPercentForItem(itemName,level)}%` : `Qty ${runtime.roundNice((values||{})[level]||0)}`;
      const toneClass=uiValueBoxLevelTone(level);
      // derived readonly-strip value-box, full width; label start / level center / qty end.
      // The highest-level item gets the equipped status and level-rarity tone.
      return `
        <output class="value-box2 value-box2--md value-box2--derived value-box2--readonly-strip ${toneClass}">
          <span class="value-box2__strip-label">Equipped</span>
          <span class="value-box2__strip-main">L${level}</span>
          <span class="value-box2__strip-meta">${detail}</span>
        </output>
      `;
    }

    function renderOwnedInventoryPillRows(values,levels,itemName=""){
      // hide-unacquired duplicate rows are read-only pill2 display: default mode, sm size,
      // sm min, level label inside, level-rarity tone. No qty inputs in this snapshot row.
      const shown=(levels || []).filter(level=>Number((values||{})[level]||0)>0).sort((a,b)=>b-a);
      if(!shown.length) return "";
      return runtime.renderLevelPillGrid(values||{},{
        levels:shown,
        labelPlacement:"inside",
        pillSize:"sm",
        min:"sm",
        compact:false,
        minPerRow:3,
        valueFormatter:value=>String(runtime.roundNice(value))
      });
    }

    function renderHideUnacquiredInventoryBody(itemName,values,visibleLevels,showHighLevelProgress){
      const shown=(visibleLevels || []).filter(level=>Number((values||{})[level]||0)>0).sort((a,b)=>b-a);
      if(!shown.length && !showHighLevelProgress) return "";
      const equippedOnly=!!(runtime.state.ui && runtime.state.ui.inventoryEquippedOnly);
      const equippedLevel=shown.length ? shown[0] : highLevelForItem(itemName);
      const duplicateLevels=equippedOnly ? [] : shown.filter(level=>level!==equippedLevel);
      const equippedMarkup=equippedLevel ? renderEquippedInventoryBar(itemName,values,equippedLevel) : "";
      const pillRows=renderOwnedInventoryPillRows(values,duplicateLevels,itemName);
      const techMarkup=showHighLevelProgress ? `<div class="stack2 stack2--column stack2--gap-3 stack2--align-stretch">${highLevelTechMarkup(itemName,{hideLeft:true})}</div>` : "";
      // a .stack2 holds the equipped strip + the .grid2 of other items;
      // "equipped only" empties duplicateLevels so the grid is absent.
      return `<div class="stack2 stack2--column stack2--gap-2">${equippedMarkup}${pillRows}${techMarkup}</div>`;
    }

    function renderActiveInventoryInputGrid(itemName, levels, values, options={}){
      const range=options.range || inventoryLevelRangeForItem(itemName);
      if(range==="8-12" && !options.snapshotMode){
        return renderHighLevelInventoryPanel(itemName);
      }
      return renderStandardInventoryInputGrid(itemName, levels, values, {range});
    }

    function sideFilterMarkupCompact(prefix, active){
      const setter = prefix==="inventoryInput" ? "setInventoryInputFilter" : "setUpgradedOwnedFilter";
      return `
        <div class="tabs2-unit tabs2-unit--label-left tabs2-unit--fill">
          <span class="tabs2__label tabs2__label--size-12">Filter:</span>
          ${runtime.renderFilterTabs({idPrefix:prefix,active,setter,labels:{left:"Left",right:"Right",all:"All"}})}
        </div>
      `;
    }

    function inventoryDifferenceObject(active, archived){
      const diff={};
      allItemLevels.forEach(level=>{
        const value=Math.floor(Number((active||{})[level]||0))-Math.floor(Number((archived||{})[level]||0));
        if(value!==0) diff[level]=value;
      });
      return diff;
    }

    function renderCompactDifferenceBoxes(obj, levels){
      // bare shared compact pills (sit directly in a labeled-rows row body — no grid wrapper).
      // Semantic tones: gain → positive, loss → warn.
      const shown=levels.filter(level=>Number((obj||{})[level]||0)!==0);
      if(!shown.length) return runtime.renderEmptyState({title:'',message:'No Change',className:'notice2 notice2--empty',compact:true});
      return shown.map(level=>{
        const value=Number(obj[level]||0);
        const display=value>0 ? `+${runtime.roundNice(value)}` : String(runtime.roundNice(value));
        return renderCompactPill({level,value:display,type:value>0 ? "gain" : "loss",className:"diff-cell"});
      }).join("");
    }

    function makeSideHeader(sideLabel, includeHideToggle=false, hideUnacquired=false){
      const equippedOnly=!!(runtime.state.ui && runtime.state.ui.inventoryEquippedOnly);
      const toggles=includeHideToggle ? `
        <div class="stack2 stack2--row stack2--gap-2 stack2--align-center stack2--justify-end stack2--wrap card2__action">
          ${hideUnacquired ? `<label class="toggle2 toggle2--text${equippedOnly ? " toggle2--active" : ""}">
            <input class="toggle2__input" type="checkbox" ${equippedOnly ? "checked" : ""} data-action="setInventoryEquippedOnly" data-action-event="change" data-source0="checked" />
            <span class="toggle2__label">Equipped only</span>
          </label>` : ""}
          <label class="toggle2 toggle2--text${hideUnacquired ? " toggle2--active" : ""}">
            <input class="toggle2__input" type="checkbox" ${hideUnacquired ? "checked" : ""} data-action="setHideUnacquiredInventory" data-action-event="change" data-source0="checked" />
            <span class="toggle2__label">Hide unacquired</span>
          </label>
        </div>
      ` : "";
      return `
        <div class="card2 card2--md card2--muted" style="margin-top:12px">
          <div class="card2__header">
            <div class="card2__heading">
              <div class="card2__text card2__text--left">
                <div class="card2__title">${sideLabel}</div>
              </div>
              ${toggles}
            </div>
          </div>
        </div>
      `;
    }

    function updateInventoryAdvancedTabs(){
      const mode=(runtime.state.inventoryAdvancedMode==="summary") ? "summary" : "breakdown";
      const breakdownTab=runtime.byId("inventoryAdvancedBreakdownTab");
      const summaryTab=runtime.byId("inventoryAdvancedSummaryTab");
      const breakdownPanel=runtime.byId("inventoryAdvancedBreakdownPanel");
      const summaryPanel=runtime.byId("inventoryAdvancedSummaryPanel");

      if(breakdownTab) breakdownTab.classList.toggle("active",mode==="breakdown");
      if(summaryTab) summaryTab.classList.toggle("active",mode==="summary");

      if(breakdownPanel) breakdownPanel.hidden=mode!=="breakdown";
      if(summaryPanel) summaryPanel.hidden=mode!=="summary";

      if(mode==="breakdown" && typeof runtime.renderBreakdownEstimatedInventory==="function"){
        runtime.renderBreakdownEstimatedInventory();
      }
      if(mode==="summary" && typeof runtime.renderItemPlanSummary==="function"){
        runtime.renderItemPlanSummary();
      }
    }




    function inventoryViewMoreInfoMarkup(){
      return `
        <div class="card2 card2--white card2--xs card2--collapsible" id="inventoryViewMoreInfo" data-more-info-section>
          <button class="card2__header card2__header--toggle card2__collapse-toggle" type="button" data-action="toggleCard" data-action-event="click" data-arg0="inventoryViewMoreInfo">
            <div class="card2__heading">
              <div class="card2__title card2__custom-header">More Information</div>
              <div class="card2__chev">⌄</div>
            </div>
          </button>
          <div class="card2__content card2__content--after-header stack2 stack2--column stack2--gap-2">
            <div class="card2__body"><strong>Combined Inventory</strong> shows your estimated full inventory after applying saved item plans.</div>
            <div class="card2__body">It combines <strong>Current Inventory</strong>, which is what you manually entered, with <strong>Calculated Inventory</strong>, which is what the app estimates from saved item plans.</div>
            <div class="card2__body">Use Combined Inventory when you want to see what your inventory should look like after planned random chests, choice chests, allocated non-target items, and unassigned random items are included.</div>
            <div class="card2__body"><strong>Calculated Inventory</strong> shows only the items added from saved item plans. It does not include your manually entered Current Inventory.</div>
            <div class="card2__body">Calculated Inventory can include estimated target-item duplicates, guaranteed choice-chest duplicates, allocated non-target items, and <strong>Random Items Unassigned</strong>.</div>
            <div class="card2__body"><strong>Combined Inventory</strong> = Current Inventory + Calculated Inventory.</div>
            <div class="card2__body"><strong>Calculated Inventory</strong> = only the additional items from item plans.</div>
            <div class="card2__body">If an item appears in Combined Inventory but not Calculated Inventory, that item came only from Current Inventory. If an item appears in Calculated Inventory, it was added by one or more saved item plans.</div>
          </div>
        </div>
      `;
    }

    function renderInventory(){
      const list=runtime.byId("inventoryList");
      const upgraded=runtime.byId("upgradedInventoryList");
      if(!list || !upgraded) return;

      list.innerHTML="";
      upgraded.innerHTML="";

      const archiveMode=runtime.state.inventoryArchiveMode || "active";
      if(archiveMode==="archived"){
        renderArchivedInventoryList(list);
        upgraded.insertAdjacentHTML("beforeend", upgradedViewModeMarkup(runtime.state.upgradedOwnedViewMode || "combined"));
        upgraded.insertAdjacentHTML("beforeend", runtime.renderEmptyState({title:'Archived Inventory Selected',message:'Switch back to Active Inventory to edit current values.',className:'notice2 notice2--empty'}));
        updateUpgradedOwnedViewTabs(runtime.state.upgradedOwnedViewMode || "combined");
        return;
      }

      const inputFilter=runtime.state.inventoryInputFilter || "all";
      const upgradedFilter=runtime.state.upgradedOwnedFilter || "all";
      const upgradedViewMode=runtime.state.upgradedOwnedViewMode || "combined";
      const hideUnacquired=!!runtime.state.hideUnacquiredInventory;

      const inventoryControls=document.createElement("div");
      inventoryControls.className="stack2 stack2--column stack2--gap-3";
      inventoryControls.innerHTML=`${inventoryArchiveTabsMarkup("active")}${sideFilterMarkupCompact("inventoryInput", inputFilter)}`;
      list.appendChild(inventoryControls);

      const upgradedControls=document.createElement("div");
      upgradedControls.className="stack2 stack2--column stack2--gap-0.5";
      upgradedControls.innerHTML=`${upgradedViewModeMarkup(upgradedViewMode)}${sideFilterMarkupCompact("upgradedOwned", upgradedFilter)}`;
      upgraded.appendChild(upgradedControls);

      const renderInventoryInputSection=(sideLabel)=>{
        const side=sideLabel.toLowerCase();
        if(!runtime.shouldShowSide(side,inputFilter)) return null;

        const sideSection=document.createElement("div");
        sideSection.className="stack2 stack2--column stack2--gap-3";
        sideSection.insertAdjacentHTML("beforeend", makeSideHeader(sideLabel,true,hideUnacquired));
        list.appendChild(sideSection);

        ravenItems.filter(item=>item.side===side).forEach(item=>{
          const card=document.createElement("div");

          const itemInventory=(runtime.state.inventory.active && runtime.state.inventory.active[item.name]) || {};
          const selectedRange=inventoryLevelRangeForItem(item.name);
          const rangeLevels=hideUnacquired ? allItemLevels : inventoryInputLevelsForRange(item.name);
          const visibleLevels=rangeLevels.filter(level=>{
            if(!hideUnacquired) return true;
            return Number(itemInventory?.[level]||0)>0;
          });
          const selectedHighLevel=highLevelForItem(item.name);
          const hasTechPoints=techPointsForItem(item.name)>0;
          const showHighLevelProgress=selectedHighLevel>0 || hasTechPoints;

          if(hideUnacquired && !visibleLevels.length && !showHighLevelProgress) return;

          const cardClasses=["active-inventory-card"];
          if(hideUnacquired){
            cardClasses.push("inventory-card-hide-unacquired");
            if(showHighLevelProgress) cardClasses.push("has-high-level-tech");
            if(visibleLevels.length<=4) cardClasses.push("single-pill-row");
          }else{
            cardClasses.push("inventory-card-no-hu");
            cardClasses.push(selectedRange==="8-12" ? "range-8-12-card" : "range-1-7-card");
          }

          card.innerHTML=renderInventoryItemCard({
            className:cardClasses.join(" "),
            title:activeInventoryTitleMarkup(item.name,!hideUnacquired),
            side:item.side,
            bodyHtml:hideUnacquired
              ? renderHideUnacquiredInventoryBody(item.name,itemInventory,visibleLevels,showHighLevelProgress)
              : renderActiveInventoryInputGrid(item.name, visibleLevels, itemInventory, {range:selectedRange})
          });
          sideSection.appendChild(card.firstElementChild);
        });

        return sideSection;
      };

      const renderUpgradedSideSection=(sideLabel)=>{
        const side=sideLabel.toLowerCase();
        if(!runtime.shouldShowSide(side,upgradedFilter)) return null;

        const sideSection=document.createElement("div");
        sideSection.className="stack2 stack2--column stack2--gap-3";
        sideSection.insertAdjacentHTML("beforeend", makeSideHeader(sideLabel,false,false));
        upgraded.appendChild(sideSection);

        let renderedCount=0;

        ravenItems.filter(item=>item.side===side).forEach(item=>{
          const calculated=runtime.projectedAdditionsForInventoryItem(item.name);
          const sourceObject = upgradedViewMode==="calculated"
            ? calculated
            : runtime.combinedInventoryForItem(item.name);

          const simplified=runtime.simplifyUpByLevel(sourceObject);
          if(!runtime.levelObjectHasValues(simplified)) return;

          const upCard=document.createElement("div");
          upCard.innerHTML=renderInventoryItemCard({
            title:item.name,
            side:item.side,
            bodyHtml:renderCompactLevelBoxes(simplified,allItemLevels,{itemName:item.name,levelValue:true})
          });
          sideSection.appendChild(upCard.firstElementChild);
          renderedCount++;
        });

        const randomTotal=runtime.totalRandomLeftoversBySide(side);
        if(runtime.levelObjectHasValues(randomTotal)){
          const randomCard=document.createElement("div");
          randomCard.innerHTML=renderInventoryItemCard({
            title:"Random Items Left Over",
            subtitle:"Could be for any item on this side.",
            side,
            bodyHtml:renderCompactLevelBoxes(randomTotal,chestLevels,{levelValue:true})
          });
          sideSection.appendChild(randomCard.firstElementChild);
          renderedCount++;
        }

        if(renderedCount===0){
          const empty=document.createElement("div");
          empty.className="notice2 notice2--empty";
          empty.innerHTML = upgradedViewMode==="calculated"
            ? "No additional items for this side detected from item plans."
            : "No <strong>Current Inventory</strong> inputs or estimated items from item plans detected for this side.";
          sideSection.appendChild(empty);
        }

        return sideSection;
      };

      renderInventoryInputSection("LEFT");
      renderInventoryInputSection("RIGHT");

      const upgradedLeftSection=renderUpgradedSideSection("LEFT");
      const upgradedRightSection=renderUpgradedSideSection("RIGHT");
      const finalUpgradedSection=upgradedRightSection || upgradedLeftSection;
      const moreInfo=document.createElement("div");
      moreInfo.innerHTML=inventoryViewMoreInfoMarkup();
      if(finalUpgradedSection) finalUpgradedSection.appendChild(moreInfo.firstElementChild);
      else upgraded.appendChild(moreInfo.firstElementChild);

      updateSideFilterTabs("inventoryInput", inputFilter);
      updateSideFilterTabs("upgradedOwned", upgradedFilter);
      updateUpgradedOwnedViewTabs(upgradedViewMode);
      runtime.renderBreakdownEstimatedInventory();
      runtime.renderInventoryRandomTables();
      updateInventoryAdvancedTabs();
      initAllGrids(runtime.root || document);
    }


// Legacy globals
Object.assign(window,{
  renderCompactPill,
  renderCompactPillRow,
  renderCompactLevelBoxes,
  getInventoryItemDisplayModel,
  renderInventoryDisplayPills
});

  return {
    updateSideFilterTabs,
    sideFilterMarkup,
    updateUpgradedOwnedViewTabs,
    upgradedViewModeMarkup,
    inventoryLevelRangeForItem,
    inventoryInputLevelsForRange,
    inventoryLevelRangeToggleMarkup,
    sideFilterMarkupCompact,
    renderCompactPill,
    renderCompactPillRow,
    renderCompactLevelBoxes,
    getInventoryItemDisplayModel,
    renderInventoryDisplayPills,
    highLevelTechMarkup,
    renderHighLevelInventoryPanel,
    inventoryDifferenceObject,
    renderCompactDifferenceBoxes,
    makeSideHeader,
    updateInventoryAdvancedTabs,
    inventoryViewMoreInfoMarkup,
    inventoryArchiveTabsMarkup,
    archiveSideFilterMarkup,
    compactInventoryCompareRows,
    renderArchivedInventoryList,
    renderInventory
  };
}
