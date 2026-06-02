// Temporary compatibility bridge for the classic global/action runtime.

export function exposeAppBridge(api){
  if(!api || typeof api!=="object") return;
  Object.keys(api).forEach(name=>{
    if(api[name]!==undefined) window[name]=api[name];
  });
}
