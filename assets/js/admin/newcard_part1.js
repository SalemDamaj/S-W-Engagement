/* Invitation card painter v3 - redesigned.
   Design notes
   * The chosen background drives the WHOLE palette: ink / soft / accent / glow
     all derive from the background's hue + lightness, so a sage photo yields
     sage ink, a dark maroon photo yields warm gold-on-maroon, etc. Text always
     matches its backdrop.
   * Two separate foreground painters: drawContent (English, LTR) and
     drawContentAr (fully Arabic, RTL) with bigger Arabic glyphs.
   * Layout is a vertical wedding-suite: crest -> names -> title -> message ->
     affairs row -> divider -> venue + date chips -> guests (always drawn) ->
     footer. Ornament accents come from the sampled background accent.
   Public API unchanged:
     window.InviteCard.paint(data, bg, opts) -> Promise<canvas>
       opts: { lang, inviteeName, guests }
     window.InviteCard.PRESETS  (map of background presets, name -> preset)
   Source is pure ASCII; all Arabic glyphs are written as \\uXXXX escapes so the
   file round-trips through any toolchain unchanged. */
(function () {
  "use strict";

  /* ---- constants & tiny color math (no deps) ------------------------------ */
  var W = 1200, H = 1600;
  function clampByte(v) { return Math.max(0, Math.min(255, Math.round(v))); }
  function rgb(r, g, b) { return "rgb(" + clampByte(r) + "," + clampByte(g) + "," + clampByte(b) + ")"; }
  function rgba(r, g, b, a) { return "rgba(" + clampByte(r) + "," + clampByte(g) + "," + clampByte(b) + "," + a + ")"; }
  function hexRgb(hex) {
    var c = String(hex || "#ffffff").replace(/^#/, "");
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var n = parseInt(c, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function clampHue(h) { var n = h % 360; if (n < 0) n += 360; return n; }
  function lumRgb(rgbv) { return (0.299 * rgbv[0] + 0.587 * rgbv[1] + 0.114 * rgbv[2]) / 255; }
  function mixRgb(a, b, t) {
    return [clampByte(a[0] + (b[0] - a[0]) * t), clampByte(a[1] + (b[1] - a[1]) * t), clampByte(a[2] + (b[2] - a[2]) * t)];
  }
  function hexToHsl(hex) {
    var v = hexRgb(hex);
    var r = v[0] / 255, g = v[1] / 255, b = v[2] / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var l = (max + min) / 2, h = 0, s = 0, d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      else if (max === g) h = ((b - r) / d + 2) * 60;
      else h = ((r - g) / d + 4) * 60;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  }
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return [clampByte((r + m) * 255), clampByte((g + m) * 255), clampByte((b + m) * 255)];
  }
  function deriveAccent(hex, dark) {
    var hsl = hexToHsl(hex);
    var hue = clampHue(hsl[0]);
    var sat = Math.max(22, Math.min(60, hsl[1] *  ANNEX0.45 + (dark ? 12 : 32)));
    var lite = dark ? 60 : 40;
    return hslToRgb(hue, sat, lite);
  }
