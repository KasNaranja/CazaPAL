// Per-file TypeScript syntax validation using the global compiler.
// transpileModule does NOT resolve imports, so this catches syntax / grammar
// errors without needing node_modules (which we can't install in this sandbox).
import { createRequire } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const ts = require("/home/claude/.npm-global/lib/node_modules/typescript");

const ROOT = path.join(process.cwd(), "src");
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(name)) files.push(p);
  }
})(ROOT);

let errors = 0;
for (const file of files.sort()) {
  const code = readFileSync(file, "utf8");
  const out = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      esModuleInterop: true,
      isolatedModules: true,
    },
    reportDiagnostics: true,
    fileName: file,
  });
  const diags = (out.diagnostics || []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error
  );
  if (diags.length) {
    errors += diags.length;
    for (const d of diags) {
      const { line, character } = d.file
        ? d.file.getLineAndCharacterOfPosition(d.start)
        : { line: 0, character: 0 };
      console.log(
        `✗ ${path.relative(process.cwd(), file)}:${line + 1}:${character + 1} ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`
      );
    }
  }
}

console.log(
  errors === 0
    ? `\n✓ ${files.length} archivos TS/TSX sin errores de sintaxis.`
    : `\n✗ ${errors} error(es) de sintaxis en ${files.length} archivos.`
);
process.exit(errors === 0 ? 0 : 1);
