/* ============================================================================
 * particles.js — node-network background (tsParticles)
 * ----------------------------------------------------------------------------
 * Reproduces the Vanta.js NET aesthetic (slow-drifting nodes joined by thin,
 * distance-faded lines on pure black) using tsParticles — which, unlike Vanta
 * NET, exposes an FPS cap, per-property live config and pause-on-hidden, all
 * required by the [C] config panel.
 *
 * Exposes: window.WallpaperParticles = { refresh() }
 *   refresh() destroys the current instance and rebuilds it from window.CONFIG.
 *   panel.js calls it whenever a visual setting changes.
 * ========================================================================== */
(function () {
  'use strict';
  var W = window;
  var container = null;

  /* --- clamps (defensive against bad config / panel values) -------------- */
  function clampI(v, lo, hi, d) {
    v = Number(v); if (!isFinite(v)) v = d;
    return Math.max(lo, Math.min(hi, Math.round(v)));
  }
  function clampF(v, lo, hi, d) {
    v = Number(v); if (!isFinite(v)) v = d;
    return Math.max(lo, Math.min(hi, v));
  }

  /* --- build a tsParticles options object from CONFIG -------------------- */
  function options() {
    var C = W.CONFIG || {};
    var color = C.color || '#00ff88';

    return {
      fpsLimit: clampI(C.fpsCap, 10, 60, 30),
      fullScreen: { enable: false },     // we render into #bg ourselves
      detectRetina: true,
      pauseOnBlur: true,                 // pause when WE/window loses focus
      pauseOnOutsideViewport: true,
      background: { color: { value: C.backgroundColor || '#000000' } },

      particles: {
        number: {
          value: clampI(C.nodeCount, 1, 400, 60),
          density: { enable: true, area: 1000 }
        },
        color: { value: color },
        shape: { type: 'circle' },
        opacity: { value: 0.6 },                         // nodes ~60%
        size: { value: clampF(C.nodeSize, 0.5, 8, 2) },  // ~2px radius
        links: {
          enable: true,
          distance: clampI(C.maxDistance, 20, 400, 140),
          color: color,
          opacity: clampF(C.lineOpacity, 0, 1, 0.2),     // lines ~20%
          width: 1
        },
        move: {
          enable: true,
          speed: clampF(C.speed, 0.05, 5, 0.3),          // very slow drift
          direction: 'none',
          random: true,
          straight: false,
          outModes: { default: 'bounce' }
        }
      },

      interactivity: {
        detectsOn: 'window',
        events: {
          // Cursor interaction is handled by the custom momentum physics
          // below (velocity impulse + friction), not the built-in repulse.
          onHover: { enable: false },
          onClick: { enable: false },
          resize: true
        }
      }
    };
  }

  /* --- (re)initialize ---------------------------------------------------- */
  function refresh() {
    if (!W.tsParticles) { return; }
    try {
      if (container) { container.destroy(); container = null; }
      W.tsParticles.load('bg', options()).then(function (c) {
        container = c;
      });
      document.body.style.background =
        (W.CONFIG && W.CONFIG.backgroundColor) || '#000000';
    } catch (e) {
      /* never throw to UI */
    }
  }

  W.WallpaperParticles = {
    refresh: refresh,
    get container() { return container; }
  };

  /* --- custom cursor "momentum" physics --------------------------------- *
   * Event-driven, so it reacts to every cursor move (no dwell needed):
   * on mousemove, nodes within CONFIG.repelDistance get an INSTANT nudge away
   * from the pointer (responsive, like a shove) plus a velocity kick
   * (momentum). A per-frame friction pass then bleeds each node's *excess*
   * speed so it coasts and settles back into its ambient drift. CONFIG is read
   * live, so the panel's Mouse repel / Cursor distance / Push strength
   * controls take effect instantly with no particle rebuild.              */
  var baseSpeed = new WeakMap();

  function canvasScale() {
    var el = container && container.canvas && container.canvas.element;
    return {
      x: el && el.clientWidth ? el.width / el.clientWidth : 1,
      y: el && el.clientHeight ? el.height / el.clientHeight : 1
    };
  }
  function nodesArray() {
    var ps = container && container.particles;
    return ps && (ps.array || ps._array);
  }

  window.addEventListener('mousemove', function (e) {
    if (!container) { return; }
    var C = W.CONFIG || {};
    if (C.mouseRepel === false) { return; }
    var arr = nodesArray();
    if (!arr || !arr.length) { return; }

    var s = canvasScale();
    var mx = e.clientX * s.x, my = e.clientY * s.y;
    var R = clampI(C.repelDistance, 20, 200, 50), R2 = R * R;
    var force = clampF(C.repelStrength, 1, 400, 120) / 120;   // ~1 at default

    for (var i = 0; i < arr.length; i++) {
      var p = arr[i];
      var dx = p.position.x - mx, dy = p.position.y - my;
      var d2 = dx * dx + dy * dy;
      if (d2 < R2 && d2 > 0.01) {
        var d = Math.sqrt(d2);
        var fall = 1 - d / R;               // 1 at cursor -> 0 at the edge
        var ux = dx / d, uy = dy / d;
        var disp = fall * 16 * force;       // instant shove (always visible)
        p.position.x += ux * disp;
        p.position.y += uy * disp;
        var kick = fall * 0.25 * force;     // momentum -> coasts, then settles
        p.velocity.x += ux * kick;
        p.velocity.y += uy * kick;
      }
    }
  }, { passive: true });

  // per-frame friction: bleed each node's *excess* speed back toward baseline
  function physicsStep() {
    requestAnimationFrame(physicsStep);
    var arr = nodesArray();
    if (!arr || !arr.length) { return; }

    var DECAY = 0.90;   // keep 90% of the excess each frame -> coast + settle
    var FLOOR = 0.02;   // baseline drift never reaches zero
    var MAXV = 6;       // absolute speed cap so a fast sweep never flings wildly

    for (var i = 0; i < arr.length; i++) {
      var p = arr[i], v = p.velocity;
      var base = baseSpeed.get(p);
      if (base == null) { base = Math.max(FLOOR, Math.hypot(v.x, v.y)); baseSpeed.set(p, base); }
      var sp = Math.hypot(v.x, v.y);
      if (sp > 1e-5) {
        if (sp > MAXV) { var fc = MAXV / sp; v.x *= fc; v.y *= fc; sp = MAXV; }
        if (sp > base) {
          var f = (base + (sp - base) * DECAY) / sp;
          v.x *= f; v.y *= f;
        }
      }
    }
  }
  requestAnimationFrame(physicsStep);

  /* --- pause when the page is hidden (belt + braces over pauseOnBlur) ----- */
  document.addEventListener('visibilitychange', function () {
    if (!container) { return; }
    try {
      if (document.hidden) { container.pause(); }
      else { container.play(); }
    } catch (e) {}
  });

  /* --- Wallpaper Engine property bridge ---------------------------------- *
   * Wires the project.json "schemecolor" picker (and WE's fps setting) into
   * the live config so the WE Properties panel works too.                    */
  function weColorToHex(s) {
    var p = String(s).split(' ').map(Number);
    if (p.length < 3 || p.some(isNaN)) { return null; }
    function to(x) {
      return ('0' + Math.round(Math.max(0, Math.min(1, x)) * 255)
        .toString(16)).slice(-2);
    }
    return '#' + to(p[0]) + to(p[1]) + to(p[2]);
  }

  W.wallpaperPropertyListener = {
    applyUserProperties: function (props) {
      if (props && props.schemecolor && props.schemecolor.value) {
        var hex = weColorToHex(props.schemecolor.value);
        if (hex && W.CONFIG) {
          W.CONFIG.color = hex;
          refresh();
          if (W.WallpaperPanel && W.WallpaperPanel.sync) { W.WallpaperPanel.sync(); }
        }
      }
    },
    applyGeneralProperties: function (props) {
      if (props && typeof props.fps === 'number' && W.CONFIG) {
        W.CONFIG.fpsCap = props.fps;
        refresh();
        if (W.WallpaperPanel && W.WallpaperPanel.sync) { W.WallpaperPanel.sync(); }
      }
    }
  };

  refresh();
})();
