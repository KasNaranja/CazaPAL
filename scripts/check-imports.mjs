// Verify every internal import (@/… or relative) resolves to a real file.
// Catches path typos without needing node_modules.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const CWD = process.cwd();
const SRC = path.join(CWD, "src");
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(name)) files.push(p);
  }
})(SRC);

const exts = ["", ".ts", ".tsx", ".d.ts", "/index.ts", "/index.tsx"];
function resolves(base) {
  return exts.some((e) => existsSync(base + e));
}

let bad = 0;
const importRe = /(?:import|export)[^"']*?from\s*["']([^"']+)["']/g;
for (const file of files) {
  const code = readFileSync(file, "utf8");
  let m;
  while ((m = importRe.exec(code))) {
    const spec = m[1];
    let target = null;
    if (spec.startsWith("@/")) target = path.join(SRC, spec.slice(2));
    else if (spec.startsWith("./") || spec.startsWith("../"))
      target = path.join(path.dirname(file), spec);
    else continue; // external package
    if (!resolves(target)) {
      bad++;
      console.log(
        `✗ ${path.relative(CWD, file)} → '${spec}' no resuelve`
      );
    }
  }
}
console.log(
  bad === 0
    ? `✓ Todos los imports internos resuelven.`
    : `✗ ${bad} import(s) internos rotos.`
);
process.exit(bad === 0 ? 0 : 1);
