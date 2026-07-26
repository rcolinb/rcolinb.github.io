/* 33-engine-hemo.js — the pump.
 *
 * Filling is computed from the diastolic time the rhythm actually left available,
 * so tachycardia, a dropped beat, a premature beat and an irregular ventricular
 * response all reduce stroke volume for the right reason instead of by decree.
 * Ejection is computed from contractility and the load the ventricle is working
 * against, separately for each side.
 *
 * All values are normalised 0-1 teaching coordinates. They are illustrative:
 * directional and bounded, never a patient measurement.
 */
(function (C) {
  "use strict";

  var M = C.M;

  var BASELINE = {
    preload: 0.50, systemicAfterload: 0.50, pulmonaryAfterload: 0.50,
    contractility: 0.50, compliance: 0.50
  };

  /* Named condition presets. Each states what it changes and why. */
  var PRESETS = {
    "normal": {},
    "hfref":  { contractility: 0.14, preload: 0.76, compliance: 0.46,
                why: "Weak systolic emptying, so the ventricle ends systole full, dilates, and fills at higher pressure." },
    "hfpef":  { compliance: 0.17, preload: 0.66, contractility: 0.56,
                why: "A stiff ventricle takes less volume for the same filling pressure. Ejection fraction can look normal while stroke volume is low." },
    "lvh":    { compliance: 0.28, contractility: 0.58, systemicAfterload: 0.66,
                why: "Thickened muscle is stiffer, so filling depends more on the atrial kick and on adequate diastolic time." },
    "rvh":    { pulmonaryAfterload: 0.78, compliance: 0.40,
                why: "The right ventricle is working against a raised pulmonary load." },
    "hyperkalemia": {}, "hypokalemia": {}, "hypercalcemia": {},
    "hypocalcemia": {}, "hypomagnesemia": {}, "pea": {}
  };

  /* Compensation presets. Each names its physiologic timescale so that seconds of
   * playback are never mistaken for hours of adaptation. */
  var COMPENSATION = {
    "off": { label: "Off", scale: null },
    "immediate-sympathetic": {
      label: "Sympathetic activation", scale: "seconds to minutes",
      apply: { contractility: +0.18, systemicAfterload: +0.14 }, rateMul: 1.22,
      buys: "Supports blood pressure and cardiac output right now.",
      costs: "Raises myocardial oxygen demand and cuts diastolic filling and coronary perfusion time."
    },
    "intermediate-redistribution": {
      label: "Venoconstriction and fluid shift", scale: "minutes to hours",
      apply: { preload: +0.16 }, rateMul: 1.06,
      buys: "Increases venous return and therefore filling.",
      costs: "Raises filling pressures; congestion appears if the ventricle is already stiff or weak."
    },
    "slower-fluid-retention": {
      label: "RAAS and ADH sodium/water retention", scale: "hours to days",
      apply: { preload: +0.26, systemicAfterload: +0.12 }, rateMul: 1.0,
      buys: "Defends circulating volume and perfusion pressure.",
      costs: "Oedema, pulmonary congestion, and more work for a failing ventricle."
    },
    "chronic-remodeling": {
      label: "Hypertrophy and remodelling", scale: "weeks to months",
      apply: { compliance: -0.22, contractility: +0.06, systemicAfterload: +0.06 }, rateMul: 1.0,
      buys: "Maintains pressure generation for a while.",
      costs: "Stiffer ventricle, higher oxygen demand, and eventual decompensation."
    }
  };

  function resolvePhysiology(state) {
    var p = {};
    for (var k in BASELINE) p[k] = BASELINE[k];
    var preset = PRESETS[state.condition];
    if (preset) for (var a in preset) if (a !== "why") p[a] = preset[a];
    if (state.physiology) {
      for (var b in state.physiology) {
        if (typeof state.physiology[b] === "number") p[b] = state.physiology[b];
      }
    }
    var comp = COMPENSATION[state.compensation || "off"];
    if (comp && comp.apply) {
      for (var c in comp.apply) p[c] = M.clamp(p[c] + comp.apply[c], 0, 1);
    }
    for (var d in p) p[d] = M.clamp(p[d], 0, 1);
    return p;
  }

  /* Volume the ventricle would reach given unlimited time: how hard the venous
   * side pushes, filtered through how readily the ventricle accepts volume.
   *
   * Two properties matter. The response to preload saturates, which is the
   * plateau of the Frank-Starling curve — piling on more filling pressure stops
   * buying volume. And compliance gates the whole thing, so a stiff ventricle
   * takes LESS volume even at a high filling pressure. That gate is what makes
   * HFpEF behave like HFpEF rather than like a well-filled normal heart. */
  function edvCapacity(preload, compliance) {
    var starling = 1 - Math.exp(-1.9 * preload);
    return M.clamp(0.22 + 0.938 * starling * (0.20 + 0.80 * compliance), 0.12, 1.0);
  }

  /* A stiff ventricle fills more slowly, so it is hurt more by lost time. */
  function fillTau(compliance) { return 70 + 220 * (1 - compliance); }

  /* How much of filling the atrial kick is responsible for. The stiffer the
   * ventricle, the more the kick matters — which is why losing it in atrial
   * fibrillation costs a stiff heart far more than a normal one. */
  function kickFraction(compliance) { return 0.10 + 0.20 * (1 - compliance); }

  /* Fraction of the filling period elapsed when the atria contract. */
  var KICK_ONSET = 0.72;

  /* How completely the ventricle empties. Modelling the FRACTION rather than an
   * absolute end-systolic volume is what keeps a weak ventricle weak: a failing
   * heart that dilates still ejects a small share of a larger volume, so stroke
   * volume falls even though end-diastolic volume rose. Getting this backwards
   * would teach that heart failure improves the stroke volume. */
  function ejectionFractionFor(contractility, afterload) {
    var strength = 0.35 + 1.30 * contractility;   // 1.0 at the 0.5 baseline
    var load = 0.72 + 0.56 * afterload;           // 1.0 at the 0.5 baseline
    return M.clamp(0.62 * strength / load, 0.06, 0.80);
  }

  function endSystolicVolume(edv, contractility, afterload) {
    var ef = ejectionFractionFor(contractility, afterload);
    return M.clamp(edv * (1 - ef), 0.04, edv * 0.97);
  }

  /* Per-beat mechanics for the whole schedule. */
  function compute(schedule, state) {
    var p = resolvePhysiology(state);
    var beats = schedule.beats;
    var tauFill = fillTau(p.compliance);
    var kf = kickFraction(p.compliance);
    var capL = edvCapacity(p.preload, p.compliance);
    var capR = edvCapacity(p.preload, M.clamp(p.compliance + 0.08, 0, 1));

    var arrest = state.patientState === "vf-arrest" || state.patientState === "asystole-arrest" ||
                 state.patientState === "pulseless-vt" || state.patientState === "pea";
    var noOutput = schedule.rhythmId === "vf" || schedule.rhythmId === "asystole";

    var out = [];
    var prevFillStart = schedule.beats.length ? (schedule.beats[0].tMs - 600) : 0;
    var prevEsvL = 0.3, prevEsvR = 0.3;

    for (var i = 0; i < beats.length; i++) {
      var b = beats[i];
      var closeMs = b.tMs + 22;
      var fillMs = Math.max(0, closeMs - prevFillStart);

      // Did an atrial contraction actually land in this filling period, close
      // enough to the end of it to load the ventricle before the valve shut?
      var kick = false;
      if (b.atrialMs !== null && b.atrialMs !== undefined) {
        var kickEnd = b.atrialMs + 55 + 110;
        kick = (kickEnd > closeMs - 260) && (b.atrialMs + 55 < closeMs);
      } else if (schedule.rhythmId === "avb3") {
        // In complete block the atria still contract, but only sometimes at a
        // useful moment relative to the ventricular beat.
        for (var q = 0; q < schedule.atrialTimes.length; q++) {
          var at = schedule.atrialTimes[q].t;
          if (at + 165 > closeMs - 240 && at + 55 < closeMs) { kick = true; break; }
        }
      }

      var passive = 1 - Math.exp(-fillMs / tauFill);
      var completion = passive * (1 - kf) + (kick ? kf : 0);
      completion = M.clamp(completion, 0.05, 1);

      // Each beat is computed from state, never from the previous beat's
      // end-systolic volume. Chaining them would make a short filling period
      // ratchet the whole run downward beat after beat, so a tachycardia would
      // decay to "no pulse" the longer a student watched it.
      var edvL = M.clamp(capL * completion, 0.08, 1.05);
      var edvR = M.clamp(capR * completion, 0.08, 1.05);

      // A ventricle cannot lose volume during diastole: the outflow valve is
      // shut and the only opening is the one blood comes IN through. Without
      // this floor a very premature beat — whose filling period is near zero —
      // gets an end-diastolic volume below the volume it started at, and the
      // chamber is drawn visibly shrinking while it fills. That inverts the
      // lesson a PVC is there to teach: the premature beat ejects little
      // because it never filled, not because the ventricle emptied itself.
      var last = out.length ? out[out.length - 1] : null;
      if (last) {
        edvL = Math.max(edvL, last.left.esv);
        edvR = Math.max(edvR, last.right.esv);
      }

      var esvL = endSystolicVolume(edvL, p.contractility, p.systemicAfterload);
      var esvR = endSystolicVolume(edvR, p.contractility, p.pulmonaryAfterload);

      var svL = Math.max(0, edvL - esvL);
      var svR = Math.max(0, edvR - esvR);

      // A beat that bypasses the His-Purkinje system contracts out of sequence,
      // so part of the wall is still relaxing while the rest squeezes.
      var dyssync = b.wide ? 0.68 : 1.0;
      var effL = svL * dyssync;
      var effR = svR * dyssync;

      if (noOutput || arrest) { effL = 0; effR = 0; }

      out.push({
        id: b.id, tMs: b.tMs, ejectStart: b.ejectStart, ejectEnd: b.ejectEnd,
        fillStart: b.fillStart, closeMs: closeMs, wide: b.wide, origin: b.origin,
        fillMs: Math.round(fillMs), kick: kick, kickFrac: kick ? kf : 0, completion: completion,
        left:  { edv: edvL, esv: esvL, sv: svL, ef: svL / edvL, eff: effL },
        right: { edv: edvR, esv: esvR, sv: svR, ef: svR / edvR, eff: effR },
        // "Effective" means it would be felt as a pulse in this illustrative
        // model. It is not a claim about a real patient's pulse.
        effective: effL > 0.14
      });

      prevFillStart = b.fillStart;
      prevEsvL = esvL; prevEsvR = esvR;
    }

    // Reference: what a normal heart at 75/min with baseline loading produces,
    // so relative output means something. The filling time is taken from the
    // scheduler's own interval model rather than assumed — assuming one the
    // scheduler never produces would put the whole normal sinus range below
    // "baseline" and flag healthy hearts as reduced.
    var refSv = (function () {
      var refRR = 800;
      var iv = C.engine.rhythm.intervals(refRR);
      var refFill = refRR - (22 + iv.ivcMs + iv.ejectMs + iv.ivrMs);
      var kfRef = kickFraction(0.5);
      var comp = (1 - Math.exp(-refFill / fillTau(0.5))) * (1 - kfRef) + kfRef;
      var edv = M.clamp(edvCapacity(0.5, 0.5) * comp, 0.08, 1.05);
      return (edv - endSystolicVolume(edv, 0.5, 0.5)) * 75;
    })();

    var congestion = M.clamp((p.preload * 1.10) / (0.35 + 0.90 * p.compliance) - 0.78, 0, 1);

    return {
      physiology: p, beats: out, refOutput: refSv,
      congestion: congestion,
      compensation: COMPENSATION[state.compensation || "off"],
      arrest: arrest, noOutput: noOutput
    };
  }

  /* Rolling output over a patient-time window. Irregular rhythms must be summed
   * beat by beat — multiplying a rate by one imaginary average stroke volume is
   * exactly the error that hides a pulse deficit. */
  function rollingOutput(hemo, tMs, windowMs) {
    var w = windowMs || 10000, sum = 0, n = 0, first = null, last = null;
    for (var i = 0; i < hemo.beats.length; i++) {
      var b = hemo.beats[i];
      if (b.tMs > tMs) break;
      if (b.tMs >= tMs - w) {
        if (first === null) first = b.tMs;
        last = b.tMs;
        sum += b.left.eff; n++;
      }
    }

    // Near the start of a run the window has not filled yet. Averaging over the
    // empty part would report "no output" for a perfectly good rhythm, so use
    // the beats that have actually happened and fall back to the schedule's own
    // rate until enough of them have.
    var perMin;
    if (n >= 3 && (last - first) > w * 0.4) {
      perMin = sum * (60000 / w);
    } else {
      var look = hemo.beats.slice(0, 12);
      if (!look.length) return { perMin: 0, beats: 0, relative: 0 };
      var s2 = 0;
      for (var k = 0; k < look.length; k++) s2 += look[k].left.eff;
      var meanSv = s2 / look.length;
      var span = look.length > 1 ? (look[look.length - 1].tMs - look[0].tMs) / (look.length - 1) : 800;
      perMin = meanSv * (60000 / Math.max(200, span));
    }
    return { perMin: perMin, beats: n, relative: hemo.refOutput ? perMin / hemo.refOutput : 0 };
  }

  function outputCategory(rel) {
    if (rel <= 0.02) return { key: "absent", label: "No effective output", tone: "critical" };
    if (rel < 0.55) return { key: "low", label: "Markedly reduced", tone: "warn" };
    if (rel < 0.85) return { key: "reduced", label: "Reduced", tone: "warn" };
    if (rel <= 1.18) return { key: "normal", label: "About baseline", tone: "ok" };
    return { key: "high", label: "Above baseline", tone: "ok" };
  }

  /* Pulse and perfusion are findings from the PATIENT, and in this product the
   * learner states them by choosing a patient-state fixture. The modelled output
   * grades how good the perfusion is; it never overrules the chosen state. A
   * learner who selects "VT with a pulse" and is then told there is no pulse
   * learns exactly the confusion this product exists to prevent. */
  var ARREST_STATES = ["pea", "pulseless-vt", "vf-arrest", "asystole-arrest"];

  function pulsePresent(state, rel) {
    if (ARREST_STATES.indexOf(state.patientState) >= 0) return false;
    return true;
  }

  function perfusionState(state, rel) {
    if (!pulsePresent(state, rel)) return "absent";
    return rel < 0.62 ? "compromised" : "adequate";
  }

  /* Chamber cavity volume at an instant, for the wall-motion animation.
   * Driven entirely by the scheduled events, so contraction can never begin
   * before the depolarisation that triggered it. */
  function ventricularVolumeAt(hemo, tMs) {
    var beats = hemo.beats;
    if (!beats.length) return { left: 0.72, right: 0.72, phase: "noncyclic", beat: null };

    var cur = null, next = null;
    for (var i = 0; i < beats.length; i++) {
      if (beats[i].closeMs <= tMs) { cur = beats[i]; next = beats[i + 1] || null; }
      else { if (!next) next = beats[i]; break; }
    }

    if (!cur) {
      var first = beats[0];
      var fillFrac = M.clamp((tMs - (first.tMs - 700)) / 700, 0, 1);
      return {
        left: M.lerp(first.left.esv, first.left.edv, M.smooth(fillFrac)),
        right: M.lerp(first.right.esv, first.right.edv, M.smooth(fillFrac)),
        phase: "late-filling", beat: first
      };
    }

    var L, R, phase;
    if (tMs < cur.ejectStart) {
      L = cur.left.edv; R = cur.right.edv; phase = "isovolumetric-contraction";
    } else if (tMs < cur.ejectEnd) {
      var u = (tMs - cur.ejectStart) / Math.max(1, cur.ejectEnd - cur.ejectStart);
      // Rapid ejection first, then reduced ejection.
      var e = 1 - Math.pow(1 - u, 2.1);
      L = M.lerp(cur.left.edv, cur.left.esv, e);
      R = M.lerp(cur.right.edv, cur.right.esv, e);
      phase = "ventricular-ejection";
    } else if (tMs < cur.fillStart) {
      L = cur.left.esv; R = cur.right.esv; phase = "isovolumetric-relaxation";
    } else {
      var target = next || cur;
      var span = Math.max(60, (next ? next.closeMs : cur.fillStart + 600) - cur.fillStart);
      var f = M.clamp((tMs - cur.fillStart) / span, 0, 1);
      // Rapid early filling, diastasis, then the atrial kick at the end.
      // Passive filling and the kick get exactly the shares the end-diastolic
      // volume was built from, so what a learner watches climb agrees with what
      // the readouts say. Passive alone must visibly leave the ventricle short:
      // the gap the atria close is the whole reason the atrial kick is taught.
      var kfA = target.kick ? (target.kickFrac || 0) : 0;
      var passiveShape = (1 - Math.exp(-3.1 * f)) / (1 - Math.exp(-3.1));
      var shape = passiveShape * (1 - kfA);
      if (kfA > 0 && f > KICK_ONSET) {
        shape += M.smooth((f - KICK_ONSET) / (1 - KICK_ONSET)) * kfA;
      }
      shape = M.clamp(shape, 0, 1);
      L = M.lerp(cur.left.esv, target.left.edv, shape);
      R = M.lerp(cur.right.esv, target.right.edv, shape);
      phase = (kfA > 0 && f > KICK_ONSET) ? "atrial-systole"
            : (f < 0.4 ? "early-filling" : "late-filling");
    }
    return { left: L, right: R, phase: phase, beat: cur };
  }

  /* Atrial cavity volume: fills continuously from the great veins, empties into
   * the ventricle when the AV valve is open, and squeezes during atrial systole. */
  var ATRIAL_FULL = 0.86;     // just before it contracts
  var ATRIAL_EMPTY = 0.54;    // just after
  var ATRIAL_REFILL_TAU = 260;

  function atrialVolumeAt(schedule, hemo, tMs) {
    if (schedule.rhythmId === "af") {
      // Fibrillating atria quiver; they do not squeeze.
      return { volume: ATRIAL_FULL + 0.02 * Math.sin(tMs / 40), contracting: 0, quiver: true };
    }

    var last = null;
    for (var i = 0; i < schedule.events.length; i++) {
      var e = schedule.events[i];
      if (e.onsetMs > tMs) break;
      if (e.type === "atrial-systole") last = e;
    }
    if (!last) return { volume: ATRIAL_FULL, contracting: 0, quiver: false };

    var u = (tMs - last.onsetMs) / Math.max(1, last.durMs);
    if (u < 1) {
      // The squeeze. Emptying is one-way — the atrium does not rebound as it
      // relaxes, it stays down and refills from the great veins. A symmetric
      // bump put the atrium back to full the instant contraction ended, which
      // read as though nothing had been transferred to the ventricle at all.
      return {
        volume: M.lerp(ATRIAL_FULL, ATRIAL_EMPTY, M.smooth(u)),
        contracting: C.M.hump(u),
        quiver: false
      };
    }

    var since = tMs - (last.onsetMs + last.durMs);
    var refill = 1 - Math.exp(-since / ATRIAL_REFILL_TAU);
    return {
      volume: ATRIAL_EMPTY + (ATRIAL_FULL - ATRIAL_EMPTY) * refill,
      contracting: 0,
      quiver: false
    };
  }

  C.engine.hemo = {
    ejectionFractionFor: ejectionFractionFor,
    edvCapacity: edvCapacity,
    BASELINE: BASELINE,
    PRESETS: PRESETS,
    COMPENSATION: COMPENSATION,
    resolvePhysiology: resolvePhysiology,
    compute: compute,
    rollingOutput: rollingOutput,
    outputCategory: outputCategory,
    perfusionState: perfusionState,
    pulsePresent: pulsePresent,
    ARREST_STATES: ARREST_STATES,
    ventricularVolumeAt: ventricularVolumeAt,
    atrialVolumeAt: atrialVolumeAt
  };
})(window.CARDIAC);
