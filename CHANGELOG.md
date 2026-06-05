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

[Unreleased]: https://github.com/<you>/homelab-wallpaper
