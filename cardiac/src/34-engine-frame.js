/* 34-engine-frame.js — one snapshot for every renderer.
 *
 * The heart drawing, the ECG cursor, the timeline, the readouts and the screen
 * reader text all read this single object at the same simulation time. There is
 * one clock and one truth about what is happening.
 */
(function (C) {
  "use strict";

  var M = C.M;
  var R = C.engine.rhythm;
  var H = C.engine.hemo;

  var VALVES = ["tricuspid", "mitral", "pulmonic", "aortic"];

  var FLOW_PATHS = [
    { id: "svc-to-ra", from: "svc", to: "right-atrium", gate: null, rule: "venous" },
    { id: "ivc-to-ra", from: "ivc", to: "right-atrium", gate: null, rule: "venous" },
    { id: "pulmonary-veins-to-la", from: "pulmonary-veins", to: "left-atrium", gate: null, rule: "venous" },
    { id: "ra-to-rv", from: "right-atrium", to: "right-ventricle", gate: "tricuspid", rule: "filling" },
    { id: "la-to-lv", from: "left-atrium", to: "left-ventricle", gate: "mitral", rule: "filling" },
    { id: "rv-to-pulmonary-artery", from: "right-ventricle", to: "pulmonary-artery", gate: "pulmonic", rule: "ejection" },
    { id: "lv-to-aorta", from: "left-ventricle", to: "aorta", gate: "aortic", rule: "ejection" }
  ];

  /* --------------------------------------------------------- conduction map */

  var IDLE = { level: 0, state: "idle", progress: 0 };

  /* Events that represent electrical activity. Everything else the scheduler
   * emits — atrial-systole, the valve events, ventricular-ejection — is
   * mechanical and belongs to the hemodynamic model, not to this one. */
  var ELECTRICAL = {
    "pacemaker-fire": 1, "atrial-depolarization": 1,
    "av-arrival": 1, "av-release": 1,
    "his-activation": 1, "bundle-activation": 1, "purkinje-activation": 1,
    "ventricular-depolarization": 1, "ventricular-repolarization": 1
  };

  var NO_AFTERGLOW = { "av-arrival": 1, "atrial-depolarization": 1 };

  var ATRIA = ["right-atrium", "left-atrium"];
  var ATRIAL_REFRACTORY_MS = 150;
  var ATRIAL_HELD_LEVEL = 0.22;

  function regionActivation(schedule, tMs) {
    var map = {};
    for (var r = 0; r < C.REGIONS.length; r++) map[C.REGIONS[r]] = { level: 0, state: "idle", progress: 0 };

    var rhythm = schedule.rhythmId;

    /* Disorganised activity is not a wavefront travelling a path — it is many
     * wavefronts at once. Show it as such rather than as a normal impulse. */
    if (rhythm === "af") {
      var f = 0.45 + 0.35 * Math.abs(Math.sin(tMs / 37)) * Math.abs(Math.cos(tMs / 23));
      map["right-atrium"] = { level: f, state: "chaotic", progress: 0 };
      map["left-atrium"] = { level: f * 0.9, state: "chaotic", progress: 0 };
    }
    if (rhythm === "vf") {
      var g = 0.5 + 0.45 * Math.abs(Math.sin(tMs / 29) * Math.cos(tMs / 41));
      map["right-ventricle"] = { level: g, state: "chaotic", progress: 0 };
      map["left-ventricle"] = { level: g * 0.95, state: "chaotic", progress: 0 };
      map["right-purkinje"] = { level: g * 0.5, state: "chaotic", progress: 0 };
      map["left-purkinje"] = { level: g * 0.5, state: "chaotic", progress: 0 };
    }
    if (rhythm === "aflutter") {
      // Organised macro-reentry: one wavefront circling the right atrium.
      var cyc = schedule.continuous[0] ? schedule.continuous[0].cycleMs : 200;
      var ph = (tMs % cyc) / cyc;
      map["right-atrium"] = { level: 0.85, state: "reentry", progress: ph };
      map["left-atrium"] = { level: 0.5, state: "active", progress: (ph + 0.35) % 1 };
    }

    var events = schedule.events;
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.onsetMs > tMs + 1) break;
      /* This map is the ELECTRICAL one. Mechanical events must not feed it:
       * atrial-systole targets right-atrium/left-atrium, the same keys the
       * conduction glow reads, so the atrial squeeze was lighting the atria as
       * though a wavefront were still crossing them all through the PR segment.
       * Filtering on the `mech` field cannot separate them — atrial-systole and
       * atrial-depolarization are both tagged "atrial". */
      if (!ELECTRICAL[e.type]) continue;
      /* Brief afterglow so a FAST event is still visible — bundle activation is
       * 16 ms and would otherwise flicker past. The P wave is 95 ms and needs no
       * help; giving it a tail meant a decaying "active" wavefront kept
       * outranking the depolarised hold for most of the PR segment, which is the
       * exact impression this change exists to remove. */
      var tail = NO_AFTERGLOW[e.type] ? 0 : 90;
      var u = (tMs - e.onsetMs) / e.durMs;
      var within = u >= 0 && u < 1;
      var glow = within ? 1 : (tMs - (e.onsetMs + e.durMs)) / tail;
      if (!within && (glow < 0 || glow > 1)) continue;
      var level = within ? (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, u * 1.6)))
                         : (1 - glow) * 0.45;
      if (level <= 0.02) continue;

      var regions = [e.region];
      if (e.region2) regions.push(e.region2);

      var state = "active";
      if (e.type === "av-arrival") {
        if (!e.conducted) {
          // The impulse arrived and stopped. That is the whole lesson.
          state = "blocked";
          level = Math.max(level, 0.8);
        } else {
          state = "delay";
        }
      }
      if (e.type === "ventricular-depolarization" && e.wide) state = "slow-spread";

      for (var k = 0; k < regions.length; k++) {
        var key = regions[k];
        if (!map[key]) continue;
        if (level >= map[key].level || state === "blocked") {
          map[key] = { level: Math.max(level, map[key].level), state: state,
                       progress: M.clamp(u, 0, 1), eventId: e.id, origin: e.origin };
        }
      }
    }

    /* After the P wave the atria are DEPOLARISED, not depolarising — held and
     * refractory, with no wavefront left to travel. Showing them still lit
     * through the PR segment made the pause read as atrial conduction rather
     * than as the AV node holding, which is the one thing that stretch of flat
     * line exists to teach. A low steady level says "already fired"; zero would
     * say nothing happened here at all.
     *
     * Refractoriness genuinely outlasts the QRS onset, so this does not stop at
     * the PR segment — it is dim enough not to compete with the ventricles. */
    for (var p = 0; p < events.length; p++) {
      var d = events[p];
      if (d.onsetMs > tMs) break;
      if (d.type !== "atrial-depolarization") continue;
      var endP = d.onsetMs + d.durMs;
      if (tMs < endP || tMs >= endP + ATRIAL_REFRACTORY_MS) continue;
      for (var ai = 0; ai < ATRIA.length; ai++) {
        var ak = ATRIA[ai];
        if (map[ak] && map[ak].level < ATRIAL_HELD_LEVEL) {
          map[ak] = { level: ATRIAL_HELD_LEVEL, state: "depolarised",
                      progress: 0, eventId: d.id };
        }
      }
    }

    /* The AV node holds the impulse for the whole PR interval — that pause is a
     * feature, not dead time, so keep it lit while it is happening. */
    for (var j = 0; j < events.length; j++) {
      var a = events[j];
      if (a.type !== "av-arrival" || !a.conducted) continue;
      if (a.onsetMs > tMs) break;
      var rel = tMs - a.onsetMs;
      var hold = (a.prMs || 160) - 45;
      if (rel >= 0 && rel < hold) {
        map["av-node"] = { level: 0.45 + 0.25 * (rel / hold), state: "delay",
                           progress: rel / hold, eventId: a.id };
      }
    }
    return map;
  }

  /* -------------------------------------------------------------- valves */

  function valveStates(schedule, tMs) {
    var v = {
      tricuspid: { open: true, since: -1e9 }, mitral: { open: true, since: -1e9 },
      pulmonic: { open: false, since: -1e9 }, aortic: { open: false, since: -1e9 }
    };
    var events = schedule.events;
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.onsetMs > tMs) break;
      var targets = [e.region, e.region2];
      for (var t = 0; t < 2; t++) {
        var name = targets[t];
        if (!name || !v[name]) continue;
        if (e.type === "av-valve-close" || e.type === "semilunar-valve-close") {
          v[name].open = false; v[name].since = e.onsetMs;
        } else if (e.type === "av-valve-open" || e.type === "semilunar-valve-open") {
          v[name].open = true; v[name].since = e.onsetMs;
        }
      }
    }
    for (var k = 0; k < VALVES.length; k++) {
      var n = VALVES[k];
      var age = tMs - v[n].since;
      v[n].motion = M.clamp(age / 55, 0, 1);          // leaflet travel, visual only
      v[n].openFraction = v[n].open ? M.smooth(v[n].motion) : 1 - M.smooth(v[n].motion);
      v[n].flowPermitted = v[n].open;
    }
    return v;
  }

  /* ---------------------------------------------------------------- flow */

  function flowStates(schedule, valves, phase, hemo, tMs, state) {
    var out = {};
    var stopped = hemo.noOutput || hemo.arrest;
    var ejecting = phase === "ventricular-ejection";
    var filling = phase === "early-filling" || phase === "late-filling" || phase === "atrial-systole";

    for (var i = 0; i < FLOW_PATHS.length; i++) {
      var p = FLOW_PATHS[i];
      var gateOpen = p.gate ? valves[p.gate].flowPermitted : true;
      var active = false, intensity = 0;

      if (p.rule === "venous") {
        active = !stopped;
        intensity = active ? 0.35 + 0.30 * hemo.physiology.preload : 0;
      } else if (p.rule === "filling") {
        active = gateOpen && filling && !stopped;
        intensity = active ? (phase === "atrial-systole" ? 0.95 : 0.70) : 0;
      } else {
        active = gateOpen && ejecting && !stopped;
        intensity = active ? 0.95 : 0;
      }
      // Hard invariant: nothing moves forward through a valve that is shut.
      if (p.gate && !gateOpen) { active = false; intensity = 0; }
      out[p.id] = { active: active, intensity: intensity, gate: p.gate, direction: "forward" };
    }
    return out;
  }

  /* -------------------------------------------------------------- snapshot */

  function frameAt(sim, tMs) {
    var schedule = sim.schedule, hemo = sim.hemo, state = sim.state;

    var vol = H.ventricularVolumeAt(hemo, tMs);
    var atr = H.atrialVolumeAt(schedule, hemo, tMs);
    var valves = valveStates(schedule, tMs);
    var phase = vol.phase;
    var flow = flowStates(schedule, valves, phase, hemo, tMs, state);
    var conduction = regionActivation(schedule, tMs);
    var roll = H.rollingOutput(hemo, tMs, 10000);
    var perf = H.perfusionState(state, roll.relative);

    var active = R.activeEvents(schedule, tMs);
    var lead = R.prevEvent(schedule, tMs + 1, R.STEP_TYPES);

    return {
      tMs: tMs,
      phase: phase,
      events: active,
      leadEvent: lead,
      conduction: conduction,
      valves: valves,
      flow: flow,
      volumes: { leftVentricle: vol.left, rightVentricle: vol.right,
                 atria: atr.volume, atrialContraction: atr.contracting, quiver: atr.quiver },
      beat: vol.beat,
      output: roll,
      outputCategory: H.outputCategory(roll.relative),
      perfusion: perf,
      arrest: hemo.arrest || hemo.noOutput,
      pulse: !hemo.noOutput && H.pulsePresent(state, roll.relative)
    };
  }

  /* ------------------------------------------------------- accessible text */

  var PHASE_TEXT = {
    "late-filling": "late ventricular filling",
    "atrial-systole": "atrial contraction topping up the ventricle",
    "isovolumetric-contraction": "ventricles squeezing with all four valves shut",
    "ventricular-ejection": "ejection through the open semilunar valves",
    "isovolumetric-relaxation": "ventricles relaxing with all four valves shut",
    "early-filling": "rapid early ventricular filling",
    "noncyclic": "no organised cycle"
  };

  var EVENT_TEXT = {
    "pacemaker-fire": "the pacemaker fires",
    "atrial-depolarization": "atrial depolarisation, drawn as the P wave",
    "av-arrival": "the impulse reaches the AV node",
    "av-release": "the AV node releases the impulse",
    "his-activation": "the His bundle activates",
    "bundle-activation": "the bundle branches activate",
    "purkinje-activation": "the Purkinje network activates",
    "ventricular-depolarization": "ventricular depolarisation, drawn as the QRS",
    "atrial-systole": "the atria contract",
    "av-valve-close": "the AV valves close (S1)",
    "semilunar-valve-open": "the semilunar valves open",
    "ventricular-ejection": "blood is ejected",
    "ventricular-repolarization": "ventricular repolarisation, drawn as the T wave",
    "semilunar-valve-close": "the semilunar valves close (S2)",
    "av-valve-open": "the AV valves open",
    "ventricular-filling": "the ventricles fill"
  };

  /* The label has to know where the impulse came from. Calling a flutter wave a
   * P wave, or a ventricular escape beat a normal QRS, would contradict the
   * teaching panel sitting next to it. */
  function eventLabel(e) {
    if (!e) return "Waiting for the first event";
    var base = EVENT_TEXT[e.type] || e.type;

    if (e.type === "atrial-depolarization") {
      if (e.origin === "flutter") base = "a flutter wave — organised atrial reentry, not a P wave";
      else if (e.origin === "ectopic-atrial") base = "an early atrial beat from a different focus, so the P wave looks different";
      else if (e.origin === "retrograde") base = "the atria activating backwards from the junction, usually hidden in the QRS or T";
    }
    if (e.type === "ventricular-depolarization" && e.wide) {
      base = e.origin === "escape-ventricular"
        ? "a ventricular escape beat — wide, because it never used the fast pathway"
        : "a ventricular beat that bypassed the fast pathway, so it is wide and slow";
    }
    if (e.type === "av-arrival" && e.conducted === false) {
      base = "the impulse reaches the AV node — blocked, so no QRS follows";
    }
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  function describe(sim, frame) {
    var s = sim.state, m = sim.measures;
    var parts = [];
    var rdef = C.content.rhythms[s.rhythm];
    parts.push((rdef ? rdef.label : s.rhythm) + ".");
    if (m.ventricularRate) parts.push("Ventricular rate about " + m.ventricularRate + " per minute" +
      (m.regular === false ? ", irregular." : ", regular."));
    if (m.atrialRate && m.atrialRate !== m.ventricularRate) parts.push("Atrial rate about " + m.atrialRate + ".");
    parts.push("Viewing lead " + s.selectedLead + ".");
    if (frame.leadEvent) parts.push("Now: " + eventLabel(frame.leadEvent) + ".");
    parts.push("Mechanically: " + (PHASE_TEXT[frame.phase] || frame.phase) + ".");
    var shut = [], open = [];
    for (var i = 0; i < VALVES.length; i++) (frame.valves[VALVES[i]].open ? open : shut).push(VALVES[i]);
    parts.push("Open valves: " + (open.length ? open.join(", ") : "none") + ".");
    parts.push("Relative cardiac output " + frame.outputCategory.label.toLowerCase() + ".");
    parts.push("Perfusion in this model: " + frame.perfusion + ".");
    if (frame.arrest) parts.push("This is an arrest state; there is no effective output.");
    return parts.join(" ");
  }

  C.engine.frame = {
    FLOW_PATHS: FLOW_PATHS,
    VALVES: VALVES,
    PHASE_TEXT: PHASE_TEXT,
    EVENT_TEXT: EVENT_TEXT,
    regionActivation: regionActivation,
    valveStates: valveStates,
    frameAt: frameAt,
    eventLabel: eventLabel,
    describe: describe
  };
})(window.CARDIAC);
