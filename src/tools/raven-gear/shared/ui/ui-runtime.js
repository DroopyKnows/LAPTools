// Shared UI runtime composer.

import {
  uiEscapeAttr
} from "./ui-helpers.js";
import {
  renderCompactInventoryRows,
  renderEmptyState,
  renderFilterTabs,
  renderInventorySnapshotBlock,
  renderLevelPillGrid,
  renderSoftChipButtons
} from "./ui-renderers.js";
import {
  closeAppModal,
  ensureModalHost,
  showChoiceModal,
  showConfirmModal,
  showInventorySnapshotModal
} from "./ui-modals.js";

export function createSharedUiRuntimeModule(){
  const api={
    uiEscapeAttr,
    renderLevelPillGrid,
    renderCompactInventoryRows,
    renderFilterTabs,
    renderSoftChipButtons,
    renderInventorySnapshotBlock,
    renderEmptyState,
    ensureModalHost,
    closeAppModal,
    showInventorySnapshotModal,
    showConfirmModal,
    showChoiceModal
  };

  // Legacy globals
  Object.assign(window,api);

  return api;
}
