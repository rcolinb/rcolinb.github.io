/* 11-store.js — a very small amount of remembered state.
 *
 * Only display preferences: theme, text size, and which display preset is
 * active. Deliberately NOT quiz scores, challenge tallies or lesson progress —
 * this runs on shared classroom and library machines, where inheriting the
 * previous student's score is a privacy problem and a confusion problem, and
 * where it buys nothing a student actually wants.
 *
 * Every access is guarded. The product ships as a single file that people open
 * from disk, and `localStorage` on a file:// origin throws SecurityError in some
 * browsers rather than returning null — an unguarded read here would take down
 * init() and leave a blank page.
 */
(function (C) {
  "use strict";

  var PREFIX = "cardiac.v1.";
  var memory = {};          // stands in when real storage is unusable
  var live = null;          // null until probed

  function backing() {
    if (live !== null) return live;
    try {
      var t = PREFIX + "probe";
      window.localStorage.setItem(t, "1");
      window.localStorage.removeItem(t);
      live = window.localStorage;
    } catch (e) {
      C.diag.warnings.push("localStorage unavailable, preferences are session-only: " + e.message);
      live = false;
    }
    return live;
  }

  function get(key) {
    var s = backing();
    if (!s) return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
    try { return s.getItem(PREFIX + key); } catch (e) { return null; }
  }

  function set(key, value) {
    var s = backing();
    memory[key] = value;
    if (!s) return;
    try { s.setItem(PREFIX + key, value); } catch (e) { /* quota or private mode */ }
  }

  function clear() {
    memory = {};
    var s = backing();
    if (!s) return;
    try {
      var doomed = [];
      for (var i = 0; i < s.length; i++) {
        var k = s.key(i);
        if (k && k.indexOf(PREFIX) === 0) doomed.push(k);
      }
      doomed.forEach(function (k) { s.removeItem(k); });
    } catch (e) { /* nothing we can do, and nothing that matters */ }
  }

  C.store = { get: get, set: set, clear: clear,
              available: function () { return !!backing(); } };
})(CARDIAC);
