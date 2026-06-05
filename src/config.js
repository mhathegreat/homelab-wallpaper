/* ============================================================================
 * Homelab Wallpaper Dashboard — USER CONFIG
 * ----------------------------------------------------------------------------
 * Edit this file for the DEFAULTS. Almost everything here can also be changed
 * live in the wallpaper: press  C  (or click the gear, bottom-right).
 *
 * The card builder in the panel writes your changes to localStorage, which
 * overrides these defaults on the next load. Use the panel's "Reset to
 * defaults" button to come back to this file.
 * ========================================================================== */

window.CONFIG = {
  /* ---- Visual — also tunable via the [C] panel ----------------------------*/
  color:           '#00ff88',   // Node + line color (hex)
  backgroundColor: '#000000',   // Page / canvas background (hex)
  speed:           0.3,         // Drift speed              (0.1 – 2.0)
  nodeCount:       100,         // Number of nodes          (20 – 150)
  maxDistance:     170,         // Max px distance to draw a connecting line
  lineOpacity:     0.30,        // Line opacity             (0.01 – 0.40)
  nodeSize:        2,           // Node radius in px        (1 – 4)
  fpsCap:          60,          // Frame cap                (10 – 60)
  mouseRepel:      true,        // Cursor pushes nodes as it moves
  repelDistance:   50,          // Cursor interaction radius in px (20–200)
  repelStrength:   120,         // Cursor push strength     (20–200)

  /* ---- Stats sources ------------------------------------------------------*
   * Each card that shows stats picks one of these by `id`. A source with an
   * empty `url` runs on mock data. To show REAL data run Glances on a machine:
   *   docker ... nicolargo/glances   ->  http://<ip>:61208/api/3/all
   *
   * NOTE: a wallpaper cannot read your PC's hardware directly. To show "THIS
   * PC", run Glances on Windows too and use http://localhost:61208/api/3/all
   * (any endpoint returning the same JSON shape works — see README).         */
  pollInterval: 5000,           // Fetch interval in ms     (2000 – 30000)
  sources: [
    { id: 'homelab', name: 'HOMELAB', url: '' },   // your server
    { id: 'thispc',  name: 'THIS PC', url: '' }     // localhost Glances
  ],

  /* ---- Cards --------------------------------------------------------------*
   * An ordered list. Add / remove / reorder / configure these from the panel
   * (or here). Each card needs a unique `id` and a `type`:
   *   system | network | services | storage   -> need a `source`
   *   notes                                    -> local text + optional Nextcloud
   *   links                                    -> a list of buttons
   *
   * services: filterMode 'all' shows every container from the source;
   *           'pick' shows only the names listed in `filter`.                */
  cards: [
    { id: 'sys_home', type: 'system',   source: 'homelab', show: true },
    { id: 'net_home', type: 'network',  source: 'homelab', show: true },
    { id: 'svc_home', type: 'services', source: 'homelab', show: true,
      filterMode: 'all', filter: [] },
    { id: 'sto_home', type: 'storage',  source: 'homelab', show: true },

    { id: 'sys_pc',   type: 'system',   source: 'thispc',  show: false },
    { id: 'net_pc',   type: 'network',  source: 'thispc',  show: false },
    { id: 'sto_pc',   type: 'storage',  source: 'thispc',  show: false },

    { id: 'notes1',   type: 'notes',    show: true,
      // Leave blank to keep notes local-only. Fill in to sync with a
      // Nextcloud "Notes" note (app password as token; CORS must allow it).
      nc: { url: '', user: '', token: '', noteId: '' } },

    { id: 'links1',   type: 'links',    show: false, links: [
      { label: 'Proxmox',   url: 'https://192.168.1.10:8006' },
      { label: 'Portainer', url: 'http://192.168.1.10:9000' },
      { label: 'Router',    url: 'http://192.168.1.1' }
    ] }
  ],

  /* ---- UI ----------------------------------------------------------------*/
  showClock: true
};
