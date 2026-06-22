// Calculator card blocks — reusable mountable UI blocks for Chest Inputs, Results, and
// Non-target. Each bundles its renderCollapsibleCard2 markup with a behavior contract:
//   • id           — the card's DOM id
//   • markup       — section HTML (stitched into the shell; also mountable standalone)
//   • mount(host)  — inject markup into an arbitrary host
//   • render(model)— (re)render the card body incl. its collapsed snapshot
//
// Results and Non-target are two views over one computeResults() model (renderAll computes
// it once and hands both the same object). The factory takes the runtime as its one dependency.

import { renderChestInputCardMarkup } from "../blocks/chest-input-card.block.js";
import { renderResultsCardMarkup } from "../blocks/results-card.block.js";
import { renderNontargetCardMarkup } from "../blocks/nontarget-card.block.js";
import { renderChangeSummaryCardMarkup } from "../blocks/change-summary-card.block.js";

export function createCalculatorBlocks(runtime){
  function makeBlock(spec){
    const block={
      id:spec.id,
      markup:spec.markup,
      mount(host){ if(host) host.innerHTML=spec.markup; return block; },
      render:spec.render
    };
    return block;
  }

  // Chest Inputs: refreshes the manual/bundle inputs (each call also refreshes
  // the chest collapsed snapshot internally, as before).
  const chest=makeBlock({
    id:"chestInputCard",
    // showHighRandom toggle writes state (was the live-read "refreshChestInputs").
    markup:renderChestInputCardMarkup({ actions:{ refreshInputs:"setCalcShowHighRandom" } }),
    render(){
      runtime.renderRandomInputs();
      runtime.renderGuaranteedInputs();
    }
  });

  // Results: view #1 over the shared computed model.
  const results=makeBlock({
    id:"resultsCard",
    // showHighChests toggle writes state (was the live-read "renderAll").
    markup:renderResultsCardMarkup({ actions:{ showHighChests:"setCalcShowHighChests" } }),
    render(model){ runtime.renderResultsView(model || runtime.computeResults()); }
  });

  // Inventory Change Summary: view #3 over the same model (placed between Results and
  // Non-target on the calculator surface).
  const changeSummary=makeBlock({
    id:"changeSummaryCard",
    markup:renderChangeSummaryCardMarkup(),
    render(model){ runtime.renderChangeSummaryView(model || runtime.computeResults()); }
  });

  // Non-target Items Obtained: view #2 over the same model.
  const nontarget=makeBlock({
    id:"nontargetCard",
    markup:renderNontargetCardMarkup(),
    render(model){ runtime.renderNontargetView(model || runtime.computeResults()); }
  });

  const calculatorBlocks={ chest, results, changeSummary, nontarget, all:[chest, results, changeSummary, nontarget] };
  return { calculatorBlocks };
}
