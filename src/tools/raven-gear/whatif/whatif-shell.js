// Raven Gear — What If subpage markup.
// Static scaffold for #whatIfSubPage. Step-3 CSS rework: the card / tab / button /
// toggle / badge chrome wears the `2` component classes (card2 / tabs2 / button2 /
// toggle2 / pill2), with card collapse driven by the app's JS-toggled `.open` class.
//
// The What If Results, Inventory Change Summary, and Advanced / Details cards are now MOUNTED
// from the shared calculator blocks (results-card / change-summary-card / nontarget-card) via an
// environment-parameterized `whatIf` prefix — see whatif/blocks/whatif-blocks.js. Results /
// Non-target are two views over one computeResults(whatIfEnv) pass; the Change Summary card's
// chrome comes from the block (pinned to id whatIfSummaryCard / content whatIfChangeSummary)
// while its scenario-aware row DATA is still filled by whatif-results.js.
//
// The Scenario Setup card establishes the owned base (Starting vs Combined Inventory)
// before chests.
//
// Do NOT edit ids / data-action / data-arg / data-source attributes, or the
// .open / .active / .hidden state classes — behavior runs on them.

import { renderChestInputCardMarkup } from "../blocks/chest-input-card.block.js";
import { renderResultsCardMarkup } from "../blocks/results-card.block.js";
import { renderNontargetCardMarkup } from "../blocks/nontarget-card.block.js";
import { renderChangeSummaryCardMarkup } from "../blocks/change-summary-card.block.js";
import { WHATIF_CHEST_OPTIONS, WHATIF_RESULTS_OPTIONS, WHATIF_NONTARGET_OPTIONS, WHATIF_CHANGE_SUMMARY_OPTIONS } from "./blocks/whatif-blocks.js";

export const WHATIF_SHELL_MARKUP=`<section class="hidden" id="whatIfSubPage">
<section class="card2 card2--white card2--lg">
<div class="card2__content">
<div class="card2__title">What If</div>
<div class="card2__body">Test a temporary scenario using Combined Inventory as the baseline.</div>
<div class="tabs2 tabs2--md tabs2--neutral" style="--tabs-cols:2;margin-top:14px">
<button class="tabs2__tab active" data-action="setWhatIfTab" data-action-event="click" data-arg0="scenarios" id="whatIfScenarioTab">Scenarios</button>
<button class="tabs2__tab" data-action="setWhatIfTab" data-action-event="click" data-arg0="saved" id="whatIfSavedTab">Saved Scenarios</button>
</div>
</div>
</section>
<div id="whatIfScenarioPanel">
<section class="card2 card2--white card2--lg">
<div class="stack2 stack2--column stack2--gap-3">
<div class="stack2 stack2--column">
<div class="card2__title">Scenario Setup</div>
<div class="card2__body">Choose the item, target level, and inventory baseline for this temporary scenario.</div>
</div>
<div class="stack2 stack2--row stack2--split stack2--split-75-25 stack2--gap-3 stack2--align-stretch">
<span class="value-box2-unit value-box2-unit--above value-box2-unit--fill">
<label class="value-box2__label value-box2__label--above value-box2__label--main value-box2__label--size-12" for="whatIfTargetItem">Target Raven Item</label>
<div class="value-box2 value-box2--sm value-box2--manual value-box2--select">
<select class="value-box2__select" data-action="setWhatIfItem" data-action-event="change" data-source0="value" id="whatIfTargetItem">
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
<output class="value-box2 value-box2--sm value-box2--derived value-box2--readonly-badge value-box2--tone-left" id="whatIfChanceValue">22.222%</output>
</span>
</div>
<div class="stack2 stack2--row stack2--split stack2--split-60-40 stack2--gap-3 stack2--align-stretch">
<span class="value-box2-unit value-box2-unit--above value-box2-unit--fill">
<label class="value-box2__label value-box2__label--above value-box2__label--main value-box2__label--size-12" for="whatIfTargetLevel">Target Gear Level</label>
<div class="value-box2 value-box2--sm value-box2--manual value-box2--select">
<select class="value-box2__select" data-action="setWhatIfTargetLevel" data-action-event="change" data-source0="value" id="whatIfTargetLevel">
<option value="1">Level 1</option><option value="2">Level 2</option><option value="3">Level 3</option><option value="4">Level 4</option><option value="5">Level 5</option><option value="6">Level 6</option><option value="7">Level 7</option><option value="8">Level 8</option><option value="9">Level 9</option><option value="10">Level 10</option><option value="11">Level 11</option><option value="12">Level 12</option>
</select>
</div>
</span>
<span class="value-box2-unit value-box2-unit--above value-box2-unit--fill">
<span class="value-box2__label value-box2__label--above value-box2__label--spacer value-box2__label--size-12"></span>
<button class="button2 button2--sm button2--primary" data-action="saveWhatIfScenario" data-action-event="click" type="button">Save Scenario</button>
</span>
</div>
<span class="tabs2-unit tabs2-unit--label-above tabs2-unit--fill">
<span class="tabs2__label tabs2__label--size-12">Inventory Baseline</span>
<span class="tabs2 tabs2--inline tabs2--neutral" role="group" aria-label="Inventory baseline" style="--tabs-cols:2">
<button type="button" class="tabs2__tab" data-action="setWhatIfBaselineSource" data-action-event="click" data-arg0="starting" id="whatIfBaselineStarting">Starting Inventory</button>
<button type="button" class="tabs2__tab active" data-action="setWhatIfBaselineSource" data-action-event="click" data-arg0="combined" id="whatIfBaselineCombined">Combined Inventory</button>
</span>
</span>
<div class="card2 card2--white card2--sm card2--collapsible" id="whatIfSetupPreviewCard">
<button class="card2__header card2__header--toggle card2__collapse-toggle" data-action="toggleWhatIfSetupPreview" data-action-event="click" type="button">
<div class="card2__heading">
<div class="stack2 stack2--column card2__text">
<div class="card2__title">Inventory Preview</div>
</div>
<div class="card2__chev">⌄</div>
</div>
</button>
<div class="card2__content card2__content--after-header" id="whatIfSetupPreviewBody">
<div id="whatIfSetupInventoryPreview"></div>
</div>
</div>
</div>
</section>
${renderChestInputCardMarkup(WHATIF_CHEST_OPTIONS)}
${renderResultsCardMarkup(WHATIF_RESULTS_OPTIONS)}
${renderChangeSummaryCardMarkup(WHATIF_CHANGE_SUMMARY_OPTIONS)}
${renderNontargetCardMarkup(WHATIF_NONTARGET_OPTIONS)}
</div>
<div class="hidden" id="whatIfSavedPanel">
<section class="card2 card2--white card2--lg">
<div class="card2__content stack2 stack2--column stack2--gap-3">
<div class="stack2 stack2--column">
<div class="card2__title">Saved Scenarios</div>
<div class="card2__body">Save, load, or remove What If setups.</div>
</div>
<button class="button2 button2--md button2--primary" data-action="saveWhatIfScenario" data-action-event="click" type="button">Save Scenario</button>
<div class="stack2 stack2--column stack2--gap-3" id="savedWhatIfScenarios"></div>
</div>
</section>
</div>
</section>`;
