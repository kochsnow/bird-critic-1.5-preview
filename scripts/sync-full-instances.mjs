import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const datasetRoot = path.resolve(root, "../BirdCritic_1.5_datasets/full_datasets");
const pathsFile = path.join(root, "data/full-extension-paths.txt");
const liteFile = path.join(root, "data/lite-instances.json");
const outputFile = path.join(root, "data/full-instances.json");

const suiteDetails = {
  python_full: { language: "Python", label: "Extension · Python" },
  node_full: { language: "Node.js", label: "Extension · Node.js" },
  php_full: { language: "PHP", label: "Extension · PHP" },
  ruby_full: { language: "Ruby", label: "Extension · Ruby" },
};

const expectedExtensionCounts = { Python: 50, "Node.js": 18, PHP: 48, Ruby: 84 };
const expectedFullCounts = { Python: 75, "Node.js": 46, PHP: 75, Ruby: 104 };

function readMetadataRepo(taskFile) {
  const task = fs.readFileSync(taskFile, "utf8");
  const metadata = task.match(/\[metadata\]([\s\S]*?)(?:\n\[|$)/)?.[1] || "";
  return metadata.match(/^repo\s*=\s*"([^"]+)"/m)?.[1] || "";
}

function repositoryFromPath(relativePath, taskFile) {
  const metadataRepo = readMetadataRepo(taskFile);
  if (metadataRepo) return metadataRepo;

  const [suite, ...parts] = relativePath.split("/");
  const basename = parts.at(-1);

  if (suite === "python_full") {
    const match = basename.match(/^bird-critic-15-v4-(.+)--([^-]+)-(\d+)$/);
    if (!match) throw new Error(`Unable to parse Python path: ${relativePath}`);
    return `${match[1].split("-").at(-1)}/${match[2]}`;
  }

  if (suite === "php_full") {
    const match = basename.match(/^bird-lite-([^-]+)--(.+)-(\d+)$/);
    if (!match) throw new Error(`Unable to parse PHP path: ${relativePath}`);
    return `${match[1]}/${match[2]}`;
  }

  if (suite === "ruby_full") {
    const match = basename.match(/^(.+)-pr-(\d+)$/);
    if (!match || parts.length < 2) throw new Error(`Unable to parse Ruby path: ${relativePath}`);
    return `${parts.at(-2)}/${match[1]}`;
  }

  throw new Error(`Unable to determine repository for ${relativePath}`);
}

function pullRequestFromPath(relativePath) {
  const number = relativePath.match(/(\d+)$/)?.[1];
  if (!number) throw new Error(`Unable to parse pull request: ${relativePath}`);
  return `#${number}`;
}

function countByLanguage(items) {
  return items.reduce((counts, item) => {
    counts[item.language] = (counts[item.language] || 0) + 1;
    return counts;
  }, {});
}

function assertCounts(label, actual, expected) {
  for (const [language, count] of Object.entries(expected)) {
    if (actual[language] !== count) {
      throw new Error(`${label}: expected ${count} ${language} tasks, found ${actual[language] || 0}`);
    }
  }
}

const selectedPaths = fs.readFileSync(pathsFile, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

if (selectedPaths.length !== 200 || new Set(selectedPaths).size !== 200) {
  throw new Error(`Expected 200 unique extension paths, found ${selectedPaths.length} lines and ${new Set(selectedPaths).size} unique paths.`);
}

const extension = selectedPaths.map((relativePath) => {
  const suite = relativePath.split("/", 1)[0];
  const details = suiteDetails[suite];
  if (!details) throw new Error(`Unknown suite: ${suite}`);

  const taskFile = path.join(datasetRoot, relativePath, "task.toml");
  if (!fs.existsSync(taskFile)) throw new Error(`Missing task.toml: ${relativePath}`);

  return {
    suite,
    split: "Extension 200",
    dataset_label: details.label,
    language: details.language,
    repository: repositoryFromPath(relativePath, taskFile),
    pull_request: pullRequestFromPath(relativePath),
    instance: relativePath,
  };
});

assertCounts("Extension split", countByLanguage(extension), expectedExtensionCounts);

const lite = JSON.parse(fs.readFileSync(liteFile, "utf8")).map((item) => ({
  ...item,
  split: "Lite 100",
  dataset_label: `Lite · ${item.language}`,
}));

if (lite.length !== 100) throw new Error(`Expected 100 Lite tasks, found ${lite.length}.`);

const full = [...lite, ...extension];
assertCounts("Full split", countByLanguage(full), expectedFullCounts);

if (new Set(full.map((item) => `${item.split}:${item.instance}`)).size !== 300) {
  throw new Error("Full split contains duplicate split/instance pairs.");
}

fs.writeFileSync(outputFile, `${JSON.stringify(full, null, 2)}\n`);
console.log(`Wrote ${full.length} Full instances (${lite.length} Lite + ${extension.length} Extension) to ${path.relative(root, outputFile)}.`);
