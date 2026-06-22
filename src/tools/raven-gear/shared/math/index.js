// @ts-check
// Raven Gear math module composition.
// Helpers split across core.js (selection/state/guards) and levels.js (level-object
// math/display), sharing one `api` bag so they can call one another.

import { createMathCore } from "./core.js";
import { createMathLevels } from "./levels.js";

/**
 * Compose the math helper bag for a given runtime. Both halves mutate and share a
 * single `api` object so a helper in one half can call a helper in the other.
 * @param {MathRuntime} runtime
 * @returns {Record<string, Function>}
 */
export function createMathModule(runtime){
  /** @type {Record<string, Function>} */
  const api={};
  Object.assign(api, createMathCore(runtime, api));
  Object.assign(api, createMathLevels(runtime, api));
  return api;
}
