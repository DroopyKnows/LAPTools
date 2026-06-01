// Lightweight app action registry.
// Keeps data-action handling explicit while preserving the current global-script app structure.
(function(){
  const actions=new Map();

  function registerAction(name,handler){
    if(!name || typeof handler!=="function") return;
    actions.set(name,handler);
  }

  function registerActions(map){
    if(!map || typeof map!=="object") return;
    Object.keys(map).forEach(name=>registerAction(name,map[name]));
  }

  function registerWindowAction(name){
    registerAction(name,({args})=>{
      const fn=window[name] || globalThis[name];
      if(typeof fn!=="function") return undefined;
      return fn(...(Array.isArray(args)?args:[]));
    });
  }

  function registerWindowActions(names){
    if(!Array.isArray(names)) return;
    names.forEach(registerWindowAction);
  }

  function hasAction(name){
    return actions.has(name);
  }

  function runAction(name,context){
    const handler=actions.get(name);
    if(typeof handler!=="function") return false;
    handler(context || {});
    return true;
  }

  window.LAP_ACTIONS={
    registerAction,
    registerActions,
    registerWindowAction,
    registerWindowActions,
    hasAction,
    runAction
  };
})();
