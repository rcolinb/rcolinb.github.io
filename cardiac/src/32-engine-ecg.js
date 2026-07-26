/* 32-engine-ecg.js — waveform synthesis.
 *
 * Every deflection on the strip is a projection of the net cardiac dipole, and
 * every dipole component is bound to an event in the schedule. Conditions do not
 * swap in a different picture: they change the PARAMETERS of the underlying
 * currents — how fast phase 0 rises, how long the plateau lasts, how synchronous
 * phase 3 is, how much muscle is generating current — and the twelve leads then
 * change together, the way they do in a patient.
 *
 * Amplitudes are illustrative and calibrated so a normal Lead II R wave is about
 * 1 mV. They are not measurements.
 */
(function (C) {
  "use strict";

  var M = C.M;
  var V = C.engine.vector;

  /* ----------------------------------------------------- baseline morphology */

  /* Sequential instantaneous QRS vectors. Septum first (left to right), then
   * apex and anterior wall, then the thick LV free wall, then the basal segments.
   * This ordering is what produces normal R-wave progression across the chest. */
  var QRS_NORMAL = [
    { key: "q-septal", amp: 0.14, dir: [-0.80, -0.10, 0.50], t0: 0,  dur: 32 },
    { key: "r-apical", amp: 0.86, dir: [ 0.62,  0.62, 0.42], t0: 12, dur: 46 },
    { key: "r-free",   amp: 1.06, dir: [ 0.78,  0.62, -0.46], t0: 26, dur: 50 },
    { key: "s-basal",  amp: 0.17, dir: [-0.30, -0.45, -0.84], t0: 58, dur: 32 }
  ];

  var P_SINUS = [
    { key: "p-ra", amp: 0.135, dir: [0.30, 0.86, 0.45], t0: 0,  dur: 62 },
    { key: "p-la", amp: 0.115, dir: [0.55, 0.74, -0.42], t0: 26, dur: 66 }
  ];

  /* An ectopic atrial focus starts somewhere other than the SA node, so the
   * atria are activated along a different path and the P wave looks different. */
  var P_ECTOPIC = [
    { key: "p-ect", amp: 0.115, dir: [0.62, 0.30, 0.20], t0: 0,  dur: 58 },
    { key: "p-ect2", amp: 0.085, dir: [0.58, 0.18, -0.40], t0: 22, dur: 60 }
  ];

  /* Retrograde activation runs from the AV junction upward, so the P vector
   * points superiorly and the P wave is negative in the inferior leads. */
  var P_RETRO = [
    { key: "p-retro", amp: 0.085, dir: [0.20, -0.90, -0.35], t0: 0, dur: 58 }
  ];

  var T_NORMAL = { amp: 0.31, dir: [0.64, 0.60, 0.42], k: 1.65 };
  var U_NORMAL = { amp: 0.035, dir: [0.64, 0.60, 0.42], k: 1.2, dur: 150, gap: 70 };

  /* Atrial repolarisation. Small, opposite the P wave, and normally buried under
   * the QRS — it is the reason the PR segment sits slightly below baseline. */
  var TA = { amp: 0.030, dir: [-0.40, -0.80, -0.15], k: 1.4, dur: 200, delay: 60 };

  /* Wide-complex morphologies. A beat that starts in ventricular muscle cannot
   * use the His-Purkinje network, so it crawls cell to cell — slow, wide, and
   * with repolarisation running backwards through the same abnormal path. */
  var QRS_WIDE = {
    "ectopic-lv": {
      comps: [
        { key: "w1", amp: 0.50, dir: [0.30, 0.50, -0.30], t0: 0,  dur: 62 },
        { key: "w2", amp: 1.50, dir: [-0.62, -0.20, 0.72], t0: 42, dur: 108 }
      ],
      t: { amp: 0.58, dir: [0.62, 0.20, -0.72], k: 1.35, dur: 250 }
    },
    "ventricular-focus": {
      comps: [
        { key: "w1", amp: 0.55, dir: [0.25, 0.45, -0.35], t0: 0,  dur: 60 },
        { key: "w2", amp: 1.45, dir: [-0.58, -0.25, 0.75], t0: 40, dur: 110 }
      ],
      t: { amp: 0.55, dir: [0.58, 0.25, -0.75], k: 1.35, dur: 240 }
    },
    "escape-ventricular": {
      comps: [
        { key: "w1", amp: 0.40, dir: [-0.30, 0.35, 0.55], t0: 0,  dur: 55 },
        { key: "w2", amp: 1.25, dir: [0.20, 0.78, -0.68], t0: 45, dur: 115 }
      ],
      t: { amp: 0.50, dir: [-0.20, -0.78, 0.68], k: 1.3, dur: 260 }
    }
  };

  /* ------------------------------------------------------ condition modifiers
   *
   * Each modifier says how a named physiological change alters the currents.
   * The mechanism is in the content registry; these are its numerical shadow.
   */
  var MODS = {
    "normal": {},

    "hyperkalemia": {
      pAmp: 0.22, pDur: 1.35, prAdd: 34,
      qrsWidth: 1.55,
      tAmp: 2.10, tDur: 0.58, tK: 1.00,
      stShift: -18, uAmp: 0,
      note: "Raised extracellular potassium does two separate things: it partly inactivates fast sodium channels (slow phase 0 → wide P, long PR, wide QRS) and it increases potassium conductance in phase 3 (fast, synchronous repolarisation → tall, narrow, symmetric T)."
    },

    "hypokalemia": {
      tAmp: 0.40, tDur: 1.05, tK: 1.55,
      uAmp: 4.0, uDur: 1.20,
      stAmp: -0.055, stShift: 16, prAdd: 8,
      note: "Low extracellular potassium reduces conductance through the inward-rectifier channel, so phase 3 drags. Repolarisation is slow and spread out: the T flattens, the ST sags, and late-repolarising Purkinje tissue emerges as a separate U wave."
    },

    "hypercalcemia": {
      stShift: -72,
      note: "More calcium available for the phase 2 plateau shortens it, so the ST segment shortens and the QT with it. The T wave itself keeps its normal shape."
    },

    "hypocalcemia": {
      stShift: 88,
      note: "A prolonged phase 2 plateau stretches the ST segment. The QT lengthens but the T wave stays a normal width — a long flat ST with a normal T on the end, unlike hypokalaemia where the T itself is abnormal."
    },

    "hypomagnesemia": {
      tAmp: 0.62, tDur: 1.12, uAmp: 2.8, stShift: 40,
      note: "Often silent on the ECG. When it shows, it looks like hypokalaemia — and it usually travels with it, because magnesium is a cofactor for the sodium-potassium pump."
    },

    "lvh": {
      requiresTwelve: true,
      qrsScale: { "r-free": 1.78, "q-septal": 1.25 },
      qrsDirSet: { "r-free": [0.82, 0.55, -0.58] },
      qrsWidth: 1.14,
      strain: { dir: [-0.62, -0.30, 0.42], amp: 0.36, st: 0.075, k: 2.0 },
      note: "More left-ventricular muscle generating current in the same direction means a bigger leftward-posterior vector: taller R where the leads face it (I, aVL, V5, V6) and deeper S where they face away (V1, V2). Repolarising a thickened wall runs abnormally, which is the strain pattern."
    },

    "rvh": {
      requiresTwelve: true,
      // The right-ventricular forces have to be large enough to actually beat
      // the left ones, or the axis stays normal and the panel text promising
      // right axis deviation and persistent lateral S waves contradicts the
      // tracing beside it. The late rightward-superior component is what puts
      // the S waves into I, V5 and V6.
      qrsScale: { "r-free": 0.45, "r-apical": 0.80 },
      qrsAdd: [
        { key: "rv", amp: 1.05, dir: [-0.70, 0.45, 0.62], t0: 28, dur: 52 },
        { key: "rv2", amp: 0.42, dir: [-0.85, -0.25, 0.30], t0: 64, dur: 36 }
      ],
      qrsWidth: 1.05,
      strain: { dir: [0.45, -0.35, -0.82], amp: 0.30, st: 0.05, k: 2.0 },
      note: "A normal right ventricle is electrically drowned out by the left. Only once it hypertrophies do the rightward-anterior forces compete — tall R in V1, right axis deviation, and right-sided repolarisation change."
    },

    "hfref": { note: "There is no heart-failure ECG. The pump changes; the tracing does not have to." },
    "hfpef": { note: "There is no HFpEF ECG. Preserved ejection fraction is not a normal-output finding." },
    "pea":   { note: "PEA is a patient state, not a waveform. The tracing stays organised while the pump does not deliver." }
  };

  /* ------------------------------------------------------------- assembling */

  function pushWavelet(list, w) {
    w.dir = M.norm3(w.dir);
    list.push(w);
    return w;
  }

  function buildWavelets(schedule, state) {
    var list = [];
    var cond = state.condition || "normal";
    var mod = MODS[cond] || {};
    var organised = ["vf", "asystole"].indexOf(schedule.rhythmId) < 0;
    if (!organised) mod = {};

    var rand = C.rng((schedule.seed ^ 0x51ED270B) >>> 0);
    var events = schedule.events;

    for (var i = 0; i < events.length; i++) {
      var e = events[i];

      if (e.type === "atrial-depolarization" && e.origin !== "flutter") {
        var set = e.origin === "ectopic-atrial" ? P_ECTOPIC
                : e.origin === "retrograde" ? P_RETRO : P_SINUS;
        var pAmp = (mod.pAmp === undefined ? 1 : mod.pAmp);
        var pDur = (mod.pDur === undefined ? 1 : mod.pDur);
        for (var pi = 0; pi < set.length; pi++) {
          var pc = set[pi];
          if (pAmp <= 0.001) continue;
          pushWavelet(list, {
            t0: e.onsetMs + pc.t0 * pDur, dur: pc.dur * pDur,
            amp: pc.amp * pAmp * e.intensity, dir: pc.dir.slice(),
            k: 1, shape: "hump", tag: "P", eventId: e.id
          });
        }
        if (e.origin === "sinus" && pAmp > 0.3) {
          pushWavelet(list, {
            t0: e.onsetMs + TA.delay, dur: TA.dur, amp: TA.amp * pAmp,
            dir: TA.dir.slice(), k: TA.k, shape: "hump", tag: "Ta", eventId: e.id
          });
        }
      }

      if (e.type === "ventricular-depolarization") {
        addQrs(list, e, mod);
      }

      if (e.type === "ventricular-repolarization") {
        addRepolarization(list, e, mod, schedule);
      }
    }

    /* Continuous generators: activity that has no discrete beat to hang on. */
    var continuous = [];
    for (var ci = 0; ci < schedule.continuous.length; ci++) {
      var c = schedule.continuous[ci];
      if (c.kind === "flutter") {
        continuous.push({ kind: "flutter", cycleMs: c.cycleMs, amp: 0.23,
                          dir: M.norm3([-0.22, -0.88, 0.42]) });
      } else if (c.kind === "fibrillatory") {
        // Many small wavelets from disorganised atrial wavefronts. No two are
        // alike, which is exactly why no discrete P wave ever forms.
        var fr = C.rng((schedule.seed ^ 0x2545F491) >>> 0);
        for (var ft = 0; ft < schedule.endMs + 1500; ) {
          var famp = 0.018 + 0.060 * fr();
          var fdur = 70 + 90 * fr();
          pushWavelet(list, {
            t0: ft, dur: fdur, amp: famp,
            dir: [-0.15 + 0.9 * (fr() - 0.5), -0.4 + 1.2 * (fr() - 0.5), 0.35 + 0.7 * fr()],
            k: 1, shape: "hump", tag: "f"
          });
          ft += 60 + 70 * fr();
        }
      } else if (c.kind === "vfib") {
        var vr = C.rng((schedule.seed ^ 0x1B873593) >>> 0);
        for (var vt = 0; vt < schedule.endMs + 1500; ) {
          var vamp = 0.25 + 0.85 * vr();
          var vdur = 90 + 150 * vr();
          pushWavelet(list, {
            t0: vt, dur: vdur, amp: vamp,
            dir: [1.6 * (vr() - 0.5), 1.6 * (vr() - 0.5), 1.6 * (vr() - 0.5)],
            k: 0.7 + 0.9 * vr(), shape: "hump", tag: "vf"
          });
          vt += 55 + 95 * vr();
        }
      }
    }

    /* Index by 100 ms bucket so sampling never scans the whole list.
     *
     * Each wavelet is filed under its START bucket ONLY. Filing it under every
     * bucket it spans would make the sampler — which scans the whole range back
     * to maxDur — add the same wavelet once per boundary it had crossed,
     * inflating a long wave like the T by up to threefold partway through it. */
    var bucketMs = 100, buckets = {}, maxDur = 0;
    for (var li = 0; li < list.length; li++) {
      var w = list[li];
      if (w.dur > maxDur) maxDur = w.dur;
      var b = Math.floor(w.t0 / bucketMs);
      (buckets[b] || (buckets[b] = [])).push(w);
    }

    return {
      list: list, buckets: buckets, bucketMs: bucketMs, maxDur: maxDur,
      continuous: continuous, mod: mod, condition: cond,
      seed: schedule.seed, flat: !!(schedule.def && schedule.def.flat)
    };
  }

  function addQrs(list, e, mod) {
    var wideSet = QRS_WIDE[e.origin];
    var widthScale = mod.qrsWidth || 1;

    if (wideSet) {
      for (var i = 0; i < wideSet.comps.length; i++) {
        var c = wideSet.comps[i];
        pushWavelet(list, {
          t0: e.onsetMs + c.t0 * widthScale, dur: c.dur * widthScale,
          amp: c.amp, dir: c.dir.slice(), k: 1, shape: "hump",
          tag: "QRS", eventId: e.id
        });
      }
      return;
    }

    for (var q = 0; q < QRS_NORMAL.length; q++) {
      var w = QRS_NORMAL[q];
      var amp = w.amp * ((mod.qrsScale && mod.qrsScale[w.key]) || 1);
      var dir = (mod.qrsDirSet && mod.qrsDirSet[w.key]) || w.dir;
      pushWavelet(list, {
        t0: e.onsetMs + w.t0 * widthScale, dur: w.dur * widthScale,
        amp: amp, dir: dir.slice(), k: 1, shape: "hump",
        tag: "QRS", part: w.key, eventId: e.id
      });
    }
    if (mod.qrsAdd) {
      for (var a = 0; a < mod.qrsAdd.length; a++) {
        var x = mod.qrsAdd[a];
        pushWavelet(list, {
          t0: e.onsetMs + x.t0 * widthScale, dur: x.dur * widthScale,
          amp: x.amp, dir: x.dir.slice(), k: 1, shape: "hump",
          tag: "QRS", part: x.key, eventId: e.id
        });
      }
    }
  }

  function addRepolarization(list, e, mod, schedule) {
    var wideSet = QRS_WIDE[e.origin];
    var shift = mod.stShift || 0;
    // A shortened ST segment must not pull the T wave back inside the QRS. At
    // fast rates the unclamped hypercalcaemia shift would do exactly that, and
    // the result reads as a QRS with a hump on it rather than a short ST.
    var qrsEnd = (e.qrsOnsetMs !== undefined)
      ? e.qrsOnsetMs + (e.qrsDurMs || 90) + 25
      : e.onsetMs;
    var t0 = Math.max(e.onsetMs + shift, qrsEnd);

    if (wideSet) {
      // Repolarisation after an abnormally conducted beat runs the opposite way,
      // which is why the T wave points away from the QRS.
      var t = wideSet.t;
      pushWavelet(list, {
        t0: t0, dur: t.dur, amp: t.amp, dir: t.dir.slice(), k: t.k,
        shape: "hump", tag: "T", eventId: e.id
      });
      return;
    }

    var dur = e.durMs * (mod.tDur || 1);
    var amp = T_NORMAL.amp * (mod.tAmp === undefined ? 1 : mod.tAmp);
    var dir = T_NORMAL.dir.slice();
    var k = mod.tK || T_NORMAL.k;

    if (mod.strain) {
      // Strain: repolarisation over abnormal muscle points away from the
      // hypertrophied wall, and it is asymmetric — down slowly, back quickly.
      var s = mod.strain;
      dir = M.norm3([
        dir[0] * (1 - s.amp) + s.dir[0] * s.amp * 2.6,
        dir[1] * (1 - s.amp) + s.dir[1] * s.amp * 2.6,
        dir[2] * (1 - s.amp) + s.dir[2] * s.amp * 2.6
      ]);
      k = s.k;
      pushWavelet(list, {
        t0: e.onsetMs - 30, dur: (shift + 30) + dur * 0.35,
        amp: s.st, dir: s.dir.slice(), k: 1, shape: "plateau",
        tag: "ST", eventId: e.id
      });
    }

    if (mod.stAmp) {
      pushWavelet(list, {
        t0: e.onsetMs - 20, dur: Math.max(60, shift + 20 + dur * 0.25),
        amp: Math.abs(mod.stAmp), dir: M.scale3(T_NORMAL.dir, mod.stAmp < 0 ? -1 : 1),
        k: 1, shape: "plateau", tag: "ST", eventId: e.id
      });
    }

    if (amp > 0.001) {
      pushWavelet(list, {
        t0: t0, dur: dur, amp: amp, dir: dir, k: k,
        shape: "hump", tag: "T", eventId: e.id
      });
    }

    var uAmp = U_NORMAL.amp * (mod.uAmp === undefined ? 1 : mod.uAmp);
    if (uAmp > 0.004) {
      pushWavelet(list, {
        t0: t0 + dur + U_NORMAL.gap, dur: U_NORMAL.dur * (mod.uDur || 1),
        amp: uAmp, dir: U_NORMAL.dir.slice(), k: U_NORMAL.k,
        shape: "hump", tag: "U", eventId: e.id
      });
    }
  }

  /* ------------------------------------------------------------- evaluation */

  function shapeValue(w, u) {
    if (w.shape === "plateau") return M.plateau(u, 0.22);
    return M.skewHump(u, w.k || 1);
  }

  /* The flutter sawtooth: the atria never return to baseline, so the tracing
   * has no isoelectric segment between waves. */
  function flutterValue(p) {
    var rise = 0.74;
    if (p < rise) return M.smooth(p / rise) * 1.0;
    var q = (p - rise) / (1 - rise);
    return 1.0 - M.smooth(q) * 1.42;
  }

  var _d = [0, 0, 0];

  function dipoleAt(wv, tMs) {
    _d[0] = 0; _d[1] = 0; _d[2] = 0;
    if (wv.flat) return _d;

    // Scan back far enough to catch any wavelet that could still be running:
    // one filed at t - maxDur is the oldest that can still contribute.
    var b1 = Math.floor(tMs / wv.bucketMs);
    var b0 = Math.floor((tMs - wv.maxDur) / wv.bucketMs) - 1;
    for (var b = b0; b <= b1; b++) {
      var arr = wv.buckets[b];
      if (!arr) continue;
      for (var i = 0; i < arr.length; i++) {
        var w = arr[i];
        var u = (tMs - w.t0) / w.dur;
        if (u <= 0 || u >= 1) continue;
        var v = shapeValue(w, u) * w.amp;
        _d[0] += w.dir[0] * v; _d[1] += w.dir[1] * v; _d[2] += w.dir[2] * v;
      }
    }

    for (var c = 0; c < wv.continuous.length; c++) {
      var g = wv.continuous[c];
      if (g.kind === "flutter") {
        var p = (tMs % g.cycleMs) / g.cycleMs;
        var fv = flutterValue(p) * g.amp;
        _d[0] += g.dir[0] * fv; _d[1] += g.dir[1] * fv; _d[2] += g.dir[2] * fv;
      }
    }
    return _d;
  }

  /* Deterministic value noise: smooth, seeded, and identical every replay. */
  function hash1(n) {
    n = (n << 13) ^ n;
    return 1 - (((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824);
  }
  function valueNoise(x, seed) {
    var i = Math.floor(x), f = x - i;
    var a = hash1((i + seed * 733) | 0), b = hash1((i + 1 + seed * 733) | 0);
    return M.lerp(a, b, M.smooth(f));
  }

  function artifactFor(lead, tMs, noise, seed) {
    if (!noise || noise <= 0) return 0;
    var idx = C.LEAD_ORDER.indexOf(lead) + 1;
    var wander = valueNoise(tMs / 1800, seed + idx) * 0.16;
    var emg = (valueNoise(tMs / 11, seed + idx * 17) +
               valueNoise(tMs / 4.5, seed + idx * 41) * 0.6) * 0.055;
    var mains = Math.sin(tMs * 2 * Math.PI * 60 / 1000 + idx) * 0.022;
    return (wander + emg + mains) * noise;
  }

  var _out = {};

  function sampleAt(wv, tMs, state, out) {
    out = out || _out;
    var d = dipoleAt(wv, tMs);
    V.project(d, out);
    var noise = state ? (state.noise || 0) : 0;
    if (noise > 0) {
      for (var i = 0; i < C.LEAD_ORDER.length; i++) {
        var k = C.LEAD_ORDER[i];
        out[k] += artifactFor(k, tMs, noise, wv.seed & 0xffff);
      }
    }
    return out;
  }

  function sampleLead(wv, tMs, lead, state) {
    var d = dipoleAt(wv, tMs);
    var v = V.projectLead(d, lead);
    var noise = state ? (state.noise || 0) : 0;
    if (noise > 0) v += artifactFor(lead, tMs, noise, wv.seed & 0xffff);
    return v;
  }

  /* Fill a Float32Array with one lead over [t0, t0 + n*stepMs). */
  function fillLead(wv, lead, t0Ms, stepMs, n, state, buf) {
    buf = buf || new Float32Array(n);
    for (var i = 0; i < n; i++) buf[i] = sampleLead(wv, t0Ms + i * stepMs, lead, state);
    return buf;
  }

  /* Measurements taken FROM the synthesized signal, the way a clinician measures
   * them from the strip — not read back out of the parameters that made it. */
  function measure(schedule, wv, state) {
    var beats = schedule.beats;
    var out = {
      ventricularRate: null, atrialRate: null, prMs: null, qrsMs: null,
      qtMs: null, regular: null, axis: null, axisLabel: null,
      rrMin: null, rrMax: null
    };
    if (beats.length >= 2) {
      var rrs = [];
      for (var i = 1; i < beats.length && i < 24; i++) rrs.push(beats[i].tMs - beats[i - 1].tMs);
      if (rrs.length) {
        var sum = 0, mn = Infinity, mx = -Infinity;
        for (var r = 0; r < rrs.length; r++) { sum += rrs[r]; mn = Math.min(mn, rrs[r]); mx = Math.max(mx, rrs[r]); }
        var mean = sum / rrs.length;
        out.ventricularRate = Math.round(60000 / mean);
        out.rrMin = Math.round(mn); out.rrMax = Math.round(mx);
        out.regular = (mx - mn) < Math.max(60, mean * 0.10);
      }
      // Read the QRS duration and the PR interval off the schedule that actually
      // drew the beat, rather than recomputing them from the parameters. If a
      // condition widened the QRS or lengthened the PR, it did so in the
      // schedule, so these numbers cannot disagree with the tracing.
      for (var q = 0; q < schedule.events.length; q++) {
        if (schedule.events[q].type === "ventricular-depolarization") {
          out.qrsMs = Math.round(schedule.events[q].durMs);
          break;
        }
      }
      for (var b = 0; b < beats.length; b++) {
        if (beats[b].prMs) { out.prMs = Math.round(beats[b].prMs); break; }
      }
    }
    var at = schedule.atrialTimes;
    if (at && at.length >= 3) {
      var span = at[at.length - 1].t - at[0].t;
      if (span > 0) out.atrialRate = Math.round(60000 / (span / (at.length - 1)));
    }
    if (schedule.rhythmId === "af") out.atrialRate = null;

    out.qtMs = Math.round(schedule.intervals.qtMs + (wv.mod.stShift || 0));

    /* Mean frontal axis measured from net QRS area in I and aVF. */
    if (beats.length) {
      var t0 = beats[Math.min(1, beats.length - 1)].tMs - 40;
      var n = 60, stepMs = 4;
      var aI = fillLead(wv, "I", t0, stepMs, n, null);
      var aF = fillLead(wv, "aVF", t0, stepMs, n, null);
      var deg = V.frontalAxis(aI, aF);
      if (deg !== null) { out.axis = Math.round(deg); out.axisLabel = V.axisLabel(deg); }
    }
    return out;
  }

  C.engine.ecg = {
    MODS: MODS,
    QRS_NORMAL: QRS_NORMAL,
    P_SINUS: P_SINUS,
    T_NORMAL: T_NORMAL,
    buildWavelets: buildWavelets,
    dipoleAt: dipoleAt,
    sampleAt: sampleAt,
    sampleLead: sampleLead,
    fillLead: fillLead,
    measure: measure
  };
})(window.CARDIAC);
