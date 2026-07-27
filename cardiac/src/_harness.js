/* _harness.js — verification, never shipped.
 *
 * build.py skips any src file beginning with "_" (build.py:50), so this lives
 * with the code it tests and stays out of index.html. Load it from the console
 * over the local static server and call CARDIAC.test.all().
 */
(function (C) {
  "use strict";

  var T = {};
  function pane() { return document.getElementById("pane-learn"); }
  function tourIds() { return ["tour-basics", "tour-beat", "tour-limits"]; }
  function lessonById(id) {
    return C.content.lessons.filter(function (l) { return l.id === id; })[0];
  }
  function fail(list, msg) { list.push(msg); }

  /* ------------------------------------------------------ static assertions */

  T.content = function () {
    var bad = [];
    var VALID_KIND = { part: 1, wave: 1, tab: 1, control: 1 };
    var CONTROLS = { step: 1, focus: 1, labels: 1, lead: 1 };
    var TABS = { rhythm: 1, why: 1, setup: 1, quiz: 1, learn: 1 };

    C.content.lessons.forEach(function (l) {
      var isTour = tourIds().indexOf(l.id) >= 0;

      if (isTour) {
        var s1 = l.steps[0];
        if (!s1.rhythm || !s1.condition) {
          fail(bad, l.id + " step 1 must set both rhythm and condition — a learner " +
                    "arriving with hyperkalemia loaded would be taught the normal beat on an abnormal strip");
        }
      }
      if (l.next && !lessonById(l.next)) fail(bad, l.id + " chains to missing lesson " + l.next);

      l.steps.forEach(function (s, i) {
        var where = l.id + "[" + (i + 1) + "]";
        if (s.gate && s.predict) fail(bad, where + " has BOTH gate and predict — two blockers on one step is a wall");
        if (s.inspect && !C.content.parts[s.inspect]) fail(bad, where + " inspect:" + s.inspect + " is not a part");
        if (s.wave && !C.content.waveGuide[s.wave]) fail(bad, where + " wave:" + s.wave + " is not a wave-guide entry");
        if (s.labelSet && !C.geometry.LABEL_SETS[s.labelSet]) fail(bad, where + " labelSet:" + s.labelSet + " unknown");
        if (s.point && !document.querySelector(s.point)) fail(bad, where + " point:" + s.point + " matches nothing");
        if (s.gate) {
          var g = s.gate;
          if (!VALID_KIND[g.kind]) fail(bad, where + " gate kind " + g.kind);
          if (!g.prompt) fail(bad, where + " gate has no prompt");
          if (!g.hint) fail(bad, where + " gate has no hint — there must always be a way forward");
          if (g.kind === "part" && g.value !== "*" && !C.content.parts[g.value]) fail(bad, where + " gate part " + g.value);
          if (g.kind === "wave" && !C.content.waveGuide[g.value]) fail(bad, where + " gate wave " + g.value);
          if (g.kind === "control" && !CONTROLS[g.value]) fail(bad, where + " gate control " + g.value);
          if (g.kind === "tab" && !TABS[g.value]) fail(bad, where + " gate tab " + g.value);
        }
        /* An unresolvable event type silently falls back to the schedule start,
         * so a typo is invisible without checking it against a real schedule. */
        if (s.seek && s.seek.kind === "event") {
          var st = Object.assign({}, C.app.state, {
            rhythm: s.rhythm || l.steps[0].rhythm || "nsr",
            condition: s.condition || l.steps[0].condition || "normal"
          });
          var sch = C.engine.rhythm.build(st, 9000);
          var hit = sch.events.filter(function (e) { return e.type === s.seek.eventType; });
          if (!hit.length) fail(bad, where + " seek.eventType '" + s.seek.eventType + "' never occurs in " + st.rhythm);
        }
      });
    });
    return bad;
  };

  T.glossary = function () {
    var bad = [], seen = {};
    var BANNED = /\b(pump|pumps|pumping|beating|contract|contracts|squeeze[sd]?|output)\b/i;
    // Entries that are ABOUT mechanics may legitimately use those words.
    /* "ecg" and "electrical" are allowed to name mechanical words because they
     * use them to DENY them — "it shows the signal, not the squeeze" is the
     * sentence doing the work, not a violation of it. */
    var ALLOW = { "ecg": 1, "electrical": 1,
                  "stroke-volume": 1, "cardiac-output": 1, "atrial-kick": 1, "systole": 1,
                  "diastole": 1, "myocardium": 1, "contractility": 1, "preload": 1,
                  "afterload": 1, "frank-starling": 1, "ventricle": 1, "isovolumetric": 1,
                  "end-diastolic-volume": 1, "perfusion": 1, "hypertrophy": 1 };

    Object.keys(C.content.glossary).forEach(function (id) {
      var g = C.content.glossary[id];
      if (!g.short) return fail(bad, id + " has no definition");
      if (g.short.split(/\s+/).length > 30) fail(bad, id + " definition is over 30 words");
      if (!ALLOW[id] && BANNED.test(g.short)) {
        fail(bad, id + " definition describes electrical activity in mechanical words: " + g.short);
      }
      if (g.see && !C.content.parts[g.see]) fail(bad, id + " see:" + g.see + " unresolved");
      if (g.wave && !C.content.waveGuide[g.wave]) fail(bad, id + " wave:" + g.wave + " unresolved");
      // A duplicate alias makes linkification order-dependent.
      [g.term].concat(g.also || []).forEach(function (a) {
        var k = a.toLowerCase();
        if (seen[k]) fail(bad, "alias '" + a + "' claimed by both " + seen[k] + " and " + id);
        seen[k] = id;
      });
    });
    return bad;
  };

  T.honesty = function () {
    var bad = [];
    var BANNED = [
      /the ECG measures/i, /shows the pump/i, /means the heart is beating/i,
      /=\s*a heartbeat/i, /\b\d+\s?(mg|mcg|mEq|mmol)\b/i, /\badminister\b/i
    ];
    var NUMERIC_INTERVAL = /\b\d+(\.\d+)?\s*(-|–|to)\s*\d+(\.\d+)?\s*s\b/i;
    var text = [];
    tourIds().forEach(function (id) {
      var l = lessonById(id);
      if (!l) return fail(bad, "missing tour sequence " + id);
      l.steps.forEach(function (s) {
        text.push(s.text, s.title);
        if (s.gate) text.push(s.gate.prompt, s.gate.hint, s.gate.wrong || "");
        if (s.predict) text.push(s.predict.q, s.predict.reveal);
      });
    });
    var blob = text.join(" • ");
    BANNED.forEach(function (re) { if (re.test(blob)) fail(bad, "banned phrasing: " + re); });
    if (NUMERIC_INTERVAL.test(blob)) fail(bad, "tutorial quotes a numeric interval; beginners cannot tell one from a measurement");
    // And the point of the whole thing must actually be made somewhere.
    if (!/pulse/i.test(blob)) fail(bad, "tutorial never mentions a pulse");
    if (!/(not|never|nothing)[^.]{0,80}pulse|pulse[^.]{0,80}(not|never|nothing)/i.test(blob)) {
      fail(bad, "tutorial never states that a tracing does not prove a pulse");
    }
    Object.keys(C.content.glossary).forEach(function (id) {
      BANNED.forEach(function (re) {
        if (re.test(C.content.glossary[id].short)) fail(bad, "glossary " + id + ": " + re);
      });
    });
    return bad;
  };

  /* --------------------------------------------------------- the action gate */

  function nextBtn() { return pane().querySelector('[data-fkey="lesson-next"]'); }

  function goToStep(lessonId, index) {
    C.api.setTab("learn");
    C.ui.lessons.start(lessonId, C.api, pane());
    for (var i = 0; i < index; i++) {
      var n = nextBtn();
      if (n && n.disabled) {
        var show = pane().querySelector('[data-fkey="gate-show"]');
        if (show) show.click();
        var opt = pane().querySelector(".quiz-option");
        if (opt) { opt.click(); var rev = pane().querySelector('[data-fkey="predict-reveal"]'); if (rev) rev.click(); }
      }
      n = nextBtn();
      if (!n || n.disabled) break;
      n.click();
    }
  }

  T.gate = function () {
    var bad = [], st = C.ui.lessons.state;

    // tour-beat step 6 gates on the mitral valve.
    goToStep("tour-beat", 5);
    if (!pane().querySelector(".step-do")) fail(bad, "no do-block on the gated step");
    if (!nextBtn().disabled) fail(bad, "1. Next should start disabled on a gated step");

    C.bus.emit("part-selected", { key: "tricuspid", source: "user" });
    if (!nextBtn().disabled) fail(bad, "2. a wrong target should not satisfy the gate");
    if (st.gateTries !== 1) fail(bad, "2. wrong target should count as a try");

    C.bus.emit("part-selected", { key: "mitral", source: "user" });
    if (nextBtn().disabled) fail(bad, "3. the right target should unlock Next");

    // 4. anti-self-satisfaction
    goToStep("tour-beat", 5);
    C.bus.emit("part-selected", { key: "mitral", source: "lesson" });
    if (!nextBtn().disabled) fail(bad, "4. a lesson-driven selection must NOT satisfy its own gate");

    // 5. the real pointer path, not just the bus
    goToStep("tour-beat", 5);
    var svg = document.querySelector(".heart-svg");
    var pos = C.app.heartView.labelPos.mitral;
    var ctm = svg.getScreenCTM();
    var p = svg.createSVGPoint(); p.x = pos.x; p.y = pos.y;
    var sc = p.matrixTransform(ctm);
    svg.dispatchEvent(new MouseEvent("click", { clientX: sc.x, clientY: sc.y, bubbles: true }));
    if (nextBtn().disabled) fail(bad, "5. a genuine click on the SVG should clear the gate");

    // 6. keyboard / assistive-technology path
    goToStep("tour-beat", 5);
    svg.focus();
    for (var k = 0; k < 40 && C.app._selectedPart !== "mitral"; k++) {
      svg.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    }
    if (C.app._selectedPart === "mitral" && nextBtn().disabled) {
      fail(bad, "6. arrowing to the part should clear the gate");
    }

    // 7. the escape hatch, and it must stay distinguishable from doing it
    goToStep("tour-beat", 5);
    pane().querySelector('[data-fkey="gate-show"]').click();
    if (nextBtn().disabled) fail(bad, "7. Show me where must unlock Next");
    if (st.gateOutcome !== "shown") fail(bad, "7. being shown must not be recorded as having done it");

    // 8. a gate survives wandering off to another tab and back
    goToStep("tour-beat", 5);
    C.api.setTab("rhythm"); C.api.setTab("learn");
    if (C.ui.lessons.state.lessonId !== "tour-beat") fail(bad, "8. leaving the tab lost the lesson");
    if (!nextBtn() || !nextBtn().disabled) fail(bad, "8. the gate should still be armed after a tab round trip");

    // 9. listeners must not accumulate
    tourIds().forEach(function (id) {
      goToStep(id, 20); goToStep(id, 20);
    });
    if (C.bus.count("part-selected") > 1) fail(bad, "9. gate listeners are leaking: " + C.bus.count("part-selected"));
    if (C.bus.count("wave-selected") > 1) fail(bad, "9. wave listeners are leaking: " + C.bus.count("wave-selected"));
    return bad;
  };

  /* ------------------------------------------------------------- regression */

  T.regression = function () {
    var bad = [], before = C.diag.errors.length;

    C.content.lessons.forEach(function (l) {
      goToStep(l.id, l.steps.length + 2);
    });
    if (C.diag.errors.length !== before) fail(bad, "running every sequence raised errors");

    // exiting must put everything back
    if (C.app.state.spotlight.length) fail(bad, "spotlight survived the end of a lesson");
    if (!document.getElementById("waveExplainer").hidden) fail(bad, "the explainer was left open after a lesson");
    if ((C.app.state.highlightTags || []).length) fail(bad, "tracing highlight survived the end of a lesson");
    if (document.querySelectorAll(".is-pointed").length) fail(bad, "a pointed control was left outlined");

    // glossary idempotence
    goToStep("tour-beat", 1);
    var body = pane().querySelector(".step-text");
    var n1 = pane().querySelectorAll(".gloss").length;
    C.ui.glossary.decorate(body); C.ui.glossary.decorate(body);
    if (pane().querySelectorAll(".gloss").length !== n1) fail(bad, "decorate is not idempotent");

    return bad;
  };

  T.all = function () {
    var r = {
      content: T.content(), glossary: T.glossary(), honesty: T.honesty(),
      gate: T.gate(), regression: T.regression()
    };
    r.totalFailures = Object.keys(r).reduce(function (n, k) {
      return n + (Array.isArray(r[k]) ? r[k].length : 0);
    }, 0);
    return r;
  };

  C.test = T;
})(CARDIAC);
