const resultsEl = document.getElementById("results");
const summaryEl = document.getElementById("summary");
const rerunBtn = document.getElementById("rerunTests");

function stable(value){
  if(value && typeof value === "object" && !Array.isArray(value)){
    const out = {};
    Object.keys(value).sort((a,b)=>Number(a)-Number(b) || a.localeCompare(b)).forEach(k=>{
      out[k] = stable(value[k]);
    });
    return out;
  }
  if(Array.isArray(value)) return value.map(stable);
  return value;
}

function stringify(value){
  return JSON.stringify(stable(value));
}

function assert(condition, message){
  if(!condition) throw new Error(message || "Assertion failed");
}

function assertEqual(actual, expected, message){
  const a = stringify(actual);
  const e = stringify(expected);
  if(a !== e){
    throw new Error(`${message || "Values did not match"}\nExpected: ${e}\nActual:   ${a}`);
  }
}


function levelQty(levels, level){
  return Number((levels || {})[level] || 0);
}

function compactLevels(obj){
  const out = {};
  Object.keys(obj || {}).forEach(k=>{
    const n = Number(obj[k] || 0);
    if(n > 0) out[String(k)] = n;
  });
  return out;
}

function wait(ms){
  return new Promise(resolve=>setTimeout(resolve, ms));
}

async function loadAppFrame(){
  const old = document.getElementById("appFrame");
  if(old) old.remove();

  const frame = document.createElement("iframe");
  frame.id = "appFrame";
  frame.className = "hidden-frame";
  frame.src = `../index.html?testHarness=${Date.now()}#home`;
  document.body.appendChild(frame);

  await new Promise((resolve, reject)=>{
    const timer = setTimeout(()=>reject(new Error("App iframe did not load.")), 10000);
    frame.onload = ()=>{
      clearTimeout(timer);
      resolve();
    };
  });

  const win = frame.contentWindow;
  for(let i=0;i<80;i++){
    if(win && typeof win.simplifyUpByLevel === "function" && typeof win.normalizeInventory === "function") return win;
    await wait(50);
  }
  throw new Error("App test exports were not available.");
}

function makeWorkerResult(items){
  return {
    ok: true,
    result: {
      items,
      isConsistent: true,
      canAutoApply: true,
      quantityConflicts: [],
      ignoredTiles: [],
      uncertain: [],
      notes: []
    }
  };
}

function getTests(win){
  return [
    {
      name: "App version is v1.0.15",
      run(){ assertEqual(win.APP_VERSION, "1.0.15"); }
    },
    {
      name: "simplifyUpByLevel: 9 level 1 becomes 1 level 3",
      run(){ assertEqual(compactLevels(win.simplifyUpByLevel({1:9})), {3:1}); }
    },
    {
      name: "simplifyUpByLevel: 10 level 1 leaves 1 level 1 and 1 level 3",
      run(){ assertEqual(compactLevels(win.simplifyUpByLevel({1:10})), {1:1,3:1}); }
    },
    {
      name: "simplifyUpByLevel carries across existing higher levels",
      run(){ assertEqual(compactLevels(win.simplifyUpByLevel({1:3,2:2})), {3:1}); }
    },
    {
      name: "addLevelObjects merges same-level quantities",
      run(){ assertEqual(compactLevels(win.addLevelObjects({1:2},{1:3,2:1})), {1:5,2:1}); }
    },
    {
      name: "levelObjectEquivalentAtLevel converts higher levels downward",
      run(){ assertEqual(win.levelObjectEquivalentAtLevel({3:1}, 1), 9); }
    },
    {
      name: "targetItemsFromRandomPlan uses whole expected target items",
      run(){ assertEqual(compactLevels(win.targetItemsFromRandomPlan({1:9}, 2/9)), {1:2}); }
    },
    {
      name: "normalizeInventory floors values and drops invalid negatives",
      run(){
        const inventory = win.normalizeInventory({
          "Heart of Wisdom": {"6": "2.9", "5": -4, "bad": 99},
          "Tail of Wind": {"1": "3"},
          "Fake Item": {"1": 999}
        });
        assertEqual(levelQty(inventory["Heart of Wisdom"], 6), 2);
        assertEqual(levelQty(inventory["Heart of Wisdom"], 5), 0);
        assertEqual(levelQty(inventory["Tail of Wind"], 1), 3);
        assert(!inventory["Fake Item"], "Fake Item should not exist after normalization.");
      }
    },
    {
      name: "normalizeBackupPayload accepts legacy inventory-only backup",
      run(){
        const backup = win.normalizeBackupPayload({
          inventory: {"Heart of Wisdom": {"6": 2}}
        });
        assert(backup.ok, backup.reason || "Backup should normalize.");
        assertEqual(levelQty(backup.state.inventory.active["Heart of Wisdom"], 6), 2);
        assertEqual(levelQty(backup.state.inventory.active["Tail of Wind"], 6), 0);
      }
    },
    {
      name: "buildFullBackupPayload includes version metadata",
      run(){
        const payload = win.buildFullBackupPayload();
        assertEqual(payload.backupType, "laptools-full-app-backup");
        assertEqual(payload.appVersion, "1.0.15");
        assert(payload.backupVersion >= 3, "Backup version should be at least 3.");
        assert(payload.state && payload.state.inventory && payload.state.calculator, "Backup should include normalized app state.");
      }
    },
    {
      name: "scanner adapter maps Worker result items into app inventory",
      run(){
        const adapted = win.scannerAdaptWorkerResponse(makeWorkerResult({
          "Heart of Wisdom": {"6": 2},
          "Tail of Wind": {"1": 3}
        }));
        assert(adapted.canAutoApply, adapted.issueReason || "Scanner result should be auto-applicable.");
        assertEqual(levelQty(adapted.inventory["Heart of Wisdom"], 6), 2);
        assertEqual(levelQty(adapted.inventory["Tail of Wind"], 1), 3);
        assertEqual(adapted.detectedCount, 5);
      }
    },
    {
      name: "scanner adapter blocks empty scan results",
      run(){
        const adapted = win.scannerAdaptWorkerResponse(makeWorkerResult({}));
        assertEqual(adapted.canAutoApply, false);
        assert(adapted.issueReason && adapted.issueReason.includes("No Raven items"), "Expected plain empty-scan issue reason.");
      }
    }
  ];
}

function renderResults(rows){
  const passed = rows.filter(r=>r.status === "pass").length;
  const failed = rows.filter(r=>r.status === "fail").length;
  summaryEl.innerHTML = `
    <span class="pill ${failed ? "fail" : "pass"}">${failed ? "FAILED" : "PASSED"}</span>
    <span class="pill pass">${passed} passed</span>
    <span class="pill ${failed ? "fail" : "pending"}">${failed} failed</span>
  `;
  resultsEl.innerHTML = rows.map(row=>`
    <div class="test ${row.status === "pass" ? "ok" : "bad"}">
      <div class="test-title">${row.status === "pass" ? "✓" : "✗"} ${row.name}</div>
      ${row.message ? `<div class="test-msg">${row.message}</div>` : ""}
    </div>
  `).join("");
}

async function runAllTests(){
  summaryEl.innerHTML = `<span class="pill pending">Running...</span>`;
  resultsEl.innerHTML = "";
  const rows = [];
  try{
    const win = await loadAppFrame();
    for(const test of getTests(win)){
      try{
        await test.run();
        rows.push({name:test.name,status:"pass",message:""});
      }catch(error){
        rows.push({name:test.name,status:"fail",message:error && error.message ? error.message : String(error)});
      }
    }
  }catch(error){
    rows.push({name:"Load app test frame",status:"fail",message:error && error.message ? error.message : String(error)});
  }
  renderResults(rows);
}

rerunBtn.addEventListener("click", runAllTests);
runAllTests();
