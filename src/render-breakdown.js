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
        <div class="more-info-card inventory-explain-card" id="inventoryBreakdownExplain">
          <button class="more-info-toggle" onclick="toggleInventoryBreakdownExplain()">
            <div class="more-info-title">Explain this section.</div>
            <div class="chev">⌄</div>
          </button>
          <div class="more-info-body">
            <p><strong>Inventory Summary</strong> shows how item-plan results become estimated inventory.</p>
            <p><strong>Random Chests Used</strong> shows source inputs. <span class="explain-neutral">Neutral pills</span> are manual random chests. <span class="explain-green">Green pills</span> are top-up random chests.</p>
            <p><strong>Raw Duplicates</strong> are duplicate gear for the card's item from random or choice chests. Choice chest source values may use <span class="explain-gold">gold pills</span> when they came from redeemed bank/top-up choice chests.</p>
            <p><strong>Final Target Item Added</strong> is the duplicate result credited to that item.</p>
            <p><strong>Allocated Non-target Items</strong> shows non-target gear assigned by destination: <span class="explain-blue">blue</span> for <span class="side-text-left">Left Inventory</span> and <span class="explain-purple">purple</span> for <span class="side-text-right">Right Inventory</span>.</p>
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

      ravenItems.forEach(item=>{
        if(!shouldShowSide(item.side,filter)) return;

        const itemName=item.name;
        const outputs=computePlanOutputsForItem(itemName);
        const rawPlan=computeRawItemPlan(itemName);
        const contributionDetails=duplicateContributionDetailsForItem(itemName,itemName);
        const duplicatesFromOtherPlans=duplicatesFromOtherRawPlans(itemName,itemName);
        const currentInventory=(rawPlan && rawPlan.currentInventory) || ((state.inventory && state.inventory[itemName]) || {});

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
        const hasCurrentInventory=levelObjectHasValues(currentInventory || {});
        const hasOtherDuplicates=levelObjectHasValues(duplicatesFromOtherPlans || {});

        if(!hasRandomUsed && !hasRandomTarget && !hasChoice && !hasAssignable && !hasFinal && !hasCurrentInventory && !hasOtherDuplicates) return;

        const badgeClass=item.side==="right" ? "side-badge right" : "side-badge";
        const card=document.createElement("div");
        card.className="breakdown-source-card";
        card.setAttribute("data-source-item",itemName);

        const contributionRows=contributionDetails.length ? contributionDetails.map(detail=>`
          <div class="contribution-row">
            <div class="contribution-source">${detail.sourceItem} plan</div>
            ${renderRawPills(detail.values || {},"calculated")}
          </div>
        `).join("") : `<div class="empty-message" style="margin-top:0;">No duplicate contributions from other plans.</div>`;

        card.innerHTML=`
          <button class="breakdown-source-toggle" type="button" onclick="toggleBreakdownSource(this)">
            <div class="breakdown-source-title">
              <div class="breakdown-source-name">${itemName}</div>
            </div>
            <div class="breakdown-source-right">
              <div class="${badgeClass}">${item.side.toUpperCase()}</div>
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
                    <div class="breakdown-line-title">Raw Duplicates for ${itemName} - Random Chests</div>
                    ${renderRawPills(outputs.rawTargetRandom || {},"calculated")}
                  </div>
                ` : ""}
              </div>
            ` : ""}

            ${hasChoice ? `
              <div class="breakdown-line">
                <div class="breakdown-line-title">Raw Duplicates for ${itemName} - Choice Chests</div>
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
                <div class="breakdown-line-title">Allocated Non-target Items</div>
                ${renderNontargetTChart(outputs.rawAssignedLeft || {}, outputs.rawAssignedRight || {})}
              </div>
            ` : ""}

            ${(hasCurrentInventory || hasOtherDuplicates) ? `
              <div class="breakdown-line allocated-other-plans-line">
                <div class="breakdown-line-title">Allocated ${itemName} Duplicates From Other Plans</div>
                <div class="contribution-row">
                  <div class="contribution-source">Starting Inventory</div>
                  ${renderRawPills(currentInventory || {},"calculated")}
                </div>
                <div class="contribution-row">
                  <div class="contribution-source">Other Plans Total</div>
                  ${renderRawPills(duplicatesFromOtherPlans || {},"calculated")}
                </div>
                <details class="show-more-contributions">
                  <summary>Show more</summary>
                  <div class="contribution-detail-list">${contributionRows}</div>
                </details>
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
        empty.textContent="No inventory summary values detected yet.";
        wrap.appendChild(empty);
      }

      wrap.insertAdjacentHTML("beforeend", inventoryBreakdownExplainMarkup());
    }



    function itemPlanHasAnyActivity(itemName){
      const outputs=computePlanOutputsForItem(itemName);
      return levelObjectHasValues((state.inventory && state.inventory[itemName]) || {})
        || levelObjectHasValues(outputs.manualRandom || {})
        || levelObjectHasValues(outputs.topUpRandom || {})
        || levelObjectHasValues(outputs.rawManualChoice || {})
        || levelObjectHasValues(outputs.rawRedeemedChoice || {})
        || levelObjectHasValues(outputs.rawTargetRandom || {})
        || levelObjectHasValues(outputs.rawChoice || {})
        || levelObjectHasValues(outputs.randomLeft || {})
        || levelObjectHasValues(outputs.randomRight || {});
    }

    function renderPlanSummaryPills(entries){
      if(!entries.length) return `<div class="empty-message" style="margin-top:0;">None.</div>`;
      return `<div class="plan-summary-pill-grid">
        ${entries.map(entry=>`
          <div class="plan-summary-pill ${entry.className || ""}">
            <div class="pill-level">L${entry.level}</div>
            <div class="pill-qty">${Math.floor(Number(entry.value||0))}</div>
            <div class="pill-source">${entry.label}</div>
          </div>
        `).join("")}
      </div>`;
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
      pushEntries(outputs.topUpRandom || {},"random","topup","Random Top Up","random-topup");

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
      if(!levels.length) return `<div class="empty-message" style="margin-top:0;">None.</div>`;
      return `<div class="raw-pill-grid">
        ${levels.map(level=>{
          const parts=[];
          const left=Math.floor(Number((leftObj||{})[level]||0));
          const right=Math.floor(Number((rightObj||{})[level]||0));
          if(left>0) parts.push(`L: ${left}`);
          if(right>0) parts.push(`R: ${right}`);
          return `
            <div class="raw-pill summary-leftover">
              <div class="pill-level">L${level}</div>
              <div class="pill-qty">${parts.join(" / ")}</div>
            </div>
          `;
        }).join("")}
      </div>`;
    }

    function planLevelRemaindersForSide(pool, divisor){
      const remainder={};
      Object.keys(pool||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(pool[levelKey]||0));
        const rem=value % divisor;
        if(rem>0) remainder[level]=rem;
      });
      return remainder;
    }

    function planRandomLeftoversBySide(sourceItem, outputs){
      return {
        left: planLevelRemaindersForSide(outputs.randomLeft || {}, sourceItem.side==="left" ? 2 : 3),
        right: planLevelRemaindersForSide(outputs.randomRight || {}, sourceItem.side==="right" ? 2 : 3)
      };
    }



    function planSummaryShareLevelObject(pool,divisor){
      const result={};
      const safeDivisor=Math.max(1,Math.floor(Number(divisor||1)));
      Object.keys(pool||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        const value=Math.floor(Number(pool[levelKey]||0));
        const share=Math.floor(value/safeDivisor);
        if(share>0) result[level]=share;
      });
      return result;
    }

    function duplicateCreditsForItemFromOtherPlans(inventoryItemName, excludeSourceName){
      const total={};
      ravenItems.forEach(sourceItem=>{
        const sourceName=sourceItem.name;
        if(sourceName===excludeSourceName) return;

        const outputs=computePlanOutputsForItem(sourceName);

        if(sourceName===inventoryItemName){
          addObjects(total, outputs.additionalOwned || {});
          return;
        }

        const sameSideItems=otherItemsOnSide(sourceItem.side,sourceName);
        const oppositeSide=sourceItem.side==="left" ? "right" : "left";
        const oppositeItems=itemsBySide(oppositeSide);

        if(sameSideItems.includes(inventoryItemName)){
          const divisor=sourceItem.side==="left" ? 2 : 3;
          addObjects(total, planSummaryShareLevelObject(outputs.randomLeft || {}, divisor));
        }

        if(oppositeItems.includes(inventoryItemName)){
          const divisor=sourceItem.side==="right" ? 2 : 3;
          addObjects(total, planSummaryShareLevelObject(outputs.randomRight || {}, divisor));
        }
      });
      return total;
    }

    function calculatedItemPlanInventoryRaw(itemName,targetRaw){
      return addLevelObjects((state.inventory && state.inventory[itemName]) || {}, targetRaw || {});
    }

    function totalCalculatedInventoryRaw(itemName,targetRaw,otherPlanDuplicates){
      return addLevelObjects(
        (state.inventory && state.inventory[itemName]) || {},
        targetRaw || {},
        otherPlanDuplicates || {}
      );
    }


    function renderItemPlanSummary(){
      const wrap=document.getElementById("itemPlanSummaryList");
      if(!wrap) return;
      wrap.innerHTML="";

      let rendered=0;

      ravenItems.forEach(sourceItem=>{
        const sourceName=sourceItem.name;
        const rawPlan=computeRawItemPlan(sourceName);
        const outputs=computePlanOutputsForItem(sourceName);
        const badgeClass=sourceItem.side==="right" ? "side-badge right" : "side-badge";
        const targetRaw=targetDuplicatesForPlanRaw(rawPlan);
        const calculatedItemPlanInventory=calculatedItemPlanInventoryRawFromPlan(rawPlan);
        const duplicatesFromOtherPlans=duplicatesFromOtherRawPlans(sourceName,sourceName);
        const totalCalculatedInventory=totalCalculatedInventoryRawFromPlan(rawPlan);
        const planLeftovers=(rawPlan && rawPlan.randomItemsLeftover) || {left:{},right:{}};

        const card=document.createElement("div");
        card.className="breakdown-source-card item-plan-summary-card";
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
            <div class="plan-summary-note">Plan-level audit view. Intended for identifying anomalies in the logic.</div>

            <div class="breakdown-line">
              <div class="breakdown-line-title">Current Inventory</div>
              ${renderRawPills((rawPlan && rawPlan.currentInventory) || {},"calculated")}
            </div>

            <div class="breakdown-line">
              <div class="breakdown-line-title">Random &amp; Choice Chests Used</div>
              ${renderPlanSummaryPills(chestsUsedSummaryEntries(outputs))}
            </div>

            <div class="breakdown-line">
              <div class="breakdown-line-title">Estimated Target Items (RAW)</div>
              ${renderRawPills(targetRaw || {},"calculated")}
            </div>
<div class="breakdown-line plan-summary-calculation-line">
              <div class="breakdown-line-title">Calculated Item Plan Inventory (RAW)</div>
              ${renderRawPills(calculatedItemPlanInventory || {},"calculated")}
            </div>

            <div class="breakdown-line plan-summary-calculation-line">
              <div class="breakdown-line-title">${sourceName} Duplicates From Other Plans:</div>
              ${renderRawPills(duplicatesFromOtherPlans || {},"calculated")}
            </div>

            <div class="breakdown-line plan-summary-calculation-line audit-total-line">
              <div class="audit-total-heading">
                <div class="breakdown-line-title">Total Calculated Inventory</div>
                <label class="audit-simplify-toggle">
                  <input type="checkbox" onchange="this.closest('.audit-total-line').querySelector('.audit-total-raw').classList.toggle('hidden',this.checked); this.closest('.audit-total-line').querySelector('.audit-total-simplified').classList.toggle('hidden',!this.checked);" />
                  <span>Simplify</span>
                </label>
              </div>
              <div class="audit-total-raw">${renderRawPills(totalCalculatedInventory || {},"final")}</div>
              <div class="audit-total-simplified hidden">${renderRawPills(simplifyUpByLevel(totalCalculatedInventory || {}),"final")}</div>
            </div>

            <div class="breakdown-line">
              <div class="breakdown-line-title">Non-target Items (LEFT)</div>
              ${renderRawPills((rawPlan && rawPlan.nontargetPools && rawPlan.nontargetPools.left) || {},"left-dest")}
            </div>

            <div class="breakdown-line">
              <div class="breakdown-line-title">Non-target Items (RIGHT)</div>
              ${renderRawPills((rawPlan && rawPlan.nontargetPools && rawPlan.nontargetPools.right) || {},"right-dest")}
            </div>

            <div class="breakdown-line">
              <div class="breakdown-line-title">Random Items Unassigned</div>
              ${renderSideLeftoverPills(planLeftovers.left || {}, planLeftovers.right || {})}
            </div>

            <div class="breakdown-line plan-summary-control-line">
              <div class="breakdown-line-title">Balance Check</div>
              <div class="plan-summary-control-grid">
                <div><span>Random Chests</span><strong>${rawPlan.audit.randomChestCount}</strong></div>
                <div><span>Generated</span><strong>${rawPlan.audit.generatedCount}</strong></div>
                <div><span>Target</span><strong>${rawPlan.audit.targetRandomCount}</strong></div>
                <div><span>Non-target</span><strong>${rawPlan.audit.nontargetCount}</strong></div>
                <div><span>Allocated</span><strong>${rawPlan.audit.allocatedCount}</strong></div>
                <div><span>Leftover</span><strong>${rawPlan.audit.leftoverCount}</strong></div>
                <div class="${rawPlan.audit.balances ? "ok" : "bad"}"><span>Balance</span><strong>${rawPlan.audit.balances ? "OK" : "CHECK"}</strong></div>
              </div>
            </div>
          </div>
        `;

        wrap.appendChild(card);
        rendered++;
      });

      if(rendered===0){
        const empty=document.createElement("div");
        empty.className="section-empty-message";
        empty.textContent="No item plans detected yet.";
        wrap.appendChild(empty);
      }
    }
