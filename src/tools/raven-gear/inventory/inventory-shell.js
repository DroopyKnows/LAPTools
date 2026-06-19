// Raven Gear — Inventory subpage markup.
// Extracted from shell/raven-gear-shell.js. CSS-rework shell pass: the static
// card / tab / button chrome now wears the `2` component classes (card2 / tabs2 /
// button2), with card collapse driven by the app's JS-toggled `.open`
// (state-bridge). Rendered content (#inventoryList, #upgradedInventoryList, the
// advanced panels) is being migrated in focused passes; the backup action card
// now uses reusable stack2/grid2/button2 classes so legacy polish selectors stay
// unwired.
//
// Do NOT edit ids / data-action / data-arg / data-source attributes, or the
// .open / .active / .hidden state classes — behavior runs on them.

export const INVENTORY_SHELL_MARKUP=`<section class="hidden" id="inventorySubPage">
<section class="card2 card2--white card2--lg">
<div class="card2__content stack2 stack2--column stack2--gap-1">
<div class="stack2 stack2--column stack2--gap-2 stack2--align-stretch">
<div class="grid2 grid2--min-md grid2--gap-sm grid2--fill grid2--align-center" data-grid2 data-grid2-cols="2">
<button class="button2 button2--md button2--positive button2--strong" data-action="openImportFile" data-action-event="click">Import Backup</button>
<button class="button2 button2--md button2--info button2--strong" data-action="exportInventory" data-action-event="click">Export Backup</button>
<button class="button2 button2--md button2--positive button2--strong" data-action="openBagScanner" data-action-event="click">Scan Bag Items</button>
<button class="button2 button2--md button2--danger button2--strong" data-action="resetInventory" data-action-event="click">Reset Active Inventory</button>
</div>
<button class="button2 button2--md button2--primary" data-action="saveCurrentInventorySnapshot" data-action-event="click">Save Current Inventory Snapshot</button>
</div>
<input accept=".json" class="hidden" data-action="importInventory" data-action-event="change" data-source0="event" id="importFile" type="file">
<div class="text2 text2--subtle text2--align-center">Full backup allows progress to be continued on another device.</div>
</input></div>
</section>
<div id="bagScannerMount"></div>
<section class="card2 card2--white card2--lg card2--collapsible" id="inventoryOwnedCard">
<button class="card2__header card2__header--toggle card2__collapse-toggle" data-action="toggleCard" data-action-event="click" data-arg0="inventoryOwnedCard" type="button">
<div class="card2__heading">
<div class="stack2 stack2--row stack2--gap-2 stack2--align-start stack2--wrap card2__default-header">
<div class="card2__text">
<div class="card2__title">Current Inventory</div>
<div class="card2__body">Enter what you own for each Raven item.</div>
</div>
</div>
<div class="card2__chev">⌄</div>
</div>
</button>
<div class="card2__content card2__content--after-header stack2 stack2--column stack2--gap-3" id="inventoryList"></div>
</section>
<section class="card2 card2--white card2--lg card2--collapsible" id="upgradedOwnedCard">
<button class="card2__header card2__header--toggle card2__collapse-toggle" data-action="toggleCard" data-action-event="click" data-arg0="upgradedOwnedCard" type="button">
<div class="card2__heading">
<div class="stack2 stack2--row stack2--gap-2 stack2--align-start stack2--wrap card2__default-header">
<div class="card2__text">
<div class="card2__title">New Estimated Inventory</div>
<div class="card2__body">View inventory with item plans factored in.</div>
</div>
</div>
<div class="card2__chev">⌄</div>
</div>
</button>
<div class="card2__content card2__content--after-header" id="upgradedInventoryList"></div>
</section>
<section class="card2 card2--white card2--lg card2--collapsible" data-advanced-section="" id="inventoryAdvancedDetailsCard">
<button class="card2__header card2__header--toggle card2__collapse-toggle" data-action="toggleCard" data-action-event="click" data-arg0="inventoryAdvancedDetailsCard" type="button">
<div class="card2__heading">
<div class="stack2 stack2--row stack2--gap-2 stack2--align-start stack2--wrap card2__default-header">
<div class="card2__text">
<div class="card2__title">Advanced / Details</div>
<div class="card2__body">Review calculated inventory and audit item-plan logic.</div>
</div>
</div>
<div class="card2__chev">⌄</div>
</div>
</button>
<div class="card2__content card2__content--after-header stack2 stack2--column stack2--gap-3">
<div class="tabs2 tabs2--md tabs2--neutral" style="--tabs-cols:2">
<button class="tabs2__tab active" data-action="setInventoryAdvancedMode" data-action-event="click" data-arg0="breakdown" id="inventoryAdvancedBreakdownTab">Inventory Summary</button>
<button class="tabs2__tab" data-action="setInventoryAdvancedMode" data-action-event="click" data-arg0="summary" id="inventoryAdvancedSummaryTab">Audit View</button>
</div>
<div id="inventoryAdvancedBreakdownPanel">
<div id="breakdownEstimatedInventoryList"></div>
</div>
<div id="inventoryAdvancedSummaryPanel" hidden>
<div id="itemPlanSummaryList"></div>
</div>
</div>

</section>
</section>`;
