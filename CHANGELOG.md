# Changelog

All notable changes to this project are documented here. The format loosely follows
[Keep a Changelog](https://keepachangelog.com/), and the project aims to follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Node-network background (tsParticles) on pure black, reproducing the Vanta NET look.
- Cursor **momentum physics** — nodes get an instant shove plus a velocity kick, then
  coast and settle back into their drift (tunable reach + strength).
- **Multi-source stats** (`CONFIG.sources`) via Glances `/api/3/all` or any JSON
  endpoint, with per-source caching and mock-data fallback.
- **Six card types** — system, network, services, storage, notes, links.
- **In-wallpaper card builder** (the `[C]` panel): add / remove / reorder / configure
  cards, edit sources, filter services, edit links, set per-card options.
- **Notes** card with local autosave **+ optional Nextcloud Notes sync**.
- **Links** card with a configurable list of buttons.
- Draggable / resizable cards with layout persistence.
- Live visual controls (color, count, distance, opacity, size, FPS, cursor physics).
- `localStorage` persistence with autosave, **Save**, **Reset card positions**, and
  **Reset to defaults**.
- Wallpaper Engine property bridge (scheme color / FPS) and `install.ps1` installer
  that auto-detects the Steam / Wallpaper Engine content folder.
- Documentation: README (with architecture), `CONTRIBUTING.md`, MIT `LICENSE`.
- `source.type: 'raw'` for endpoints that already return the flat stats shape
  (e.g. a custom agent) — skips Glances normalization.
- Notes card `proxy` mode: read/write the note through a server-side endpoint, so
  credentials stay off the client and browser CORS is avoided.
- Optional, gitignored `src/config.local.js` for per-machine overrides.
- Multi-monitor: `layout.uiRect` pins the dashboard (clock, cards, gear, panel) to one
  screen when a single wallpaper is stretched across several monitors.
- Wallpaper Engine usability: bigger/brighter clock, a more visible gear (WE blocks
  keyboard input to wallpapers, so the panel opens by clicking the gear), higher card
  max-width, and a visible resize grip.

[Unreleased]: https://github.com/mhathegreat/homelab-wallpaper
