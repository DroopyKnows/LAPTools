// What-If summary-card row renderer (renderStateRows).

export function renderStateRows(rows, options){
  // Four nested cards inside the lg summary card → md, canonical card2__default-header,
  // an engine grid as each card body (passed in via row.html). The `strong` row gets its
  // violet emphasis through card2's tone variables (card2's sanctioned override API).
  const cfg=Object.assign({rowClass:"card2 card2--white card2--md", titleClass:"card2__title", subClass:"card2__body", valueRenderer:null}, options || {});
  const strongStyle=' style="--card-bg:linear-gradient(145deg,rgba(124,58,237,.06),rgba(37,99,235,.05));--card-border:1px solid rgba(124,58,237,.26)"';
  return `<div class="stack2 stack2--column stack2--gap-4">${(rows || []).map(row=>`<div class="${cfg.rowClass}${row.strong ? " strong" : ""}"${row.strong ? strongStyle : ""}>
    <div class="stack2 stack2--row stack2--gap-2 stack2--align-start stack2--wrap card2__default-header">
      <div class="card2__text"><div class="${cfg.titleClass}">${row.title}</div>${row.sub ? `<div class="${cfg.subClass}">${row.sub}</div>` : ""}</div>
    </div>
    <div class="card2__content card2__content--after-header">${cfg.valueRenderer ? cfg.valueRenderer(row) : (row.html || "")}</div>
  </div>`).join("")}</div>`;
}
