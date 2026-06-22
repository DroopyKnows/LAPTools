// Shared UI helpers: HTML escaping, action-attribute building, and class/number/tone formatting.

export function uiEscapeAttr(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/"/g,"&quot;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}

function uiSplitActionArgs(source){
  const args=[];
  let current="";
  let quote=null;
  let depth=0;
  for(let i=0;i<String(source||"").length;i++){
    const ch=source[i];
    const prev=source[i-1];
    if(quote){
      current+=ch;
      if(ch===quote && prev!=="\\") quote=null;
      continue;
    }
    if(ch==="'" || ch==='"' || ch==='`'){
      quote=ch;
      current+=ch;
      continue;
    }
    if(ch==="(" || ch==="[" || ch==="{") depth++;
    if(ch===")" || ch==="]" || ch==="}") depth=Math.max(0,depth-1);
    if(ch==="," && depth===0){
      args.push(current.trim());
      current="";
      continue;
    }
    current+=ch;
  }
  if(current.trim()) args.push(current.trim());
  return args;
}

function uiActionArgAttrs(args){
  return (args || []).map((arg,index)=>{
    const value=String(arg || "").trim();
    if(value==="this.value") return ` data-source${index}="value"`;
    if(value==="this.checked") return ` data-source${index}="checked"`;
    if(value==="event") return ` data-source${index}="event"`;
    if(value==="this") return ` data-source${index}="element"`;
    const quoted=(value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"')) || (value.startsWith('`') && value.endsWith('`'));
    const clean=quoted ? value.slice(1,-1) : value;
    const typeAttr=quoted ? ` data-arg${index}-type="string"` : "";
    return ` data-arg${index}="${uiEscapeAttr(clean)}"${typeAttr}`;
  }).join("");
}

export function renderActionAttrs(action,eventType){
  const evt=eventType || "click";
  if(!action) return "";
  if(typeof action==="object"){
    const args=(action.args || []).map((arg,index)=>` data-arg${index}="${uiEscapeAttr(arg)}"`).join("");
    return ` data-action="${uiEscapeAttr(action.name || action.action || "")}" data-action-event="${evt}"${args}`;
  }
  const source=String(action).trim().replace(/;$/g,"");
  if(source==="document.getElementById('importFile').click()" || source==='document.getElementById("importFile").click()'){
    return ` data-action="openImportFile" data-action-event="${evt}"`;
  }
  const match=source.match(/^([A-Za-z_$][\w$]*)\((.*)\)$/);
  if(match){
    const name=match[1];
    const args=match[2].trim() ? uiSplitActionArgs(match[2]) : [];
    return ` data-action="${uiEscapeAttr(name)}" data-action-event="${evt}"${uiActionArgAttrs(args)}`;
  }
  return ` data-action="${uiEscapeAttr(source)}" data-action-event="${evt}"`;
}

export function uiNumber(value){
  return Math.floor(Number(value || 0));
}

/* Level→tone mapping (Drew-specified). Currently unused — keep, not dead code. */
export function uiLevelTone(level){
  const n=uiNumber(level);
  if(n>=8) return "pill2--tone-levelRed";
  if(n>=5) return "pill2--tone-levelGold";
  if(n===4) return "pill2--tone-levelPurple";
  if(n===3) return "pill2--tone-levelBlue";
  if(n===2) return "pill2--tone-levelGreen";
  return "pill2--tone-levelGray";
}

export function uiValueBoxLevelTone(level){
  return uiLevelTone(level).replace(/^pill2--tone-/, "value-box2--tone-");
}

export function uiClassName(...values){
  const seen=new Set();
  const tokens=[];
  values.forEach(value=>{
    String(value || "").split(/\s+/).forEach(token=>{
      if(!token || seen.has(token)) return;
      seen.add(token);
      tokens.push(token);
    });
  });
  return tokens.join(" ");
}

export function uiPillClassName(className){
  const snapshotPills=new Set(["compact-snapshot-pill","results-snapshot-pill","advanced-assigned-pill","chest-snapshot-pill","pill-qty"]);
  const tokens=String(className || "").split(/\s+/).filter(Boolean);
  const usesSnapshotBase=tokens.some(token=>snapshotPills.has(token));
  return uiClassName(usesSnapshotBase ? "" : "pill2", className);
}

export function uiSurfaceCardClassName(className){
  return uiClassName("card2","card2--white","card2--md",className);
}
