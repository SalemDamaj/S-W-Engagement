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
    var btn = $("share-btn");
    if (!btn) return;
    var d = window.Invite.settings.get();
    var data = {
      title: d.settings.shareTitle || "Salem ♥ Wafaa — Our Engagement",
      text: d.settings.shareText || "You're invited to the engagement celebration.",
      url: location.href
    };
    btn.addEventListener("click", function () {
      if (navigator.share) {
        navigator.share(data).catch(function () {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(location.href).then(function () {
          var original = btn.textContent;
          btn.textContent = "Link copied!";
          setTimeout(function () { btn.textContent = original; }, 2000);
        });
      }
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
    window.Invite.particles.start();

    window.Invite.animations.populate();
    window.Invite.animations.prepareScrollTargets();

    await Promise.all([preloadMedia(d), (document.fonts ? document.fonts.ready : Promise.resolve()), minTime(1600)]);
    hidePreloader();

    $("gate") && $("gate").classList.add("show");

    window.Invite.rsvp.init();
    window.Invite.countdown.init();
    wireMusic();
    wireGate();
    wireShare();

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