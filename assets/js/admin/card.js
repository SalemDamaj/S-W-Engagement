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
      document.fonts.load('300 30px Montserrat')
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

  function drawContent(ctx, W, H, p, couple, invite, event) {
    var cx = W / 2;
    var text = p.text;
    var accent = p.accent;
    var muted = p.muted;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    var kicker = String(invite.kicker || "").trim();
    if (kicker) {
      spacedFit(ctx, kicker.toUpperCase(), cx, 302, W - 400, 26, 13, "300", '"Montserrat", sans-serif', 9, accent, accent);
    }

    var monogram = String(couple.monogram || "S ♥ W");
    spaced(ctx, monogram, cx, 458, "", 138, '"Great Vibes", cursive', 0, accent, accent);

    var names = String(couple.names || "").trim();
    if (names) {
      spacedFit(ctx, names, cx, 712, W - 380, 116, 40, "italic 400", '"Cormorant Garamond", serif', 2, text, null);
    }

    var title = String(invite.eventTitle || "").trim();
    if (title) {
      spacedFit(ctx, title.toUpperCase(), cx, 820, W - 400, 30, 14, "500", '"Montserrat", sans-serif', 14, accent, null);
    }

    drawOrnament(ctx, cx, 906, p, 46);

    var dateLabel = String(event.dateLabel || "").trim() || formatDate(event.date);
    if (dateLabel) {
      spacedFit(ctx, dateLabel, cx, 1088, W - 380, 46, 22, "italic 400", '"Cormorant Garamond", serif', 3, text, null);
    }

    var time = String(event.time || "").trim();
    if (time) {
      spacedFit(ctx, time.toUpperCase(), cx, 1184, W - 420, 30, 16, "300", '"Montserrat", sans-serif', 10, accent, null);
    }

    var venue = String(event.venue || "").trim();
    if (venue) {
      spacedFit(ctx, venue, cx, 1312, W - 400, 48, 26, "italic 400", '"Cormorant Garamond", serif', 2, text, null);
    }

    var location = String(event.location || "").trim();
    if (location) {
      spacedFit(ctx, location, cx, 1396, W - 420, 25, 15, "300", '"Montserrat", sans-serif', 5, muted, null);
    }

    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(cx - 130, 1452, 260, 1);
    ctx.globalAlpha = 1;

    spaced(ctx, monogram, cx, 1482, "", 66, '"Great Vibes", cursive', 0, accent, accent);
  }

  function paint(data, bg) {
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
    var imageUrl = bg && bg.image;

    return Promise.all([ensureFonts(), imageUrl ? loadImage(imageUrl) : Promise.resolve(null)]).then(function (r) {
      var img = imageUrl ? r[1] : null;
      drawBackground(ctx, W, H, preset, img);
      drawFrame(ctx, W, H, preset);
      drawContent(ctx, W, H, preset, couple, invite, event);
      return canvas;
    });
  }

  window.InviteCard = { paint: paint };
})();