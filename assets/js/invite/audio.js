(function () {
  "use strict";

  var settings = function () {
    return window.Invite && window.Invite.settings ? window.Invite.settings.get() : window.INVITE_DEFAULTS;
  };

  var audioEl = null;
  var ctx = null;
  var master = null;
  var nodes = [];
  var lfo = null;
  var playing = false;
  var fadeId = 0;
  var usingFile = false;

  function hasMusic() {
    var s = settings();
    return !!(s && s.settings && s.settings.musicEnabled);
  }

  function buildAmbientPad() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      var filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 640;
      filter.Q.value = 0.6;
      filter.connect(master);

      var roots = [220.0, 329.63, 415.3, 659.25];
      var gains = [0.10, 0.07, 0.05, 0.03];
      var detunes = [0, 4, -3, 6];

      roots.forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        osc.type = i < 2 ? "sine" : "triangle";
        osc.frequency.value = freq;
        osc.detune.value = detunes[i];
        var g = ctx.createGain();
        g.gain.value = gains[i];
        osc.connect(g);
        g.connect(filter);

        var wobble = ctx.createOscillator();
        wobble.frequency.value = 0.03 + i * 0.01;
        var wobbleGain = ctx.createGain();
        wobbleGain.gain.value = 6;
        wobble.connect(wobbleGain);
        wobbleGain.connect(osc.detune);
        wobble.start();

        osc.start();
        nodes.push(osc, g, wobble, wobbleGain);
      });

      var breath = ctx.createOscillator();
      breath.frequency.value = 0.06;
      var breathGain = ctx.createGain();
      breathGain.gain.value = 0.05;
      breath.connect(breathGain);
      breathGain.connect(filter.frequency);
      breath.start();
      nodes.push(breath, breathGain);

      return true;
    } catch (e) {
      return false;
    }
  }

  function fadeTo(target, ms, done) {
    fadeId++;
    var id = fadeId;
    var node = usingFile ? audioEl : master;
    if (!node) { if (done) done(); return; }
    var startVal = usingFile ? (audioEl.volume || 0) : (master.gain.value || 0);
    var start = performance.now();
    (function step() {
      if (id !== fadeId) return;
      var p = Math.min(1, (performance.now() - start) / ms);
      var eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      var val = startVal + (target - startVal) * eased;
      if (usingFile) audioEl.volume = Math.max(0, Math.min(1, val)); else master.gain.value = val;
      if (p < 1) requestAnimationFrame(step); else if (done) done();
    })();
  }

  async function ensureReady() {
    if (usingFile && audioEl) {
      if (audioEl.readyState < 3) {
        try { await audioEl.play(); } catch (e) { /* muted browsers */ }
      }
      return;
    }
    if (ctx && master) {
      if (ctx.state === "suspended") {
        try { await ctx.resume(); } catch (e) { /* ignore */ }
      }
      return;
    }
    var s = settings();
    var url = s && s.media && s.media.musicUrl;
    if (url) {
      audioEl = new Audio(url);
      audioEl.loop = true;
      audioEl.preload = "auto";
      audioEl.volume = 0;
      usingFile = true;
    } else {
      buildAmbientPad();
    }
  }

  async function play() {
    if (playing) return;
    await ensureReady();
    if (usingFile && audioEl) {
      await audioEl.play().catch(function () {});
      fadeTo(0.75, 1200);
    } else if (master) {
      fadeTo(0.8, 1800);
    }
    playing = true;
    document.body.classList.add("music-on");
  }

  function pause() {
    if (!playing) return;
    fadeTo(0, 800, function () {
      if (usingFile && audioEl) audioEl.pause();
    });
    playing = false;
    document.body.classList.remove("music-on");
  }

  function toggle() {
    if (playing) { pause(); return false; }
    play();
    return true;
  }

  function isPlaying() { return playing; }

  window.Invite = window.Invite || {};
  window.Invite.audio = { play: play, pause: pause, toggle: toggle, isPlaying: isPlaying, hasMusic: hasMusic };
})();