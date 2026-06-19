// Reusable hub card and placeholder-page components.

function setText(el,value){
  el.textContent=value == null ? "" : String(value);
  return el;
}

function applyCardClasses(card,config){
  const classes=["h-card","h-card--media"];
  classes.push(config.staticCard ? "h-card--static" : "h-card--interactive");
  if(config.compact) classes.push("compact-coming-card");
  if(config.className) classes.push(...String(config.className).split(/\s+/).filter(Boolean));
  card.className=classes.join(" ");
}

function iconSvg(name){
  const icons={
    help:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.7 9.2a2.5 2.5 0 0 1 4.8 1.1c0 1.9-2.2 2.3-2.2 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.1" fill="currentColor"/></svg>',
    info:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 10.5v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1.1" fill="currentColor"/></svg>',
    faq:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 6.5A4.5 4.5 0 0 1 10 2h4a4.5 4.5 0 0 1 4.5 4.5v3A4.5 4.5 0 0 1 14 14h-2.7L7 18v-4.2a4.5 4.5 0 0 1-1.5-3.3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 7.6a2.1 2.1 0 0 1 4 .9c0 1.5-1.7 1.8-1.7 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12.3" cy="16.2" r="1" fill="currentColor"/></svg>',
    bug:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8.5h8v7A4 4 0 0 1 12 19h0a4 4 0 0 1-4-3.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5M4 11h4M16 11h4M5 17l3-2M19 17l-3-2M6 5l2.5 2M18 5l-2.5 2M12 11v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    soon:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 9h7M8.5 13h5M8.5 17h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  return icons[name] || "";
}

function createIcon(icon,config){
  const el=document.createElement("div");
  const toneMap={"blue-icon":"h-card__icon--blue"};
  const tone=config.iconClass ? (toneMap[config.iconClass] || config.iconClass) : "";
  el.className=["h-card__icon",tone].filter(Boolean).join(" ");
  if(config.iconSvg){
    el.classList.add("h-card__icon--svg");
    el.innerHTML=iconSvg(config.iconSvg);
  }else{
    setText(el,icon || "▣");
  }
  return el;
}

function createMiniActionIcon(icon){
  const wrap=document.createElement("span");
  wrap.className="home-mini-action-icon";
  wrap.innerHTML=iconSvg(icon);
  return wrap;
}

function createMiniActions(actions){
  if(!Array.isArray(actions) || !actions.length) return null;
  const wrap=document.createElement("div");
  wrap.className="home-mini-actions";
  actions.forEach(action=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="h-btn h-btn--chip";
    if(action.action) button.dataset.action=action.action;
    button.dataset.actionEvent=action.event || "click";
    if(action.arg0) button.dataset.arg0=action.arg0;
    if(action.page) button.dataset.page=action.page;
    if(action.icon) button.appendChild(createMiniActionIcon(action.icon));
    const label=document.createElement("span");
    label.className="home-mini-action-label";
    setText(label,action.label || "Open");
    button.appendChild(label);
    wrap.appendChild(button);
  });
  return wrap;
}

export function createHomeFeatureCard(config){
  const card=config.asButton ? document.createElement("button") : document.createElement("div");
  if(config.asButton) card.type="button";
  applyCardClasses(card,config);
  if(config.action) card.dataset.action=config.action;
  if(config.actionEvent || config.action) card.dataset.actionEvent=config.actionEvent || "click";
  if(config.arg0) card.dataset.arg0=config.arg0;

  const icon=config.hideIcon ? null : createIcon(config.icon,config);
  const copy=document.createElement("div");
  copy.className="h-card__copy";

  copy.appendChild(setText(document.createElement("div"),config.title || "Untitled"));
  copy.lastChild.className="h-card__title";
  copy.appendChild(setText(document.createElement("div"),config.subtitle || ""));
  copy.lastChild.className="h-card__sub";

  const actions=createMiniActions(config.actions);
  if(actions) copy.appendChild(actions);

  if(icon) card.appendChild(icon);
  card.appendChild(copy);
  return card;
}

export function needHelpCard(actions=[]){
  return {
    type:"need-help",
    title:"Need Help?",
    subtitle:"Learn more about this project or address an issue.",
    iconSvg:"help",
    iconClass:"blue-icon",
    staticCard:true,
    className:"home-help-card",
    actions
  };
}

export function comingSoonCard(subtitle){
  return {
    type:"coming-soon",
    title:"Coming Soon",
    subtitle:subtitle || "More content is on the way.",
    iconSvg:"soon",
    iconClass:"blue-icon",
    staticCard:true,
    compact:true
  };
}

export function renderHomeCardList(panelId,cards){
  const panel=document.getElementById(panelId);
  if(!panel) return;
  panel.replaceChildren();
  (cards || []).forEach(cardConfig=>{
    panel.appendChild(createHomeFeatureCard(cardConfig));
  });
}

export function renderPlaceholderPage(pageId,content){
  const page=document.getElementById(pageId);
  if(!page) return;
  const card=document.createElement("div");
  card.className="h-card h-card--center";
  const title=document.createElement("h1");
  title.className="h-card__title";
  setText(title,content && content.title ? content.title : "Coming Soon");
  const body=document.createElement("p");
  body.className="h-card__sub";
  setText(body,content && content.message ? content.message : "Coming Soon");
  card.appendChild(title);
  card.appendChild(body);
  page.replaceChildren(card);
}
