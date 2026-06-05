/* ============================================================================
 * cards.js — dynamic, draggable, resizable cards (all built in JS)
 * ----------------------------------------------------------------------------
 * Renders CONFIG.cards in order. Each card has a `type`:
 *   system | network | services | storage  -> live stats from card.source
 *   notes  -> local textarea (autosaved) + optional Nextcloud sync
 *   links  -> a list of link buttons
 *
 * Exposes: window.WallpaperCards = {
 *   render(), show(id), hide(id), resetPositions(), titleFor(cardCfg)
 * }
 * The panel mutates CONFIG.cards/.sources then calls render().
 * ========================================================================== */
(function () {
  'use strict';
  var W = window;
  var POS_KEY   = 'homelab-wallpaper-positions';
  var NOTES_KEY = 'homelab-wallpaper-notes';

  var cards = {};   // id -> { root, cfg, update(data) }
  var listenerBound = false;

  /* --- tiny helpers ------------------------------------------------------ */
  function el(tag, styles, props) {
    var e = document.createElement(tag);
    if (styles) { Object.assign(e.style, styles); }
    if (props) { Object.assign(e, props); }
    return e;
  }
  function fmt0(n) { n = Number(n); return isFinite(n) ? Math.round(n).toLocaleString() : '—'; }
  function fmt1(n) { n = Number(n); return isFinite(n) ? n.toFixed(1) : '—'; }
  function timeoutSignal(ms) {
    try { if (AbortSignal && AbortSignal.timeout) { return AbortSignal.timeout(ms); } } catch (e) {}
    return undefined;
  }
  function sourceName(id) {
    var s = (W.CONFIG && W.CONFIG.sources) || [];
    for (var i = 0; i < s.length; i++) { if (s[i].id === id) { return s[i].name || s[i].id; } }
    return id || '—';
  }
  function titleFor(cfg) {
    if (cfg.title) { return cfg.title; }
    var t = String(cfg.type || '').toUpperCase();
    if (cfg.source && (cfg.type === 'system' || cfg.type === 'network' ||
        cfg.type === 'services' || cfg.type === 'storage')) {
      return t + ' · ' + sourceName(cfg.source);
    }
    return t;
  }

  /* --- progress bar ------------------------------------------------------ */
  function makeBar() {
    var track = el('div', { height: '3px', borderRadius: '2px', background: 'rgba(0,200,100,0.1)',
      overflow: 'hidden', marginTop: '5px', width: '100%' });
    var fill = el('div', { height: '100%', width: '0%', borderRadius: '2px',
      background: 'linear-gradient(90deg,#00cc66,#00ff88)',
      transition: 'width 0.6s ease, background 0.3s ease' });
    track.appendChild(fill);
    track._fill = fill;
    return track;
  }
  function setBar(track, pct) {
    pct = Math.max(0, Math.min(100, Number(pct) || 0));
    var g = pct > 85 ? 'linear-gradient(90deg,#cc0033,#ff3b3b)'
          : pct > 70 ? 'linear-gradient(90deg,#cc6600,#ffaa00)'
          :            'linear-gradient(90deg,#00cc66,#00ff88)';
    track._fill.style.width = pct + '%';
    track._fill.style.background = g;
  }
  function makeRow(label) {
    var row = el('div', { margin: '7px 0' });
    var line = el('div', { display: 'flex', justifyContent: 'space-between',
      alignItems: 'baseline', gap: '10px' });
    var l = el('span', { fontSize: '10px', letterSpacing: '0.08em',
      color: 'rgba(0,255,136,0.45)' }, { textContent: label });
    var v = el('span', { fontSize: '12px', fontWeight: '700',
      color: 'rgba(0,255,136,0.92)', whiteSpace: 'nowrap' }, { textContent: '—' });
    line.appendChild(l); line.appendChild(v);
    row.appendChild(line);
    row._value = v;
    return row;
  }
  function serviceRow(svc) {
    var color = svc.status === 'up' ? '#00cc66' : svc.status === 'warn' ? '#cc6600' : '#cc0033';
    var row = el('div', { display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 0' });
    var dot = el('span', { width: '5px', height: '5px', borderRadius: '50%',
      background: color, boxShadow: '0 0 4px ' + color, flex: '0 0 auto' });
    var name = el('span', { fontSize: '11px', color: 'rgba(0,255,136,0.8)',
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      { textContent: svc.name });
    row.appendChild(dot); row.appendChild(name);
    return row;
  }

  /* --- type bodies (each returns an update(data) fn) --------------------- */
  function bodySystem(body) {
    var cpu = makeRow('CPU'), cpuBar = makeBar();
    var ram = makeRow('RAM'), ramBar = makeBar();
    var temp = makeRow('TEMP');
    body.append(cpu, cpuBar, ram, ramBar, temp);
    return function (d) {
      cpu._value.textContent  = fmt0(d.cpu) + '%';  setBar(cpuBar, d.cpu);
      ram._value.textContent  = fmt0(d.ram) + '%';  setBar(ramBar, d.ram);
      temp._value.textContent = fmt0(d.temp) + '°C';
    };
  }
  function bodyNetwork(body) {
    var up = makeRow('↑ UP'), down = makeRow('↓ DOWN'), ping = makeRow('PING');
    body.append(up, down, ping);
    return function (d) {
      up._value.textContent   = fmt0(d.upload) + ' KB/s';
      down._value.textContent = fmt0(d.download) + ' KB/s';
      ping._value.textContent = fmt0(d.ping) + ' ms';
    };
  }
  function bodyStorage(body) {
    var used = makeRow('USED'), usedBar = makeBar();
    var free = makeRow('FREE');
    body.append(used, usedBar, free);
    return function (d) {
      used._value.textContent = fmt0(d.diskUsed) + '%'; setBar(usedBar, d.diskUsed);
      free._value.textContent = fmt1(d.diskFree) + ' GB';
    };
  }
  function bodyServices(body, cfg) {
    var list = el('div', {});
    body.appendChild(list);
    return function (d) {
      list.textContent = '';
      var svcs = Array.isArray(d.services) ? d.services : [];
      if (cfg.filterMode === 'pick' && Array.isArray(cfg.filter)) {
        var set = {};
        for (var k = 0; k < cfg.filter.length; k++) { set[cfg.filter[k]] = true; }
        svcs = svcs.filter(function (s) { return set[s.name]; });
      }
      if (!svcs.length) {
        list.appendChild(el('div', { fontSize: '10px', color: 'rgba(0,255,136,0.3)' },
          { textContent: cfg.filterMode === 'pick' ? 'none selected' : 'no services' }));
        return;
      }
      for (var i = 0; i < svcs.length; i++) { list.appendChild(serviceRow(svcs[i])); }
    };
  }

  /* --- notes: local textarea (autosave) + optional Nextcloud sync -------- */
  function loadNotesMap() {
    try { return JSON.parse(localStorage.getItem(NOTES_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveNote(id, text) {
    var m = loadNotesMap(); m[id] = text;
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(m)); } catch (e) {}
  }
  function ncConfigured(nc) { return nc && nc.url && nc.user && nc.token && nc.noteId; }
  function ncUrl(nc) {
    return String(nc.url).replace(/\/+$/, '') +
      '/index.php/apps/notes/api/v1/notes/' + encodeURIComponent(nc.noteId);
  }
  function ncHeaders(nc) {
    return { 'Authorization': 'Basic ' + btoa(nc.user + ':' + nc.token),
      'Content-Type': 'application/json', 'OCS-APIRequest': 'true' };
  }
  function bodyNotes(body, cfg) {
    // remote = agent proxy (cfg.proxy) OR direct Nextcloud (cfg.nc). Proxy keeps
    // credentials server-side and avoids browser CORS. Local autosave always runs.
    var hasRemote = !!(cfg.proxy || ncConfigured(cfg.nc));
    var status = el('div', { fontSize: '8px', letterSpacing: '0.1em',
      color: 'rgba(0,255,136,0.3)', marginBottom: '4px', textTransform: 'uppercase' },
      { textContent: hasRemote ? 'nextcloud' : 'local' });
    var ta = el('textarea', {
      width: '100%', minHeight: '90px', resize: 'none', border: 'none', outline: 'none',
      background: 'rgba(0,0,0,0.25)', color: 'rgba(0,255,136,0.85)',
      fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', lineHeight: '1.5',
      padding: '8px', borderRadius: '6px', cursor: 'text', flex: '1 1 auto'
    });
    ta.setAttribute('spellcheck', 'false');
    ta.value = loadNotesMap()[cfg.id] || '';
    body.append(status, ta);

    var saveT = null, pushT = null;
    function setStatus(t) { status.textContent = t; }

    function remoteGet() {
      var url = cfg.proxy || ncUrl(cfg.nc);
      var opt = cfg.proxy ? { signal: timeoutSignal(5000), cache: 'no-store' }
                          : { headers: ncHeaders(cfg.nc), signal: timeoutSignal(4000) };
      return fetch(url, opt).then(function (r) {
        if (!r.ok) { throw new Error(r.status); } return r.json();
      });
    }
    function remotePut(content) {
      if (cfg.proxy) {
        return fetch(cfg.proxy, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content }), signal: timeoutSignal(5000) });
      }
      return fetch(ncUrl(cfg.nc), { method: 'PUT', headers: ncHeaders(cfg.nc),
        body: JSON.stringify({ content: content }), signal: timeoutSignal(4000) });
    }

    function ncPull() {
      setStatus('syncing…');
      remoteGet().then(function (j) {
        if (j && j._status) { setStatus('local · nc pending'); return; }   // not configured yet
        if (j && typeof j.content === 'string' && document.activeElement !== ta &&
            (j.content !== '' || ta.value === '')) {
          ta.value = j.content; saveNote(cfg.id, j.content);
        }
        setStatus('nextcloud ✓');
      }).catch(function () { setStatus('nextcloud offline'); });
    }
    function ncPush() {
      setStatus('saving…');
      remotePut(ta.value)
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (j) { setStatus(j && j._status ? 'local · nc pending' : 'nextcloud ✓'); })
        .catch(function () { setStatus('nextcloud offline'); });
    }

    ta.addEventListener('input', function () {
      if (saveT) { clearTimeout(saveT); }
      saveT = setTimeout(function () { saveNote(cfg.id, ta.value); }, 300);
      if (hasRemote) {
        if (pushT) { clearTimeout(pushT); }
        setStatus('editing…');
        pushT = setTimeout(ncPush, 1200);
      }
    });
    ta.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    ta.addEventListener('keydown', function (e) { e.stopPropagation(); });

    if (hasRemote) { ncPull(); }

    return function () {};   // notes ignore stats updates
  }

  /* --- links ------------------------------------------------------------- */
  function bodyLinks(body, cfg) {
    var links = Array.isArray(cfg.links) ? cfg.links : [];
    if (!links.length) {
      body.appendChild(el('div', { fontSize: '10px', color: 'rgba(0,255,136,0.3)' },
        { textContent: 'no links — add some in the panel' }));
    }
    for (var i = 0; i < links.length; i++) {
      (function (lk) {
        var a = el('a', {
          display: 'block', textDecoration: 'none', margin: '5px 0', padding: '6px 9px',
          borderRadius: '6px', border: '1px solid rgba(0,255,136,0.18)',
          background: 'rgba(0,255,136,0.05)', color: 'rgba(0,255,136,0.85)',
          fontSize: '11px', letterSpacing: '0.04em', cursor: 'pointer',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          transition: 'background 0.15s, border-color 0.15s'
        }, { textContent: '↗ ' + (lk.label || lk.url || 'link'),
             href: lk.url || '#', target: '_blank', rel: 'noopener', title: lk.url || '' });
        a.addEventListener('mouseenter', function () {
          a.style.background = 'rgba(0,255,136,0.13)';
          a.style.borderColor = 'rgba(0,255,136,0.4)';
        });
        a.addEventListener('mouseleave', function () {
          a.style.background = 'rgba(0,255,136,0.05)';
          a.style.borderColor = 'rgba(0,255,136,0.18)';
        });
        a.addEventListener('mousedown', function (e) { e.stopPropagation(); });
        body.appendChild(a);
      })(links[i]);
    }
    return function () {};
  }

  var BODIES = {
    system: bodySystem, network: bodyNetwork, storage: bodyStorage,
    services: bodyServices, notes: bodyNotes, links: bodyLinks
  };

  /* --- position persistence ---------------------------------------------- */
  function loadPositions() {
    try { return JSON.parse(localStorage.getItem(POS_KEY)) || {}; } catch (e) { return {}; }
  }
  function savePosition(id, root) {
    var pos = loadPositions();
    pos[id] = { left: parseInt(root.style.left, 10) || 0, top: parseInt(root.style.top, 10) || 0 };
    try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch (e) {}
  }
  function layoutRect() {
    var r = W.CONFIG && W.CONFIG.layout && W.CONFIG.layout.uiRect;
    if (!r) { return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight }; }
    return { x: r.x * window.innerWidth, y: r.y * window.innerHeight,
             w: r.w * window.innerWidth, h: r.h * window.innerHeight };
  }
  W.WallpaperLayout = { rect: layoutRect };

  function defaultPos(i) {
    var b = layoutRect();
    var col = Math.floor(i / 4), row = i % 4;
    return { left: Math.round(b.x) + 24 + col * 288, top: Math.round(b.y) + 24 + row * 190 };
  }
  function applyPosition(id, index, root) {
    var pos = loadPositions();
    if (pos[id]) {
      root.style.left = pos[id].left + 'px';
      root.style.top  = pos[id].top + 'px';
    } else {
      var d = defaultPos(index);
      root.style.left = d.left + 'px';
      root.style.top  = d.top + 'px';
    }
    root.style.right = 'auto'; root.style.bottom = 'auto';
  }

  /* --- dragging ---------------------------------------------------------- */
  function enableDrag(root, handle, id) {
    var dragging = false, offX = 0, offY = 0;
    handle.addEventListener('mousedown', function (e) {
      if (e.button !== 0) { return; }
      dragging = true; handle.style.cursor = 'grabbing';
      var r = root.getBoundingClientRect();
      root.style.left = r.left + 'px'; root.style.top = r.top + 'px';
      root.style.right = 'auto'; root.style.bottom = 'auto';
      offX = e.clientX - r.left; offY = e.clientY - r.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      if (!dragging) { return; }
      var w = root.offsetWidth, h = root.offsetHeight;
      var x = Math.max(0, Math.min(window.innerWidth - w, e.clientX - offX));
      var y = Math.max(0, Math.min(window.innerHeight - h, e.clientY - offY));
      root.style.left = x + 'px'; root.style.top = y + 'px';
    });
    document.addEventListener('mouseup', function () {
      if (!dragging) { return; }
      dragging = false; handle.style.cursor = 'grab';
      savePosition(id, root);
    });
  }

  /* --- build one card ---------------------------------------------------- */
  function buildCard(cfg, index) {
    var root = el('div', {
      position: 'fixed', zIndex: '10', background: 'rgba(0,15,10,0.75)',
      border: '1px solid rgba(0,255,136,0.15)', borderRadius: '10px',
      backdropFilter: 'blur(16px)', webkitBackdropFilter: 'blur(16px)',
      padding: '10px 14px', fontFamily: "'JetBrains Mono', monospace",
      minWidth: '150px', maxWidth: '640px', resize: 'both', overflow: 'hidden',
      transition: 'border-color 0.2s', display: 'flex', flexDirection: 'column',
      color: '#00ff88'
    });
    root.dataset.card = cfg.id;

    var header = el('div', { display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', cursor: 'grab', userSelect: 'none', marginBottom: '6px', gap: '10px' });
    var title = el('span', { fontSize: '9px', letterSpacing: '0.15em',
      textTransform: 'uppercase', color: 'rgba(0,255,136,0.4)', whiteSpace: 'nowrap',
      overflow: 'hidden', textOverflow: 'ellipsis' }, { textContent: '// ' + titleFor(cfg) });
    var close = el('div', { width: '14px', height: '14px', borderRadius: '50%',
      background: 'rgba(255,60,60,0.3)', cursor: 'pointer', flex: '0 0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '11px', lineHeight: '1', color: 'rgba(255,255,255,0.75)' },
      { textContent: '×', title: 'Hide card' });
    header.append(title, close);

    var body = el('div', { display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: '0' });
    root.append(header, body);
    // visible resize grip (the native resize handle still does the work underneath)
    root.appendChild(el('div', {
      position: 'absolute', right: '2px', bottom: '2px', width: '11px', height: '11px',
      pointerEvents: 'none',
      background: 'linear-gradient(135deg, transparent 44%, rgba(0,255,136,0.5) 44%, ' +
                 'rgba(0,255,136,0.5) 58%, transparent 58%, transparent 72%, ' +
                 'rgba(0,255,136,0.5) 72%, rgba(0,255,136,0.5) 86%, transparent 86%)'
    }));
    document.body.appendChild(root);

    root.addEventListener('mouseenter', function () { root.style.borderColor = 'rgba(0,255,136,0.4)'; });
    root.addEventListener('mouseleave', function () { root.style.borderColor = 'rgba(0,255,136,0.15)'; });
    close.addEventListener('click', function (e) {
      e.stopPropagation();
      cfg.show = false; api.hide(cfg.id);
      if (W.WallpaperPanel && W.WallpaperPanel.sync) { W.WallpaperPanel.sync(); }
      if (W.WallpaperPanel && W.WallpaperPanel.persist) { W.WallpaperPanel.persist(); }
    });

    enableDrag(root, header, cfg.id);
    applyPosition(cfg.id, index, root);

    var builder = BODIES[cfg.type] || bodyLinks;
    var update = builder(body, cfg);

    if (cfg.show === false) { root.style.display = 'none'; }

    cards[cfg.id] = { root: root, cfg: cfg, update: update };

    // populate immediately from cached data
    if (cfg.source && W.WallpaperStats) {
      var d = W.WallpaperStats.getData(cfg.source);
      if (d) { try { update(d); } catch (e) {} }
    }
  }

  /* --- public api -------------------------------------------------------- */
  var api = {
    render: function () {
      // tear down existing
      for (var id in cards) {
        if (cards.hasOwnProperty(id) && cards[id].root.parentNode) {
          cards[id].root.parentNode.removeChild(cards[id].root);
        }
      }
      cards = {};
      var list = (W.CONFIG && W.CONFIG.cards) || [];
      for (var i = 0; i < list.length; i++) { buildCard(list[i], i); }

      if (!listenerBound) {
        listenerBound = true;
        window.addEventListener('statsUpdate', function (e) {
          var det = (e && e.detail) || {};
          for (var cid in cards) {
            if (!cards.hasOwnProperty(cid)) { continue; }
            var c = cards[cid];
            if (c.cfg.source && c.cfg.source === det.sourceId) {
              try { c.update(det.data || {}); } catch (err) {}
            }
          }
        });
        window.addEventListener('resize', function () {
          for (var cid in cards) {
            if (!cards.hasOwnProperty(cid)) { continue; }
            var root = cards[cid].root;
            if (!root.style.left || root.style.left === 'auto') { continue; }
            var w = root.offsetWidth, h = root.offsetHeight;
            root.style.left = Math.max(0, Math.min(window.innerWidth - w, parseInt(root.style.left, 10) || 0)) + 'px';
            root.style.top  = Math.max(0, Math.min(window.innerHeight - h, parseInt(root.style.top, 10) || 0)) + 'px';
          }
        });
      }
    },
    show: function (id) { var c = cards[id]; if (c) { c.root.style.display = 'flex'; } },
    hide: function (id) { var c = cards[id]; if (c) { c.root.style.display = 'none'; } },
    resetPositions: function () {
      try { localStorage.removeItem(POS_KEY); } catch (e) {}
      var list = (W.CONFIG && W.CONFIG.cards) || [];
      for (var i = 0; i < list.length; i++) {
        var c = cards[list[i].id];
        if (c) { applyPosition(list[i].id, i, c.root); }
      }
    },
    titleFor: titleFor
  };
  W.WallpaperCards = api;

  api.render();
})();
