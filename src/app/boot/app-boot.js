// Boot coordinator

import { exposeActionRegistry } from "../core/action-registry.js";
import { mountRavenGearTool } from "../core/app-runtime.js";
import { unmountHubTool } from "../tools/tool-loader.js";
import { createDelegatedActionRuntimeModule } from "../../shared/events/delegated-actions.js";
import { createAppNavigationRuntimeModule } from "../../shared/navigation/app-navigation-runtime.js";
import { getHubPageHashes, getHubPageIds, getHubPageRoutes } from "../registry/hub-registry.js";
import { setHubActivePageId } from "../core/hub-state.js";
import { initializeHubHomeContent, setHomeCategory as setHubHomeCategory } from "../../pages/home/home-render.js";

const RAVEN_PAGE_ID="ravenPage";
const RAVEN_GEAR_TOOL_ID="raven-gear";
const RAVEN_ROUTE_NAMES=new Set(["raven","calculator","inventory","whatif","what-if"]);

let ravenMountPromise=null;

function cleanHashRoute(){
  return String(window.location.hash || "")
    .replace(/^#/,"")
    .replace(/^\/+/,"")
    .replace(/\/+$/g,"")
    .trim()
    .toLowerCase();
}

function currentRouteTargetsRaven(){
  const route=cleanHashRoute();
  const firstPart=(route || "").split("/").filter(Boolean)[0] || "";
  return RAVEN_ROUTE_NAMES.has(firstPart);
}

function currentLoadIsTestHarness(){
  return new URLSearchParams(window.location.search).has("testHarness");
}

function ensureRavenGearMounted(context = {}){
  if(!ravenMountPromise){
    ravenMountPromise=mountRavenGearTool(context).catch(error=>{
      ravenMountPromise=null;
      throw error;
    });
  }
  return ravenMountPromise;
}

function installLazyRavenNavigation(navigation){
  const hubShowPage=navigation.showPage;

  async function showPage(id,options){
    if(id===RAVEN_PAGE_ID){
      await ensureRavenGearMounted({ source:"lazy-show-page" });
      const activeShowPage=window.showPage || globalThis.showPage;
      if(activeShowPage && activeShowPage!==showPage) return activeShowPage(id,options);
    }
    return hubShowPage(id,options);
  }

  async function applyRouteFromHash(options){
    if(currentRouteTargetsRaven() || currentLoadIsTestHarness()) await ensureRavenGearMounted({ source:"lazy-route" });
    const activeApplyRoute=window.applyRouteFromHash || globalThis.applyRouteFromHash;
    if(activeApplyRoute && activeApplyRoute!==applyRouteFromHash) return activeApplyRoute(options);
    return navigation.applyRouteFromHash(options);
  }

  Object.assign(window,{ showPage, applyRouteFromHash });

  if(!window.__lapAppRouteEventsBound){
    window.__lapAppRouteEventsBound=true;
    window.addEventListener("hashchange",()=>applyRouteFromHash());
    window.addEventListener("popstate",()=>applyRouteFromHash());
  }

  return { showPage, applyRouteFromHash };
}

function exposeHubShellRuntime(){
  exposeActionRegistry(window);

  const navigation=createAppNavigationRuntimeModule({
    getHubPageRoutes,
    getHubPageHashes,
    getHubPageIds,
    setHubActivePageId,
    setHubHomeCategory
  });
  Object.assign(window,navigation);

  const delegated=createDelegatedActionRuntimeModule({
    getActionRegistry:()=>window.LAP_ACTIONS,
    getActionFunction:name=>window[name] || globalThis[name]
  });

  delegated.registerDelegatedActions();
  delegated.bindDelegatedUiEvents();

  initializeHubHomeContent();
  return navigation;
}

// Test-only: drives the Raven Gear mount lifecycle so the harness can assert a clean
// unmount -> remount cycle. Clears the lazy-mount promise so normal nav still works after.
function exposeRavenGearRemountTestHooks(){
  if(typeof window==="undefined") return;
  window.__lapUnmountRavenGearTool=async function(){
    const result=await unmountHubTool(RAVEN_GEAR_TOOL_ID);
    ravenMountPromise=null;
    return result;
  };
  window.__lapMountRavenGearToolInto=async function(root){
    ravenMountPromise=null;
    return ensureRavenGearMounted(root ? { root, source:"test-remount" } : { source:"test-remount" });
  };
}

export async function bootApp(){
  const navigation=exposeHubShellRuntime();
  const lazyNavigation=installLazyRavenNavigation(navigation);
  exposeRavenGearRemountTestHooks();
  await lazyNavigation.applyRouteFromHash({ skipScroll:true });
}
