(function () {
  "use strict";

  var DEFAULTS = window.INVITE_DEFAULTS || {};

  function isConfigured() {
    return Boolean(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey);
  }

  function merge(base, extra) {
    var out = Array.isArray(base) ? base.slice() : {};
    if (typeof base === "object" && base !== null && !Array.isArray(base)) {
      Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    }
    if (extra && typeof extra === "object") {
      Object.keys(extra).forEach(function (k) {
        var b = base ? base[k] : undefined;
        var v = extra[k];
        if (v && typeof v === "object" && !Array.isArray(v) && b && typeof b === "object") {
          out[k] = merge(b, v);
        } else if (v !== undefined) {
          out[k] = v;
        }
      });
    }
    return out;
  }

  function normalize(s) {
    var base = JSON.parse(JSON.stringify(DEFAULTS));
    var merged = merge(base, s || {});
    if (!merged.couple) merged.couple = {};
    merged.couple.names = merged.couple.names || (merged.couple.hisName + " ♥ " + merged.couple.herName);
    if (!merged.couple.monogram && merged.couple.hisName && merged.couple.herName) {
      merged.couple.monogram = merged.couple.hisName.charAt(0) + " ♥ " + merged.couple.herName.charAt(0);
    }
    if (!merged.event) merged.event = {};
    if (!merged.event.countdownTarget && merged.event.date) {
      merged.event.countdownTarget = merged.event.date.replace(/\./g, "-") + "T18:00:00";
    }
    if (!merged.event.countdownTarget) merged.event.countdownTarget = merged.event.date || "";
    merged.event.photo = merged.media ? merged.media.photo || merged.event.photo : merged.event.photo;
    return merged;
  }

  var S = null;

  function getSupabase() {
    if (!isConfigured()) return null;
    if (window.__supabase) return window.__supabase;
    if (!window.supabase || !window.supabase.createClient) return null;
    var client = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
    window.__supabase = client;
    return client;
  }

  async function loadRemote() {
    var client = getSupabase();
    if (!client) return null;
    var res = await client.from("settings").select("data").eq("id", 1).maybeSingle();
    if (res.error) {
      console.warn("Invitation settings could not be loaded:", res.error.message);
      return null;
    }
    return (res.data && res.data.data) || null;
  }

  async function load() {
    if (S) return S;
    var remote = null;
    try { remote = await loadRemote(); } catch (e) { console.warn("Settings fetch failed, using defaults.", e); }
    S = normalize(remote || {});
    return S;
  }

  function get() {
    return S || normalize({});
  }

  window.Invite = window.Invite || {};
  window.Invite.settings = { load: load, get: get, isConfigured: isConfigured, normalize: normalize, merge: merge };
})();