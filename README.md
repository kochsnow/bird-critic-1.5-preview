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
| `/lite/` | Lite overall leaderboard, four-language pass table, and 100-instance browser | Ready for result data |
| `/full/` | Full 300-instance release | Release template |
| `/languages/python/` | Independent rolling Python track | Ready for track data |
| `/languages/node/` | Independent rolling Node.js track | Ready for track data |
| `/languages/ruby/` | Independent rolling Ruby track | Ready for track data |
| `/languages/php/` | Independent rolling PHP track | Ready for track data |

Lite, Full, and the four language tracks are separate products:

- **Lite** is a fixed 100-instance evaluation.
- **Full** is a fixed 300-instance evaluation.
- **Language tracks** are independent, continuously updated task pools. They do not inherit tasks or results from Lite or Full.

## Preview locally

From this directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

Do not open `index.html` directly from Finder: the instance and result JSON files are loaded over HTTP.

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

Edit [`data/full-results.json`](data/full-results.json) using the same structure. Set `overall.total` to `300` and use the final official totals for each language.

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

## Before the public launch

- Replace the preview-repository links if the final public code repository changes.
- Add the paper and dataset links once their public URLs are available.
- Fill `data/lite-results.json` with the official result rows.
- Confirm the release date and citation text.
