(function () {
  "use strict";

  var form = null;
  var attending = true;
  var guestsWrap = null;
  var guestsSelect = null;
  var card = null;
  var thanks = null;

  function getSupabase() {
    return window.__supabase || null;
  }

  function setGuestsOptions(max) {
    if (!guestsSelect) return;
    guestsSelect.innerHTML = "";
    for (var i = 1; i <= max; i++) {
      var opt = document.createElement("option");
      opt.value = i;
      opt.textContent = i === 1 ? "1 guest" : i + " guests";
      if (i === 2) opt.selected = true;
      guestsSelect.appendChild(opt);
    }
  }

  function showSuccess() {
    if (!form || !thanks || !card) return;
    form.classList.add("hidden");
    thanks.classList.remove("hidden");
    thanks.classList.add("show-soft");
    var finale = document.getElementById("finale");
    if (finale) setTimeout(function () { finale.scrollIntoView({ behavior: "smooth", block: "start" }); }, 1400);
  }

  async function submit(e) {
    e.preventDefault();
    var nameEl = form.elements.name;
    var msgEl = form.elements.message;
    var name = (nameEl.value || "").trim();
    if (!name) { nameEl.focus(); return; }
    var guests = attending ? parseInt(guestsSelect.value, 10) || 1 : 0;
    var message = (msgEl.value || "").trim();

    var btn = form.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.classList.add("is-busy"); }

    var client = getSupabase();
    if (client) {
      try {
        var res = await client.from("rsvps").insert({
          name: name,
          guests: guests,
          attending: attending,
          message: message || null
        });
        if (res.error) throw res.error;
      } catch (err) {
        console.warn("RSVP submit failed:", err && err.message);
        storeLocal(name, guests, attending, message);
      }
    } else {
      storeLocal(name, guests, attending, message);
    }
    if (btn) { btn.disabled = false; btn.classList.remove("is-busy"); }
    showSuccess();
  }

  function storeLocal(name, guests, attendingFlag, message) {
    try {
      var key = "sw_invite_rsvps_v1";
      var list = [];
      try { list = JSON.parse(localStorage.getItem(key)) || []; } catch (err) { list = []; }
      list.push({ created_at: new Date().toISOString(), name: name, guests: guests, attending: attendingFlag, message: message });
      localStorage.setItem(key, JSON.stringify(list));
    } catch (err) { /* storage unavailable */ }
  }

  function bind() {
    var yes = form.querySelector('[data-answer="true"]');
    var no = form.querySelector('[data-answer="false"]');
    if (yes) yes.addEventListener("click", function () { setAttending(true); });
    if (no) no.addEventListener("click", function () { setAttending(false); });
    form.addEventListener("submit", submit);
  }

  function setAttending(value) {
    attending = value;
    var buttons = form.querySelectorAll("[data-answer]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle("active", buttons[i].getAttribute("data-answer") === String(value));
    }
    if (guestsWrap) guestsWrap.classList.toggle("hidden", !value);
  }

  async function init() {
    var sec = document.getElementById("rsvp");
    if (!sec) return;
    var s = window.Invite.settings.get();
    if (!s.rsvp || s.rsvp.enabled === false) { sec.style.display = "none"; return; }
    card = document.getElementById("rsvp-card");
    form = document.getElementById("rsvp-form");
    thanks = document.getElementById("rsvp-thanks");
    if (!form) return;
    guestsWrap = form.querySelector(".rsvp-guests");
    guestsSelect = form.querySelector('[name="guests"]');
    var max = (s.rsvp && s.rsvp.maxGuests) || 6;
    if (guestsSelect) setGuestsOptions(max);
    var sub = form.querySelector(".rsvp-sub");
    if (sub && s.rsvp.subtitle) sub.textContent = s.rsvp.subtitle;
    bind();
  }

  window.Invite = window.Invite || {};
  window.Invite.rsvp = { init: init };
})();