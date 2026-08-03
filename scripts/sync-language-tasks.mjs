import fs from "node:fs";
import path from "node:path";

const websiteRoot = process.cwd();
const datasetsRoot = path.resolve(websiteRoot, "../BirdCritic_1.5_datasets/datasets");

const tracks = [
  {
    language: "Python",
    output: "languages/python/tasks.json",
    sources: [
      { directory: "birdcritic15_full_python", label: "Python · Full dataset" },
    ],
  },
  {
    language: "Node.js",
    output: "languages/node/tasks.json",
    sources: [
      { directory: "birdcritic15_lite_node", label: "Node.js · Core" },
      { directory: "birdcritic15_lite_node_plugins", label: "Node.js · Plugins" },
    ],
  },
  {
    language: "PHP",
    output: "languages/php/tasks.json",
    sources: [
      { directory: "birdcritic15_lite_php", label: "PHP · Lite dataset" },
    ],
  },
];

function metadataBlock(toml) {
  return toml.match(/\[metadata\]([\s\S]*?)(?=\n\[|$)/)?.[1] ?? "";
}

function stringValue(block, key) {
  return block.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, "m"))?.[1] ?? "";
}

function taskDirectories(datasetDirectory) {
  return fs.readdirSync(datasetDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(datasetDirectory, entry.name))
    .filter((directory) => fs.existsSync(path.join(directory, "task.toml")));
}

function deriveRepository(directoryName) {
  const phpMatch = directoryName.match(/^bird-lite-(.+?)--(.+)-(\d+)$/);
  if (phpMatch) return `${phpMatch[1]}/${phpMatch[2]}`;

  const pythonMatch = directoryName.match(/^(.+?)--(.+?)-pr-(\d+)$/);
  if (pythonMatch) return `${pythonMatch[1]}/${pythonMatch[2]}`;

  return "unknown/unknown";
}

function taskRecord(taskDirectory, source, language) {
  const directoryName = path.basename(taskDirectory);
  const toml = fs.readFileSync(path.join(taskDirectory, "task.toml"), "utf8");
  const metadata = metadataBlock(toml);
  const repository = stringValue(metadata, "repo") || deriveRepository(directoryName);
  const prReference = stringValue(metadata, "candidate_id")
    || stringValue(metadata, "pr_branch")
    || directoryName;
  const pullRequest = prReference.match(/(\d+)(?!.*\d)/)?.[1];

  if (!pullRequest || repository === "unknown/unknown") {
    throw new Error(`Unable to derive repository or PR for ${taskDirectory}`);
  }

  return {
    suite: source.directory,
    dataset_label: source.label,
    language,
    repository,
    pull_request: `#${pullRequest}`,
    instance: stringValue(metadata, "instance_id")
      || stringValue(metadata, "task_id")
      || directoryName,
  };
}

for (const track of tracks) {
  const records = track.sources.flatMap((source) => {
    const directory = path.join(datasetsRoot, source.directory);
    if (!fs.existsSync(directory)) throw new Error(`Missing dataset: ${directory}`);
    return taskDirectories(directory).map((taskDirectory) => taskRecord(taskDirectory, source, track.language));
  });

  records.sort((left, right) => {
    const repositoryOrder = left.repository.localeCompare(right.repository);
    if (repositoryOrder !== 0) return repositoryOrder;
    return Number(left.pull_request.slice(1)) - Number(right.pull_request.slice(1));
  });

  const output = path.join(websiteRoot, track.output);
  fs.writeFileSync(output, `${JSON.stringify(records, null, 2)}\n`);
  console.log(`${track.language}: ${records.length} instances → ${track.output}`);
}
