import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(process.cwd());
const mode = process.argv[2] || "all";
const checkedRoots = ["src", "scripts", "main.js"];
const ignoredDirs = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
]);
const assetExtensions = new Set([
  ".css",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".xlsx",
  ".json",
]);

const listFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirs.has(entry.name)) return [];
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    return extname(entry.name) === ".js" || extname(entry.name) === ".mjs"
      ? [fullPath]
      : [];
  });

const jsFiles = checkedRoots
  .map((entry) => join(root, entry))
  .filter(existsSync)
  .flatMap((entry) => (extname(entry) ? [entry] : listFiles(entry)));

const fail = (message) => {
  console.error(message);
  process.exitCode = 1;
};

const checkSyntax = () => {
  for (const file of jsFiles) {
    const result = spawnSync(process.execPath, ["--check", file], {
      encoding: "utf8",
    });
    if (result.status !== 0) {
      fail(result.stderr || result.stdout || `Syntax check failed: ${file}`);
    }
  }
};

const resolveImport = (fromFile, specifier) => {
  const cleanSpecifier = specifier.split("?")[0];
  const basePath = resolve(join(fromFile, ".."), cleanSpecifier);
  if (assetExtensions.has(extname(cleanSpecifier))) return true;
  if (extname(cleanSpecifier)) return existsSync(basePath);
  return existsSync(`${basePath}.js`) || existsSync(join(basePath, "index.js"));
};

const checkImports = () => {
  const importPattern =
    /(?:import|export)\s+(?:[^'"()]+?\s+from\s+)?["'](\.{1,2}\/[^"']+)["']|import\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g;

  for (const file of jsFiles) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1] || match[2];
      if (!resolveImport(file, specifier)) {
        fail(`Unresolved relative import in ${file}: ${specifier}`);
      }
    }
  }
};

const checkLintRules = () => {
  const forbiddenPatterns = [
    {
      pattern: /^(<<<<<<<|=======|>>>>>>>)/m,
      message: "Merge conflict marker found",
    },
    {
      pattern:
        /localStorage\.(setItem|getItem)\(\s*["'](?:token|refreshToken)["']/,
      message: "Session tokens must not be persisted in localStorage",
    },
    {
      pattern: /Authorization\s*:\s*`Bearer|Authorization\s*:\s*["']Bearer/i,
      message: "Frontend must rely on HttpOnly session cookies",
    },
  ];

  for (const file of jsFiles) {
    const source = readFileSync(file, "utf8");
    for (const { pattern, message } of forbiddenPatterns) {
      if (pattern.test(source)) {
        fail(`${message}: ${file}`);
      }
    }
  }
};

if (mode === "syntax") {
  checkSyntax();
} else if (mode === "type-check") {
  checkSyntax();
  checkImports();
} else {
  checkLintRules();
}
