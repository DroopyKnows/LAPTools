// Raven Gear public runtime facade

import {
  bootRavenGearCalculatorRuntimeModule,
  bootRavenGearInventoryRuntimeModule,
  bootRavenGearNavigationRuntimeModule,
  bootRavenGearScannerRuntimeModule,
  exposeRavenGearRuntimeBridge,
  exposeRavenGearRuntimeTests,
  initRavenGearRuntime,
  initializeRavenGearRuntimeState,
  resetRavenGearRuntime
} from "./bootstrap/raven-gear-runtime-coordinator.js";
import { renderRavenGearShell } from "./shell/raven-gear-shell.js";

const RAVEN_GEAR_STYLESHEET_ID="raven-gear-tool-styles";
const RAVEN_GEAR_STYLESHEET_HREF=new URL("./styles/index.css", import.meta.url).href;

let stylesheetReady=null;
let mounted=false;
let mountedRoot=null;
let mountController=null;

function injectRavenGearShell(root){
  if(!root) return;
  // Inject the tool's own markup before boot binds/queries any element ids.
  if(!root.querySelector("#calculatorSubPage")) root.innerHTML=renderRavenGearShell();
}

function removeRavenGearStylesheet(){
  if(typeof document === "undefined") return;
  const link=document.getElementById(RAVEN_GEAR_STYLESHEET_ID);
  if(link && link.parentNode) link.parentNode.removeChild(link);
  stylesheetReady=null;
}

function isRavenGearStylesheetLoaded(link){
  return !!link && [...document.styleSheets].some(sheet=>sheet.href===link.href);
}

function ensureRavenGearStylesheet(){
  if(typeof document === "undefined") return Promise.resolve(null);
  let link=document.getElementById(RAVEN_GEAR_STYLESHEET_ID);
  if(link && isRavenGearStylesheetLoaded(link)) return Promise.resolve(link);
  if(stylesheetReady) return stylesheetReady;
  if(!link){
    link=document.createElement("link");
    link.id=RAVEN_GEAR_STYLESHEET_ID;
    link.rel="stylesheet";
    link.href=RAVEN_GEAR_STYLESHEET_HREF;
  }
  stylesheetReady=new Promise((resolve,reject)=>{
    link.addEventListener("load",()=>resolve(link),{once:true});
    link.addEventListener("error",()=>reject(new Error("Raven Gear stylesheet failed to load.")),{once:true});
  }).finally(()=>{ stylesheetReady=null; });
  if(!link.parentNode) document.head.appendChild(link);
  return stylesheetReady;
}

export async function mountTool(context = {}){
  await ensureRavenGearStylesheet();
  if(!mounted){
    mountedRoot=context.root || null;
    injectRavenGearShell(mountedRoot);
    // Per-mount AbortController scopes the document/window listeners this mount
    // adds, so unmountTool can remove exactly them.
    mountController=(typeof AbortController!=="undefined") ? new AbortController() : null;
    const runtime=initRavenGearRuntime(context.host, context);
    runtime.initializeRavenGearRuntimeState();
    runtime.bootRavenGearScannerRuntimeModule();
    runtime.bootRavenGearInventoryRuntimeModule();
    runtime.bootRavenGearCalculatorRuntimeModule();
    runtime.bootRavenGearNavigationRuntimeModule();
    if(typeof runtime.bindRavenGearUiEventListeners==="function"){
      runtime.bindRavenGearUiEventListeners(mountController ? mountController.signal : undefined);
    }
    runtime.exposeRavenGearRuntimeBridge();
    runtime.exposeRavenGearRuntimeTests();
    mounted=true;
  }
  return ravenGearToolContract;
}

export function unmountTool(){
  if(!mounted) return false;
  // Remove the listeners this mount added (delegated dispatch + hash routing).
  if(mountController){ mountController.abort(); mountController=null; }
  // Remove the injected shell markup (this also drops any shell-element listeners).
  if(mountedRoot && typeof mountedRoot.replaceChildren==="function") mountedRoot.replaceChildren();
  mountedRoot=null;
  // Remove the injected tool stylesheet.
  removeRavenGearStylesheet();
  // Drop the cached coordinator runtime so the next mount rebuilds its bindings
  // (byId/queryRoot) against the next root rather than this unmounted one.
  resetRavenGearRuntime();
  mounted=false;
  return true;
}

const ravenGearToolContract={
  id:"raven-gear",
  mountTool,
  unmountTool,
  initializeRavenGearRuntimeState,
  bootRavenGearScannerRuntimeModule,
  bootRavenGearInventoryRuntimeModule,
  bootRavenGearCalculatorRuntimeModule,
  bootRavenGearNavigationRuntimeModule,
  exposeRavenGearRuntimeBridge,
  exposeRavenGearRuntimeTests
};

export {
  bootRavenGearCalculatorRuntimeModule,
  bootRavenGearInventoryRuntimeModule,
  bootRavenGearNavigationRuntimeModule,
  bootRavenGearScannerRuntimeModule,
  exposeRavenGearRuntimeBridge,
  exposeRavenGearRuntimeTests,
  initializeRavenGearRuntimeState
};
