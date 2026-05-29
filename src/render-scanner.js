// AI Bag Scanner rendering.

let bagScannerLastScan=null;

function renderBagScannerPanel(){
  return `
    <section class="card hidden" id="bagScannerCard">
      <button class="section-button" type="button" data-action="toggleBagScannerCard" data-action-event="click">
        <div>
          <div class="section-title">Scan Bag Items</div>
          <div class="section-sub">Upload Raven bag screenshots and review detected items before replacing Active Inventory.</div>
        </div>
        <div class="chev">⌄</div>
      </button>
      <div class="section-body scanner-body">
        <div class="scanner-field-grid">
          <label class="scanner-field">
            <span>Bag Screenshots</span>
            <input id="bagScannerFiles" type="file" accept="image/*" multiple data-action="setBagScannerFiles" data-action-event="change" data-source0="event" />
          </label>
        </div>
        <div class="button-row scanner-actions-row">
          <button class="ghost-btn backup-btn" type="button" data-action="closeBagScanner" data-action-event="click">Cancel</button>
          <button class="ghost-btn snapshot-style-btn" type="button" data-action="runBagScanner" data-action-event="click">Scan Bag Items</button>
        </div>
        <div id="bagScannerStatus" class="scanner-status"></div>
        <div id="bagScannerReview" class="scanner-review hidden"></div>
      </div>
    </section>
  `;
}

function renderBagScannerInventory(inventory){
  const blocks=ravenItems.map(item=>{
    const values=(inventory||{})[item.name]||{};
    if(!levelObjectHasValues(values)) return "";
    return renderInventorySnapshotBlock({
      className:"archive-item-block scanner-item-block",
      title:item.name,
      side:item.side,
      rows:[{label:"Detected Items",obj:values}],
      rowRenderer:rows=>renderCompactInventoryRows(rows,{pillRenderer:obj=>renderCompactLevelBoxes(obj,allItemLevels) || renderEmptyState({title:'',message:'None',className:'empty-message',compact:true})})
    });
  }).filter(Boolean).join("");
  return blocks || renderEmptyState({title:"No Raven items detected.",message:"Try a clearer screenshot.",className:"section-empty-message"});
}

function scannerHasReviewIssue(scan){
  if(!scan) return false;
  if((scan.detectedCount||0)<=0) return true;
  if(scan.requiresReview===true) return true;
  if(scan.canAutoApply===false) return true;
  if(scan.isConsistent===false) return true;
  return false;
}

function scannerIsDevExplanation(text){
  const lower=String(text||"").toLowerCase();
  return (
    lower.includes("scanner counts physical raven tiles") ||
    lower.includes("duplicate item+level tiles") ||
    lower.includes("worker aligns") ||
    lower.includes("aligns local screenshot rows") ||
    lower.includes("continued global row numbers") ||
    lower.includes("duplicate overlap rows") ||
    lower.includes("trusted overlap") ||
    lower.includes("cut-off/artifact") ||
    lower.includes("row alignment creates conflicts")
  );
}

function scannerFirstCleanText(values){
  const list=Array.isArray(values) ? values : [];
  for(const value of list){
    const text=String(value||"").trim();
    if(text && !scannerIsDevExplanation(text)) return text;
  }
  return "";
}

function scannerReviewReason(scan){
  if(!scan) return "Scan failed. Please try again.";
  const result=scan.result || {};
  if((scan.detectedCount||0)<=0) return "Scan failed. No Raven items were detected.";

  const directReason=String(
    result.reviewReason ||
    result.errorReason ||
    result.warningMessage ||
    result.errorMessage ||
    result.error ||
    ""
  ).trim();
  if(directReason && !scannerIsDevExplanation(directReason)) return directReason;

  const warning=scannerFirstCleanText(scan.warnings);
  if(warning) return warning;

  const note=scannerFirstCleanText(scan.notes);
  if(note) return note;

  if(scan.isConsistent===false) return "Review needed. The screenshots could not be matched cleanly.";
  if(scan.canAutoApply===false) return "Review needed before replacing Active Inventory.";
  return "Review needed before replacing Active Inventory.";
}

function renderBagScannerIssue(scan){
  if(!scannerHasReviewIssue(scan)) return "";
  return `<div class="scanner-warning-list scanner-simple-message"><div>${uiEscapeAttr(scannerReviewReason(scan))}</div></div>`;
}

function renderBagScannerReview(scan){
  const review=document.getElementById("bagScannerReview");
  if(!review) return;
  bagScannerLastScan=scan;
  const ignoredCount=(scan.ignoredTiles||[]).length;
  const uncertainCount=(scan.uncertain||[]).length;
  const needsReview=scannerHasReviewIssue(scan);
  review.classList.remove("hidden");
  review.innerHTML=`
    <div class="result-section-card scanner-review-card">
      <div class="result-head">
        <div>
          <div class="section-title">Review Scan Results</div>
          <div class="section-sub">Detected ${roundNice(scan.detectedCount||0)} total Raven item${(scan.detectedCount||0)===1 ? "" : "s"}.</div>
        </div>
      </div>
      <div class="scanner-meta-row">
        <span class="scanner-meta-pill ${needsReview ? "warn" : "ok"}">${needsReview ? "Review needed" : "Ready to apply"}</span>
        <span class="scanner-meta-pill">Ignored: ${roundNice(ignoredCount)}</span>
        <span class="scanner-meta-pill">Uncertain: ${roundNice(uncertainCount)}</span>
      </div>
      ${renderBagScannerIssue(scan)}
      <div class="scanner-result-list">${renderBagScannerInventory(scan.inventory)}</div>
      <div class="button-row scanner-actions-row">
        <button class="ghost-btn backup-btn" type="button" data-action="clearBagScannerReview" data-action-event="click">Clear Results</button>
        <button class="ghost-btn snapshot-style-btn" type="button" data-action="replaceActiveInventoryFromBagScan" data-action-event="click">Replace Active Inventory</button>
      </div>
    </div>
  `;
}

function setBagScannerStatus(message,type){
  const status=document.getElementById("bagScannerStatus");
  if(!status) return;
  status.className=`scanner-status ${type||""}`.trim();
  status.textContent=message||"";
}

function clearBagScannerReview(){
  bagScannerLastScan=null;
  const review=document.getElementById("bagScannerReview");
  if(review){
    review.classList.add("hidden");
    review.innerHTML="";
  }
  setBagScannerStatus("","");
}
