(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function pad(n) { n = Math.floor(n); return n < 10 ? "0" + n : "" + n; }

  function utcStamp(dt) {
    return dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }

  function eventStart() {
    var s = window.Invite && window.Invite.settings ? window.Invite.settings.get() : {};
    var raw = s.event && s.event.countdownTarget;
    var dt = null;
    if (raw) {
      dt = new Date(String(raw).replace(" ", "T"));
      if (isNaN(dt.getTime())) dt = null;
    }
    if (!dt) dt = new Date();
    return dt;
  }

  function escapeText(str) {
    return String(str || "")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;")
      .replace(/\r?\n/g, "\\n");
  }

  function calTitle() {
    var s = window.Invite && window.Invite.settings ? window.Invite.settings.get() : {};
    var names = s.couple ? s.couple.names : "Salem ♥ Wafaa";
    var title = s.invite && s.invite.eventTitle ? s.invite.eventTitle : "Our Engagement Celebration";
    return names + " — " + title;
  }

  function googleUrl() {
    var s = window.Invite && window.Invite.settings ? window.Invite.settings.get() : {};
    var start = eventStart();
    var end = new Date(start.getTime() + 3 * 3600 * 1000);
    var params = new URLSearchParams();
    params.set("action", "TEMPLATE");
    params.set("text", calTitle());
    params.set("dates", utcStamp(start) + "/" + utcStamp(end));
    params.set("details", ((s.event && (s.event.location || "")) || "") + " · " + ((s.invite && s.invite.eventTitle) || ""));
    params.set("location", (((s.event && s.event.venue) || "") + " " + ((s.event && s.event.location) || "")).trim());
    return "https://calendar.google.com/calendar/render?" + params.toString();
  }

  function icsContents() {
    var s = window.Invite && window.Invite.settings ? window.Invite.settings.get() : {};
    var start = eventStart();
    var end = new Date(start.getTime() + 3 * 3600 * 1000);
    var location = [s.event && s.event.venue, s.event && s.event.location].filter(Boolean).join(", ");
    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Salem Wafaa//Engagement//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:salem-wafaa-engagement@invite",
      "DTSTAMP:" + utcStamp(new Date()),
      "DTSTART:" + utcStamp(start),
      "DTEND:" + utcStamp(end),
      "SUMMARY:" + escapeText(calTitle()),
      "LOCATION:" + escapeText(location),
      "DESCRIPTION:" + escapeText("You're invited " + ((s.event && s.event.location) ? "· " + s.event.location : "")),
      "END:VEVENT",
      "END:VCALENDAR"
    ];
    return lines.join("\r\n");
  }

  function downloadIcs() {
    var blob = new Blob([icsContents()], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "salem-wafaa-engagement.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function init() {
    var btn = $("cal-btn");
    var menu = $("cal-menu");
    if (!btn || !menu) return;

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var hidden = menu.classList.contains("hidden");
      menu.classList.toggle("hidden", !hidden);
    });

    document.addEventListener("click", function () {
      if (!menu.classList.contains("hidden")) menu.classList.add("hidden");
    });

    var googleEl = $("cal-google");
    if (googleEl) {
      googleEl.addEventListener("click", function (e) {
        e.preventDefault();
        window.open(googleUrl(), "_blank");
      });
    }

    var icalEl = $("cal-ical");
    if (icalEl) {
      icalEl.addEventListener("click", function (e) {
        e.preventDefault();
        downloadIcs();
      });
    }
  }

  window.Invite = window.Invite || {};
  window.Invite.calendar = { init: init };
})();