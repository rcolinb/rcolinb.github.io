/* 31-engine-rhythm.js — rhythm definitions and event scheduling.
 *
 * Everything downstream reads this schedule: the heart animation, the ECG, the
 * timeline and the pump model. Nothing draws a waveform first and then invents a
 * mechanical story to match it.
 *
 * The generator works in three passes, which is also how the physiology works:
 *   1. produce atrial activity (sinus, flutter, fibrillatory, or none)
 *   2. produce independent ventricular activity (ectopic beats, escape beats)
 *   3. conduct atrial impulses through the AV node, subject to the conduction
 *      rule for the rhythm and to ventricular refractoriness
 *
 * A dropped beat is therefore an emergent result of step 3, not a hole punched
 * into a picture.
 */
(function (C) {
  "use strict";

  var M = C.M;

  /* ---------------------------------------------------------------- timing */

  /* Rate-dependent intervals.
   *
   * Systole does shorten as the rate climbs, but far less than the cycle does,
   * so nearly all of the lost time comes out of diastole. That asymmetry is the
   * whole reason tachycardia costs filling — and it has to be modelled with the
   * right exponent, because a systole that fails to shorten at all would leave
   * negative diastole at 170/min and wipe out filling entirely. */
  function intervals(rrMs, opts) {
    opts = opts || {};
    var rr = M.clamp(rrMs, 200, 4000);
    var qt = M.clamp(400 * Math.sqrt(rr / 1000), 240, 520);
    var tDur = M.clamp(qt * 0.46, 100, 240);

    // Total mechanical systole, fitted so that roughly 470 ms of an 800 ms cycle
    // is systole at 75/min, falling to about 240 ms of a 353 ms cycle at 170/min.
    var systole = 1.359 * Math.pow(rr, 0.867);

    return {
      rrMs: rr,
      qrsMs: opts.qrsMs || 90,
      qtMs: qt,
      tOnsetMs: qt - tDur,
      tDurMs: tDur,
      ivcMs: M.clamp(0.13 * systole, 25, 70),      // isovolumetric contraction
      ejectMs: M.clamp(0.70 * systole, 130, 330),
      ivrMs: M.clamp(0.17 * systole, 32, 90),      // isovolumetric relaxation
      atrialDepolMs: 95,
      atrialSystoleMs: M.clamp(0.14 * rr + 40, 70, 130)
    };
  }

  var VENT_REFRACTORY_MS = 280;   // an atrial impulse arriving inside this window
                                  // after a ventricular beat will not conduct

  /* ------------------------------------------------------------ definitions */

  /* `conduct` returns { conducted, prMs } for the n-th atrial impulse of the
   * rhythm. Returning conducted:false is what produces a dropped QRS. */
  var DEFS = {
    "nsr":         { family: "sinus", atrial: "sinus", rate: 75,  pr: 160, label: "Normal sinus rhythm" },
    "sinus-brady": { family: "sinus", atrial: "sinus", rate: 48,  pr: 160, label: "Sinus bradycardia" },
    "sinus-tachy": { family: "sinus", atrial: "sinus", rate: 125, pr: 148, label: "Sinus tachycardia" },

    "pac": { family: "ectopy", atrial: "sinus", rate: 75, pr: 160, label: "Premature atrial complex",
             ectopyAtrial: { everyN: 4, coupling: 0.62 } },
    "pvc": { family: "ectopy", atrial: "sinus", rate: 75, pr: 160, label: "Premature ventricular complex",
             ectopyVent: { everyN: 4, coupling: 0.60 } },

    "af":       { family: "atrial-tachyarrhythmia", atrial: "fibrillatory", ventRate: 110, label: "Atrial fibrillation" },
    "aflutter": { family: "atrial-tachyarrhythmia", atrial: "flutter", atrialRate: 300, ratio: 2, pr: 120, label: "Atrial flutter" },
    "svt":      { family: "atrial-tachyarrhythmia", atrial: "retrograde", rate: 180, pr: 0, label: "Supraventricular tachycardia" },

    "avb1":     { family: "av-conduction", atrial: "sinus", rate: 72, pr: 280, label: "First-degree AV block" },
    // Wenckebach increments get SMALLER as the node fatigues, so each successive
    // PR grows by less than the last and the R-R intervals shorten across the
    // group before the drop. That shortening R-R is the classic bedside clue.
    "mobitz1":  { family: "av-conduction", atrial: "sinus", rate: 75, prCycle: [165, 245, 290, null], label: "Second-degree AV block, Mobitz I" },
    "mobitz2":  { family: "av-conduction", atrial: "sinus", rate: 75, pr: 170, pattern: [true, true, false], label: "Second-degree AV block, Mobitz II" },
    "avb2to1":  { family: "av-conduction", atrial: "sinus", rate: 80, pr: 175, pattern: [true, false], label: "2:1 AV block" },
    "avb3":     { family: "av-conduction", atrial: "sinus", rate: 82, dissociated: true,
                  escapeRate: 35, escapeWide: true, label: "Third-degree (complete) AV block" },

    "vt":       { family: "ventricular", atrial: "none", ventRate: 160, wide: true, label: "Ventricular tachycardia" },
    "vf":       { family: "arrest", atrial: "none", chaotic: true, label: "Ventricular fibrillation" },
    "asystole": { family: "arrest", atrial: "none", flat: true, label: "Asystole" }
  };

  /* Canonical start: the moment Reset returns to. Each is chosen so the first
   * thing the learner sees is the feature that defines the rhythm. */
  var CANONICAL_START = {
    "nsr": "just before the SA node fires, at the end of filling",
    "sinus-brady": "just before the SA node fires",
    "sinus-tachy": "just before the SA node fires",
    "pac": "one full sinus beat before the early atrial beat",
    "pvc": "one full sinus beat before the early ventricular beat",
    "af": "on a settled fibrillatory baseline, before a ventricular beat",
    "aflutter": "just before a flutter wave that conducts",
    "svt": "just before a narrow complex",
    "avb1": "before a P wave, with the whole long PR in view",
    "mobitz1": "the first conducted P of a complete grouped cycle",
    "mobitz2": "one conducted beat before the nonconducted P",
    "avb2to1": "one conducted P-QRS pair before the blocked P",
    "avb3": "where the independent atrial and ventricular rates are both visible",
    "vt": "just before a wide complex",
    "vf": "a reproducible segment of chaotic activity",
    "asystole": "a near-flat segment, after checking the patient and the leads"
  };

  /* Which rates the learner is allowed to change, and within what range.
   * Ranges are teaching fixtures for adults, not diagnostic cut-offs. */
  var RATE_SPEC = {
    "nsr":         { kind: "linked", key: "rate", min: 60, max: 100, def: 75, label: "Heart rate" },
    "sinus-brady": { kind: "linked", key: "rate", min: 30, max: 59, def: 48, label: "Heart rate" },
    "sinus-tachy": { kind: "linked", key: "rate", min: 101, max: 180, def: 125, label: "Heart rate" },
    "pac":         { kind: "linked", key: "rate", min: 60, max: 100, def: 75, label: "Underlying sinus rate" },
    "pvc":         { kind: "linked", key: "rate", min: 60, max: 100, def: 75, label: "Underlying sinus rate" },
    "af":          { kind: "mean-ventricular", key: "ventRate", min: 50, max: 180, def: 110, label: "Mean ventricular rate" },
    "aflutter":    { kind: "atrial", key: "atrialRate", min: 250, max: 350, def: 300, label: "Atrial (flutter) rate" },
    "svt":         { kind: "linked", key: "rate", min: 150, max: 230, def: 180, label: "Heart rate" },
    "avb1":        { kind: "atrial", key: "rate", min: 60, max: 100, def: 72, label: "Atrial rate" },
    "mobitz1":     { kind: "atrial", key: "rate", min: 60, max: 100, def: 75, label: "Atrial rate" },
    "mobitz2":     { kind: "atrial", key: "rate", min: 60, max: 100, def: 75, label: "Atrial rate" },
    "avb2to1":     { kind: "atrial", key: "rate", min: 60, max: 100, def: 80, label: "Atrial rate" },
    "avb3":        { kind: "dual", key: "rate", min: 60, max: 100, def: 82, label: "Atrial rate",
                     key2: "escapeRate", min2: 20, max2: 50, def2: 35, label2: "Ventricular escape rate" },
    "vt":          { kind: "ventricular", key: "ventRate", min: 100, max: 250, def: 160, label: "Ventricular rate" },
    "vf":          { kind: "none" },
    "asystole":    { kind: "none" }
  };

  /* ------------------------------------------------------------- generation */

  var uid = 0;
  function ev(o) { o.id = "e" + (++uid); return o; }

  /* Emit the full electrical + mechanical consequence of one ventricular
   * activation. `origin` says how the ventricles were reached, which is what
   * decides QRS width and the conduction path drawn on the heart. */
  function ventricularBeat(out, beatId, tMs, iv, origin, rrForIntervals) {
    var wide = (origin === "ectopic-rv" || origin === "ectopic-lv" ||
                origin === "ventricular-focus" || origin === "escape-ventricular");
    var qrs = wide ? 150 * (iv.qrsMs / 90) : iv.qrsMs;
    var i2 = intervals(rrForIntervals || iv.rrMs, { qrsMs: qrs });

    if (!wide) {
      out.push(ev({ beatId: beatId, type: "his-activation", onsetMs: tMs - 22, durMs: 12,
                    region: "his-bundle", conducted: true, mech: "none", intensity: 0.9 }));
      out.push(ev({ beatId: beatId, type: "bundle-activation", onsetMs: tMs - 12, durMs: 16,
                    region: "right-bundle", region2: "left-bundle", conducted: true, mech: "none", intensity: 1 }));
      out.push(ev({ beatId: beatId, type: "purkinje-activation", onsetMs: tMs - 2, durMs: 22,
                    region: "right-purkinje", region2: "left-purkinje", conducted: true, mech: "none", intensity: 1 }));
    }

    out.push(ev({ beatId: beatId, type: "ventricular-depolarization", onsetMs: tMs, durMs: qrs,
                  region: "left-ventricle", region2: "right-ventricle",
                  conducted: true, mech: "ventricular", origin: origin, wide: wide, intensity: 1 }));

    out.push(ev({ beatId: beatId, type: "av-valve-close", onsetMs: tMs + 22, durMs: 40,
                  region: "mitral", region2: "tricuspid", conducted: true, mech: "none", intensity: 1 }));

    var ejectStart = tMs + 22 + i2.ivcMs;
    out.push(ev({ beatId: beatId, type: "semilunar-valve-open", onsetMs: ejectStart, durMs: 35,
                  region: "aortic", region2: "pulmonic", conducted: true, mech: "none", intensity: 1 }));
    out.push(ev({ beatId: beatId, type: "ventricular-ejection", onsetMs: ejectStart, durMs: i2.ejectMs,
                  region: "left-ventricle", region2: "right-ventricle",
                  conducted: true, mech: "ventricular", origin: origin, intensity: 1 }));

    var ejectEnd = ejectStart + i2.ejectMs;
    out.push(ev({ beatId: beatId, type: "semilunar-valve-close", onsetMs: ejectEnd, durMs: 40,
                  region: "aortic", region2: "pulmonic", conducted: true, mech: "none", intensity: 1 }));
    out.push(ev({ beatId: beatId, type: "av-valve-open", onsetMs: ejectEnd + i2.ivrMs, durMs: 40,
                  region: "mitral", region2: "tricuspid", conducted: true, mech: "none", intensity: 1 }));

    out.push(ev({ beatId: beatId, type: "ventricular-repolarization",
                  onsetMs: tMs + i2.tOnsetMs, durMs: i2.tDurMs,
                  region: "left-ventricle", conducted: true, mech: "none",
                  origin: origin, wide: wide, intensity: 1,
                  // carried so a condition that shortens the ST segment cannot
                  // slide the T wave back inside the QRS that preceded it
                  qrsOnsetMs: tMs, qrsDurMs: qrs }));

    return { qrsMs: qrs, ejectStart: ejectStart, ejectEnd: ejectEnd,
             fillStart: ejectEnd + i2.ivrMs, wide: wide };
  }

  function atrialBeat(out, beatId, tMs, iv, origin) {
    out.push(ev({ beatId: beatId, type: "pacemaker-fire", onsetMs: tMs, durMs: 20,
                  region: origin === "ectopic-atrial" ? "left-atrium" : "sa-node",
                  conducted: true, mech: "none", origin: origin, intensity: 1 }));
    out.push(ev({ beatId: beatId, type: "atrial-depolarization", onsetMs: tMs, durMs: iv.atrialDepolMs,
                  region: "right-atrium", region2: "left-atrium",
                  conducted: true, mech: "atrial", origin: origin, intensity: 1 }));
    out.push(ev({ beatId: beatId, type: "atrial-systole", onsetMs: tMs + 55, durMs: iv.atrialSystoleMs,
                  region: "right-atrium", region2: "left-atrium",
                  conducted: true, mech: "atrial", origin: origin, intensity: 1 }));
  }

  /* --------------------------------------------------------------- schedule */

  function build(state, untilMs) {
    var id = state.rhythm;
    var def = DEFS[id] || DEFS.nsr;
    var seed = state.seed >>> 0;
    var rand = C.rng(seed ^ 0x9E3779B9);
    var end = untilMs || 60000;

    /* A condition that slows conduction has to slow it HERE, in the schedule, so
     * that the drawn waveform, the timeline and the measured intervals all come
     * from the same delay. Applying it only at render time would let the model
     * report a long PR while drawing a normal one. */
    var mods = (C.engine.ecg && C.engine.ecg.MODS) || {};
    var mod = mods[state.condition] || {};
    var condPrAdd = mod.prAdd || 0;
    var condQrsScale = mod.qrsWidth || 1;

    var events = [];
    var beats = [];
    var continuous = [];
    var atrialTimes = [];   // { t, origin, conducted, prMs, index }
    var ventTimes = [];     // { t, origin }

    /* Sympathetic activation raises the rate as well as contractility. Applying
     * it here rather than only to the pump is what lets the learner see the
     * whole bargain: more output now, bought with filling time. Escape
     * pacemakers are left alone — they are not under that drive. */
    var comp = (C.engine.hemo && C.engine.hemo.COMPENSATION) || {};
    var rateMul = (comp[state.compensation] && comp[state.compensation].rateMul) || 1;

    var rateOf = function (key, fallback) {
      var r = state.rates && state.rates[key];
      var v = (typeof r === "number" && isFinite(r)) ? r : fallback;
      return key === "escapeRate" ? v : v * rateMul;
    };

    /* ---- pass 1: atrial activity -------------------------------------- */

    var baseRate, rr, iv;

    // A lead-in period before the first impulse, so Reset can open at
    // end-diastole with the ventricles full and nothing yet firing.
    var LEAD_IN = 0.55;

    if (def.atrial === "sinus") {
      baseRate = rateOf("rate", def.rate);
      rr = 60000 / baseRate;
      iv = intervals(rr);
      var t = rr * LEAD_IN, n = 0;
      var ectA = def.ectopyAtrial;
      while (t < end + 2000) {
        var isEctopic = false, step = rr;
        if (ectA && n > 0 && n % ectA.everyN === 0) {
          isEctopic = true;
          t = t - rr + rr * ectA.coupling;    // the early beat replaces a sinus beat
        }
        atrialTimes.push({ t: t, index: n, origin: isEctopic ? "ectopic-atrial" : "sinus" });
        if (isEctopic) {
          // A premature atrial impulse usually reaches and resets the SA node, so
          // the next sinus beat comes one full cycle later. The pause is therefore
          // NOT fully compensatory.
          step = rr;
        }
        t += step;
        n++;
      }
    } else if (def.atrial === "flutter") {
      var aRate = rateOf("atrialRate", def.atrialRate);
      var fRR = 60000 / aRate;
      iv = intervals(fRR * (state.flutterRatio || def.ratio));
      continuous.push({ kind: "flutter", cycleMs: fRR, phase: 0 });
      for (var ft = 0, fn = 0; ft < end + 2000; ft += fRR, fn++) {
        atrialTimes.push({ t: ft, index: fn, origin: "flutter" });
      }
    } else if (def.atrial === "fibrillatory") {
      iv = intervals(60000 / rateOf("ventRate", def.ventRate));
      continuous.push({ kind: "fibrillatory", seed: seed, coarse: 0.55 });
    } else if (def.atrial === "retrograde") {
      baseRate = rateOf("rate", def.rate);
      rr = 60000 / baseRate;
      iv = intervals(rr);
    } else {
      iv = intervals(def.ventRate ? 60000 / rateOf("ventRate", def.ventRate) : 1000);
    }

    /* ---- pass 2: independent ventricular activity ---------------------- */

    if (def.ectopyVent) {
      // Premature ventricular beats sit on top of an undisturbed sinus series.
      var evRR = 60000 / rateOf("rate", def.rate);
      var evBase = evRR * LEAD_IN + (def.pr || 160);   // align to the sinus QRS series
      for (var k = 1; evBase + k * evRR < end + 2000; k++) {
        if (k % def.ectopyVent.everyN === 0) {
          ventTimes.push({
            t: evBase + (k - 1) * evRR + evRR * def.ectopyVent.coupling,
            origin: "ectopic-lv",
            // A premature ventricular beat conducts backwards into the AV node
            // and leaves it refractory, so the NEXT sinus impulse finds the node
            // unrecovered and fails to capture — while the SA node itself keeps
            // its own time. That is what makes the pause fully compensatory, and
            // a fixed refractory window does not reproduce it: at 75/min the
            // next sinus beat arrives 0.4 RR later, outside any plausible fixed
            // window, and the pause would vanish.
            concealMs: evRR * 0.86
          });
        }
      }
    }

    if (def.dissociated) {
      // The ventricles are driven by their own escape pacemaker, completely
      // independent of the atria. Nothing conducts across the AV node.
      var escRR = 60000 / rateOf("escapeRate", def.escapeRate);
      for (var et = escRR * 0.45; et < end + 2000; et += escRR) {
        ventTimes.push({ t: et, origin: def.escapeWide ? "escape-ventricular" : "escape-junctional" });
      }
    }

    if (def.atrial === "fibrillatory") {
      var meanRR = 60000 / rateOf("ventRate", def.ventRate);
      var vt = meanRR * 0.5, prev = 1.0;
      while (vt < end + 2000) {
        ventTimes.push({ t: vt, origin: "conducted" });
        // Concealed conduction: a short cycle leaves the AV node less recovered,
        // so the next one tends to be longer. Hence irregularly irregular, not
        // uniformly random.
        var u = rand();
        var f = 0.62 + 0.78 * u;
        f = f * 0.75 + (2.0 - prev) * 0.25;
        f = M.clamp(f, 0.55, 1.55);
        prev = f;
        vt += meanRR * f;
      }
    }

    if (def.atrial === "retrograde") {
      var svtRR = 60000 / rateOf("rate", def.rate);
      for (var st = svtRR * 0.5; st < end + 2000; st += svtRR) {
        ventTimes.push({ t: st, origin: "conducted" });
      }
    }

    if (def.family === "ventricular" && def.ventRate) {
      var vRR = 60000 / rateOf("ventRate", def.ventRate);
      for (var wt = vRR * 0.4; wt < end + 2000; wt += vRR) {
        ventTimes.push({ t: wt, origin: "ventricular-focus" });
      }
    }

    if (def.chaotic) continuous.push({ kind: "vfib", seed: seed });
    if (def.flat) continuous.push({ kind: "flat", seed: seed });

    /* ---- pass 3: conduct atrial impulses through the AV node ------------ */

    var conductedPairs = [];
    if (def.atrial === "sinus" || def.atrial === "flutter") {
      var wenckIdx = 0;
      for (var ai = 0; ai < atrialTimes.length; ai++) {
        var a = atrialTimes[ai];
        var conducted = true, prMs = def.pr || 160;

        if (def.dissociated) {
          // Nothing crosses the node, so there is no PR interval to speak of.
          // Leaving a nominal value here would invite code downstream to relate
          // a P to a QRS that it never caused.
          conducted = false;
          prMs = null;
        } else if (def.prCycle) {
          var pc = def.prCycle[wenckIdx % def.prCycle.length];
          wenckIdx++;
          if (pc === null) { conducted = false; } else { prMs = pc; }
        } else if (def.pattern) {
          conducted = def.pattern[a.index % def.pattern.length];
        } else if (def.atrial === "flutter") {
          var ratio = state.flutterRatio || def.ratio;
          if (ratio === "variable") {
            conducted = (rand() < 0.42);
          } else {
            conducted = (a.index % ratio === 0);
          }
          prMs = def.pr;
        }

        if (a.origin === "ectopic-atrial") prMs = prMs + 30;   // early impulse meets a
                                                               // partly refractory AV node
        if (prMs !== null) prMs += condPrAdd;

        a.conducted = conducted;
        a.prMs = prMs;
        if (conducted) conductedPairs.push({ a: a, vt: a.t + prMs });
      }
    }

    // Merge conducted beats with independent ventricular beats, then enforce
    // refractoriness: whichever activation reaches the ventricle first wins, and
    // anything arriving inside the refractory window simply fails to capture.
    var candidates = conductedPairs.map(function (p) {
      return { t: p.vt, origin: "conducted", atrial: p.a, concealMs: 0 };
    }).concat(ventTimes.map(function (v) {
      return { t: v.t, origin: v.origin, atrial: null, concealMs: v.concealMs || 0 };
    }));
    candidates.sort(function (x, y) { return x.t - y.t; });

    var lastVent = -1e9, lastBlockUntil = -1e9;
    var accepted = [];
    for (var ci = 0; ci < candidates.length; ci++) {
      var c = candidates[ci];
      // A supraventricular impulse has to get through the AV node, so it is held
      // off by concealed retrograde conduction as well as by ventricular
      // refractoriness. An impulse arising in the ventricle itself only has to
      // clear the ventricular refractory period.
      var barrier = c.atrial ? Math.max(VENT_REFRACTORY_MS, lastBlockUntil - lastVent)
                             : VENT_REFRACTORY_MS;
      if (c.t - lastVent < barrier) {
        if (c.atrial) c.atrial.conducted = false;   // the P wave is there, the QRS is not
        continue;
      }
      lastVent = c.t;
      lastBlockUntil = c.t + (c.concealMs || 0);
      accepted.push(c);
    }

    /* ---- emit events --------------------------------------------------- */

    var bi = 0;
    for (var qi = 0; qi < atrialTimes.length; qi++) {
      var at = atrialTimes[qi];
      if (at.t < -500 || at.t > end + 1500) continue;
      if (def.atrial === "flutter") {
        events.push(ev({ beatId: "a" + qi, type: "atrial-depolarization", onsetMs: at.t, durMs: 120,
                         region: "right-atrium", region2: "left-atrium", conducted: !!at.conducted,
                         mech: "none", origin: "flutter", intensity: 0.8 }));
        events.push(ev({ beatId: "a" + qi, type: "av-arrival", onsetMs: at.t + 40, durMs: 30,
                         region: "av-node", conducted: !!at.conducted, mech: "none", intensity: 1 }));
      } else {
        atrialBeat(events, "a" + qi, at.t, iv, at.origin);
        events.push(ev({ beatId: "a" + qi, type: "av-arrival", onsetMs: at.t + 45, durMs: 30,
                         region: "av-node", conducted: !!at.conducted, mech: "none",
                         prMs: at.prMs, intensity: 1 }));
        if (at.conducted) {
          events.push(ev({ beatId: "a" + qi, type: "av-release",
                           onsetMs: at.t + (at.prMs || 160) - 26, durMs: 18,
                           region: "av-node", conducted: true, mech: "none", intensity: 1 }));
        }
      }
    }

    if (def.atrial === "retrograde") {
      // AV-node reentry activates the atria backwards, at or just after the QRS,
      // which is why the P wave is usually buried and often never seen.
      for (var ri = 0; ri < accepted.length; ri++) {
        events.push(ev({ beatId: "r" + ri, type: "atrial-depolarization",
                         onsetMs: accepted[ri].t + 40, durMs: 60,
                         region: "left-atrium", region2: "right-atrium", conducted: true,
                         mech: "atrial", origin: "retrograde", intensity: 0.6 }));
        events.push(ev({ beatId: "r" + ri, type: "atrial-systole",
                         onsetMs: accepted[ri].t + 80, durMs: 90,
                         region: "right-atrium", region2: "left-atrium", conducted: true,
                         mech: "atrial", origin: "retrograde", intensity: 0.5 }));
      }
    }

    var prevVent = null;
    for (var vi = 0; vi < accepted.length; vi++) {
      var v = accepted[vi];
      if (v.t < -500 || v.t > end + 1500) continue;
      var thisRR = prevVent === null ? iv.rrMs : (v.t - prevVent);
      var ivBeat = iv;
      if (condQrsScale !== 1) {
        ivBeat = {};
        for (var kk in iv) ivBeat[kk] = iv[kk];
        ivBeat.qrsMs = iv.qrsMs * condQrsScale;
      }
      var res = ventricularBeat(events, "v" + vi, v.t, ivBeat, v.origin, thisRR);
      beats.push({
        id: "v" + vi, tMs: v.t, origin: v.origin, wide: res.wide,
        rrMs: thisRR,
        atrialMs: v.atrial ? v.atrial.t : null,
        prMs: v.atrial ? v.atrial.prMs : null,
        ejectStart: res.ejectStart, ejectEnd: res.ejectEnd, fillStart: res.fillStart
      });
      prevVent = v.t;
      bi++;
    }

    events.sort(function (x, y) { return x.onsetMs - y.onsetMs; });

    /* Canonical start: park just before the defining feature. */
    var startMs = 0;
    if (def.family === "arrest") {
      startMs = 1200;
    } else if (def.prCycle) {
      // first conducted P of a complete Wenckebach group
      startMs = Math.max(0, (atrialTimes[0] ? atrialTimes[0].t : 0) - 220);
    } else if (def.pattern || def.dissociated) {
      startMs = Math.max(0, (atrialTimes[0] ? atrialTimes[0].t : 0) - 220);
    } else if (def.ectopyAtrial || def.ectopyVent) {
      var firstEct = null;
      for (var ei = 0; ei < accepted.length; ei++) {
        if (accepted[ei].origin.indexOf("ectopic") === 0) { firstEct = accepted[ei].t; break; }
      }
      if (firstEct === null && def.ectopyAtrial) {
        for (var ej = 0; ej < atrialTimes.length; ej++) {
          if (atrialTimes[ej].origin === "ectopic-atrial") { firstEct = atrialTimes[ej].t; break; }
        }
      }
      startMs = Math.max(0, (firstEct || 2000) - (iv.rrMs + 250));
    } else if (beats.length) {
      startMs = Math.max(0, beats[0].tMs - 260);
    }

    return {
      rhythmId: id,
      def: def,
      seed: seed,
      events: events,
      beats: beats,
      atrialTimes: atrialTimes,
      continuous: continuous,
      intervals: iv,
      startMs: startMs,
      endMs: end,
      canonicalStartNote: CANONICAL_START[id] || ""
    };
  }

  /* ------------------------------------------------------------- accessors */

  function eventsNear(schedule, tMs, windowMs) {
    var w = windowMs || 400, out = [];
    for (var i = 0; i < schedule.events.length; i++) {
      var e = schedule.events[i];
      if (e.onsetMs > tMs + w) break;
      if (e.onsetMs + e.durMs >= tMs - w) out.push(e);
    }
    return out;
  }

  function activeEvents(schedule, tMs) {
    var out = [];
    for (var i = 0; i < schedule.events.length; i++) {
      var e = schedule.events[i];
      if (e.onsetMs > tMs) break;
      if (tMs < e.onsetMs + e.durMs) out.push(e);
    }
    return out;
  }

  function nextEvent(schedule, tMs, types) {
    for (var i = 0; i < schedule.events.length; i++) {
      var e = schedule.events[i];
      if (e.onsetMs > tMs + 0.5 && (!types || types.indexOf(e.type) >= 0)) return e;
    }
    return null;
  }

  function prevEvent(schedule, tMs, types) {
    var found = null;
    for (var i = 0; i < schedule.events.length; i++) {
      var e = schedule.events[i];
      if (e.onsetMs >= tMs - 0.5) break;
      if (!types || types.indexOf(e.type) >= 0) found = e;
    }
    return found;
  }

  /* Events a learner would want to step through — the semantic anchors. */
  var STEP_TYPES = ["pacemaker-fire", "atrial-depolarization", "av-arrival", "av-release",
    "ventricular-depolarization", "semilunar-valve-open", "ventricular-ejection",
    "ventricular-repolarization", "semilunar-valve-close", "av-valve-open"];

  C.engine.rhythm = {
    DEFS: DEFS,
    RATE_SPEC: RATE_SPEC,
    CANONICAL_START: CANONICAL_START,
    STEP_TYPES: STEP_TYPES,
    VENT_REFRACTORY_MS: VENT_REFRACTORY_MS,
    intervals: intervals,
    build: build,
    eventsNear: eventsNear,
    activeEvents: activeEvents,
    nextEvent: nextEvent,
    prevEvent: prevEvent
  };
})(window.CARDIAC);
