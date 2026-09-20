(function () {
  "use strict";

  /* Invitation card renderer (admin only).
     Renders a 1200x1600 portrait invitation card to a canvas using the
     couple / invite / event settings plus a chosen background. */

  var PRESETS = {
    charcoal: { base: "#0f0f0c", deep: "#0a0908", glow: "#372a0f", text: "#f6eedd", accent: "#e7cf96", muted: "#b9a87f", dark: true },
    ivory:    { base: "#f4ecda", deep: "#e5d6b4", glow: "#fff6e0", text: "#3a2e1b", accent: "#a97f2f", muted: "#7d6a41", dark: false },
    emerald:  { base: "#0b1e14", deep: "#071409", glow: "#1e4630", text: "#f2edd9", accent: "#e7cf96", muted: "#b9c9a2", dark: true },
    rose:     { base: "#28090e", deep: "#180406", glow: "#5c1d26", text: "#f7e9e1", accent: "#e7cf96", muted: "#e3b7a9", dark: true },
    navy:     { base: "#0d1424", deep: "#080c16", glow: "#243b60", text: "#f1eee0", accent: "#e7cf96", muted: "#bcc7de", dark: true }
  };

  var fontsReady = null;
  function ensureFonts() {
    if (fontsReady) return fontsReady;
    if (!document.fonts || !document.fonts.load) {
      fontsReady = Promise.resolve();
      return fontsReady;
    }
    var loads = [
      document.fonts.load('140px "Great Vibes"'),
      document.fonts.load('italic 400 110px "Cormorant Garamond"'),
      document.fonts.load('400 30px Montserrat'),
      document.fonts.load('300 30px Montserrat'),
      document.fonts.load('400 60px Cairo'),
      document.fonts.load('700 60px Cairo'),
      document.fonts.load('italic 400 40px "Noto Naskh Arabic"')
    ];
    fontsReady = Promise.all(loads).catch(function () {});
    return fontsReady;
  }

  function loadImage(url) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = url;
    });
  }

  function coverDraw(ctx, img, W, H) {
    var sw = img.naturalWidth || img.width || 1;
    var sh = img.naturalHeight || img.height || 1;
    var scale = Math.max(W / sw, H / sh);
    var w = sw * scale;
    var h = sh * scale;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawnWidth(ctx, text, spacing) {
    var total = 0;
    for (var i = 0; i < text.length; i++) {
      total += ctx.measureText(text[i]).width + spacing;
    }
    return total - spacing;
  }

  function spaced(ctx, text, cx, y, weight, size, face, spacing, color, shadow) {
    ctx.font = weight + " " + size + "px " + face;
    ctx.fillStyle = color;
    if (shadow) {
      ctx.shadowColor = shadow;
      ctx.shadowBlur = 26;
    }
    var x = cx - drawnWidth(ctx, text, spacing) / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    for (var i = 0; i < text.length; i++) {
      ctx.fillText(text[i], x, y);
      x += ctx.measureText(text[i]).width + spacing;
    }
    ctx.shadowBlur = 0;
  }

  function spacedFit(ctx, text, cx, y, maxW, start, min, weight, face, spacing, color, shadow) {
    weight = weight || "";
    spacing = spacing || 0;
    var s = Math.max(min, start);
    ctx.font = weight + " " + s + "px " + face;
    var pad = text.length > 0 ? spacing * (text.length - 1) : 0;
    while (s > min && ctx.measureText(text).width + pad > maxW) {
      s -= 4;
      pad = text.length > 0 ? spacing * (text.length - 1) : 0;
      ctx.font = weight + " " + s + "px " + face;
    }
    ctx.font = weight + " " + s + "px " + face;
    spaced(ctx, text, cx, y, weight, s, face, spacing, color, shadow);
    return s;
  }

  /* Arabic text is drawn as a WHOLE string (never per-glyph — the letters join
     into ligature forms, so per-glyph spacing would break shaping) and right
     to left. These helpers rely on the working font (from ensureFonts) carrying
     Arabic glyphs and on canvas handling of RTL direction + bi-directional runs. */
  function arFit(ctx, text, cx, y, maxW, start, min, weight, face, color, shadow) {
    weight = weight || "";
    var s = Math.max(min, start);
    ctx.font = weight + " " + s + "px " + face;
    while (s > min && ctx.measureText(text).width > maxW) {
      s -= 4;
      ctx.font = weight + " " + s + "px " + face;
    }
    ctx.font = weight + " " + s + "px " + face;
    ctx.save();
    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = 26; }
    ctx.fillText(text, cx, y);
    ctx.restore();
    return s;
  }

  function arText(ctx, text, cx, y, weight, size, face, color, shadow) {
    ctx.save();
    ctx.direction = "rtl";
    ctx.font = weight + " " + size + "px " + face;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = 26; }
    ctx.fillText(text, cx, y);
    ctx.restore();
  }

  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(String(iso).replace(/\./g, "-") + "T00:00:00");
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).toUpperCase();
  }

  function drawBackground(ctx, W, H, preset, img) {
    var cx = W / 2;
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, preset.base);
    g.addColorStop(1, preset.deep);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    var glow = ctx.createRadialGradient(cx, 380, 40, cx, 460, 820);
    glow.addColorStop(0, preset.glow);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = preset.dark ? 0.95 : 0.55;
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    if (img) {
      coverDraw(ctx, img, W, H);
      var veil = ctx.createLinearGradient(0, 0, 0, H);
      veil.addColorStop(0, "rgba(0,0,0,0.6)");
      veil.addColorStop(0.4, "rgba(0,0,0,0.24)");
      veil.addColorStop(0.62, "rgba(0,0,0,0.3)");
      veil.addColorStop(1, "rgba(0,0,0,0.66)");
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, W, H);
    } else if (preset.dark) {
      var vin = ctx.createRadialGradient(cx, H / 2, 320, cx, H / 2, 980);
      vin.addColorStop(0, "rgba(0,0,0,0)");
      vin.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = vin;
      ctx.fillRect(0, 0, W, H);
    } else {
      var tint = ctx.createLinearGradient(0, 0, 0, H);
      tint.addColorStop(0, "rgba(255,255,255,0.5)");
      tint.addColorStop(1, "rgba(0,0,0,0.05)");
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawFrame(ctx, W, H, preset) {
    ctx.strokeStyle = preset.accent;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 3;
    rrect(ctx, 42, 42, W - 84, H - 84, 26);
    ctx.stroke();

    ctx.globalAlpha = 0.32;
    ctx.lineWidth = 1;
    rrect(ctx, 58, 58, W - 116, H - 116, 18);
    ctx.stroke();

    var cx = W / 2;
    ctx.fillStyle = preset.accent;
    ctx.fillRect(cx - 96, 118, 192, 1);
    ctx.fillRect(cx - 96, H - 138, 192, 1);
    ctx.globalAlpha = 1;
  }

  function drawOrnament(ctx, cx, y, p, size) {
    ctx.fillStyle = p.accent;
    ctx.fillRect(cx - 170, y, 106, 1.5);
    ctx.fillRect(cx + 64, y, 106, 1.5);
    ctx.save();
    ctx.translate(cx, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = 22;
    ctx.font = size + 'px "Cormorant Garamond", serif';
    ctx.fillStyle = p.accent;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("❦", cx, y);
    ctx.shadowBlur = 0;
  }

  function drawContent(ctx, W, H, p, C) {
      var cx = W / 2;
      var text = p.text;
      var accent = p.accent;
      var muted = p.muted;

      if (C.rtl) { drawContentAr(ctx, W, H, p, C); return; }

      /* Rest of drawContent (English, per-glyph) follows unchanged. */
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    if (C.kicker) {
      spacedFit(ctx, C.kicker.toUpperCase(), cx, 302, W - 400, 26, 13, "300", '"Montserrat", sans-serif', 9, accent, accent);
    }

    if (C.monogram) {
      spaced(ctx, C.monogram, cx, 458, "", 138, '"Great Vibes", cursive', 0, accent, accent);
    }

    if (C.names) {
      spacedFit(ctx, C.names, cx, 712, W - 380, 116, 40, "italic 400", '"Cormorant Garamond", serif', 2, text, null);
    }

    if (C.title) {
      spacedFit(ctx, C.title.toUpperCase(), cx, 820, W - 400, 30, 14, "500", '"Montserrat", sans-serif', 14, accent, null);
    }

    drawOrnament(ctx, cx, 906, p, 46);

    var msgEnd = 906;
    if (C.message.length) {
      ctx.globalAlpha = 0.96;
      for (var m = 0; m < C.message.length; m++) {
        msgEnd = 988 + m * 46;
        spacedFit(ctx, C.message[m], cx, msgEnd, W - 380, 40, 22, "italic 400", '"Cormorant Garamond", serif', 1, text, null);
      }
      ctx.globalAlpha = 1;
    }

    var compact = C.message.length > 0;
    var dateY = compact ? msgEnd + 58 : 1088;
    var timeY = dateY + (compact ? 80 : 92);
    var venueY = timeY + (compact ? 110 : 126);
    var locationY = venueY + (compact ? 72 : 82);
    var dividerY = locationY + (compact ? 50 : 54);

    if (C.date) {
      spacedFit(ctx, C.date, cx, dateY, W - 380, 46, 22, "italic 400", '"Cormorant Garamond", serif', 3, text, null);
    }

    if (C.time) {
      spacedFit(ctx, C.time.toUpperCase(), cx, timeY, W - 420, 30, 16, "300", '"Montserrat", sans-serif', 10, accent, null);
    }

    if (C.venue) {
      spacedFit(ctx, C.venue, cx, venueY, W - 400, 48, 26, "italic 400", '"Cormorant Garamond", serif', 2, text, null);
    }

    if (C.location) {
      spacedFit(ctx, C.location, cx, locationY, W - 420, 25, 15, "300", '"Montserrat", sans-serif', 5, muted, null);
    }

    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(cx - 130, dividerY, 260, 1);
    ctx.globalAlpha = 1;

    if (C.invitee) {
      spacedFit(ctx, C.invitee, cx, dividerY + 42, W - 360, 44, 26, "italic 500", '"Cormorant Garamond", serif', 1, accent, accent);
    } else if (C.footer) {
      spacedFit(ctx, C.footer, cx, dividerY + 44, W - 360, 36, 20, "italic 400", '"Cormorant Garamond", serif', 1, muted, null);
    } else if (C.monogram) {
      spaced(ctx, C.monogram, cx, dividerY + 40, "", 66, '"Great Vibes", cursive', 0, accent, accent);
    }

    var gLabel = C.guests === 1 ? "1 guest allowed" : (C.guests + " guests allowed");
    var guestsY = Math.min(dividerY + 86, 1476);
    spacedFit(ctx, gLabel.toUpperCase(), cx, guestsY, W - 420, 23, 15, "500", '"Montserrat", sans-serif', 7, muted, null);
  }

  function drawContentAr(ctx, W, H, p, C) {
    var cx = W / 2;
    var text = p.text;
    var accent = p.accent;
    var muted = p.muted;
    var arFace = '"Noto Naskh Arabic", serif';

    if (C.kicker) {
      arFit(ctx, C.kicker, cx, 304, W - 400, 26, 17, "400", '"Cairo", sans-serif', accent, accent);
    }

    if (C.monogram) {
      spaced(ctx, C.monogram, cx, 458, "", 138, '"Great Vibes", cursive', 0, accent, accent);
    }

    if (C.names) {
      arFit(ctx, C.names, cx, 712, W - 380, 108, 44, "italic 400", '"Cormorant Garamond", serif', text, null);
    }

    if (C.title) {
      arFit(ctx, C.title, cx, 820, W - 400, 30, 20, "500", '"Montserrat", sans-serif', accent, null);
    }

    drawOrnament(ctx, cx, 906, p, 46);

    var msgEnd = 906;
    if (C.message.length) {
      ctx.globalAlpha = 0.96;
      for (var m = 0; m < C.message.length; m++) {
        msgEnd = 988 + m * 46;
        arFit(ctx, C.message[m], cx, msgEnd, W - 380, 40, 22, "italic 400", '"Cormorant Garamond", serif', text, null);
      }
      ctx.globalAlpha = 1;
    }

    var compact = C.message.length > 0;
    var dateY = compact ? msgEnd + 58 : 1088;
    var timeY = dateY + (compact ? 80 : 92);
    var venueY = timeY + (compact ? 110 : 126);
    var locationY = venueY + (compact ? 72 : 82);
    var dividerY = locationY + (compact ? 50 : 54);

    if (C.date) {
      arFit(ctx, C.date, cx, dateY, W - 380, 44, 26, "italic 400", '"Cormorant Garamond", serif', text, null);
    }

    if (C.time) {
      arText(ctx, C.time, cx, timeY, "300", 32, '"Montserrat", sans-serif', accent, null);
    }

    if (C.venue) {
      arFit(ctx, C.venue, cx, venueY, W - 400, 46, 28, "italic 400", '"Cormorant Garamond", serif', text, null);
    }

    if (C.location) {
      arFit(ctx, C.location, cx, locationY, W - 420, 28, 19, "300", '"Montserrat", sans-serif', muted, null);
    }

    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(cx - 130, dividerY, 260, 1);
    ctx.globalAlpha = 1;

    if (C.invitee) {
      arText(ctx, C.invitee, cx, dividerY + 38, "italic 500", 45, '"Cormorant Garamond", serif', accent, accent);
    }

    var gLabel = C.guests === 1 ? "\u0636\u064a\u0641 \u0648\u0627\u062d\u062f \u0645\u0633\u0645\u0648\u062d \u0628\u0647" : (C.guests + " \u0636\u064a\u0648\u0641 \u0645\u0633\u0645\u0648\u062d \u0628\u0647\u0645");
    var guestsY = Math.min(dividerY + 96, 1440);
    arText(ctx, gLabel, cx, guestsY, "500", 40, arFace, muted, null);
  }
  function paint(data, bg, opts) {
    var W = 1200;
    var H = 1600;
    var canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext("2d");

    var preset = PRESETS[bg && bg.background] || PRESETS.charcoal;
    var couple = data && data.couple ? data.couple : {};
    var invite = data && data.invite ? data.invite : {};
    var event = data && data.event ? data.event : {};
    var custom = (data && data.design && data.design.card && data.design.card.custom) || {};
    var imageUrl = bg && bg.image;

    function pick(key, fallback) {
      var c = custom[key];
      if (c === undefined || c === null) return fallback;
      c = String(c);
      if (c.trim() === "") return fallback;
      return c;
    }

    var lang = (opts && opts.lang) || "en";
    var useAr = lang === "ar";

    /* Arabic caption source chain, per field:
         custom.<key>Ar  →  invite.<keyAr>  →  the English pick below. */
    function pickAr(key, keyAr, enFallback) {
      var v = pick(key + "Ar", "");
      if (v) return v;
      if (invite && invite[keyAr]) {
        v = String(invite[keyAr]).trim();
        if (v) return v;
      }
      return enFallback;
    }

    opts = opts || {};
    var useAr = opts.lang === "ar";

    /* Arabic caption chain, per key: custom.<key>Ar → invite.<keyAr> → English. */
    function pickAr(key, keyAr, enFallback) {
      var v = pick(key + "Ar", "");
      if (v) return v;
      if (invite[keyAr]) {
        v = String(invite[keyAr]).trim();
        if (v) return v;
      }
      return enFallback;
    }

    var C = {
      rtl: useAr,
      names: useAr ? pickAr("names", "namesAr", pick("names", couple.names)) : pick("names", couple.names),
      monogram: pick("monogram", couple.monogram),
      kicker: useAr ? pickAr("kicker", "kickerAr", pick("kicker", invite.kicker)) : pick("kicker", invite.kicker),
      title: useAr ? pickAr("title", "eventTitleAr", pick("title", invite.eventTitle)) : pick("title", invite.eventTitle),
      date: pick("date", event.dateLabel || formatDate(event.date)),
      time: pick("time", event.time),
      venue: pick("venue", event.venue),
      location: pick("location", event.location),
      footer: pick("footer", ""),
      message: []
    };
    var msg = pick("message", "");
    C.message = msg ? String(msg).split("\n") : [];

    opts = opts || {};
    C.guests = Math.max(1, Math.min(50, Number(opts.guests) || 1));
    if (opts.inviteeName && String(opts.inviteeName).trim()) {
      C.invitee = String(opts.inviteeName).trim();
    }

    return Promise.all([ensureFonts(), imageUrl ? loadImage(imageUrl) : Promise.resolve(null)]).then(function (r) {
      var img = imageUrl ? r[1] : null;
      drawBackground(ctx, W, H, preset, img);
      drawFrame(ctx, W, H, preset);
      drawContent(ctx, W, H, preset, C);
      return canvas;
    });
  }

  window.InviteCard = { paint: paint };
})();