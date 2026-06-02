// App v1.0.26 boot coordinator.
// Keep this file small: feature startup wiring belongs in src/app/boot/.

import {
  exposeRuntimeBridge,
  exposeRuntimeTests,
  initializeRuntimeState
} from "../core/app-runtime.js";
import { bootScanner } from "./scanner-bootstrap.js";
import { bootInventory } from "./inventory-bootstrap.js";
import { bootNavigation } from "./navigation-bootstrap.js";
import { bootCalculator } from "./calculator-bootstrap.js";

export function bootApp(){
  initializeRuntimeState();

  bootScanner();
  bootInventory();
  bootCalculator();
  bootNavigation();

  exposeRuntimeBridge();
  exposeRuntimeTests();
}
