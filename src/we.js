/* ============================================================================
 * we.js — Wallpaper Engine Properties bridge
 * ----------------------------------------------------------------------------
 * Maps WE's native Properties panel (defined in project.json) onto window.CONFIG
 * and applies each change live. This is how you configure the wallpaper ON THE
 * DESKTOP (WE blocks keyboard input to wallpapers, so the in-page [C] panel is
 * really only for the browser preview).
 *
 * WE calls applyUserProperties() once on load and again whenever a property
 * changes — only the changed keys are present, so every field is optional.
 * ========================================================================== */
(function () {
  'use strict';
  var W = window;

  function hex(weColor) {
    var p = String(weColor).split(' ').map(Number);
    if (p.length < 3 || p.some(isNaN)) { return null; }
    function c(x) { return ('0' + Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16)).slice(-2); }
    return '#' + c(p[0]) + c(p[1]) + c(p[2]);
  }
  function setSourceUrl(id, url) {
    var s = (W.CONFIG && W.CONFIG.sources) || [];
    for (var i = 0; i < s.length; i++) { if (s[i].id === id) { s[i].url = url; return; } }
  }
  function setCardShow(id, show) {
    var c = (W.CONFIG && W.CONFIG.cards) || [];
    for (var i = 0; i < c.length; i++) { if (c[i].id === id) { c[i].show = show; } }
    if (W.WallpaperCards) { show ? W.WallpaperCards.show(id) : W.WallpaperCards.hide(id); }
  }

  var CARD_IDS = ['sys_home', 'net_home', 'svc_home', 'sto_home',
                  'sys_pc', 'net_pc', 'sto_pc', 'notes1', 'links1'];

  W.wallpaperPropertyListener = {
    applyUserProperties: function (props) {
      var C = W.CONFIG;
      if (!C || !props) { return; }
      var refreshParticles = false, restartStats = false;
      function val(k) { return (props[k] && props[k].value !== undefined) ? props[k].value : undefined; }
      var v, h;

      /* --- visual (rebuilds the particle field) --- */
      if ((v = val('color')) !== undefined) { h = hex(v); if (h) { C.color = h; refreshParticles = true; } }
      if ((v = val('bgcolor')) !== undefined) { h = hex(v); if (h) { C.backgroundColor = h; refreshParticles = true; } }
      if ((v = val('speed')) !== undefined) { C.speed = v; refreshParticles = true; }
      if ((v = val('nodecount')) !== undefined) { C.nodeCount = v; refreshParticles = true; }
      if ((v = val('maxdistance')) !== undefined) { C.maxDistance = v; refreshParticles = true; }
      if ((v = val('lineopacity')) !== undefined) { C.lineOpacity = v / 100; refreshParticles = true; }
      if ((v = val('nodesize')) !== undefined) { C.nodeSize = v; refreshParticles = true; }
      if ((v = val('fpscap')) !== undefined) { C.fpsCap = v; refreshParticles = true; }

      /* --- cursor physics (read live by the physics loop — no rebuild) --- */
      if ((v = val('mouserepel')) !== undefined) { C.mouseRepel = v; }
      if ((v = val('repeldistance')) !== undefined) { C.repelDistance = v; }
      if ((v = val('repelstrength')) !== undefined) { C.repelStrength = v; }

      /* --- clock + gear --- */
      if ((v = val('showclock')) !== undefined) {
        C.showClock = v;
        var ck = document.getElementById('clock');
        if (ck) { ck.style.display = v ? 'block' : 'none'; }
      }
      if ((v = val('clockpos')) !== undefined) {
        C.clockPosition = v;
        if (W.WallpaperClock && W.WallpaperClock.place) { W.WallpaperClock.place(); }
      }
      if ((v = val('showgear')) !== undefined) {
        if (W.WallpaperPanel && W.WallpaperPanel.setGearVisible) { W.WallpaperPanel.setGearVisible(v); }
      }

      /* --- data sources (empty URL is ignored so config.local.js wins) --- */
      if ((v = val('homelaburl')) !== undefined && String(v).trim()) { setSourceUrl('homelab', String(v).trim()); restartStats = true; }
      if ((v = val('thispcurl')) !== undefined && String(v).trim()) { setSourceUrl('thispc', String(v).trim()); restartStats = true; }
      if ((v = val('pollinterval')) !== undefined) { C.pollInterval = v * 1000; restartStats = true; }

      /* --- card visibility --- */
      for (var i = 0; i < CARD_IDS.length; i++) {
        var b = val('card_' + CARD_IDS[i]);
        if (b !== undefined) { setCardShow(CARD_IDS[i], b); }
      }

      if (refreshParticles && W.WallpaperParticles) { W.WallpaperParticles.refresh(); }
      if (restartStats && W.WallpaperStats) { W.WallpaperStats.stop(); W.WallpaperStats.start(); }
    },

    applyGeneralProperties: function (props) {
      if (props && typeof props.fps === 'number' && W.CONFIG) {
        W.CONFIG.fpsCap = props.fps;
        if (W.WallpaperParticles) { W.WallpaperParticles.refresh(); }
      }
    }
  };
})();
