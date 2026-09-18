(function () {
  "use strict";

  var client = null;

  function isConfigured() {
    return Boolean(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey);
  }

  function get() {
    if (client) return Promise.resolve(client);
    if (!isConfigured()) return Promise.resolve(null);
    return import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2").then(function (mod) {
      client = mod.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
      return client;
    }).catch(function (err) {
      console.error("Supabase client failed to load:", err);
      return null;
    });
  }

  window.InviteSupabase = { get: get, isConfigured: isConfigured };
})();