// Hub registry: tools, pages, menu entries, and the home-card / route derivation.

import { aboutPageContent } from "../../pages/about/about-page.js";
import { faqPageContent } from "../../pages/faq/faq-page.js";
import { reportBugPageContent } from "../../pages/report-bug/report-bug-page.js";
import { guidesPageContent } from "../../guides/guides-page.js";
import { otherPageContent } from "../../other/other-page.js";
import { comingSoonCard, needHelpCard } from "../ui/hub-card-components.js";

// Registry constants
export const HUB_HOME_DEFAULT_CATEGORY="tools";
export const HUB_HOME_CATEGORIES=["tools","guides","other"];
export const HUB_HOME_PAGE_ID="homePage";
// Settings is owned by the Raven Gear tool (routed at raven/settings), not the hub.

export const hubHomeCategoryRegistry=[
  {id:"tools",label:"\u{1F6E0} LAP Tools",panelId:"homeToolsPanel"},
  {id:"guides",label:"\u{1F4D6} Guides",panelId:"homeGuidesPanel"},
  {id:"other",label:"\u2605 Other",panelId:"homeOtherPanel"}
];

// Registry data
export const hubToolRegistry=[
  {
    id:"raven-gear",
    title:"Raven Gear Calculator",
    subtitle:"Calculator and inventory pages for Raven item planning.",
    category:"tools",
    pageId:"ravenPage",
    route:"raven/calculator",
    aliases:["raven","calculator","inventory","whatif","what-if"],
    order:10,
    enabled:true,
    icon:"\uD83E\uDEB6",
    className:"raven-home-card",
    loader:()=>import("../../tools/raven-gear/raven-gear-runtime.js")
  }
];

export const hubPageRegistry=[
  {
    id:"guides",
    title:"Guides",
    subtitle:"More guides are on the way.",
    category:"guides",
    pageId:"guidesPage",
    route:"guides",
    order:20,
    enabled:true,
    content:guidesPageContent
  },
  {
    id:"other",
    title:"Other",
    subtitle:"More tools and pages are on the way.",
    category:"other",
    pageId:"otherPage",
    route:"other",
    order:30,
    enabled:true,
    content:otherPageContent
  },
  {
    id:"about",
    title:"About",
    category:"support",
    pageId:"aboutPage",
    route:"about",
    order:40,
    enabled:true,
    content:aboutPageContent
  },
  {
    id:"faq",
    title:"FAQ",
    category:"support",
    pageId:"faqPage",
    route:"faq",
    order:50,
    enabled:true,
    content:faqPageContent
  },
  {
    id:"report-bug",
    title:"Report a Problem",
    actionLabel:"Report Bug",
    category:"support",
    pageId:"reportBugPage",
    route:"report-bug",
    order:60,
    enabled:true,
    content:reportBugPageContent
  }
];

export const hubMenuRegistry=[
  {
    id:"home",
    label:"Home",
    pageId:HUB_HOME_PAGE_ID,
    order:0
  },
  {
    id:"tools",
    label:"Tools",
    pageId:HUB_HOME_PAGE_ID,
    category:"tools",
    order:10,
    children:["raven-gear"]
  },
  {
    id:"guides",
    label:"Guides",
    pageId:"guidesPage",
    order:20
  },
  {
    id:"other",
    label:"Other",
    pageId:"otherPage",
    order:30,
    children:["about","faq","report-bug"]
  }
];

// Registry helpers
function byOrder(a,b){
  return (a.order || 0)-(b.order || 0);
}

function toHomeCard(entry){
  return {
    title:entry.title,
    subtitle:entry.subtitle || "",
    icon:entry.icon,
    asButton:true,
    action:"showPage",
    actionEvent:"click",
    arg0:entry.pageId,
    className:entry.className || ""
  };
}

function toComingSoonCard(entry){
  return comingSoonCard(entry.subtitle || "More content is on the way.");
}

function getEnabledEntries(entries){
  return entries.filter(entry=>entry.enabled!==false).slice().sort(byOrder);
}

function getRegistryEntry(id){
  return [...hubToolRegistry,...hubPageRegistry].find(entry=>entry.id===id) || null;
}

function getCategoryConfig(category){
  return hubHomeCategoryRegistry.find(item=>item.id===category) || hubHomeCategoryRegistry[0];
}

export function getHubToolById(id){
  return hubToolRegistry.find(entry=>entry.id===id) || null;
}

export function getHubPageById(id){
  return hubPageRegistry.find(entry=>entry.id===id) || null;
}

function getSupportPageActions(){
  return getEnabledEntries(hubPageRegistry)
    .filter(entry=>entry.category==="support")
    .map(entry=>({
      label:entry.actionLabel || entry.title,
      action:"showPage",
      arg0:entry.pageId
    }));
}

export function getHubHomeCategory(category){
  return HUB_HOME_CATEGORIES.includes(category) ? category : HUB_HOME_DEFAULT_CATEGORY;
}

export function getHubHomeCategories(){
  return hubHomeCategoryRegistry.map(category=>Object.assign({},category));
}

export function getHubHomePanelId(category){
  return getCategoryConfig(getHubHomeCategory(category)).panelId;
}

export function getHubHomeCards(category){
  const activeCategory=getHubHomeCategory(category);
  const supportCard=needHelpCard(getSupportPageActions());
  if(activeCategory==="tools"){
    return [
      ...getEnabledEntries(hubToolRegistry).filter(entry=>entry.category==="tools").map(toHomeCard),
      supportCard
    ];
  }
  if(activeCategory==="guides"){
    return [
      ...getEnabledEntries(hubPageRegistry).filter(entry=>entry.category==="guides").map(toComingSoonCard),
      supportCard
    ];
  }
  return [
    supportCard,
    ...getEnabledEntries(hubPageRegistry).filter(entry=>entry.category==="other").map(toComingSoonCard)
  ];
}

export function getHubHomePanels(){
  return HUB_HOME_CATEGORIES.map(category=>({
    category,
    panelId:getHubHomePanelId(category),
    cards:getHubHomeCards(category)
  }));
}

export function getHubPlaceholderPages(){
  return getEnabledEntries(hubPageRegistry)
    .filter(entry=>entry.content)
    .map(entry=>({pageId:entry.pageId,content:entry.content}));
}

export function getHubMenuItems(){
  return hubMenuRegistry.slice().sort(byOrder).map(item=>{
    const children=(item.children || []).map(getRegistryEntry).filter(Boolean);
    return Object.assign({},item,{children});
  });
}

export function getHubPageIds(){
  const ids=[HUB_HOME_PAGE_ID];
  [...hubToolRegistry,...hubPageRegistry].forEach(entry=>{
    if(entry.pageId && !ids.includes(entry.pageId)) ids.push(entry.pageId);
  });
  return ids;
}

export function getHubPageRoutes(){
  const routes={home:HUB_HOME_PAGE_ID};
  [...hubToolRegistry,...hubPageRegistry].forEach(entry=>{
    if(entry.route) routes[entry.route]=entry.pageId;
    if(entry.id) routes[entry.id]=entry.pageId;
    (entry.aliases || []).forEach(alias=>{ routes[alias]=entry.pageId; });
  });
  return routes;
}

export function getHubPageHashes(){
  const hashes={
    [HUB_HOME_PAGE_ID]:"home"
  };
  [...hubToolRegistry,...hubPageRegistry].forEach(entry=>{
    if(entry.pageId) hashes[entry.pageId]=entry.route || entry.id;
  });
  return hashes;
}

// Compatibility exports
export const hubHomeCardRegistry={
  tools:getHubHomeCards("tools"),
  guides:getHubHomeCards("guides"),
  other:getHubHomeCards("other")
};

export const hubPlaceholderPageRegistry=getHubPlaceholderPages();
export const toolsHomeCards=hubHomeCardRegistry.tools;
export const guidesHomeCards=hubHomeCardRegistry.guides;
export const otherHomeCards=hubHomeCardRegistry.other;
