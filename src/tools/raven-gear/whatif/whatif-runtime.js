// Whatif feature composer: builds five sub-module factories (state, render, results,
// scenarios, events) and wires them onto runtime. Modules reach peers via runtime.X at
// call time, so the render <-> results cycle resolves lazily.
//
// Build order: state first (leaf); render and results in either order (cycle resolves at
// call time); scenarios and events last. Each module's exports are assigned onto runtime
// before the next is built, so peers are present when called.

import { createWhatIfStateModule }     from "./whatif-state.js";
import { createWhatIfRenderModule }    from "./whatif-render.js";
import { createWhatIfResultsModule }   from "./whatif-results.js";
import { createWhatIfScenariosModule } from "./whatif-scenarios.js";
import { createWhatIfEventsModule }    from "./whatif-events.js";

export function createWhatIfModule(runtime) {
  const stateModule = createWhatIfStateModule(runtime);
  Object.assign(runtime, stateModule);

  const scenariosModule = createWhatIfScenariosModule(runtime);
  Object.assign(runtime, scenariosModule);

  const renderModule = createWhatIfRenderModule(runtime);
  Object.assign(runtime, renderModule);

  const resultsModule = createWhatIfResultsModule(runtime);
  Object.assign(runtime, resultsModule);

  const eventsModule = createWhatIfEventsModule(runtime);
  Object.assign(runtime, eventsModule);

  return {
    ...stateModule,
    ...renderModule,
    ...resultsModule,
    ...scenariosModule,
    ...eventsModule,
  };
}
