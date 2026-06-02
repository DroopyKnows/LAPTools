// App v1.0.26 runtime facade.
// Keep app/core focused on hub-level wiring. Raven Gear behavior lives in
// src/tools/raven-gear/raven-gear-runtime.js.

import {
  bootRavenGearCalculatorRuntimeModule,
  bootRavenGearInventoryRuntimeModule,
  bootRavenGearNavigationRuntimeModule,
  bootRavenGearScannerRuntimeModule,
  exposeRavenGearRuntimeBridge,
  exposeRavenGearRuntimeTests,
  initializeRavenGearRuntimeState
} from "../../tools/raven-gear/raven-gear-runtime.js";

export function initializeRuntimeState(){
  initializeRavenGearRuntimeState();
}

export function bootScannerRuntimeModule(){
  bootRavenGearScannerRuntimeModule();
}

export function bootInventoryRuntimeModule(){
  bootRavenGearInventoryRuntimeModule();
}

export function bootCalculatorRuntimeModule(){
  bootRavenGearCalculatorRuntimeModule();
}

export function bootNavigationRuntimeModule(){
  bootRavenGearNavigationRuntimeModule();
}

export function exposeRuntimeBridge(){
  exposeRavenGearRuntimeBridge();
}

export function exposeRuntimeTests(){
  exposeRavenGearRuntimeTests();
}
