# Language-track ownership

Each language track is intentionally self-contained so its owner can update content without touching another benchmark page.

```text
languages/<language>/
├── index.html    # Page copy, release notes, links, and section order
├── tasks.json    # Continuously updated task catalog
├── results.json  # Independent track leaderboard
└── README.md     # Track-specific editing notes
```

The shared visual system lives in `assets/styles.css` and shared behavior lives in `assets/app.js`. Track owners normally should not edit those files. This keeps navigation, accessibility, responsive behavior, and leaderboard rendering consistent across the website.

## Recommended pull-request workflow

1. Edit files only inside the owner's `languages/<language>/` directory.
2. Validate that `tasks.json` and `results.json` are valid JSON.
3. Preview the page locally.
4. Open a pull request and request review from that language's owner.

## Task record

```json
{
  "suite": "track_release_name",
  "language": "Python",
  "repository": "owner/repository",
  "pull_request": "#12345",
  "instance": "unique-instance-id"
}
```

## Result record

Use the matching language score key:

```json
{
  "model": "provider/model-name",
  "agent": "agent-name",
  "date": "YYYY-MM-DD",
  "scores": {
    "python": { "solved": 0, "total": 0 }
  }
}
```

Replace `python` with `node`, `ruby`, or `php` for the other tracks.
