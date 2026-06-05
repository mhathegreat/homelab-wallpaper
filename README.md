<div align="center">

# 🖥️ Homelab Wallpaper Dashboard

**A dark, ambient node-network wallpaper for [Wallpaper Engine](https://store.steampowered.com/app/431960/Wallpaper_Engine/) — with a live, configurable homelab dashboard.**

Drifting nodes on pure black · draggable stat cards (CPU · RAM · temp · network · containers · storage) · notes with Nextcloud sync · link buttons — all from an in-wallpaper builder, no code required.

[![License: MIT](https://img.shields.io/badge/license-MIT-00ff88?style=flat-square)](LICENSE)
&nbsp;![Platform](https://img.shields.io/badge/platform-Windows-00ff88?style=flat-square)
&nbsp;![Wallpaper Engine](https://img.shields.io/badge/Wallpaper_Engine-web-00ff88?style=flat-square)
&nbsp;![Build](https://img.shields.io/badge/build-none_·_static-00ff88?style=flat-square)
&nbsp;![Deps](https://img.shields.io/badge/deps-CDN_only-00ff88?style=flat-square)

</div>

Works out of the box on built-in **mock data** — point it at [Glances](https://nicolargo.github.io/glances/) to show your real servers.

```
░░  // SYSTEM        // NETWORK                            14:32
░░  CPU   12%  ▁▁     ↑ UP    142 KB/s        THU · JUN 05 · 2026
░░  RAM   54%  ▃▃     ↓ DOWN  613 KB/s
░░  TEMP  46°C        PING    3 ms
░░
░░  // SERVICES
░░  ● nginx   ● portainer   ● jellyfin   ◐ homeassistant
```

---

## Features

- 🟢 **Node-network background** — drifting nodes + distance-faded lines on pure black, with a cursor **momentum** interaction (nodes scatter, then coast back).
- 📊 **Multi-source stats** — point cards at any number of machines (homelab, this PC, …) via [Glances](https://nicolargo.github.io/glances/) or any JSON endpoint.
- 🧩 **Six card types** — system · network · services · storage · notes · links.
- 🛠️ **In-wallpaper card builder** — add / remove / reorder / configure cards live; no file editing.
- 📝 **Notes with Nextcloud sync** — local by default, syncs to a Nextcloud Notes note when configured.
- 🔗 **Link buttons** — handy even with no homelab.
- 🎛️ **Everything tunable live** — press <kbd>C</kbd>; changes autosave to `localStorage`.
- 🪶 **Light & self-contained** — static files, CDN-only deps, 60 fps cap, auto-pause when hidden.
- 🧪 **Never breaks** — any fetch error falls back to mock data.

## Table of Contents

[Requirements](#requirements) · [Install](#quick-install) · [Controls](#controls) · [Connecting Your Homelab](#connecting-your-homelab-glances) · [Configuration](#configuration) · [Custom API](#custom-api-not-using-glances) · [Architecture](#architecture) · [Development](#development) · [Contributing](#contributing) · [License](#license)

---

## Preview

> **📷 Placeholder.** `preview.png` ships as a generated stand-in so the
> package loads in Wallpaper Engine. **Replace it with a real screenshot**
> of the wallpaper running on your machine (≈ 800×450 or larger, PNG/JPG)
> before publishing — Wallpaper Engine uses it as the library thumbnail.
>
> Quickest way to capture one: apply the wallpaper, press <kbd>Win</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>, crop, and save over `preview.png`.

---

## Requirements

- **Wallpaper Engine** (Steam)
- *(Optional)* a homelab running **Glances** — without it the dashboard runs on realistic mock data that fluctuates so it still looks alive.

---

## Quick Install

```powershell
git clone https://github.com/mhathegreat/homelab-wallpaper.git
cd homelab-wallpaper
# Right-click install.ps1  ->  "Run with PowerShell"
```

`install.ps1` finds Steam, locates the Wallpaper Engine content folder, copies the project into a uniquely named subfolder, and prints next steps. No admin rights needed.

Then: **Wallpaper Engine → Browse → My Wallpapers → "Homelab Dashboard" → apply.**

> If Windows blocks the script, run this once in the same PowerShell window and try again:
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> ```

---

## Manual Install

Copy the **entire folder** into your Wallpaper Engine content directory under any subfolder name:

```
<Steam>\steamapps\workshop\content\431960\<any-folder-name>\
```

Typical full path:

```
C:\Program Files (x86)\Steam\steamapps\workshop\content\431960\homelab-wallpaper\
```

Open Wallpaper Engine → **Browse → My Wallpapers** and apply **Homelab Dashboard**. If WE is already open, right-click the wallpaper list → **Refresh**.

---

## Controls

| Action | How |
| --- | --- |
| Open / close config panel | Press <kbd>C</kbd> or click the gear (bottom-right) |
| Move a card | Drag its `// HEADER` |
| Resize a card | Drag the bottom-right corner |
| Hide a card | Click the red **×** on the card, or toggle it in the panel |
| Reset card layout | Panel → **Reset card positions** |
| Persist your settings | Panel → **Save config** |

Card positions are saved automatically as you drag. Everything in the panel applies **live**; **Save config** makes it the new default across restarts.

---

## Connecting Your Homelab (Glances)

Run Glances on your server with the web/REST API exposed:

```bash
docker run -d --name glances \
  -p 61208:61208 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  --pid host \
  nicolargo/glances:latest-full
```

Then in the wallpaper press <kbd>C</kbd> → **// SOURCES** and set the **HOMELAB**
source URL to:

```
http://<your-server-ip>:61208/api/3/all
```

Every stat card bound to that source switches to live data, and the change saves
automatically.

### Showing "THIS PC"

A wallpaper can't read your PC's hardware directly (there's no browser API for it).
To show local stats, run Glances on **Windows** too and point the **THIS PC** source
at `http://localhost:61208/api/3/all`, then enable the `THIS PC` cards in
**// CARDS** (they ship hidden by default).

> **Stats not showing up?** The wallpaper silently falls back to mock data on any
> error, so it never breaks. Check the URL is reachable from Windows, that Glances
> is running with its web server, and that the API version (`/api/3/`) matches your
> Glances build (newer ones also serve `/api/4/`). Cross-origin requests may need
> Glances' CORS enabled.

---

## Configuration

Two ways to configure:

1. **Live** — press <kbd>C</kbd> for the panel + **card builder** (recommended).
2. **Defaults** — edit [`src/config.js`](src/config.js); every option is commented.

Anything you change in the panel autosaves to `localStorage` and overrides
`config.js` on the next load. The panel's **Reset to defaults** button clears that
and reloads from `config.js`.

### Sources

`CONFIG.sources` is the list of machines to pull stats from. Each stat card points
at one by `id`; an empty `url` runs on mock data.

```js
sources: [
  { id: 'homelab', name: 'HOMELAB', url: 'http://192.168.1.10:61208/api/3/all' },
  { id: 'thispc',  name: 'THIS PC', url: 'http://localhost:61208/api/3/all' },
]
```

### Cards

`CONFIG.cards` is an ordered list. Add / remove / reorder / configure them in the
**// CARDS** panel (or here). Each card has a unique `id`, a `type`, and a `show` flag:

| Type | Needs | Shows |
| --- | --- | --- |
| `system` | `source` | CPU / RAM / TEMP |
| `network` | `source` | ↑ up / ↓ down / ping |
| `services` | `source` | container status dots — `filterMode: 'all'`, or `'pick'` + `filter: [names]` |
| `storage` | `source` | disk used / free |
| `notes` | — | local notes (autosaved) with optional Nextcloud Notes sync |
| `links` | — | a list of link buttons (`links: [{label, url}]`) — handy with no homelab |

Because cards are a list, "System · This PC" and "System · Homelab" are just two
`system` cards pointing at different sources — same for network and storage. The
**services** card shows every container from its source by default, or only the
ones you tick when set to *Only selected* (works for anyone's containers).

### Notes ↔ Nextcloud

The `notes` card keeps your notes locally (saved in `localStorage`) out of the box. To
sync it with a **Nextcloud Notes** note, open the card's ⚙ settings and fill in:

- **Nextcloud URL** — `https://cloud.example.com`
- **Username**
- **App password / token** — Nextcloud → *Settings → Security → Devices & sessions*
- **Note ID** — the numeric id from the note (via the Notes app/API)

It pulls on load and pushes (debounced) as you type, falling back to local-only if
the server is unreachable. Nextcloud must allow the wallpaper's origin via **CORS**
or the browser blocks the request (local editing still works regardless).

### Visual reference (`window.CONFIG`)

| Key | Default | Range | Description |
| --- | --- | --- | --- |
| `color` | `'#00ff88'` | any hex | Node + line color |
| `backgroundColor` | `'#000000'` | any hex | Background |
| `speed` | `0.3` | `0.1`–`2.0` | Node drift speed |
| `nodeCount` | `100` | `20`–`150` | Number of nodes |
| `maxDistance` | `170` | `80`–`250` | Max line distance (px) |
| `lineOpacity` | `0.30` | `0.01`–`0.40` | Line opacity |
| `nodeSize` | `2` | `1`–`4` | Node radius (px) |
| `fpsCap` | `60` | `10`–`60` | Frame cap |
| `mouseRepel` | `true` | — | Cursor pushes nodes as it moves |
| `repelDistance` | `50` | `20`–`200` | Cursor reach (px) |
| `repelStrength` | `120` | `20`–`200` | Cursor push strength |
| `pollInterval` | `5000` | `2000`–`30000` | Stats fetch interval (ms) |
| `showClock` | `true` | — | Top-right clock |

Saved state lives in `localStorage`: `homelab-wallpaper-config` (settings + sources +
cards), `homelab-wallpaper-positions` (card layout), `homelab-wallpaper-notes` (note text).

---

## Custom API (not using Glances)

You don't have to use Glances. Point a **source**'s URL at **any** endpoint that
returns JSON in this shape and its cards will render it:

```jsonc
{
  "cpu": 12,                 // %  (number)
  "ram": 54,                 // %  (number)
  "temp": 46,                // °C (number)
  "upload": 142,             // KB/s (number)
  "download": 613,           // KB/s (number)
  "ping": 3,                 // ms (number)
  "services": [              // array, rendered as colored dots
    { "name": "nginx",     "status": "up"   },
    { "name": "jellyfin",  "status": "warn" },
    { "name": "oldbox",    "status": "down" }
  ],
  "diskUsed": 67,            // % (number)
  "diskFree": 420.3          // GB (number)
}
```

`status` values: `"up"` (green), `"warn"` (amber), anything else ⇒ `"down"` (red).

> The bundled poller in [`src/stats.js`](src/stats.js) understands the **Glances
> `/api/3/all`** schema natively and normalizes it to the shape above. If you
> serve a different schema, either match the shape above or adjust the
> `normalizeGlances()` mapping in `stats.js`.

---

## Architecture

No build step, no backend — a single static page Wallpaper Engine renders in its
Chromium (CEF) view. Five vanilla-JS modules talk through `window.CONFIG` and DOM
events.

### Data flow

```
Glances (your servers)  ──fetch──►  stats.js  ──'statsUpdate'──►  cards.js
        (or mock)                  (per source)                   (matching cards update)

window.CONFIG ◄──reads/writes── panel.js (the [C] builder) ──renders──► cards.js + particles.js
```

### Modules

| File | Role |
| --- | --- |
| [`src/config.js`](src/config.js) | `window.CONFIG` defaults: visual settings, `sources[]`, `cards[]` |
| [`src/stats.js`](src/stats.js) | Polls each source, normalizes Glances → flat shape, mock fallback, caches per source |
| [`src/cards.js`](src/cards.js) | Builds / draws / drags cards, routes each source's data to its cards |
| [`src/particles.js`](src/particles.js) | tsParticles node-network + cursor momentum physics + WE property bridge |
| [`src/panel.js`](src/panel.js) | The `C` panel, card builder, and `localStorage` persistence |

Load order (bottom of `index.html`): tsParticles (CDN) → config → stats → cards →
particles → panel. Each publishes a `window.Wallpaper*` API the others call.

### The background

The aesthetic target is the **Vanta.js NET** demo, rendered with
**[tsParticles](https://tsparticles.js.org/)** instead — because the live panel needs
things Vanta NET doesn't expose: an FPS cap, independent line-opacity / node-size /
speed / count / distance, pause-on-hidden, and retina handling. The cursor interaction
is a custom **momentum model** in `particles.js`: on each mouse move, nodes within
*Cursor distance* get an instant shove + a velocity kick, then friction bleeds only the
excess speed so they coast and settle back into their drift. Frame-capped (60 fps) and
auto-paused when the wallpaper isn't visible.

### Data & persistence

`stats.js` fetches each source's URL every `pollInterval` (3 s timeout), normalizes the
Glances `/api/3/all` response, and broadcasts `statsUpdate { sourceId, data }`. An empty
URL or any error ⇒ mock data, so it never breaks. State lives in `localStorage`:

| Key | Holds |
| --- | --- |
| `homelab-wallpaper-config` | settings + sources + cards (autosaved) |
| `homelab-wallpaper-positions` | card layout (saved on drag) |
| `homelab-wallpaper-notes` | note text (saved as you type) |

On load, `panel.js` merges your saved config over the `config.js` defaults.

### Dependencies (CDN only — nothing vendored)

- `tsparticles@2` — `https://cdn.jsdelivr.net/npm/tsparticles@2.12.0/tsparticles.bundle.min.js`
- JetBrains Mono — Google Fonts

---

## Project structure

```
homelab-wallpaper/
├── project.json        Wallpaper Engine manifest (web type, scheme-color property)
├── index.html          Lean shell: #bg / #clock / #hint + CDN + script loads
├── src/
│   ├── config.js       window.CONFIG — defaults you can edit (fully commented)
│   ├── stats.js        Multi-source poller + Glances normalization + mock fallback
│   ├── cards.js        Card engine (6 types) — draggable / resizable / persisted
│   ├── particles.js    tsParticles node-network + cursor physics + WE bridge
│   └── panel.js        [C] panel + card builder + persistence
├── install.ps1         Safe installer (auto-detects Steam / WE folder)
├── preview.png         Library thumbnail (replace with a real screenshot)
├── CONTRIBUTING.md
├── CHANGELOG.md
├── LICENSE
├── .gitignore
└── README.md
```

---

## Development

It's plain static files — no build step. To preview in a browser, serve the
folder over HTTP (so the `src/*.js` files load) and open it:

```powershell
# Python
python -m http.server 8080
# then open http://localhost:8080
```

Wallpaper Engine renders the page in a Chromium (CEF) view, so anything that
works in a recent Chrome works in the wallpaper.

---

## Contributing

Contributions welcome — it's plain static files, no build step. See
[CONTRIBUTING.md](CONTRIBUTING.md) for setup and guidelines. In short: serve the folder
over HTTP, edit, refresh; keep it vanilla JS with CDN-only deps; and test in a browser
(ideally in Wallpaper Engine) before opening a PR.

Found a bug or have an idea? Open an issue.

---

## License

[MIT](LICENSE) © 2026 Homelab Wallpaper Dashboard contributors.

Libraries are loaded from CDN and remain under their own licenses
(tsParticles — MIT; JetBrains Mono — SIL Open Font License).
