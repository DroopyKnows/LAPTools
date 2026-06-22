// Tool isolation guard (strict).
//
// The rule: every file in a tool entry's static import closure MUST live under
// src/tools/raven-gear/. The tool depends on NOTHING outside its own directory —
// not src/app, not src/pages, and not src/shared. This traces the closure from
// each tool entry and exits non-zero if any resolved import lands outside the
// tool root. Must read 0.
//
// NOTE: this parses JS `import`/`export … from` only. CSS @import isolation is
// proven separately by booting raven-gear-standalone.html from a tools-only folder.

import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

// Tool entry points whose import closures must stay hub-free.
const TOOL_ENTRIES = [
  "src/tools/raven-gear/raven-gear-runtime.js"
];

// Allow-list root (relative to repo root): every closure file must resolve under this.
const TOOL_ROOT = "src/tools/raven-gear";

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

function traceClosure(entryAbs){
  const visited = new Set();
  // Map of file -> importer that first pulled it in (for chain reporting).
  const importedBy = new Map();
  const stack = [entryAbs];
  while(stack.length){
    const file = stack.pop();
    if(visited.has(file)) continue;
    visited.add(file);
    if(!existsSync(file) || !statSync(file).isFile()) continue;
    const src = readFileSync(file, "utf8");
    for(const spec of extractSpecifiers(src)){
      const resolved = resolveSpecifier(spec, file);
      if(!resolved) continue;
      if(!importedBy.has(resolved)) importedBy.set(resolved, file);
      if(!visited.has(resolved)) stack.push(resolved);
    }
  }
  return { visited, importedBy };
}

function isForbidden(absPath){
  const rel = toPosix(relative(repoRoot, absPath));
  // A closure file is a violation if it is NOT under the tool root.
  return !(rel === TOOL_ROOT || rel.startsWith(TOOL_ROOT + "/"));
}

function chainTo(file, importedBy, entryAbs){
  const chain = [file];
  let cur = file;
  while(importedBy.has(cur) && cur !== entryAbs){
    cur = importedBy.get(cur);
    chain.push(cur);
    if(cur === entryAbs) break;
  }
  return chain.reverse().map(f => toPosix(relative(repoRoot, f)));
}

let totalViolations = 0;
for(const entry of TOOL_ENTRIES){
  const entryAbs = resolve(repoRoot, entry);
  if(!existsSync(entryAbs)){
    console.error(`Tool entry not found: ${entry}`);
    totalViolations++;
    continue;
  }
  const { visited, importedBy } = traceClosure(entryAbs);
  const violations = [...visited].filter(isForbidden).sort();
  console.log(`\n[${entry}] closure: ${visited.size} files, ${violations.length} import(s) outside ${TOOL_ROOT}/`);
  for(const v of violations){
    console.log("  - " + chainTo(v, importedBy, entryAbs).join("  ->  "));
  }
  totalViolations += violations.length;
}

if(totalViolations > 0){
  console.error(`\ncheck-tool-isolation: ${totalViolations} violation(s).`);
  process.exit(1);
}
console.log("\ncheck-tool-isolation: OK (0 imports outside the tool in any closure).");
void pathToFileURL;
