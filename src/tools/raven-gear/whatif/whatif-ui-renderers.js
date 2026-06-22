// What-If summary-card row renderer.
//
// renderStateRows now lives in shared/ui/ui-renderers.js (it is surface-agnostic and is
// also consumed by the shared Inventory Change Summary block). Re-exported here so existing
// What-If imports keep working unchanged.

export { renderStateRows } from "../shared/ui/ui-renderers.js";
