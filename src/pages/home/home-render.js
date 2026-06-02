// Home hub renderer. Home owns the layout containers; hub sections own card data.

import { renderHomeCardList, renderPlaceholderPage } from "../../shared/ui/hub-card-components.js";
import { toolsHomeCards } from "../../tools/tools-home-cards.js";
import { guidesHomeCards } from "../../guides/guides-home-cards.js";
import { guidesPageContent } from "../../guides/guides-page.js";
import { otherHomeCards } from "../../other/other-home-cards.js";
import { otherPageContent } from "../../other/other-page.js";
import { aboutPageContent } from "../about/about-page.js";
import { faqPageContent } from "../faq/faq-page.js";
import { reportBugPageContent } from "../report-bug/report-bug-page.js";

const homeCategories=["tools","guides","other"];

function titleCaseCategory(name){
  return name.charAt(0).toUpperCase()+name.slice(1);
}

export function renderHubHomePanels(){
  renderHomeCardList("homeToolsPanel",toolsHomeCards);
  renderHomeCardList("homeGuidesPanel",guidesHomeCards);
  renderHomeCardList("homeOtherPanel",otherHomeCards);
}

export function renderHubPlaceholderPages(){
  renderPlaceholderPage("guidesPage",guidesPageContent);
  renderPlaceholderPage("otherPage",otherPageContent);
  renderPlaceholderPage("aboutPage",aboutPageContent);
  renderPlaceholderPage("faqPage",faqPageContent);
  renderPlaceholderPage("reportBugPage",reportBugPageContent);
}

export function setHomeCategory(category){
  renderHubHomePanels();
  const activeCategory=homeCategories.includes(category) ? category : "tools";
  homeCategories.forEach(name=>{
    const suffix=titleCaseCategory(name);
    const tab=document.getElementById("homeTab"+suffix);
    const panel=document.getElementById("home"+suffix+"Panel");
    if(tab) tab.classList.toggle("active",name===activeCategory);
    if(panel) panel.classList.toggle("hidden",name!==activeCategory);
  });
}

export function initializeHubHomeContent(){
  renderHubHomePanels();
  renderHubPlaceholderPages();
  const activeTab=document.querySelector(".home-category-tab.active");
  const initial=activeTab && activeTab.id ? activeTab.id.replace("homeTab","").toLowerCase() : "tools";
  setHomeCategory(initial);
}

if(typeof document!=="undefined"){
  document.addEventListener("DOMContentLoaded",()=>initializeHubHomeContent());
}
