// Home-page rendering/navigation helpers.

    function showPage(id){
      const pageIds=["homePage","ravenPage","settingsPage","guidesPage","otherPage","aboutPage","faqPage","reportBugPage"];
      pageIds.forEach(pageId=>{
        const el=document.getElementById(pageId);
        if(el) el.classList.toggle("hidden",pageId!==id);
      });
      if(typeof applyGlobalDisplaySettings==="function") applyGlobalDisplaySettings();
      window.scrollTo({top:0,behavior:"smooth"});
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


    function buildHomeHelpCard(){
      const card=document.createElement("div");
      card.className="home-feature-card static-card home-help-card";
      card.innerHTML=`
        <div class="home-feature-icon blue-icon help-icon-text">?</div>
        <div class="home-feature-copy">
          <div class="home-feature-title">Need Help?</div>
          <div class="home-feature-sub">Learn more about this project or address an issue.</div>
          ${renderSoftChipButtons([
            {label:"About",onclick:"showPage('aboutPage')"},
            {label:"FAQ",onclick:"showPage('faqPage')"},
            {label:"Report Bug",onclick:"showPage('reportBugPage')"}
          ])}
        </div>
      `;
      return card;
    }

    function removeExistingHomeHelpCards(){
      document.querySelectorAll(".home-help-card").forEach(el=>el.remove());
      document.querySelectorAll("#homeOtherPanel .home-feature-card").forEach(card=>{
        const title=card.querySelector(".home-feature-title");
        if(title && title.textContent.trim()==="Need Help?") card.remove();
      });
    }

    function placeHomeHelpCard(category){
      removeExistingHomeHelpCards();
      const target=document.getElementById(category==="other" ? "homeOtherPanel" : category==="guides" ? "homeGuidesPanel" : "homeToolsPanel");
      if(!target) return;
      const help=buildHomeHelpCard();
      if(category==="other") target.prepend(help);
      else target.append(help);
    }

    function setHomeCategory(category){
      const categories=["tools","guides","other"];
      const activeCategory=categories.includes(category) ? category : "tools";
      categories.forEach(name=>{
        const tab=document.getElementById("homeTab"+name.charAt(0).toUpperCase()+name.slice(1));
        const panel=document.getElementById("home"+name.charAt(0).toUpperCase()+name.slice(1)+"Panel");
        if(tab) tab.classList.toggle("active",name===activeCategory);
        if(panel) panel.classList.toggle("hidden",name!==activeCategory);
      });
      placeHomeHelpCard(activeCategory);
    }

    document.addEventListener("DOMContentLoaded",()=>{
      const activeTab=document.querySelector(".home-category-tab.active");
      const initial=activeTab && activeTab.id ? activeTab.id.replace("homeTab","").toLowerCase() : "tools";
      setHomeCategory(initial);
    });
