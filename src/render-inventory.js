// Inventory rendering and view helpers.

    function updateSideFilterTabs(prefix, filter){
      ["left","right","all"].forEach(value=>{
        const el=document.getElementById(prefix+"-"+value);
        if(el) el.classList.toggle("active", value===filter);
      });
    }

    function sideFilterMarkup(prefix, active){
      const setter = prefix==="inventoryInput" ? "setInventoryInputFilter" : "setUpgradedOwnedFilter";
      return `
        <div class="side-filter-tabs">
          <button id="${prefix}-left" class="tab ${active==="left" ? "active" : ""}" data-action="${setter}" data-action-event="click" data-arg0="left">Left</button>
          <button id="${prefix}-right" class="tab ${active==="right" ? "active" : ""}" data-action="${setter}" data-action-event="click" data-arg0="right">Right</button>
          <button id="${prefix}-all" class="tab ${active==="all" ? "active" : ""}" data-action="${setter}" data-action-event="click" data-arg0="all">All Items</button>
        </div>
      `;
    }

    function updateUpgradedOwnedViewTabs(mode){
      ["combined","calculated"].forEach(value=>{
        const el=document.getElementById("upgradedView-"+value);
        if(el) el.classList.toggle("active", value===mode);
      });
    }

    function upgradedViewModeMarkup(active){
      return `
        <div class="inventory-view-tabs">
          <button id="upgradedView-combined" class="tab ${active==="combined" ? "active" : ""}" data-action="setUpgradedOwnedViewMode" data-action-event="click" data-arg0="combined">Combined Inventory</button>
          <button id="upgradedView-calculated" class="tab ${active==="calculated" ? "active" : ""}" data-action="setUpgradedOwnedViewMode" data-action-event="click" data-arg0="calculated">Calculated Inventory</button>
        </div>
        <div class="inventory-view-note">
          ${active==="combined"
            ? "Combines your inventory with all item plan results."
            : "Shows only projected additions from saved plans."}
        </div>
      `;
    }

    function renderOwnedLevelList(obj, levels){
      const shown=levelsWithValues(obj,levels);
      if(!shown.length){
        return renderEmptyState({title:'',message:'No acquired items yet.',className:'empty-message',compact:true});
      }
      return `
        <div class="owned-level-list">
          ${shown.map(level=>`
            <div class="owned-level-line">
              <span class="level">L${level}</span>
              <span>${roundNice(obj[level])}</span>
            </div>
          `).join("")}
        </div>
      `;
    }

    function sideFilterMarkupCompact(prefix, active){
      const setter = prefix==="inventoryInput" ? "setInventoryInputFilter" : "setUpgradedOwnedFilter";
      return `
        <div class="subtle-filter-row">
          <span>Filter:</span>
          ${renderFilterTabs({idPrefix:prefix,active,setter,labels:{left:"Left",right:"Right",all:"All"}})}
        </div>
      `;
    }

function renderCompactLevelBoxes(obj, levels){
      return renderLevelPillGrid(obj,{levels,emptyHtml:""});
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
      const shown=levels.filter(level=>Number((obj||{})[level]||0)!==0);
      if(!shown.length) return renderEmptyState({title:'',message:'No Change',className:'empty-message',compact:true});
      return `
        <div class="compact-readout-grid diff-grid">
          ${shown.map(level=>{
            const value=Number(obj[level]||0);
            const display=value>0 ? `+${roundNice(value)}` : String(roundNice(value));
            return `<div class="compact-readout-cell diff-cell ${value>0 ? "positive" : "negative"}"><div class="th">L${level}</div><div class="td">${display}</div></div>`;
          }).join("")}
        </div>
      `;
    }
    function makeSideHeader(sideLabel, includeHideToggle=false, hideUnacquired=false){
      return `
        <div class="side-section-header">
          <div class="side-section-title">${sideLabel}</div>
          ${includeHideToggle ? `
            <label class="hide-unacquired-inline">
              <input type="checkbox" ${hideUnacquired ? "checked" : ""} data-action="setHideUnacquiredInventory" data-action-event="change" data-source0="checked" />
              <span>Hide unacquired</span>
            </label>
          ` : ""}
        </div>
      `;
    }

    function updateInventoryAdvancedTabs(){
      const mode=(state.inventoryAdvancedMode==="summary") ? "summary" : "breakdown";
      const breakdownTab=document.getElementById("inventoryAdvancedBreakdownTab");
      const summaryTab=document.getElementById("inventoryAdvancedSummaryTab");
      const breakdownPanel=document.getElementById("inventoryAdvancedBreakdownPanel");
      const summaryPanel=document.getElementById("inventoryAdvancedSummaryPanel");

      if(breakdownTab) breakdownTab.classList.toggle("active",mode==="breakdown");
      if(summaryTab) summaryTab.classList.toggle("active",mode==="summary");

      if(breakdownPanel) breakdownPanel.classList.toggle("hidden",mode!=="breakdown");
      if(summaryPanel) summaryPanel.classList.toggle("hidden",mode!=="summary");

      if(mode==="breakdown" && typeof renderBreakdownEstimatedInventory==="function"){
        renderBreakdownEstimatedInventory();
      }
      if(mode==="summary" && typeof renderItemPlanSummary==="function"){
        renderItemPlanSummary();
      }
    }




    function inventoryViewMoreInfoMarkup(){
      return renderCollapsibleCard({
        id:"inventoryViewMoreInfo",
        className:"more-info-card inventory-view-more-info-card",
        openClass:"more-info-open",
        title:"More Information",
        titleClass:"more-info-title",
        bodyClass:"more-info-body",
        buttonClass:"more-info-toggle",
        toggleFn:"toggleInventoryViewMoreInfo()",
        attrs:"data-more-info-section",
        bodyHtml:`
          <p><strong>Combined Inventory</strong> shows your estimated full inventory after applying saved item plans.</p>
          <p>It combines <strong>Current Inventory</strong>, which is what you manually entered, with <strong>Calculated Inventory</strong>, which is what the app estimates from saved item plans.</p>
          <p>Use Combined Inventory when you want to see what your inventory should look like after planned random chests, choice chests, allocated non-target items, and unassigned random items are included.</p>
          <p><strong>Calculated Inventory</strong> shows only the items added from saved item plans. It does not include your manually entered Current Inventory.</p>
          <p>Calculated Inventory can include estimated target-item duplicates, guaranteed choice-chest duplicates, allocated non-target items, and <strong>Random Items Unassigned</strong>.</p>
          <p><strong>Combined Inventory</strong> = Current Inventory + Calculated Inventory.</p>
          <p><strong>Calculated Inventory</strong> = only the additional items from item plans.</p>
          <p>If an item appears in Combined Inventory but not Calculated Inventory, that item came only from Current Inventory. If an item appears in Calculated Inventory, it was added by one or more saved item plans.</p>
        `
      });
    }

    function inventoryArchiveTabsMarkup(active){
      return `
        <div class="inventory-view-tabs archive-master-tabs">
          <button class="tab ${active!=="archived" ? "active" : ""}" data-action="setInventoryArchiveMode" data-action-event="click" data-arg0="active">Active Inventory</button>
          <button class="tab ${active==="archived" ? "active" : ""}" data-action="setInventoryArchiveMode" data-action-event="click" data-arg0="archived">Archived Inventory</button>
        </div>
      `;
    }

    function archiveSideFilterMarkup(active){
      return `
        <div class="subtle-filter-row archive-filter-row">
          <span>Filter:</span>
          ${renderFilterTabs({active,setter:"setInventoryArchiveFilter",labels:{left:"Left",right:"Right",all:"All"}})}
        </div>
      `;
    }

    function compactInventoryCompareRows(labelsAndObjects){
      return renderCompactInventoryRows(labelsAndObjects,{
        pillRenderer: obj=>renderCompactLevelBoxes(simplifyUpByLevel(obj||{}),allItemLevels) || renderEmptyState({title:'',message:'None',className:'empty-message',compact:true})
      });
    }

    function renderArchivedInventoryList(list){
      const archives=Array.isArray(state.inventoryArchives) ? state.inventoryArchives : [];
      const filter=state.inventoryArchiveFilter || "all";
      state.inventoryArchiveExpanded=state.inventoryArchiveExpanded || {};
      list.insertAdjacentHTML("beforeend", inventoryArchiveTabsMarkup("archived"));
      list.insertAdjacentHTML("beforeend", archiveSideFilterMarkup(filter));
      if(!archives.length){
        list.insertAdjacentHTML("beforeend", renderEmptyState({title:'No archived inventories yet.',message:'Saved inventory snapshots will appear here.',className:'empty-message saved-empty'}));
        return;
      }
      archives.forEach(entry=>{
        const expanded=!!state.inventoryArchiveExpanded[entry.id];
        const date=entry.savedAt ? new Date(entry.savedAt).toLocaleString() : "Archived inventory";
        const itemBlocks=ravenItems.filter(item=>filter==="all" || item.side===filter).map(item=>{
          const archived=(entry.inventory||{})[item.name]||{};
          const active=(state.inventory.active||{})[item.name]||{};
          if(!levelObjectHasValues(archived) && !levelObjectHasValues(active)) return "";
          const diff=inventoryDifferenceObject(simplifyUpByLevel(active),simplifyUpByLevel(archived));
          return renderInventorySnapshotBlock({
            title:item.name,
            side:item.side,
            rows:[
              {label:"Archived Inventory",obj:archived},
              {label:"Active Inventory",obj:active}
            ],
            rowRenderer:compactInventoryCompareRows,
            extraHtml:renderSingleCompactRow("Inventory Difference",renderCompactDifferenceBoxes(diff,allItemLevels),{wrapperClass:"scenario-compact-view inventory-difference-row"})
          });
        }).filter(Boolean).join("");
        list.insertAdjacentHTML("beforeend",renderCompactActionCard({
          className:"saved-scenario-card inventory-archive-card compact-saved-card",
          expanded,
          onclick:`toggleInventoryArchiveSnapshot('${entry.id}')`,
          title:entry.name||"Inventory Snapshot",
          subtitle:date,
          note:entry.note || "",
          actions:[
            {label:"Load",className:"ghost-btn",onclick:`loadInventorySnapshot('${entry.id}')`},
            {label:"Delete",className:"danger-btn",onclick:`deleteInventorySnapshot('${entry.id}')`}
          ],
          dropdownClass:"archive-items-wrap saved-snapshot-dropdown",
          dropdownHtml:itemBlocks || renderEmptyState({title:'',message:'Snapshot is empty for this filter.',className:'empty-message',compact:true})
        }));
      });
    }

    function renderInventory(){
      const list=document.getElementById("inventoryList");
      const upgraded=document.getElementById("upgradedInventoryList");
      if(!list || !upgraded) return;

      list.innerHTML="";
      upgraded.innerHTML="";

      const archiveMode=state.inventoryArchiveMode || "active";
      if(archiveMode==="archived"){
        renderArchivedInventoryList(list);
        upgraded.insertAdjacentHTML("beforeend", upgradedViewModeMarkup(state.upgradedOwnedViewMode || "combined"));
        upgraded.insertAdjacentHTML("beforeend", renderEmptyState({title:'Archived Inventory Selected',message:'Switch back to Active Inventory to edit current values.',className:'section-empty-message'}));
        updateUpgradedOwnedViewTabs(state.upgradedOwnedViewMode || "combined");
        return;
      }

      const inputFilter=state.inventoryInputFilter || "all";
      const upgradedFilter=state.upgradedOwnedFilter || "all";
      const upgradedViewMode=state.upgradedOwnedViewMode || "combined";
      const hideUnacquired=!!state.hideUnacquiredInventory;

      list.insertAdjacentHTML("beforeend", inventoryArchiveTabsMarkup("active"));
      list.insertAdjacentHTML("beforeend", sideFilterMarkupCompact("inventoryInput", inputFilter));

      upgraded.insertAdjacentHTML("beforeend", upgradedViewModeMarkup(upgradedViewMode));
      upgraded.insertAdjacentHTML("beforeend", sideFilterMarkupCompact("upgradedOwned", upgradedFilter));

      const renderInventoryInputSection=(sideLabel)=>{
        const side=sideLabel.toLowerCase();
        if(!shouldShowSide(side,inputFilter)) return;

        const heading=document.createElement("div");
        heading.innerHTML=makeSideHeader(sideLabel,true,hideUnacquired);
        list.appendChild(heading.firstElementChild);

        ravenItems.filter(item=>item.side===side).forEach(item=>{
          const card=document.createElement("div");

          const visibleLevels=allItemLevels.filter(level=>{
            if(!hideUnacquired) return true;
            return Number(state.inventory.active[item.name]?.[level]||0)>0;
          });

          if(hideUnacquired && !visibleLevels.length) return;

          card.innerHTML=renderInventoryItemCard({
            title:item.name,
            side:item.side,
            bodyHtml:renderLevelInputGrid({
              itemName:item.name,
              levels:visibleLevels,
              values:state.inventory.active[item.name] || {}
            })
          });
          list.appendChild(card.firstElementChild);
        });
      };

      const renderUpgradedSideSection=(sideLabel)=>{
        const side=sideLabel.toLowerCase();
        if(!shouldShowSide(side,upgradedFilter)) return;

        const heading=document.createElement("div");
        heading.innerHTML=makeSideHeader(sideLabel,false,false);
        upgraded.appendChild(heading.firstElementChild);

        let renderedCount=0;

        ravenItems.filter(item=>item.side===side).forEach(item=>{
          const calculated=projectedAdditionsForInventoryItem(item.name);
          const sourceObject = upgradedViewMode==="calculated"
            ? calculated
            : combinedInventoryForItem(item.name);

          const simplified=simplifyUpByLevel(sourceObject);
          if(!levelObjectHasValues(simplified)) return;

          const upCard=document.createElement("div");
          upCard.innerHTML=renderInventoryItemCard({
            title:item.name,
            side:item.side,
            bodyHtml:renderCompactLevelBoxes(simplified,allItemLevels)
          });
          upgraded.appendChild(upCard.firstElementChild);
          renderedCount++;
        });

        const randomTotal=totalRandomLeftoversBySide(side);
        if(levelObjectHasValues(randomTotal)){
          const randomCard=document.createElement("div");
          randomCard.innerHTML=renderInventoryItemCard({
            title:"Random Items Left Over",
            subtitle:"Could be for any item on this side.",
            side,
            bodyHtml:renderCompactLevelBoxes(randomTotal,chestLevels)
          });
          upgraded.appendChild(randomCard.firstElementChild);
          renderedCount++;
        }

        if(renderedCount===0){
          const empty=document.createElement("div");
          empty.className="section-empty-message";
          empty.innerHTML = upgradedViewMode==="calculated"
            ? "No additional items for this side detected from item plans."
            : "No <strong>Current Inventory</strong> inputs or estimated items from item plans detected for this side.";
          upgraded.appendChild(empty);
        }
      };

      renderInventoryInputSection("LEFT");
      renderInventoryInputSection("RIGHT");

      renderUpgradedSideSection("LEFT");
      renderUpgradedSideSection("RIGHT");
      upgraded.insertAdjacentHTML("beforeend", inventoryViewMoreInfoMarkup());

      updateSideFilterTabs("inventoryInput", inputFilter);
      updateSideFilterTabs("upgradedOwned", upgradedFilter);
      updateUpgradedOwnedViewTabs(upgradedViewMode);
      renderBreakdownEstimatedInventory();
      renderInventoryRandomTables();
      updateInventoryAdvancedTabs();
    }


// v1.0.13 module bridge exports
Object.assign(window,{
  renderCompactLevelBoxes
});
