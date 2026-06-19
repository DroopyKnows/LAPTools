// Shared render helpers: level-pill grids, compact rows, filter tabs, snapshot blocks, empty states.

import {
  renderActionAttrs,
  uiClassName,
  uiNumber,
  uiPillClassName
} from "./ui-helpers.js";

// Level → pill2 level-rarity tone (L1 gray, L2 green, L3 blue, L4 purple, L5-7 gold, L8+ red).
function pill2LevelToneClass(level){
  const n=Number(level)||0;
  if(n>=8) return "pill2--tone-levelRed";
  if(n>=5) return "pill2--tone-levelGold";
  if(n===4) return "pill2--tone-levelPurple";
  if(n===3) return "pill2--tone-levelBlue";
  if(n===2) return "pill2--tone-levelGreen";
  return "pill2--tone-levelGray";
}

export function renderLevelPillGrid(obj, options){
  const cfg=Object.assign({
    levels: (typeof allItemLevels!=="undefined" ? allItemLevels : []),
    gridClass: "compact-readout-grid",
    pillClass: "compact-snapshot-pill",
    levelClass: "pill-level",
    qtyClass: "pill-qty",
    emptyHtml: "",
    transform: null,
    valueFormatter: value=>String(typeof roundNice==="function" ? roundNice(value) : value),
    includeZero: false,
    pillSize: "md",
    labelPlacement: "above",
    min: "md",
    fill: true,
    minPerRow: 2,
    maxItemWidth: null,
    compact: null
  }, options || {});
  const source=cfg.transform ? cfg.transform(obj || {}) : (obj || {});
  const shown=(cfg.levels || []).filter(level=>{
    const value=uiNumber(source[level]);
    return cfg.includeZero ? value!==0 : value>0;
  });
  if(!shown.length) return cfg.emptyHtml || "";
  // Engine grid (min-md, gap-sm, fill, align-center, bottom-up, minPerRow 2); pill2
  // default mode, md, level tone, label above. Pills are DIRECT children — initAllGrids builds the tree.
  const gridClass=uiClassName(
    "grid2",
    cfg.min==="sm" ? "grid2--min-sm" : "grid2--min-md",
    "grid2--gap-sm",
    cfg.fill===false ? "grid2--hug" : "grid2--fill",
    "grid2--align-center"
  );
  const maxItemWidthAttr=cfg.maxItemWidth ? ` data-grid2-max-width="${cfg.maxItemWidth}"` : "";
  return `
    <div class="${gridClass}" data-grid2 data-grid2-direction="bottom-up" data-grid2-min-per-row="${cfg.minPerRow}"${maxItemWidthAttr}>
      ${shown.map(level=>{
        const value=uiNumber(source[level]);
        const extraClass=typeof cfg.cellClassForValue==="function" ? cfg.cellClassForValue(value, level) : "";
        const toneClass=pill2LevelToneClass(level);
        const pillSizeClass=cfg.pillSize==="sm" ? "pill2--sm" : "pill2--md";
        const useCompact=cfg.compact===true || (cfg.compact!==false && cfg.labelPlacement==="inside");
        const pillClass=uiClassName("pill2",pillSizeClass,useCompact ? "pill2--compact" : "",toneClass,extraClass);
        if(cfg.labelPlacement==="inside"){
          return `<span class="${uiClassName("pill2-unit","pill2-unit--inside",toneClass)}"><span class="${pillClass}"><span class="pill2__level">L${level}</span><span class="pill2__qty">${cfg.valueFormatter(value, level)}</span></span></span>`;
        }
        return `<span class="${uiClassName("pill2-unit","pill2-unit--above",toneClass)}"><span class="pill2__level pill2__level--above">L${level}</span><span class="${pillClass}"><span class="pill2__qty">${cfg.valueFormatter(value, level)}</span></span></span>`;
      }).join("")}
    </div>
  `;
}

export function renderCompactInventoryRows(rows, options){
  const cfg=Object.assign({
    wrapperClass: "stack2 stack2--column stack2--gap-3",
    rowClass: "grid2 grid2--labeled-rows grid2--gap-sm",
    rowStyle: "--grid2-label-col:70px",
    labelClass: "grid2__row-label",
    valuesClass: "grid2__row-body",
    emptyHtml: '<div class="notice2 notice2--empty notice2--compact">None</div>',
    pillRenderer: obj=>renderLevelPillGrid(obj, {levels: (typeof allItemLevels!=="undefined" ? allItemLevels : []), emptyHtml: '<div class="notice2 notice2--empty notice2--compact">None</div>'})
  }, options || {});
  const rowStyleAttr=cfg.rowStyle ? ` style="${cfg.rowStyle}"` : "";
  return `<div class="${cfg.wrapperClass}">${(rows || []).map(row=>`
    <div class="${cfg.rowClass}"${rowStyleAttr}>
      <div class="${cfg.labelClass}">${row.label}</div>
      <div class="${cfg.valuesClass}">${cfg.pillRenderer(row.obj || {}, row) || cfg.emptyHtml}</div>
    </div>
  `).join("")}</div>`;
}

export function renderFilterTabs(options){
  const cfg=Object.assign({
    active: "all",
    values: ["left", "right", "all"],
    labels: {left:"Left", right:"Right", all:"All"},
    setter: "",
    idPrefix: "",
    wrapperClass: "tabs2 tabs2--sm tabs2--neutral tabs2--fill",
    buttonClass: "tabs2__tab"
  }, options || {});
  return `<div class="${cfg.wrapperClass}" style="--tabs-cols:3">
    ${cfg.values.map(value=>`<button ${cfg.idPrefix ? `id="${cfg.idPrefix}-${value}"` : ""} class="${cfg.buttonClass} ${cfg.active===value ? "active" : ""}" data-action="${cfg.setter}" data-action-event="click" data-arg0="${value}">${cfg.labels[value] || value}</button>`).join("")}
  </div>`;
}

export function renderSoftChipButtons(buttons, options){
  const cfg=Object.assign({wrapperClass:"home-mini-actions home-soft-chips", buttonClass:""}, options || {});
  return `<div class="${cfg.wrapperClass}">
    ${(buttons || []).map(btn=>`<button type="button"${cfg.buttonClass ? ` class="${cfg.buttonClass}"` : ""}${renderActionAttrs(btn.action || btn.onclick,"click")}>${btn.label}</button>`).join("")}
  </div>`;
}

export function renderSideBadge(side){
  const normalized=String(side || "left").toLowerCase();
  const badgeClass=uiPillClassName(normalized==="right" ? "pill2--badge pill2--md pill2--tone-right" : "pill2--badge pill2--md pill2--tone-left");
  return `<div class="${badgeClass}">${normalized.toUpperCase()}</div>`;
}

export function renderInventorySnapshotBlock(config){
  const cfg=Object.assign({
    className:"",
    title:"",
    side:null,
    rows:[],
    extraHtml:"",
    rowRenderer:null
  }, config || {});
  const sideHtml=cfg.side ? renderSideBadge(cfg.side) : "";
  const rowsHtml=cfg.rowRenderer ? cfg.rowRenderer(cfg.rows || []) : renderCompactInventoryRows(cfg.rows || []);
  // Card within a card: card2--muted card2--md (nested-card convention); the title is a
  // card2__title in a card2 header, with the side badge as the header action.
  const cardClass=uiClassName("card2","card2--muted","card2--md",cfg.className);
  return `<div class="${cardClass}">
    <div class="card2__header">
      <div class="card2__heading">
        <div class="card2__text"><div class="card2__title">${cfg.title}</div></div>
        ${sideHtml ? `<div class="card2__action">${sideHtml}</div>` : ""}
      </div>
    </div>
    <div class="card2__content card2__content--after-header stack2 stack2--column stack2--gap-3">${rowsHtml}${cfg.extraHtml || ""}</div>
  </div>`;
}

export function renderEmptyState(config){
  const cfg=Object.assign({
    title:"Nothing to show yet.",
    message:"",
    className:"notice2 notice2--empty",
    compact:false
  }, typeof config==="string" ? {message:config} : (config || {}));
  const classes=[cfg.className];
  if(cfg.compact) classes.push("notice2--compact");
  return `<div class="${classes.join(" ")}">
    ${cfg.title ? `<div class="empty-state-title">${cfg.title}</div>` : ""}
    ${cfg.message ? `<div class="empty-state-message">${cfg.message}</div>` : ""}
  </div>`;
}

// Generic collapsible card2 shell (title/subtext/chevron/collapsed-snapshot slot +
// toggleCard wiring) for the big calculator cards, so they don't hand-roll identical markup.
// Two header layouts:
//   • no headerAside (resultsCard / nontargetCard): card2__header IS the toggle button.
//   • headerAside present (chestInputCard): a flex row wrapping a custom-header toggle + the aside.
export function renderCollapsibleCard2(config){
  const cfg=Object.assign({
    id:"",
    tone:"white",
    size:"lg",
    open:false,
    title:"",
    subtext:"",
    snapshot:null,        // { id, className } → card2__header-extra collapsed-snapshot slot
    contentClass:"",      // extra classes on card2__content
    headerAside:"",       // control rendered beside the toggle (e.g. chest "Show Lvl 6–7")
    bodyHtml:"",          // inner content — passed through verbatim
    afterContent:""       // sibling after content, inside the section (e.g. nontarget more-info)
  }, config || {});

  const sectionClass=uiClassName("card2",`card2--${cfg.tone}`,`card2--${cfg.size}`,"card2--collapsible",cfg.open?"card2--open":"");
  const toggleAttrs=` data-action="toggleCard" data-action-event="click" data-arg0="${cfg.id}"`;

  const subtextHtml=cfg.subtext?`<div class="card2__body">${cfg.subtext}</div>`:"";
  const textBlock=`<div class="card2__text"><div class="card2__title">${cfg.title}</div>${subtextHtml}</div>`;
  const headerInner=`<div class="card2__heading"><div class="stack2 stack2--row stack2--gap-2 stack2--align-start stack2--wrap card2__default-header">${textBlock}</div>`;
  const snapshotHtml=cfg.snapshot
    ? `<div class="${uiClassName("card2__header-extra",cfg.snapshot.className||"")}" id="${cfg.snapshot.id}"></div>`
    : "";

  let headerHtml;
  if(cfg.headerAside){
    headerHtml=`<div class="card2__header stack2 stack2--row stack2--gap-2 stack2--align-start">`
      +`<button class="card2__header--toggle card2__collapse-toggle card2__custom-header"${toggleAttrs} type="button">`
      +headerInner
      +`<div class="card2__chev card2__collapsed-only">⌄</div></div>`
      +snapshotHtml
      +`</button>`
      +cfg.headerAside
      +`</div>`;
  }else{
    headerHtml=`<button class="card2__header card2__header--toggle card2__collapse-toggle"${toggleAttrs} type="button">`
      +headerInner
      +`<div class="card2__chev">⌄</div></div>`
      +snapshotHtml
      +`</button>`;
  }

  const contentHtml=`<div class="${uiClassName("card2__content","card2__content--after-header",cfg.contentClass)}">${cfg.bodyHtml}</div>`;
  return `<section class="${sectionClass}" id="${cfg.id}">${headerHtml}${contentHtml}${cfg.afterContent}</section>`;
}
