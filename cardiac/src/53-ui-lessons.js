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
    completed: {}
  };

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
    lessonsFor(app.state.mode).forEach(function (l) {
      var done = state.completed[l.id];
      box.appendChild(h("button", {
        type: "button", class: "lesson-card",
        onclick: function () { start(l.id, app, pane); }
      }, [
        h("strong", { text: l.label + (done ? "  ✓" : "") }),
        h("span", { text: l.blurb + "  ·  " + l.steps.length + " steps" })
      ]));
    });
    pane.appendChild(box);

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

  function applyStep(app) {
    var l = currentLesson();
    if (!l) return;
    var s = l.steps[state.step];
    if (!s) return;
    app.pause();
    if (s.focus) app.setFocus(s.focus);
    if (s.rhythm) app.setRhythm(s.rhythm, { keepLesson: true });
    if (s.condition) app.setCondition(s.condition, { keepLesson: true });
    if (s.patientState) app.setPatientState(s.patientState);
    if (s.lead) app.setLead(s.lead);
    if (s.leadView) app.setLeadView(s.leadView);
    app.setSpotlight(s.highlight || []);
    app.seek(s.seek);
    app.announce(s.title + ". " + s.text);
  }

  function renderStep(pane, app) {
    var l = currentLesson();
    if (!l) { state.lessonId = null; return renderIndex(pane, app); }
    var s = l.steps[state.step];

    pane.appendChild(h("button", {
      type: "button", class: "pill", text: "◀ All sequences",
      onclick: function () {
        state.lessonId = null; app.setSpotlight([]); render(pane, app);
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
    pane.appendChild(h("p", { class: "step-text", text: s.text }));

    if (s.predict) {
      pane.appendChild(renderPredict(s.predict, app, pane, s.id));
    }

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
      disabled: (s.predict && !state.predictRevealed) ? "disabled" : null,
      onclick: function () {
        if (last) {
          state.completed[l.id] = true;
          state.lessonId = null; app.setSpotlight([]);
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
      box.appendChild(h("div", { class: "quiz-feedback" + (state.predictChoice === p.correct ? "" : " is-wrong") }, [
        h("p", { text: p.reveal })
      ]));
    }
    return box;
  }

  C.ui.lessons = { render: render, state: state, lessonsFor: lessonsFor };
})(window.CARDIAC);
