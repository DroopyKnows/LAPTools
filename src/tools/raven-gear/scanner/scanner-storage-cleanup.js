// One-time cleanup of legacy bag-scanner data left in localStorage.

const SCANNER_STORAGE_CLEANUP_VERSION="1.0.28-scanner-cleanup-2";
const SCANNER_STORAGE_CLEANUP_KEY="laptools.ravenGear.scannerCleanupVersion";

const SCANNER_STORAGE_MARKERS=[
  "bagscanner",
  "bag-scanner",
  "scanner",
  "scan-inventory",
  "worker",
  "openai"
];

function storageKeyLooksScannerRelated(key){
  const lower=String(key||"").toLowerCase();
  return SCANNER_STORAGE_MARKERS.some(marker=>lower.includes(marker));
}

function purgeScannerKeysFromStorage(storage, keepKeys=new Set()){
  if(!storage) return 0;
  const keys=[];
  for(let index=0; index<storage.length; index+=1){
    const key=storage.key(index);
    if(key) keys.push(key);
  }
  let removed=0;
  keys.forEach(key=>{
    if(keepKeys.has(key)) return;
    if(!storageKeyLooksScannerRelated(key)) return;
    try{
      storage.removeItem(key);
      removed+=1;
    }catch(error){}
  });
  return removed;
}

async function purgeScannerCaches(cacheStorage){
  if(!cacheStorage || typeof cacheStorage.keys!=="function") return 0;
  let removed=0;
  try{
    const names=await cacheStorage.keys();
    await Promise.all(names.map(async name=>{
      if(!storageKeyLooksScannerRelated(name)) return;
      const deleted=await cacheStorage.delete(name);
      if(deleted) removed+=1;
    }));
  }catch(error){}
  return removed;
}

function runScannerStorageCleanup({storageKey,localStorageRef=globalThis.localStorage,sessionStorageRef=globalThis.sessionStorage,cacheStorageRef=globalThis.caches}={}){
  const keepKeys=new Set([SCANNER_STORAGE_CLEANUP_KEY].filter(Boolean));
  if(storageKey) keepKeys.add(storageKey);

  let alreadyClean=false;
  try{
    alreadyClean=localStorageRef?.getItem(SCANNER_STORAGE_CLEANUP_KEY)===SCANNER_STORAGE_CLEANUP_VERSION;
  }catch(error){
    alreadyClean=false;
  }

  const removed={local:0,session:0,caches:0};
  if(!alreadyClean){
    removed.local=purgeScannerKeysFromStorage(localStorageRef,keepKeys);
    removed.session=purgeScannerKeysFromStorage(sessionStorageRef,keepKeys);
    purgeScannerCaches(cacheStorageRef).then(count=>{ removed.caches=count; }).catch(()=>{});
  }

  try{
    localStorageRef?.setItem(SCANNER_STORAGE_CLEANUP_KEY,SCANNER_STORAGE_CLEANUP_VERSION);
  }catch(error){}

  return {version:SCANNER_STORAGE_CLEANUP_VERSION,removed};
}

export {
  SCANNER_STORAGE_CLEANUP_KEY,
  SCANNER_STORAGE_CLEANUP_VERSION,
  purgeScannerCaches,
  purgeScannerKeysFromStorage,
  runScannerStorageCleanup,
  storageKeyLooksScannerRelated
};

if(typeof window!=="undefined"){
  Object.assign(window,{
    SCANNER_STORAGE_CLEANUP_KEY,
    SCANNER_STORAGE_CLEANUP_VERSION,
    runScannerStorageCleanup
  });
}
