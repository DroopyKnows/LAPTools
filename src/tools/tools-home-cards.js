// Homepage cards owned by the hub-level Tools section.

import { needHelpCard } from "../shared/ui/hub-card-components.js";

export const toolsHomeCards=[
  {
    title:"Raven Gear Calculator",
    subtitle:"Calculator and inventory pages for Raven item planning.",
    icon:"🪶",
    asButton:true,
    action:"showPage",
    actionEvent:"click",
    arg0:"ravenPage",
    className:"raven-home-card"
  },
  needHelpCard()
];
