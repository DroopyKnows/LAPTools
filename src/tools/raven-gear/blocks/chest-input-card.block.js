// Chest Inputs — reusable mountable card block.
//
// Owns the card's generic chrome (title/subtext via renderCollapsibleCard2) and its
// inner body markup. Environment-parameterized like the other blocks: `prefix`
// namespaces every id, `actions` supplies the static-markup data-action names (tabs,
// Show Lvl toggle, reset buttons), and `bank:false` omits the choice-bank-redeem
// container (What If applies top-up choice automatically — no bank). With the
// defaults it reproduces the original calculator chest markup byte-for-byte.
//
// The per-level value-box steppers and bundle-qty fields are produced at render time
// by buildCombinedChestInputs / renderTopUpBundles (calculator-render.js), which take
// the matching env for their dynamic data-action names.

import { renderCollapsibleCard2 } from "../shared/ui/ui-renderers.js";

export const CHEST_DEFAULT_ACTIONS={
  setChestMainMode:"setChestMainMode",
  refreshInputs:"refreshChestInputs",
  resetTopUpsCurrent:"resetTopUpsForCurrentItem",
  resetTopUpsAll:"resetTopUpsForAllItems",
  resetPlanCurrent:"resetCurrentPlan",
  resetPlanAll:"resetAllPlans"
};

// "Show Lvl 6–7" toggle beside the collapse button.
function chestHeaderAside(prefix,actions){
  return `<label class="toggle2 toggle2--text card2__expanded-only">
<input class="toggle2__input" data-action="${actions.refreshInputs}" data-action-event="change" data-source0="checked" id="${prefix}showHighRandom" type="checkbox"/>
<span class="toggle2__label">Show Lv. 6+</span>
</label>`;
}

// Inner content (everything inside card2__content).
function chestBody(prefix,actions,bank,resetMode){
  const chestsBankSlot=bank!==false ? `\n<div id="${prefix}chestsChoiceBankRedeem"></div>` : "";
  // Reset options. "sandbox" → two buttons; "connected" → the full four; "dynamic"
  // (calculator) → both, toggled by mode at render time (4 in specific, 2 in manual).
  const connectedButtons=`<button class="button2 button2--md button2--ghost" data-action="${actions.resetTopUpsCurrent}" data-action-event="click">Reset Top Ups for this item</button>
<button class="button2 button2--md button2--danger" data-action="${actions.resetTopUpsAll}" data-action-event="click">Reset Top Ups for all items</button>
<button class="button2 button2--md button2--ghost" data-action="${actions.resetPlanCurrent}" data-action-event="click">Reset plans for this item</button>
<button class="button2 button2--md button2--danger" data-action="${actions.resetPlanAll}" data-action-event="click">Reset plans for all items</button>`;
  const sandboxButtons=`<button class="button2 button2--md button2--ghost" data-action="${actions.resetPlanCurrent}" data-action-event="click">Reset Plans</button>
<button class="button2 button2--md button2--ghost" data-action="${actions.resetTopUpsCurrent}" data-action-event="click">Reset Top Ups</button>`;
  const resetInner = resetMode==="sandbox"
    ? `<div class="stack2 stack2--column stack2--gap-2">${sandboxButtons}</div>`
    : resetMode==="dynamic"
      ? `<div class="stack2 stack2--column stack2--gap-2" id="${prefix}chestResetConnected">${connectedButtons}</div>
<div class="stack2 stack2--column stack2--gap-2 hidden" id="${prefix}chestResetSandbox">${sandboxButtons}</div>`
      : `<div class="stack2 stack2--column stack2--gap-2">${connectedButtons}</div>`;
  return `<div class="stack2 stack2--column stack2--gap-2">
<div class="card2 card2--muted card2--md card2--pad-half card2__snapshot-open" id="${prefix}chestOpenSnapshot"></div>
<div class="tabs2 tabs2--md tabs2--neutral" style="--tabs-cols:2">
<button class="tabs2__tab active" data-action="${actions.setChestMainMode}" data-action-event="click" data-arg0="chests" id="${prefix}chestsMainTab">Chests</button>
<button class="tabs2__tab" data-action="${actions.setChestMainMode}" data-action-event="click" data-arg0="topup" id="${prefix}topUpBundlesTab">Top Up Bundles</button>
</div>
<div class="stack2 stack2--column stack2--gap-5">
<div id="${prefix}chestsCombinedPanel">
<div class="stack2 stack2--column stack2--gap-5">
<div class="stack2 stack2--column stack2--gap-5" id="${prefix}combinedChestInputs"></div>
<div id="${prefix}chestsBundleAppliedSummary"></div>${chestsBankSlot}
</div>
</div>
<div class="hidden" id="${prefix}topUpBundlesPanel">
<div id="${prefix}topUpBundlesContent"></div>
</div>
<details class="card2 card2--muted card2--xs">
<summary class="card2__header card2__header--toggle">
<div class="card2__heading">
<div class="card2__text">
<div class="card2__title card2__title--muted">Reset Options</div>
</div>
<div class="card2__chev">⌄</div>
</div>
</summary>
<div class="card2__content card2__content--after-header">
${resetInner}
</div>
</details>
</div>
</div>`;
}

export const CHEST_INPUT_CARD_DEFAULTS={
  prefix:"",
  title:"Chest Inputs",
  subtext:"Input chests you plan to use.",
  snapshotClass:"chest-collapse-snapshot"
};

export function renderChestInputCardMarkup(options){
  const cfg=Object.assign({}, CHEST_INPUT_CARD_DEFAULTS, options || {});
  const prefix=cfg.prefix || "";
  const actions=Object.assign({}, CHEST_DEFAULT_ACTIONS, cfg.actions || {});
  return renderCollapsibleCard2({
    id:prefix+"chestInputCard",
    title:cfg.title,
    subtext:cfg.subtext,
    snapshot:{ id:prefix+"chestCollapsedSnapshot", className:cfg.snapshotClass },
    headerAside:chestHeaderAside(prefix,actions),
    bodyHtml:chestBody(prefix,actions,cfg.bank,cfg.resetMode)
  });
}
