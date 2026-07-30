import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([".git", "node_modules"]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      return [];
    }

    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function relative(filePath) {
  return path.relative(root, filePath);
}

function localTarget(sourceFile, reference) {
  const cleanReference = reference.split(/[?#]/, 1)[0];
  if (!cleanReference || /^(?:https?:|mailto:|tel:|javascript:|data:|#)/.test(reference)) {
    return null;
  }

  const target = reference.startsWith("/")
    ? path.join(root, cleanReference.slice(1))
    : path.resolve(path.dirname(sourceFile), cleanReference);

  if (reference.endsWith("/") || (fs.existsSync(target) && fs.statSync(target).isDirectory())) {
    return path.join(target, "index.html");
  }

  return target;
}

const files = walk(root);
const jsonFiles = files.filter((file) => file.endsWith(".json"));
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const cssFiles = files.filter((file) => file.endsWith(".css"));
const missing = [];

for (const file of jsonFiles) {
  JSON.parse(fs.readFileSync(file, "utf8"));
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const references = [
    ...html.matchAll(/(?:href|src)=["']([^"']+)["']/g),
    ...html.matchAll(/property=["']og:image["'][^>]*content=["']([^"']+)["']/g),
  ];

  for (const match of references) {
    const target = localTarget(file, match[1]);
    if (target && !fs.existsSync(target)) {
      missing.push(`${relative(file)} → ${match[1]}`);
    }
  }
}

for (const file of cssFiles) {
  const css = fs.readFileSync(file, "utf8");
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let braceBalance = 0;

  for (const character of withoutComments) {
    if (character === "{") braceBalance += 1;
    if (character === "}") braceBalance -= 1;
    if (braceBalance < 0) break;
  }

  if (braceBalance !== 0) {
    throw new Error(`${relative(file)} has unbalanced braces (${braceBalance}).`);
  }

  for (const match of css.matchAll(/url\(["']?([^)"']+)["']?\)/g)) {
    const target = localTarget(file, match[1]);
    if (target && !fs.existsSync(target)) {
      missing.push(`${relative(file)} → ${match[1]}`);
    }
  }
}

if (missing.length > 0) {
  throw new Error(`Missing local resources:\n${missing.join("\n")}`);
}

console.log(
  `Site validation passed: ${htmlFiles.length} HTML, ${jsonFiles.length} JSON, ${cssFiles.length} CSS files.`,
);
