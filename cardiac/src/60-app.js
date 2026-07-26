/* 60-app.js — state, the single clock, and wiring.
 *
 * One monotonic time source drives everything. Simulation time is anchored to an
 * origin and a playback rate rather than accumulated frame by frame, so a
 * dropped frame cannot shift the physiology, and animation speed is a completely
 * separate quantity from the patient's heart rate.
 */
(function (C) {
  "use strict";

  var M = C.M, R = C.engine.rhythm, E = C.engine.ecg, H = C.engine.hemo, F = C.engine.frame;
  var P = C.ui.panels, h = P.h;

  var SCHEDULE_MS = 90000;

  var app = {
    state: null,
    schedule: null, wave: null, hemo: null, measures: null,
    tMs: 0, playing: false,
    reducedMotion: false,
    heartView: null, timelineView: null,
    _origin: 0, _originT: 0, _raf: null, _dirty: true
  };

  function defaults() {
    return {
      mode: "basic",
      leadView: "single",
      selectedLead: "II",
      focus: "anatomy",
      labelSet: "chambers",
      rhythm: "nsr",
      rates: {},
      flutterRatio: 2,
      condition: "normal",
      compensation: "off",
      patientState: "perfusing-default",
      physiology: null,
      seed: 4182,
      noise: 0,
      playbackRate: 0.25,
      stripSeconds: 6,
      highlightTags: [],
      spotlight: [],
      hideName: false,
      tab: "rhythm"
    };
  }

  /* --------------------------------------------------------------- rebuild */

  function rebuild(preserveTime) {
    // A selected wave belongs to a specific schedule; keeping it across a
    // rhythm or condition change would point at a wave that no longer exists.
    if (app._selectedWave) {
      app._selectedWave = null;
      var box = document.getElementById("waveExplainer");
      if (box) box.hidden = true;
    }
    var t = preserveTime ? app.tMs : null;
    app.schedule = R.build(app.state, SCHEDULE_MS);
    app.wave = E.buildWavelets(app.schedule, app.state);
    app.hemo = H.compute(app.schedule, app.state);
    app.measures = E.measure(app.schedule, app.wave, app.state);
    app.tMs = (t === null) ? app.schedule.startMs : t;
    setOrigin();
    app._dirty = true;
  }

  function setOrigin() {
    app._origin = app.tMs;
    app._originT = performance.now();
  }

  /* Dragging a slider fires an input event per pixel, and each one would
   * regenerate ninety seconds of schedule, waveform and beat mechanics. Coalesce
   * them into one rebuild per frame so the drag stays smooth. */
  var _pendingRebuild = false;
  function rebuildSoon() {
    if (_pendingRebuild) return;
    _pendingRebuild = true;
    requestAnimationFrame(function () {
      _pendingRebuild = false;
      rebuild(true);
    });
  }

  /* ------------------------------------------------------------------ loop */

  function tick() {
    app._raf = requestAnimationFrame(tick);
    if (app.playing) {
      var wall = performance.now() - app._originT;
      var next = app._origin + wall * app.state.playbackRate;
      if (next > SCHEDULE_MS - 4000) {
        // Roll back to the teaching start rather than run off the end of the
        // generated schedule.
        app.tMs = app.schedule.startMs;
        setOrigin();
      } else {
        app.tMs = next;
      }
      app._dirty = true;
    }
    if (app._dirty) { draw(); app._dirty = false; }
  }

  function draw() {
    var frame = F.frameAt(app, app.tMs);
    app.frame = frame;

    C.render.heart.update(app.heartView, app, frame);

    var stripCanvas = document.getElementById("stripCanvas");
    var twelveCanvas = document.getElementById("twelveCanvas");
    var showTwelve = app.state.leadView === "twelve";

    // The 12-lead grid already carries a Lead II rhythm strip along its bottom,
    // so showing a second one would only steal height from the grid.
    document.getElementById("twelveWrap").hidden = !showTwelve;
    document.getElementById("stripWrap").hidden = showTwelve;
    document.getElementById("detailWrap").hidden = showTwelve;

    var layout;
    if (showTwelve) {
      app._twelveLayout = C.render.ecg.drawTwelve(twelveCanvas, app, {
        highlightTags: app.state.highlightTags
      });
      layout = { t0: app._twelveLayout.t0, durMs: app._twelveLayout.segMs };
    } else {
      layout = C.render.ecg.drawStrip(stripCanvas, app, {
        seconds: app.state.stripSeconds, highlightTags: app.state.highlightTags,
        hoverRegion: app._hover && app._hover.on === "strip" ? app._hover.region : null,
        selectedRegion: regionInWindow(app._selectedWave, layoutWindow(app._stripLayout))
      });
      app._stripLayout = layout;
      app._detailLayout = C.render.ecg.drawBeatDetail(document.getElementById("detailCanvas"), app, {
        highlightTags: app.state.highlightTags,
        hoverRegion: app._hover && app._hover.on === "detail" ? app._hover.region : null,
        selectedRegion: regionInWindow(app._selectedWave, layoutWindow(app._detailLayout))
      });
    }

    renderLens();
    C.render.timeline.update(app.timelineView, app, frame, layout.t0, layout.durMs);
    renderReadouts(frame);
    renderEventChip(frame);

    document.getElementById("stateSummary").textContent = app.state.hideName
      ? "Rhythm challenge in progress. The rhythm name and measurements are hidden until you commit."
      : F.describe(app, frame);
  }

  /* The lead-as-lens overlay: the net electrical vector drawn against the
   * frontal lead axes, so "why is the QRS upright here and inverted there"
   * becomes a matter of looking at which way the arrow points. */
  function renderLens() {
    var show = app.state.mode === "advanced" && !app.state.hideName;
    var row = document.getElementById("lensRow");
    row.hidden = !show;
    if (!show) return;

    C.render.ecg.drawVectorLoop(document.getElementById("lensCanvas"), app);

    var lead = app.state.selectedLead;
    var info = C.engine.vector.LEAD_INFO[lead];
    var d = E.dipoleAt(app.wave, app.tMs);
    var proj = C.engine.vector.projectLead(d, lead);
    var mag = Math.hypot(d[0], d[1], d[2]);
    var sense = mag < 0.04 ? "there is almost no net vector at this instant, so the trace sits on the baseline"
      : proj > 0.05 ? "the wavefront is heading toward this lead's positive electrode, so the trace goes up"
      : proj < -0.05 ? "the wavefront is heading away from this lead's positive electrode, so the trace goes down"
      : "the wavefront is running nearly perpendicular to this lead, so it records very little";

    var note = document.getElementById("lensNote");
    note.innerHTML = "";
    note.appendChild(h("b", { text: "Lead " + lead + " — " + info.plane + " plane, " + info.angle + "°" }));
    note.appendChild(document.createTextNode(
      "This lead views the " + info.view + ". Right now " + sense + ". " +
      "The loop is the same beat seen as a rotating vector; every lead is that one vector projected onto a different axis."));
  }

  /* ------------------------------------------------------- wave interaction */

  function layoutWindow(l) { return l ? { t0: l.t0, t1: l.t0 + l.durMs } : null; }

  function regionInWindow(sel, win) {
    if (!sel || !win) return null;
    return (sel.t1 > win.t0 && sel.t0 < win.t1) ? sel : null;
  }

  function pickRegion(canvas, layout, clientX) {
    if (!layout) return null;
    var regions = C.render.ecg.waveRegions(app.wave, app.schedule, layout.t0, layout.durMs);
    return C.render.ecg.regionAt(regions, C.render.ecg.timeAtX(layout, canvas, clientX));
  }

  /* Selecting a wave pauses there, spotlights what the heart is doing at that
   * instant, and explains it beside the tracing. One click, three connections. */
  function selectWave(region) {
    app._selectedWave = region || null;
    var box = document.getElementById("waveExplainer");
    if (!region) {
      box.hidden = true;
      api.setHighlight([]);
      api.setSpotlight([]);
      app._dirty = true;
      return;
    }
    var g = C.content.waveGuide[region.key];
    if (!g) { box.hidden = true; return; }

    api.pause();
    // Land a little inside the region so the heart shows it mid-event.
    api.seek({ kind: "time", ms: region.t0 + (region.t1 - region.t0) * 0.45 });
    api.setSpotlight(g.spotlight || []);
    // The band drawn over the selected region is the highlight. Also tinting
    // every other P and QRS in the six-second window buries it in noise.
    api.setHighlight([]);

    document.getElementById("waveTitle").textContent = g.label;
    var body = document.getElementById("waveBody");
    body.innerHTML = "";
    [["Electrically", g.electrical, ""], ["In the heart, right now", g.mechanical, ""],
     ["Careful", g.caution, "caution"]].forEach(function (row) {
      if (!row[1]) return;
      body.appendChild(h("dt", { text: row[0] }));
      body.appendChild(h("dd", { text: row[1], class: row[2] || null }));
    });
    box.hidden = false;
    // The panel scrolls, so an explainer that opens below the fold reads as
    // nothing having happened.
    if (box.scrollIntoView) box.scrollIntoView({ block: "nearest", behavior: "smooth" });
    api.announce(g.label + ". " + g.mechanical);
    app._dirty = true;
  }

  /* -------------------------------------------------------------- readouts */

  function renderReadouts(frame) {
    var host = document.getElementById("readouts");
    var m = app.measures, s = app.state;
    var items = [];
    if (s.hideName) {
      host.innerHTML = "";
      host.appendChild(h("div", { class: "readout" }, [
        h("dt", { text: "Measurements" }),
        h("dd", { text: "Hidden" })
      ]));
      return;
    }

    items.push(["Ventricular rate", m.ventricularRate ? m.ventricularRate : "—",
                m.ventricularRate ? "/min" : "", null]);
    if (m.atrialRate && m.atrialRate !== m.ventricularRate) {
      items.push(["Atrial rate", m.atrialRate, "/min", null]);
    }
    items.push(["Rhythm", m.regular === null ? "—" : (m.regular ? "Regular" : "Irregular"), "", null]);
    if (m.prMs && s.rhythm !== "af" && s.rhythm !== "avb3" && s.rhythm !== "vt") {
      items.push(["PR", (m.prMs / 1000).toFixed(2), "s", m.prMs > 200 ? "warn" : null]);
    }
    if (m.qrsMs) items.push(["QRS", (m.qrsMs / 1000).toFixed(2), "s", m.qrsMs >= 120 ? "warn" : null]);
    if (s.mode === "advanced") {
      if (m.qtMs) items.push(["QT", (m.qtMs / 1000).toFixed(2), "s", null]);
      if (m.axis !== null && m.axis !== undefined && s.leadView === "twelve") {
        items.push(["QRS axis", m.axis + "°", "", m.axisLabel === "normal axis" ? null : "warn"]);
      }
    }

    var cat = frame.outputCategory;
    items.push(["Relative output", cat.label, "", cat.tone === "ok" ? null : cat.tone]);
    items.push(["Pulse", frame.pulse ? "Present" : "Absent", "",
                frame.pulse ? null : "critical"]);
    items.push(["Perfusion", frame.perfusion.charAt(0).toUpperCase() + frame.perfusion.slice(1), "",
                frame.perfusion === "adequate" ? null : frame.perfusion === "absent" ? "critical" : "warn"]);

    host.innerHTML = "";
    items.forEach(function (it) {
      var d = h("div", { class: "readout" });
      if (it[3]) d.setAttribute("data-tone", it[3]);
      d.appendChild(h("dt", { text: it[0] }));
      var dd = h("dd", { text: String(it[1]) });
      if (it[2]) dd.appendChild(h("small", { text: " " + it[2] }));
      d.appendChild(dd);
      host.appendChild(d);
    });
  }

  function renderEventChip(frame) {
    document.getElementById("eventText").textContent = app.state.hideName
      ? "Read the strip yourself, then commit in the Quiz tab"
      : F.eventLabel(frame.leadEvent);
  }

  function setHiddenOption(sel) {
    var opt = sel.querySelector('option[value="__hidden"]');
    if (!opt) {
      opt = document.createElement("option");
      opt.value = "__hidden"; opt.textContent = "— hidden for the challenge —";
      sel.insertBefore(opt, sel.firstChild);
    }
    sel.value = "__hidden";
  }
  function clearHiddenOption(sel) {
    var opt = sel.querySelector('option[value="__hidden"]');
    if (opt) opt.remove();
  }

  /* -------------------------------------------------------------- rail tabs */

  var TABS = ["rhythm", "why", "setup", "quiz", "learn"];

  function renderRail() {
    var tab = app.state.tab;
    TABS.forEach(function (id) {
      var btn = document.getElementById("tab-" + id);
      var pane = document.getElementById("pane-" + id);
      var on = id === tab;
      btn.setAttribute("aria-selected", String(on));
      btn.setAttribute("tabindex", on ? "0" : "-1");
      pane.hidden = !on;
    });
    /* The rail panes rebuild themselves wholesale, which throws away the focused
     * element and drops the keyboard user back to the top of the document after
     * every click. Remember what had focus and give it back. */
    var active = document.activeElement;
    var focusKey = (active && active.closest && active.closest(".rail-pane"))
      ? (active.getAttribute("data-fkey") || null) : null;

    var pane = document.getElementById("pane-" + tab);
    if (tab === "rhythm") {
      if (app.state.hideName) {
        pane.innerHTML = "";
        pane.appendChild(h("p", { class: "eyebrow", text: "Rhythm challenge in progress" }));
        pane.appendChild(h("h3", { class: "headline", text: "Name hidden" }));
        pane.appendChild(h("p", { text: "Read the strip yourself, then commit in the Quiz tab." }));
      } else P.renderRhythm(pane, api);
    }
    else if (tab === "why") P.renderWhy(pane, api);
    else if (tab === "setup") P.renderSetup(pane, api);
    else if (tab === "quiz") C.ui.quiz.render(pane, api);
    else if (tab === "learn") C.ui.lessons.render(pane, api);

    if (focusKey) {
      var back = pane.querySelector('[data-fkey="' + focusKey.replace(/"/g, '') + '"]');
      if (back && !back.disabled) back.focus();
    }
  }

  /* ------------------------------------------------------------------- api */

  var api = {
    get state() { return app.state; },

    announce: function (msg) {
      var live = document.getElementById("liveRegion");
      live.textContent = "";
      setTimeout(function () { live.textContent = msg; }, 30);
    },

    play: function () {
      // Reduced motion turns autoplay OFF by default, but a learner who asks for
      // it twice clearly wants it; refusing outright leaves a dead Play button.
      if (app.reducedMotion && !app._motionOverride) {
        app._motionOverride = true;
        api.announce("Reduced motion is on, so playback stays off. Step with the arrow keys, or press Play again to run it anyway.");
        return;
      }
      app.playing = true; setOrigin(); syncPlayButton();
    },
    pause: function () { app.playing = false; app.tMs = app.tMs; setOrigin(); syncPlayButton(); app._dirty = true; },
    toggle: function () { app.playing ? api.pause() : api.play(); },

    seek: function (target) {
      if (!target) return;
      if (target.kind === "start" || target.kind === "canonical-start") app.tMs = app.schedule.startMs;
      else if (target.kind === "time") app.tMs = M.clamp(target.ms || 0, 0, SCHEDULE_MS - 5000);
      else if (target.kind === "event") {
        var occ = target.occurrence || 1, n = 0, found = null;
        for (var i = 0; i < app.schedule.events.length; i++) {
          var e = app.schedule.events[i];
          if (e.onsetMs < app.schedule.startMs - 1) continue;
          if (e.type === target.eventType) { n++; if (n >= occ) { found = e; break; } }
        }
        if (found) app.tMs = found.onsetMs + Math.min(12, found.durMs / 3);
        else app.tMs = app.schedule.startMs;
      }
      setOrigin(); app._dirty = true;
    },

    restart: function () {
      app.tMs = app.schedule.startMs; app.playing = false;
      setOrigin(); syncPlayButton(); app._dirty = true;
      api.announce("Restarted: " + app.schedule.canonicalStartNote);
    },

    step: function (dir) {
      var e = dir > 0 ? R.nextEvent(app.schedule, app.tMs, R.STEP_TYPES)
                      : R.prevEvent(app.schedule, app.tMs, R.STEP_TYPES);
      if (!e) return;
      app.playing = false; syncPlayButton();
      // Land exactly on the event onset. Landing slightly PAST it used to leave
      // the previous-event search inside the same event, so Back moved once and
      // then did nothing.
      app.tMs = e.onsetMs;
      setOrigin(); app._dirty = true;
      api.announce(F.eventLabel(e));
    },

    setMode: function (mode) {
      app.state.mode = mode;
      app.state.leadView = mode === "advanced" ? "twelve" : "single";
      app.state.labelSet = mode === "advanced" ? "none"
        : (app.state.labelSet === "none" ? "chambers" : app.state.labelSet);
      applyHeartFocus();
      if (mode === "basic" && app.state.condition !== "normal") {
        var c = C.content.conditions[app.state.condition];
        if (c && c.requiresTwelveLead) app.state.condition = "normal";
      }
      syncChrome(); rebuild(true); renderRail(); syncControls();
      api.announce(mode === "advanced" ? "Advanced mode. Twelve-lead view." : "Basic mode. Single rhythm lead.");
    },

    setRhythm: function (id, opts) {
      if (!R.DEFS[id]) return;
      app.state.rhythm = id;
      app.state.rates = {};
      app.state.flutterRatio = id === "aflutter" ? 2 : app.state.flutterRatio;
      var allowed = P.patientStatesFor(id);
      if (!allowed.filter(function (o) { return o.id === app.state.patientState; }).length) {
        app.state.patientState = allowed[0].id;
      }
      if (!(opts && opts.keepName)) app.state.hideName = false;
      rebuild(false);
      syncControls(); renderRail();
      var rec = C.content.rhythms[id];
      if (rec && !app.state.hideName) api.announce(rec.label + ". " + rec.headline);
    },

    setCondition: function (id) {
      app.state.condition = id;
      app.state.physiology = null;
      rebuild(true); syncControls(); renderRail();
      var rec = C.content.conditions[id];
      if (rec && !app.state.hideName) api.announce(rec.label + ". " + (rec.headline || ""));
    },

    setLead: function (lead) {
      if (C.LEAD_ORDER.indexOf(lead) < 0) return;
      app.state.selectedLead = lead;
      syncControls(); app._dirty = true;
    },

    setLeadView: function (v) {
      app.state.leadView = v;
      // In the 12-lead view the heart shrinks to an orientation inset, where
      // label gutters would cost more room than the labels are worth.
      app.state.labelSet = (v === "twelve") ? "none"
        : (app.state.labelSet === "none" ? "chambers" : app.state.labelSet);
      applyHeartFocus();
      syncChrome(); syncControls(); app._dirty = true;
    },

    setFocus: function (f) {
      app.state.focus = f;
      if (f === "conduction" && app.state.labelSet === "chambers") app.state.labelSet = "conduction";
      applyHeartFocus(); syncControls(); app._dirty = true;
    },

    setLabelSet: function (l) { app.state.labelSet = l; applyHeartFocus(); app._dirty = true; },

    setSpotlight: function (regions) { app.state.spotlight = regions || []; applyHeartFocus(); app._dirty = true; },

    setHighlight: function (tags) { app.state.highlightTags = tags || []; app._dirty = true; },

    setRate: function (key, v) {
      app.state.rates[key] = v;
      rebuildSoon();
    },

    setFlutterRatio: function (r) { app.state.flutterRatio = r; rebuild(false); renderRail(); },

    setPatientState: function (id) {
      app.state.patientState = id;
      rebuild(true); renderRail(); app._dirty = true;
      api.announce(id === "pea" ? "Pulseless electrical activity: the rhythm is organised, the patient has no pulse."
        : id === "pulseless-vt" ? "Pulseless ventricular tachycardia." : "Perfusing patient state.");
    },

    setPhysiology: function (key, v) {
      if (!app.state.physiology) app.state.physiology = {};
      var base = H.resolvePhysiology({ condition: app.state.condition, compensation: "off" });
      for (var k in base) if (app.state.physiology[k] === undefined) app.state.physiology[k] = base[k];
      app.state.physiology[key] = v;
      rebuildSoon();
    },

    resetPhysiology: function () {
      app.state.physiology = null;
      rebuild(true); renderRail(); app._dirty = true;
    },

    setCompensation: function (id) { app.state.compensation = id; rebuild(true); renderRail(); app._dirty = true; },

    setNoise: function (v) { app.state.noise = v; app._dirty = true; },

    randomizeSeed: function () {
      app.state.seed = (Math.random() * 4294967295) >>> 0;
      rebuild(false); renderRail();
    },

    applySetup: function (setup, opts) {
      if (!setup) return;
      // Set the flag FIRST: setRhythm and setCondition both announce the name
      // into the live region, which a screen-reader user would hear.
      app.state.hideName = !!(opts && opts.hideName);
      if (setup.rhythm) api.setRhythm(setup.rhythm, { keepName: true });
      api.setCondition(setup.condition || "normal");
      if (setup.lead) api.setLead(setup.lead);
      syncControls(); renderRail();
    },

    revealName: function () { app.state.hideName = false; syncControls(); renderRail(); },

    setTab: function (t) { app.state.tab = t; renderRail(); }
  };

  /* -------------------------------------------------------------- chrome */

  function applyHeartFocus() {
    C.render.heart.applyFocus(app.heartView, app.state.focus, app.state.labelSet, app.state.spotlight);
  }

  function syncPlayButton() {
    var b = document.getElementById("playBtn");
    b.textContent = app.playing ? "❚❚" : "▶";
    b.setAttribute("aria-label", app.playing ? "Pause" : "Play");
    b.setAttribute("aria-pressed", String(app.playing));
  }

  function syncChrome() {
    var adv = app.state.mode === "advanced";
    document.getElementById("modeBasic").setAttribute("aria-pressed", String(!adv));
    document.getElementById("modeAdvanced").setAttribute("aria-pressed", String(adv));
    document.getElementById("viewToggle").hidden = !adv;
    document.getElementById("viewSingle").setAttribute("aria-pressed", String(app.state.leadView === "single"));
    document.getElementById("viewTwelve").setAttribute("aria-pressed", String(app.state.leadView === "twelve"));
    document.getElementById("stage").setAttribute("data-view", app.state.leadView);
    document.getElementById("twelveWrap").hidden = app.state.leadView !== "twelve";
    document.getElementById("stripWrap").classList.toggle("ecg-strip-wrap", true);
  }

  function syncControls() {
    var s = app.state;

    /* During the rhythm challenge the answer must not be readable anywhere on
     * screen, or the drill measures nothing. */
    var rSel = document.getElementById("rhythmSelect");
    var cSel = document.getElementById("conditionSelect");
    buildConditionOptions(cSel);
    rSel.disabled = cSel.disabled = !!s.hideName;
    if (s.hideName) {
      setHiddenOption(rSel);
      setHiddenOption(cSel);
    } else {
      clearHiddenOption(rSel); clearHiddenOption(cSel);
      if (rSel.value !== s.rhythm) rSel.value = s.rhythm;
      if (cSel.value !== s.condition) cSel.value = s.condition;
    }

    var lSel = document.getElementById("leadSelect");
    if (lSel.value !== s.selectedLead) lSel.value = s.selectedLead;

    document.getElementById("focusSelect").value = s.focus;
    document.getElementById("labelSelect").value = s.labelSet;

    var speed = document.getElementById("speedRange");
    speed.value = String(Math.round(rateToSlider(s.playbackRate)));
    document.getElementById("speedVal").textContent = formatSpeed(s.playbackRate);
  }

  /* Logarithmic speed control from 0.05x to 2x — the slow end is where the
   * teaching happens, so it gets most of the travel. */
  function sliderToRate(v) {
    var lo = Math.log(0.05), hi = Math.log(2);
    return Math.exp(lo + (v / 100) * (hi - lo));
  }
  function rateToSlider(r) {
    var lo = Math.log(0.05), hi = Math.log(2);
    return ((Math.log(r) - lo) / (hi - lo)) * 100;
  }
  function formatSpeed(r) {
    return (r < 0.1 ? r.toFixed(2) : r < 1 ? r.toFixed(2).replace(/0$/, "") : r.toFixed(2).replace(/0$/, "")) + "×";
  }

  /* --------------------------------------------------------------- options */

  var RHYTHM_GROUPS = [
    ["Sinus", ["nsr", "sinus-brady", "sinus-tachy"]],
    ["Ectopy", ["pac", "pvc"]],
    ["Atrial", ["af", "aflutter", "svt"]],
    ["AV conduction", ["avb1", "mobitz1", "mobitz2", "avb2to1", "avb3"]],
    ["Ventricular and arrest", ["vt", "vf", "asystole"]]
  ];

  function buildRhythmOptions(sel) {
    sel.innerHTML = "";
    RHYTHM_GROUPS.forEach(function (g) {
      var og = document.createElement("optgroup");
      og.label = g[0];
      g[1].forEach(function (id) {
        var rec = C.content.rhythms[id] || { label: R.DEFS[id] ? R.DEFS[id].label : id };
        var o = document.createElement("option");
        o.value = id; o.textContent = rec.label;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
  }

  var CONDITION_GROUPS = [
    ["", ["normal"]],
    ["Electrolytes", ["hyperkalemia", "hypokalemia", "hypercalcemia", "hypocalcemia", "hypomagnesemia"]],
    ["Structure (needs 12-lead)", ["lvh", "rvh"]],
    ["Pump", ["hfref", "hfpef"]]
  ];

  function buildConditionOptions(sel) {
    var want = [];
    CONDITION_GROUPS.forEach(function (g) {
      g[1].forEach(function (id) {
        var rec = C.content.conditions[id];
        if (!rec) return;
        if (app.state.mode === "basic" && rec.requiresTwelveLead) return;
        want.push(id);
      });
    });
    if (sel.dataset.built === want.join(",")) return;
    sel.dataset.built = want.join(",");
    sel.innerHTML = "";
    CONDITION_GROUPS.forEach(function (g) {
      var ids = g[1].filter(function (id) { return want.indexOf(id) >= 0; });
      if (!ids.length) return;
      var parent = sel;
      if (g[0]) { parent = document.createElement("optgroup"); parent.label = g[0]; sel.appendChild(parent); }
      ids.forEach(function (id) {
        var rec = C.content.conditions[id];
        var o = document.createElement("option");
        o.value = id;
        o.textContent = id === "normal" ? "No added condition" : (rec.short || rec.label);
        parent.appendChild(o);
      });
    });
  }

  function buildLeadOptions(sel) {
    sel.innerHTML = "";
    var g1 = document.createElement("optgroup"); g1.label = "Limb (frontal plane)";
    C.LIMB_LEADS.forEach(function (l) {
      var o = document.createElement("option"); o.value = l;
      o.textContent = l + " — " + C.engine.vector.LEAD_INFO[l].view;
      g1.appendChild(o);
    });
    var g2 = document.createElement("optgroup"); g2.label = "Chest (horizontal plane)";
    C.PRECORDIAL.forEach(function (l) {
      var o = document.createElement("option"); o.value = l;
      o.textContent = l + " — " + C.engine.vector.LEAD_INFO[l].view;
      g2.appendChild(o);
    });
    sel.appendChild(g1); sel.appendChild(g2);
  }

  /* ----------------------------------------------------------------- about */

  function buildAbout() {
    var body = document.getElementById("aboutBody");
    body.innerHTML = "";
    body.appendChild(h("p", { text: "This is a teaching model of the cardiac cycle and the electrocardiogram, built for prelicensure nursing and health-professional students. Everything it draws is generated from a physiological model. Nothing in it was recorded from a patient." }));

    body.appendChild(h("h3", { text: "What it will not do" }));
    body.appendChild(P.list([
      "It will not diagnose. A generated tracing is not a diagnostic ECG and must never be used for patient care.",
      "It will not let the ECG stand in for the patient. The tracing shows electrical activity; it does not measure contraction, pulse, cardiac output or tissue perfusion.",
      "It will not read hypertrophy, ischaemia or axis from one rhythm lead.",
      "It will not infer a serum potassium, calcium or magnesium concentration from a waveform, and it does not claim a fixed severity sequence.",
      "It will not give doses, prescriptions, or patient-specific treatment."
    ]));

    body.appendChild(h("h3", { text: "How the tracing is made" }));
    body.appendChild(h("p", { text: "The heart's electrical activity is modelled as one net dipole vector whose direction and size change through the beat. Each lead is that vector projected onto an axis, so all twelve leads come from the same instants and Einthoven's law (II = I + III) holds exactly. Conditions change the parameters of the underlying currents — conduction speed, plateau length, how synchronous repolarisation is, how much muscle is generating current — and the leads then change together." }));
    body.appendChild(h("p", { class: "illustrative", text: "Amplitudes are calibrated so a normal Lead II R wave is about 1 mV. Chest leads carry a proximity gain because electrodes near the heart see larger deflections. That gain is illustrative, not a physical constant." }));

    body.appendChild(h("h3", { text: "How the pump is made" }));
    body.appendChild(h("p", { text: "Filling is computed from the diastolic time the rhythm actually left available and from whether an atrial contraction landed in it, so tachycardia, a dropped beat and an irregular ventricular response reduce stroke volume for the right reason. Ejection is computed separately for each ventricle from contractility and its own afterload. All values are normalised teaching coordinates: directional and bounded, never a measurement." }));

    body.appendChild(h("h3", { text: "Versions" }));
    body.appendChild(P.list([
      "Application " + C.VERSION,
      "Model " + C.MODEL_VERSION,
      "Content " + C.CONTENT_VERSION,
      C.REVIEWED
    ]));

    body.appendChild(h("h3", { text: "Keyboard" }));
    body.appendChild(P.list([
      "Space — play or pause",
      "Left and Right arrows — step to the previous or next event",
      "R — restart at the teaching start point",
      "1 to 5 — anatomy, conduction, contraction, flow, all together",
      "L — switch between the single lead and the 12-lead view"
    ]));

    body.appendChild(h("h3", { text: "Sources" }));
    var ol = h("ol", { class: "refs" });
    (C.content.sources || []).forEach(function (s) {
      ol.appendChild(h("li", { text: s.cite + (s.note ? " — " + s.note : "") }));
    });
    body.appendChild(ol);
  }

  /* ------------------------------------------------------------------ init */

  function init() {
    app.state = defaults();
    app.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    buildRhythmOptions(document.getElementById("rhythmSelect"));
    buildConditionOptions(document.getElementById("conditionSelect"));
    buildLeadOptions(document.getElementById("leadSelect"));

    app.heartView = C.render.heart.create(document.getElementById("heartHolder"));
    app.timelineView = C.render.timeline.create(document.getElementById("timelineHost"));

    readUrl();
    rebuild(false);
    applyHeartFocus();
    syncChrome(); syncControls(); syncPlayButton(); renderRail();
    buildAbout();
    wire();

    app._raf = requestAnimationFrame(tick);

    if (app.reducedMotion) {
      document.getElementById("illustrativeNote").textContent =
        "Reduced motion is on, so playback is off. Step through with the Next event button — every teaching point is reachable that way. Waveforms are generated, not recorded, and no value here is a measurement or a diagnosis.";
    }
  }

  function wire() {
    var on = function (id, ev, fn) {
      var el = document.getElementById(id);
      if (el) el.addEventListener(ev, fn);
    };

    on("modeBasic", "click", function () { api.setMode("basic"); });
    on("modeAdvanced", "click", function () { api.setMode("advanced"); });
    on("viewSingle", "click", function () { api.setLeadView("single"); });
    on("viewTwelve", "click", function () { api.setLeadView("twelve"); });

    on("rhythmSelect", "change", function (e) { api.setRhythm(e.target.value); });
    on("conditionSelect", "change", function (e) { api.setCondition(e.target.value); });
    on("leadSelect", "change", function (e) { api.setLead(e.target.value); });
    on("focusSelect", "change", function (e) { api.setFocus(e.target.value); });
    on("labelSelect", "change", function (e) { api.setLabelSet(e.target.value); });

    on("playBtn", "click", function () { api.toggle(); });
    on("prevBtn", "click", function () { api.step(-1); });
    on("nextBtn", "click", function () { api.step(1); });
    on("restartBtn", "click", function () { api.restart(); });

    on("speedRange", "input", function (e) {
      app.state.playbackRate = sliderToRate(parseFloat(e.target.value));
      document.getElementById("speedVal").textContent = formatSpeed(app.state.playbackRate);
      setOrigin();
    });

    /* A tablist is expected to move with the arrow keys, with only the selected
     * tab in the tab order. Without this a keyboard user has to tab through
     * every section heading to reach the panel they want. */
    TABS.forEach(function (t, i) {
      var btn = document.getElementById("tab-" + t);
      btn.setAttribute("tabindex", app.state.tab === t ? "0" : "-1");
      btn.addEventListener("click", function () { api.setTab(t); });
      btn.addEventListener("keydown", function (e) {
        var delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        var target = null;
        if (delta) target = TABS[(i + delta + TABS.length) % TABS.length];
        else if (e.key === "Home") target = TABS[0];
        else if (e.key === "End") target = TABS[TABS.length - 1];
        if (!target) return;
        e.preventDefault();
        api.setTab(target);
        document.getElementById("tab-" + target).focus();
      });
    });

    on("railToggle", "click", function (e) {
      var stage = document.getElementById("stage");
      var open = stage.getAttribute("data-rail") !== "closed";
      stage.setAttribute("data-rail", open ? "closed" : "open");
      document.getElementById("rail").hidden = open;
      e.target.setAttribute("aria-pressed", String(!open));
      e.target.textContent = open ? "Show panel" : "Hide panel";
      app._dirty = true;
    });

    on("themeToggle", "click", function () {
      var root = document.documentElement;
      var cur = root.getAttribute("data-theme");
      var next = cur === "dark" ? "light" : cur === "light" ? "dark"
        : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "light" : "dark");
      root.setAttribute("data-theme", next);
      app._dirty = true;
    });

    on("sizeToggle", "click", function (e) {
      var root = document.documentElement;
      var big = root.getAttribute("data-size") === "large";
      root.setAttribute("data-size", big ? "normal" : "large");
      e.target.setAttribute("aria-pressed", String(!big));
      app._dirty = true;
    });

    on("fullscreenBtn", "click", function () {
      if (!document.fullscreenElement) {
        (document.documentElement.requestFullscreen || function () {}).call(document.documentElement);
      } else if (document.exitFullscreen) document.exitFullscreen();
    });

    /* Modal dialog: focus moves in on open, is kept inside while open, and
     * returns to the trigger on close. */
    function closeAbout() {
      document.getElementById("aboutModal").hidden = true;
      document.getElementById("aboutBtn").focus();
    }
    on("aboutBtn", "click", function () {
      var m = document.getElementById("aboutModal");
      m.hidden = false;
      document.getElementById("aboutClose").focus();
    });
    on("aboutClose", "click", closeAbout);
    on("aboutModal", "click", function (e) {
      if (e.target.id === "aboutModal") closeAbout();
    });
    on("aboutModal", "keydown", function (e) {
      if (e.key === "Escape") { e.stopPropagation(); closeAbout(); return; }
      if (e.key !== "Tab") return;
      var m = document.getElementById("aboutModal");
      var focusable = m.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    /* Click a lead in the 12-lead grid to select it. */
    var tw = document.getElementById("twelveCanvas");
    tw.addEventListener("click", function (e) {
      if (!app._twelveLayout) return;
      var lead = C.render.ecg.leadAtPoint(tw, app._twelveLayout, e.clientX, e.clientY);
      if (lead) { api.setLead(lead); api.announce("Lead " + lead + ": " + C.engine.vector.LEAD_INFO[lead].view); }
    });

    /* Click any part of the complex to pause there and have it explained;
     * hover to see what you are about to pick. */
    [["stripCanvas", "strip", function () { return app._stripLayout; }],
     ["detailCanvas", "detail", function () { return app._detailLayout; }]
    ].forEach(function (spec) {
      var cv = document.getElementById(spec[0]);
      cv.classList.add("is-pickable");
      cv.addEventListener("pointermove", function (e) {
        var region = pickRegion(cv, spec[2](), e.clientX);
        var changed = !app._hover || app._hover.on !== spec[1] ||
                      (app._hover.region && region ? app._hover.region.key !== region.key : app._hover.region !== region);
        app._hover = { on: spec[1], region: region };
        cv.title = region && C.content.waveGuide[region.key]
          ? C.content.waveGuide[region.key].label + " — click to pause here" : "";
        if (changed) app._dirty = true;
      });
      cv.addEventListener("pointerleave", function () {
        if (app._hover) { app._hover = null; app._dirty = true; }
      });
      cv.addEventListener("click", function (e) {
        var layout = spec[2]();
        var region = pickRegion(cv, layout, e.clientX);
        if (region) { selectWave(region); return; }
        // Empty paper: fall back to plain scrubbing.
        if (!layout) return;
        app.playing = false; syncPlayButton();
        app.tMs = C.render.ecg.timeAtX(layout, cv, e.clientX);
        setOrigin(); app._dirty = true;
      });
    });

    on("waveClose", "click", function () { selectWave(null); });

    document.addEventListener("keydown", function (e) {
      var tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Space and Enter belong to whatever control has focus. Claiming Space
      // globally would stop every button, tab and quiz option in the app from
      // being activated by keyboard, which is how most of this interface is
      // reached without a mouse.
      var onControl = tag === "button" || tag === "a" ||
                      (e.target.getAttribute && e.target.getAttribute("role") === "tab");
      var inDialog = !document.getElementById("aboutModal").hidden;

      var k = e.key;
      if (k === " ") {
        if (onControl || inDialog) return;
        e.preventDefault(); api.toggle();
      }
      else if (inDialog && k !== "Escape") return;
      else if (k === "ArrowRight") { e.preventDefault(); api.step(1); }
      else if (k === "ArrowLeft") { e.preventDefault(); api.step(-1); }
      else if (k === "r" || k === "R") { api.restart(); }
      else if (k === "l" || k === "L") {
        if (app.state.mode === "advanced") api.setLeadView(app.state.leadView === "single" ? "twelve" : "single");
      }
      else if (k >= "1" && k <= "5") {
        api.setFocus(["anatomy", "conduction", "contraction", "flow", "integrated"][parseInt(k, 10) - 1]);
      }
      else if (k === "Escape") {
        var m = document.getElementById("aboutModal");
        if (!m.hidden) { m.hidden = true; document.getElementById("aboutBtn").focus(); }
      }
    });

    /* Pause when the page is hidden, so a backgrounded tab never advances
     * physiology behind the learner's back. */
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        if (app.playing) api.pause();
      } else {
        // requestAnimationFrame is idle while hidden, so anything that changed
        // in the meantime (a resize, a theme change) has not been drawn yet.
        app._dirty = true;
      }
    });

    var ro = new ResizeObserver(function () { app._dirty = true; });
    ro.observe(document.getElementById("stage"));
    window.addEventListener("resize", function () { app._dirty = true; });
  }

  /* Shareable links carry only a safe, validated subset, and always open paused. */
  function readUrl() {
    var q = new URLSearchParams(location.search);
    if (!q.toString()) return;
    var m = q.get("mode");
    if (m === "advanced" || m === "basic") { app.state.mode = m; app.state.leadView = m === "advanced" ? "twelve" : "single"; }
    var r = q.get("rhythm");
    if (r && R.DEFS[r]) app.state.rhythm = r;
    var c = q.get("condition");
    if (c && C.content.conditions[c]) app.state.condition = c;
    var l = q.get("lead");
    if (l && C.LEAD_ORDER.indexOf(l) >= 0) app.state.selectedLead = l;
    var f = q.get("focus");
    if (f && ["anatomy", "conduction", "contraction", "flow", "integrated"].indexOf(f) >= 0) app.state.focus = f;
    if (app.state.leadView === "twelve") app.state.labelSet = "none";
    var seed = parseInt(q.get("seed"), 10);
    if (isFinite(seed) && seed >= 0) app.state.seed = seed >>> 0;
    app.state.hideName = false;
  }

  C.app = app;
  C.api = api;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window.CARDIAC);
