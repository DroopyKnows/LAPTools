// Tool isolation guard.
//
// The import rule (see AGENT.md): a file under src/tools/** MAY import from
// src/shared, but MAY NOT import from src/app or src/pages. This traces the
// static import closure of each tool entry and exits non-zero if any resolved
// import lands under src/app/ or src/pages/.
//
// Introduced in Stage 2; the tool still reaches into the hub until Stage 3
// severs those imports, so violations are expected (and listed) until then.
// From Stage 3 onward this must read 0.

import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

// Tool entry points whose import closures must stay hub-free.
const TOOL_ENTRIES = [
  "src/tools/raven-gear/raven-gear-runtime.js"
];

// Forbidden destinations (relative to repo root).
const FORBIDDEN_DIRS = ["src/app", "src/pages"];

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
  return FORBIDDEN_DIRS.some(dir => rel === dir || rel.startsWith(dir + "/"));
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
  console.log(`\n[${entry}] closure: ${visited.size} files, ${violations.length} forbidden import(s) into ${FORBIDDEN_DIRS.join("/")}`);
  for(const v of violations){
    console.log("  - " + chainTo(v, importedBy, entryAbs).join("  ->  "));
  }
  totalViolations += violations.length;
}

if(totalViolations > 0){
  console.error(`\ncheck-tool-isolation: ${totalViolations} violation(s).`);
  process.exit(1);
}
console.log("\ncheck-tool-isolation: OK (0 hub imports in any tool closure).");
void pathToFileURL;
