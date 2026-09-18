(function () {
  "use strict";

  var sb = null;
  var authed = false;
  var initialLoadsDone = false;

  function $(id) { return document.getElementById(id); }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function toast(msg, kind) {
    var zone = $("toast-zone");
    if (!zone) return;
    var el = document.createElement("div");
    el.className = "toast " + (kind || "ok");
    el.textContent = msg;
    zone.appendChild(el);
    setTimeout(function () { el.style.opacity = "0"; el.style.transition = "opacity .4s"; }, 3200);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3800);
  }

  async function loadSettings() {
    var res = await sb.from("settings").select("data").eq("id", 1).maybeSingle();
    if (res.error) throw res.error;
    var base = JSON.parse(JSON.stringify(window.INVITE_DEFAULTS || {}));
    var remote = (res.data && res.data.data) || {};
    var merged = deepMerge(base, remote);
    if (!merged.couple.names && merged.couple.hisName) merged.couple.names = merged.couple.hisName + " ♥ " + merged.couple.herName;
    return merged;
  }

  function deepMerge(base, extra) {
    var out = {};
    Object.keys(base || {}).forEach(function (k) { out[k] = base[k]; });
    Object.keys(extra || {}).forEach(function (k) {
      var b = base ? base[k] : undefined;
      var v = extra[k];
      if (v && typeof v === "object" && !Array.isArray(v) && b && typeof b === "object") {
        out[k] = deepMerge(b, v);
      } else if (v !== undefined) {
        out[k] = v;
      }
    });
    return out;
  }

  async function saveSettings() {
    var data = gather();
    var res = await sb.from("settings").upsert({ id: 1, data: data, updated_at: new Date().toISOString() });
    if (res.error) throw res.error;
    return data;
  }

  function v(name) { var el = document.querySelector('[name="' + name + '"]'); return el ? el.value : ""; }
  function ck(name) { var el = document.querySelector('[name="' + name + '"]'); return el ? el.checked : false; }

  function gather() {
    var isNum = function (x) { x = parseFloat(x); return isNaN(x) ? 1 : Math.max(1, Math.min(50, Math.floor(x))); };
    return {
      couple: { hisName: v("couple_his"), herName: v("couple_her") },
      invite: {
        phrase: v("invite_phrase"),
        kicker: v("invite_kicker"),
        story: v("invite_story"),
        eventTitle: v("invite_eventTitle"),
        thankYou: v("invite_thankYou"),
        finalSignoff: v("invite_finalSignoff")
      },
      event: {
        date: v("event_date"),
        dayLabel: v("event_dayLabel"),
        dateLabel: v("event_dateLabel"),
        time: v("event_time"),
        venue: v("event_venue"),
        location: v("event_location"),
        mapUrl: v("event_mapUrl"),
        countdownTarget: v("event_countdownTarget") || ""
      },
      media: { photo: v("media_photo"), videoUrl: v("media_videoUrl"), musicUrl: v("media_musicUrl") },
      rsvp: {
        enabled: ck("rsvp_enabled"),
        maxGuests: isNum(v("rsvp_maxGuests")),
        subtitle: v("rsvp_subtitle")
      },
      settings: {
        countdownEnabled: ck("st_countdownEnabled"),
        musicEnabled: ck("st_musicEnabled"),
        shareTitle: v("st_shareTitle"),
        shareText: v("st_shareText")
      }
    };
  }

  function fill(data) {
    function set(name, value) {
      var el = document.querySelector('[name="' + name + '"]');
      if (el) el.value = value == null ? "" : value;
    }
    function chk(name, value) {
      var el = document.querySelector('[name="' + name + '"]');
      if (el) el.checked = !!value;
    }
    set("couple_his", data.couple.hisName);
    set("couple_her", data.couple.herName);
    set("invite_phrase", data.invite.phrase);
    set("invite_kicker", data.invite.kicker);
    set("invite_story", data.invite.story);
    set("invite_eventTitle", data.invite.eventTitle);
    set("invite_thankYou", data.invite.thankYou);
    set("invite_finalSignoff", data.invite.finalSignoff);
    set("event_date", data.event.date);
    set("event_dayLabel", data.event.dayLabel);
    set("event_dateLabel", data.event.dateLabel);
    set("event_time", data.event.time);
    set("event_venue", data.event.venue);
    set("event_location", data.event.location);
    set("event_mapUrl", data.event.mapUrl);
    set("event_countdownTarget", toLocal(data.event.countdownTarget));
    set("media_photo", data.media.photo);
    set("media_videoUrl", data.media.videoUrl);
    set("media_musicUrl", data.media.musicUrl);
    chk("rsvp_enabled", data.rsvp.enabled);
    set("rsvp_maxGuests", data.rsvp.maxGuests);
    set("rsvp_subtitle", data.rsvp.subtitle);
    chk("st_countdownEnabled", data.settings.countdownEnabled);
    chk("st_musicEnabled", data.settings.musicEnabled);
    set("st_shareTitle", data.settings.shareTitle);
    set("st_shareText", data.settings.shareText);
    var photoPrev = $("photo-preview");
    if (photoPrev) { photoPrev.src = data.media.photo || ""; photoPrev.style.display = data.media.photo ? "block" : "none"; }
  }

  function toLocal(iso) {
    if (!iso) return "";
    var parts = String(iso).slice(0, 16);
    return parts;
  }

  function autoDateLabel() {
    var d = v("event_date");
    if (!d) return;
    var parsed = new Date(String(d).replace(/\./g, "-") + "T00:00:00");
    if (isNaN(parsed)) return;
    var label = parsed.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    var day = parsed.toLocaleDateString("en-US", { weekday: "long" });
    document.querySelector('[name="event_dayLabel"]').value = day.toUpperCase();
    document.querySelector('[name="event_dateLabel"]').value = label.toUpperCase();
  }

  function switchTab(name) {
    ["invitation", "media", "guests"].forEach(function (t) {
      var isActive = t === name;
      var tabBtn = $("tab-" + t);
      var pane = $("pane-" + t);
      if (tabBtn) tabBtn.classList.toggle("active", isActive);
      if (pane) pane.classList.toggle("hidden", !isActive);
    });
    if (name === "guests") loadGuests();
  }

  function wire() {
    ["invitation", "media", "guests"].forEach(function (t) {
      var btn = $("tab-" + t);
      if (btn) btn.addEventListener("click", function () { switchTab(t); });
    });

    var save = $("save-settings");
    var saveMedia = $("save-settings-media");

    function makeSaveHandler() {
      return async function () {
        var el = this;
        if (el) el.disabled = true;
        try {
          var d = await saveSettings();
          toast("Invitation saved. Guests will see the new details instantly.");
        } catch (err) {
          toast("Could not save: " + (err && err.message), "err");
        } finally {
          if (el) el.disabled = false;
        }
      };
    }

    if (save) save.addEventListener("click", makeSaveHandler());
    if (saveMedia) saveMedia.addEventListener("click", makeSaveHandler());

    var dateInput = document.querySelector('[name="event_date"]');
    if (dateInput) dateInput.addEventListener("change", autoDateLabel);

    ["photo", "video", "music"].forEach(function (kind) {
      var input = $("file-" + kind);
      if (input) input.addEventListener("change", function () {
        var f = input.files && input.files[0];
        if (f) uploadMedia(kind, f);
        input.value = "";
      });
    });

    var logout = $("logout-btn");
    if (logout) logout.addEventListener("click", function () { sb.auth.signOut(); });

    var loginForm = $("login-form");
    if (loginForm) loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      var btn = loginForm.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        var email = loginForm.email.value.trim();
        var pass = loginForm.password.value;
        var res = await sb.auth.signInWithPassword({ email: email, password: pass });
        if (res.error) throw res.error;
        toast("Welcome back!");
      } catch (err) {
        toast("Sign-in failed: " + (err && err.message), "err");
        btn.disabled = false;
      }
    });

    var exportBtn = $("export-csv");
    if (exportBtn) exportBtn.addEventListener("click", exportCsv);
  }

  async function uploadMedia(kind, file) {
    var ext = (file.name.split(".").pop() || "bin").toLowerCase();
    var ts = Date.now();
    var path = ("couple/" + kind + "-" + ts + "." + ext).toLowerCase();
    var res = await sb.storage.from("invite-media").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (res.error) {
      toast("Upload failed: " + res.error.message, "err");
      return;
    }
    var pub = sb.storage.from("invite-media").getPublicUrl(path);
    var url = pub.data && pub.data.publicUrl;

    var targetName = kind === "photo" ? "media_photo" : kind === "video" ? "media_videoUrl" : "media_musicUrl";
    var field = document.querySelector('[name="' + targetName + '"]');
    if (field) {
      field.value = url;
      field.dispatchEvent(new Event("input"));
    }
    if (kind === "photo") {
      var prev = $("photo-preview");
      if (prev) { prev.src = url; prev.style.display = "block"; }
    }
    var infoId = "upload-" + kind + "-info";
    var info = $(infoId);
    if (info) {
      var bits = (file.size / (1024 * 1024)).toFixed(2);
      info.innerHTML = '<p class="name">' + esc(file.name) + " (" + bits + " MB)</p>" +
        '<p class="url">' + esc(url) + "</p>";
    }
    toast(kind.charAt(0).toUpperCase() + kind.slice(1) + " uploaded. Press \u201CSave Invitation\u201D to apply it.");
  }

  async function loadGuests() {
    if (!sb) return;
    var res = await sb.from("rsvps").select("*").order("created_at", { ascending: false }).limit(500);
    if (res.error) { toast("Could not load RSVPs: " + res.error.message, "err"); return; }
    renderGuests(res.data || []);
  }

  function renderGuests(rows) {
    var total = rows.length;
    var accepts = rows.filter(function (r) { return r.attending === true; }).length;
    var declines = rows.filter(function (r) { return r.attending === false; }).length;
    var pending = rows.filter(function (r) { return r.attending === null || r.attending === undefined; }).length;
    var guests = rows.reduce(function (s, r) { return s + (Number(r.guests) || 0); }, 0);

    $("stat-total").textContent = total;
    $("stat-accepts").textContent = accepts;
    $("stat-declines").textContent = declines;
    $("stat-guests").textContent = guests;

    var empty = $("guests-empty");
    if (empty) empty.classList.toggle("hidden", rows.length > 0);
    var tbody = $("guests-body");
    tbody.innerHTML = "";
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      var badge = r.attending === true ? '<span class="badge yes">Accepting</span>' :
        r.attending === false ? '<span class="badge no">Declining</span>' : '<span class="badge pending">Pending</span>';
      var date = new Date(r.created_at).toLocaleString();
      tr.innerHTML = "<td><strong>" + esc(r.name) + "</strong></td>" +
        "<td>" + (Number(r.guests) || 0) + "</td>" +
        "<td>" + badge + "</td>" +
        "<td class=\"msg\">" + esc(r.message) + "</td>" +
        "<td style=\"white-space:nowrap;\">" + esc(date) + "</td>" +
        '<td><button type="button" class="btn danger" data-del="' + r.id + '">Delete</button></td>';
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!window.confirm("Delete this RSVP?")) return;
        var res = await sb.from("rsvps").delete().eq("id", btn.getAttribute("data-del"));
        if (res.error) { toast("Delete failed: " + res.error.message, "err"); return; }
        toast("RSVP deleted.");
        loadGuests();
      });
    });
  }

  function exportCsv() {
    var rows = (function () {
      var out = [];
      var trs = document.querySelectorAll("#guests-body tr");
      trs.forEach(function (tr) {
        var tds = tr.querySelectorAll("td");
        out.push([tds[0].innerText, tds[1].innerText, tds[2].innerText, tds[3].innerText, tds[4].innerText]);
      });
      return out;
    })();
    var csv = [["Name", "Guests", "Attendance", "Message", "Submitted"]].concat(rows)
      .map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(","); })
      .join("\r\n");
    var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "rsvp-guest-list.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  async function loadGraphAssets(client, current) {
    var s = current;
    try {
      var res = await client.from("settings").select("data").eq("id", 1).maybeSingle();
      if (!res.error && res.data && res.data.data) {
        var base = JSON.parse(JSON.stringify(window.INVITE_DEFAULTS || {}));
        s = deepMerge(base, res.data.data);
      }
    } catch (e) { /* default */ }
    var photoPrev = $("photo-preview");
    if (photoPrev) { photoPrev.src = s.media.photo || ""; photoPrev.style.display = s.media.photo ? "block" : "none"; }
  }

  async function initApp() {
    if (initialLoadsDone) return;
    initialLoadsDone = true;
    try {
      var data = await loadSettings();
      fill(data);
      loadGuests();
      loadGraphAssets(sb, data);
      $("app-view").classList.remove("hidden");
      $("login-view").classList.add("hidden");
    } catch (err) {
      toast("Couldn't load settings: " + (err && err.message), "err");
      $("app-view").classList.remove("hidden");
      $("login-view").classList.add("hidden");
    }
  }

  async function boot() {
    sb = await window.InviteSupabase.get();
    if (!sb) {
      $("login-view").classList.remove("hidden");
      var warn = $("config-warning");
      if (warn) warn.classList.remove("hidden");
      return;
    }
    wire();

    var session = sb.auth.getSession();
    session.then(function (ss) {
      var user = ss && ss.data && ss.data.session ? ss.data.session.user : null;
      authed = !!user;
      $("app-view").classList.toggle("hidden", !authed);
      $("login-view").classList.toggle("hidden", authed);
      if (authed) initApp();
    });

    sb.auth.onAuthStateChange(function (event, session) {
      authed = !!session;
      $("app-view").classList.toggle("hidden", !authed);
      $("login-view").classList.toggle("hidden", authed);
      if (authed) initApp();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();