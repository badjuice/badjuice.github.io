# badjuice.github.io

Personal page for Nox Fortes (badjuice): a short bio and the public projects on this account. Live at https://badjuice.github.io/.

The colours are Monkeytype's **9009** theme, taken from `frontend/src/ts/constants/themes.ts` in [monkeytypegame/monkeytype](https://github.com/monkeytypegame/monkeytype). The font is Roboto Mono, Monkeytype's default.

## Editing

- **Bio, location, links, pinned and hidden repos:** `js/profile.js`.
- **Projects:** loaded from the GitHub API when the page opens (cached for an hour in the visitor's browser). Forks are left out. If the API can't be reached, the page uses `data/github.json`, which the deploy workflow refreshes on every push and every 6 hours.

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

No build step: the site is plain HTML, CSS and JavaScript modules.
