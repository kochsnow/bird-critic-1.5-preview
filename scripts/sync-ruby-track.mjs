import fs from "node:fs";
import path from "node:path";

const [datasetArgument, jobsArgument] = process.argv.slice(2);
if (!datasetArgument || !jobsArgument) {
  throw new Error("Usage: node scripts/sync-ruby-track.mjs DATASET_DIRECTORY JOBS_DIRECTORY");
}

const root = process.cwd();
const datasetDirectory = path.resolve(datasetArgument);
const jobsDirectory = path.resolve(jobsArgument);
const taskOutput = path.join(root, "languages/ruby/tasks.json");
const resultOutput = path.join(root, "languages/ruby/results.json");

function directoriesWith(directory, requiredFile) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(directory, name, requiredFile)));
}

const taskNames = directoriesWith(datasetDirectory, "task.toml").sort();
const jobNames = directoriesWith(jobsDirectory, "result.json").sort();

if (taskNames.length !== 60 || jobNames.length !== 60) {
  throw new Error(`Expected 60 tasks and 60 jobs; found ${taskNames.length} tasks and ${jobNames.length} jobs.`);
}

const results = jobNames.map((jobName) => ({
  jobName,
  result: JSON.parse(fs.readFileSync(path.join(jobsDirectory, jobName, "result.json"), "utf8")),
}));
const resultByTask = new Map(results.map((entry) => [entry.result.task_name, entry]));

const missingResults = taskNames.filter((taskName) => !resultByTask.has(taskName));
if (missingResults.length) throw new Error(`Missing results for: ${missingResults.join(", ")}`);

const tasks = taskNames.map((taskName) => {
  const metadataFile = path.join(datasetDirectory, taskName, ".meta/task_data.json");
  if (!fs.existsSync(metadataFile)) throw new Error(`Missing metadata: ${taskName}`);
  const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
  const jobName = resultByTask.get(taskName).jobName;
  const tier = jobName.match(/__(Tier\d+)$/)?.[1] || "";

  if (!metadata.repo || !Number.isInteger(metadata.pr_number)) {
    throw new Error(`Missing repository or PR metadata: ${taskName}`);
  }

  return {
    suite: "birdcritic15_lite_ruby_DB",
    dataset_label: "Ruby · Lite / Base Split",
    language: "Ruby",
    repository: metadata.repo,
    pull_request: `#${metadata.pr_number}`,
    instance: metadata.instance_id || taskName,
    difficulty_tier: tier,
  };
}).sort((left, right) => {
  const repositoryOrder = left.repository.localeCompare(right.repository);
  if (repositoryOrder !== 0) return repositoryOrder;
  return Number(left.pull_request.slice(1)) - Number(right.pull_request.slice(1));
});

const agents = new Set(results.map(({ result }) => result.agent_info?.name));
const models = new Set(results.map(({ result }) => result.agent_info?.model_info?.name));
if (agents.size !== 1 || !agents.has("opencode")) throw new Error(`Unexpected agents: ${[...agents].join(", ")}`);
if (models.size !== 1 || !models.has("gpt-5.5-2026-04-23")) throw new Error(`Unexpected models: ${[...models].join(", ")}`);

const rewards = results.map(({ result }) => result.verifier_result?.rewards?.reward);
if (rewards.some((reward) => reward !== 0 && reward !== 1)) throw new Error("Every Ruby job must have a binary reward.");
const solved = rewards.filter((reward) => reward === 1).length;
const evaluatedDate = results
  .map(({ result }) => result.finished_at)
  .filter(Boolean)
  .sort()
  .at(-1)
  ?.slice(0, 10) || "";

const leaderboard = [{
  model: "gpt-5.5-2026-04-23 (low)",
  agent: "OpenCode",
  split: "Lite / Base Split",
  date: evaluatedDate,
  scores: { ruby: { solved, total: tasks.length } },
}];

fs.writeFileSync(taskOutput, `${JSON.stringify(tasks, null, 2)}\n`);
fs.writeFileSync(resultOutput, `${JSON.stringify(leaderboard, null, 2)}\n`);
console.log(`Ruby: ${solved}/${tasks.length} passed; wrote ${path.relative(root, taskOutput)} and ${path.relative(root, resultOutput)}.`);
