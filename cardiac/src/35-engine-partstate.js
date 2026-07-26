/* 35-engine-partstate.js — what a given structure is doing at this instant.
 *
 * Generated from the frame, never authored. Twenty-five parts times seven
 * phases would be a hundred and seventy-five strings to keep in step with a
 * model that changes; this reads the same snapshot the drawing reads, so the
 * words and the picture cannot disagree.
 *
 * The clinical-honesty rules apply here as much as anywhere: conduction
 * structures are described as carrying or not carrying a signal, never as
 * causing a contraction, and nothing here reports a pulse.
 */
(function (C) {
  "use strict";

  function pct(v) { return Math.round(C.M.clamp(v, 0, 1.1) * 100); }

  /* Chamber fullness in words. A number alone invites false precision from an
   * illustrative model. */
  function fullness(v) {
    var p = pct(v);
    if (p >= 88) return "almost full";
    if (p >= 62) return "filling well";
    if (p >= 38) return "part full";
    if (p >= 18) return "nearly empty";
    return "empty";
  }

  var PHASE_DOING = {
    "early-filling": "filling rapidly through the open AV valve",
    "late-filling": "filling slowly — the pressure gradient has mostly equalised",
    "atrial-systole": "receiving the atrial kick, the last of its filling",
    "isovolumetric-contraction": "squeezing with every valve shut, building pressure but moving no blood",
    "ventricular-ejection": "ejecting through the open semilunar valve",
    "isovolumetric-relaxation": "relaxing with every valve shut, pressure falling",
    "noncyclic": "not following an organised cycle"
  };

  var COND_STATE = {
    idle: "quiet",
    active: "carrying the impulse now",
    spread: "carrying the impulse now",
    held: "holding the impulse — this is the delay",
    blocked: "blocked: the impulse is not getting through here",
    chaotic: "firing chaotically, with no organised wavefront",
    reentry: "carrying a wavefront that keeps circling instead of stopping"
  };

  function ventricle(side, frame) {
    var vol = side === "left" ? frame.volumes.leftVentricle : frame.volumes.rightVentricle;
    var doing = PHASE_DOING[frame.phase] || "between phases";
    return "About " + fullness(vol) + ", and " + doing + ".";
  }

  function atrium(side, frame) {
    var a = frame.volumes.atria, sq = frame.volumes.atrialContraction;
    if (frame.volumes.quiver) {
      return "Quivering rather than contracting, so it is not delivering an atrial kick.";
    }
    if (sq > 0.25) return "Contracting now, pushing its last volume into the ventricle.";
    var av = side === "left" ? frame.valves.mitral : frame.valves.tricuspid;
    if (av && av.open) return "About " + fullness(a) + ", draining passively into the ventricle through the open valve.";
    return "About " + fullness(a) + ", filling from its veins while the AV valve is shut.";
  }

  function valve(name, frame) {
    var v = frame.valves[name];
    if (!v) return "";
    var isAV = (name === "tricuspid" || name === "mitral");
    if (v.open) {
      return isAV
        ? "Open — blood is moving from atrium to ventricle."
        : "Open — the ventricle is ejecting through it.";
    }
    return isAV
      ? "Shut — ventricular pressure is above atrial pressure, so nothing can go back."
      : "Shut — arterial pressure is above ventricular pressure, so nothing can fall back in.";
  }

  function conduction(region, frame) {
    var c = frame.conduction[region];
    if (!c) return "Quiet at this instant.";
    var word = COND_STATE[c.state] || (c.level > 0.2 ? "carrying the impulse now" : "quiet");
    if (c.state === "idle" && c.level > 0.2) word = "carrying the impulse now";
    return word.charAt(0).toUpperCase() + word.slice(1) + ".";
  }

  function flowing(fromId, toId, frame) {
    for (var i = 0; i < frame.flow.length; i++) {
      var f = frame.flow[i];
      if (f.from === fromId || f.to === toId || f.to === fromId || f.from === toId) {
        return f.open === undefined ? f.active : f.open;
      }
    }
    return null;
  }

  var VESSEL_FLOW = {
    "svc": "Blood is returning through it continuously — venous return does not pulse with the cycle.",
    "ivc": "Blood is returning through it continuously — venous return does not pulse with the cycle.",
    "pulmonary-veins": "Blood is returning from the lungs continuously, whatever the ventricles are doing."
  };

  /* The one public entry point. Returns a sentence, or "" when there is nothing
   * honest to say about this structure at this instant. */
  function describePart(key, frame) {
    if (!frame) return "";
    switch (key) {
      case "left-ventricle":  return ventricle("left", frame);
      case "right-ventricle": return ventricle("right", frame);
      case "left-atrium":     return atrium("left", frame);
      case "right-atrium":    return atrium("right", frame);

      case "tricuspid": case "mitral": case "pulmonic": case "aortic":
        return valve(key, frame);

      case "chordae":
        return (frame.valves.mitral && frame.valves.mitral.open)
          ? "Slack — the valve is open, so nothing is pulling on them."
          : "Taut — the valve has shut and they are holding the leaflets against ventricular pressure.";
      case "papillary":
        return (frame.phase === "ventricular-ejection" || frame.phase === "isovolumetric-contraction")
          ? "Shortened with the contracting wall, keeping tension on the valve."
          : "Relaxed with the wall around them.";

      case "sa-node": case "av-node": case "his-bundle": case "bachmann":
      case "right-bundle": case "left-bundle":
      case "left-purkinje": case "right-purkinje":
        return conduction(key, frame);

      case "aorta":
        return (frame.valves.aortic && frame.valves.aortic.open)
          ? "Receiving the stroke volume now, and stretching to take it."
          : "Its valve is shut. The elastic recoil of its wall is what keeps blood moving on through diastole.";
      case "pulmonary-artery":
        return (frame.valves.pulmonic && frame.valves.pulmonic.open)
          ? "Receiving the right ventricle's output now."
          : "Its valve is shut while the right ventricle refills.";

      case "svc": case "ivc": case "pulmonary-veins":
        return VESSEL_FLOW[key];

      case "septum":
        return conduction("left-bundle", frame) === "Quiet."
          ? "Quiet at this instant." : "Activating — it depolarises first, and from left to right.";
      case "junction":
        return (frame.valves.mitral && frame.valves.mitral.open)
          ? "Its valves are open, so atria and ventricles are connected."
          : "Its valves are shut, sealing the ventricles off from the atria.";
      default:
        return "";
    }
  }

  C.engine.partState = { describePart: describePart, fullness: fullness };
})(CARDIAC);
