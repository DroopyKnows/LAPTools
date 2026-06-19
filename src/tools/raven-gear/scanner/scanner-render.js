// Raven Gear scanner render helpers.
// Kept feature-local so scanner UI is not embedded in the shared Raven Gear runtime.

import { renderMetaPillRow, renderResultSectionCard } from "./scanner-ui-renderers.js";
import { renderBagScannerCardMarkup } from "../blocks/bag-scanner-card.block.js";
import { initAllGrids } from "../ui/grid/grid.js";

export function createScannerRenderModule(deps){
  const {
    allItemLevels,
    levelObjectHasValues,
    ravenItems,
    renderCompactInventoryRows,
    renderCompactLevelBoxes,
    renderEmptyState,
    renderInventorySnapshotBlock,
    roundNice,
    uiEscapeAttr
  }=deps;

  let bagScannerLastScan=null;

  function getBagScannerLastScan(){
    return bagScannerLastScan;
  }

  function setBagScannerLastScan(scan){
    bagScannerLastScan=scan;
  }

  function renderBagScannerPanel(){
    return renderBagScannerCardMarkup();
  }

  function renderBagScannerInventory(inventory){
    const blocks=ravenItems.map(item=>{
      const values=(inventory||{})[item.name]||{};
      if(!levelObjectHasValues(values)) return "";
      // level pill grid (engine, md pill, label above, min-md), fill:false
      // (grid2--hug wrapper) + minPerRow 3.
      return renderInventorySnapshotBlock({
        title:item.name,
        side:item.side,
        rows:[{obj:values}],
        rowRenderer:rows=>rows.map(row=>renderCompactLevelBoxes(row.obj || {},allItemLevels,{}) || renderEmptyState({title:'',message:'None',className:'notice2 notice2--empty',compact:true})).join("")
      });
    }).filter(Boolean).join("");
    return blocks || renderEmptyState({title:"No Raven items detected.",message:"Try a clearer screenshot.",className:"notice2 notice2--empty"});
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
    return `<div class="notice2 notice2--warn">${uiEscapeAttr(scannerReviewReason(scan))}</div>`;
  }

  function renderBagScannerReview(scan){
    const review=deps.byId("bagScannerReview");
    if(!review) return;
    bagScannerLastScan=scan;
    const ignoredCount=(scan.ignoredTiles||[]).length;
    const uncertainCount=(scan.uncertain||[]).length;
    const needsReview=scannerHasReviewIssue(scan);
    review.classList.remove("hidden");
    review.innerHTML=renderResultSectionCard({
      title:"Review Scan Results",
      subtitle:`Detected ${roundNice(scan.detectedCount||0)} total Raven item${(scan.detectedCount||0)===1 ? "" : "s"}.`,
      bodyHtml:`
        ${renderMetaPillRow([
          {label:needsReview ? "Review needed" : "Ready to apply",className:needsReview ? "pill2--badge pill2--md pill2--tone-warn" : "pill2--badge pill2--md pill2--tone-positive"},
          {label:`Ignored: ${roundNice(ignoredCount)}`},
          {label:`Uncertain: ${roundNice(uncertainCount)}`}
        ])}
        ${renderBagScannerIssue(scan)}
        <div class="stack2 stack2--column stack2--gap-3">${renderBagScannerInventory(scan.inventory)}</div>
      `,
      actions:[
        {label:"Replace Active Inventory",className:"button2 button2--md button2--primary",action:"replaceActiveInventoryFromBagScan"},
        {label:"Clear Results",className:"button2 button2--md button2--danger",action:"purgeBagScannerData"}
      ]
    });
    initAllGrids(review);
  }

  function setBagScannerStatus(message,type){
    const status=deps.byId("bagScannerStatus");
    if(!status) return;
    // scanner-status2 base + bare loading/ok/error state tokens (set directly here).
    status.className=`scanner-status2 ${type||""}`.trim();
    status.textContent=message||"";
  }

  function clearBagScannerReview(){
    bagScannerLastScan=null;
    const review=deps.byId("bagScannerReview");
    if(review){
      review.classList.add("hidden");
      review.innerHTML="";
    }
    setBagScannerStatus("","");
  }

  function clearBagScannerFileInput(){
    const input=deps.byId("bagScannerFiles");
    if(input) input.value="";
  }

  function purgeBagScannerData(){
    bagScannerLastScan=null;
    if(typeof window.resetScannerStateInAppState==="function") window.resetScannerStateInAppState();
    clearBagScannerReview();
    clearBagScannerFileInput();
  }

  const api={
    clearBagScannerFileInput,
    clearBagScannerReview,
    getBagScannerLastScan,
    purgeBagScannerData,
    renderBagScannerInventory,
    renderBagScannerIssue,
    renderBagScannerPanel,
    renderBagScannerReview,
    scannerFirstCleanText,
    scannerHasReviewIssue,
    scannerIsDevExplanation,
    scannerReviewReason,
    setBagScannerLastScan,
    setBagScannerStatus
  };

  api.exports={
    get bagScannerLastScan(){ return bagScannerLastScan; },
    clearBagScannerFileInput,
    clearBagScannerReview,
    purgeBagScannerData,
    renderBagScannerInventory,
    renderBagScannerIssue,
    renderBagScannerPanel,
    renderBagScannerReview,
    scannerFirstCleanText,
    scannerHasReviewIssue,
    scannerIsDevExplanation,
    scannerReviewReason,
    setBagScannerStatus
  };

  return api;
}
