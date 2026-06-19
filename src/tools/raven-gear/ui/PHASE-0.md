# Primitive system — note to self

Finally killed thousands of lines of ad-hoc CSS by building one reusable, self-contained
primitive layer: the `2` components (card2, pill2, grid2, value-box2, tabs2, button2, …)
that the tool owns and injects on mount. The hub has its own parallel `h-` set. The
standalone verify page (`_verify/index.html`) renders every component with zero hub
dependency — that's the proof the isolation holds.

Don't regress on the things that made this work:

- Every component class keeps the `2` suffix and a hardcoded hex fallback on every token
  (`var(--c-white, #ffffff)`), so it renders even with no tokens loaded.
- Zero `!important`, zero hub-CSS dependency. If `_verify/index.html` (or the standalone
  tool page) ever looks wrong, a primitive grew a hidden dependency — fix that, don't patch it.
- No bespoke one-off widgets. New UI composes existing primitives. There is no standalone
  "stepper" — the quantity cell IS value-box in stepper mode. Resist hand-rolling a new class.
- grid2 labeled-rows are static CSS grids — never add `data-grid2` to them. `data-grid2` is
  only for the ResizeObserver-balanced engine grids.
- `pill/pill.js` `config.attrs` is a trusted internal string only — never route user-entered
  or imported text through it.
