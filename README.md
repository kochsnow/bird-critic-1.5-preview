# Bird-Critic 1.5 website

Static multi-page website for Bird-Critic 1.5. It is designed to publish directly on GitHub Pages without a build step.

The visual system follows the Bird-Critic 1.0 family: the original cube-bird
mark, pale green mastheads, cream navigation, academic-blue headings, and
compact benchmark tables. Brand assets are reused from the
[Bird-Critic 1.0 website](https://github.com/bird-bench/bird-critic.github.io).

## Site map

| Route | Purpose | Status |
| --- | --- | --- |
| `/` | Main release hub | Ready |
| `/lite/` | Lite overall leaderboard, four-language pass table, and 100-instance browser | Dataset and results published |
| `/full/` | Full 300-instance leaderboard, Extension 200 diagnostic, and instance browser | Dataset and preliminary results published |
| `/report/` | Formatted living technical report with raw Markdown access | Draft v0.1 published |
| `/languages/python/` | Independent rolling Python track | Preliminary Base result published |
| `/languages/node/` | Independent rolling Node.js track | Preliminary Base result published |
| `/languages/ruby/` | Independent rolling Ruby track | Preliminary Base result published |
| `/languages/php/` | Independent rolling PHP track | Preliminary Base result published |

Lite, Full, and the four language tracks are separate products:

- **Lite** is a fixed 100-instance evaluation.
- **Full** is a fixed 300-instance evaluation.
- **Language tracks** are independent, continuously updated task pools. They do not inherit tasks or results from Lite or Full.

## Public datasets

- [Bird-Critic 1.5 Lite 100](https://huggingface.co/datasets/kochsnow/bird-critic-1.5-lite-100)
- [Bird-Critic 1.5 Full 300](https://huggingface.co/datasets/kochsnow/bird-critic-1.5-full-300) — Lite 100 plus Extension 200

## Preview locally

From this directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

Do not open `index.html` directly from Finder: the instance and result JSON files are loaded over HTTP.
The technical report page also loads its Markdown source over HTTP.

The preferred Draft v0.1 citation is published in [`CITATION.cff`](CITATION.cff) and [`CITATION.bib`](CITATION.bib). After these files reach the default GitHub branch, GitHub exposes its native **Cite this repository** interface.

Run the static checks before pushing:

```bash
node scripts/validate-site.mjs
node --check assets/app.js
```

## Publish on GitHub Pages

1. Create an empty GitHub repository.
2. Push this directory to its `main` branch.
3. Open **Settings → Pages** in the GitHub repository.
4. Under **Build and deployment**, choose **GitHub Actions** as the source.
5. The included workflow publishes the site after every push to `main`.

Example:

```bash
git remote add origin https://github.com/OWNER/REPOSITORY.git
git add .
git commit -m "Launch Bird-Critic 1.5 website"
git push -u origin main
```

URL behavior:

- Repository `bird-critic/bird-critic.github.io` → `https://bird-critic.github.io/`
- Any other repository → `https://OWNER.github.io/REPOSITORY/`

All project links use relative paths, so both URL patterns work.

## Publish Lite results

Edit [`data/lite-results.json`](data/lite-results.json). The website computes success rates and ranks automatically.

```json
[
  {
    "model": "provider/model-name",
    "agent": "agent-name",
    "date": "YYYY-MM-DD",
    "scores": {
      "overall": { "solved": 0, "total": 100 },
      "python": { "solved": 0, "total": 25 },
      "node": { "solved": 0, "total": 28 },
      "ruby": { "solved": 0, "total": 20 },
      "php": { "solved": 0, "total": 27 }
    }
  }
]
```

Use the exact totals above. This file powers both Lite tables: the overall leaderboard and the four-language pass-rate breakdown.

## Publish Full results

Full is composed of the fixed Lite 100 plus the new Extension 200. When a model is evaluated with the same harness and configuration on both subsets, add the solved counts and publish the aggregate in [`data/full-results.json`](data/full-results.json):

- Overall: 300
- Python: 75 (25 Lite + 50 Extension)
- Node.js: 46 (28 Lite + 18 Extension)
- Ruby: 104 (20 Lite + 84 Extension)
- PHP: 75 (27 Lite + 48 Extension)

Keep the new-task-only scores in [`data/full-extension-results.json`](data/full-extension-results.json). The Full page labels this as a diagnostic result so it cannot be confused with the official 300-instance denominator.

The selected Extension task paths are recorded in [`data/full-extension-paths.txt`](data/full-extension-paths.txt). Rebuild and validate the combined 300-instance browser with:

```bash
node scripts/sync-full-instances.mjs
```

The generated [`data/full-instances.json`](data/full-instances.json) retains a `split` field (`Lite 100` or `Extension 200`) so visitors can browse either subset independently.

## Update an independent language track

Each rolling language track is a self-contained ownership directory:

```text
languages/
├── python/
│   ├── index.html
│   ├── tasks.json
│   ├── results.json
│   └── README.md
├── node/
├── ruby/
└── php/
```

Each language owner can change their page copy, task catalog, and result data without editing another track. These files are deliberately separate from `lite-instances.json`, `lite-results.json`, and `full-results.json`. Adding or removing a task automatically updates the published task count on that language page.

To rebuild the published Python, Node.js, and PHP instance catalogs directly
from the local benchmark datasets, run:

```bash
node scripts/sync-language-tasks.mjs
```

The Ruby catalog and its OpenCode evaluation are synchronized from the Harbor dataset and job outputs. Pass their local directories explicitly:

```bash
node scripts/sync-ruby-track.mjs /path/to/birdcritic15_lite_ruby_DB /path/to/unified_60
```

Track result files use the same model record format. Store the track score under its language key—for example, `scores.python` for the Python track.

See [`languages/README.md`](languages/README.md) for the ownership workflow. A ready-to-fill CODEOWNERS template is included at [`.github/CODEOWNERS.example`](.github/CODEOWNERS.example).

## Update the instance list

The official Lite split is stored in [`data/lite-instances.json`](data/lite-instances.json). Each entry uses:

```json
{
  "suite": "birdcritic15_full_python",
  "language": "Python",
  "repository": "apache/airflow",
  "pull_request": "#60804",
  "instance": "apache--airflow-pr-60804"
}
```

## Remaining release checklist

- Replace the preview-repository links if the final public code repository changes.
- Confirm every Full aggregate uses the same model, harness, and evaluation configuration across Lite and Extension.
- Confirm the release date and citation text.
