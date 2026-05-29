// UI event handlers and user actions.

    function setRavenSubPage(page){
      ravenSubPage=page;
      const whatIfTab=document.getElementById("whatIfTab");
      const calcTab=document.getElementById("calcTab");
      const inventoryTab=document.getElementById("inventoryTab");
      if(whatIfTab) whatIfTab.classList.toggle("active",page==="whatif");
      if(calcTab) calcTab.classList.toggle("active",page==="calculator");
      if(inventoryTab) inventoryTab.classList.toggle("active",page==="inventory");
      const whatIfPage=document.getElementById("whatIfSubPage");
      if(whatIfPage) whatIfPage.classList.toggle("hidden",page!=="whatif");
      document.getElementById("calculatorSubPage").classList.toggle("hidden",page!=="calculator");
      document.getElementById("inventorySubPage").classList.toggle("hidden",page!=="inventory");
      if(page==="whatif" && typeof renderWhatIf==="function") renderWhatIf();
      window.scrollTo({top:0,behavior:"smooth"});
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
