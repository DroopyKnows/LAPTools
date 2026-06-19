// Hub home rendering: nav drawer, category tabs, home card panels, placeholder pages.

import { renderHomeCardList, renderPlaceholderPage } from "../../app/ui/hub-card-components.js";
import {
  HUB_HOME_CATEGORIES,
  getHubHomeCategory,
  getHubHomeCategories,
  getHubMenuItems,
  getHubHomePanels,
  getHubPlaceholderPages
} from "../../app/registry/hub-registry.js";
import {
  getHubHomeCategoryValue,
  setHubHomeCategoryValue
} from "../../app/core/hub-state.js";

function titleCase(name){
  return name.charAt(0).toUpperCase()+name.slice(1);
}

function setButtonAction(button,pageId,category){
  button.type="button";
  button.dataset.action="navigateAndCloseMenu";
  button.dataset.actionEvent="click";
  button.dataset.page=pageId;
  if(category) button.dataset.category=category;
}

function createMenuButton(item,child=false){
  const button=document.createElement("button");
  button.className=child ? "h-btn h-btn--menu h-btn--menu-child" : "h-btn h-btn--menu";
  const category=child ? "" : item.category;
  setButtonAction(button,item.pageId,category);
  button.textContent=item.label || item.title || "Untitled";
  return button;
}

function createHomeCategoryTab(category){
  const button=document.createElement("button");
  button.className="h-tabs__tab";
  button.id="homeTab"+titleCase(category.id);
  button.type="button";
  button.dataset.action="setHomeCategory";
  button.dataset.actionEvent="click";
  button.dataset.arg0=category.id;
  button.textContent=category.label;
  return button;
}

export function renderHubNavigation(){
  const menu=document.getElementById("globalMenuTree");
  if(menu){
    menu.replaceChildren();
    getHubMenuItems().forEach(item=>{
      menu.appendChild(createMenuButton(item));
      (item.children || []).forEach(child=>{
        menu.appendChild(createMenuButton(child,true));
      });
    });
  }

  const tabs=document.getElementById("homeCategoryTabs");
  if(tabs){
    tabs.replaceChildren();
    getHubHomeCategories().forEach(category=>{
      tabs.appendChild(createHomeCategoryTab(category));
    });
  }
}

export function renderHubHomePanels(){
  getHubHomePanels().forEach(panel=>{
    renderHomeCardList(panel.panelId,panel.cards);
  });
}

export function renderHubPlaceholderPages(){
  getHubPlaceholderPages().forEach(page=>{
    renderPlaceholderPage(page.pageId,page.content);
  });
}

export function setHomeCategory(category){
  renderHubHomePanels();
  const activeCategory=getHubHomeCategory(category || getHubHomeCategoryValue());
  setHubHomeCategoryValue(activeCategory);
  HUB_HOME_CATEGORIES.forEach(name=>{
    const suffix=titleCase(name);
    const tab=document.getElementById("homeTab"+suffix);
    const panel=document.getElementById("home"+suffix+"Panel");
    if(tab) tab.classList.toggle("h-tabs__tab--active",name===activeCategory);
    if(panel) panel.classList.toggle("hidden",name!==activeCategory);
  });
}

export function initializeHubHomeContent(){
  renderHubNavigation();
  renderHubHomePanels();
  renderHubPlaceholderPages();
  const activeTab=document.querySelector(".h-tabs__tab.h-tabs__tab--active");
  const initial=activeTab && activeTab.id ? activeTab.id.replace("homeTab","").toLowerCase() : getHubHomeCategoryValue();
  setHomeCategory(initial);
}

if(typeof document!=="undefined"){
  document.addEventListener("DOMContentLoaded",()=>initializeHubHomeContent());
}
