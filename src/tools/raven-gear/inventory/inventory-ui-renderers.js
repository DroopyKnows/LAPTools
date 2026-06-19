// Inventory item-card and compact-row renderers.

import {
  uiClassName
} from "../shared/ui/ui-helpers.js";
import {
  renderSideBadge
} from "../shared/ui/ui-renderers.js";

export function renderSingleCompactRow(label, valuesHtml, options){
  const cfg=Object.assign({wrapperClass:"", labelCol:"70px"}, options || {});
  // labeled-rows grid (default 70px label col, NO data-grid2 — static CSS grid);
  // label at start, pills as the row body.
  return `<div class="grid2 grid2--labeled-rows grid2--gap-sm ${cfg.wrapperClass}" style="--grid2-label-col:${cfg.labelCol}">
    <div class="grid2__row-label">${label}</div>
    <div class="grid2__row-body">${valuesHtml}</div>
  </div>`;
}

export function renderInventoryItemCard(config){
  const cfg=Object.assign({
    className:"",
    title:"",
    subtitle:"",
    side:null,
    badgeHtml:"",
    bodyHtml:"",
    headerExtraHtml:""
  }, config || {});
  const badge=cfg.badgeHtml || (cfg.side ? renderSideBadge(cfg.side) : "");
  // Nested item card: card2--muted (card-within-card convention, matching
  // renderInventorySnapshotBlock). Any extra hook classes pass through.
  const cardClass=uiClassName("card2","card2--muted","card2--md",cfg.className);
  const action=cfg.headerExtraHtml || badge;
  // Canonical card2 default header.
  return `<div class="${cardClass}">
    <div class="card2__header">
      <div class="stack2 stack2--row stack2--gap-2 stack2--align-start stack2--wrap card2__default-header">
        <div class="card2__text">
          <div class="card2__title">${cfg.title}</div>
          ${cfg.subtitle ? `<div class="card2__body">${cfg.subtitle}</div>` : ""}
        </div>
        ${action ? `<div class="card2__action">${action}</div>` : ""}
      </div>
    </div>
    <div class="card2__content card2__content--after-header">${cfg.bodyHtml || ""}</div>
  </div>`;
}
