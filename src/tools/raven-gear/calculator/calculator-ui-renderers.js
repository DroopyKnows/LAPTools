// Calculator UI renderers (e.g. the large target/source dropdown).

import { uiEscapeAttr } from "../shared/ui/ui-helpers.js";

export function renderLargeDropdown(config){
  const cfg=Object.assign({
    className:"",
    attrs:"",
    title:"",
    bodyHtml:"",
    action:"toggleBreakdownSource",
    actionAttrs:'data-source0="element"',
    badgeHtml:"",
    chevronHtml:'<div class="card2__chev">⌄</div>'
  }, config || {});
  const classes=["card2","card2--white","card2--md","card2--collapsible"];
  if(cfg.className) classes.push(cfg.className);
  const attrs=cfg.attrs ? ` ${cfg.attrs}` : "";
  const actionAttrs=cfg.action
    ? ` data-action="${uiEscapeAttr(cfg.action)}" data-action-event="click" ${cfg.actionAttrs || ""}`
    : "";
  return `<div class="${classes.join(" ")}" data-large-dropdown${attrs}>
    <button class="card2__header card2__header--toggle card2__collapse-toggle" type="button"${actionAttrs}>
      <div class="card2__heading">
        <div class="card2__title card2__custom-header">${cfg.title}</div>
        <div class="stack2 stack2--row stack2--gap-2 stack2--align-center">
          ${cfg.badgeHtml || ""}
          ${cfg.chevronHtml || ""}
        </div>
      </div>
    </button>
    <div class="card2__content card2__content--after-header stack2 stack2--column stack2--gap-2">${cfg.bodyHtml || ""}</div>
  </div>`;
}
