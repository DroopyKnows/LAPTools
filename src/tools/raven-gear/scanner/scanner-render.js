// Raven Gear scanner render helpers.
// Kept feature-local so scanner UI is not embedded in the shared Raven Gear runtime.

import { renderMetaPillRow, renderResultSectionCard } from "./scanner-ui-renderers.js";
import { renderBagScannerCardMarkup } from "../blocks/bag-scanner-card.block.js";
import { initAllGrids } from "../ui/grid/grid.js";
import {
  scannerHasReviewIssueDomain,
  scannerIsDevExplanationDomain,
  scannerFirstCleanTextDomain,
  scannerReviewReasonDomain
} from "./scanner-domain.js";

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

  // Pure review-decision logic now lives in scanner-domain.js (typed + tested);
  // aliased here so the render code + the module's exports below are unchanged.
  const scannerHasReviewIssue=scannerHasReviewIssueDomain;
  const scannerIsDevExplanation=scannerIsDevExplanationDomain;
  const scannerFirstCleanText=scannerFirstCleanTextDomain;
  const scannerReviewReason=scannerReviewReasonDomain;

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
