// Raven Gear — Settings subpage markup.
//
// Owned by the tool so it renders identically in the hub and standalone (the
// component styling — card2 / toggle2 / tabs2 — is injected by the tool on mount).
// Previously this lived as a hub page (#settingsPage in index.html), which left it
// unstyled when loaded without the tool mounted. It is now a tool sub-view shown by
// the gear tile (showRavenSettings) and dismissed by its Back button
// (closeRavenSettings), routed at raven/settings.
//
// The settings actions (setGlobalSetting → setGlobalSetting/applyGlobalDisplaySettings)
// come from the shared app-navigation runtime the tool already instantiates.

export const SETTINGS_SUBPAGE_MARKUP=`<section class="hidden stack2 stack2--column stack2--gap-5" id="ravenSettingsSubPage">
<div class="stack2 stack2--row stack2--gap-2 stack2--align-center">
<button class="button2 button2--md button2--primary" data-action="closeRavenSettings" data-action-event="click" type="button">← Raven Gear Calculator</button>
</div>
<div class="card2 card2--white card2--lg stack2 stack2--column stack2--gap-5">
<div class="hero-card2 card2">
<div class="hero-card2__layout">
<div class="hero-card2__copy">
<div class="hero-card2__eyebrow">Raven Gear Calculator</div>
<div class="hero-card2__title">SETTINGS</div>
</div>
</div>
</div>
<div class="stack2 stack2--column stack2--gap-3">
<label class="toggle2 toggle2--card">
<input class="toggle2__input" data-action="setGlobalSetting" data-action-event="change" data-arg0="moreInfo" data-source1="checked" id="hideMoreInformationSetting" type="checkbox"/>
<span class="toggle2__card card2 card2--muted card2--md">
<span class="card2__header">
<span class="card2__heading">
<span class="card2__text card2__text--left">
<span class="card2__title">Hide More Information sections</span>
<span class="card2__body">Hides explanatory More Information and Explain This Section dropdowns throughout the app.</span>
</span>
</span>
</span>
</span>
</label>
<label class="toggle2 toggle2--card">
<input class="toggle2__input" data-action="setGlobalSetting" data-action-event="change" data-arg0="advanced" data-source1="checked" id="hideAdvancedSetting" type="checkbox"/>
<span class="toggle2__card card2 card2--muted card2--md">
<span class="card2__header">
<span class="card2__heading">
<span class="card2__text card2__text--left">
<span class="card2__title">Hide Advanced / Details sections</span>
<span class="card2__body">Hides advanced breakdown and audit sections on the Calculator and Inventory pages.</span>
</span>
</span>
</span>
</span>
</label>
<div class="card2 card2--muted card2--md stack2 stack2--column stack2--gap-3">
<div class="card2__text card2__text--left">
<div class="card2__title">Card snapshots</div>
<div class="card2__body">Show the compact card summaries when collapsed, when expanded, both, or never.</div>
</div>
<div class="tabs2 tabs2--sm tabs2--neutral" style="--tabs-cols:4">
<button class="tabs2__tab" data-action="setGlobalSetting" data-action-event="click" data-arg0="snapshots" data-arg1="on" id="snapshotSetting-on" type="button">On</button>
<button class="tabs2__tab" data-action="setGlobalSetting" data-action-event="click" data-arg0="snapshots" data-arg1="off" id="snapshotSetting-off" type="button">Off</button>
<button class="tabs2__tab" data-action="setGlobalSetting" data-action-event="click" data-arg0="snapshots" data-arg1="onlyClosed" id="snapshotSetting-onlyClosed" type="button">Only<br>closed</button>
<button class="tabs2__tab" data-action="setGlobalSetting" data-action-event="click" data-arg0="snapshots" data-arg1="onlyOpen" id="snapshotSetting-onlyOpen" type="button">Only<br>open</button>
</div>
</div>
<label class="toggle2 toggle2--card">
<input class="toggle2__input" data-action="setGlobalSetting" data-action-event="change" data-arg0="allowZoom" data-source1="checked" id="allowZoomSetting" type="checkbox"/>
<span class="toggle2__card card2 card2--muted card2--md">
<span class="card2__header">
<span class="card2__heading">
<span class="card2__text card2__text--left">
<span class="card2__title">Allow pinch-zoom on mobile</span>
<span class="card2__body">Off keeps the mobile layout locked on the Raven Gear pages. Turn on if you need to pinch-zoom.</span>
</span>
</span>
</span>
</span>
</label>
<label class="toggle2 toggle2--card">
<input class="toggle2__input" data-action="resetDoNotShowAgainMessages" data-action-event="click" data-source0="element" id="resetDoNotShowAgainSetting" type="checkbox"/>
<span class="toggle2__card card2 card2--muted card2--md">
<span class="card2__header">
<span class="card2__heading">
<span class="card2__text card2__text--left">
<span class="card2__title">Do Not Show Again messages</span>
<span class="card2__body">Restores dismissed recommendation popups.</span>
</span>
</span>
</span>
</span>
</label>
</div>
</div>
</section>`;
