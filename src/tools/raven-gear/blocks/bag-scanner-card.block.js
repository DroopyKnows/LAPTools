// Bag Scanner — mountable card block (pure 2-suffixed primitives).
//
// Lazily mounted into #bagScannerMount on first openBagScanner and unmounted on
// close — it is NOT rendered at tool boot. Static (non-collapsible) card2: the
// header is plain text (no toggle), the body is always visible while mounted,
// and the card is dismissed only via the Cancel button (closeBagScanner).
//
// No scanner-specific composite classes: layout is stack2, the action split is
// stack2--split-70-30, text is card2__title/card2__body. The only retained tool
// component is the owned scanner-status2 (ui/scanner-status). The review host
// (#bagScannerReview) starts hidden and is populated by renderBagScannerReview.

export function renderBagScannerCardMarkup(){
  return `<section class="card2 card2--white card2--lg" id="bagScannerCard" style="margin-top:14px">
  <div class="card2__header">
    <div class="card2__heading">
      <div class="card2__text">
        <div class="card2__title">Scan Bag Items</div>
        <div class="card2__body">Upload Raven bag screenshots and review detected items before replacing Active Inventory.</div>
      </div>
    </div>
  </div>
  <div class="card2__content card2__content--after-header stack2 stack2--column stack2--gap-6">
    <span class="file-picker2-unit file-picker2-unit--label-above">
      <span class="file-picker2__label file-picker2__label--align-left file-picker2__label--size-12">Bag Screenshots</span>
      <label class="file-picker2 file-picker2--md file-picker2--empty">
        <input class="file-picker2__input" id="bagScannerFiles" type="file" accept="image/*" multiple data-action="setBagScannerFiles" data-action-event="change" data-source0="event" />
        <span class="file-picker2__button">Choose Files</span>
        <span class="file-picker2__text">No file chosen</span>
      </label>
    </span>
    <div class="stack2 stack2--row stack2--gap-4 stack2--split stack2--split-70-30">
      <button class="button2 button2--md button2--primary" type="button" data-action="runBagScanner" data-action-event="click">Scan Bag Items</button>
      <button class="button2 button2--md button2--danger" type="button" data-action="closeBagScanner" data-action-event="click">Cancel</button>
    </div>
    <div id="bagScannerStatus" class="scanner-status2"></div>
    <div id="bagScannerReview" class="hidden"></div>
  </div>
</section>`;
}
