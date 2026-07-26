/* 10-namespace.js — global namespace, constants, deterministic RNG, small math helpers. */
(function (w) {
  "use strict";

  var CARDIAC = {
    VERSION: "1.0.0",
    MODEL_VERSION: "vector-dipole-1.0",
    CONTENT_VERSION: "nr324-1.0",
    REVIEWED: "Educational model — not clinically validated",

    content: {
      sources: [],
      rhythms: {},
      conditions: {},
      mechanisms: {},
      questions: [],
      lessons: [],
      waveGuide: {}
    },
    engine: {},
    render: {},
    ui: {},
    state: null
  };

  /* ---------- constants ---------- */

  CARDIAC.FS = 500;                  // waveform sample rate, Hz
  CARDIAC.LEAD_ORDER = ["I", "II", "III", "aVR", "aVL", "aVF",
                        "V1", "V2", "V3", "V4", "V5", "V6"];
  CARDIAC.LIMB_LEADS = ["I", "II", "III", "aVR", "aVL", "aVF"];
  CARDIAC.PRECORDIAL = ["V1", "V2", "V3", "V4", "V5", "V6"];

  // 3 x 4 print grid: rows are read left to right.
  CARDIAC.GRID_ROWS = [
    ["I", "aVR", "V1", "V4"],
    ["II", "aVL", "V2", "V5"],
    ["III", "aVF", "V3", "V6"]
  ];

  CARDIAC.REGIONS = ["sa-node", "right-atrium", "left-atrium", "av-node",
    "his-bundle", "right-bundle", "left-bundle", "right-purkinje",
    "left-purkinje", "right-ventricle", "left-ventricle"];

  /* ---------- deterministic PRNG (mulberry32) ---------- */

  CARDIAC.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------- math helpers ---------- */

  var M = {};

  M.clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };

  M.lerp = function (a, b, t) { return a + (b - a) * t; };

  // Smooth 0->1 ramp with zero slope at both ends.
  M.smooth = function (t) {
    t = M.clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  };

  // Raised cosine bump on [0,1]; 0 at both ends, 1 at centre.
  M.hump = function (u) {
    if (u <= 0 || u >= 1) return 0;
    return 0.5 * (1 - Math.cos(2 * Math.PI * u));
  };

  // Skewed bump. k > 1 shifts the peak later (slow rise, fast fall — a normal
  // T wave). k = 1 is symmetric (the hyperkalaemic T). k < 1 peaks early.
  M.skewHump = function (u, k) {
    if (u <= 0 || u >= 1) return 0;
    return M.hump(k === 1 ? u : Math.pow(u, k));
  };

  // Flat-topped segment with smooth shoulders — used for ST deviation.
  M.plateau = function (u, edge) {
    if (u <= 0 || u >= 1) return 0;
    if (u < edge) return M.smooth(u / edge);
    if (u > 1 - edge) return M.smooth((1 - u) / edge);
    return 1;
  };

  M.norm3 = function (v) {
    var m = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    return [v[0] / m, v[1] / m, v[2] / m];
  };

  M.dot3 = function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; };

  M.scale3 = function (v, s) { return [v[0] * s, v[1] * s, v[2] * s]; };

  // Rotate a vector in the frontal plane (about the anterior/posterior axis).
  M.rotFrontal = function (v, deg) {
    var r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
  };

  CARDIAC.M = M;

  w.CARDIAC = CARDIAC;
})(window);
