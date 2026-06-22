// Results — reusable mountable card block.
//
// One of two views over the single computeResults() model (the other is the
// non-target block). Owns the card's generic chrome + its inner body markup.
// Body markup is environment-parameterized: `prefix` namespaces every id (so a
// second instance — What If — doesn't collide on the same document) and `actions`
// supplies the data-action names. With the defaults (prefix "", calculator
// actions) it reproduces the original calculator markup byte-for-byte.
// resultsMoreInfo lives INSIDE this card's content.

import { renderCollapsibleCard2 } from "../shared/ui/ui-renderers.js";

export const RESULTS_DEFAULT_ACTIONS={
  jumpToTargetLevel:"jumpToTargetLevel",   // "Change Target Lvl" button
  showHighChests:"renderAll"               // "Show Lvl 6–7" checkbox (change)
};

// Inner content (everything inside card2__content). `data-section-wrap` values are
// decorative (never queried) so they stay unprefixed.
function resultsBody(prefix,actions){
  return `<div class="card2 card2--muted card2--md card2--pad-half card2__snapshot-open" id="${prefix}resultsOpenSnapshot"></div>
<div class="card2 card2--muted card2--md stack2 stack2--column stack2--gap-2" data-section-wrap="expectedTable">
<div class="card2__header">
<div class="card2__text">
<div class="card2__title">Estimated Target Items From Plan</div>
<div class="card2__body" id="${prefix}expectedTargetSubtext">Duplicate Heart of Wisdom gear acquired from random and choice chests.</div>
</div>
</div>
<div id="${prefix}expectedTable"></div>
</div>
<div class="card2 card2--muted card2--md stack2 stack2--column stack2--gap-2" data-section-wrap="itemsNeededTable">
<div class="card2__header">
<div class="stack2 stack2--row stack2--gap-2 stack2--align-start stack2--fill-hug stack2--wrap">
<div class="card2__text">
<div class="card2__title">Remaining Items Needed</div>
<div class="card2__body" id="${prefix}remainingItemsSubtext">Equal to choice chests required.</div>
</div>
<div class="card2__action">
<button class="button2 button2--xs button2--ghost" data-action="${actions.jumpToTargetLevel}" data-action-event="click">Change Target Lvl</button>
</div>
</div>
</div>
<div id="${prefix}itemsNeededTable"></div>
</div>
<div class="card2 card2--muted card2--md stack2 stack2--column stack2--gap-2" data-section-wrap="remainingTable">
<div class="card2__header">
<div class="stack2 stack2--row stack2--gap-2 stack2--align-start stack2--fill-hug stack2--wrap">
<div class="card2__text">
<div class="card2__title">Remaining Chests Needed</div>
<div class="card2__body" id="${prefix}remainingChestsSubtext">Chance Adjusted</div>
</div>
<div class="card2__action">
<label class="toggle2 toggle2--text">
<input class="toggle2__input" data-action="${actions.showHighChests}" data-action-event="change" data-source0="checked" id="${prefix}showHighChestLevels" type="checkbox"/>
<span class="toggle2__label">Show Lv. 6+</span>
</label>
</div>
</div>
</div>
<div id="${prefix}remainingTable"></div>
</div>
<div class="card2 card2--white card2--xs card2--collapsible" data-more-info-section="" id="${prefix}resultsMoreInfo">
<button class="card2__header card2__header--toggle card2__collapse-toggle" data-action="toggleCard" data-action-event="click" data-arg0="${prefix}resultsMoreInfo" type="button">
<div class="card2__heading">
<div class="card2__title card2__custom-header">More Information</div>
<div class="card2__chev">⌄</div>
</div>
</button>
<div class="card2__content card2__content--after-header stack2 stack2--column stack2--gap-2">
<div class="card2__body"><strong>Estimated Target Items From Plan</strong> shows estimated duplicate target items gained from this item plan. Random chests use the game drop rate for the selected item. Choice chests are included directly because they are guaranteed duplicate items.</div>
<div class="card2__body"><strong>Remaining Items Needed</strong> shows how many more duplicate items are needed to reach the selected target level. Because choice chests are guaranteed duplicate items, this section can also be read as the number of choice chests needed. For example, if you need <strong>9 more Level 5 items</strong>, then <strong>9 Level 5 choice chests</strong> would complete that requirement.</div>
<div class="card2__body"><strong>Remaining Chests Needed</strong> estimates how many random chests are needed based on the selected item&rsquo;s drop rate. Each value assumes only that chest level will be used. If you add choice chests or other random chests, this section updates automatically.</div>
<div class="card2__body"><strong>Left-side</strong> items have a <strong>2/9</strong> drop rate. <strong>Right-side</strong> items have a <strong>1/9</strong> drop rate. For example, if you are working on <strong>Attackers Claw</strong>, which is a right-side item, then <strong>1 Level 5 choice chest</strong> is roughly equal to <strong>9 Level 5 random chests</strong> for that target item.</div>
</div>
</div>`;
}

export const RESULTS_CARD_DEFAULTS={
  prefix:"",
  title:"Results",
  subtext:"Estimated outcome from this item plan.",
  snapshotClass:"results-collapse-snapshot",
  contentClass:"stack2 stack2--column stack2--gap-5",
  open:false
};

export function renderResultsCardMarkup(options){
  const cfg=Object.assign({}, RESULTS_CARD_DEFAULTS, options || {});
  const prefix=cfg.prefix || "";
  const actions=Object.assign({}, RESULTS_DEFAULT_ACTIONS, cfg.actions || {});
  return renderCollapsibleCard2({
    id:prefix+"resultsCard",
    title:cfg.title,
    subtext:cfg.subtext,
    open:cfg.open,
    snapshot:{ id:prefix+"resultsCollapsedSnapshot", className:cfg.snapshotClass },
    contentClass:cfg.contentClass,
    bodyHtml:resultsBody(prefix,actions)
  });
}
