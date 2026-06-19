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
      name: "App version is v1.0.32",
      run(){ assertEqual(win.APP_VERSION, "1.0.32"); }
    },
    {
      name: "data module bridge exposes Raven constants",
      run(){
        assertEqual(win.STORAGE_KEY, "siroxHub.ravenGear.1");
        assertEqual(win.RAVEN_ITEMS.length, 6);
        assertEqual(win.ravenItems, win.RAVEN_ITEMS);
        assertEqual(win.RAVEN_ITEM_METADATA.length, 6);
        assertEqual(win.getRavenItemsBySide("left").map(item=>item.name), ["Heart of Wisdom","Feather of Night","Sharp Beak"]);
        assertEqual(win.getRavenItemSourceLabel("bankedChoiceChest","auditLabel"), "Choice Bank");
        assertEqual(win.ITEM_LEVELS[0], 12);
        assertEqual(win.DEFAULT_CHEST_LEVELS, [5,4,3,2,1]);
      }
    },
    {
      name: "action registry module bridge exposes delegated actions",
      run(){
        assert(!!win.LAP_ACTIONS, "LAP_ACTIONS should be exposed");
        assert(typeof win.LAP_ACTIONS.registerAction === "function", "registerAction should be available");
        assert(typeof win.LAP_ACTIONS.registerActions === "function", "registerActions should be available");
        assert(typeof win.LAP_ACTIONS.registerWindowAction === "function", "registerWindowAction should be available");
        assert(typeof win.LAP_ACTIONS.registerWindowActions === "function", "registerWindowActions should be available");
        assert(typeof win.LAP_ACTIONS.hasAction === "function", "hasAction should be available");
        assert(typeof win.LAP_ACTIONS.runAction === "function", "runAction should be available");
        assert(win.LAP_ACTIONS.hasAction("showPage"), "showPage should be registered");
        assert(win.LAP_ACTIONS.hasAction("navigateAndCloseMenu"), "custom menu action should be registered");
      }
    },
    {
      name: "metadata and action registry modules expose expected exports",
      async run(){
        const cacheBust = Date.now();
        const metadataModule = await import(`../src/tools/raven-gear/metadata/item-metadata.js?test=${cacheBust}`);
        const actionModule = await import(`../src/app/core/action-registry.js?test=${cacheBust}`);
        assertEqual(metadataModule.RAVEN_ITEMS.length, 6);
        assertEqual(metadataModule.getRavenItemMeta("Attackers Claw").id, "attackersClaw");
        assertEqual(metadataModule.RAVEN_ITEM_SOURCES.randomChest.auditLabel, "Random Manual");
        assertEqual(metadataModule.DEFAULT_CHEST_LEVELS, [5,4,3,2,1]);
        assert(typeof actionModule.exposeActionRegistry === "function", "core action registry export should be available");
        assert(typeof actionModule.LAP_ACTIONS.runAction === "function", "core LAP_ACTIONS should expose runAction");
      }
    },
    {
      name: "hub registry exposes home panels and fallback category",
      async run(){
        const cacheBust = Date.now();
        const registryModule = await import(`../src/app/registry/hub-registry.js?test=${cacheBust}`);
        assertEqual(registryModule.HUB_HOME_CATEGORIES, ["tools","guides","other"]);
        assertEqual(registryModule.getHubHomeCategory("missing"), "tools");
        assertEqual(registryModule.getHubHomePanelId("tools"), "homeToolsPanel");
        assertEqual(registryModule.getHubHomePanels().map(panel=>panel.panelId), ["homeToolsPanel","homeGuidesPanel","homeOtherPanel"]);
        assertEqual(registryModule.getHubPlaceholderPages().map(page=>page.pageId), ["guidesPage","otherPage","aboutPage","faqPage","reportBugPage"]);
        assertEqual(registryModule.hubToolRegistry.map(entry=>entry.id), ["raven-gear"]);
        assertEqual(registryModule.hubPageRegistry.map(entry=>entry.id), ["guides","other","about","faq","report-bug"]);
        assertEqual(registryModule.getHubMenuItems().map(item=>item.id), ["home","tools","guides","other"]);
        assertEqual(registryModule.getHubMenuItems().find(item=>item.id==="tools").children.map(entry=>entry.id), ["raven-gear"]);
        assertEqual(registryModule.getHubPageRoutes()["report-bug"], "reportBugPage");
        assertEqual(registryModule.getHubPageHashes().ravenPage, "raven/calculator");
        assertEqual(registryModule.toolsHomeCards, registryModule.hubHomeCardRegistry.tools);
      }
    },
    {
      name: "hub state is separate from Raven Gear state",
      async run(){
        const cacheBust = Date.now();
        const hubStateModule = await import(`../src/app/core/hub-state.js?test=${cacheBust}`);
        const ravenStateModule = await import(`../src/tools/raven-gear/shared/raven-gear-state.js?test=${cacheBust}`);
        assertEqual(hubStateModule.getHubHomeCategoryValue(), "tools");
        hubStateModule.setHubHomeCategoryValue("guides");
        assertEqual(hubStateModule.getHubHomeCategoryValue(), "guides");
        hubStateModule.setHubActivePageId("faqPage");
        assertEqual(hubStateModule.getHubActivePageId(), "faqPage");
        assertEqual(Object.keys(hubStateModule.getHubState()).sort(), ["navigation","schemaVersion","tools"].sort());
        assertEqual(ravenStateModule.state.schemaVersion, 3);
        assertEqual(Object.keys(ravenStateModule.state).sort(), ["calculator","inventory","schemaVersion","settings","ui","whatIf"].sort());
      }
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
        assertEqual(payload.backupType, "laptools-raven-gear-backup");
        assertEqual(payload.appVersion, "1.0.32");
        assert(payload.backupVersion >= 3, "Backup version should be at least 3.");
        assertEqual(Object.keys(payload).sort(), ["appVersion","backupType","backupVersion","exportedAt","state","stateSchemaVersion"].sort());
        assertEqual(Object.keys(payload.state).sort(), ["calculator","inventory","schemaVersion","settings","ui","whatIf"].sort());
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
    },
    {
      name: "domain inventory simplify matches app simplify",
      run(){
        assertEqual(compactLevels(win.simplifyUpByLevelDomain({1:9})), {3:1});
        assertEqual(
          compactLevels(win.simplifyUpByLevelDomain({1:10})),
          compactLevels(win.simplifyUpByLevel({1:10}))
        );
      }
    },
    {
      name: "domain inventory normalization creates an empty Raven inventory",
      run(){
        const inventory = win.normalizeInventoryDomain();
        assertEqual(Object.keys(inventory), win.DOMAIN_RAVEN_ITEM_NAMES);
        win.DOMAIN_RAVEN_ITEM_NAMES.forEach(itemName=>{
          assertEqual(inventory[itemName], {});
        });
        assert(win.isValidInventoryDomain(inventory), "Empty Raven inventory should be valid.");
      }
    },
    {
      name: "domain inventory normalization floors string values and drops invalid entries",
      run(){
        const inventory = win.normalizeInventoryDomain({
          "Heart of Wisdom": {"6": "2.9", "5": -4, "13": 8, "bad": 99},
          "Tail of Wind": null,
          "Fake Item": {"1": 999}
        });
        assertEqual(inventory["Heart of Wisdom"], {6:2});
        assertEqual(inventory["Tail of Wind"], {});
        assert(!inventory["Fake Item"], "Unknown items should be dropped.");
        assert(win.isValidInventoryDomain(inventory), "Normalized inventory should be valid.");
      }
    },
    {
      name: "domain inventory simplification carries through occupied levels",
      run(){
        assertEqual(compactLevels(win.simplifyUpByLevelDomain({1:8,2:1})), {1:2,3:1});
        assertEqual(compactLevels(win.simplifyUpByLevelDomain({11:3,12:2})), {12:3});
      }
    },
    {
      name: "domain scanner adapter maps Worker items",
      run(){
        const adapted = win.scannerAdaptWorkerResponseDomain(makeWorkerResult({
          "Heart of Wisdom": {"6": 2},
          "Tail of Wind": {"1": 3}
        }));
        assert(adapted.canAutoApply, adapted.issueReason || "Domain scanner result should be auto-applicable.");
        assertEqual(levelQty(adapted.inventory["Heart of Wisdom"], 6), 2);
        assertEqual(levelQty(adapted.inventory["Tail of Wind"], 1), 3);
        assertEqual(adapted.detectedCount, 5);
      }
    },
    {
      name: "domain scanner adapter maps a one-item Worker result",
      run(){
        const adapted = win.scannerAdaptWorkerResponseDomain(makeWorkerResult({
          "Heart of Wisdom": {"6": "2"}
        }));
        assert(adapted.canAutoApply, adapted.issueReason || "One-item scanner result should be auto-applicable.");
        assertEqual(adapted.inventory["Heart of Wisdom"], {6:2});
        assertEqual(adapted.detectedCount, 2);
      }
    },
    {
      name: "domain scanner global rows map aliases and multiple levels",
      run(){
        const inventory = win.scannerInventoryFromGlobalRowsDomain([
          {tiles:[
            {item:"attacker's claw",level:"6",qty:"2"},
            {item:"Heart of Wisdom",level:5,qty:1}
          ]},
          {tiles:[
            {item:"Heart of Wisdom",level:6,qty:3},
            {item:"Fake Item",level:6,qty:99},
            {item:"Tail of Wind",level:13,qty:99}
          ]}
        ]);
        assertEqual(inventory["Attackers Claw"], {6:2});
        assertEqual(inventory["Heart of Wisdom"], {5:1,6:3});
        assertEqual(inventory["Tail of Wind"], {});
      }
    },
    {
      name: "domain scanner adapter blocks empty Worker results",
      run(){
        const adapted = win.scannerAdaptWorkerResponseDomain(makeWorkerResult({}));
        assertEqual(adapted.canAutoApply, false);
        assertEqual(adapted.requiresReview, true);
        assert(adapted.issueReason.includes("No Raven items"), "Expected empty-scan issue reason.");
      }
    },
    {
      name: "domain scanner empty state has a clean runtime shape",
      run(){
        assertEqual(win.createEmptyScannerStateDomain(), {
          lastScan:null,
          status:"",
          statusType:"",
          selectedFileNames:[],
          reviewOpen:false,
          requiresReview:false,
          issueReason:""
        });
      }
    },
    {
      name: "domain scanner reset clears stale runtime data only",
      run(){
        const unrelatedInventory = {active:{"Heart of Wisdom":{6:2}}};
        const appState = {
          inventory:unrelatedInventory,
          ui:{
            bagScanner:{
              lastScan:{detectedCount:2},
              status:"Scan complete.",
              statusType:"ok",
              selectedFileNames:["old-scan.png"],
              reviewOpen:true,
              requiresReview:true,
              issueReason:"Old review message"
            },
            keepOpen:true
          }
        };
        const uiState = appState.ui;
        const result = win.resetScannerStateInAppStateDomain(appState);
        assert(result === appState, "Scanner reset should retain the app state object.");
        assert(appState.ui === uiState, "Scanner reset should retain the UI state object.");
        assert(appState.inventory === unrelatedInventory, "Scanner reset should not replace inventory state.");
        assertEqual(appState.ui.keepOpen, true);
        assertEqual(appState.ui.bagScanner, win.createEmptyScannerStateDomain());
      }
    },
    {
      name: "domain backup envelope includes version metadata",
      run(){
        const payload = win.buildFullBackupPayloadDomain({inventory:{active:{}}},{appVersion:"1.0.21",stateSchemaVersion:3});
        assertEqual(payload.backupType, "laptools-raven-gear-backup");
        assertEqual(payload.appVersion, "1.0.21");
        assert(payload.backupVersion >= 3, "Domain backup version should be at least 3.");
        assertEqual(payload.stateSchemaVersion, 3);
        assert(!Number.isNaN(Date.parse(payload.exportedAt)), "Backup export timestamp should be valid.");
      }
    },
    {
      name: "domain backup version parser accepts string metadata",
      run(){
        assertEqual(win.getBackupFormatVersionDomain({backupVersion:"backup-v3"}), 3);
        assertEqual(win.getBackupFormatVersionDomain({formatVersion:"v99"}), 3);
      }
    },
    {
      name: "domain backup normalization accepts legacy inventory-only payloads",
      run(){
        const backup = win.normalizeBackupPayloadDomain({
          inventory: {"Heart of Wisdom": {"6": "2"}}
        },{
          baseState: win.cloneDefaultState(),
          normalizeState: win.normalizeStateShape
        });
        assert(backup.ok, backup.reason || "Legacy domain backup should normalize.");
        assertEqual(levelQty(backup.state.inventory.active["Heart of Wisdom"], 6), 2);
        assertEqual(levelQty(backup.state.inventory.active["Tail of Wind"], 6), 0);
      }
    },
    {
      name: "domain backup migration preserves nested save structures",
      run(){
        const raw = {
          stateSchemaVersion:2,
          inventory:{archives:[{id:"archive-old",inventory:{"Tail of Wind":{5:3}}}]},
          whatIf:{saved:[{id:"scenario-old",scenario:{item:"Tail of Wind"}}]},
          ui:{bagScanner:{status:"Scan complete."}},
          randomLeftovers:{1:2}
        };
        const migrated = win.migrateBackupStateDomain(raw);
        assertEqual(migrated.schemaVersion, 2);
        assert(!("randomLeftovers" in migrated), "Legacy random leftovers should be removed during migration.");
        assertEqual(migrated.inventory, raw.inventory);
        assertEqual(migrated.whatIf, raw.whatIf);
        assertEqual(migrated.ui, raw.ui);
        assert(raw.randomLeftovers, "Migration should not mutate the source backup state.");
      }
    },
    {
      name: "domain save serializer applies the app-state normalizer",
      run(){
        const serialized = win.serializeAppStateDomain({keep:true,drop:true},{
          normalizeState(source){ return {keep:source.keep}; }
        });
        assertEqual(JSON.parse(serialized), {keep:true});
      }
    },
    {
      name: "recent stable full backup normalizes without losing app-state structures",
      run(){
        const backup = win.normalizeBackupPayloadDomain({
          backupVersion:3,
          appVersion:"1.0.19",
          state:{
            schemaVersion:3,
            calculator:{plans:{"Heart of Wisdom":{5:2}},choiceBank:{4:1}},
            inventory:{
              active:{"Heart of Wisdom":{6:2}},
              archives:[{id:"archive-stable",name:"Stable Archive",note:"keep",savedAt:"2026-01-01T00:00:00.000Z",inventory:{"Tail of Wind":{5:3}}}],
              archiveExpanded:{"archive-stable":true}
            },
            whatIf:{
              activeTab:"saved",
              current:{item:"Tail of Wind",targetLevel:8,random:{5:2},choice:{4:1},showHigh:true},
              saved:[{
                id:"scenario-stable",
                name:"Keep Scenario",
                note:"keep",
                savedAt:"2026-01-01T00:00:00.000Z",
                updatedAt:"2026-01-01T00:00:00.000Z",
                scenario:{item:"Eye of Perception",targetLevel:9,random:{3:4},choice:{2:1}},
                baseline:{item:"Eye of Perception",starting:{5:1},combined:{5:2},fingerprint:"stable"}
              }],
              expandedSnapshots:{"scenario-stable":true}
            },
            settings:{hideMoreInformationSections:true,hideAdvancedSections:true},
            ui:{bagScanner:{status:"Scan complete.",reviewOpen:true},customFlag:"keep"}
          }
        },{
          baseState:win.cloneDefaultState(),
          normalizeState:win.normalizeStateShape,
          getStateSchemaVersion:win.getStateSchemaVersion
        });
        assert(backup.ok, backup.reason || "Recent stable backup should normalize.");
        assertEqual(backup.appVersion, "1.0.19");
        assertEqual(backup.state.calculator.plans["Heart of Wisdom"], {5:2});
        assertEqual(backup.state.inventory.active["Heart of Wisdom"], {6:2});
        assertEqual(backup.state.inventory.archives[0].inventory["Tail of Wind"], {5:3});
        assertEqual(backup.state.whatIf.current.random, {5:2});
        assertEqual(backup.state.whatIf.saved[0].scenario.choice, {2:1});
        assertEqual(backup.state.settings, {hideMoreInformationSections:true,hideAdvancedSections:true,snapshotMode:"on"});
        assertEqual(backup.state.ui, {bagScanner:{status:"Scan complete.",reviewOpen:true},customFlag:"keep"});
      }
    },
    {
      name: "backup normalization accepts missing scanner runtime state",
      run(){
        const backup = win.normalizeBackupPayload({
          state: {
            inventory: {active: {"Heart of Wisdom": {"6": 1}}},
            ui: {}
          }
        });
        assert(backup.ok, backup.reason || "Backup without scanner runtime state should normalize.");
        assertEqual(levelQty(backup.state.inventory.active["Heart of Wisdom"], 6), 1);
        assert(backup.state.ui && typeof backup.state.ui === "object", "Normalized backup should retain a UI state object.");
      }
    },
    {
      name: "domain planning target math matches app target math",
      run(){
        assertEqual(
          compactLevels(win.targetItemsFromRandomPlanDomain({1:9}, 2/9)),
          compactLevels(win.targetItemsFromRandomPlan({1:9}, 2/9))
        );
      }
    },
    {
      name: "domain planning random chest math carries whole expected items",
      run(){
        assertEqual(compactLevels(win.targetItemsFromRandomPlanDomain({1:"18",2:3}, 2/9)), {1:1,2:1});
      }
    },
    {
      name: "domain planning choice items participate in simplification carry",
      run(){
        assertEqual(compactLevels(win.targetItemsFromPlanAndChoiceDomain({1:9},{1:1},2/9)), {2:1});
        assertEqual(
          compactLevels(win.targetItemsFromPlanAndChoiceDomain({1:9},{1:1},2/9)),
          compactLevels(win.targetItemsFromPlanAndChoice({1:9},{1:1},2/9))
        );
      }
    },
    {
      name: "domain planning additional owned matches app planning wrapper",
      run(){
        assertEqual(
          compactLevels(win.calculateAdditionalOwnedFromPlanDomain({1:"18",2:9},2/9)),
          compactLevels(win.calculateAdditionalOwnedFromPlan({1:"18",2:9},2/9))
        );
        assertEqual(compactLevels(win.calculateAdditionalOwnedFromPlanDomain({1:"18",2:9},2/9)), {1:1,3:1});
      }
    },
    {
      name: "domain planning remaining items combine owned random and choice items",
      run(){
        assertEqual(
          compactLevels(win.calculateEffectiveOwnedForRemainingItemsDomain({1:2},{1:9},{1:2},2/9)),
          {2:2}
        );
      }
    },
    {
      name: "domain planning remaining chest column excludes the selected random level",
      run(){
        assertEqual(
          compactLevels(win.calculateEffectiveOwnedForRemainingChestColumnDomain({1:2},{1:9,2:9},{1:1},2/9,1)),
          {3:1}
        );
      }
    },
    {
      name: "domain planning non-target side totals subtract the selected item",
      run(){
        assertEqual(
          win.nontargetSideTotalsFromRandomPlanDomain({1:9},"left",2/9),
          {left:{1:4},right:{1:3}}
        );
        assertEqual(
          win.nontargetSideTotalsFromRandomPlanDomain({1:9},"right",1/9),
          {left:{1:6},right:{1:2}}
        );
      }
    },
    {
      name: "domain planning final breakdown merges raw contributions before carry",
      run(){
        assertEqual(compactLevels(win.finalBreakdownContributionDomain({
          rawTargetRandom:{1:1},
          rawManualChoice:{1:"1"},
          rawRedeemedChoice:{1:1,2:2}
        })), {3:1});
      }
    },
    {
      name: "tool remount rebinds runtime to the new root (mount → unmount → mount)",
      async run(){
        assert(typeof win.__lapUnmountRavenGearTool === "function", "Remount unmount hook missing.");
        assert(typeof win.__lapMountRavenGearToolInto === "function", "Remount mount hook missing.");
        const doc = win.document;
        const originalRoot = doc.getElementById("ravenPage");
        assert(originalRoot, "Original ravenPage root should exist.");
        assert(originalRoot.querySelector("#calculatorSubPage"), "Tool shell should be mounted in ravenPage.");
        assert(win.__ravenGearMountRoot === originalRoot, "Runtime should be bound to the original root before remount.");

        const freshRoot = doc.createElement("div");
        freshRoot.id = "ravenRemountProbeRoot";
        doc.body.appendChild(freshRoot);
        try {
          await win.__lapUnmountRavenGearTool();
          assert(!originalRoot.querySelector("#calculatorSubPage"), "Unmount should clear the tool shell from the original root.");

          await win.__lapMountRavenGearToolInto(freshRoot);
          // Shell injected into the new root by the facade...
          assert(freshRoot.querySelector("#calculatorSubPage"), "Remount should inject the tool shell into the new root.");
          // ...and the runtime (byId/queryRoot) rebinds to it. A stale runtimeApi
          // cache would leave these pointing at the unmounted originalRoot.
          assert(win.__ravenGearMountRoot === freshRoot, "Runtime should rebind to the new root after remount.");
          const located = win.__ravenGearById("calculatorSubPage");
          assert(located && freshRoot.contains(located), "Root-scoped lookups should resolve inside the new root.");
          assert(!originalRoot.querySelector("#calculatorSubPage"), "Old root should stay empty after remount (no duplicate DOM).");
        } finally {
          // Restore the live mount to ravenPage so the app/iframe is left clean.
          await win.__lapUnmountRavenGearTool();
          await win.__lapMountRavenGearToolInto();
          freshRoot.remove();
        }
        assert(originalRoot.querySelector("#calculatorSubPage"), "Mount should be restored to ravenPage after the test.");
        assert(win.__ravenGearMountRoot === originalRoot, "Runtime should be rebound to ravenPage after restore.");
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
