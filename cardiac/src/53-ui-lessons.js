/* 53-ui-lessons.js — guided sequences.
 *
 * One idea per step, one sentence of text, and the simulator parked exactly
 * where that idea is visible. Playback pauses whenever a prediction is open, and
 * the prompt never covers the thing the learner needs to look at to answer it.
 */
(function (C) {
  "use strict";

  var P = C.ui.panels, h = P.h;

  var state = {
    lessonId: null, step: 0,
    predictChoice: null, predictRevealed: false,
    completed: {},
    // Action gate: whether the learner has done the thing this step asked for,
    // how many wrong targets they have tried, and whether they did it themselves
    // or asked to be shown. "shown" is kept distinct from "done" so a closing
    // step can say how many they found unaided without overclaiming.
    gateDone: false, gateTries: 0, gateOutcome: null, _gateHandler: null
  };

  /* Which bus event satisfies which kind of gate. */
  var GATE_EVENT = {
    part: "part-selected",
    wave: "wave-selected",
    tab: "tab-changed",
    control: "control-used"
  };

  /* What the detail payload calls the thing that was touched. */
  function gateValueOf(kind, detail) {
    if (kind === "tab") return detail.tab;
    if (kind === "control") return detail.control;
    return detail.key;
  }

  function disarmGate() {
    if (!state._gateHandler) return;
    C.bus.off(state._gateHandler.type, state._gateHandler.fn);
    state._gateHandler = null;
  }

  function armGate(s, app) {
    state.gateDone = false;
    state.gateTries = 0;
    state.gateOutcome = null;
    if (!s.gate) return;

    var kind = s.gate.kind, type = GATE_EVENT[kind];
    if (!type) return;

    /* A selection left over from the previous step must not pre-satisfy this
     * one. Closing the explainer first also removes a stale panel from view. */
    if (kind === "part") app.inspectPart(null);

    var fn = function (detail) {
      /* Only real user input counts. A step that says "click the mitral valve"
       * must not be able to satisfy itself, and a later step's `inspect` must
       * not retroactively clear an earlier gate. */
      if (!detail || detail.source !== "user") return;
      var got = gateValueOf(kind, detail);
      if (s.gate.value !== "*" && got !== s.gate.value) {
        state.gateTries++;
        app.announce(s.gate.wrong || ("Not that one. " + s.gate.prompt));
        state.rerender && state.rerender();
        return;
      }
      state.gateDone = true;
      state.gateOutcome = "done";
      disarmGate();
      app.announce("That's it. You can move on now.");
      state.rerender && state.rerender();
    };
    state._gateHandler = { type: type, fn: fn };
    C.bus.on(type, fn);
  }

  /* The escape hatch, available from the first frame rather than after a timer.
   * A hidden delayed unlock is hostile, and a student stuck in front of a class
   * is a worse failure than one who accepted help. */
  function showGateAnswer(s, app) {
    var g = s.gate;
    if (g.kind === "part" && g.value !== "*") app.inspectPart(g.value);
    else if (g.kind === "wave") app.showWave(g.value);
    else if (g.kind === "part") app.inspectPart("left-ventricle");
    state.gateDone = true;
    state.gateOutcome = "shown";
    disarmGate();
    app.announce(g.hint || g.prompt);
  }

  function lessonsFor(mode) {
    return C.content.lessons.filter(function (l) {
      return mode === "advanced" ? true : l.level !== "advanced";
    });
  }

  function render(pane, app) {
    pane.innerHTML = "";
    if (!state.lessonId) return renderIndex(pane, app);
    return renderStep(pane, app);
  }

  function renderIndex(pane, app) {
    pane.appendChild(h("p", { class: "eyebrow", text: "Guided sequences" }));
    pane.appendChild(h("h3", { class: "headline", text: "Work through one idea at a time" }));

    var box = h("div", { class: "lesson-list" });
    lessonsFor(app.state.mode).forEach(function (l, li) {
      var done = state.completed[l.id];
      box.appendChild(h("button", {
        type: "button", class: "lesson-card" + (li === 0 ? " is-primary" : ""),
        onclick: function () { start(l.id, app, pane); }
      }, [
        h("strong", { text: l.label + (done ? "  ✓" : "") }),
        h("span", { text: l.blurb + "  ·  " + l.steps.length + " steps" })
      ]));
    });
    pane.appendChild(box);

    pane.appendChild(h("button", {
      type: "button", class: "pill", text: "All terms",
      onclick: function () {
        var box2 = pane.querySelector(".gloss-list");
        if (box2) { box2.parentNode.removeChild(box2); return; }
        C.ui.glossary.renderAll(pane);
      }
    }));

    /* Progress is deliberately not stored (see 11-store.js), so say so rather
     * than let a reset tick list read as a bug. */
    pane.appendChild(h("p", { class: "illustrative",
      text: "Ticks last until you close the page — nothing about your progress is saved to this computer." }));

    if (app.state.mode === "basic") {
      pane.appendChild(h("p", { class: "illustrative",
        text: "Two more sequences on ion channels and on the pump unlock in Advanced mode." }));
    }
  }

  function start(id, app, pane) {
    state.lessonId = id; state.step = 0;
    state.predictChoice = null; state.predictRevealed = false;
    applyStep(app);
    render(pane, app);
  }

  function currentLesson() {
    return C.content.lessons.filter(function (l) { return l.id === state.lessonId; })[0];
  }

  /* Order here is load-bearing. rebuild() hides the explainer and clears the
   * selected wave, and setRhythm/setCondition call it — so anything that OPENS
   * the explainer has to come after them. announce goes last so the step's own
   * sentence wins the 30 ms debounce rather than racing the rhythm change. */
  function applyStep(app) {
    var l = currentLesson();
    if (!l) return;
    var s = l.steps[state.step];
    if (!s) return;

    disarmGate();

    app.pause();
    if (s.focus) app.setFocus(s.focus);
    if (s.rhythm) app.setRhythm(s.rhythm, { quiet: true });
    if (s.condition) app.setCondition(s.condition, { quiet: true });
    if (s.patientState) app.setPatientState(s.patientState);
    if (s.lead) app.setLead(s.lead, { source: "lesson" });
    if (s.leadView) app.setLeadView(s.leadView);
    if (s.labelSet) app.setLabelSet(s.labelSet, { source: "lesson" });
    app.setSpotlight(s.highlight || []);
    app.seek(s.seek);

    /* inspect/wave need a drawn layout: jumpToWave reads app._stripLayout,
     * which only exists after a frame has been drawn. Straight after a rebuild
     * it is stale, and the wave lookup silently degrades to a tag highlight. */
    if (s.inspect || s.wave || s.point) {
      requestAnimationFrame(function () {
        if (currentLesson() !== l || l.steps[state.step] !== s) return;  // moved on
        if (s.inspect) app.inspectPart(s.inspect);
        if (s.wave) app.showWave(s.wave);
        if (s.point) pointAt(s.point);
      });
    } else {
      pointAt(null);
    }

    app.announce(s.title + ". " + s.text);
    armGate(s, app);
  }

  /* Sequence A has to talk about the topbar and the transport bar, which live
   * outside this panel. Scroll the thing into view and outline it — deliberately
   * NOT a coach-mark overlay, which would mean positioning, z-index, focus order
   * and reduced-motion handling for very little more teaching value. */
  function pointAt(selector) {
    var prev = document.querySelectorAll(".is-pointed");
    for (var i = 0; i < prev.length; i++) prev[i].classList.remove("is-pointed");
    if (!selector) return;
    var el = document.querySelector(selector);
    if (!el) return;
    el.classList.add("is-pointed");
    if (el.scrollIntoView) el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  /* Everything a lesson turned on gets turned off. Before this existed a
   * sequence that opened the explainer left it open forever, and a spotlight
   * outlived the step that set it. */
  function exitLesson(app) {
    disarmGate();
    state.rerender = null;
    app.setSpotlight([]);
    app.setHighlight([]);
    app.inspectPart(null);
    pointAt(null);
  }

  function renderStep(pane, app) {
    var l = currentLesson();
    if (!l) { state.lessonId = null; return renderIndex(pane, app); }
    var s = l.steps[state.step];

    pane.appendChild(h("button", {
      type: "button", class: "pill", text: "◀ All sequences",
      onclick: function () {
        state.lessonId = null; exitLesson(app); render(pane, app);
      }
    }));

    var dots = h("div", { class: "step-dots" });
    l.steps.forEach(function (_, i) {
      dots.appendChild(h("span", {
        class: "step-dot" + (i < state.step ? " is-done" : i === state.step ? " is-current" : "")
      }));
    });
    pane.appendChild(h("div", { class: "step-head" }, [
      h("span", { class: "step-count", text: (state.step + 1) + " / " + l.steps.length }),
      dots
    ]));

    pane.appendChild(h("h3", { class: "step-title", text: s.title }));
    /* Linkify defined terms in the rendered text. Two lines here give all five
     * existing sequences glossary coverage without editing their reviewed prose. */
    var body = h("p", { class: "step-text", text: s.text });
    pane.appendChild(body);
    C.ui.glossary.decorate(body);

    if (s.predict) {
      pane.appendChild(renderPredict(s.predict, app, pane, s.id));
    }
    if (s.gate) {
      pane.appendChild(renderGate(s, app, pane));
    }

    /* The bus handler fires from outside this render pass, so give it a way to
     * refresh the panel without holding a stale `pane` reference. */
    state.rerender = function () { render(pane, app); };

    var nav = h("div", { class: "step-nav" });
    nav.appendChild(h("button", {
      type: "button", class: "btn", text: "◀ Back", "data-fkey": "lesson-back",
      disabled: state.step === 0 ? "disabled" : null,
      onclick: function () {
        state.step--; state.predictChoice = null; state.predictRevealed = false;
        applyStep(app); render(pane, app);
      }
    }));
    var last = state.step === l.steps.length - 1;
    nav.appendChild(h("button", {
      type: "button", class: "btn btn-primary", text: last ? "Finish" : "Next ▶",
      "data-fkey": "lesson-next",
      disabled: ((s.predict && !state.predictRevealed) ||
                 (s.gate && !state.gateDone)) ? "disabled" : null,
      onclick: function () {
        if (last) {
          state.completed[l.id] = true;
          state.lessonId = null; exitLesson(app);
          /* Chained sequences read as one journey but behave as three
           * resumable units, which matters because progress is not stored. */
          if (l.next && C.content.lessons.filter(function (x) { return x.id === l.next; }).length) {
            app.announce("Sequence complete. Starting the next one.");
            start(l.next, app, pane);
            return;
          }
          app.announce("Sequence complete.");
        } else {
          state.step++; state.predictChoice = null; state.predictRevealed = false;
          applyStep(app);
        }
        render(pane, app);
      }
    }));
    pane.appendChild(nav);

    if (s.predict && !state.predictRevealed) {
      pane.appendChild(h("p", { class: "illustrative", text: "Commit to a prediction before moving on." }));
    }
  }

  /* "Do this" block. The prompt is always visible; the hint appears once they
   * have tried and missed, so a learner who gets it first time is not given the
   * answer they did not need. */
  function renderGate(s, app, pane) {
    var g = s.gate;
    var box = h("div", { class: "step-do" + (state.gateDone ? " is-done" : "") });

    box.appendChild(h("p", { class: "do-prompt",
      text: state.gateDone
        ? (state.gateOutcome === "shown" ? "Shown: " + g.prompt : "Done: " + g.prompt)
        : g.prompt }));

    if (!state.gateDone && state.gateTries > 0 && g.hint) {
      box.appendChild(h("p", { class: "do-hint", text: g.hint }));
    }

    if (!state.gateDone) {
      box.appendChild(h("button", {
        type: "button", class: "pill", text: "Show me where",
        "data-fkey": "gate-show",
        onclick: function () { showGateAnswer(s, app); render(pane, app); }
      }));
    }
    return box;
  }

  /* The authored predictions all list the correct option first. Presented in
   * that order a learner discovers within two steps that A is always right and
   * stops predicting, which destroys the whole point of asking. Options are
   * therefore presented in a deterministic per-step shuffle: stable across
   * re-renders and across reloads, but not the authored order. */
  function optionOrder(stepId, count) {
    var r = C.rng(hashString(stepId));
    var idx = [];
    for (var i = 0; i < count; i++) idx.push(i);
    for (var j = idx.length - 1; j > 0; j--) {
      var k = Math.floor(r() * (j + 1));
      var t = idx[j]; idx[j] = idx[k]; idx[k] = t;
    }
    return idx;
  }

  function hashString(str) {
    var hv = 2166136261;
    for (var i = 0; i < str.length; i++) {
      hv ^= str.charCodeAt(i);
      hv = Math.imul(hv, 16777619);
    }
    return hv >>> 0;
  }

  function renderPredict(p, app, pane, stepId) {
    var box = h("div", { class: "predict" });
    box.appendChild(h("h5", { text: "Predict first" }));
    box.appendChild(h("p", { text: p.q }));

    var order = optionOrder(stepId, p.options.length);
    var ul = h("ul", { class: "quiz-options" });
    order.forEach(function (orig, slot) {
      var chosen = state.predictChoice === orig;
      var cls = "quiz-option";
      if (state.predictRevealed) {
        if (orig === p.correct) cls += " is-correct";
        else if (chosen) cls += " is-wrong";
      }
      ul.appendChild(h("li", null, h("button", {
        type: "button", class: cls, "aria-pressed": String(chosen),
        "data-fkey": "predict-" + slot,
        disabled: state.predictRevealed ? "disabled" : null,
        onclick: function () { state.predictChoice = orig; render(pane, app); }
      }, [
        h("span", { class: "key", text: String.fromCharCode(65 + slot) }),
        h("span", { text: p.options[orig] }),
        state.predictRevealed
          ? h("span", { class: "verdict", text: orig === p.correct ? "correct" : (chosen ? "not this one" : "") })
          : null
      ])));
    });
    box.appendChild(ul);

    if (!state.predictRevealed) {
      box.appendChild(h("button", {
        type: "button", class: "btn btn-primary", text: "Show me",
        "data-fkey": "predict-reveal",
        disabled: state.predictChoice === null ? "disabled" : null,
        onclick: function () {
          state.predictRevealed = true;
          app.announce(p.reveal);
          render(pane, app);
        }
      }));
    } else {
      var rev = h("p", { text: p.reveal });
      box.appendChild(h("div", { class: "quiz-feedback" + (state.predictChoice === p.correct ? "" : " is-wrong") }, [rev]));
      C.ui.glossary.decorate(rev);
    }
    return box;
  }

  C.ui.lessons = { render: render, start: start, state: state, lessonsFor: lessonsFor };
})(window.CARDIAC);
