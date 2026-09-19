(function () {
  "use strict";

  var sb = null;
  var authed = false;
  var initialLoadsDone = false;
  var currentData = null;
  var cardState = { background: "charcoal", image: "" };
  var inviteeRows = [];

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
        finalSignoff: v("invite_finalSignoff"),
        phraseAr: v("invite_phraseAr"),
        storyAr: v("invite_storyAr"),
        eventTitleAr: v("invite_eventTitleAr"),
        thankYouAr: v("invite_thankYouAr")
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
      design: { theme: "charcoal", card: { background: cardState.background, image: cardState.image } },
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
    set("invite_phraseAr", data.invite.phraseAr);
    set("invite_storyAr", data.invite.storyAr);
    set("invite_eventTitleAr", data.invite.eventTitleAr);
    set("invite_thankYouAr", data.invite.thankYouAr);
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
    if (data.design && data.design.card) {
      cardState.background = data.design.card.background || cardState.background;
      cardState.image = data.design.card.image || "";
    }
    currentData = data;
    syncCardUi();
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
    ["invitation", "media", "card", "guests"].forEach(function (t) {
      var isActive = t === name;
      var tabBtn = $("tab-" + t);
      var pane = $("pane-" + t);
      if (tabBtn) tabBtn.classList.toggle("active", isActive);
      if (pane) pane.classList.toggle("hidden", !isActive);
    });
    if (name === "guests") { loadGuests(); loadInvitees(); }
    if (name === "card") renderCardPreview();
  }

  function wire() {
    ["invitation", "media", "card", "guests"].forEach(function (t) {
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
          await saveSettings();
          toast("Invitation saved. Guests will see the new details instantly.");
        } catch (err) {
          toast(describeSaveError(err), "err");
        } finally {
          if (el) el.disabled = false;
        }
      };
    }

    if (save) save.addEventListener("click", makeSaveHandler());
    if (saveMedia) saveMedia.addEventListener("click", makeSaveHandler());

    var dateInput = document.querySelector('[name="event_date"]');
    if (dateInput) dateInput.addEventListener("change", autoDateLabel);

    ["photo", "video", "music", "og"].forEach(function (kind) {
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

    wireInvitees();
    wireCard();
  }

  function describeSaveError(err) {
    var code = err && (err.code || err.statusCode);
    var msg = err && err.message;
    if (code === 42501 || code === "42501" || msg && /row-level security|permission denied/i.test(msg)) {
      return "Permission denied (403). The settings/RSVP tables are missing their admin policies. Re-run supabase/schema.sql and sign in again.";
    }
    if (code === "42P01" || /does not exist/i.test(msg || "")) {
      return "Table not found. You need to run supabase/schema.sql in the Supabase SQL editor first.";
    }
    if (code === "PGRST301" || code === 401 || /401/i.test(String(msg))) {
      return "Your sign-in expired. Sign out and sign in again.";
    }
    return "Could not save: " + (msg || "unknown error");
  }

  function toJpeg(file) {
    return new Promise(function (resolve) {
      if (!/^image\/(png|webp|bmp|gif)$/i.test(file.type)) { resolve(file); return; }
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement("canvas");
        var target = 1200;
        var ratio = (img.naturalWidth || target) / target;
        var w = target;
        var h = Math.round((img.naturalHeight || target) / ratio);
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(function (blob) { resolve(blob || file); }, "image/jpeg", 0.85);
      };
      img.onerror = function () { resolve(file); };
      var reader = new FileReader();
      reader.onload = function (e) { img.src = e.target.result; };
      reader.readAsDataURL(file);
    });
  }

  async function uploadMedia(kind, file) {
    var infoId = "upload-" + kind + "-info";
    var info = $(infoId);
    var bits = (file.size / (1024 * 1024)).toFixed(2);

    if (kind === "og") {
      var jpeg = await toJpeg(file);
      var path = "og/preview.jpg";
      var up = await sb.storage.from("invite-media").upload(path, jpeg, { upsert: true, cacheControl: "3600", contentType: "image/jpeg" });
      if (up.error) {
        toast("Upload failed: " + up.error.message, "err");
        return;
      }
      var pub = sb.storage.from("invite-media").getPublicUrl(path);
      var url = pub.data && pub.data.publicUrl;
      var prev = $("og-preview");
      if (prev) { prev.src = url; prev.style.display = "block"; }
      if (info) info.innerHTML = '<p class="name">' + esc(file.name) + " (" + bits + " MB)</p>" +
        '<p class="url">' + esc(url) + "</p>";
      toast("Preview image uploaded. WhatsApp will refresh after it re-scans the link.");
      return;
    }

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
    if (info) {
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

  /* ---------- Invitees (who to send invitations to) ---------- */

  async function loadInvitees() {
    if (!sb) return;
    var res = await sb.from("invitees").select("*").order("created_at", { ascending: false }).limit(2000);
    if (res.error) { toast("Could not load invitees: " + res.error.message, "err"); return; }
    inviteeRows = res.data || [];
    renderInvitees();
  }

  function renderInvitees() {
    var rows = inviteeRows;
    var tbody = $("invitees-body");
    var empty = $("invitees-empty");
    if (empty) empty.classList.toggle("hidden", rows.length > 0);
    if (!tbody) return;
    tbody.innerHTML = "";
    var seats = 0;
    rows.forEach(function (r) {
      seats += Number(r.guests) || 1;
      var tr = document.createElement("tr");
      tr.innerHTML = "<td><strong>" + esc(r.name) + "</strong></td>" +
        "<td>" + (Number(r.guests) || 1) + "</td>" +
        "<td>" + esc(r.phone || "") + "</td>" +
        '<td><button type="button" class="btn danger" data-delinv="' + r.id + '">Delete</button></td>';
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll("[data-delinv]").forEach(function (btn) {
      btn.addEventListener("click", function () { deleteInvitee(btn.getAttribute("data-delinv")); });
    });
    var sInv = $("stat-invitees"); if (sInv) sInv.textContent = rows.length;
    var sSeats = $("stat-seats"); if (sSeats) sSeats.textContent = seats;
  }

  async function addInvitee(name, guests, phone) {
    var res = await sb.from("invitees").insert({ name: name, guests: guests, phone: phone || null });
    if (res.error) { toast("Could not add invitee: " + res.error.message, "err"); return false; }
    toast("Invitee added.");
    loadInvitees();
    return true;
  }

  async function deleteInvitee(id) {
    if (!window.confirm("Delete this invitee?")) return;
    var res = await sb.from("invitees").delete().eq("id", id);
    if (res.error) { toast("Delete failed: " + res.error.message, "err"); return; }
    toast("Invitee deleted.");
    loadInvitees();
  }

  function exportInvitees() {
    var rows = inviteeRows.map(function (r) { return [r.name, r.guests, r.phone || ""]; });
    if (!rows.length) { toast("Nothing to export yet.", "err"); return; }
    var csv = [["Name", "Guests", "Phone"]].concat(rows)
      .map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(","); })
      .join("\r\n");
    var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "invitees.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function wireInvitees() {
    var form = $("invitee-form");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nameVal = $("invitee-name");
      var guestVal = $("invitee-guests");
      var phoneVal = $("invitee-phone");
      var name = (nameVal.value || "").trim();
      var guests = Math.max(1, Math.min(50, parseInt(guestVal.value, 10) || 1));
      var phone = (phoneVal.value || "").trim();
      if (!name) { toast("Please enter a name.", "err"); return; }
      addInvitee(name, guests, phone).then(function (ok) {
        if (ok) { form.reset(); guestVal.value = "1"; }
      });
    });
    var expBtn = $("export-invitees");
    if (expBtn) expBtn.addEventListener("click", exportInvitees);
  }

  /* ---------- Downloadable invitation card ---------- */

  function syncCardUi() {
    var swatches = document.querySelectorAll("#card-swatches .swatch");
    swatches.forEach(function (s) {
      s.classList.toggle("active", s.getAttribute("data-bg") === cardState.background);
    });
    var prev = $("cardbg-preview");
    if (prev) {
      prev.src = cardState.image || "";
      prev.style.display = cardState.image ? "block" : "none";
    }
    var info = $("upload-cardbg-info");
    if (info) {
      info.innerHTML = cardState.image
        ? '<p class="name">Custom background</p><p class="url">' + esc(cardState.image) + "</p>"
        : '<p class="name">Use one of the preset styles above, or upload your own background photo.</p>';
    }
  }

  function renderCardPreview() {
    if (!currentData) return;
    var img = $("card-preview");
    var loading = $("card-preview-loading");
    if (!img) return;
    if (loading) loading.classList.remove("hidden");
    window.InviteCard.paint(currentData, cardState).then(function (canvas) {
      img.src = canvas.toDataURL("image/png");
      if (loading) loading.classList.add("hidden");
    });
  }

  function downloadCard() {
    if (!currentData) { toast("No settings loaded yet.", "err"); return; }
    var btn = $("download-card");
    if (btn) btn.disabled = true;
    window.InviteCard.paint(currentData, cardState).then(function (canvas) {
      canvas.toBlob(function (blob) {
        var link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "engagement-invitation.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
        if (btn) btn.disabled = false;
        toast("Invitation card downloaded.", "ok");
      }, "image/png");
    });
  }

  async function uploadCardBg(file, done) {
    var ext = (file.name.split(".").pop() || "png").toLowerCase();
    var path = "card/bg-" + Date.now() + "-" + Math.round(Math.random() * 1e4) + "." + ext;
    var res = await sb.storage.from("invite-media").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (res.error) { toast("Upload failed: " + res.error.message, "err"); if (done) done(); return; }
    var pub = sb.storage.from("invite-media").getPublicUrl(path);
    var url = pub.data && pub.data.publicUrl;
    cardState.image = url || "";
    syncCardUi();
    renderCardPreview();
    toast("Background uploaded. Press \u201CSave card settings\u201D to keep it.");
    if (done) done();
  }

  function wireCard() {
    var swatches = document.querySelectorAll("#card-swatches .swatch");
    swatches.forEach(function (s) {
      s.addEventListener("click", function () {
        cardState.background = s.getAttribute("data-bg");
        syncCardUi();
        renderCardPreview();
      });
    });
    var fileBg = $("file-cardbg");
    if (fileBg) fileBg.addEventListener("change", function () {
      var f = fileBg.files && fileBg.files[0];
      if (f) uploadCardBg(f, function () { fileBg.value = ""; });
    });
    var clearBg = $("clear-cardbg");
    if (clearBg) clearBg.addEventListener("click", function () {
      cardState.image = "";
      syncCardUi();
      renderCardPreview();
    });
    var saveCard = $("save-card");
    if (saveCard) saveCard.addEventListener("click", async function () {
      var el = saveCard;
      el.disabled = true;
      try {
        var data = await saveSettings();
        currentData = await loadSettings();
        void data;
        toast("Card settings saved. The download will use this background.");
      } catch (err) {
        toast(describeSaveError(err), "err");
      } finally {
        el.disabled = false;
      }
    });
    var dl = $("download-card");
    if (dl) dl.addEventListener("click", downloadCard);
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
    var ogPrev = $("og-preview");
    if (ogPrev) {
      var ogUrl = client.storage.from("invite-media").getPublicUrl("og/preview.jpg");
      var url = ogUrl.data && ogUrl.data.publicUrl;
      if (url) ogPrev.src = url;
      ogPrev.style.display = url ? "block" : "none";
    }
  }

  async function initApp() {
    if (initialLoadsDone) return;
    initialLoadsDone = true;
    try {
      var data = await loadSettings();
      fill(data);
      loadGuests();
      loadInvitees();
      renderCardPreview();
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
      var configured = !!window.SUPABASE_CONFIG && !!window.SUPABASE_CONFIG.url && !!window.SUPABASE_CONFIG.anonKey;
      if (!configured) {
        warn.innerHTML = "Supabase is not configured yet. Add your project URL and anon key to " +
          "<code>supabase/config.js</code>, then reload this page.";
      } else if (!window.supabase || !window.supabase.createClient) {
        warn.innerHTML = "The Supabase library failed to load.<br>Check that <code>assets/js/vendor/supabase.min.js</code> exists, then hard refresh (Ctrl+Shift+R).";
      } else {
        warn.innerHTML = "Could not connect to Supabase with the keys in <code>supabase/config.js</code>.<br>Check the project URL and the full anon key, then hard refresh (Ctrl+Shift+R).";
      }
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