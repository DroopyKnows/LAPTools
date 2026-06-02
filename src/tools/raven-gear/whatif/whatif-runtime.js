// Runtime-bound What If feature module split out of Raven Gear runtime.
// Behavior is intentionally preserved while What If code moves under its feature folder.

import { WHATIF_STATE_SOURCE } from "./whatif-state.js";
import { WHATIF_RENDER_SOURCE } from "./whatif-render.js";
import { WHATIF_RESULTS_SOURCE } from "./whatif-results.js";
import { WHATIF_SCENARIOS_SOURCE } from "./whatif-scenarios.js";
import { WHATIF_EVENTS_SOURCE } from "./whatif-events.js";

export function createWhatIfModule(runtimeContext){
  const source = [
    WHATIF_STATE_SOURCE,
    WHATIF_RENDER_SOURCE,
    WHATIF_RESULTS_SOURCE,
    WHATIF_SCENARIOS_SOURCE,
    WHATIF_EVENTS_SOURCE
  ].join("\n");
  const build = new Function("ctx", `
    with (ctx) {
      ${source}
      return {
        ensureWhatIfState: typeof ensureWhatIfState!=="undefined" ? ensureWhatIfState : undefined,
        whatIfItem: typeof whatIfItem!=="undefined" ? whatIfItem : undefined,
        whatIfProbability: typeof whatIfProbability!=="undefined" ? whatIfProbability : undefined,
        whatIfLevelPills: typeof whatIfLevelPills!=="undefined" ? whatIfLevelPills : undefined,
        whatIfRawPills: typeof whatIfRawPills!=="undefined" ? whatIfRawPills : undefined,
        whatIfCompactInventoryRows: typeof whatIfCompactInventoryRows!=="undefined" ? whatIfCompactInventoryRows : undefined,
        getWhatIfBaselineForCurrent: typeof getWhatIfBaselineForCurrent!=="undefined" ? getWhatIfBaselineForCurrent : undefined,
        renderWhatIfSetupPreview: typeof renderWhatIfSetupPreview!=="undefined" ? renderWhatIfSetupPreview : undefined,
        renderWhatIfChestInputs: typeof renderWhatIfChestInputs!=="undefined" ? renderWhatIfChestInputs : undefined,
        whatIfHasInputs: typeof whatIfHasInputs!=="undefined" ? whatIfHasInputs : undefined,
        renderWhatIfScenario: typeof renderWhatIfScenario!=="undefined" ? renderWhatIfScenario : undefined,
        renderSavedWhatIfScenarios: typeof renderSavedWhatIfScenarios!=="undefined" ? renderSavedWhatIfScenarios : undefined,
        renderWhatIf: typeof renderWhatIf!=="undefined" ? renderWhatIf : undefined,
        renderWhatIfPreserve: typeof renderWhatIfPreserve!=="undefined" ? renderWhatIfPreserve : undefined,
        toggleWhatIfSetupPreview: typeof toggleWhatIfSetupPreview!=="undefined" ? toggleWhatIfSetupPreview : undefined,
        toggleSavedScenarioSnapshot: typeof toggleSavedScenarioSnapshot!=="undefined" ? toggleSavedScenarioSnapshot : undefined,
        toggleWhatIfNontargetSideBreakdown: typeof toggleWhatIfNontargetSideBreakdown!=="undefined" ? toggleWhatIfNontargetSideBreakdown : undefined,
        buildWhatIfBaselineSnapshot: typeof buildWhatIfBaselineSnapshot!=="undefined" ? buildWhatIfBaselineSnapshot : undefined,
        currentWhatIfBaselineFingerprint: typeof currentWhatIfBaselineFingerprint!=="undefined" ? currentWhatIfBaselineFingerprint : undefined,
        setWhatIfScenarioText: typeof setWhatIfScenarioText!=="undefined" ? setWhatIfScenarioText : undefined,
        setWhatIfTab: typeof setWhatIfTab!=="undefined" ? setWhatIfTab : undefined,
        setWhatIfItem: typeof setWhatIfItem!=="undefined" ? setWhatIfItem : undefined,
        setWhatIfTargetLevel: typeof setWhatIfTargetLevel!=="undefined" ? setWhatIfTargetLevel : undefined,
        setWhatIfShowHigh: typeof setWhatIfShowHigh!=="undefined" ? setWhatIfShowHigh : undefined,
        setWhatIfChestValue: typeof setWhatIfChestValue!=="undefined" ? setWhatIfChestValue : undefined,
        adjustWhatIfChestValue: typeof adjustWhatIfChestValue!=="undefined" ? adjustWhatIfChestValue : undefined,
        resetWhatIfScenario: typeof resetWhatIfScenario!=="undefined" ? resetWhatIfScenario : undefined,
        saveWhatIfScenario: typeof saveWhatIfScenario!=="undefined" ? saveWhatIfScenario : undefined,
        loadWhatIfScenario: typeof loadWhatIfScenario!=="undefined" ? loadWhatIfScenario : undefined,
        deleteWhatIfScenario: typeof deleteWhatIfScenario!=="undefined" ? deleteWhatIfScenario : undefined
      };
    }
  `);
  return build(runtimeContext);
}
