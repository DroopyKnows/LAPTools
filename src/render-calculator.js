// Calculator rendering and result-table helpers.

    function buildStepper(containerId,group,levels){
      const wrap=document.getElementById(containerId);
      wrap.innerHTML="";
      const obj=getGroupObject(group);

      levels.forEach(level=>{
        const row=document.createElement("div");
        row.className="level-row";
        row.innerHTML=`
          <div>
            <div class="level-name">Level ${level}</div>
            <div class="level-help">Quantity</div>
          </div>
          <div class="stepper">
            <button onclick="adjustGroup('${group}',${level},-1)">−</button>
            <input type="number" min="0" step="1" value="${obj[level]||""}" placeholder="0" oninput="setGroupValue('${group}',${level},this.value)" />
            <button onclick="adjustGroup('${group}',${level},1)">+</button>
          </div>
        `;
        wrap.appendChild(row);
      });
    
      renderBundleAppliedSummary("chestsBundleAppliedSummary");
      renderChoiceBankRedeem("chestsChoiceBankRedeem");
    }

    function renderTopUpBundles(){
      ensureBankObjects();
      const wrap=document.getElementById("topUpBundlesContent");
      if(!wrap) return;

      const bundleCard=(key)=>{
        const def=topUpBundleDefinitions[key];
        const qty=Math.floor(Number(currentTopUpBundleObject()[key]||0));
        return `
          <div class="bundle-card">
            <div class="bundle-card-head">
              <div class="bundle-card-title">${def.title}</div>
              <div class="bundle-qty-control">
                <button onclick="adjustBundleQty('${key}',-1)">−</button>
                <input type="number" min="0" step="1" value="${qty || ""}" placeholder="0" oninput="setBundleQty('${key}',this.value)" />
                <button onclick="adjustBundleQty('${key}',1)">+</button>
              </div>
            </div>
            ${makeBundlePills(def.random,"random",def.choice)}
          </div>
        `;
      };

      wrap.innerHTML=`
        <div class="section-sub">Quickly add chest quantities based on popular top up options.</div>

        <div class="bundle-summary" id="topUpBundleAppliedSummary"></div>
        <div id="topUpChoiceBankRedeem"></div>

        <div class="bundle-section">
          <div class="bundle-section-title">Daily Must-Buy</div>
          ${bundleCard("daily1")}
          ${bundleCard("daily2")}
        </div>

        <div class="bundle-section">
          <div class="bundle-section-title">Weekly Special</div>
          ${bundleCard("weekly")}
        </div>

        <div class="button-row">
          
          <button class="danger-btn" onclick="resetTopUpsForCurrentItem()">Reset Top Ups for this item</button>
        </div>
      `;

      renderBundleAppliedSummary("topUpBundleAppliedSummary");
      renderChoiceBankRedeem("topUpChoiceBankRedeem");
    }

    function buildCombinedChestInputs(containerId,levels){
      const wrap=document.getElementById(containerId);
      if(!wrap) return;
      wrap.innerHTML="";

      const plan=currentPlanObject();
      const guaranteed=currentGuaranteedObject();

      levels.forEach(level=>{
        const row=document.createElement("div");
        row.className="compact-chest-row";
        row.innerHTML=`
          <div class="compact-chest-level">Lvl ${level}</div>
          <div class="compact-chest-field">
            <label>Random</label>
            <input type="number" min="0" step="1" value="${plan[level]||""}" placeholder="0" oninput="setGroupValue('plan',${level},this.value)" />
          </div>
          <div class="compact-chest-field">
            <label>Choice</label>
            <input type="number" min="0" step="1" value="${guaranteed[level]||""}" placeholder="0" oninput="setGroupValue('guaranteed',${level},this.value)" />
          </div>
        `;
        wrap.appendChild(row);
      });
    }

    function renderOwnedInputs(){
      const levels=visibleOwnedLevels();
      buildStepper("ownedInputs","owned",levels);
    }

    function renderPlanInputs(){
      const showHigh=document.getElementById("showHighRandom")?.checked;
      const levels=showHigh ? [7,6,5,4,3,2,1] : [5,4,3,2,1];

      if(document.getElementById("combinedChestInputs")){
        buildCombinedChestInputs("combinedChestInputs",levels);
        return;
      }

      buildStepper("planInputs","plan",levels);
    }

    function renderGuaranteedInputs(){
      const showHigh=document.getElementById("showHighRandom")?.checked || document.getElementById("showHighGuaranteed")?.checked;
      const levels=showHigh ? [7,6,5,4,3,2,1] : guaranteedDefaultLevels;

      if(document.getElementById("combinedChestInputs")){
        buildCombinedChestInputs("combinedChestInputs",levels);
        return;
      }

      buildStepper("guaranteedInputs","guaranteed",levels);
    }

    function makeUsageQuickAdjustSummary(id,obj,group,emptyMessage,topUpObj){
      const wrap=document.getElementById(id);
      if(!wrap) return;
      wrap.innerHTML="";
      const manualEntries=Object.keys(obj||{}).map(k=>({level:Number(k), value:Number(obj[k]||0)})).filter(x=>x.value>0).sort((a,b)=>b.level-a.level);
      const sourceEntries=Object.keys(topUpObj||{}).map(k=>({level:Number(k), value:Number(topUpObj[k]||0)})).filter(x=>x.value>0).sort((a,b)=>b.level-a.level);
      const quick = group==="plan" ? !!state.quickAdjustRandom : !!state.quickAdjustChoice;
      if(!manualEntries.length && !sourceEntries.length){
        const msg=document.createElement("div");
        msg.className="empty-message";
        msg.textContent=emptyMessage;
        wrap.appendChild(msg);
        return;
      }
      const renderPills=(entries,cls)=>{
        const pills=document.createElement("div");
        pills.className=quick && group==="plan" ? "quick-topup-pill-grid" : "compact-usage-pills";
        entries.forEach(entry=>{
          const pill=document.createElement("div");
          pill.className=cls;
          pill.innerHTML=`<div class="pill-level">L${entry.level}</div><div class="pill-qty">${Math.floor(entry.value)}</div>`;
          pills.appendChild(pill);
        });
        wrap.appendChild(pills);
      };
      if(!quick){
        if(manualEntries.length){
          if(sourceEntries.length){
            const label=document.createElement("div");
            label.className="usage-source-label";
            label.textContent=group==="guaranteed" ? "Manual Choice Chests" : "Manual";
            wrap.appendChild(label);
          }
          renderPills(manualEntries,"compact-usage-pill");
        }
        if(sourceEntries.length){
          const label=document.createElement("div");
          label.className="usage-source-label";
          label.textContent=group==="guaranteed" ? (mode==="manual" ? "Top Up Bundle Choice Chests" : "Redeemed From Choice Chest Bank") : "Top Up Bundles";
          wrap.appendChild(label);
          renderPills(sourceEntries,group==="guaranteed" ? "compact-usage-pill manual-topup-choice" : "compact-usage-pill topup");
        }
        return;
      }
      if(manualEntries.length){
        const label=document.createElement("div");
        label.className="source-subtitle";
        label.textContent=group==="guaranteed" ? "Manual Choice Chests" : "Manual Random Chests";
        wrap.appendChild(label);
        manualEntries.forEach(entry=>{
          const line=document.createElement("div");
          line.className="quick-adjust-line";
          line.innerHTML=`<span>Lvl ${entry.level}</span><span class="quick-adjust-controls"><button onclick="adjustGroup('${group}',${entry.level},-1)">−</button><input type="number" min="0" step="1" value="${Math.floor(entry.value)}" oninput="setGroupValue('${group}',${entry.level},this.value)" /><button onclick="adjustGroup('${group}',${entry.level},1)">+</button></span>`;
          wrap.appendChild(line);
        });
      }
      if(sourceEntries.length){
        const label=document.createElement("div");
        label.className="source-subtitle";
        label.textContent=group==="guaranteed" ? (mode==="manual" ? "Top Up Bundle Choice Chests" : "Redeemed From Choice Chest Bank") : "Top Up Bundles";
        wrap.appendChild(label);
        if(group==="guaranteed" && mode==="specific"){
          sourceEntries.forEach(entry=>{
            const line=document.createElement("div");
            line.className="bank-adjust-line";
            line.innerHTML=`<span>Lvl ${entry.level}</span><span class="quick-adjust-controls"><button onclick="adjustRedeemedChoice(${entry.level},-1)">−</button><input type="number" min="0" step="1" value="${Math.floor(entry.value)}" oninput="setRedeemedChoice(${entry.level},this.value)" /><button onclick="redeemChoiceFromBank(${entry.level},1)">+</button></span>`;
            wrap.appendChild(line);
          });
        }else{
          renderPills(sourceEntries,group==="guaranteed" ? "compact-usage-pill manual-topup-choice" : "compact-usage-pill topup");
        }
      }
    }

    function makeTable(id,levels,values){
      const grid=document.getElementById(id);
      grid.className="result-table cols-"+Math.min(levels.length,10);
      if(levels.length===10) grid.className="result-table cols-10";
      if(levels.length===7) grid.className="result-table cols-7";
      if(levels.length===5) grid.className="result-table cols-5";
      grid.innerHTML="";
      levels.forEach(level=>{
        const th=document.createElement("div");
        th.className="th";
        th.textContent="L"+level;
        grid.appendChild(th);
      });
      values.forEach(value=>{
        const td=document.createElement("div");
        td.className="td";
        td.textContent=value;
        grid.appendChild(td);
      });
    }

    function makePairedChunkTable(id,levels,values){
      const wrap=document.getElementById(id);
      wrap.className="result-chunks";
      wrap.innerHTML="";

      for(let i=0;i<levels.length;i+=5){
        const chunkLevels=levels.slice(i,i+5);
        const chunkValues=values.slice(i,i+5);
        const chunk=document.createElement("div");
        chunk.className="result-chunk cols-"+chunkLevels.length;

        chunkLevels.forEach(level=>{
          const th=document.createElement("div");
          th.className="th";
          th.textContent="L"+level;
          chunk.appendChild(th);
        });

        chunkValues.forEach(value=>{
          const td=document.createElement("div");
          td.className="td";
          td.textContent=value;
          chunk.appendChild(td);
        });

        wrap.appendChild(chunk);
      }
    }

    function hasPlanInput(){
      return Object.values(currentPlanObject()||{}).some(v=>Number(v||0)>0);
    }

    function makeUsageSummary(id,obj,emptyMessage){
      const wrap=document.getElementById(id);
      if(!wrap) return;
      wrap.innerHTML="";
      const entries=Object.keys(obj||{})
        .map(k=>({level:Number(k), value:Number(obj[k]||0)}))
        .filter(x=>x.value>0)
        .sort((a,b)=>b.level-a.level);
      if(!entries.length){
        const msg=document.createElement("div");
        msg.className="empty-message";
        msg.textContent=emptyMessage;
        wrap.appendChild(msg);
        return;
      }
      entries.forEach(entry=>{
        const line=document.createElement("div");
        line.className="usage-line";
        line.innerHTML=`<span>Lvl ${entry.level}</span><span>${Math.floor(entry.value)}</span>`;
        wrap.appendChild(line);
      });
    }

    function makeFilteredResultTable(id,levels,values,emptyMessage){
      const filtered=[];
      levels.forEach((level,index)=>{
        const value=values[index];
        if(value !== "-" && value !== "" && value !== null && value !== undefined){
          filtered.push({level,value});
        }
      });

      const grid=document.getElementById(id);
      if(!grid) return;
      grid.className=filtered.length ? "compact-result" : "empty-message";
      grid.innerHTML="";

      if(!filtered.length){
        grid.textContent=emptyMessage;
        return;
      }

      filtered.forEach(entry=>{
        const wrap=document.createElement("div");
        wrap.innerHTML=`<div class="th">L${entry.level}</div><div class="td">${entry.value}</div>`;
        grid.appendChild(wrap);
      });
    }

    function updateSideLeftoverLabels(){
      const side = selectedSide();
      const leftSub = document.getElementById("leftSideLeftoversSub");
      const rightSub = document.getElementById("rightSideLeftoversSub");

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

    function updateTotalLeftoverItemsText(){
      const el=document.getElementById("totalLeftoverItemsSub");
      if(!el) return;

      if(mode==="manual"){
        el.textContent="Items that were earned from random chests, but weren’t duplicates of the manual item in mind.";
      }else{
        el.textContent=`Items that were earned from random chests, but weren’t duplicates of the ${selectedItemName()}.`;
      }
    }

    function updateNontargetSideLabels(){
      const side = selectedSide();
      const leftSub = document.getElementById("leftSideLeftoversSub");
      const rightSub = document.getElementById("rightSideLeftoversSub");

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

    function makeRemainingItemsChunkedTable(id,levels,values,showAll){
      const wrap=document.getElementById(id);
      if(!wrap) return;

      wrap.className="result-chunks";
      wrap.innerHTML="";

      const topLevels=levels.slice(0,3);
      const topValues=values.slice(0,3);
      const lowerLevels=levels.slice(3);
      const lowerValues=values.slice(3);

      const makeCell=(level,value)=>{
        const cell=document.createElement("div");
        cell.innerHTML=`<div class="th">L${level}</div><div class="td">${value}</div>`;
        return cell;
      };

      if(topLevels.length){
        const top=document.createElement("div");
        top.className="remaining-items-top3";
        topLevels.forEach((level,index)=>top.appendChild(makeCell(level,topValues[index])));
        wrap.appendChild(top);
      }

      if(lowerLevels.length){
        const lower=document.createElement("div");
        lower.className="remaining-items-lower";
        lowerLevels.forEach((level,index)=>lower.appendChild(makeCell(level,lowerValues[index])));
        wrap.appendChild(lower);
      }
    }

    function makeRemainingItemsResult(id,levels,values,targetLevel){
      const hasRemaining=values.some(value=>value !== "-" && value !== "" && value !== null && value !== undefined);
      if(hasRemaining){
        makeRemainingItemsChunkedTable(id,levels,values,false);
        return;
      }

      const wrap=document.getElementById(id);
      if(!wrap) return;
      wrap.className="result-chunks";
      wrap.innerHTML="";

      const msg=document.createElement("div");
      msg.className="success-message";
      msg.textContent="Congratulations! Desired level met!";
      wrap.appendChild(msg);

      const sub=document.createElement("div");
      sub.className="success-subtext";
      sub.textContent="See new estimated inventory below.";
      wrap.appendChild(sub);

      if(mode==="specific"){
        const snapshotLevels=[targetLevel, targetLevel-1, targetLevel-2].filter(level=>level>=1 && level<=MAX_ITEM_LEVEL);
        let combined={};
        if(typeof projectedOwnedForInventoryItem === "function"){
          combined=projectedOwnedForInventoryItem(selectedItemName());
        }else{
          combined=calculateOwnedPlusPlanPlusChoice(currentOwnedObject(),calculateAdditionalOwnedFromPlanAndChoice(currentPlanObject(),currentGuaranteedObject(),probability()),{});
        }
        const simplified=simplifyUpByLevel(combined);

        const grid=document.createElement("div");
        grid.className="compact-result";
        snapshotLevels.forEach(level=>{
          const cell=document.createElement("div");
          cell.innerHTML=`<div class="th">L${level}</div><div class="td">${simplified[level]?roundNice(simplified[level]):"-"}</div>`;
          grid.appendChild(cell);
        });
        wrap.appendChild(grid);
      }
    }

    function makeRemainingChestsResult(id,levels,values){
      const hasRemaining=values.some(value=>value !== "-" && value !== "" && value !== null && value !== undefined);
      if(hasRemaining){
        makeTable(id,levels,values);
        return;
      }

      const grid=document.getElementById(id);
      if(!grid) return;
      grid.className="success-message";
      grid.innerHTML="Congratulations! Desired level met!";
    }

    function setRemainingSectionSubtexts(itemsHasRemaining,chestsHasRemaining){
      const itemSub=document.getElementById("remainingItemsSubtext");
      const chestSub=document.getElementById("remainingChestsSubtext");

      if(itemSub) itemSub.classList.toggle("subtext-hidden",!itemsHasRemaining);
      if(chestSub) chestSub.classList.toggle("subtext-hidden",!chestsHasRemaining);
    }

    function estimatedDisplayLevels(obj){
      const set=new Set(chestLevels);
      Object.keys(obj||{}).forEach(levelKey=>{
        const level=Number(levelKey);
        if(level>=1 && level<=MAX_ITEM_LEVEL && Number(obj[levelKey]||0)>0) set.add(level);
      });
      return Array.from(set).sort((a,b)=>b-a);
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
        return `<div class="empty-message" style="margin-top:0;">No bundle chests selected yet.</div>`;
      }

      return `<div class="bundle-pill-row">
        ${entries.map(entry=>`
          <div class="bundle-pill-wrap">
            <div class="pill-level">L${entry.level}</div>
            <div class="bundle-pill ${entry.type}">
              <div class="bundle-pill-qty">${Math.floor(entry.value)}</div>
              <div class="bundle-pill-type">${entry.type}</div>
            </div>
          </div>
        `).join("")}
      </div>`;
    }

    function renderBundleAppliedSummary(containerId){
      const el=document.getElementById(containerId);
      if(!el) return;

      const totals=bundleTotals();
      const choiceShown = mode==="manual" ? (totals.choice || {}) : currentBankRedeemedAsChoiceSource();

      const hasRandom=Object.values(totals.random||{}).some(v=>Number(v)>0);
      const hasChoice=Object.values(choiceShown||{}).some(v=>Number(v)>0);

      el.innerHTML=`
        <div class="bundle-summary-title">Applied From Top Up Bundles / Choice Chest Bank</div>
        ${hasRandom || hasChoice ? makeBundlePills(totals.random,"random",choiceShown) : `<div class="empty-message" style="margin-top:0;">No bundle chests selected yet.</div>`}
      `;
    }

function renderChoiceBankRedeem(containerId){
      const el=document.getElementById(containerId);
      if(!el) return;
      if(mode==="manual"){ el.innerHTML=""; return; }
      ensureBankObjects();
      syncChoiceBankFromDerived();
      const generatedHere=bundleTotals().choice || {};
      const levels=new Set([...chestLevels,...Object.keys(generatedHere||{}).map(Number),...Object.keys(currentRedeemedBankObject()||{}).map(Number)]);
      const entries=Array.from(levels).map(level=>({
        level,
        earnedHere:currentChoiceBankEarnedHere(level),
        value:availableChoiceBankAtLevel(level),
        redeemed:Math.floor(Number(currentRedeemedBankObject()[level]||0))
      })).filter(x=>x.earnedHere>0 || x.value>0 || x.redeemed>0).sort((a,b)=>b.level-a.level);
      if(!entries.length){ el.innerHTML=""; return; }
      el.innerHTML=`<div class="choice-bank-card ${choiceBankExpanded ? "choice-bank-open" : ""}">
        <button class="choice-bank-toggle" type="button" onclick="toggleChoiceBankCollapse()">
          <span>Choice Chest Bank Available</span>
          <span class="chev">⌄</span>
        </button>
        <div class="choice-bank-body">
          ${entries.map(entry=>`<div class="redeem-row">
            <div class="redeem-level">Lvl ${entry.level}</div>
            <div class="redeem-available">${entry.earnedHere} earned here · ${entry.value} available${entry.redeemed>0 ? ` · ${entry.redeemed} redeemed here` : ""}</div>
            <div class="redeem-actions">
              <button onclick="redeemChoiceFromBank(${entry.level},1)">+1</button>
              <button onclick="adjustRedeemedChoice(${entry.level},-1)">-1</button>
              <button onclick="redeemChoiceFromBank(${entry.level},${entry.value})">Use all</button>
              <button onclick="removeAllRedeemedChoice(${entry.level})">Remove all</button>
            </div>
          </div>`).join("")}
        </div>
      </div>`;
    }

    function calculateResults(){
      updateNontargetSideLabels();
      updateTotalLeftoverItemsText();
      updateSideLeftoverLabels();
      const p=probability();
      const target=Number(document.getElementById("targetLevel").value||7);
      const owned=currentOwnedObject();
      const plan=currentPlanObject();
      const guaranteed=currentGuaranteedObject();
      const totalChoice=totalChoiceObject();
      const bundleRandom=bundleRandomTotals();
      const activePlan=levelObjectPlus(plan,bundleRandom);

      const additionalOwned=calculateAdditionalOwnedFromPlan(activePlan,p);
      const additionalOwnedForRemainingItems=calculateAdditionalOwnedFromPlanAndChoice(activePlan,totalChoice,p);
      const effectiveOwned=calculateOwnedPlusPlanPlusChoice(owned,additionalOwned,totalChoice);
      const effectiveOwnedForItems=calculateEffectiveOwnedForRemainingItems(owned,activePlan,totalChoice,p);

      const itemResultLevels=allItemLevels.filter(level=>level<=target);
      const showHighChests=document.getElementById("showHighChestLevels")?.checked;
      const chestResultLevels=showHighChests ? chestLevels : chestDefaultLevels;

      const itemValues=itemResultLevels.map(level=>{
        const raw=requiredAtLevel(target,level);
        const ownedEq=levelObjectEquivalentAtLevel(effectiveOwnedForItems,level);
        const remaining=Math.max(0,raw-ownedEq);
        return remaining>0 ? String(Math.ceil(remaining)) : "-";
      });

      const chestValues=chestResultLevels.map(level=>{
        const effectiveOwnedForChestColumn=calculateEffectiveOwnedForRemainingChestColumn(owned,activePlan,totalChoice,p,level);
        const raw=requiredAtLevel(target,level);
        const ownedEq=levelObjectEquivalentAtLevel(effectiveOwnedForChestColumn,level);
        const remainingItems=Math.max(0,raw-ownedEq);
        const baseChestNeed=remainingItems>0 ? Math.ceil(remainingItems/p) : 0;
        const planSameLevel=Number(activePlan[level]||0);
        const chestNeed=Math.max(0,baseChestNeed-planSameLevel);
        return chestNeed ? String(chestNeed) : "-";
      });

      const expectedAddtlOwned=targetItemsFromPlanAndChoice(activePlan,totalChoice,p);
      const estimatedLevels=estimatedDisplayLevels(expectedAddtlOwned);
      const expectedValues=estimatedLevels.map(level=>{
        const val=expectedAddtlOwned[level]||0;
        return val>0 ? String(val) : "-";
      });

      const side=selectedSide();

      // Deterministic nontarget logic:
      // Every random chest creates exactly one item.
      // Side totals use the actual game drop table: Left = 2/3, Right = 1/3.
      // Target items are then subtracted from the selected target item's side.
      const nontargetTotals=nontargetSideTotalsFromRandomPlan(activePlan,side,p);

      const leftSideValues=valuesFromLevelObject(nontargetTotals.left,chestLevels);
      const rightSideValues=valuesFromLevelObject(nontargetTotals.right,chestLevels);

      const randomSideDisplayValues=chestLevels.map(level=>{
        const leftVal=safeNum(nontargetTotals.left[level]);
        const rightVal=safeNum(nontargetTotals.right[level]);
        if(leftVal<=0 && rightVal<=0) return "-";
        const parts=[];
        if(leftVal>0) parts.push("L: "+Math.floor(leftVal));
        if(rightVal>0) parts.push("R: "+Math.floor(rightVal));
        return parts.join(" / ");
      });

      const noPlanMessage=hasPlanInput() || Object.values(bundleRandom||{}).some(v=>Number(v||0)>0) ? "No leftovers expected." : "No planned chests entered yet.";

      setRemainingSectionSubtexts(
        itemValues.some(value=>value !== "-" && value !== "" && value !== null && value !== undefined),
        chestValues.some(value=>value !== "-" && value !== "" && value !== null && value !== undefined)
      );

      makeRemainingItemsResult("itemsNeededTable",itemResultLevels,itemValues,target);
      makeRemainingChestsResult("remainingTable",chestResultLevels,chestValues);
      makeFilteredResultTable("expectedTable",estimatedLevels,expectedValues,hasPlanInput() ? "No target items expected." : "No planned chests entered yet.");
      makeFilteredResultTable("sameSideTable",chestLevels,leftSideValues,noPlanMessage);
      makeFilteredResultTable("oppositeSideTable",chestLevels,rightSideValues,noPlanMessage);
      makeFilteredResultTable("randomSideLeftoverTable",chestLevels,randomSideDisplayValues,noPlanMessage);

      makeUsageQuickAdjustSummary("randomUsedSummary",plan,"plan","No random chests used.",bundleRandom);
      makeUsageQuickAdjustSummary("choiceUsedSummary",guaranteed,"guaranteed","No choice chests used.",mode==="manual" ? manualTopUpChoiceObject() : currentBankRedeemedAsChoiceSource());

      const qRandom=document.getElementById("quickAdjustRandom");
      const qChoice=document.getElementById("quickAdjustChoice");
      if(qRandom) qRandom.checked=!!state.quickAdjustRandom;
      if(qChoice) qChoice.checked=!!state.quickAdjustChoice;

      const chanceText=(p*100).toFixed(3)+"%";
      const chanceEl=document.getElementById("chanceValue");
      const chanceManualEl=document.getElementById("chanceValueManual");
      const chanceSide=selectedSide();
      [chanceEl,chanceManualEl].forEach(el=>{
        if(!el) return;
        el.textContent=chanceText;
        el.classList.toggle("left-chance",chanceSide==="left");
        el.classList.toggle("right-chance",chanceSide==="right");
      });
      const expectedSub=document.getElementById("expectedTargetSubtext");
      if(expectedSub){
        const itemLabel=mode==="specific" ? selectedItemName() : "target";
        expectedSub.textContent=`Duplicate ${itemLabel} gear acquired from random and choice chests.`;
      }

      toggleChestsUsedVisibility();
    }

    function renderInventoryRandomTables(){
      const leftTotals={};
      const rightTotals={};

      if(typeof computeAllRawItemPlans==="function"){
        computeAllRawItemPlans().forEach(plan=>{
          addObjects(leftTotals,(plan.randomItemsLeftover && plan.randomItemsLeftover.left) || {});
          addObjects(rightTotals,(plan.randomItemsLeftover && plan.randomItemsLeftover.right) || {});
        });
      }

      const leftValues=chestLevels.map(level=>displayWhole(leftTotals[level]));
      const rightValues=chestLevels.map(level=>displayWhole(rightTotals[level]));

      makeFilteredResultTable("inventoryRandomLeftTable",chestLevels,leftValues,"No random left-side items detected from item plans.");
      makeFilteredResultTable("inventoryRandomRightTable",chestLevels,rightValues,"No random right-side items detected from item plans.");
    }
