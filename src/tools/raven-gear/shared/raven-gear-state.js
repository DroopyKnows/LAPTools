// Raven Gear app-state singleton: builds the state runtime and re-exports its API.

import {
  MAX_ITEM_LEVEL,
  allItemLevels,
  chestLevels,
  ravenItems,
  topUpBundleDefinitions
} from "../metadata/item-metadata.js";
import { createRavenGearStateRuntimeModule } from "./raven-gear-state-runtime.js";

const ravenGearStateRuntime=createRavenGearStateRuntimeModule({
  allItemLevels,
  chestLevels,
  ravenItems,
  topUpBundleDefinitions,
  maxItemLevel:MAX_ITEM_LEVEL
});

export const {
  CURRENT_STATE_SCHEMA_VERSION,
  mode,
  manualSide,
  ravenSubPage,
  DEFAULT_STATE,
  cloneDefaultState,
  isPlainObject,
  toSafeInteger,
  toBoolean,
  cleanString,
  normalizeFilter,
  validRavenItemName,
  normalizeLevelObject,
  normalizeBooleanMap,
  normalizeItemLevelMap,
  normalizeBundleObject,
  normalizePerItemBundleMap,
  normalizeChoiceBankObject,
  normalizeChoiceBankRedeemedMap,
  normalizeWhatIfBaseline,
  normalizeWhatIfScenario,
  normalizeWhatIfSavedEntry,
  normalizeWhatIfState,
  normalizeInventoryArchiveEntry,
  normalizeInventoryLevelRangeMap,
  normalizeInventoryHighLevelMap,
  normalizeInventoryTechPointsMap,
  getStateSchemaVersion,
  normalizeCalculatorState,
  normalizeInventoryState,
  normalizeSettingsState,
  createEmptyScannerUiState,
  normalizeUiState,
  normalizeStateShape,
  defineAlias,
  attachStateAliases,
  replaceStateWithNormalized,
  normalizeCurrentState,
  state,
  choiceBankExpanded
}=ravenGearStateRuntime;

export { ravenGearStateRuntime };
