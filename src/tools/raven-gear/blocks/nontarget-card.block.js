// Non-target Items Obtained — reusable mountable card block.
//
// The second view over the single computeResults() model. Environment-parameterized
// like the results block: `prefix` namespaces every id; `actions` supplies
// data-action names. The side-breakdown toggle passes `prefix` as data-arg0 so the
// shared toggleNontargetSideBreakdown(prefix) handler targets the right instance
// (calculator passes no arg → "" → the original ids, byte-equivalent).
//
// nontargetMoreInfo nests INSIDE card2__content here (the old shell left the content
// <div> implicitly closed by </section>; this factory closes it explicitly — the
// resulting DOM is identical). No header subtext.

import { renderCollapsibleCard2 } from "../shared/ui/ui-renderers.js";

export const NONTARGET_DEFAULT_ACTIONS={
  toggleSideBreakdown:"toggleNontargetSideBreakdown"
};

// Inner content (everything inside card2__content). `data-section-wrap` values are
// decorative (never queried) so they stay unprefixed.
function nontargetBody(prefix,actions){
  const sideArg=prefix ? ` data-arg0="${prefix}"` : "";
  return `<div class="stack2 stack2--column stack2--gap-5">
<div class="card2 card2--muted card2--md card2--pad-half card2__snapshot-open" id="${prefix}nontargetAssignedSnapshot"></div>
<div class="card2 card2--muted card2--md" data-section-wrap="randomSideLeftoverTable">
<div class="stack2 stack2--column stack2--gap-2">
<div class="card2__header">
<div class="card2__heading">
<div class="card2__text">
<div class="card2__title">Total Non-target Items Obtained</div>
<div class="card2__body" id="${prefix}totalLeftoverItemsSub">Items that were earned from random chests, but weren&rsquo;t duplicates of the Heart of Wisdom.</div>
</div>
</div>
</div>
<div id="${prefix}randomSideLeftoverTable"></div>
<div class="stack2 stack2--row stack2--justify-end">
<label class="toggle2 toggle2--text toggle2--xs">
<input class="toggle2__input" data-action="${actions.toggleSideBreakdown}" data-action-event="change"${sideArg} id="${prefix}nontargetBreakdownToggle" type="checkbox"/>
<span class="toggle2__label">Show side breakdown</span>
</label>
</div>
<div class="stack2 stack2--row stack2--gap-2 stack2--align-start stack2--fill" hidden id="${prefix}nontargetSideBreakdown">
<div class="card2 card2--muted card2--sm" data-section-wrap="sameSideTable">
<div class="stack2 stack2--column stack2--gap-2">
<div class="card2__header">
<div class="card2__heading">
<div class="card2__text">
<div class="card2__title" id="${prefix}leftSideLeftoversTitle">Items Assigned</div>
</div>
<div class="card2__action"><div class="pill2 pill2--badge pill2--md pill2--tone-left">LEFT</div></div>
</div>
</div>
<div id="${prefix}sameSideTable"></div>
</div>
</div>
<div class="card2 card2--muted card2--sm" data-section-wrap="oppositeSideTable">
<div class="stack2 stack2--column stack2--gap-2">
<div class="card2__header">
<div class="card2__heading">
<div class="card2__text">
<div class="card2__title" id="${prefix}rightSideLeftoversTitle">Items Assigned</div>
</div>
<div class="card2__action"><div class="pill2 pill2--badge pill2--md pill2--tone-right">RIGHT</div></div>
</div>
</div>
<div id="${prefix}oppositeSideTable"></div>
</div>
</div>
</div>
</div>
</div>
<div class="card2 card2--white card2--xs card2--collapsible" data-more-info-section="" id="${prefix}nontargetMoreInfo">
<button class="card2__header card2__header--toggle card2__collapse-toggle" data-action="toggleCard" data-action-event="click" data-arg0="${prefix}nontargetMoreInfo" type="button">
<div class="card2__heading">
<div class="card2__text">
<div class="card2__title">More Information</div>
</div>
<div class="card2__chev">⌄</div>
</div>
</button>
<div class="card2__content card2__content--after-header">
<p>Random Chests can give both target and non-target items.</p>
<p>Target items are shown in <strong>Estimated Target Items From Plan</strong>. Non-target items are shown here.</p>
<p>Non-target items are split by side. If the selected item is on the left, left-side non-target items are split between the other 2 left-side items, while right-side non-target items are split between the 3 right-side items. If the selected item is on the right, the logic reverses.</p>
<p>Items that can be assigned to a specific Raven item are credited in <strong>New Estimated Inventory</strong>. Items that cannot be logically assigned to a specific item are shown as <strong>Random Items Left Over</strong>.</p>
<p>Left-side items have a drop rate of 2/9, while right-side items have a drop rate of 1/9. So for every 9 random chests that are opened, with a large enough sample size, you would have approximately 2 of each left-side item and 1 of each right-side item.</p>
</div>
</div>
</div>`;
}

export const NONTARGET_CARD_DEFAULTS={
  prefix:"",
  title:"Non-target Items Obtained",
  subtext:"",
  snapshotClass:""
};

export function renderNontargetCardMarkup(options){
  const cfg=Object.assign({}, NONTARGET_CARD_DEFAULTS, options || {});
  const prefix=cfg.prefix || "";
  const actions=Object.assign({}, NONTARGET_DEFAULT_ACTIONS, cfg.actions || {});
  return renderCollapsibleCard2({
    id:prefix+"nontargetCard",
    title:cfg.title,
    subtext:cfg.subtext,
    snapshot:{ id:prefix+"nontargetCollapsedSnapshot", className:cfg.snapshotClass },
    bodyHtml:nontargetBody(prefix,actions)
  });
}
