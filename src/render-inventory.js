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
          <button id="${prefix}-left" class="tab ${active==="left" ? "active" : ""}" onclick="${setter}('left')">Left</button>
          <button id="${prefix}-right" class="tab ${active==="right" ? "active" : ""}" onclick="${setter}('right')">Right</button>
          <button id="${prefix}-all" class="tab ${active==="all" ? "active" : ""}" onclick="${setter}('all')">All Items</button>
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
          <button id="upgradedView-combined" class="tab ${active==="combined" ? "active" : ""}" onclick="setUpgradedOwnedViewMode('combined')">Combined Inventory</button>
          <button id="upgradedView-calculated" class="tab ${active==="calculated" ? "active" : ""}" onclick="setUpgradedOwnedViewMode('calculated')">Calculated Inventory</button>
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
        return `<div class="empty-message">No acquired items yet.</div>`;
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
          <div class="side-filter-tabs compact">
            <button id="${prefix}-left" class="tab ${active==="left" ? "active" : ""}" onclick="${setter}('left')">Left</button>
            <button id="${prefix}-right" class="tab ${active==="right" ? "active" : ""}" onclick="${setter}('right')">Right</button>
            <button id="${prefix}-all" class="tab ${active==="all" ? "active" : ""}" onclick="${setter}('all')">All</button>
          </div>
        </div>
      `;
    }

function renderCompactLevelBoxes(obj, levels){
      const shown=levelsWithValues(obj,levels);
      if(!shown.length) return "";
      return `
        <div class="compact-readout-grid">
          ${shown.map(level=>`
            <div class="compact-readout-cell">
              <div class="th">L${level}</div>
              <div class="td">${roundNice(obj[level])}</div>
            </div>
          `).join("")}
        </div>
      `;
    }

    function makeSideHeader(sideLabel, includeHideToggle=false, hideUnacquired=false){
      return `
        <div class="side-section-header">
          <div class="side-section-title">${sideLabel}</div>
          ${includeHideToggle ? `
            <label class="hide-unacquired-inline">
              <input type="checkbox" ${hideUnacquired ? "checked" : ""} onchange="setHideUnacquiredInventory(this.checked)" />
              <span>Hide unacquired</span>
            </label>
          ` : ""}
        </div>
      `;
    }

    function updateInventoryAdvancedTabs(){
      const mode=state.inventoryAdvancedMode || "breakdown";
      const breakdownTab=document.getElementById("inventoryAdvancedBreakdownTab");
      const leftoverTab=document.getElementById("inventoryAdvancedLeftoverTab");
      const breakdownPanel=document.getElementById("inventoryAdvancedBreakdownPanel");
      const leftoverPanel=document.getElementById("inventoryAdvancedLeftoverPanel");

      if(breakdownTab) breakdownTab.classList.toggle("active",mode==="breakdown");
      if(leftoverTab) leftoverTab.classList.toggle("active",mode==="leftover");
      if(breakdownPanel) breakdownPanel.classList.toggle("hidden",mode!=="breakdown");
      if(leftoverPanel) leftoverPanel.classList.toggle("hidden",mode!=="leftover");
    }

    function renderInventory(){
      const list=document.getElementById("inventoryList");
      const upgraded=document.getElementById("upgradedInventoryList");
      if(!list || !upgraded) return;

      list.innerHTML="";
      upgraded.innerHTML="";

      const inputFilter=state.inventoryInputFilter || "all";
      const upgradedFilter=state.upgradedOwnedFilter || "all";
      const upgradedViewMode=state.upgradedOwnedViewMode || "combined";
      const hideUnacquired=!!state.hideUnacquiredInventory;

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
          const badgeClass=item.side==="right" ? "side-badge right" : "side-badge";
          const card=document.createElement("div");
          card.className="inventory-item";

          const visibleLevels=allItemLevels.filter(level=>{
            if(!hideUnacquired) return true;
            return Number(state.inventory[item.name]?.[level]||0)>0;
          });

          if(hideUnacquired && !visibleLevels.length) return;

          card.innerHTML=`
            <div class="inventory-head">
              <div class="item-name">${item.name}</div>
              <div class="${badgeClass}">${item.side.toUpperCase()}</div>
            </div>
            <div class="mini-grid">
              ${visibleLevels.map(level=>`
                <div class="mini-cell">
                  <label>L${level}</label>
                  <input type="number" min="0" step="1" value="${state.inventory[item.name]?.[level]||""}" placeholder="0" oninput="setInventory('${item.name}',${level},this.value)" />
                </div>
              `).join("")}
            </div>
          `;
          list.appendChild(card);
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
          const badgeClass=item.side==="right" ? "side-badge right" : "side-badge";
          const calculated=projectedAdditionsForInventoryItem(item.name);
          const sourceObject = upgradedViewMode==="calculated"
            ? calculated
            : combinedInventoryForItem(item.name);

          const simplified=simplifyUpByLevel(sourceObject);
          if(!levelObjectHasValues(simplified)) return;

          const upCard=document.createElement("div");
          upCard.className="inventory-item";
          upCard.innerHTML=`
            <div class="inventory-head">
              <div class="item-name">${item.name}</div>
              <div class="${badgeClass}">${item.side.toUpperCase()}</div>
            </div>
            ${renderCompactLevelBoxes(simplified,allItemLevels)}
          `;
          upgraded.appendChild(upCard);
          renderedCount++;
        });

        const randomTotal=totalRandomLeftoversBySide(side);
        if(levelObjectHasValues(randomTotal)){
          const randomBadgeClass=side==="right" ? "side-badge right" : "side-badge";
          const randomCard=document.createElement("div");
          randomCard.className="inventory-item";
          randomCard.innerHTML=`
            <div class="inventory-head">
              <div>
                <div class="item-name">Random Items Left Over</div>
                <div class="random-leftover-subtext">Could be for any item on this side.</div>
              </div>
              <div class="${randomBadgeClass}">${sideLabel}</div>
            </div>
            ${renderCompactLevelBoxes(randomTotal,chestLevels)}
          `;
          upgraded.appendChild(randomCard);
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

      updateSideFilterTabs("inventoryInput", inputFilter);
      updateSideFilterTabs("upgradedOwned", upgradedFilter);
      updateUpgradedOwnedViewTabs(upgradedViewMode);
      renderBreakdownEstimatedInventory();
      renderInventoryRandomTables();
      updateInventoryAdvancedTabs();
    }
