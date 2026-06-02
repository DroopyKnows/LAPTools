// Lightweight app action registry.

const actions = new Map();

export function registerAction(name, handler){
  if(!name || typeof handler !== "function") return;
  actions.set(name, handler);
}

export function registerActions(map){
  if(!map || typeof map !== "object") return;
  Object.keys(map).forEach(name => registerAction(name, map[name]));
}

export function registerWindowAction(name){
  registerAction(name, ({args}) => {
    const fn = window[name] || globalThis[name];
    if(typeof fn !== "function") return undefined;
    return fn(...(Array.isArray(args) ? args : []));
  });
}

export function registerWindowActions(names){
  if(!Array.isArray(names)) return;
  names.forEach(registerWindowAction);
}

export function hasAction(name){
  return actions.has(name);
}

export function runAction(name, context){
  const handler = actions.get(name);
  if(typeof handler !== "function") return false;
  handler(context || {});
  return true;
}

export const LAP_ACTIONS = {
  registerAction,
  registerActions,
  registerWindowAction,
  registerWindowActions,
  hasAction,
  runAction
};

export function exposeActionRegistry(target = window){
  if(target) target.LAP_ACTIONS = LAP_ACTIONS;
  return LAP_ACTIONS;
}
