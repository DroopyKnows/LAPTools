// Lazy hub-tool loader: mount/unmount, plus a tool-unavailable fallback card.

import { getHubToolById } from "../registry/hub-registry.js";

const mountedTools = new Map();
const loadingTools = new Map();

function getToolLoader(entry){
  if(!entry || typeof entry.loader !== "function") return null;
  return entry.loader;
}

function toolTitle(entry,id){
  return entry && entry.title ? entry.title : id || "Tool";
}

function clearPage(page){
  if(page) page.replaceChildren();
}

function renderToolUnavailable(entry,error){
  if(typeof document === "undefined" || !entry || !entry.pageId) return;
  const page=document.getElementById(entry.pageId);
  if(!page) return;

  clearPage(page);

  const card=document.createElement("div");
  card.className="h-card h-card--center tool-unavailable-card";

  const title=document.createElement("h1");
  title.className="h-card__title";
  title.textContent=`${toolTitle(entry,entry.id)} Unavailable`;

  const body=document.createElement("p");
  body.className="h-card__sub";
  body.textContent="This tool could not be loaded. The rest of the hub is still available.";

  const detail=document.createElement("p");
  detail.className="tool-unavailable-detail";
  detail.textContent=error && error.message ? error.message : "Tool module unavailable.";

  const button=document.createElement("button");
  button.type="button";
  button.className="h-btn h-btn--pillish";
  button.dataset.action="showPage";
  button.dataset.actionEvent="click";
  button.dataset.arg0="homePage";
  button.textContent="Back to Home";

  card.appendChild(title);
  card.appendChild(body);
  card.appendChild(detail);
  card.appendChild(button);
  page.appendChild(card);
}

function createUnavailableTool(entry,error){
  const contract={
    id:entry ? entry.id : "unknown-tool",
    unavailable:true,
    error,
    mountTool(context = {}){
      void context;
      renderToolUnavailable(entry,error);
      return contract;
    },
    unmountTool(){
      return false;
    },
    renderUnavailable(){
      renderToolUnavailable(entry,error);
    }
  };
  contract.mountTool({});
  return contract;
}

export function getMountedTool(id){
  return mountedTools.get(id) || null;
}

export async function loadHubTool(id){
  const entry=getHubToolById(id);
  if(!entry) throw new Error(`Unknown hub tool: ${id}`);
  if(entry.enabled===false) throw new Error(`Hub tool disabled: ${toolTitle(entry,id)}`);
  const loader=getToolLoader(entry);
  if(!loader) throw new Error(`Hub tool has no loader: ${toolTitle(entry,id)}`);
  return loader();
}

export async function mountHubTool(id, context = {}){
  const mounted=getMountedTool(id);
  if(mounted) return mounted;
  if(loadingTools.has(id)) return loadingTools.get(id);

  const entry=getHubToolById(id);
  const pending=loadHubTool(id).then(async module=>{
    const contract=typeof module.mountTool === "function"
      ? await module.mountTool(context)
      : module;
    const mountedTool={id,module,contract:contract || module,unavailable:false};
    mountedTools.set(id,mountedTool);
    loadingTools.delete(id);
    return mountedTool;
  }).catch(error=>{
    const contract=createUnavailableTool(entry || {id,pageId:null,title:id},error);
    const mountedTool={id,module:null,contract,unavailable:true,error};
    mountedTools.set(id,mountedTool);
    loadingTools.delete(id);
    console.error(`Hub tool unavailable: ${id}`, error);
    return mountedTool;
  });

  loadingTools.set(id,pending);
  return pending;
}

export async function unmountHubTool(id, context = {}){
  const mounted=getMountedTool(id);
  if(!mounted) return false;
  const unmount=mounted.contract && typeof mounted.contract.unmountTool === "function"
    ? mounted.contract.unmountTool
    : mounted.module && mounted.module.unmountTool;
  if(typeof unmount === "function") await unmount(context);
  mountedTools.delete(id);
  return true;
}
