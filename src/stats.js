/* ============================================================================
 * stats.js — multi-source homelab telemetry poller
 * ----------------------------------------------------------------------------
 * Polls every CONFIG.sources[*].url (Glances /api/3/all) on an interval and
 * broadcasts per-source results on the window 'statsUpdate' event:
 *     detail = { sourceId: '<id>', data: { ...normalized... } }
 *
 * Rules:
 *   - Never throws to the UI. Any failure / empty url -> mock data.
 *   - Caches the latest data per source (getData) so a newly shown card can
 *     render immediately without waiting for the next poll.
 *
 * Exposes: window.WallpaperStats = { start(), stop(), pollAll(),
 *                                    pollSource(id), getData(id) }
 * ========================================================================== */
(function () {
  'use strict';
  var W = window;
  var timer = null;
  var lastData = {};   // sourceId -> normalized data

  /* --- helpers ----------------------------------------------------------- */
  function rnd(min, max) { return Math.round(min + Math.random() * (max - min)); }
  function num(v, d) { v = Number(v); return isFinite(v) ? v : (d || 0); }

  function timeoutSignal(ms) {
    try {
      if (AbortSignal && typeof AbortSignal.timeout === 'function') {
        return AbortSignal.timeout(ms);
      }
    } catch (e) {}
    try {
      var ac = new AbortController();
      setTimeout(function () { ac.abort(); }, ms);
      return ac.signal;
    } catch (e) { return undefined; }
  }

  /* --- mock data (fluctuates each poll so the dashboard looks alive) ------ */
  function mock() {
    return {
      cpu:      rnd(8, 35),
      ram:      rnd(45, 65),
      temp:     rnd(41, 52),
      upload:   rnd(20, 300),
      download: rnd(50, 800),
      ping:     rnd(1, 12),
      services: [
        { name: 'nginx',         status: 'up'   },
        { name: 'portainer',     status: 'up'   },
        { name: 'jellyfin',      status: 'up'   },
        { name: 'nextcloud',     status: 'up'   },
        { name: 'homeassistant', status: 'warn' },
        { name: 'pihole',        status: 'up'   }
      ],
      diskUsed: 67,
      diskFree: 420.3,
      _source: 'mock'
    };
  }

  /* --- Glances /api/3/all normalization ---------------------------------- */
  function normalizeGlances(d) {
    d = d || {};

    var services = [];
    var containers = d.containers || d.docker || [];
    if (Array.isArray(containers)) {
      for (var i = 0; i < containers.length; i++) {
        var c = containers[i] || {};
        var rawName = c.name || (Array.isArray(c.Names) ? c.Names[0] : c.Names) || 'container';
        var name = String(rawName).replace(/^\//, '').slice(0, 14);
        var running = (c.status === 'running') ||
                      (typeof c.Status === 'string' && /up/i.test(c.Status));
        services.push({ name: name, status: running ? 'up' : 'down' });
      }
    }

    var sensors = d.sensors || [];
    var temp = (Array.isArray(sensors) && sensors.length) ? num(sensors[0].value) : 0;

    var net = d.network || {};
    var fs = (Array.isArray(d.fs) && d.fs.length) ? d.fs[0] : {};

    return {
      cpu:      Math.round(num(d.cpu && d.cpu.total)),
      ram:      Math.round(num(d.mem && d.mem.percent)),
      temp:     Math.round(temp),
      upload:   Math.round(num(net.tx_rate) / 1024),
      download: Math.round(num(net.rx_rate) / 1024),
      ping:     num(d.ping, 0),
      services: services,
      diskUsed: Math.round(num(fs.percent)),
      diskFree: Math.round(num(fs.free) / 1e9 * 10) / 10,
      _source:  'glances'
    };
  }

  /* --- dispatch ---------------------------------------------------------- */
  function dispatch(sourceId, data) {
    lastData[sourceId] = data;
    try {
      W.dispatchEvent(new CustomEvent('statsUpdate', {
        detail: { sourceId: sourceId, data: data }
      }));
    } catch (e) {}
  }

  function sources() { return (W.CONFIG && W.CONFIG.sources) || []; }
  function getSource(id) {
    var s = sources();
    for (var i = 0; i < s.length; i++) { if (s[i].id === id) { return s[i]; } }
    return null;
  }

  /* --- poll one source --------------------------------------------------- */
  function pollSource(src) {
    if (!src) { return; }
    var id = src.id;
    var url = (src.url || '').trim();
    if (!url) { dispatch(id, mock()); return; }

    fetch(url, {
      signal: timeoutSignal(3000),
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    })
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.json();
      })
      .then(function (json) {
        var data;
        try { data = (src.type === 'raw') ? json : normalizeGlances(json); }
        catch (e) { data = mock(); }
        dispatch(id, data);
      })
      .catch(function () { dispatch(id, mock()); });
  }

  function pollAll() {
    var s = sources();
    for (var i = 0; i < s.length; i++) { pollSource(s[i]); }
  }

  /* --- lifecycle --------------------------------------------------------- */
  function start() {
    stop();
    setTimeout(pollAll, 0);   // defer so card listeners (loaded later) are ready
    var interval = Math.max(1000, num(W.CONFIG && W.CONFIG.pollInterval, 5000));
    timer = setInterval(pollAll, interval);
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  W.WallpaperStats = {
    start: start,
    stop: stop,
    pollAll: pollAll,
    pollSource: function (id) { pollSource(getSource(id)); },
    getData: function (id) { return lastData[id]; }
  };

  start();
})();
