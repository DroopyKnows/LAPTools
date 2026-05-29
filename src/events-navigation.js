    function setRavenSubPage(page,options){
      const opts=options || {};
      const normalized=page==="what-if" ? "whatif" : page;
      ravenSubPage=["whatif","calculator","inventory"].includes(normalized) ? normalized : "calculator";
      const whatIfTab=document.getElementById("whatIfTab");
      const calcTab=document.getElementById("calcTab");
      const inventoryTab=document.getElementById("inventoryTab");
      if(whatIfTab) whatIfTab.classList.toggle("active",ravenSubPage==="whatif");
      if(calcTab) calcTab.classList.toggle("active",ravenSubPage==="calculator");
      if(inventoryTab) inventoryTab.classList.toggle("active",ravenSubPage==="inventory");
      const whatIfPage=document.getElementById("whatIfSubPage");
      if(whatIfPage) whatIfPage.classList.toggle("hidden",ravenSubPage!=="whatif");
      const calculatorPage=document.getElementById("calculatorSubPage");
      const inventoryPage=document.getElementById("inventorySubPage");
      if(calculatorPage) calculatorPage.classList.toggle("hidden",ravenSubPage!=="calculator");
      if(inventoryPage) inventoryPage.classList.toggle("hidden",ravenSubPage!=="inventory");
      if(ravenSubPage==="whatif" && typeof renderWhatIf==="function") renderWhatIf();
      if(!opts.skipHash && typeof updateAppHash==="function") updateAppHash(`raven/${ravenSubPage}`,!!opts.replaceHash);
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
      document.body.classList.toggle("hide-more-info-sections",!!state.hideMoreInformationSections);
      document.body.classList.toggle("hide-advanced-sections",!!state.hideAdvancedSections);
      const moreToggle=document.getElementById("hideMoreInformationSetting");
      const advancedToggle=document.getElementById("hideAdvancedSetting");
      if(moreToggle) moreToggle.checked=!!state.hideMoreInformationSections;
      if(advancedToggle) advancedToggle.checked=!!state.hideAdvancedSections;
    }

    function setGlobalSetting(setting,checked){
      if(setting==="moreInfo") state.hideMoreInformationSections=!!checked;
      if(setting==="advanced") state.hideAdvancedSections=!!checked;
      save();
      applyGlobalDisplaySettings();
    }
