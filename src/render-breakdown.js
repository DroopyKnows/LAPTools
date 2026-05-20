// Estimated inventory breakdown rendering helpers.

    function renderRawPills(obj,type){
      const levels=levelsWithValues(obj,allItemLevels);
      if(!levels.length) return `<div class="empty-message" style="margin-top:0;">None.</div>`;
      return `<div class="raw-pill-grid">
        ${levels.map(level=>`
          <div class="raw-pill ${type||""}">
            <div class="pill-level">L${level}</div>
            <div class="pill-qty">${Math.floor(Number(obj[level]||0))}</div>
          </div>
        `).join("")}
      </div>`;
    }

    function renderMixedRandomPills(manualObj,topUpObj){
      const entries=[];
      Object.keys(manualObj||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(manualObj[levelKey]||0));
        if(value>0) entries.push({level,value,type:"manual"});
      });
      Object.keys(topUpObj||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(topUpObj[levelKey]||0));
        if(value>0) entries.push({level,value,type:"topup"});
      });

      entries.sort((a,b)=>{
        if(b.level!==a.level) return b.level-a.level;
        if(a.type===b.type) return 0;
        return a.type==="manual" ? -1 : 1;
      });

      if(!entries.length) return `<div class="empty-message" style="margin-top:0;">None.</div>`;

      return `<div class="raw-pill-grid">
        ${entries.map(entry=>`
          <div class="raw-pill ${entry.type}">
            <div class="pill-level">L${entry.level}</div>
            <div class="pill-qty">${Math.floor(entry.value)}</div>
          </div>
        `).join("")}
      </div>`;
    }

    function renderMixedChoicePills(manualObj,bankObj){
      const entries=[];
      Object.keys(manualObj||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(manualObj[levelKey]||0));
        if(value>0) entries.push({level,value,type:"choice"});
      });
      Object.keys(bankObj||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(bankObj[levelKey]||0));
        if(value>0) entries.push({level,value,type:"bank"});
      });

      entries.sort((a,b)=>{
        if(b.level!==a.level) return b.level-a.level;
        if(a.type===b.type) return 0;
        return a.type==="choice" ? -1 : 1;
      });

      if(!entries.length) return `<div class="empty-message" style="margin-top:0;">None.</div>`;

      return `<div class="raw-pill-grid">
        ${entries.map(entry=>`
          <div class="raw-pill ${entry.type}">
            <div class="pill-level">L${entry.level}</div>
            <div class="pill-qty">${Math.floor(entry.value)}</div>
          </div>
        `).join("")}
      </div>`;
    }

    function breakdownFilterMarkup(active){
      const current=active || "all";
      return `
        <div class="breakdown-filter-row">
          <span>Filter:</span>
          <div class="side-filter-tabs compact">
            <button class="tab ${current==="left" ? "active" : ""}" onclick="setBreakdownInventoryFilter('left')">Left</button>
            <button class="tab ${current==="right" ? "active" : ""}" onclick="setBreakdownInventoryFilter('right')">Right</button>
            <button class="tab ${current==="all" ? "active" : ""}" onclick="setBreakdownInventoryFilter('all')">All</button>
          </div>
        </div>
      `;
    }

    function renderNontargetTChart(leftObj,rightObj){
      const leftHtml=levelObjectHasValues(leftObj || {})
        ? renderRawPills(leftObj || {},"left-dest")
        : `<div class="nontarget-t-empty">None</div>`;
      const rightHtml=levelObjectHasValues(rightObj || {})
        ? renderRawPills(rightObj || {},"right-dest")
        : `<div class="nontarget-t-empty">None</div>`;
      return `
        <div class="nontarget-t-chart">
          <div class="nontarget-t-col">
            <div class="nontarget-t-heading"><span class="side-text-left">Left Inventory</span></div>
            <div class="nontarget-t-pill-grid">${leftHtml}</div>
          </div>
          <div class="nontarget-t-col">
            <div class="nontarget-t-heading"><span class="side-text-right">Right Inventory</span></div>
            <div class="nontarget-t-pill-grid">${rightHtml}</div>
          </div>
        </div>
      `;
    }

    function inventoryBreakdownExplainMarkup(){
      return `
        <div class="more-info-card" id="inventoryBreakdownExplain">
          <button class="more-info-toggle" onclick="toggleInventoryBreakdownExplain()">
            <div class="more-info-title">Explain this section.</div>
            <div class="chev">⌄</div>
          </button>
          <div class="more-info-body">
            <p>Each collapsible item card is an audit trail for that saved Specific Item plan. Manual Left/Right calculator mode is not included because it is not connected to inventory.</p>
            <p>The <strong>Random Chest source group</strong> connects <strong>Random Chests Used</strong> with <strong>Raw Duplicates for that item From Random Chests</strong>. Those two rows are grouped together because the second row is the calculated output from the first row.</p>
            <p><strong>Raw Duplicates for that item From Choice Chests</strong> is separate because choice chests are guaranteed item selections and do not use random-chest probability.</p>
            <p><strong>Final Target Item Added</strong> is the simplified/upgraded target-item result from the random and choice duplicate sources above. It is credited to the Raven item shown at the top of that card.</p>
            <p><strong>Assignable Nontarget Items</strong> is a destination T-chart showing what can be credited to <span class="side-text-left">Left Inventory</span> and <span class="side-text-right">Right Inventory</span>.</p>
            <p><span class="explain-neutral">Neutral/default pills</span> are calculated results or regular/manual values where source color is not needed. <span class="explain-green">Green pills</span> identify top-up random chest source values. <span class="explain-gold">Gold pills</span> identify redeemed/banked/top-up choice source values. In Assignable Nontarget Items, <span class="explain-blue">blue pills</span> identify <span class="side-text-left">Left Inventory</span> destination values and <span class="explain-purple">purple pills</span> identify <span class="side-text-right">Right Inventory</span> destination values.</p>
          </div>
        </div>
      `;
    }

    function renderBreakdownEstimatedInventory(){
      const wrap=document.getElementById("breakdownEstimatedInventoryList");
      if(!wrap) return;
      wrap.innerHTML="";

      const filter=state.breakdownInventoryFilter || "all";
      wrap.insertAdjacentHTML("beforeend", breakdownFilterMarkup(filter));

      let rendered=0;

      ravenItems.forEach(sourceItem=>{
        if(!shouldShowSide(sourceItem.side,filter)) return;

        const sourceName=sourceItem.name;
        const outputs=computePlanOutputsForItem(sourceName);

        const hasManualRandom=levelObjectHasValues(outputs.manualRandom || {});
        const hasTopUpRandom=levelObjectHasValues(outputs.topUpRandom || {});
        const hasRandomUsed=hasManualRandom || hasTopUpRandom;
        const hasRandomTarget=levelObjectHasValues(outputs.rawTargetRandom || {});
        const hasChoice=levelObjectHasValues(outputs.rawManualChoice || {}) || levelObjectHasValues(outputs.rawRedeemedChoice || {});
        const hasLeft=levelObjectHasValues(outputs.rawAssignedLeft || {});
        const hasRight=levelObjectHasValues(outputs.rawAssignedRight || {});
        const hasAssignable=hasLeft || hasRight;
        const finalContribution=finalBreakdownContribution(outputs);
        const hasFinal=levelObjectHasValues(finalContribution || {});

        if(!hasRandomUsed && !hasRandomTarget && !hasChoice && !hasAssignable && !hasFinal) return;

        const badgeClass=sourceItem.side==="right" ? "side-badge right" : "side-badge";
        const card=document.createElement("div");
        card.className="breakdown-source-card";
        card.setAttribute("data-source-item",sourceName);

        card.innerHTML=`
          <button class="breakdown-source-toggle" type="button" onclick="toggleBreakdownSource(this)">
            <div class="breakdown-source-title">
              <div class="breakdown-source-name">${sourceName}</div>
            </div>
            <div class="breakdown-source-right">
              <div class="${badgeClass}">${sourceItem.side.toUpperCase()}</div>
              <div class="breakdown-card-chev">⌄</div>
            </div>
          </button>
          <div class="breakdown-source-body">
            ${(hasRandomUsed || hasRandomTarget) ? `
              <div class="breakdown-random-group">
                ${hasRandomUsed ? `
                  <div class="breakdown-line">
                    <div class="breakdown-line-title">Random Chests Used</div>
                    ${renderMixedRandomPills(outputs.manualRandom || {}, outputs.topUpRandom || {})}
                  </div>
                ` : ""}
                ${hasRandomTarget ? `
                  <div class="breakdown-line">
                    <div class="breakdown-line-title">Raw Duplicates for ${sourceName} - Random Chests</div>
                    ${renderRawPills(outputs.rawTargetRandom || {},"calculated")}
                  </div>
                ` : ""}
              </div>
            ` : ""}

            ${hasChoice ? `
              <div class="breakdown-line">
                <div class="breakdown-line-title">Raw Duplicates for ${sourceName} - Choice Chests</div>
                ${renderMixedChoicePills(outputs.rawManualChoice || {}, outputs.rawRedeemedChoice || {})}
              </div>
            ` : ""}

            ${hasFinal ? `
              <div class="breakdown-line breakdown-final-line">
                <div class="breakdown-line-title">Final Target Item Added</div>
                ${renderRawPills(finalContribution || {},"final")}
              </div>
            ` : ""}

            ${hasAssignable ? `
              <div class="breakdown-line">
                <div class="breakdown-line-title">Assignable Nontarget Items</div>
                ${renderNontargetTChart(outputs.rawAssignedLeft || {}, outputs.rawAssignedRight || {})}
              </div>
            ` : ""}
          </div>
        `;

        wrap.appendChild(card);
        rendered++;
      });

      if(rendered===0){
        const empty=document.createElement("div");
        empty.className="section-empty-message";
        empty.textContent="No estimated inventory acquired from item plans yet.";
        wrap.appendChild(empty);
      }

      wrap.insertAdjacentHTML("beforeend", inventoryBreakdownExplainMarkup());
    }
