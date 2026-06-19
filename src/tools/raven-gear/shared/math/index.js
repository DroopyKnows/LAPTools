// Raven Gear math module composition.
// Helpers split across core.js (selection/state/guards) and levels.js (level-object
// math/display), sharing one `api` bag so they can call one another.

import { createMathCore } from "./core.js";
import { createMathLevels } from "./levels.js";

export function createMathModule(runtime){
  const api={};
  Object.assign(api, createMathCore(runtime, api));
  Object.assign(api, createMathLevels(runtime, api));
  return api;
}
