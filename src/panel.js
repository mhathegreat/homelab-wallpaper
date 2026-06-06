/* ============================================================================
 * panel.js — live config + card builder ([C] / gear)
 * ----------------------------------------------------------------------------
 * Sections: Visual · Sources · Cards (full builder) · General.
 * Builder changes mutate CONFIG.sources / CONFIG.cards and autosave to
 * localStorage, so your dashboard layout persists. "Reset to defaults" clears
 * the saved config and reloads from config.js.
 *
 * Exposes: window.WallpaperPanel = { open, close, toggle, sync, persist }
 * ========================================================================== */
(function () {
  'use strict';
  var W = window;
  var CFG_KEY = 'homelab-wallpaper-config';
  var POS_KEY = 'homelab-wallpaper-positions';
  var NOTES_KEY = 'homelab-wallpaper-notes';
  var CONFIG = W.CONFIG;
  var syncers = [];
  var isOpen = false;

  /* --- helpers ----------------------------------------------------------- */
  function el(tag, styles, props) {
    var e = document.createElement(tag);
    if (styles) { Object.assign(e.style, styles); }
    if (props) { Object.assign(e, props); }
    return e;
  }
  function uid(p) { return p + '_' + Math.random().toString(36).slice(2, 7); }
  function normalizeHex(h) {
    h = String(h || '#00ff88').trim();
    if (h[0] !== '#') { h = '#' + h; }
    if (/^#[0-9a-fA-F]{3}$/.test(h)) { h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; }
    return /^#[0-9a-fA-F]{6}$/.test(h) ? h : '#00ff88';
  }

  /* --- effects + persistence -------------------------------------------- */
  var rt = null;
  function liveRefresh() {
    if (rt) { clearTimeout(rt); }
    rt = setTimeout(function () { if (W.WallpaperParticles) { W.WallpaperParticles.refresh(); } }, 120);
    persist();
  }
  function restartStats() {
    if (W.WallpaperStats) { W.WallpaperStats.stop(); W.WallpaperStats.start(); }
    persist();
  }
  var persistT = null;
  function persist() {
    if (persistT) { clearTimeout(persistT); }
    persistT = setTimeout(function () {
      try { localStorage.setItem(CFG_KEY, JSON.stringify(CONFIG)); } catch (e) {}
    }, 400);
  }

  /* --- injected CSS ------------------------------------------------------ */
  function injectStyles() {
    var css = [
      ".hp-panel ::-webkit-scrollbar{width:8px}",
      ".hp-panel ::-webkit-scrollbar-thumb{background:rgba(0,255,136,0.2);border-radius:4px}",
      ".hp-range{-webkit-appearance:none;appearance:none;width:100%;height:3px;background:rgba(0,255,136,0.18);border-radius:2px;outline:none;cursor:pointer}",
      ".hp-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:12px;height:12px;border-radius:50%;background:#00ff88;cursor:pointer;border:none;box-shadow:0 0 6px rgba(0,255,136,0.6)}",
      ".hp-range::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:#00ff88;cursor:pointer;border:none;box-shadow:0 0 6px rgba(0,255,136,0.6)}",
      ".hp-text,.hp-mini,.hp-sel{width:100%;background:rgba(0,255,136,0.05);border:1px solid rgba(0,255,136,0.2);color:#00ff88;font-family:inherit;font-size:11px;padding:7px 8px;border-radius:6px;outline:none}",
      ".hp-text{cursor:text}.hp-mini{cursor:text}.hp-sel{cursor:pointer}",
      ".hp-text:focus,.hp-mini:focus,.hp-sel:focus{border-color:rgba(0,255,136,0.5)}",
      ".hp-sel option{background:#001a12;color:#00ff88}",
      ".hp-color{-webkit-appearance:none;appearance:none;width:38px;height:22px;border:1px solid rgba(0,255,136,0.25);border-radius:5px;background:none;cursor:pointer;padding:0}",
      ".hp-color::-webkit-color-swatch-wrapper{padding:2px}.hp-color::-webkit-color-swatch{border:none;border-radius:3px}",
      ".hp-btn{width:100%;background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.3);color:#00ff88;font-family:inherit;font-size:11px;letter-spacing:0.1em;padding:10px;border-radius:6px;cursor:pointer;text-transform:uppercase;transition:background .2s,border-color .2s}",
      ".hp-btn:hover{background:rgba(0,255,136,0.16);border-color:rgba(0,255,136,0.5)}",
      ".hp-btn.danger{border-color:rgba(255,80,80,0.4);color:#ff8080}",
      ".hp-btn.danger:hover{background:rgba(255,80,80,0.12)}",
      ".hp-toggle{width:32px;height:16px;border-radius:8px;background:rgba(0,255,136,0.12);position:relative;cursor:pointer;transition:background .2s;flex:0 0 auto;border:1px solid rgba(0,255,136,0.2)}",
      ".hp-toggle.on{background:rgba(0,255,136,0.55)}",
      ".hp-toggle .knob{position:absolute;top:1px;left:1px;width:12px;height:12px;border-radius:50%;background:#00482e;transition:left .2s,background .2s}",
      ".hp-toggle.on .knob{left:18px;background:#00ff88;box-shadow:0 0 6px rgba(0,255,136,0.7)}",
      ".hp-ico{width:22px;height:22px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(0,255,136,0.2);border-radius:5px;background:rgba(0,255,136,0.05);color:rgba(0,255,136,0.7);cursor:pointer;font-size:11px;flex:0 0 auto;user-select:none}",
      ".hp-ico:hover{background:rgba(0,255,136,0.14)}",
      ".hp-ico.x:hover{background:rgba(255,80,80,0.18);border-color:rgba(255,80,80,0.4);color:#ff8080}",
      ".hp-row{border:1px solid rgba(0,255,136,0.12);border-radius:8px;padding:8px;margin:8px 0;background:rgba(0,255,136,0.02)}",
      ".hp-chip{font-size:8px;letter-spacing:0.1em;text-transform:uppercase;padding:2px 5px;border-radius:4px;background:rgba(0,255,136,0.12);color:rgba(0,255,136,0.7);flex:0 0 auto}",
      ".hp-svc{display:flex;align-items:center;gap:7px;font-size:10px;color:rgba(0,255,136,0.7);margin:4px 0;cursor:pointer}",
      ".hp-svc input{accent-color:#00ff88}",
      ".hp-hint{font-size:9px;color:rgba(0,255,136,0.3);margin-top:4px;line-height:1.4}"
    ].join('');
    document.head.appendChild(el('style', {}, { textContent: css }));
  }

  /* --- control factories ------------------------------------------------- */
  function section(name) {
    return el('div', { fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase',
      color: 'rgba(0,255,136,0.3)', borderTop: '1px solid rgba(0,255,136,0.12)',
      paddingTop: '14px', marginTop: '18px', marginBottom: '4px' }, { textContent: '// ' + name });
  }
  function rowLabel(t) {
    return el('span', { fontSize: '10px', color: 'rgba(0,255,136,0.55)', letterSpacing: '0.05em' },
      { textContent: t });
  }
  function controlRow(label, control) {
    var row = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      margin: '11px 0', gap: '12px' });
    row.append(rowLabel(label), control);
    return row;
  }
  function makeSlider(o) {
    var wrap = el('div', { margin: '12px 0' });
    var head = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' });
    var val = el('span', { fontSize: '10px', color: 'rgba(0,255,136,0.9)', fontWeight: '700' });
    head.append(rowLabel(o.label), val);
    var input = el('input', {}, { type: 'range', className: 'hp-range',
      min: String(o.min), max: String(o.max), step: String(o.step) });
    var fmt = o.format || function (v) { return String(v); };
    function show() { val.textContent = fmt(parseFloat(input.value)); }
    input.addEventListener('input', function () { show(); if (o.onInput) { o.onInput(parseFloat(input.value)); } });
    if (o.onChange) { input.addEventListener('change', function () { o.onChange(parseFloat(input.value)); }); }
    wrap.append(head, input);
    wrap._set = function (v) { input.value = String(v); show(); };
    return wrap;
  }
  function makeColor(value, onInput) {
    var c = el('input', {}, { type: 'color', className: 'hp-color', value: normalizeHex(value) });
    c.addEventListener('input', function () { onInput(c.value); });
    c._set = function (v) { c.value = normalizeHex(v); };
    return c;
  }
  function makeToggle(value, onChange) {
    var t = el('div', {}); t.className = 'hp-toggle' + (value ? ' on' : '');
    t.appendChild(el('div', {}, { className: 'knob' }));
    t.addEventListener('click', function () {
      var nv = !t.classList.contains('on'); t.classList.toggle('on', nv); onChange(nv);
    });
    t._set = function (v) { t.classList.toggle('on', !!v); };
    return t;
  }
  function makeText(value, placeholder, onInput, onChange) {
    var i = el('input', {}, { type: 'text', className: 'hp-mini', value: value || '' });
    i.setAttribute('spellcheck', 'false');
    if (placeholder) { i.placeholder = placeholder; }
    if (onInput) { i.addEventListener('input', function () { onInput(i.value); }); }
    if (onChange) { i.addEventListener('change', function () { onChange(i.value); }); }
    return i;
  }
  function makeSelect(options, value, onChange) {
    var s = el('select', {}, { className: 'hp-sel' });
    var found = false;
    for (var i = 0; i < options.length; i++) {
      var o = el('option', {}, { value: options[i].value, textContent: options[i].label });
      if (options[i].value === value) { o.selected = true; found = true; }
      s.appendChild(o);
    }
    if (!found && value) {
      var miss = el('option', {}, { value: value, textContent: value + ' (missing)' });
      miss.selected = true; s.appendChild(miss);
    }
    s.addEventListener('change', function () { onChange(s.value); });
    return s;
  }

  /* --- panel + gear shell ------------------------------------------------ */
  var panel = el('div', { position: 'fixed', top: '0', right: '0', width: '310px', height: '100vh',
    background: 'rgba(0,12,8,0.96)', borderLeft: '1px solid rgba(0,255,136,0.2)',
    backdropFilter: 'blur(20px)', webkitBackdropFilter: 'blur(20px)',
    transform: 'translateX(100%)', transition: 'transform 0.25s ease', overflowY: 'auto',
    zIndex: '50', padding: '24px 20px', fontFamily: "'JetBrains Mono', monospace",
    color: '#00ff88', cursor: 'auto' });
  panel.className = 'hp-panel';

  var gear = el('div', { position: 'fixed', right: '18px', bottom: '16px', zIndex: '40',
    width: '30px', height: '30px', opacity: '0.45', cursor: 'pointer', transition: 'opacity 0.2s', lineHeight: '0' });
  gear.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#00ff88" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  gear.addEventListener('mouseenter', function () { gear.style.opacity = '0.95'; });
  gear.addEventListener('mouseleave', function () { gear.style.opacity = '0.45'; });
  gear.addEventListener('click', toggle);

  var sourcesBox = el('div', {});
  var cardsBox = el('div', {});

  /* --- SOURCES builder --------------------------------------------------- */
  function sourceOptions() {
    return (CONFIG.sources || []).map(function (s) { return { value: s.id, label: s.name || s.id }; });
  }
  function buildSources() {
    sourcesBox.textContent = '';
    var S = CONFIG.sources || (CONFIG.sources = []);
    S.forEach(function (src, i) {
      var row = el('div', {}, { className: 'hp-row' });
      var top = el('div', { display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' });
      var name = makeText(src.name, 'NAME',
        function (v) { src.name = v; persist(); },
        function () { if (W.WallpaperCards) { W.WallpaperCards.render(); } rebuildCards(); });
      name.style.flex = '1 1 auto';
      var del = el('div', {}, { className: 'hp-ico x', textContent: '×', title: 'Delete source' });
      del.addEventListener('click', function () { S.splice(i, 1); sourcesChanged(); });
      top.append(name, del);
      var url = makeText(src.url, 'http://ip:61208/api/3/all',
        function (v) { src.url = v.trim(); persist(); },
        function () { restartStats(); });
      row.append(top, url);
      sourcesBox.appendChild(row);
    });
    var add = el('button', { marginTop: '4px' }, { className: 'hp-btn', type: 'button', textContent: '+ Add source' });
    add.addEventListener('click', function () {
      (CONFIG.sources = CONFIG.sources || []).push({ id: uid('src'), name: 'NEW', url: '' });
      sourcesChanged();
    });
    sourcesBox.appendChild(add);
  }
  function sourcesChanged() {
    buildSources();
    if (W.WallpaperCards) { W.WallpaperCards.render(); }
    rebuildCards();
    restartStats();
  }

  /* --- CARDS builder ----------------------------------------------------- */
  var CARD_TYPES = ['system', 'network', 'services', 'storage', 'notes', 'links'];
  function firstSource() { return (CONFIG.sources && CONFIG.sources[0] && CONFIG.sources[0].id) || ''; }
  function defaultCard(type) {
    if (type === 'services') { return { id: uid('svc'), type: 'services', source: firstSource(), show: true, filterMode: 'all', filter: [] }; }
    if (type === 'notes')    { return { id: uid('notes'), type: 'notes', show: true, nc: { url: '', user: '', token: '', noteId: '' } }; }
    if (type === 'links')    { return { id: uid('links'), type: 'links', show: true, links: [] }; }
    return { id: uid(type.slice(0, 3)), type: type, source: firstSource(), show: true };
  }
  function removePosition(id) {
    try { var p = JSON.parse(localStorage.getItem(POS_KEY)) || {}; delete p[id]; localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch (e) {}
  }
  function structural() {
    if (W.WallpaperCards) { W.WallpaperCards.render(); }
    rebuildCards();
    persist();
  }
  function needsSource(t) { return t === 'system' || t === 'network' || t === 'services' || t === 'storage'; }

  function cardSettings(cfg) {
    var box = el('div', { marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,255,136,0.1)' });

    if (needsSource(cfg.type)) {
      box.appendChild(controlRow('Source', makeSelect(sourceOptions(), cfg.source, function (v) {
        cfg.source = v; structural(); if (W.WallpaperStats) { W.WallpaperStats.pollSource(v); }
      })));
    }

    if (cfg.type === 'services') {
      var modeRow = controlRow('Show', makeSelect(
        [{ value: 'all', label: 'All services' }, { value: 'pick', label: 'Only selected' }],
        cfg.filterMode || 'all', function (v) { cfg.filterMode = v; structural(); }));
      box.appendChild(modeRow);
      if ((cfg.filterMode || 'all') === 'pick') {
        var names = [];
        var d = W.WallpaperStats && W.WallpaperStats.getData(cfg.source);
        if (d && Array.isArray(d.services)) { names = d.services.map(function (s) { return s.name; }); }
        cfg.filter = Array.isArray(cfg.filter) ? cfg.filter : [];
        // include already-picked names that aren't in current data
        cfg.filter.forEach(function (n) { if (names.indexOf(n) < 0) { names.push(n); } });
        if (!names.length) {
          box.appendChild(el('div', {}, { className: 'hp-hint', textContent: 'No services seen yet — they appear here once the source responds.' }));
        }
        names.forEach(function (n) {
          var lab = el('label', {}, { className: 'hp-svc' });
          var cb = el('input', {}, { type: 'checkbox', checked: cfg.filter.indexOf(n) >= 0 });
          cb.addEventListener('change', function () {
            var idx = cfg.filter.indexOf(n);
            if (cb.checked && idx < 0) { cfg.filter.push(n); }
            else if (!cb.checked && idx >= 0) { cfg.filter.splice(idx, 1); }
            if (W.WallpaperCards) { W.WallpaperCards.render(); } persist();
          });
          lab.append(cb, el('span', {}, { textContent: n }));
          box.appendChild(lab);
        });
      }
    }

    if (cfg.type === 'links') {
      cfg.links = Array.isArray(cfg.links) ? cfg.links : [];
      cfg.links.forEach(function (lk, li) {
        var lr = el('div', { display: 'flex', gap: '6px', alignItems: 'center', margin: '5px 0' });
        var lab = makeText(lk.label, 'label', function (v) { lk.label = v; persist(); }, function () { structural(); });
        lab.style.flex = '0 0 86px';
        var u = makeText(lk.url, 'https://…', function (v) { lk.url = v; persist(); }, function () { structural(); });
        u.style.flex = '1 1 auto';
        var del = el('div', {}, { className: 'hp-ico x', textContent: '×', title: 'Remove link' });
        del.addEventListener('click', function () { cfg.links.splice(li, 1); structural(); });
        lr.append(lab, u, del);
        box.appendChild(lr);
      });
      var addL = el('button', { marginTop: '4px' }, { className: 'hp-btn', type: 'button', textContent: '+ Add link' });
      addL.addEventListener('click', function () { cfg.links.push({ label: '', url: '' }); structural(); });
      box.appendChild(addL);
    }

    if (cfg.type === 'notes') {
      cfg.nc = cfg.nc || { url: '', user: '', token: '', noteId: '' };
      box.appendChild(el('div', {}, { className: 'hp-hint', textContent: 'Optional Nextcloud sync — leave blank for a local-only note. Use a Nextcloud app password as the token; the server must allow CORS.' }));
      var f = [['url', 'Nextcloud URL (https://cloud.example.com)'], ['user', 'Username'],
               ['token', 'App password / token'], ['noteId', 'Note ID (number)']];
      f.forEach(function (pair) {
        var inp = makeText(cfg.nc[pair[0]], pair[1],
          function (v) { cfg.nc[pair[0]] = v.trim(); persist(); },
          function () { structural(); });
        inp.style.margin = '5px 0';
        box.appendChild(inp);
      });
    }

    // title override (all types)
    var t = makeText(cfg.title || '', 'Custom title (optional)',
      function (v) { cfg.title = v; persist(); }, function () { structural(); });
    t.style.margin = '8px 0 2px';
    box.appendChild(t);

    return box;
  }

  function cardAdminRow(cfg, i, list) {
    var row = el('div', {}, { className: 'hp-row' });
    var top = el('div', { display: 'flex', alignItems: 'center', gap: '6px' });

    var ups = el('div', { display: 'flex', flexDirection: 'column', gap: '2px' });
    var up = el('div', {}, { className: 'hp-ico', textContent: '▲', title: 'Move up' });
    var dn = el('div', {}, { className: 'hp-ico', textContent: '▼', title: 'Move down' });
    up.style.height = '14px'; dn.style.height = '14px'; up.style.fontSize = '8px'; dn.style.fontSize = '8px';
    up.addEventListener('click', function () { if (i > 0) { var t = list[i]; list[i] = list[i - 1]; list[i - 1] = t; structural(); } });
    dn.addEventListener('click', function () { if (i < list.length - 1) { var t = list[i]; list[i] = list[i + 1]; list[i + 1] = t; structural(); } });
    ups.append(up, dn);

    var chip = el('span', {}, { className: 'hp-chip', textContent: cfg.type });
    var name = el('span', { fontSize: '10px', color: 'rgba(0,255,136,0.85)', flex: '1 1 auto',
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      { textContent: (W.WallpaperCards ? W.WallpaperCards.titleFor(cfg) : cfg.type) });

    var tog = makeToggle(cfg.show !== false, function (v) {
      cfg.show = v;
      if (W.WallpaperCards) { v ? W.WallpaperCards.show(cfg.id) : W.WallpaperCards.hide(cfg.id); }
      persist();
    });
    var cog = el('div', {}, { className: 'hp-ico', textContent: '⚙', title: 'Settings' });
    var del = el('div', {}, { className: 'hp-ico x', textContent: '×', title: 'Delete card' });
    del.addEventListener('click', function () { list.splice(i, 1); removePosition(cfg.id); structural(); });

    top.append(ups, chip, name, tog, cog, del);
    row.appendChild(top);

    var settings = cardSettings(cfg);
    settings.style.display = cfg._open ? 'block' : 'none';
    cog.addEventListener('click', function () {
      cfg._open = !cfg._open;
      settings.style.display = cfg._open ? 'block' : 'none';
    });
    row.appendChild(settings);
    return row;
  }

  function buildCards() {
    cardsBox.textContent = '';
    var list = CONFIG.cards || (CONFIG.cards = []);
    list.forEach(function (cfg, i) { cardsBox.appendChild(cardAdminRow(cfg, i, list)); });

    var addWrap = el('div', { marginTop: '8px' });
    addWrap.appendChild(el('div', {}, { className: 'hp-hint', textContent: 'Add a card:' }));
    var grid = el('div', { display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' });
    CARD_TYPES.forEach(function (t) {
      var b = el('button', { flex: '1 1 30%', padding: '7px 4px' }, { className: 'hp-btn', type: 'button', textContent: t });
      b.addEventListener('click', function () { (CONFIG.cards = CONFIG.cards || []).push(defaultCard(t)); structural(); });
      grid.appendChild(b);
    });
    addWrap.appendChild(grid);
    cardsBox.appendChild(addWrap);
  }
  function rebuildCards() { buildCards(); }

  /* --- build whole panel ------------------------------------------------- */
  function buildPanel() {
    var top = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
    top.appendChild(el('div', { fontSize: '13px', fontWeight: '700', letterSpacing: '0.1em', color: 'rgba(0,255,136,0.9)' }, { textContent: 'HOMELAB ///' }));
    var x = el('div', { cursor: 'pointer', fontSize: '18px', color: 'rgba(0,255,136,0.5)', lineHeight: '1', padding: '0 4px' }, { textContent: '×', title: 'Close (C)' });
    x.addEventListener('click', close);
    top.append(x);
    panel.appendChild(top);

    /* // VISUAL */
    panel.appendChild(section('VISUAL'));
    var cNode = makeColor(CONFIG.color, function (v) { CONFIG.color = v; liveRefresh(); });
    syncers.push(function () { cNode._set(CONFIG.color); });
    panel.appendChild(controlRow('Node color', cNode));
    var cBg = makeColor(CONFIG.backgroundColor, function (v) { CONFIG.backgroundColor = v; liveRefresh(); });
    syncers.push(function () { cBg._set(CONFIG.backgroundColor); });
    panel.appendChild(controlRow('Background', cBg));

    function vSlider(label, key, min, max, step, fmt, map, unmap) {
      var s = makeSlider({ label: label, min: min, max: max, step: step, format: fmt,
        onInput: function (v) { CONFIG[key] = unmap ? unmap(v) : v; liveRefresh(); } });
      syncers.push(function () { s._set(map ? map(CONFIG[key]) : CONFIG[key]); });
      panel.appendChild(s);
    }
    vSlider('Speed', 'speed', 0.1, 2.0, 0.1, function (v) { return v.toFixed(1); });
    vSlider('Node count', 'nodeCount', 20, 150, 5);
    vSlider('Max distance', 'maxDistance', 80, 250, 10, function (v) { return v + 'px'; });
    vSlider('Line opacity', 'lineOpacity', 0, 40, 1, function (v) { return (v / 100).toFixed(2); },
      function (cv) { return Math.round((cv || 0) * 100); }, function (v) { return v / 100; });
    vSlider('Node size', 'nodeSize', 1, 4, 0.5, function (v) { return v.toFixed(1) + 'px'; });
    vSlider('FPS cap', 'fpsCap', 10, 60, 5, function (v) { return v + ' fps'; });
    var tRepel = makeToggle(CONFIG.mouseRepel !== false, function (v) { CONFIG.mouseRepel = v; persist(); });
    syncers.push(function () { tRepel._set(CONFIG.mouseRepel !== false); });
    panel.appendChild(controlRow('Mouse repel', tRepel));
    vSlider('Cursor distance', 'repelDistance', 20, 200, 5, function (v) { return v + 'px'; });
    vSlider('Push strength', 'repelStrength', 20, 200, 5);

    /* // SOURCES */
    panel.appendChild(section('SOURCES'));
    panel.appendChild(el('div', {}, { className: 'hp-hint', textContent: 'Empty URL = mock data. For THIS PC, run Glances on Windows and use http://localhost:61208/api/3/all' }));
    panel.appendChild(sourcesBox);
    var sPoll = makeSlider({ label: 'Poll interval', min: 2, max: 30, step: 1,
      format: function (v) { return v + 's'; },
      onInput: function (v) { CONFIG.pollInterval = v * 1000; }, onChange: function () { restartStats(); } });
    sPoll.style.marginTop = '14px';
    syncers.push(function () { sPoll._set(Math.round((CONFIG.pollInterval || 5000) / 1000)); });
    panel.appendChild(sPoll);

    /* // CARDS */
    panel.appendChild(section('CARDS'));
    panel.appendChild(cardsBox);

    /* // GENERAL */
    panel.appendChild(section('GENERAL'));
    var tClock = makeToggle(CONFIG.showClock !== false, function (v) {
      CONFIG.showClock = v;
      var clock = document.getElementById('clock');
      if (clock) { clock.style.display = v ? 'block' : 'none'; }
      persist();
    });
    syncers.push(function () { tClock._set(CONFIG.showClock !== false); });
    panel.appendChild(controlRow('Clock', tClock));

    var saveBtn = el('button', { marginTop: '20px' }, { className: 'hp-btn', type: 'button', textContent: 'Save config' });
    saveBtn.addEventListener('click', function () {
      try { localStorage.setItem(CFG_KEY, JSON.stringify(CONFIG)); } catch (e) {}
      var prev = saveBtn.textContent; saveBtn.textContent = '// SAVED ' + String.fromCharCode(0x2713);
      setTimeout(function () { saveBtn.textContent = prev; }, 1200);
    });
    panel.appendChild(saveBtn);

    var resetPos = el('button', { marginTop: '10px' }, { className: 'hp-btn', type: 'button', textContent: 'Reset card positions' });
    resetPos.addEventListener('click', function () { if (W.WallpaperCards) { W.WallpaperCards.resetPositions(); } });
    panel.appendChild(resetPos);

    var resetAll = el('button', { marginTop: '10px' }, { className: 'hp-btn danger', type: 'button', textContent: 'Reset to defaults' });
    var armed = false;
    resetAll.addEventListener('click', function () {
      if (!armed) { armed = true; resetAll.textContent = 'Click again to wipe saved config'; setTimeout(function () { armed = false; resetAll.textContent = 'Reset to defaults'; }, 3000); return; }
      try { localStorage.removeItem(CFG_KEY); localStorage.removeItem(POS_KEY); localStorage.removeItem(NOTES_KEY); } catch (e) {}
      location.reload();
    });
    panel.appendChild(resetAll);

    panel.appendChild(el('div', { fontSize: '9px', color: 'rgba(0,255,136,0.25)', marginTop: '16px', lineHeight: '1.6', textAlign: 'center' },
      { textContent: 'press C to toggle · drag card headers · resize from corner' }));
  }

  /* --- open / close / sync ---------------------------------------------- */
  function open() { isOpen = true; panel.style.transform = 'translateX(0)'; }
  function close() { isOpen = false; panel.style.transform = 'translateX(100%)'; }
  function toggle() { isOpen ? close() : open(); }
  function sync() {
    for (var i = 0; i < syncers.length; i++) { syncers[i](); }
    buildSources();
    buildCards();
  }
  function applyDisplayState() {
    var clock = document.getElementById('clock');
    if (clock) { clock.style.display = CONFIG.showClock === false ? 'none' : 'block'; }
  }
  function bindKeys() {
    document.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) {
        if (e.key === 'Escape') { t.blur(); }
        return;
      }
      if (e.key === 'c' || e.key === 'C') { toggle(); }
      else if (e.key === 'Escape') { close(); }
    });
  }

  /* --- init -------------------------------------------------------------- */
  function positionChrome() {
    var u = W.CONFIG && W.CONFIG.layout && W.CONFIG.layout.uiRect;
    if (!u) {
      gear.style.right = '18px'; gear.style.bottom = '16px';
      panel.style.top = '0'; panel.style.height = '100vh'; panel.style.right = '0';
      return;
    }
    var rg = (1 - (u.x + u.w)) * 100, bg = (1 - (u.y + u.h)) * 100;
    gear.style.right = 'calc(' + rg + '% + 18px)';
    gear.style.bottom = 'calc(' + bg + '% + 16px)';
    panel.style.top = (u.y * 100) + '%';
    panel.style.height = (u.h * 100) + '%';
    panel.style.right = rg + '%';
  }

  function init() {
    injectStyles();
    try {
      var raw = localStorage.getItem(CFG_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        if (saved && Array.isArray(saved.cards)) { Object.assign(CONFIG, saved); }  // new schema only
      }
    } catch (e) {}

    buildPanel();
    document.body.appendChild(panel);
    document.body.appendChild(gear);
    positionChrome();
    window.addEventListener('resize', positionChrome);
    bindKeys();

    sync();
    applyDisplayState();

    if (W.WallpaperParticles) { W.WallpaperParticles.refresh(); }
    if (W.WallpaperCards) { W.WallpaperCards.render(); }
    if (W.WallpaperStats) { W.WallpaperStats.start(); }

    W.WallpaperPanel = { open: open, close: close, toggle: toggle, sync: sync, persist: persist,
      setGearVisible: function (v) { gear.style.display = v ? 'block' : 'none'; } };
  }

  init();
})();
