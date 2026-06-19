// Raven Gear shared math/runtime helpers — delegates to the math module factory;
// the coordinator assigns the result onto the runtime dependency object.

import { createMathModule } from "./math/index.js";

export function createRavenGearSharedRuntimeModule(runtimeDeps){
  return createMathModule(runtimeDeps);
}
