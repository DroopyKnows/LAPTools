// App navigation/runtime shell helpers.
//
// Lives in src/shared so a tool may import it without reaching into src/app.
// Hub-shell dependencies (route/hash/id tables, the active-page setter) are injected
// via `context` so the hub and a tool can each supply their own.

export function createAppNavigationRuntimeModule(context = {}){
  const appPageRoutes=typeof context.getHubPageRoutes==="function" ? context.getHubPageRoutes() : (context.appPageRoutes || {});
  const appPageHashes=typeof context.getHubPageHashes==="function" ? context.getHubPageHashes() : (context.appPageHashes || {});
  const appPageIds=typeof context.getHubPageIds==="function" ? context.getHubPageIds() : (context.appPageIds || []);
  const setHubActivePageId=typeof context.setHubActivePageId==="function" ? context.setHubActivePageId : ()=>{};

  const ravenPageRoutes={
    calculator:"calculator",
    inventory:"inventory",
    whatif:"whatif",
    "what-if":"whatif"
  };

  let applyingAppRoute=false;

  function getRavenSubPage(){
    if(typeof context.getRavenSubPage === "function") return context.getRavenSubPage();
    return context.ravenSubPage || "calculator";
  }

  function setRavenSubPageValue(value){
    if(typeof context.setRavenSubPageValue === "function") context.setRavenSubPageValue(value);
    context.ravenSubPage=value;
  }

  function getState(){
    if(typeof context.getState === "function") return context.getState();
    return context.state || {};
  }

  function cleanAppHash(value){
    return String(value || "")
      .replace(/^#/,"")
      .replace(/^\/+/,'')
      .replace(/\/+$/g,"")
      .trim()
      .toLowerCase();
  }

  function appHashForPage(id){
    if(id==="ravenPage") return `raven/${getRavenSubPage() || "calculator"}`;
    return appPageHashes[id] || "home";
  }

  function updateAppHash(hash,replace){
    if(applyingAppRoute) return;
    const clean=cleanAppHash(hash) || "home";
    const target=`#${clean}`;
    if(window.location.hash===target) return;
    if(replace) history.replaceState(null,"",target);
    else history.pushState(null,"",target);
  }

  function showPage(id,options){
    const opts=options || {};
    const targetId=appPageIds.includes(id) ? id : "homePage";
    setHubActivePageId(targetId);
    appPageIds.forEach(pageId=>{
      const el=document.getElementById(pageId);
      if(el) el.classList.toggle("hidden",pageId!==targetId);
    });
    if(typeof applyGlobalDisplaySettings==="function") applyGlobalDisplaySettings();
    if(!opts.skipHash) updateAppHash(appHashForPage(targetId),!!opts.replaceHash);
    if(!opts.skipScroll) window.scrollTo({top:0,behavior:opts.instantScroll ? "auto" : "smooth"});
  }

  function applyRouteFromHash(options){
    const opts=options || {};
    const route=cleanAppHash(window.location.hash);
    const parts=(route || "home").split("/").filter(Boolean);
    const main=parts[0] || "home";
    const sub=parts[1] || "";
    const pageId=appPageRoutes[main] || "homePage";
    applyingAppRoute=true;
    showPage(pageId,{skipHash:true,skipScroll:!!opts.skipScroll,instantScroll:true});
    if(pageId==="ravenPage"){
      if(sub==="settings"){
        // Set the underlying tab (stays hidden behind Settings), then open Settings.
        if(typeof setRavenSubPage==="function") setRavenSubPage(getRavenSubPage() || "calculator",{skipHash:true,skipScroll:true,instantScroll:true});
        showRavenSettings({skipHash:true,skipScroll:!!opts.skipScroll,instantScroll:true});
      }else{
        const ravenRoute=ravenPageRoutes[sub] || (main==="inventory" ? "inventory" : main==="whatif" || main==="what-if" ? "whatif" : "calculator");
        if(typeof setRavenSubPage==="function") setRavenSubPage(ravenRoute,{skipHash:true,skipScroll:!!opts.skipScroll,instantScroll:true});
      }
    }
    applyingAppRoute=false;
    if(!route) updateAppHash("home",true);
    else if(pageId==="ravenPage" && main==="raven" && !sub) updateAppHash("raven/calculator",true);
  }

  function bindAppRouteEvents(options){
    if(window.__lapAppRouteEventsBound) return;
    window.__lapAppRouteEventsBound=true;
    // A tool may pass an AbortController signal so unmount can remove these; on
    // abort we clear the flag so a later mount rebinds. Hub shell binds permanently.
    const signal=options && options.signal;
    const listenerOptions=signal ? {signal} : undefined;
    window.addEventListener("hashchange",()=>applyRouteFromHash(),listenerOptions);
    window.addEventListener("popstate",()=>applyRouteFromHash(),listenerOptions);
    if(signal) signal.addEventListener("abort",()=>{ window.__lapAppRouteEventsBound=false; },{once:true});
  }

  function bindZoomGuard(options){
    if(window.__lapZoomGuardBound) return;
    window.__lapZoomGuardBound=true;
    // Block zoom-IN only (e.scale > 1); always allow zoom-OUT so a user who ended up
    // zoomed can pinch back to fit without toggling the setting. The listeners read the
    // live window.__lapZoomGuardActive flag (kept current in applyGlobalDisplaySettings).
    // Bound under the mount signal so unmount removes them; on abort we also clear the
    // flags and release the viewport lock so the guard cannot survive into the host page
    // after the tool is gone. With no signal (hub shell) it binds permanently, like the
    // route events.
    const signal=options && options.signal;
    const listenerOptions=signal ? {passive:false,signal} : {passive:false};
    const blockZoomIn=e=>{ if(window.__lapZoomGuardActive && e.scale>1) e.preventDefault(); };
    document.addEventListener("gesturestart",blockZoomIn,listenerOptions);
    document.addEventListener("gesturechange",blockZoomIn,listenerOptions);
    if(signal) signal.addEventListener("abort",()=>{
      window.__lapZoomGuardBound=false;
      window.__lapZoomGuardActive=false;
      const viewport=document.querySelector('meta[name="viewport"]');
      if(viewport) viewport.setAttribute("content","width=device-width, initial-scale=1.0");
    },{once:true});
  }

  // Hub chrome (global menu open/close, home category + home init) is owned by the hub,
  // not the tool. Those functions were removed during tool isolation: the tool renders no
  // global menu and no home content, so they were dead here. A hub provides its own.

  function getRavenGearHeroEyebrow(activeTab){
    if(activeTab==="whatif" || activeTab==="what-if") return "What If";
    if(activeTab==="inventory") return "Inventory";
    return "Calculator";
  }

  function updateRavenGearHeroEyebrow(activeTab){
    const el=document.getElementById("ravenGearHeroEyebrow");
    if(el) el.textContent=getRavenGearHeroEyebrow(activeTab);
  }

  function refreshInventoryAdvancedDetails(){
    const updateTabs=typeof context.getUpdateInventoryAdvancedTabs === "function"
      ? context.getUpdateInventoryAdvancedTabs()
      : globalThis.updateInventoryAdvancedTabs;
    const renderBreakdown=typeof context.getRenderBreakdownEstimatedInventory === "function"
      ? context.getRenderBreakdownEstimatedInventory()
      : globalThis.renderBreakdownEstimatedInventory;
    const renderSummary=typeof context.getRenderItemPlanSummary === "function"
      ? context.getRenderItemPlanSummary()
      : globalThis.renderItemPlanSummary;

    if(typeof updateTabs === "function") updateTabs();
    else {
      if(typeof renderBreakdown === "function") renderBreakdown();
      if(typeof renderSummary === "function") renderSummary();
    }
  }

  function refreshInventorySubPage(){
    const renderInventory=typeof context.getRenderInventory === "function"
      ? context.getRenderInventory()
      : globalThis.renderInventory;
    if(typeof renderInventory === "function") renderInventory();
    refreshInventoryAdvancedDetails();
    requestAnimationFrame(refreshInventoryAdvancedDetails);
  }

  function setRavenSubPage(page,options){
    const opts=options || {};
    const normalized=page==="what-if" ? "whatif" : page;
    const next=["whatif","calculator","inventory"].includes(normalized) ? normalized : "calculator";
    setRavenSubPageValue(next);
    updateRavenGearHeroEyebrow(next);
    // Choosing a page tab always returns to the main view (closes Settings).
    const mainView=document.getElementById("ravenGearMainView");
    const settingsView=document.getElementById("ravenSettingsSubPage");
    if(settingsView) settingsView.classList.add("hidden");
    if(mainView) mainView.classList.remove("hidden");
    const whatIfTab=document.getElementById("whatIfTab");
    const calcTab=document.getElementById("calcTab");
    const inventoryTab=document.getElementById("inventoryTab");
    if(whatIfTab) whatIfTab.classList.toggle("active",next==="whatif");
    if(calcTab) calcTab.classList.toggle("active",next==="calculator");
    if(inventoryTab) inventoryTab.classList.toggle("active",next==="inventory");
    const whatIfPage=document.getElementById("whatIfSubPage");
    if(whatIfPage) whatIfPage.classList.toggle("hidden",next!=="whatif");
    const calculatorPage=document.getElementById("calculatorSubPage");
    const inventoryPage=document.getElementById("inventorySubPage");
    if(calculatorPage) calculatorPage.classList.toggle("hidden",next!=="calculator");
    if(inventoryPage) inventoryPage.classList.toggle("hidden",next!=="inventory");
    const renderWhatIf=typeof context.getRenderWhatIf === "function" ? context.getRenderWhatIf() : context.renderWhatIf;
    if(next==="whatif" && typeof renderWhatIf==="function") renderWhatIf();
    if(next==="inventory") refreshInventorySubPage();
    if(!opts.skipHash) updateAppHash(`raven/${next}`,!!opts.replaceHash);
    if(!opts.skipScroll) window.scrollTo({top:0,behavior:opts.instantScroll ? "auto" : "smooth"});
  }

  // Settings is a tool sub-view (not a page tab): the gear tile opens it, replacing
  // the main view; its Back button closes it. Routed at raven/settings so a direct
  // load mounts the tool (and its CSS). ravenSubPage is left untouched so closing
  // returns to the tab that was active.
  function showRavenSettings(options){
    const opts=options || {};
    const mainView=document.getElementById("ravenGearMainView");
    const settingsView=document.getElementById("ravenSettingsSubPage");
    if(mainView) mainView.classList.add("hidden");
    if(settingsView) settingsView.classList.remove("hidden");
    if(typeof applyGlobalDisplaySettings==="function") applyGlobalDisplaySettings();
    if(!opts.skipHash) updateAppHash("raven/settings",!!opts.replaceHash);
    if(!opts.skipScroll) window.scrollTo({top:0,behavior:opts.instantScroll ? "auto" : "smooth"});
  }

  function closeRavenSettings(options){
    const opts=options || {};
    const mainView=document.getElementById("ravenGearMainView");
    const settingsView=document.getElementById("ravenSettingsSubPage");
    if(settingsView) settingsView.classList.add("hidden");
    if(mainView) mainView.classList.remove("hidden");
    if(!opts.skipHash) updateAppHash(`raven/${getRavenSubPage() || "calculator"}`,!!opts.replaceHash);
    if(!opts.skipScroll) window.scrollTo({top:0,behavior:opts.instantScroll ? "auto" : "smooth"});
  }

  function toggleCard(id){
    const card=document.getElementById(id);
    if(!card) return;
    const isOpen=card.classList.toggle("card2--open");
    if(isOpen && id==="inventoryAdvancedDetailsCard") refreshInventoryAdvancedDetails();
  }

  function applyGlobalDisplaySettings(){
    const state=getState();
    document.body.classList.toggle("hide-more-info-sections",!!state.hideMoreInformationSections);
    document.body.classList.toggle("hide-advanced-sections",!!state.hideAdvancedSections);
    const moreToggle=document.getElementById("hideMoreInformationSetting");
    const advancedToggle=document.getElementById("hideAdvancedSetting");
    if(moreToggle) moreToggle.checked=!!state.hideMoreInformationSections;
    if(advancedToggle) advancedToggle.checked=!!state.hideAdvancedSections;
    // Snapshot visibility (on | off | onlyClosed | onlyOpen): default "on" sets no class.
    const snapshotMode=state.snapshotMode || "on";
    document.body.classList.toggle("snapshots-off",snapshotMode==="off");
    document.body.classList.toggle("snapshots-only-closed",snapshotMode==="onlyClosed");
    document.body.classList.toggle("snapshots-only-open",snapshotMode==="onlyOpen");
    ["on","off","onlyClosed","onlyOpen"].forEach(mode=>{
      const tab=document.getElementById("snapshotSetting-"+mode);
      if(tab) tab.classList.toggle("active",snapshotMode===mode);
    });
    // Card title subtext visibility (on | off | onlyOpen): default "on" sets no class.
    const subtextMode=state.subtextMode || "on";
    document.body.classList.toggle("subtext-off",subtextMode==="off");
    document.body.classList.toggle("subtext-only-open",subtextMode==="onlyOpen");
    ["on","off","onlyOpen"].forEach(mode=>{
      const tab=document.getElementById("subtextSetting-"+mode);
      if(tab) tab.classList.toggle("active",subtextMode===mode);
    });
    // Raven Gear mobile zoom lock: while the tool page is showing, pin the viewport
    // to maximum-scale=1 unless the user opted into zoom via the Allow zoom setting.
    const allowZoom=!!state.allowZoom;
    const zoomToggle=document.getElementById("allowZoomSetting");
    if(zoomToggle) zoomToggle.checked=allowZoom;
    const ravenPage=document.getElementById("ravenPage");
    const ravenActive=!!(ravenPage && !ravenPage.classList.contains("hidden"));
    const zoomGuardOn=ravenActive && !allowZoom;
    const viewport=document.querySelector('meta[name="viewport"]');
    if(viewport){
      const base="width=device-width, initial-scale=1.0";
      viewport.setAttribute("content",zoomGuardOn ? base+", maximum-scale=1" : base);
    }
    // iOS Safari ignores maximum-scale for manual pinch, so the pinch gesture is
    // also blocked while the guard is active — see bindZoomGuard, which binds the
    // gesture listeners once at mount under the AbortController signal. Here we only
    // update the live flag those listeners read (the viewport meta is set above).
    window.__lapZoomGuardActive=zoomGuardOn;
  }

  function setGlobalSetting(setting,value){
    const state=getState();
    if(setting==="moreInfo") state.hideMoreInformationSections=!!value;
    if(setting==="advanced") state.hideAdvancedSections=!!value;
    if(setting==="snapshots") state.snapshotMode=value;
    if(setting==="subtext") state.subtextMode=value;
    if(setting==="allowZoom") state.allowZoom=!!value;
    if(typeof context.save === "function") context.save();
    applyGlobalDisplaySettings();
  }

  return {
    appPageIds,
    appPageRoutes,
    appPageHashes,
    ravenPageRoutes,
    cleanAppHash,
    appHashForPage,
    updateAppHash,
    showPage,
    applyRouteFromHash,
    bindAppRouteEvents,
    bindZoomGuard,
    getRavenGearHeroEyebrow,
    updateRavenGearHeroEyebrow,
    setRavenSubPage,
    showRavenSettings,
    closeRavenSettings,
    toggleCard,
    applyGlobalDisplaySettings,
    setGlobalSetting
  };
}
