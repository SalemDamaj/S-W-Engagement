(function () {
  "use strict";

  var DICT = {
    en: {
      preloaderNote: "Preparing your invitation",
      musicLabel: "Music",
      langOther: "عربي",
      gateKicker: "A private celebration",
      gateTitle: "You're Invited",
      gateOpen: "Open Invitation",
      gateNote: "For the best experience, turn your sound on",
      ourEng: "Our Engagement",
      scrollCue: "Swipe to begin",
      engKicker: "Engagement Celebration",
      detSub: "We would be honored by your presence",
      detDate: "Date",
      detTime: "Time",
      detVenue: "Venue",
      detLocation: "Location",
      mapView: "View Location",
      calAdd: "Add to Calendar",
      calGoogle: "Google Calendar",
      calIcs: "Apple / iCal",
      cdKicker: "Countdown",
      cdTitle: "Counting the moments",
      cdDays: "Days",
      cdHours: "Hours",
      cdMinutes: "Minutes",
      cdSeconds: "Seconds",
      cdMessage: "Until our special day",
      cdDone: "Today is the day! ❤️",
      rsvpKicker: "RSVP",
      rsvpTitle: "Will you join us?",
      rsvpSub: "Your reply will mean the world to us",
      rsvpHead: "Kindly respond",
      attendQ: "Will you attend?",
      attendYes: "Joyfully Accepts",
      attendNo: "Regretfully Declines",
      guestsLabel: "Number of guests",
      guests1: "1 guest",
      guestsN: "{n} guests",
      phName: "Your full name",
      phMsg: "A message for the couple (optional)",
      rsvpSend: "Send RSVP",
      thanksH: "Thank you!",
      thanksBody: "Your response has been received. We can't wait to celebrate with you.",
      copied: "Link copied!",
      finaleSignoff: "With love,",
      shareBtn: "＋  Share",
      waShare: "WhatsApp",
      footer: "Made with love · Sal",
      catTitle: "{names} — Our Engagement",
      catText: "You're invited to the engagement celebration of {names}. {date} {time} · {venue} · {location}."
    },
    ar: {
      preloaderNote: "جارٍ تجهيز الدعوة",
      musicLabel: "الموسيقى",
      langOther: "English",
      gateKicker: "احتفال خاص",
      gateTitle: "أنت مدعوّ",
      gateOpen: "افتح الدعوة",
      gateNote: "للحصول على أفضل تجربة، فعّل الصوت",
      ourEng: "خطوبتنا",
      scrollCue: "مرّر للبدء",
      engKicker: "احتفال الخطوبة",
      detSub: "سيشرفنا حضوركم",
      detDate: "التاريخ",
      detTime: "الوقت",
      detVenue: "مكان الحفل",
      detLocation: "الموقع",
      mapView: "عرض الموقع",
      calAdd: "أضف إلى التقويم",
      calGoogle: "تقويم Google",
      calIcs: "آبل / iCal",
      cdKicker: "العدّ التنازلي",
      cdTitle: "عدّ اللحظات",
      cdDays: "أيام",
      cdHours: "ساعات",
      cdMinutes: "دقائق",
      cdSeconds: "ثوانٍ",
      cdMessage: "حتى يومنا المميّز",
      cdDone: "اليوم هو اليوم! ❤️",
      rsvpKicker: "تأكيد الحضور",
      rsvpTitle: "هل تشرفوننا بحضوركم؟",
      rsvpSub: "ردّكم يعني لنا الكثير",
      rsvpHead: "نرجو الردّ",
      attendQ: "هل ستُشرفنا بحضورك؟",
      attendYes: "أقبل بكل سرور",
      attendNo: "أعتذر عن الحضور",
      guestsLabel: "عدد الضيوف",
      guests1: "ضيف واحد",
      guestsN: "{n} ضيوف",
      phName: "اسمك الكامل",
      phMsg: "رسالة للعروسين (اختياري)",
      rsvpSend: "إرسال التأكيد",
      thanksH: "شكراً لكم!",
      thanksBody: "تم استلام ردّكم. لا صبر لنا للاحتفال معكم.",
      copied: "تم نسخ الرابط!",
      finaleSignoff: "بكل المحبة،",
      shareBtn: "مشاركة",
      waShare: "واتساب",
      footer: "صُنع بحب",
      catTitle: "خطوبة {his} و {her}",
      catText: "أنت مدعوّ للاحتفال بخطوبة {his} و {her}"
    }
  };

  var STORAGE_KEY = "sw_invite_lang";
  var current = "en";

  function detect() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "ar") return saved;
    } catch (e) { /* ignore */ }
    try {
      if (navigator.language && /^ar/i.test(navigator.language)) return "ar";
    } catch (e) { /* ignore */ }
    return "en";
  }

  function t(key) {
    return (DICT[current] && DICT[current][key]) || DICT.en[key] || key;
  }

  function fillPlaceholders() {
    var els = document.querySelectorAll("[data-i18n-placeholder]");
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute("data-i18n-placeholder");
      if (key) els[i].setAttribute("placeholder", t(key));
    }
  }

  function apply() {
    var root = document.documentElement;
    root.lang = current;
    root.dir = current === "ar" ? "rtl" : "ltr";

    var els = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute("data-i18n");
      if (key) els[i].textContent = t(key);
    }

    var toggle = document.getElementById("lang-toggle");
    if (toggle) toggle.textContent = current === "ar" ? t("langOther") : "عربي";

    fillPlaceholders();

    try {
      var s = window.Invite && window.Invite.settings ? window.Invite.settings.get() : null;
      if (s && s.couple && s.couple.names) {
        var title = current === "ar"
          ? t("catTitle").replace("{his}", s.couple.hisName).replace("{her}", s.couple.herName)
          : t("catTitle").replace("{names}", s.couple.names);
        document.title = title;
      } else {
        document.title = "Salem ♥ Wafaa — Our Engagement";
      }
    } catch (e) { /* ignore */ }
  }

  function set(lang) {
    if (lang !== "en" && lang !== "ar") return;
    current = lang;
    try { localStorage.setItem(STORAGE_KEY, current); } catch (e) { /* ignore */ }
    apply();
    document.dispatchEvent(new CustomEvent("sw:lang", { detail: { lang: current } }));
  }

  function init() {
    current = detect();
    apply();
  }

  function get() { return current; }

  window.Invite = window.Invite || {};
  window.Invite.i18n = { init: init, apply: apply, set: set, get: get, t: t };
})();