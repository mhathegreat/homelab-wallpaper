# Contributing

Thanks for your interest in improving **Homelab Wallpaper Dashboard**! It's plain
static files — no build, no dependencies to install, no framework to learn.

## Getting set up

1. Fork & clone the repo.
2. Serve the folder over HTTP so the `src/*.js` modules load (opening `index.html`
   via `file://` won't work):
   ```bash
   python -m http.server 8080
   # then open http://localhost:8080
   ```
3. Edit, refresh, repeat. Wallpaper Engine renders the page in a Chromium (CEF)
   view, so if it works in a recent Chrome it works in the wallpaper.

## Project layout

See [Architecture](README.md#architecture). In short:

| File | Role |
| --- | --- |
| `src/config.js` | defaults (`window.CONFIG`) |
| `src/stats.js` | multi-source polling + Glances normalization + mock fallback |
| `src/cards.js` | card rendering, drag/resize, data routing |
| `src/particles.js` | node-network background + cursor physics + WE bridge |
| `src/panel.js` | the `[C]` panel / card builder + persistence |

## Guidelines

- **No build step, no bundlers, no frameworks.** Keep it vanilla, broadly
  ES5-compatible JS that runs directly in CEF. Libraries load from a CDN
  (jsDelivr / cdnjs) — please don't vendor files.
- **Match the existing style:** small modules, each exposing a `window.Wallpaper*`
  API, communicating via `window.CONFIG` and DOM events.
- **Keep it light.** This runs as a desktop background — respect the FPS cap and
  the pause-when-hidden behavior; avoid heavy per-frame work.
- **Never throw to the UI.** Network/parse errors should fall back gracefully
  (mock data, local notes, etc.).
- Test in a browser (and ideally in Wallpaper Engine) before opening a PR.

## Adding a card type

1. In `src/cards.js`, add a body builder `bodyX(body, cfg)` that returns an
   `update(data)` function, and register it in the `BODIES` map.
2. In `src/panel.js`, add the type to `CARD_TYPES` and `defaultCard()`, plus any
   per-type settings UI in `cardSettings()`.
3. Document it in the README's card table.

## Reporting bugs / ideas

Open an issue with: what you expected, what happened, your OS and Wallpaper Engine
version, and (if relevant) your source/card configuration. PRs welcome!

By contributing, you agree your contributions are licensed under the project's
[MIT License](LICENSE).
