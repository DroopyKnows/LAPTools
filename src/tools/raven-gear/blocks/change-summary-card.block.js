// Inventory Change Summary — reusable mountable card block.
//
// A third view over the calculator/What-If selection (alongside the Results and Non-target
// blocks): it narrates the inventory journey for the target item as a vertical stack of state
// snapshots — Current Inventory → (Combined Inventory) → Additions → After. Like the other
// blocks it is environment-parameterized: the row VALUES are built from an `env` (the same env
// shape the Results block reads), so the Calculator and What If feed it without re-deriving math.
//
// The block owns only its generic chrome here; buildChangeSummaryRows() (below) builds the
// mode-aware row model, and renderStateRows() (shared/ui) renders it into the content slot.
//
// ID stability: What If passes id:"whatIfSummaryCard" / contentId:"whatIfChangeSummary" so two
// committed CSS rules (the violet strong-row override + the #whatIfSummaryCard grid-alignment
// rule in ui/_bridge/layout-parity.css) keep matching; the Calculator gets its own ids.

import { renderCollapsibleCard2, renderStateRows } from "../shared/ui/ui-renderers.js";
import { allItemLevels } from "../metadata/item-metadata.js";

export const CHANGE_SUMMARY_CARD_DEFAULTS={
  id:"changeSummaryCard",
  contentId:"changeSummary",
  title:"Inventory Change Summary",
  subtext:"Current inventory, this plan&rsquo;s additions, and the projected result.",
  open:false,
  snapshotClassName:"change-summary-collapse-snapshot"
};

export function renderChangeSummaryCardMarkup(options){
  const cfg=Object.assign({}, CHANGE_SUMMARY_CARD_DEFAULTS, options || {});
  const cid=cfg.contentId;
  // Two snapshot slots like the Results card: a collapsed header-extra preview and an open
  // "Previous | New" snapshot (both governed by the card.css `snapshots` setting). The open
  // snapshot is NOT a static sibling — the render fns prepend it as the FIRST item inside the
  // #cid rows stack, so it sits on top of the rows and the stack's gap separates it from the
  // first row card.
  return renderCollapsibleCard2({
    id:cfg.id,
    title:cfg.title,
    subtext:cfg.subtext,
    open:cfg.open,
    snapshot:{ id:cid+"CollapsedSnapshot", className:cfg.snapshotClassName },
    bodyHtml:`<div id="${cid}"></div>`
  });
}

// "Previous | New" side-by-side snapshot. previousHtml/afterHtml are pre-rendered compact pill
// blocks — each surface supplies them from its own baseline/after objects (What-If: chosen
// baseline; Calculator: current inventory; Manual: owned target items). Mirrors the Results
// card's two-group snapshot layout.
export function renderChangeSummarySnapshot(previousHtml, afterHtml){
  // Equal-height columns (row align-stretch), with pills+caption bottom-aligned as a unit via
  // margin-top:auto on the grid. So both captions land on the same baseline, each caption hugs
  // its own pills (no gap between them), and the shorter side's spare room sits ABOVE its pills
  // rather than between pills and caption. Grid in a plain <div> (full width) so it flows to rows.
  const group=(html,caption)=>`<div class="stack2 stack2--column stack2--gap-0 stack2--align-stretch"><div style="margin-top:auto">${html}</div><div class="grid2__caption">${caption}</div></div>`;
  return `<div class="stack2 stack2--row stack2--gap-6 stack2--justify-center stack2--align-stretch stack2--fill">${group(previousHtml,"Previous")}${group(afterHtml,"New")}</div>`;
}

// Build the mode-aware row model from an env + the already-computed results model (so the
// "Additions" row reuses the EXACT object that feeds the Results card's "Estimated Target
// Items From Plan" — they can never disagree). Reuses runtime helpers for every value; it
// invents no math.
//
// env accessors used: isManual(), itemLabel(), ownedObject() (current inventory — the item's
// [item]ActiveInventory in specific/What-If, the manual bucket in manual mode), combinedObject()
// (optional; current + projected additions from saved plans), projectedOwned() (After = the
// projected owned-plus-plan), techPoints() (optional; banked research points for the item).
//
// `model.expectedTargetItems` is the Results "Estimated Target Items From Plan" object.
export function buildChangeSummaryRows(env, model, runtime){
  const itemName=env.itemLabel();
  const manual=env.isManual();
  const baseTech=typeof env.techPoints==="function" ? env.techPoints() : 0;

  // Compact level pills with the same research-collapse the rest of the summary uses; falls
  // back to an empty-state notice. (Mirrors whatif-results.js's compactSummaryPills helper.)
  const pills=(obj,emptyText,techPoints)=>{
    const tech=techPoints!==undefined ? techPoints : baseTech;
    return runtime.renderCompactLevelBoxes(obj || {}, allItemLevels, {itemName, techPoints:tech})
      || runtime.renderEmptyState({title:"",message:emptyText,className:"notice2 notice2--empty",compact:true});
  };
  // Apply the high-level duplicate→research collapse for display (no-op for low-level items).
  const research=(obj,tech)=>runtime.consumeDuplicatesIntoResearch(obj || {}, tech || 0);

  const current=env.ownedObject() || {};
  const additions=(model && model.expectedTargetItems) || {};
  const after=env.projectedOwned() || {};
  const afterResearch=research(after, baseTech);
  const afterDisplay=afterResearch.isResearch ? afterResearch.displayObject : after;

  const rows=[];

  // Base row — current inventory. Manual mode renames it (no per-item inventory there).
  rows.push({
    title: manual ? "Owned Target Items" : "Current Inventory",
    sub: manual ? "Manually entered owned items." : `Manually entered inventory for ${itemName}.`,
    html: pills(current, "No current inventory entered.")
  });

  // Additions row — the same object the Results card shows as "Estimated Target Items From Plan".
  rows.push({
    title: env.additionsTitle || "Plan Additions",
    sub: env.additionsSub || "Estimated target duplicates from this plan.",
    html: pills(additions, env.additionsEmpty || "No target items expected.")
  });

  // After row — projected owned (owned + plan), violet-emphasized.
  rows.push({
    title: env.afterTitle || "After Plan",
    sub: env.afterSub || "Current inventory plus this plan.",
    html: pills(afterDisplay, "No inventory projected yet.", afterResearch.isResearch ? afterResearch.techPoints : undefined),
    strong:true
  });

  // Combined row — current + calculated inventory from saved plans (the Inventory tab's "New
  // Estimated Inventory > Combined Inventory" for this item). Placed AFTER "After Plan": Combined
  // isn't a valid baseline on the Calculator (no baseline toggle there), so it reads as a trailing
  // reference, not a starting point. Omitted in manual mode (no per-item plan aggregation there).
  if(!manual && typeof env.combinedObject==="function"){
    const combined=env.combinedObject() || {};
    const combinedResearch=research(combined, baseTech);
    rows.push({
      title:"Combined Inventory",
      sub:"Current Inventory plus calculated inventory from saved plans.",
      html:pills(
        combinedResearch.isResearch ? combinedResearch.displayObject : combined,
        "No combined inventory yet.",
        combinedResearch.isResearch ? combinedResearch.techPoints : undefined
      )
    });
  }

  return rows;
}

export { renderStateRows };
