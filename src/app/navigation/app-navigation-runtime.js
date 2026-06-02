// App navigation/runtime shell helpers.
// Owns hub page routing, global drawer controls, and Raven Gear sub-page navigation.

export function createAppNavigationRuntimeModule(context = {}){
  const appPageRoutes={
    home:"homePage",
    raven:"ravenPage",
    calculator:"ravenPage",
    inventory:"ravenPage",
    whatif:"ravenPage",
    "what-if":"ravenPage",
    settings:"settingsPage",
    guides:"guidesPage",
    other:"otherPage",
    about:"aboutPage",
    faq:"faqPage",
    "report-bug":"reportBugPage"
  };

  const appPageHashes={
    homePage:"home",
    ravenPage:"raven/calculator",
    settingsPage:"settings",
    guidesPage:"guides",
    otherPage:"other",
    aboutPage:"about",
    faqPage:"faq",
    reportBugPage:"report-bug"
  };

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
    const pageIds=["homePage","ravenPage","settingsPage","guidesPage","otherPage","aboutPage","faqPage","reportBugPage"];
    const targetId=pageIds.includes(id) ? id : "homePage";
    pageIds.forEach(pageId=>{
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
      const ravenRoute=ravenPageRoutes[sub] || (main==="inventory" ? "inventory" : main==="whatif" || main==="what-if" ? "whatif" : "calculator");
      if(typeof setRavenSubPage==="function") setRavenSubPage(ravenRoute,{skipHash:true,skipScroll:!!opts.skipScroll,instantScroll:true});
    }
    applyingAppRoute=false;
    if(!route) updateAppHash("home",true);
    else if(pageId==="ravenPage" && main==="raven" && !sub) updateAppHash("raven/calculator",true);
  }

  function bindAppRouteEvents(){
    if(window.__lapAppRouteEventsBound) return;
    window.__lapAppRouteEventsBound=true;
    window.addEventListener("hashchange",()=>applyRouteFromHash());
    window.addEventListener("popstate",()=>applyRouteFromHash());
  }

  function openGlobalMenu(){
    const panel=document.getElementById("globalMenuPanel");
    const scrim=document.getElementById("menuScrim");
    if(panel){ panel.classList.add("open"); panel.setAttribute("aria-hidden","false"); }
    if(scrim) scrim.classList.remove("hidden");
  }

  function closeGlobalMenu(){
    const panel=document.getElementById("globalMenuPanel");
    const scrim=document.getElementById("menuScrim");
    if(panel){ panel.classList.remove("open"); panel.setAttribute("aria-hidden","true"); }
    if(scrim) scrim.classList.add("hidden");
  }

  function setHomeCategory(category){
    if(typeof context.setHubHomeCategory === "function") context.setHubHomeCategory(category);
  }

  function initializeHomeContent(){
    if(typeof context.initializeHubHomeContent === "function") context.initializeHubHomeContent();
  }

  function setRavenSubPage(page,options){
    const opts=options || {};
    const normalized=page==="what-if" ? "whatif" : page;
    const next=["whatif","calculator","inventory"].includes(normalized) ? normalized : "calculator";
    setRavenSubPageValue(next);
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
    if(!opts.skipHash) updateAppHash(`raven/${next}`,!!opts.replaceHash);
    if(!opts.skipScroll) window.scrollTo({top:0,behavior:opts.instantScroll ? "auto" : "smooth"});
  }

  function toggleCard(id){
    document.getElementById(id).classList.toggle("open");
  }

  function toggleSettingsPanel(){
    const panel=document.getElementById("settingsPanel");
    const tile=document.getElementById("settingsTile");
    if(!panel) return;
    const isOpen=panel.classList.toggle("open");
    if(tile) tile.classList.toggle("active",isOpen);
  }

  function applyGlobalDisplaySettings(){
    const state=getState();
    document.body.classList.toggle("hide-more-info-sections",!!state.hideMoreInformationSections);
    document.body.classList.toggle("hide-advanced-sections",!!state.hideAdvancedSections);
    const moreToggle=document.getElementById("hideMoreInformationSetting");
    const advancedToggle=document.getElementById("hideAdvancedSetting");
    if(moreToggle) moreToggle.checked=!!state.hideMoreInformationSections;
    if(advancedToggle) advancedToggle.checked=!!state.hideAdvancedSections;
  }

  function setGlobalSetting(setting,checked){
    const state=getState();
    if(setting==="moreInfo") state.hideMoreInformationSections=!!checked;
    if(setting==="advanced") state.hideAdvancedSections=!!checked;
    if(typeof context.save === "function") context.save();
    applyGlobalDisplaySettings();
  }

  return {
    appPageRoutes,
    appPageHashes,
    ravenPageRoutes,
    cleanAppHash,
    appHashForPage,
    updateAppHash,
    showPage,
    applyRouteFromHash,
    bindAppRouteEvents,
    openGlobalMenu,
    closeGlobalMenu,
    setHomeCategory,
    initializeHomeContent,
    setRavenSubPage,
    toggleCard,
    toggleSettingsPanel,
    applyGlobalDisplaySettings,
    setGlobalSetting
  };
}
