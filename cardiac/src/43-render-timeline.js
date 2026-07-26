/* 43-render-timeline.js — two tracks, one clock.
 *
 * The electrical track and the mechanical track are drawn separately and are
 * allowed to overlap, because they do: ejection continues into early
 * repolarisation, and relaxation begins while the T wave is still being written.
 * Nothing is forced onto a seven-stage normal-cycle rail, so an irregular or
 * arrest rhythm never displays a cycle label it does not have.
 */
(function (C) {
  "use strict";

  var M = C.M;

  var ELECTRICAL = {
    "atrial-depolarization": { label: "P — atria depolarise", cls: "t-p" },
    "av-arrival":            { label: "AV node", cls: "t-av" },
    "ventricular-depolarization": { label: "QRS — ventricles depolarise", cls: "t-qrs" },
    "ventricular-repolarization": { label: "T — ventricles repolarise", cls: "t-t" }
  };

  var MECHANICAL = {
    "atrial-systole":        { label: "Atrial contraction", cls: "m-atrial" },
    "ventricular-ejection":  { label: "Ejection", cls: "m-eject" }
  };

  function create(host) {
    host.innerHTML = "";
    host.classList.add("timeline");
    var wrap = document.createElement("div");
    wrap.className = "tl-wrap";

    function track(name, label) {
      var t = document.createElement("div");
      t.className = "tl-track tl-" + name;
      var l = document.createElement("span");
      l.className = "tl-label";
      l.textContent = label;
      var lane = document.createElement("div");
      lane.className = "tl-lane";
      t.appendChild(l); t.appendChild(lane);
      wrap.appendChild(t);
      return lane;
    }

    var elec = track("elec", "Electrical");
    var mech = track("mech", "Mechanical");

    var cursor = document.createElement("div");
    cursor.className = "tl-cursor";
    wrap.appendChild(cursor);

    host.appendChild(wrap);

    var legend = document.createElement("div");
    legend.className = "tl-legend";
    [["t-p", "P"], ["t-av", "AV delay"], ["t-qrs", "QRS"], ["t-t", "T"],
     ["m-atrial", "Atrial squeeze"], ["m-ivc", "Isovolumetric"], ["m-eject", "Ejection"],
     ["m-fill", "Passive filling"], ["m-kick", "Atrial kick"],
     ["m-ivr", "Isovolumetric relaxation"], ["m-none", "No effective output"]].forEach(function (pair) {
      var s = document.createElement("span");
      s.className = "tl-key";
      var sw = document.createElement("i");
      sw.className = pair[0];
      s.appendChild(sw);
      s.appendChild(document.createTextNode(pair[1]));
      legend.appendChild(s);
    });
    host.appendChild(legend);

    return { host: host, wrap: wrap, elec: elec, mech: mech, cursor: cursor, legend: legend };
  }

  /* A label that does not fit is worse than no label: it becomes "Ej…" and reads
   * as noise. Below the threshold the block keeps its colour, its tooltip and
   * its accessible name, and the legend carries the meaning. */
  /* Lane width is read once per update and passed in. Reading clientWidth per
     block forced a synchronous layout about seventy times a frame. */
  var laneW = 400;

  function block(lane, cls, left, width, label, extra) {
    var b = document.createElement("div");
    b.className = "tl-block " + cls + (extra || "");
    b.style.left = left.toFixed(2) + "%";
    b.style.width = Math.max(0.35, width).toFixed(2) + "%";
    var px = (width / 100) * laneW;
    if (px >= label.length * 6.2 + 8) {
      var s = document.createElement("span");
      s.textContent = label;
      b.appendChild(s);
    } else if (px >= 18) {
      var short = label.split(/[ —(]/)[0];
      if (px >= short.length * 5.4 + 5) {
        var s2 = document.createElement("span");
        s2.textContent = short;
        b.appendChild(s2);
      }
    }
    b.title = label;
    b.setAttribute("aria-label", label);
    lane.appendChild(b);
    return b;
  }

  function update(view, sim, frame, t0Ms, durMs) {
    view.elec.innerHTML = "";
    view.mech.innerHTML = "";

    // The block labels name the rhythm's features outright ("Blocked",
    // "Flutter wave"), which would hand the learner the answer mid-challenge.
    var hide = sim.state && sim.state.hideName;
    if (hide) {
      view.cursor.style.left = "0%";
      view.host.setAttribute("data-hidden", "1");
      return;
    }
    view.host.removeAttribute("data-hidden");
    laneW = view.elec.clientWidth || 400;

    var t1 = t0Ms + durMs;
    var events = sim.schedule.events;
    var pct = function (t) { return ((t - t0Ms) / durMs) * 100; };

    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.onsetMs > t1) break;
      var end = e.onsetMs + e.durMs;
      if (end < t0Ms) continue;

      var spec = ELECTRICAL[e.type];
      if (spec) {
        if (e.type === "av-arrival") {
          // The AV delay is the pause itself — show its whole length, and show
          // clearly when the impulse got there and stopped.
          var hold = e.conducted ? (e.prMs || 160) - 45 : 70;
          var b = block(view.elec, spec.cls, pct(e.onsetMs), (hold / durMs) * 100,
                        e.conducted ? "AV delay" : "Blocked",
                        e.conducted ? "" : " is-blocked");
          if (!e.conducted) b.setAttribute("data-blocked", "1");
        } else {
          var lbl = spec.label;
          if (e.type === "ventricular-depolarization" && e.wide) lbl = "QRS — wide, not via the fast path";
          if (e.type === "atrial-depolarization" && e.origin === "flutter") lbl = "Flutter wave";
          if (e.type === "atrial-depolarization" && e.origin === "ectopic-atrial") lbl = "P — early, different focus";
          block(view.elec, spec.cls, pct(e.onsetMs), (e.durMs / durMs) * 100, lbl);
        }
      }

      var mspec = MECHANICAL[e.type];
      if (mspec) {
        var mlabel = mspec.label;
        if (e.type === "ventricular-ejection" && frame && frame.arrest) mlabel = "No effective ejection";
        block(view.mech, mspec.cls, pct(e.onsetMs), (e.durMs / durMs) * 100, mlabel);
      }
    }

    /* Filling and the isovolumetric periods come from the beat record, so they
     * only appear where a real beat produced them. */
    var beats = sim.hemo.beats;
    for (var b2 = 0; b2 < beats.length; b2++) {
      var bt = beats[b2];
      if (bt.tMs > t1 + 500) break;
      if (bt.ejectEnd < t0Ms - 500) continue;
      if (!sim.hemo.noOutput && !sim.hemo.arrest) {
        block(view.mech, "m-ivc", pct(bt.closeMs), ((bt.ejectStart - bt.closeMs) / durMs) * 100, "Isovolumetric contraction");
        block(view.mech, "m-ivr", pct(bt.ejectEnd), ((bt.fillStart - bt.ejectEnd) / durMs) * 100, "Isovolumetric relaxation");
        var nextB = beats[b2 + 1];
        var fillEnd = nextB ? nextB.closeMs : bt.fillStart + 600;
        var fillSpan = fillEnd - bt.fillStart;
        if (bt.kick) {
          var kickAt = bt.fillStart + fillSpan * 0.72;
          block(view.mech, "m-fill", pct(bt.fillStart), ((kickAt - bt.fillStart) / durMs) * 100,
                "Passive filling \u2014 most of the ventricle fills here, before the atria contract");
          block(view.mech, "m-kick", pct(kickAt), ((fillEnd - kickAt) / durMs) * 100,
                "Atrial kick \u2014 atria contract and top up the last "
                + Math.round((bt.kickFrac || 0) * 100) + "% of filling");
        } else {
          block(view.mech, "m-fill", pct(bt.fillStart), (fillSpan / durMs) * 100,
                "Passive filling only \u2014 no atrial kick");
        }
      }
    }

    if (sim.hemo.noOutput) {
      block(view.mech, "m-none", 0, 100, sim.schedule.rhythmId === "asystole"
        ? "No organised electrical activity, so no contraction"
        : "No coordinated contraction — no effective output");
    } else if (sim.hemo.arrest) {
      block(view.mech, "m-none", 0, 100, "Organised complexes, but no effective output in this patient state");
    }

    var cf = M.clamp((sim.tMs - t0Ms) / durMs, 0, 1);
    view.cursor.style.left = (cf * 100).toFixed(2) + "%";
  }

  C.render.timeline = { create: create, update: update };
})(window.CARDIAC);
