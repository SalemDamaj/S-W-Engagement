(function () {
  "use strict";

  /* Invitation card renderer (admin only).
     Renders a 1200x1600 portrait invitation card to a canvas using the
     couple / invite / event settings plus a chosen background. */

  var PRESETS = {
    charcoal: { base: "#0f0f0c", deep: "#0a0908", glow: "#372a0f", text: "#f6eedd", accent: "#d4af37", muted: "#b9a87f", dark: true },
    ivory:    { base: "#f4ecda", deep: "#e5d6b4", glow: "#fff6e0", text: "#3a2e1b", accent: "#a97f2f", muted: "#7d6a41", dark: false },
    emerald:  { base: "#0b1e14", deep: "#071409", glow: "#1e4630", text: "#f2edd9", accent: "#d4af37", muted: "#b9c9a2", dark: true },
    rose:     { base: "#28090e", deep: "#180406", glow: "#5c1d26", text: "#f7e9e1", accent: "#d4af37", muted: "#e3b7a9", dark: true },
    navy:     { base: "#0d1424", deep: "#080c16", glow: "#243b60", text: "#f1eee0", accent: "#d4af37", muted: "#bcc7de", dark: true },
    photo:    { base: "#191512", deep: "#0b0908", glow: "#3d2f14", text: "#f8f2e4", accent: "#d4af37", muted: "#cdbf9d", dark: true },
    "photo-ar": { base: "#191512", deep: "#0b0908", glow: "#3d2f14", text: "#f8f2e4", accent: "#d4af37", muted: "#cdbf9d", dark: true }
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
      document.fonts.load('italic 400 40px "Noto Naskh Arabic"'),
      document.fonts.load('700 100px "Noto Naskh Arabic"'),
      document.fonts.load('500 50px Cairo')
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

  /* Arabic text is drawn as a WHOLE string (never per-glyph - the letters join
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

  /* Arabic-Indic digits 0-9, so guest counts read naturally in Arabic. */
  function arNum(n) {
    return String(n).replace(/[0-9]/g, function (d) {
      return String.fromCharCode(0x0660 + Number(d));
    });
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
      /* layered soft veil: dark at top and bottom where text sits, lighter mid */
      var veil = ctx.createLinearGradient(0, 0, 0, H);
      veil.addColorStop(0, "rgba(8,6,4,0.82)");
      veil.addColorStop(0.28, "rgba(8,6,4,0.46)");
      veil.addColorStop(0.5, "rgba(8,6,4,0.42)");
      veil.addColorStop(0.72, "rgba(8,6,4,0.52)");
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, W, H);
      /* soft gold halo behind the crest / monogram zone so text floats */
      var halo = ctx.createRadialGradient(cx, 470, 30, cx, 470, 580);
      halo.addColorStop(0, "rgba(212,175,55,0.16)");
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
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
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 3;
    rrect(ctx, 42, 42, W - 84, H - 84, 26);
    ctx.stroke();

    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 1;
    rrect(ctx, 58, 58, W - 116, H - 116, 18);
    ctx.stroke();

    var cx = W / 2;
    ctx.globalAlpha = 1;
    ctx.fillStyle = preset.accent;
    /* slim headpiece rule near the top, the sole fixed horizontal accent */
    ctx.fillRect(cx - 110, 120, 220, 1.4);
    ctx.save();
    ctx.translate(cx, 120);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
    ctx.globalAlpha = 0.4;
    ctx.fillRect(cx - 60, 120, 120, 0.7);
    ctx.globalAlpha = 1;
  }

  function drawOrnament(ctx, cx, y, p, size) {
    ctx.fillStyle = p.accent;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(cx - 182, y, 88, 1.2);
    ctx.fillRect(cx + 94, y, 88, 1.2);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(cx - 34, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-2.6, -2.6, 5.2, 5.2);
    ctx.restore();
    ctx.save();
    ctx.translate(cx + 34, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-2.6, -2.6, 5.2, 5.2);
    ctx.restore();
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = 20;
    ctx.font = size + 'px "Cormorant Garamond", serif';
    ctx.fillStyle = p.accent;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("\u2766", cx, y);
    ctx.shadowBlur = 0;
  }

  /* Arabic ornament: symmetric rules + a five-pointed star (U+066D), which
     stays centered and therefore reads fine in an RTL layout. */
  function drawOrnamentAr(ctx, cx, y, p, size) {
    ctx.fillStyle = p.accent;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(cx - 196, y, 100, 1.1);
    ctx.fillRect(cx + 96, y, 100, 1.1);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(cx - 152, y);
    ctx.rotate(-Math.PI / 4);
    ctx.fillRect(-2.4, -2.4, 4.8, 4.8);
    ctx.restore();
    ctx.save();
    ctx.translate(cx + 152, y);
    ctx.rotate(-Math.PI / 4);
    ctx.fillRect(-2.4, -2.4, 4.8, 4.8);
    ctx.restore();
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = 18;
    ctx.font = size + 'px "Cormorant Garamond", serif, "Noto Naskh Arabic", serif';
    ctx.fillStyle = p.accent;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("\u066D", cx, y);
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
      spaced(ctx, C.monogram, cx, 456, "", 132, '"Great Vibes", cursive', 0, accent, accent);
    }

    if (C.names) {
      spacedFit(ctx, C.names, cx, 706, W - 380, 112, 40, "italic 400", '"Cormorant Garamond", serif', 2, text, null);
    }

    if (C.title) {
      spacedFit(ctx, C.title.toUpperCase(), cx, 806, W - 420, 30, 13, "500", '"Montserrat", sans-serif', 14, accent, null);
    }

    drawOrnament(ctx, cx, 892, p, 44);

    var msgEnd = 892;
    /* Fixed 1200x1600 canvas: cap rendered message lines at 6 so the foot and
       the mandatory guests line always fit without collision. */
    var mLines = Math.min(C.message.length, 6);
    var step = mLines >= 5 ? 38 : 44;
    var afterMsg, dateY, timeY, venueY, locationY, dividerY, footY;
    for (; ; ) {
      afterMsg = mLines ? 966 + (mLines - 1) * step : 0;
      dateY = mLines ? afterMsg + 54 : 1096;
      timeY = dateY + (mLines >= 4 ? 56 : mLines ? 64 : 80);
      venueY = timeY + (mLines >= 4 ? 74 : mLines ? 86 : 102);
      locationY = venueY + (mLines >= 4 ? 46 : mLines ? 52 : 62);
      dividerY = locationY + (mLines >= 4 ? 36 : mLines ? 42 : 48);
      footY = dividerY + 44;
      if (footY <= 1496 || step <= 20) break;
      step -= 4;
    }
    var guestsY = Math.min(footY + 46, 1520);

    if (mLines) {
      ctx.globalAlpha = 0.96;
      for (var m = 0; m < mLines; m++) {
        msgEnd = 966 + m * step;
        spacedFit(ctx, C.message[m], cx, msgEnd, W - 380, 40, 22, "italic 400", '"Cormorant Garamond", serif', 1, text, null);
      }
      ctx.globalAlpha = 1;
    }

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
      spacedFit(ctx, C.invitee, cx, footY, W - 360, 44, 26, "italic 500", '"Cormorant Garamond", serif', 1, accent, accent);
    } else if (C.footer) {
      spacedFit(ctx, C.footer, cx, footY + 2, W - 360, 36, 20, "italic 400", '"Cormorant Garamond", serif', 1, muted, null);
    } else if (C.monogram) {
      spaced(ctx, C.monogram, cx, footY, "", 64, '"Great Vibes", cursive', 0, accent, accent);
    }

    var gLabel = C.guests === 1 ? "1 guest allowed" : (C.guests + " guests allowed");
    spacedFit(ctx, gLabel.toUpperCase(), cx, guestsY, W - 420, 23, 15, "500", '"Montserrat", sans-serif', 7, muted, null);
  }

  function drawContentAr(ctx, W, H, p, C) {
    var cx = W / 2;
    var text = p.text;
    var accent = p.accent;
    var muted = p.muted;
    var arBody = '"Noto Naskh Arabic", serif';
    var arHead = '"Cairo", sans-serif';

    if (C.kicker) {
      arFit(ctx, C.kicker, cx, 302, W - 380, 29, 20, "600", arHead, accent, accent);
    }

    if (C.monogram) {
      spaced(ctx, C.monogram, cx, 456, "", 132, '"Great Vibes", cursive', 0, accent, accent);
    }

    if (C.names) {
      arFit(ctx, C.names, cx, 706, W - 400, 118, 48, "700", arBody, text, null);
    }

    if (C.title) {
      arFit(ctx, C.title, cx, 806, W - 420, 33, 22, "700", arHead, accent, null);
    }

    drawOrnamentAr(ctx, cx, 892, p, 40);

    var msgEnd = 892;
    /* Same fixed-canvas cap as the English painter: max 6 message lines. */
    var mLines = Math.min(C.message.length, 6);
    var step = mLines >= 5 ? 40 : 48;
    var afterMsg, dateY, timeY, venueY, locationY, dividerY, footY;
    for (; ; ) {
      afterMsg = mLines ? 966 + (mLines - 1) * step : 0;
      dateY = mLines ? afterMsg + 56 : 1096;
      timeY = dateY + (mLines >= 4 ? 58 : mLines ? 66 : 82);
      venueY = timeY + (mLines >= 4 ? 80 : mLines ? 92 : 108);
      locationY = venueY + (mLines >= 4 ? 48 : mLines ? 56 : 66);
      dividerY = locationY + (mLines >= 4 ? 38 : mLines ? 44 : 50);
      footY = dividerY + 46;
      if (footY <= 1474 || step <= 24) break;
      step -= 4;
    }
    var guestsY = Math.min(footY + 48, 1524);

    if (mLines) {
      ctx.globalAlpha = 0.96;
      for (var m = 0; m < mLines; m++) {
        msgEnd = 966 + m * step;
        arFit(ctx, C.message[m], cx, msgEnd, W - 380, 42, 24, "400", arBody, text, null);
      }
      ctx.globalAlpha = 1;
    }

    if (C.date) {
      arFit(ctx, C.date, cx, dateY, W - 380, 46, 30, "400", arBody, text, null);
    }

    if (C.time) {
      arText(ctx, C.time, cx, timeY, "600", 34, arHead, accent, null);
    }

    if (C.venue) {
      arFit(ctx, C.venue, cx, venueY, W - 400, 50, 32, "500", arBody, text, null);
    }

    if (C.location) {
      arFit(ctx, C.location, cx, locationY, W - 420, 31, 21, "400", arHead, muted, null);
    }

    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(cx - 130, dividerY, 260, 1);
    ctx.globalAlpha = 1;

    if (C.invitee) {
      arText(ctx, C.invitee, cx, footY, "600", 46, arBody, accent, accent);
    } else if (C.footer) {
      arText(ctx, C.footer, cx, footY + 2, "400", 34, arBody, muted, null);
    }

    var gLabel = C.guests === 1
      ? "\u0636\u064a\u0641 \u0648\u0627\u062d\u062f \u0645\u0633\u0645\u0648\u062d \u0628\u0647"
      : (arNum(C.guests) + " \u0636\u064a\u0648\u0641 \u0645\u0633\u0645\u0648\u062d \u0628\u0647\u0645");
    arText(ctx, gLabel, cx, guestsY, "600", 42, arHead, muted, null);
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

    opts = opts || {};
    var useAr = opts.lang === "ar";

    /* Arabic caption source chain, per field:
         custom.<key>Ar -> invite.<keyAr> -> the English pick below. */
    function pickAr(key, keyAr, enFallback) {
      var v = pick(key + "Ar", "");
      if (v) return v;
      if (invite && invite[keyAr]) {
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

  window.InviteCard = { paint: paint, PRESETS: PRESETS };
})();