(function () {
  "use strict";

  var canvas = null;
  var ctx = null;
  var particles = [];
  var raf = 0;
  var running = false;
  var hidden = false;
  var reduced = false;

  function prefersReduced() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function makeParticle(w, h, isBokeh) {
    var p = {
      x: Math.random() * w,
      y: h + (Math.random() * h * 0.25),
      r: isBokeh ? 12 + Math.random() * 26 : 0.8 + Math.random() * 2.4,
      speed: isBokeh ? 3 + Math.random() * 5 : 8 + Math.random() * 18,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.4 + Math.random() * 0.5,
      swayAmp: isBokeh ? 8 : 14 + Math.random() * 20,
      alpha: isBokeh ? 0.05 + Math.random() * 0.05 : 0.15 + Math.random() * 0.5,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.5 + Math.random() * 1.2,
      bokeh: !!isBokeh
    };
    return p;
  }

  function resize() {
    if (!canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    if (!canvas) return;
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || window.innerHeight;
    var count = Math.max(12, Math.min(34, Math.round((w * h) / 42000)));
    var bokehCount = count > 20 ? 3 : 2;
    particles = [];
    for (var i = 0; i < count; i++) particles.push(makeParticle(w, h, false));
    for (var j = 0; j < bokehCount; j++) particles.push(makeParticle(w, h, true));
  }

  function step(t) {
    if (!running || hidden || reduced) { raf = 0; return; }
    ctx.clearRect(0, 0, canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);
    var dt = Math.min((t - (step.last || t)) / 1000, 0.05);
    step.last = t;
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || window.innerHeight;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.sway += p.swaySpeed * dt;
      p.twinkle += p.twinkleSpeed * dt;
      p.y -= p.speed * dt;
      var x = p.x + Math.sin(p.sway) * p.swayAmp;
      var alpha = p.alpha * (0.55 + 0.45 * Math.sin(p.twinkle));
      if (p.bokeh) {
        ctx.beginPath();
        ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(214, 178, 106," + alpha.toFixed(3) + ")";
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(235, 203, 140," + alpha.toFixed(3) + ")";
        ctx.fill();
      }
      if (p.y < -40) {
        particles[i] = makeParticle(w, h, p.bokeh);
        particles[i].y = h + Math.random() * 20;
      }
    }
    raf = requestAnimationFrame(step);
  }

  function start() {
    if (!canvas) {
      canvas = document.getElementById("fx");
      if (!canvas) return;
      ctx = canvas.getContext("2d");
    }
    reduced = prefersReduced();
    if (reduced) { canvas.style.display = "none"; return; }
    resize();
    seed();
    running = true;
    document.addEventListener("visibilitychange", function () {
      hidden = document.hidden;
      if (!hidden && running && !raf) raf = requestAnimationFrame(step);
    });
    raf = requestAnimationFrame(step);
  }

  window.Invite = window.Invite || {};
  window.Invite.particles = { start: start };
})();