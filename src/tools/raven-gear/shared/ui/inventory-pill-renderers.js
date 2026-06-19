// Inventory pill/readout renderers: per-level display pills and compact rows.

import { allItemLevels } from "../../metadata/item-metadata.js";

export function createInventoryPillRenderers(runtime, dependencies){
  const {
    compactInventoryValueFormatter,
    renderCompactPillRow
  }=dependencies;

  function renderInventoryDisplayPills(obj,options={}){
    const source=options.transform ? options.transform(obj || {}) : (obj || {});
    const levels=(options.levels || allItemLevels || []).slice();
    const shown=levels.filter(level=>Number((source||{})[level]||0)>0);
    if(!shown.length) return options.emptyHtml || "";
    const valueFormatter=options.itemName ? compactInventoryValueFormatter(options.itemName,options) : (value=>String(runtime.roundNice(value)));
    const classForValue=options.cellClassForValue || ((value,level)=>options.itemName && Number(level)>=8 ? "compact-percent-value" : "");
    const rowClass=options.gridClass || "compact-readout-grid";
    const pillClass=options.pillClass || "";
    if(String(pillClass || "").split(/\s+/).includes("level-value-pill")){
      return runtime.renderLevelPillGrid(source,{
        levels,
        gridClass:rowClass,
        pillClass,
        levelClass:"pill-level",
        qtyClass:"pill-qty",
        emptyHtml:options.emptyHtml || "",
        valueFormatter,
        includeZero:false,
        cellClassForValue:classForValue
      });
    }
    const entries=shown.map(level=>{
      const rawValue=Number((source||{})[level]||0);
      const value=valueFormatter(rawValue,level);
      return {level,value,type:classForValue(rawValue,level),className:pillClass,percent:String(value).includes("%")};
    });
    return renderCompactPillRow(entries,{rowClass,emptyHtml:options.emptyHtml || "",grid2Engine:options.grid2Engine});
  }

  function renderCompactLevelBoxes(obj, levels, options={}){
    // Routes through the engine-grid path; the legacy branch in
    // renderInventoryDisplayPills below is unreachable from live code.
    return renderInventoryDisplayPills(obj,{
      levels,
      emptyHtml:"",
      itemName:options.itemName,
      techPoints:options.techPoints,
      techPointsByItem:options.techPointsByItem,
      gridClass:"compact-readout-grid",
      pillClass:"",
      // engine grid (direct renderCompactPillRow callers stay a static row)
      grid2Engine:true
    });
  }

  return {
    renderCompactLevelBoxes,
    renderInventoryDisplayPills
  };
}
