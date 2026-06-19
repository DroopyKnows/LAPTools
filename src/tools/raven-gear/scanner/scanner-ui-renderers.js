// Scanner result-card and section-title UI renderers.

import {
  renderActionAttrs,
  uiPillClassName,
  uiSurfaceCardClassName
} from "../shared/ui/ui-helpers.js";

export function renderSectionTitleBlock(config){
  const cfg=Object.assign({
    title:"",
    subtitle:"",
    titleClass:"card2__title",
    subClass:"card2__body",
    wrapperClass:""
  }, config || {});
  return `${cfg.wrapperClass ? `<div class="${cfg.wrapperClass}">` : ""}
    ${cfg.title ? `<div class="${cfg.titleClass}">${cfg.title}</div>` : ""}
    ${cfg.subtitle ? `<div class="${cfg.subClass}">${cfg.subtitle}</div>` : ""}
  ${cfg.wrapperClass ? "</div>" : ""}`;
}

export function renderButtonRow(buttons, options){
  const cfg=Object.assign({wrapperClass:"stack2 stack2--column stack2--gap-3", stopPropagation:false}, options || {});
  if(!buttons || !buttons.length) return "";
  // The 70%/30% primary/danger split is expressed by the stack2--split-70-30
  // wrapper (see callers) rather than per-button inline flex bases.
  return `<div class="${cfg.wrapperClass}"${cfg.stopPropagation ? ' data-stop-propagation="true"' : ""}>
    ${buttons.map(btn=>`<button class="${btn.className || "button2 button2--md button2--ghost"}"${btn.style ? ` style="${btn.style}"` : ""} type="button"${renderActionAttrs(btn.action || btn.onclick,"click")}>${btn.label}</button>`).join("")}
  </div>`;
}

export function renderMetaPillRow(pills, options){
  // stack2--fill stretches every pill to an equal width across the row.
  const cfg=Object.assign({wrapperClass:"stack2 stack2--row stack2--gap-3 stack2--fill", pillClass:"pill2--badge pill2--md pill2--tone-neutral"}, options || {});
  if(!pills || !pills.length) return "";
  return `<div class="${cfg.wrapperClass}">
    ${pills.map(pill=>{
      const cls=typeof pill==="string" ? cfg.pillClass : (pill.className || cfg.pillClass);
      const label=typeof pill==="string" ? pill : (pill.label || "");
      return `<span class="${uiPillClassName(cls)}">${label}</span>`;
    }).join("")}
  </div>`;
}

export function renderResultSectionCard(config){
  const cfg=Object.assign({
    className:"",
    title:"",
    subtitle:"",
    headerRightHtml:"",
    bodyHtml:"",
    actions:[]
  }, config || {});
  const cardClass=uiSurfaceCardClassName(cfg.className);
  return `<div class="${cardClass}">
    <div class="stack2 stack2--column stack2--gap-5">
      ${(cfg.title || cfg.subtitle || cfg.headerRightHtml) ? `
        <div class="stack2 stack2--row stack2--justify-between stack2--align-start stack2--gap-4">
          <div>${renderSectionTitleBlock({title:cfg.title,subtitle:cfg.subtitle})}</div>
          ${cfg.headerRightHtml || ""}
        </div>
      ` : ""}
      ${cfg.bodyHtml || ""}
      ${renderButtonRow(cfg.actions,{wrapperClass:"stack2 stack2--row stack2--gap-4 stack2--split stack2--split-70-30"})}
    </div>
  </div>`;
}
