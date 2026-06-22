// App modal helpers (modal2 host): confirm, choice, and inventory-snapshot modals.

export function ensureModalHost(){
  let host=document.getElementById("appModalHost");
  if(host) return host;
  host=document.createElement("div");
  host.id="appModalHost";
  host.className="modal2 hidden";
  document.body.appendChild(host);
  // Tapping the backdrop dismisses the on-screen keyboard (blurs the focused field)
  // but never closes the modal — closing is reserved for an explicit Cancel/X button.
  // One delegated handler covers every modal since they all share this host.
  host.addEventListener("pointerdown",event=>{
    const target=event.target;
    if(target instanceof Element && target.matches("[data-modal-scrim]")){
      const active=document.activeElement;
      if(active && typeof active.blur==="function") active.blur();
    }
  });
  return host;
}

export function closeAppModal(){
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

// Make a user-typed name safe as a download filename: strip characters illegal on common
// filesystems, fall back when empty, and ensure a .json extension.
function normalizeBackupFilename(name,fallback){
  let out=String(name ?? "").trim().replace(/[\\/:*?"<>|]+/g,"_").replace(/\s+/g,"_");
  if(!out || out===".json") out=fallback;
  if(!/\.json$/i.test(out)) out+=".json";
  return out;
}

// Filename prompt for "Export Backup": one editable text field (prefilled with a sensible
// default), styled like showInventorySnapshotModal. Resolves to the sanitized filename, or
// null if cancelled.
export function showExportBackupModal(config){
  const cfg=Object.assign({
    title:"Export Inventory Backup",
    message:"Name the backup file, then download it.",
    defaultName:"raven_gear_backup.json",
    nameLabel:"File name",
    fallbackName:"raven_gear_backup.json",
    confirmLabel:"Download Backup",
    cancelLabel:"Cancel"
  }, config || {});
  return new Promise(resolve=>{
    const host=ensureModalHost();
    const finish=value=>{ closeAppModal(); resolve(value); };
    host.className="modal2";
    host.innerHTML=`
      <div class="modal2__scrim" data-modal-scrim></div>
      <form class="modal2__panel modal2__panel--md" role="dialog" aria-modal="true" aria-labelledby="appModalTitle" data-export-modal>
        <div class="modal2__title" id="appModalTitle">${cfg.title}</div>
        ${cfg.message ? `<div class="modal2__subtitle">${cfg.message}</div>` : ""}
        <div class="modal2__content stack2 stack2--column stack2--gap-2">
          <span class="value-box2-unit value-box2-unit--above">
            <span class="value-box2__label value-box2__label--main">${cfg.nameLabel}</span>
            <div style="display:flex;align-items:center;gap:6px">
              <div class="value-box2 value-box2--md value-box2--manual value-box2--text" style="flex:1 1 auto;min-width:0">
                <span class="value-box2__content"><input class="value-box2__input" id="exportFilenameInput" type="text" value="${escapeModalValue(String(cfg.defaultName).replace(/\.json$/i,""))}" autocomplete="off" spellcheck="false" /></span>
              </div>
              <span style="flex:0 0 auto;opacity:.5;white-space:nowrap;pointer-events:none">.json</span>
            </div>
          </span>
          <div class="modal2__actions modal2__actions--input">
            <button type="button" class="button2 button2--sm button2--ghost" data-modal-cancel>${cfg.cancelLabel}</button>
            <button type="submit" class="button2 button2--sm button2--primary" data-modal-confirm>${cfg.confirmLabel}</button>
          </div>
        </div>
      </form>
    `;
    host.querySelectorAll("[data-modal-cancel]").forEach(el=>el.addEventListener("click",()=>finish(null),{once:true}));
    const form=host.querySelector("[data-export-modal]");
    if(form){
      form.addEventListener("submit",event=>{
        event.preventDefault();
        const raw=(host.querySelector("#exportFilenameInput")?.value || "").trim() || cfg.fallbackName;
        finish(normalizeBackupFilename(raw,cfg.fallbackName));
      },{once:true});
    }
  });
}

export function showInventorySnapshotModal(config){
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
    host.className="modal2";
    host.innerHTML=`
      <div class="modal2__scrim" data-modal-scrim></div>
      <form class="modal2__panel modal2__panel--md" role="dialog" aria-modal="true" aria-labelledby="appModalTitle" data-snapshot-modal>
        <div class="modal2__title" id="appModalTitle">${cfg.title}</div>
        ${cfg.message ? `<div class="modal2__subtitle">${cfg.message}</div>` : ""}
        <div class="modal2__content stack2 stack2--column stack2--gap-2">
          <span class="value-box2-unit value-box2-unit--above">
            <span class="value-box2__label value-box2__label--main">${cfg.nameLabel}</span>
            <div class="value-box2 value-box2--md value-box2--manual value-box2--text">
              <span class="value-box2__content"><input class="value-box2__input" id="snapshotNameInput" type="text" value="${escapeModalValue(cfg.defaultName)}" autocomplete="off" /></span>
            </div>
          </span>
          <span class="value-box2-unit value-box2-unit--above">
            <span class="value-box2__label value-box2__label--main">${cfg.noteLabel}</span>
            <div class="value-box2 value-box2--md value-box2--manual value-box2--text">
              <span class="value-box2__content"><input class="value-box2__input" id="snapshotNoteInput" type="text" value="${escapeModalValue(cfg.defaultNote)}" autocomplete="off" /></span>
            </div>
          </span>
          <div class="modal2__actions modal2__actions--input">
            <button type="button" class="button2 button2--sm button2--ghost" data-modal-cancel>${cfg.cancelLabel}</button>
            <button type="submit" class="button2 button2--sm button2--primary" data-modal-confirm>${cfg.confirmLabel}</button>
          </div>
        </div>
      </form>
    `;
    host.querySelectorAll("[data-modal-cancel]").forEach(el=>el.addEventListener("click",()=>finish(null),{once:true}));
    const form=host.querySelector("[data-snapshot-modal]");
    // No auto-focus: on mobile that would pop the keyboard the instant the modal
    // opens and shove the panel off-screen. Tapping the field focuses it and lets
    // the OS scroll it into view.
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

export function showConfirmModal(config){
  const cfg=Object.assign({
    title:"Are you sure?",
    message:"",
    confirmLabel:"Confirm",
    cancelLabel:"Cancel",
    // Confirmations gate destructive/consequential actions, so the approve button
    // is danger by default. Only true input modals (Save Snapshot, Tech Points)
    // use primary; a caller can still override confirmClass if ever needed.
    confirmClass:"button2 button2--sm button2--danger",
    cancelClass:"button2 button2--sm button2--ghost"
  }, config || {});
  return new Promise(resolve=>{
    const host=ensureModalHost();
    const finish=value=>{ closeAppModal(); resolve(value); };
    host.className="modal2";
    host.innerHTML=`
      <div class="modal2__scrim" data-modal-scrim></div>
      <div class="modal2__panel modal2__panel--md" role="dialog" aria-modal="true" aria-labelledby="appModalTitle">
        <div class="modal2__title" id="appModalTitle">${cfg.title}</div>
        <div class="modal2__content stack2 stack2--column stack2--gap-2">
          ${cfg.message ? `<div class="modal2__message">${cfg.message}</div>` : ""}
          <div class="modal2__actions">
            <button type="button" class="${cfg.cancelClass}" data-modal-cancel>${cfg.cancelLabel}</button>
            <button type="button" class="${cfg.confirmClass}" data-modal-confirm>${cfg.confirmLabel}</button>
          </div>
        </div>
      </div>
    `;
    host.querySelectorAll("[data-modal-cancel]").forEach(el=>el.addEventListener("click",()=>finish(false),{once:true}));
    const confirm=host.querySelector("[data-modal-confirm]");
    if(confirm) confirm.addEventListener("click",()=>finish(true),{once:true});
  });
}

export function showChoiceModal(config){
  const cfg=Object.assign({
    title:"Choose an option",
    message:"",
    choices:[]
  }, config || {});
  return new Promise(resolve=>{
    const host=ensureModalHost();
    const finish=value=>{ closeAppModal(); resolve(value); };
    host.className="modal2";
    host.innerHTML=`
      <div class="modal2__scrim" data-modal-scrim></div>
      <div class="modal2__panel modal2__panel--md" role="dialog" aria-modal="true" aria-labelledby="appModalTitle">
        <div class="modal2__title" id="appModalTitle">${cfg.title}</div>
        <div class="modal2__content stack2 stack2--column stack2--gap-2">
          ${cfg.message ? `<div class="modal2__message">${cfg.message}</div>` : ""}
          <div class="modal2__actions modal2__actions--stacked">
            ${(cfg.choices || []).map(choice=>`<button type="button" class="${choice.className || "button2 button2--sm button2--ghost"}" data-modal-choice="${choice.value}">${choice.label}</button>`).join("")}
            <button type="button" class="button2 button2--sm button2--ghost" data-modal-cancel>${cfg.cancelLabel || "Cancel"}</button>
          </div>
        </div>
      </div>
    `;
    host.querySelectorAll("[data-modal-cancel]").forEach(el=>el.addEventListener("click",()=>finish(null),{once:true}));
    host.querySelectorAll("[data-modal-choice]").forEach(el=>el.addEventListener("click",()=>finish(el.getAttribute("data-modal-choice")),{once:true}));
  });
}
