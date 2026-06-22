// Raven Gear — Calculator subpage markup.
// Extracted from shell/raven-gear-shell.js. CSS-rework shell pass: the static
// card / tab / pill-select / button chrome now wears the `2` component classes
// (card2 / tabs2 / pill-select2 / toggle2 / button2 / pill2), with card collapse
// driven by card.css using the app's JS-toggled `.open` state.
//
// The three big cards (Chest Inputs / Results / Non-target Items Obtained) are now
// composed from reusable mountable BLOCK modules (../blocks/*.block.js). Each block
// owns its generic chrome (title/subtext via renderCollapsibleCard2) and its inner
// body markup; this file just stitches their markup into the subpage. The Goal Card
// and Owned Target Items card remain inline here.
//
// Do NOT edit ids / data-action / data-arg / data-source attributes, or the
// .open / .active / .hidden state classes — behavior runs on them.

import { renderChestInputCardMarkup } from "../blocks/chest-input-card.block.js";
import { renderResultsCardMarkup } from "../blocks/results-card.block.js";
import { renderNontargetCardMarkup } from "../blocks/nontarget-card.block.js";
import { renderChangeSummaryCardMarkup } from "../blocks/change-summary-card.block.js";

export const CALCULATOR_SHELL_MARKUP=`<section class="" id="calculatorSubPage">
<section class="card2 card2--white card2--lg" id="goalCard">
<div class="stack2 stack2--column stack2--gap-3">
<div class="stack2 stack2--column">
<div class="card2__title">Goal Card</div>
<div class="card2__body">Choose a Raven item or run a manual left/right calculation.</div>
</div>
<div class="tabs2 tabs2--md tabs2--neutral" style="--tabs-cols:2">
<button class="tabs2__tab active" data-action="setMode" data-action-event="click" data-arg0="specific" id="specificModeBtn">Specific Item</button>
<button class="tabs2__tab" data-action="setMode" data-action-event="click" data-arg0="manual" id="manualModeBtn">Manual Left/Right</button>
</div>
<div class="" id="specificFields">
<div class="stack2 stack2--row stack2--split stack2--split-75-25 stack2--gap-3 stack2--align-stretch">
<span class="value-box2-unit value-box2-unit--above value-box2-unit--fill">
<label class="value-box2__label value-box2__label--above value-box2__label--main value-box2__label--size-12" for="targetItem">Target Raven Item</label>
<div class="value-box2 value-box2--sm value-box2--manual value-box2--select">
<select class="value-box2__select" data-action="onTargetItemChange" data-action-event="change" data-source0="value" id="targetItem">
<option value="Heart of Wisdom">Heart of Wisdom</option>
<option value="Feather of Night">Feather of Night</option>
<option value="Sharp Beak">Sharp Beak</option>
<option value="Tail of Wind">Tail of Wind</option>
<option value="Attackers Claw">Attackers Claw</option>
<option value="Eye of Perception">Eye of Perception</option>
</select>
</div>
</span>
<span class="value-box2-unit value-box2-unit--above value-box2-unit--fill">
<span class="value-box2__label value-box2__label--above value-box2__label--size-12">Chance</span>
<output class="value-box2 value-box2--sm value-box2--derived value-box2--readonly-badge value-box2--tone-left" id="chanceValue">22.222%</output>
</span>
</div>
</div>
<div class="stack2 stack2--column stack2--gap-3 hidden" id="manualFields">
<div class="notice2 notice2--warn">Manual mode is not connected to Raven inventory. Leftovers cannot be applied to inventory because no specific item is selected.</div>
<div class="stack2 stack2--row stack2--split stack2--split-75-25 stack2--gap-3 stack2--align-stretch">
<span class="tabs2-unit tabs2-unit--label-above tabs2-unit--label-align-left tabs2-unit--fill">
<span class="tabs2__label tabs2__label--size-12">Select target item's side</span>
<span class="tabs2 tabs2--inline tabs2--neutral" role="group" aria-label="Manual side" style="--tabs-cols:2">
<button class="tabs2__tab active" data-action="setManualSide" data-action-event="click" data-arg0="left" id="leftSideBtn">Left</button>
<button class="tabs2__tab" data-action="setManualSide" data-action-event="click" data-arg0="right" id="rightSideBtn">Right</button>
</span>
</span>
<span class="value-box2-unit value-box2-unit--above value-box2-unit--fill">
<span class="value-box2__label value-box2__label--above value-box2__label--size-12">Chance</span>
<output class="value-box2 value-box2--sm value-box2--derived value-box2--readonly-badge value-box2--tone-left" id="chanceValueManual">22.222%</output>
</span>
</div>
</div>
<div class="stack2 stack2--row stack2--split stack2--split-60-40 stack2--gap-3 stack2--align-stretch">
<span class="value-box2-unit value-box2-unit--above value-box2-unit--fill">
<label class="value-box2__label value-box2__label--above value-box2__label--main value-box2__label--size-12" for="targetLevel">Target Gear Level</label>
<div class="value-box2 value-box2--sm value-box2--manual value-box2--select">
<select class="value-box2__select" data-action="onTargetLevelChange" data-action-event="change" data-source0="value" id="targetLevel"></select>
</div>
</span>
<span class="tabs2-unit tabs2-unit--label-above tabs2-unit--fill">
<span class="tabs2__label tabs2__label--size-12">Owned Items Filter</span>
<span class="tabs2 tabs2--inline tabs2--neutral" role="group" aria-label="Owned items filter" style="--tabs-cols:3">
<button type="button" class="tabs2__tab active" id="ownedViewLow" data-action="setOwnedItemsFilter" data-action-event="click" data-arg0="low">7-</button>
<button type="button" class="tabs2__tab" id="ownedViewHigh" data-action="setOwnedItemsFilter" data-action-event="click" data-arg0="high">8+</button>
<button type="button" class="tabs2__tab" id="ownedViewAll" data-action="setOwnedItemsFilter" data-action-event="click" data-arg0="all">All</button>
</span>
</span>
</div>
</div>
</section>
<section class="card2 card2--white card2--lg card2--collapsible" id="ownedCard">
<button class="card2__header card2__header--toggle card2__collapse-toggle" data-action="toggleCard" data-action-event="click" data-arg0="ownedCard" type="button">
<div class="card2__heading">
<div class="stack2 stack2--row stack2--gap-2 stack2--align-start stack2--wrap card2__default-header">
<div class="card2__text">
<div class="card2__title">Owned Target Items</div>
<div class="card2__body" id="ownedSubText">Quickly Update Inventory Here</div>
</div>
</div>
<div class="card2__chev">⌄</div>
</div>
<div class="card2__header-extra owned-target-collapse-snapshot" id="ownedCollapsedSnapshot"></div>
</button>
<div class="card2__content card2__content--after-header" id="ownedOpenSnapshotContent"><div class="card2 card2--muted card2--md card2--pad-half card2__snapshot-open" id="ownedOpenSnapshot"></div></div>
<div class="card2__content card2__content--after-header" id="ownedInputs"></div>
</section>
${renderChestInputCardMarkup({resetMode:"dynamic", actions:{ refreshInputs:"setCalcShowHighRandom" }})}
${renderResultsCardMarkup({ actions:{ showHighChests:"setCalcShowHighChests" }})}
${renderChangeSummaryCardMarkup()}
${renderNontargetCardMarkup()}
</section>`;
