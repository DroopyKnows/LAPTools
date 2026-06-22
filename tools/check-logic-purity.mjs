// Logic-purity guard (import-direction).
//
// The rule: the certified-pure logic layer may depend ONLY on itself and on pure
// data (metadata). It must NEVER import the DOM-coupled view/wiring layers
// (*-render, *-events, *-shell, *.block, the *-math runtime factories, bootstrap,
// scanner client/adapter, etc.). This keeps the engine a pure function of state —
// the exact contract a React port inherits (it owns the view; the logic stays pure).
//
// Implementation: for each pure module, every RELATIVE import must resolve to another
// pure module. Any relative import that escapes the pure set is a violation, reported
// with the offending file + specifier. Bare/external specifiers are out of scope
// (there are none today; the pure layer is dependency-free). Parses JS
// import/export-from + bare imports only — same lexer as check-tool-isolation.mjs.

import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

// The certified-pure logic layer. MUST mirror jsconfig.json "include" (minus the
// types/*.d.ts contract): the math factory + the standalone domain modules. These
// are // @ts-check-typed and behavior-tested by tests/pure-logic-tests.js.
const LOGIC_FILES = [
  "src/tools/raven-gear/shared/math/core.js",
  "src/tools/raven-gear/shared/math/levels.js",
  "src/tools/raven-gear/shared/math/index.js",
  "src/tools/raven-gear/inventory/inventory-domain.js",
  "src/tools/raven-gear/inventory/random-generation-ledger-domain.js",
  "src/tools/raven-gear/planning/planning-domain.js",
  "src/tools/raven-gear/scanner/scanner-domain.js"
];

// Pure data/leaf modules the logic layer is allowed to import (no DOM, no view, no
// runtime). Add here only after confirming a module is genuinely pure.
const PURE_DEPS = [
  "src/tools/raven-gear/metadata/item-metadata.js"
];

// A pure module may import any of these (logic + pure deps) and nothing else.
const ALLOWED = new Set([...LOGIC_FILES, ...PURE_DEPS].map(p => resolve(repoRoot, p)));

const IMPORT_RE = /(?:^|[\s;])(?:import|export)\b[^'"`]*?\sfrom\s*["']([^"']+)["']/g;
const BARE_IMPORT_RE = /(?:^|[\s;])import\s*["']([^"']+)["']/g;

function toPosix(p){
  return p.split(sep).join("/");
}

function resolveSpecifier(specifier, importer){
  // Only follow relative specifiers; bare/external specifiers are out of scope.
  if(!specifier.startsWith("./") && !specifier.startsWith("../")) return null;
  const base = resolve(dirname(importer), specifier);
  const candidates = [base, base + ".js", base + ".mjs", resolve(base, "index.js")];
  for(const c of candidates){
    if(existsSync(c) && statSync(c).isFile()) return c;
  }
  return base; // unresolved; report as-is so a typo surfaces
}

function extractSpecifiers(src){
  const found = new Set();
  let m;
  IMPORT_RE.lastIndex = 0;
  while((m = IMPORT_RE.exec(src))) found.add(m[1]);
  BARE_IMPORT_RE.lastIndex = 0;
  while((m = BARE_IMPORT_RE.exec(src))) found.add(m[1]);
  return [...found];
}

let violations = 0;
let scanned = 0;
for(const relFile of LOGIC_FILES){
  const abs = resolve(repoRoot, relFile);
  if(!existsSync(abs) || !statSync(abs).isFile()){
    console.error(`  - pure module not found: ${relFile}`);
    violations++;
    continue;
  }
  scanned++;
  const src = readFileSync(abs, "utf8");
  for(const spec of extractSpecifiers(src)){
    const resolved = resolveSpecifier(spec, abs);
    if(resolved === null) continue; // bare/external specifier — out of scope
    if(!ALLOWED.has(resolved)){
      const relTarget = toPosix(relative(repoRoot, resolved));
      console.log(`  - ${relFile}\n        imports "${spec}" -> ${relTarget} (outside the pure layer)`);
      violations++;
    }
  }
}

console.log(`\ncheck-logic-purity: scanned ${scanned} pure module(s).`);
if(violations > 0){
  console.error(`check-logic-purity: ${violations} forbidden import(s) — the logic layer must depend only on logic + pure data.`);
  process.exit(1);
}
console.log("check-logic-purity: OK (the pure logic layer imports nothing outside itself).");
