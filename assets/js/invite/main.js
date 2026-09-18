(function () {
  "use strict";

  var opened = false;

  function $(id) { return document.getElementById(id); }

  function preloadMedia(d) {
    var tasks = [];
    var photo = d.media && d.media.photo;
    if (photo) {
      tasks.push(new Promise(function (resolve) {
        var im = new Image();
        im.onload = resolve;
        im.onerror = resolve;
        im.src = photo;
      }));
    }
    var music = d.media && d.media.musicUrl;
    if (music) {
      tasks.push(new Promise(function (resolve) {
        var a = new Audio();
        a.preload = "metadata";
        a.src = music;
        a.addEventListener("loadedmetadata", resolve, { once: true });
        a.addEventListener("error", resolve, { once: true });
      }));
    }
    return Promise.all(tasks);
  }

  function minTime(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function wireMusic() {
    var btn = $("music-toggle");
    if (!btn) return;
    var s = window.Invite.settings.get();
    var enabled = s.settings && s.settings.musicEnabled;
    if (!enabled && btn) { btn.classList.add("disabled"); btn.setAttribute("aria-disabled", "true"); }
    btn.addEventListener("click", function () {
      if (!window.Invite.audio.hasMusic()) return;
      var playingNow = window.Invite.audio.toggle();
      btn.classList.toggle("is-on", playingNow);
    });
  }

  function wireGate() {
    var btn = $("open-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (opened) return;
      opened = true;
      btn.classList.add("is-busy");
      if (window.Invite.audio.hasMusic()) {
        window.Invite.audio.play();
        var mt = $("music-toggle");
        if (mt) { mt.classList.add("is-on"); mt.classList.remove("disabled"); }
      }
      window.Invite.animations.playIntro();
      setTimeout(function () {
        document.body.classList.remove("locked");
        document.body.classList.add("entered");
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      }, 10000);
    }, { once: true });
  }

  function wireShare() {
    var d = window.Invite.settings.get();
    function shareData() {
      var i18n = window.Invite.i18n;
      var names = d.couple.names;
      var text;
      if (i18n.get() === "ar") {
        text = i18n.t("catText").replace("{his}", d.couple.hisName).replace("{her}", d.couple.herName);
      } else {
        text = d.settings.shareText || ("You're invited to the engagement celebration of " + names + ".");
      }
      return {
        title: d.settings.shareTitle || "Salem ♥ Wafaa — Our Engagement",
        text: text,
        url: location.href
      };
    }
    var btn = $("share-btn");
    if (btn) {
      btn.addEventListener("click", function () {
        var data = shareData();
        if (navigator.share) {
          navigator.share(data).catch(function () {});
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(location.href).then(function () {
            var original = btn.textContent;
            btn.textContent = window.Invite.i18n.t("copied");
            setTimeout(function () { btn.textContent = original; }, 2000);
          });
        }
      });
    }
    var waBtn = $("wa-btn");
    if (waBtn) {
      waBtn.addEventListener("click", function () {
        var data = shareData();
        var text = data.title + "\n\n" + data.text + "\n" + data.url;
        window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
      });
    }
  }

  function wireLang() {
    var toggle = $("lang-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", function () {
      var i18n = window.Invite.i18n;
      i18n.set(i18n.get() === "ar" ? "en" : "ar");
    });
    document.addEventListener("sw:lang", function () {
      window.Invite.animations.populate();
      if (window.Invite.rsvp && window.Invite.rsvp.refresh) window.Invite.rsvp.refresh();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  }

  function hidePreloader() {
    var p = $("preloader");
    if (!p) return;
    p.classList.add("drop");
    setTimeout(function () {
      p.classList.add("gone");
    }, 900);
  }

  async function boot() {
    var d = await window.Invite.settings.load();
    window.Invite.i18n.init();
    window.Invite.particles.start();

    window.Invite.animations.populate();
    window.Invite.animations.prepareScrollTargets();

    await Promise.all([preloadMedia(d), (document.fonts ? document.fonts.ready : Promise.resolve()), minTime(1600)]);
    hidePreloader();

    $("gate") && $("gate").classList.add("show");

    window.Invite.rsvp.init();
    window.Invite.countdown.init();
    window.Invite.calendar.init();
    wireMusic();
    wireGate();
    wireShare();
    wireLang();

    window.Invite.animations.initScroll();

    window.addEventListener("load", function () {
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();