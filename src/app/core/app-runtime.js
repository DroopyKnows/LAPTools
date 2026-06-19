// Runtime facade

import { exposeActionRegistry } from "./action-registry.js";
import { exposeAppBridge } from "./app-bridge.js";
import { exposeTestExports } from "./test-exports.js";
import { setHubActivePageId } from "./hub-state.js";
import { mountHubTool } from "../tools/tool-loader.js";
import { getHubPageHashes, getHubPageIds, getHubPageRoutes } from "../registry/hub-registry.js";
import { initializeHubHomeContent, setHomeCategory as setHubHomeCategory } from "../../pages/home/home-render.js";

const RAVEN_GEAR_TOOL_ID="raven-gear";
const RAVEN_GEAR_PAGE_ID="ravenPage";

// Hub-shell services the tool can't import directly (it lives under src/tools and
// must not reach into src/app or src/pages). Supplied here via host.navigation.
function createRavenGearToolHostNavigation(){
  return {
    getHubPageRoutes,
    getHubPageHashes,
    getHubPageIds,
    setHubActivePageId,
    initializeHubHomeContent,
    setHubHomeCategory
  };
}

function createRavenGearToolHost(){
  return {
    exposeAppBridge,
    exposeTestExports,
    exposeActionRegistry,
    navigation:createRavenGearToolHostNavigation()
  };
}

function resolveRavenGearRoot(context){
  if(context.root) return context.root;
  if(typeof document === "undefined") return null;
  return document.getElementById(RAVEN_GEAR_PAGE_ID);
}

export async function mountRavenGearTool(context = {}){
  const mounted=await mountHubTool(RAVEN_GEAR_TOOL_ID, {
    ...context,
    root:resolveRavenGearRoot(context),
    host:createRavenGearToolHost()
  });
  return mounted.contract || mounted.module;
}

async function withRavenGearRuntime(callback){
  const runtime=await mountRavenGearTool();
  if(typeof callback === "function") return callback(runtime);
  return runtime;
}

export function initializeRuntimeState(){
  return withRavenGearRuntime(runtime=>runtime.initializeRavenGearRuntimeState && runtime.initializeRavenGearRuntimeState());
}

export function bootScannerRuntimeModule(){
  return withRavenGearRuntime(runtime=>runtime.bootRavenGearScannerRuntimeModule && runtime.bootRavenGearScannerRuntimeModule());
}

export function bootInventoryRuntimeModule(){
  return withRavenGearRuntime(runtime=>runtime.bootRavenGearInventoryRuntimeModule && runtime.bootRavenGearInventoryRuntimeModule());
}

export function bootCalculatorRuntimeModule(){
  return withRavenGearRuntime(runtime=>runtime.bootRavenGearCalculatorRuntimeModule && runtime.bootRavenGearCalculatorRuntimeModule());
}

export function bootNavigationRuntimeModule(){
  return withRavenGearRuntime(runtime=>runtime.bootRavenGearNavigationRuntimeModule && runtime.bootRavenGearNavigationRuntimeModule());
}

export function exposeRuntimeBridge(){
  return withRavenGearRuntime(runtime=>runtime.exposeRavenGearRuntimeBridge && runtime.exposeRavenGearRuntimeBridge());
}

export function exposeRuntimeTests(){
  return withRavenGearRuntime(runtime=>runtime.exposeRavenGearRuntimeTests && runtime.exposeRavenGearRuntimeTests());
}
