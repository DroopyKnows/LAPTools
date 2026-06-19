// Test harness exports for tests/test-runner.html.

export function exposeTestExports(api){
  if(!api || typeof api!=="object") return;
  Object.keys(api).forEach(name=>{
    if(api[name]!==undefined) window[name]=api[name];
  });
}
