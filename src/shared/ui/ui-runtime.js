// App v1.0.26 shared UI runtime helpers.
// Moved out of Raven Gear runtime so generic rendering helpers live under shared/ui.

export function createSharedUiRuntimeModule(){
  // ===== src/ui-components.js =====
  // Shared UI rendering helpers.
  // These helpers keep repeated app patterns consistent without changing app behavior.


  function uiEscapeAttr(value){
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/"/g,"&quot;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;");
  }

  function uiSplitActionArgs(source){
    const args=[];
    let current="";
    let quote=null;
    let depth=0;
    for(let i=0;i<String(source||"").length;i++){
      const ch=source[i];
      const prev=source[i-1];
      if(quote){
        current+=ch;
        if(ch===quote && prev!=="\\") quote=null;
        continue;
      }
      if(ch==="'" || ch==='"' || ch==='`'){
        quote=ch;
        current+=ch;
        continue;
      }
      if(ch==="(" || ch==="[" || ch==="{") depth++;
      if(ch===")" || ch==="]" || ch==="}") depth=Math.max(0,depth-1);
      if(ch==="," && depth===0){
        args.push(current.trim());
        current="";
        continue;
      }
      current+=ch;
    }
    if(current.trim()) args.push(current.trim());
    return args;
  }

  function uiActionArgAttrs(args){
    return (args || []).map((arg,index)=>{
      const value=String(arg || "").trim();
      if(value==="this.value") return ` data-source${index}="value"`;
      if(value==="this.checked") return ` data-source${index}="checked"`;
      if(value==="event") return ` data-source${index}="event"`;
      if(value==="this") return ` data-source${index}="element"`;
      const quoted=(value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"')) || (value.startsWith('`') && value.endsWith('`'));
      const clean=quoted ? value.slice(1,-1) : value;
      const typeAttr=quoted ? ` data-arg${index}-type="string"` : "";
      return ` data-arg${index}="${uiEscapeAttr(clean)}"${typeAttr}`;
    }).join("");
  }

  function renderActionAttrs(action,eventType){
    const evt=eventType || "click";
    if(!action) return "";
    if(typeof action==="object"){
      const args=(action.args || []).map((arg,index)=>` data-arg${index}="${uiEscapeAttr(arg)}"`).join("");
      return ` data-action="${uiEscapeAttr(action.name || action.action || "")}" data-action-event="${evt}"${args}`;
    }
    const source=String(action).trim().replace(/;$/g,"");
    if(source==="document.getElementById('importFile').click()" || source==='document.getElementById("importFile").click()'){
      return ` data-action="openImportFile" data-action-event="${evt}"`;
    }
    const showClose=source.match(/^showPage\((.*)\);\s*closeGlobalMenu\(\)$/);
    if(showClose){
      const page=showClose[1].trim().replace(/^['"`]|['"`]$/g,"");
      return ` data-action="navigateAndCloseMenu" data-action-event="${evt}" data-page="${uiEscapeAttr(page)}"`;
    }
    const match=source.match(/^([A-Za-z_$][\w$]*)\((.*)\)$/);
    if(match){
      const name=match[1];
      const args=match[2].trim() ? uiSplitActionArgs(match[2]) : [];
      return ` data-action="${uiEscapeAttr(name)}" data-action-event="${evt}"${uiActionArgAttrs(args)}`;
    }
    return ` data-action="${uiEscapeAttr(source)}" data-action-event="${evt}"`;
  }

  function uiNumber(value){
    return Math.floor(Number(value || 0));
  }

  function uiLevelsWithPositiveValues(obj, levels){
    return (levels || []).filter(level=>uiNumber((obj || {})[level]) > 0);
  }

  function renderLevelPillGrid(obj, options){
    const cfg=Object.assign({
      levels: (typeof allItemLevels!=="undefined" ? allItemLevels : []),
      gridClass: "compact-readout-grid",
      pillClass: "compact-readout-cell",
      levelClass: "th",
      qtyClass: "td",
      emptyHtml: "",
      transform: null,
      valueFormatter: value=>String(typeof roundNice==="function" ? roundNice(value) : value),
      includeZero: false
    }, options || {});
    const source=cfg.transform ? cfg.transform(obj || {}) : (obj || {});
    const shown=(cfg.levels || []).filter(level=>{
      const value=uiNumber(source[level]);
      return cfg.includeZero ? value!==0 : value>0;
    });
    if(!shown.length) return cfg.emptyHtml || "";
    return `
      <div class="${cfg.gridClass}">
        ${shown.map(level=>{
          const value=uiNumber(source[level]);
          const extraClass=typeof cfg.cellClassForValue==="function" ? cfg.cellClassForValue(value, level) : "";
          return `<div class="${cfg.pillClass}${extraClass ? ` ${extraClass}` : ""}"><div class="${cfg.levelClass}">L${level}</div><div class="${cfg.qtyClass}">${cfg.valueFormatter(value, level)}</div></div>`;
        }).join("")}
      </div>
    `;
  }

  function renderCompactInventoryRows(rows, options){
    const cfg=Object.assign({
      wrapperClass: "scenario-compact-view",
      rowClass: "scenario-compact-row",
      labelClass: "scenario-compact-label",
      valuesClass: "scenario-compact-values",
      emptyHtml: '<div class="empty-message mini-empty">None</div>',
      pillRenderer: obj=>renderLevelPillGrid(obj, {levels: (typeof allItemLevels!=="undefined" ? allItemLevels : []), emptyHtml: '<div class="empty-message mini-empty">None</div>'})
    }, options || {});
    return `<div class="${cfg.wrapperClass}">${(rows || []).map(row=>`
      <div class="${cfg.rowClass}">
        <div class="${cfg.labelClass}">${row.label}</div>
        <div class="${cfg.valuesClass}">${cfg.pillRenderer(row.obj || {}, row) || cfg.emptyHtml}</div>
      </div>
    `).join("")}</div>`;
  }

  function renderFilterTabs(options){
    const cfg=Object.assign({
      active: "all",
      values: ["left", "right", "all"],
      labels: {left:"Left", right:"Right", all:"All"},
      setter: "",
      idPrefix: "",
      wrapperClass: "side-filter-tabs compact",
      buttonClass: "tab"
    }, options || {});
    return `<div class="${cfg.wrapperClass}">
      ${cfg.values.map(value=>`<button ${cfg.idPrefix ? `id="${cfg.idPrefix}-${value}"` : ""} class="${cfg.buttonClass} ${cfg.active===value ? "active" : ""}" data-action="${cfg.setter}" data-action-event="click" data-arg0="${value}">${cfg.labels[value] || value}</button>`).join("")}
    </div>`;
  }

  function renderSoftChipButtons(buttons, options){
    const cfg=Object.assign({wrapperClass:"home-mini-actions home-soft-chips", buttonClass:""}, options || {});
    return `<div class="${cfg.wrapperClass}">
      ${(buttons || []).map(btn=>`<button type="button"${cfg.buttonClass ? ` class="${cfg.buttonClass}"` : ""}${renderActionAttrs(btn.action || btn.onclick,"click")}>${btn.label}</button>`).join("")}
    </div>`;
  }

  function renderSideBadge(side){
    const normalized=String(side || "left").toLowerCase();
    const badgeClass=normalized==="right" ? "side-badge right" : "side-badge";
    return `<div class="${badgeClass}">${normalized.toUpperCase()}</div>`;
  }

  function renderUiActions(buttons, options){
    const cfg=Object.assign({wrapperClass:"saved-scenario-actions", stopPropagation:true}, options || {});
    if(!buttons || !buttons.length) return "";
    return `<div class="${cfg.wrapperClass}"${cfg.stopPropagation ? ' data-stop-propagation="true"' : ""}>
      ${buttons.map(btn=>`<button class="${btn.className || "ghost-btn"}"${renderActionAttrs(btn.action || btn.onclick,"click")}>${btn.label}</button>`).join("")}
    </div>`;
  }

  function renderCompactActionCard(config){
    const cfg=Object.assign({
      className:"saved-scenario-card compact-saved-card",
      expanded:false,
      onclick:"",
      title:"",
      subtitle:"",
      note:"",
      meta:"",
      actions:[],
      dropdownHtml:"",
      dropdownClass:"saved-snapshot-dropdown"
    }, config || {});
    const expandedClass=cfg.expanded ? "open" : "";
    const onclickAttr=cfg.onclick ? renderActionAttrs(cfg.action || cfg.onclick,"click") : "";
    return `<div class="${cfg.className} ${expandedClass}"${onclickAttr}>
      <div class="saved-scenario-top">
        <div class="saved-scenario-main">
          <div class="saved-scenario-title">${cfg.title}</div>
          ${cfg.subtitle ? `<div class="section-sub">${cfg.subtitle}</div>` : ""}
          ${cfg.note ? `<div class="saved-scenario-note">${cfg.note}</div>` : ""}
          ${cfg.meta ? `<div class="saved-scenario-meta">${cfg.meta}</div>` : ""}
        </div>
        ${renderUiActions(cfg.actions)}
      </div>
      ${cfg.dropdownHtml ? `<div class="${cfg.dropdownClass} ${cfg.expanded ? "" : "hidden"}">${cfg.dropdownHtml}</div>` : ""}
    </div>`;
  }

  function renderInventorySnapshotBlock(config){
    const cfg=Object.assign({
      className:"archive-item-block",
      title:"",
      side:null,
      rows:[],
      extraHtml:"",
      rowRenderer:null
    }, config || {});
    const sideHtml=cfg.side ? renderSideBadge(cfg.side) : "";
    const rowsHtml=cfg.rowRenderer ? cfg.rowRenderer(cfg.rows || []) : renderCompactInventoryRows(cfg.rows || []);
    return `<div class="${cfg.className}">
      <div class="inventory-head compact-head"><div class="item-name">${cfg.title}</div>${sideHtml}</div>
      ${rowsHtml}
      ${cfg.extraHtml || ""}
    </div>`;
  }

  function renderSingleCompactRow(label, valuesHtml, options){
    const cfg=Object.assign({wrapperClass:"scenario-compact-view", rowClass:"scenario-compact-row", labelClass:"scenario-compact-label", valuesClass:"scenario-compact-values"}, options || {});
    return `<div class="${cfg.wrapperClass}">
      <div class="${cfg.rowClass}">
        <div class="${cfg.labelClass}">${label}</div>
        <div class="${cfg.valuesClass}">${valuesHtml}</div>
      </div>
    </div>`;
  }

  function renderStateRows(rows, options){
    const cfg=Object.assign({rowClass:"whatif-summary-row", titleClass:"whatif-summary-title", subClass:"section-sub", valueRenderer:null}, options || {});
    return (rows || []).map(row=>`<div class="${cfg.rowClass}${row.strong ? " strong" : ""}">
      <div><div class="${cfg.titleClass}">${row.title}</div>${row.sub ? `<div class="${cfg.subClass}">${row.sub}</div>` : ""}</div>
      ${cfg.valueRenderer ? cfg.valueRenderer(row) : (row.html || "")}
    </div>`).join("");
  }

  function renderEmptyState(config){
    const cfg=Object.assign({
      title:"Nothing to show yet.",
      message:"",
      className:"empty-message",
      compact:false,
      icon:"",
      actions:[]
    }, typeof config==="string" ? {message:config} : (config || {}));
    const classes=[cfg.className];
    if(cfg.compact) classes.push("mini-empty");
    return `<div class="${classes.join(" ")}">
      ${cfg.icon ? `<div class="empty-state-icon">${cfg.icon}</div>` : ""}
      ${cfg.title ? `<div class="empty-state-title">${cfg.title}</div>` : ""}
      ${cfg.message ? `<div class="empty-state-message">${cfg.message}</div>` : ""}
      ${cfg.actions && cfg.actions.length ? `<div class="empty-state-actions">${cfg.actions.map(action=>`<button class="${action.className || "ghost-btn"}"${renderActionAttrs(action.action || action.onclick,"click")}>${action.label}</button>`).join("")}</div>` : ""}
    </div>`;
  }

  function renderCollapsibleCard(config){
    const cfg=Object.assign({
      id:"",
      className:"card",
      open:false,
      openClass:"open",
      title:"",
      subtitle:"",
      titleClass:"section-title",
      subClass:"section-sub",
      bodyHtml:"",
      bodyClass:"section-body",
      buttonClass:"section-button",
      attrs:"",
      headerRightHtml:"",
      dataAdvanced:false,
      toggleFn:null
    }, config || {});
    const idAttr=cfg.id ? ` id="${cfg.id}"` : "";
    const openClass=cfg.open ? ` ${cfg.openClass}` : "";
    const advancedAttr=cfg.dataAdvanced ? " data-advanced-section" : "";
    const attrs=cfg.attrs ? ` ${cfg.attrs}` : "";
    const toggle=cfg.toggleFn || (cfg.id ? `toggleCard('${cfg.id}')` : "");
    return `<section class="${cfg.className}${openClass}"${idAttr}${advancedAttr}${attrs}>
      <button class="${cfg.buttonClass}" type="button"${renderActionAttrs(toggle,"click")}>
        <div>
          <div class="${cfg.titleClass}">${cfg.title}</div>
          ${cfg.subtitle ? `<div class="${cfg.subClass}">${cfg.subtitle}</div>` : ""}
        </div>
        ${cfg.headerRightHtml || `<div class="chev">⌄</div>`}
      </button>
      <div class="${cfg.bodyClass}">${cfg.bodyHtml || ""}</div>
    </section>`;
  }


  function renderSectionTitleBlock(config){
    const cfg=Object.assign({
      title:"",
      subtitle:"",
      titleClass:"section-title",
      subClass:"section-sub",
      wrapperClass:""
    }, config || {});
    return `${cfg.wrapperClass ? `<div class="${cfg.wrapperClass}">` : ""}
      ${cfg.title ? `<div class="${cfg.titleClass}">${cfg.title}</div>` : ""}
      ${cfg.subtitle ? `<div class="${cfg.subClass}">${cfg.subtitle}</div>` : ""}
    ${cfg.wrapperClass ? "</div>" : ""}`;
  }

  function renderButtonRow(buttons, options){
    const cfg=Object.assign({wrapperClass:"button-row", stopPropagation:false}, options || {});
    if(!buttons || !buttons.length) return "";
    return `<div class="${cfg.wrapperClass}"${cfg.stopPropagation ? ' data-stop-propagation="true"' : ""}>
      ${buttons.map(btn=>`<button class="${btn.className || "ghost-btn"}" type="button"${renderActionAttrs(btn.action || btn.onclick,"click")}>${btn.label}</button>`).join("")}
    </div>`;
  }

  function renderMetaPillRow(pills, options){
    const cfg=Object.assign({wrapperClass:"scanner-meta-row", pillClass:"scanner-meta-pill"}, options || {});
    if(!pills || !pills.length) return "";
    return `<div class="${cfg.wrapperClass}">
      ${pills.map(pill=>{
        if(typeof pill==="string") return `<span class="${cfg.pillClass}">${pill}</span>`;
        return `<span class="${cfg.pillClass}${pill.className ? ` ${pill.className}` : ""}">${pill.label || ""}</span>`;
      }).join("")}
    </div>`;
  }

  function renderResultSectionCard(config){
    const cfg=Object.assign({
      className:"result-section-card",
      title:"",
      subtitle:"",
      headerRightHtml:"",
      bodyHtml:"",
      actions:[]
    }, config || {});
    return `<div class="${cfg.className}">
      ${(cfg.title || cfg.subtitle || cfg.headerRightHtml) ? `
        <div class="result-head">
          <div>${renderSectionTitleBlock({title:cfg.title,subtitle:cfg.subtitle})}</div>
          ${cfg.headerRightHtml || ""}
        </div>
      ` : ""}
      ${cfg.bodyHtml || ""}
      ${renderButtonRow(cfg.actions,{wrapperClass:"button-row scanner-actions-row"})}
    </div>`;
  }

  function renderInventoryItemCard(config){
    const cfg=Object.assign({
      className:"inventory-item",
      title:"",
      subtitle:"",
      side:null,
      badgeHtml:"",
      bodyHtml:"",
      headerExtraHtml:""
    }, config || {});
    const badge=cfg.badgeHtml || (cfg.side ? renderSideBadge(cfg.side) : "");
    return `<div class="${cfg.className}">
      <div class="inventory-head">
        <div>
          <div class="item-name">${cfg.title}</div>
          ${cfg.subtitle ? `<div class="random-leftover-subtext">${cfg.subtitle}</div>` : ""}
        </div>
        ${cfg.headerExtraHtml || badge}
      </div>
      ${cfg.bodyHtml || ""}
    </div>`;
  }

  function renderLevelInputGrid(config){
    const cfg=Object.assign({
      itemName:"",
      levels:[],
      values:{},
      inputKeyPrefix:"inventory",
      action:"setInventory"
    }, config || {});
    return `<div class="mini-grid">
      ${(cfg.levels || []).map(level=>`
        <div class="mini-cell">
          <label>L${level}</label>
          <input data-input-key="${cfg.inputKeyPrefix}-${cfg.itemName}-${level}" type="number" min="0" step="1" value="${(cfg.values || {})[level]||""}" placeholder="0" data-action="${cfg.action}" data-action-event="input" data-arg0="${cfg.itemName}" data-arg1="${level}" data-source2="value" />
        </div>
      `).join("")}
    </div>`;
  }

  function ensureModalHost(){
    let host=document.getElementById("appModalHost");
    if(host) return host;
    host=document.createElement("div");
    host.id="appModalHost";
    host.className="app-modal-host hidden";
    document.body.appendChild(host);
    return host;
  }

  function closeAppModal(){
    const host=document.getElementById("appModalHost");
    if(!host) return;
    host.classList.add("hidden");
    host.innerHTML="";
  }


  function escapeModalValue(value){
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function showInventorySnapshotModal(config){
    const cfg=Object.assign({
      title:"Save Current Inventory Snapshot",
      message:"Name this snapshot and optionally add a note.",
      defaultName:`Inventory ${new Date().toLocaleDateString()}`,
      defaultNote:"",
      nameLabel:"Snapshot Name",
      noteLabel:"Optional Note",
      fallbackName:"Inventory Snapshot",
      confirmLabel:"Save Snapshot",
      cancelLabel:"Cancel"
    }, config || {});
    return new Promise(resolve=>{
      const host=ensureModalHost();
      const finish=value=>{ closeAppModal(); resolve(value); };
      host.className="app-modal-host";
      host.innerHTML=`
        <div class="app-modal-scrim" data-modal-cancel></div>
        <form class="app-modal-card" role="dialog" aria-modal="true" aria-labelledby="appModalTitle" data-snapshot-modal>
          <div class="app-modal-title" id="appModalTitle">${cfg.title}</div>
          ${cfg.message ? `<div class="app-modal-message">${cfg.message}</div>` : ""}
          <div class="field-full">
            <label for="snapshotNameInput">${cfg.nameLabel}</label>
            <input id="snapshotNameInput" type="text" value="${escapeModalValue(cfg.defaultName)}" autocomplete="off" />
          </div>
          <div class="field-full">
            <label for="snapshotNoteInput">${cfg.noteLabel}</label>
            <input id="snapshotNoteInput" type="text" value="${escapeModalValue(cfg.defaultNote)}" autocomplete="off" />
          </div>
          <div class="app-modal-actions" style="margin-top:16px">
            <button type="button" class="ghost-btn" data-modal-cancel>${cfg.cancelLabel}</button>
            <button type="submit" class="primary-btn" data-modal-confirm>${cfg.confirmLabel}</button>
          </div>
        </form>
      `;
      host.querySelectorAll("[data-modal-cancel]").forEach(el=>el.addEventListener("click",()=>finish(null),{once:true}));
      const form=host.querySelector("[data-snapshot-modal]");
      const nameInput=host.querySelector("#snapshotNameInput");
      if(nameInput) nameInput.focus();
      if(form){
        form.addEventListener("submit",event=>{
          event.preventDefault();
          const name=(host.querySelector("#snapshotNameInput")?.value || "").trim() || cfg.fallbackName;
          const note=(host.querySelector("#snapshotNoteInput")?.value || "").trim();
          finish({name,note});
        },{once:true});
      }
    });
  }

  function showConfirmModal(config){
    const cfg=Object.assign({
      title:"Are you sure?",
      message:"",
      confirmLabel:"Confirm",
      cancelLabel:"Cancel",
      confirmClass:"primary-btn",
      cancelClass:"ghost-btn"
    }, config || {});
    return new Promise(resolve=>{
      const host=ensureModalHost();
      const finish=value=>{ closeAppModal(); resolve(value); };
      host.className="app-modal-host";
      host.innerHTML=`
        <div class="app-modal-scrim" data-modal-cancel></div>
        <div class="app-modal-card" role="dialog" aria-modal="true" aria-labelledby="appModalTitle">
          <div class="app-modal-title" id="appModalTitle">${cfg.title}</div>
          ${cfg.message ? `<div class="app-modal-message">${cfg.message}</div>` : ""}
          <div class="app-modal-actions">
            <button type="button" class="${cfg.cancelClass}" data-modal-cancel>${cfg.cancelLabel}</button>
            <button type="button" class="${cfg.confirmClass}" data-modal-confirm>${cfg.confirmLabel}</button>
          </div>
        </div>
      `;
      host.querySelectorAll("[data-modal-cancel]").forEach(el=>el.addEventListener("click",()=>finish(false),{once:true}));
      const confirm=host.querySelector("[data-modal-confirm]");
      if(confirm) confirm.addEventListener("click",()=>finish(true),{once:true});
    });
  }

  function showChoiceModal(config){
    const cfg=Object.assign({
      title:"Choose an option",
      message:"",
      choices:[]
    }, config || {});
    return new Promise(resolve=>{
      const host=ensureModalHost();
      const finish=value=>{ closeAppModal(); resolve(value); };
      host.className="app-modal-host";
      host.innerHTML=`
        <div class="app-modal-scrim" data-modal-cancel></div>
        <div class="app-modal-card" role="dialog" aria-modal="true" aria-labelledby="appModalTitle">
          <div class="app-modal-title" id="appModalTitle">${cfg.title}</div>
          ${cfg.message ? `<div class="app-modal-message">${cfg.message}</div>` : ""}
          <div class="app-modal-actions stacked">
            ${(cfg.choices || []).map(choice=>`<button type="button" class="${choice.className || "ghost-btn"}" data-modal-choice="${choice.value}">${choice.label}</button>`).join("")}
            <button type="button" class="ghost-btn" data-modal-cancel>${cfg.cancelLabel || "Cancel"}</button>
          </div>
        </div>
      `;
      host.querySelectorAll("[data-modal-cancel]").forEach(el=>el.addEventListener("click",()=>finish(null),{once:true}));
      host.querySelectorAll("[data-modal-choice]").forEach(el=>el.addEventListener("click",()=>finish(el.getAttribute("data-modal-choice")),{once:true}));
    });
  }


  // v1.0.13 module bridge exports
  Object.assign(window,{
    closeAppModal,
    ensureModalHost,
    escapeModalValue,
    renderActionAttrs,
    renderButtonRow,
    renderCollapsibleCard,
    renderCompactActionCard,
    renderCompactInventoryRows,
    renderEmptyState,
    renderFilterTabs,
    renderInventoryItemCard,
    renderInventorySnapshotBlock,
    renderLevelInputGrid,
    renderLevelPillGrid,
    renderMetaPillRow,
    renderResultSectionCard,
    renderSectionTitleBlock,
    renderSideBadge,
    renderSingleCompactRow,
    renderSoftChipButtons,
    renderStateRows,
    renderUiActions,
    showChoiceModal,
    showConfirmModal,
    showInventorySnapshotModal,
    uiActionArgAttrs,
    uiEscapeAttr,
    uiLevelsWithPositiveValues,
    uiNumber,
    uiSplitActionArgs
  });



  return {
    uiEscapeAttr,
    uiSplitActionArgs,
    uiActionArgAttrs,
    renderActionAttrs,
    uiNumber,
    uiLevelsWithPositiveValues,
    renderLevelPillGrid,
    renderCompactInventoryRows,
    renderFilterTabs,
    renderSoftChipButtons,
    renderSideBadge,
    renderUiActions,
    renderCompactActionCard,
    renderInventorySnapshotBlock,
    renderSingleCompactRow,
    renderStateRows,
    renderEmptyState,
    renderCollapsibleCard,
    renderSectionTitleBlock,
    renderButtonRow,
    renderMetaPillRow,
    renderResultSectionCard,
    renderInventoryItemCard,
    renderLevelInputGrid,
    ensureModalHost,
    closeAppModal,
    escapeModalValue,
    showInventorySnapshotModal,
    showConfirmModal,
    showChoiceModal
  };
}
