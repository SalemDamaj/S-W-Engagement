(function () {
  "use strict";

  if (typeof gsap !== "undefined") gsap.registerPlugin(ScrollTrigger);

  var R = false;
  try { R = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { R = false; }

  function s() {
    return window.Invite.settings.get();
  }

  function splitIntoSpans(el, heartClass) {
    var text = el.textContent;
    el.textContent = "";
    var chars = Array.from ? Array.from(text) : text.split("");
    chars.forEach(function (ch) {
      var span = document.createElement("span");
      span.className = "ch";
      if (ch === " ") {
        span.innerHTML = "&nbsp;";
        span.classList.add("ch-space");
      } else {
        span.textContent = ch;
      }
      if (heartClass && ch === "♥") span.classList.add(heartClass);
      el.appendChild(span);
    });
  }

  var scrollInited = false;
  var storyBatch = null;

  function bindStoryLines() {
    if (storyBatch) { storyBatch.forEach(function (t) { t.kill(); }); storyBatch = null; }
    var lines = document.querySelectorAll(".msg-line");
    if (!lines.length) return;
    if (R) { gsap.set(lines, { autoAlpha: 1 }); return; }
    gsap.set(lines, { autoAlpha: 0, y: 20 });
    storyBatch = ScrollTrigger.batch(lines, {
      start: "top 88%",
      once: true,
      onEnter: function (items) {
        gsap.to(items, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.25, ease: "power3.out", overwrite: true });
      }
    });
  }

  function populate() {
    var d = s();
    var L = window.Invite && window.Invite.i18n ? window.Invite.i18n.get() : "en";
    function pick(en, ar) { return L === "ar" && ar ? ar : en; }

    if (document.title === "Salem ♥ Wafaa — Our Engagement") {
      document.title = d.couple.names + " — Our Engagement";
    }

    var phrase = document.getElementById("phrase");
    if (phrase) phrase.textContent = pick(d.invite.phrase, d.invite.phraseAr);

    var names = document.getElementById("names");
    if (names) {
      names.textContent = d.couple.names;
      splitIntoSpans(names, "heart");
    }

    var gateNames = document.getElementById("gate-names");
    if (gateNames) gateNames.textContent = d.couple.hisName + " & " + d.couple.herName;

    var monograms = document.querySelectorAll("[data-load-monogram]");
    for (var m = 0; m < monograms.length; m++) {
      monograms[m].innerHTML = "";
      var node = document.createTextNode(d.couple.monogram || (d.couple.hisName.charAt(0) + " ♥ " + d.couple.herName.charAt(0)));
      monograms[m].appendChild(node);
    }

    var sections = document.querySelectorAll("[data-eng-title]");
    for (var i = 0; i < sections.length; i++) sections[i].textContent = pick(d.invite.eventTitle, d.invite.eventTitleAr);

    var story = document.getElementById("story");
    if (story) {
      story.textContent = "";
      var lines = String(pick(d.invite.story, d.invite.storyAr) || "").split("\n");
      lines.forEach(function (line, idx) {
        var p = document.createElement("p");
        p.className = "msg-line";
        p.textContent = line;
        story.appendChild(p);
        void idx;
      });
      if (scrollInited) bindStoryLines();
    }

    var dayLabel = document.getElementById("ev-day");
    if (dayLabel) dayLabel.textContent = d.event.dayLabel || "";

    var dateLabel = document.getElementById("ev-date");
    if (dateLabel) dateLabel.textContent = d.event.dateLabel || d.event.date || "";

    var timeLabel = document.getElementById("ev-time");
    if (timeLabel) timeLabel.textContent = d.event.time || "";

    var venueLabel = document.getElementById("ev-venue");
    if (venueLabel) venueLabel.textContent = d.event.venue || "";

    var locLabel = document.getElementById("ev-location");
    if (locLabel) {
      var loc = d.event.location || d.event.venue || "";
      locLabel.textContent = loc;
    }

    var mapBtn = document.getElementById("map-btn");
    if (mapBtn && d.event.mapUrl) mapBtn.href = d.event.mapUrl;

    var thank = document.getElementById("finale-message");
    if (thank) thank.textContent = pick(d.invite.thankYou, d.invite.thankYouAr);

    var finaleNames = document.getElementById("finale-names");
    if (finaleNames) finaleNames.textContent = d.couple.names;

    var shareTitle = document.getElementById("share-title");
    if (!shareTitle && d.settings && d.settings.shareTitle) {
      var meta = document.createElement("meta");
      meta.setAttribute("property", "og:title");
      meta.setAttribute("content", d.settings.shareTitle);
      document.head.appendChild(meta);
    }

    setupMedia(d);
  }

  function setupMedia(d) {
    var img = document.getElementById("media-img");
    var video = document.getElementById("media-video");
    var ph = document.getElementById("media-ph");
    var phMonogram = document.getElementById("media-ph-monogram");
    var arts = document.getElementById("media-caption");
    if (arts) arts.textContent = d.couple.names;
    var photoUrl = d.media && d.media.photo;
    var videoUrl = d.media && d.media.videoUrl;

    if (phMonogram) phMonogram.textContent = d.couple.monogram;

    if (videoUrl && video) {
      var sameVideo = video.getAttribute("src") === videoUrl;
      video.style.display = "block";
      video.poster = photoUrl || "";
      if (!sameVideo) video.setAttribute("src", videoUrl);
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.setAttribute("autoplay", "");
      video.setAttribute("playsinline", "");
      var tryPlay = function () {
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      };
      if (!sameVideo) {
        tryPlay();
        video.addEventListener("loadeddata", tryPlay);
      }
      document.addEventListener("touchstart", function once() {
        tryPlay();
        document.removeEventListener("touchstart", once);
      }, { once: true });
      return;
    }

    if (photoUrl && img) {
      var samePhoto = img.getAttribute("src") === photoUrl;
      img.style.display = "block";
      img.alt = d.media.photoAlt || d.couple.names || "";
      if (!samePhoto) {
        img.setAttribute("src", photoUrl);
        img.onload = function () { if (ph) ph.style.display = "none"; };
        img.onerror = function () { if (ph) ph.style.display = "flex"; };
      }
      if (ph) ph.style.display = "none";
    } else if (ph) {
      ph.style.display = "flex";
    }
  }

  function prepareScrollTargets() {
    var targets = document.querySelectorAll("[data-reveal]");
    gsap.set(targets, { autoAlpha: 0 });
  }

  function playIntro() {
    var tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    var gate = document.getElementById("gate");
    var phrase = document.getElementById("phrase");
    var namesBlock = document.getElementById("names-block");
    var names = document.getElementById("names");
    var underline = document.getElementById("underline");
    var heart = names ? (names.querySelector ? names.querySelector(".heart") : null) : null;
    var ourEng = document.getElementById("our-eng");
    var cue = document.getElementById("scroll-cue");
    var hero = document.getElementById("intro");

    var D = R ? 0.3 : 1;
    var dur = function (n) { return Math.max(0.25, (n || 1) * D); };

    if (gate) {
      tl.to(gate, { autoAlpha: 0, filter: "blur(8px)", scale: 1.04, duration: dur(0.8), ease: "power2.inOut" }, 0);
    }
    if (hero) tl.set(hero, { autoAlpha: 1 }, 0);

    if (phrase) {
      tl.set(phrase, { autoAlpha: 0, y: 26, filter: "blur(6px)" }, 0);
      tl.to(phrase, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: dur(1.4), ease: "power3.out" }, dur(0.3));
      tl.to(phrase, { autoAlpha: 0, y: -36, filter: "blur(8px)", duration: dur(1.0), ease: "power2.in" }, "+=" + dur(1.5));
    }

    if (namesBlock) tl.set(namesBlock, { autoAlpha: 1 }, "+=" + dur(0.2));

    if (names) {
      var chars = names.querySelectorAll(".ch");
      tl.fromTo(chars,
        { autoAlpha: 0, y: R ? 0 : 22, filter: "blur(6px)", rotation: R ? 0 : 4 },
        { autoAlpha: 1, y: 0, filter: "blur(0px)", rotation: 0, duration: dur(1.1), stagger: dur(0.05), ease: "power3.out" },
        "+=" + dur(0.15));
    }

    if (underline) {
      gsap.set(underline, { scaleX: 0, autoAlpha: 1, transformOrigin: "left center" });
      tl.to(underline, { scaleX: 1, duration: dur(1.2), ease: "power3.inOut" }, ">-=" + dur(0.4));
    }

    if (heart && !R) {
      tl.to(heart, { scale: 1.25, textShadow: "0 0 24px rgba(235,196,120,0.9)", duration: dur(0.35), yoyo: true, repeat: 3, ease: "sine.inOut" }, ">-=" + dur(1.4));
    }

    if (ourEng) {
      tl.fromTo(ourEng, { autoAlpha: 0, y: 16, filter: "blur(4px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: dur(1.0), ease: "power3.out" }, ">-=" + dur(0.7));
    }

    if (cue && !R) {
      tl.fromTo(cue, { autoAlpha: 0 }, { autoAlpha: 1, duration: dur(1.0) }, ">-=" + dur(0.4));
    } else if (cue) {
      tl.set(cue, { autoAlpha: 1 }, ">-=" + dur(0.2));
    }

    tl.call(function () {
      document.body.classList.remove("locked");
      document.body.classList.add("entered");
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });

    return tl;
  }

  function initScroll() {
    var tt = window.ScrollTrigger;
    if (!tt) return;

    var photoPanel = document.getElementById("photo");
    var img = document.getElementById("media-img");
    var video = document.getElementById("media-video");
    var veil = document.getElementById("media-veil");
    var caption = document.getElementById("media-caption");

    if (photoPanel && !R) {
      if (img) {
        gsap.fromTo(img, { scale: 1.22, transformOrigin: "50% 50%" }, {
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: photoPanel, start: "top bottom", end: "center center", scrub: true }
        });
      }
      if (video) {
        gsap.fromTo(video, { scale: 1.18 }, {
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: photoPanel, start: "top bottom", end: "center center", scrub: true }
        });
      }
      if (veil) {
        gsap.fromTo(veil, { xPercent: -60, autoAlpha: 0.55 }, {
          xPercent: 30,
          autoAlpha: 0,
          ease: "none",
          scrollTrigger: { trigger: photoPanel, start: "top bottom", end: "bottom top", scrub: true }
        });
      }
      if (caption) {
        gsap.fromTo(caption, { autoAlpha: 0, y: 20 }, {
          autoAlpha: 1,
          y: 0,
          ease: "none",
          scrollTrigger: { trigger: photoPanel, start: "top bottom", end: "top 55%", scrub: true }
        });
      }
      gsap.fromTo(document.getElementById("photo-deco"),
        { autoAlpha: 0, scale: 0.9 },
        {
          autoAlpha: 1,
          scale: 1,
          scrollTrigger: { trigger: photoPanel, start: "top 80%" }
        });
    }

    var root = {
      photo: document.getElementById("photo-deco"),
      message: document.getElementById("message"),
      details: document.getElementById("details"),
      countdown: document.getElementById("countdown"),
      rsvp: document.getElementById("rsvp"),
      finale: document.getElementById("finale")
    };

    var reveals = document.querySelectorAll("[data-reveal]");
    if (reveals.length && !R) {
      ScrollTrigger.batch(reveals, {
        start: "top 82%",
        once: true,
        onEnter: function (items) {
          gsap.to(items, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.1, stagger: 0.12, ease: "power3.out", overwrite: true });
        }
      });
    } else if (reveals.length) {
      gsap.set(reveals, { autoAlpha: 1 });
    }

    scrollInited = true;
    bindStoryLines();

    ["message", "countdown", "rsvp", "finale"].forEach(function (id) {
      var el = root[id];
      if (!el) return;
      tt.create({
        trigger: el,
        start: "top 75%",
        once: true,
        onEnter: function () {
          var t = el.querySelectorAll("[data-reveal-soft]");
          gsap.to(t, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.15, ease: "power2.out", overwrite: true });
        }
      });
    });

    if (tt.config) tt.config({ ignoreMobileResize: true });
  }

  window.Invite = window.Invite || {};
  window.Invite.animations = {
    populate: populate,
    prepareScrollTargets: prepareScrollTargets,
    playIntro: playIntro,
    initScroll: initScroll
  };
})();