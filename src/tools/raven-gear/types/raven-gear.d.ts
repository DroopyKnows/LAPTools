// Ambient type definitions for the Raven Gear logic layer.
//
// These describe the state schema and the level-object math the engine runs on.
// They are consumed by the editor and by `tsc --noEmit` (see jsconfig.json) — NOT
// bundled or imported at runtime (type-only). They are also the contract a future
// React port inherits verbatim: the logic stays pure, React only owns the view.
//
// No top-level import/export, so every declaration here is GLOBAL/ambient and can
// be referenced by bare name in JSDoc anywhere in the typed logic layer.

/**
 * A map of gear level (1..12) to a quantity at that level. The ubiquitous unit of
 * Raven Gear math: owned items, plans, and choice/random chests are all level
 * objects. Keys are numeric levels; absent levels mean zero.
 */
interface LevelObject { [level: number]: number; }

/** A {@link LevelObject} per Raven item, keyed by item name. */
interface ItemLevelMap { [itemName: string]: LevelObject; }

/** Top-up bundle quantities, keyed by bundle id (e.g. daily1 | daily2 | weekly). */
interface BundleObject { [bundleKey: string]: number; }

/** The six Raven items. */
type RavenItemName =
  | "Heart of Wisdom" | "Feather of Night" | "Sharp Beak"
  | "Tail of Wind" | "Attackers Claw" | "Eye of Perception";

/** Drop side: left items drop at 2/9, right items at 1/9. */
type ItemSide = "left" | "right";

/** Calculator entry mode. */
type CalculatorMode = "specific" | "manual";

/** Owned Items Filter tabs: low = L1-7, high = L8+, all = L1-12. */
type OwnedItemsFilter = "low" | "high" | "all";

/** Snapshot visibility setting. */
type SnapshotMode = "on" | "off" | "onlyClosed" | "onlyOpen";

interface CalculatorState {
  targetItem: RavenItemName;
  targetLevel: number;
  showHighRandom: boolean;
  showHighChests: boolean;
  ownedItemsFilter: OwnedItemsFilter;
  plans: ItemLevelMap;
  guaranteed: ItemLevelMap;
  manualPlan: LevelObject;
  manualGuaranteed: LevelObject;
  topUpBundles: BundleObject;
  perItemTopUpBundles: { [itemName: string]: BundleObject };
  manualTopUpBundles: BundleObject;
  choiceBank: LevelObject;
  choiceBankRedeemed: { [itemName: string]: LevelObject };
  manualChoiceBankRedeemed: LevelObject;
}

interface InventoryState {
  active: ItemLevelMap;
  manualOwned: LevelObject;
  inputFilter: string;
  upgradedFilter: string;
  upgradedViewMode: string;
  hideUnacquired: boolean;
  advancedMode: string;
  breakdownFilter: string;
  archiveMode: string;
  archiveFilter: string;
  archives: unknown[];
  archiveExpanded: { [id: string]: boolean };
  levelRangeByItem: Record<string, unknown>;
  highLevelByItem: Record<string, number>;
  techPointsByItem: Record<string, number>;
}

interface WhatIfScenario {
  item: RavenItemName;
  targetLevel: number;
  random: LevelObject;
  choice: LevelObject;
  showHigh: boolean;
  showHighChests: boolean;
  baselineMode: string;
  baselineSource: "starting" | "combined";
  savedBaseline: ItemLevelMap | null;
  previewOpen: boolean;
  nontargetBreakdownOpen: boolean;
}

interface WhatIfState {
  activeTab: string;
  current: WhatIfScenario;
  saved: unknown[];
  expandedSnapshots: { [id: string]: boolean };
}

interface SettingsState {
  hideMoreInformationSections: boolean;
  hideAdvancedSections: boolean;
  snapshotMode: SnapshotMode;
  dismissedMessages: { [id: string]: boolean };
  allowZoom: boolean;
}

/** The persisted state shape (localStorage `siroxHub.ravenGear.1`, normalized). */
interface RavenGearState {
  schemaVersion: number;
  calculator: CalculatorState;
  inventory: InventoryState;
  whatIf: WhatIfState;
  settings: SettingsState;
  ui: Record<string, unknown>;
}

/**
 * Flat accessors the runtime exposes on `runtime.state` — aliases onto the nested
 * groups above, e.g. `runtime.state.targetItem` -> `state.calculator.targetItem`.
 */
interface RavenGearStateAliases {
  targetItem: RavenItemName;
  targetLevel: number;
  showHighRandom: boolean;
  showHighChests: boolean;
  ownedItemsFilter: OwnedItemsFilter;
  plans: ItemLevelMap;
  guaranteed: ItemLevelMap;
  manualPlan: LevelObject;
  manualGuaranteed: LevelObject;
  topUpBundles: BundleObject;
  perItemTopUpBundles: { [itemName: string]: BundleObject };
  manualTopUpBundles: BundleObject;
  choiceBank: LevelObject;
  choiceChestBank: LevelObject;
  choiceBankRedeemed: { [itemName: string]: LevelObject };
  manualChoiceBankRedeemed: LevelObject;
  manualOwned: LevelObject;
  inventoryInputFilter: string;
  upgradedOwnedFilter: string;
  upgradedOwnedViewMode: string;
  hideUnacquiredInventory: boolean;
  inventoryAdvancedMode: string;
  breakdownInventoryFilter: string;
  inventoryArchiveMode: string;
  inventoryArchiveFilter: string;
  inventoryArchives: unknown[];
  inventoryArchiveExpanded: { [id: string]: boolean };
  inventoryLevelRangeByItem: Record<string, unknown>;
  inventoryHighLevelByItem: Record<string, number>;
  inventoryTechPointsByItem: Record<string, number>;
  hideMoreInformationSections: boolean;
  hideAdvancedSections: boolean;
  snapshotMode: SnapshotMode;
  dismissedMessages: { [id: string]: boolean };
  allowZoom: boolean;
}

/** `runtime.state` at runtime: the nested persisted state plus the flat aliases. */
type RavenGearRuntimeState = RavenGearState & RavenGearStateAliases;

/**
 * The minimal runtime surface the math factory (`createMathModule`) reads.
 * The full app runtime has far more; the math layer only touches these.
 */
interface MathRuntime {
  state: RavenGearRuntimeState;
  mode: CalculatorMode;
  manualSide: ItemSide;
}
