// Raven Gear tool shell markup — thin composer.
// The three subpage sections (#whatIfSubPage / #calculatorSubPage / #inventorySubPage)
// live in their own per-surface files; this module keeps the global chrome (hero +
// page tabs) and composes the full shell.

import { WHATIF_SHELL_MARKUP } from "../whatif/whatif-shell.js";
import { CALCULATOR_SHELL_MARKUP } from "../calculator/calculator-shell.js";
import { INVENTORY_SHELL_MARKUP } from "../inventory/inventory-shell.js";
import { SETTINGS_SUBPAGE_MARKUP } from "../settings/settings-shell.js";

const HERO_MARKUP=`<div class="hero-card2 card2">
<div class="hero-card2__layout">
<div class="hero-card2__copy">
<div class="hero-card2__eyebrow" id="ravenGearHeroEyebrow">Calculator</div>
<div class="hero-card2__title">RAVEN GEAR</div>
</div>
<button class="hero-card2__settings" data-action="showRavenSettings" data-action-event="click" id="settingsTile" type="button">
<span class="hero-card2__settings-icon">&#9881;</span>
<span class="hero-card2__settings-text">Settings</span>
</button>
</div>
</div>`;

const PAGE_TABS_MARKUP=`<nav class="tabs2 tabs2--xl tabs2--primary tabs2--sticky" style="--tabs-cols:3" aria-label="Raven Gear sections">
<button class="tabs2__tab" data-action="setRavenSubPage" data-action-event="click" data-arg0="whatif" id="whatIfTab" type="button">What If</button>
<button class="tabs2__tab active" data-action="setRavenSubPage" data-action-event="click" data-arg0="calculator" id="calcTab" type="button">Calculator</button>
<button class="tabs2__tab" data-action="setRavenSubPage" data-action-event="click" data-arg0="inventory" id="inventoryTab" type="button">Inventory</button>
</nav>`;

// The main view (hero + page tabs + the three subpages) is wrapped so the Settings
// sub-view can replace it as a full view, the same way the old hub #settingsPage did.
export const RAVEN_GEAR_SHELL_MARKUP=
  `<div id="ravenGearMainView">` +
  HERO_MARKUP + "\n" +
  PAGE_TABS_MARKUP + "\n" +
  WHATIF_SHELL_MARKUP + "\n" +
  CALCULATOR_SHELL_MARKUP + "\n" +
  INVENTORY_SHELL_MARKUP +
  `</div>` + "\n" +
  SETTINGS_SUBPAGE_MARKUP;

export function renderRavenGearShell(){
  return RAVEN_GEAR_SHELL_MARKUP;
}
