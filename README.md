# Bird-Critic 1.5 website

Static multi-page website for Bird-Critic 1.5. It is designed to publish directly on GitHub Pages without a build step.

## Site map

| Route | Purpose | Status |
| --- | --- | --- |
| `/` | Main release hub | Ready |
| `/lite/` | Lite leaderboard and 100-instance browser | Ready for result data |
| `/full/` | Full 300-instance release | Release template |
| `/languages/python/` | Python track | Ready for result data |
| `/languages/node/` | Node.js track | Ready for result data |
| `/languages/ruby/` | Ruby track | Ready for result data |
| `/languages/php/` | PHP track | Ready for result data |

## Preview locally

From this directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

Do not open `index.html` directly from Finder: the instance and result JSON files are loaded over HTTP.

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

Use the exact totals above. The same file powers the Lite leaderboard and all four language-track leaderboards.

## Publish Full results

Edit [`data/full-results.json`](data/full-results.json) using the same structure. Set `overall.total` to `300` and use the final official totals for each language.

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

- Replace the temporary `https://github.com/bird-bench` links with the final code repository.
- Add the paper and dataset links once their public URLs are available.
- Fill `data/lite-results.json` with the official result rows.
- Confirm the release date and citation text.
