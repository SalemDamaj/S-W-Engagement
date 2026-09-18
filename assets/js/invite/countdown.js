(function () {
  "use strict";

  var timer = null;
  var target = null;
  var lastValue = "";

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function remaining() {
    var diff = target - Date.now();
    if (diff <= 0) return null;
    var s = Math.floor(diff / 1000);
    var days = Math.floor(s / 86400);
    var hours = Math.floor((s % 86400) / 3600);
    var minutes = Math.floor((s % 3600) / 60);
    var seconds = s % 60;
    return pad(days) + ":" + pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
  }

  function setDigits(root) {
    var vals = lastValue.split(":");
    var units = root.querySelectorAll("[data-unit]");
    for (var i = 0; i < units.length; i++) {
      var p = units[i];
      var type = p.getAttribute("data-unit");
      var str = "";
      if (type === "days") str = vals[0];
      else if (type === "hours") str = vals[1];
      else if (type === "minutes") str = vals[2];
      else if (type === "seconds") str = vals[3];
      var cells = p.querySelectorAll("[data-digit]");
      for (var d = 0; d < 2; d++) {
        var el = cells[d];
        var ch = str.charAt(d) || "0";
        if (el.textContent !== ch) {
          el.textContent = ch;
          el.classList.remove("pop");
          void el.offsetWidth;
          el.classList.add("pop");
        }
      }
    }
  }

  function tick() {
    var value = remaining();
    if (value === null) {
      finish();
      return;
    }
    if (value !== lastValue) {
      lastValue = value;
      var root = document.getElementById("countdown-wrap");
      if (root) setDigits(root);
    }
    schedule();
  }

  function schedule() {
    var delay = 1000 - (Date.now() % 1000) + 20;
    timer = setTimeout(tick, delay);
  }

  function finish() {
    if (timer) { clearTimeout(timer); timer = null; }
    var root = document.getElementById("countdown-wrap");
    if (!root) return;
    var grid = root.querySelector(".countdown-grid");
    var msg = root.querySelector(".cd-message");
    var done = root.querySelector(".cd-done");
    if (grid) grid.classList.add("hide-soft");
    if (msg) msg.classList.add("hide-soft");
    if (done) {
      done.classList.remove("hide-soft");
      done.classList.add("show-soft");
    }
  }

  function destroy() {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  async function init() {
    destroy();
    var s = window.Invite.settings.get();
    var enabled = s && s.settings && s.settings.countdownEnabled;
    var sec = document.getElementById("countdown");
    if (!sec) return;
    if (!enabled) { sec.style.display = "none"; return; }
    var parsed = s.event.countdownTarget
      ? new Date(String(s.event.countdownTarget).replace(" ", "T"))
      : null;
    target = parsed && !isNaN(parsed.getTime()) ? parsed.getTime() : NaN;
    if (isNaN(target)) { sec.style.display = "none"; return; }
    var root = document.getElementById("countdown-wrap");
    if (root) { setDigits(root); }
    var value = remaining();
    if (value === null) { finish(); return; }
    lastValue = value;
    schedule();
  }

  window.Invite = window.Invite || {};
  window.Invite.countdown = { init: init, destroy: destroy };
})();