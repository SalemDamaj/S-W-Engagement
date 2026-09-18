(function () {
  "use strict";

  var client = null;

  function isConfigured() {
    return Boolean(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey);
  }

  function get() {
    if (client) return Promise.resolve(client);
    if (!isConfigured()) return Promise.resolve(null);
    if (!window.supabase || !window.supabase.createClient) return Promise.resolve(null);
    try {
      client = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
    } catch (err) {
      console.error("Supabase client failed to initialize:", err);
      client = null;
    }
    return Promise.resolve(client);
  }

  window.InviteSupabase = { get: get, isConfigured: isConfigured };
})();