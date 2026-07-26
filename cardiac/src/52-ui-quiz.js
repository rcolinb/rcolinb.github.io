/* 52-ui-quiz.js — retrieval practice and a signal-detection drill.
 *
 * Questions delay their key until the learner commits, because feedback before
 * commitment removes the retrieval that makes the practice worth anything.
 * The keyed answer is not written into the page before the reveal.
 *
 * The rhythm challenge is deliberately a signal-detection task rather than a
 * quiz: the learner sets a threshold for "something is wrong here", and the
 * scoring separates missing a real abnormality from calling a normal strip
 * abnormal. Those are different errors with different clinical costs, and a
 * single percentage score hides both.
 */
(function (C) {
  "use strict";

  var P = C.ui.panels, h = P.h;

  var session = {
    tab: "questions",
    order: null, index: 0,
    selected: null, phase: "answering",
    right: 0, done: 0,
    sdt: { active: false, answer: null, phase: "idle", hits: 0, misses: 0, fa: 0, cr: 0, current: null }
  };

  function pool(state) {
    var lvl = state.mode === "basic" ? ["basic"] : ["basic", "advanced"];
    return C.content.questions.filter(function (q) { return lvl.indexOf(q.level) >= 0; });
  }

  function shuffle(arr, seed) {
    var r = C.rng(seed >>> 0), a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function render(pane, app) {
    pane.innerHTML = "";

    var tabs = h("div", { class: "pill-row" }, [
      h("button", { type: "button", class: "pill", text: "Questions", "data-fkey": "qtab-questions",
        "aria-pressed": String(session.tab === "questions"),
        onclick: function () { session.tab = "questions"; render(pane, app); } }),
      h("button", { type: "button", class: "pill", text: "Rhythm challenge", "data-fkey": "qtab-sdt",
        "aria-pressed": String(session.tab === "sdt"),
        onclick: function () { session.tab = "sdt"; render(pane, app); } })
    ]);
    pane.appendChild(tabs);

    if (session.tab === "sdt") renderChallenge(pane, app);
    else renderQuestions(pane, app);
  }

  /* ---------------------------------------------------------------- items */

  function renderQuestions(pane, app) {
    var items = pool(app.state);
    if (!items.length) { pane.appendChild(h("p", { text: "No items available." })); return; }

    if (!session.order || session.order.length !== items.length) {
      session.order = shuffle(items, app.state.seed);
      session.index = 0; session.selected = null; session.phase = "answering";
    }
    var q = session.order[session.index % session.order.length];

    pane.appendChild(h("p", { class: "eyebrow",
      text: q.domain.replace(/-/g, " ") + " · " + q.process.replace(/-/g, " ") }));

    if (q.setup) {
      pane.appendChild(h("button", {
        type: "button", class: "pill", text: "Load this on the simulator",
        onclick: function () { app.applySetup(q.setup); }
      }));
    }

    pane.appendChild(h("p", { class: "quiz-stem", text: q.stem }));

    var ul = h("ul", { class: "quiz-options" });
    q.options.forEach(function (o) {
      var chosen = session.selected === o.id;
      var cls = "quiz-option";
      if (session.phase === "revealed") {
        if (o.id === q.correct) cls += " is-correct";
        else if (chosen) cls += " is-wrong";
      }
      var btn = h("button", {
        type: "button", class: cls, "aria-pressed": String(chosen),
        "data-fkey": "opt-" + o.id,
        disabled: session.phase === "revealed" ? "disabled" : null,
        onclick: function () {
          if (session.phase === "revealed") return;
          session.selected = o.id;
          render(pane, app);
        }
      }, [
        h("span", { class: "key", text: o.id }),
        h("span", { text: o.text })
      ]);
      ul.appendChild(h("li", null, btn));
    });
    pane.appendChild(ul);

    // The key and rationale enter the page only at reveal.
    if (session.phase === "revealed") {
      var correct = session.selected === q.correct;
      pane.appendChild(h("div", { class: "quiz-feedback" + (correct ? "" : " is-wrong") }, [
        h("p", { html: "<strong>" + (correct ? "Correct." : "Not this time.") +
                 "</strong> The best answer is " + q.correct + "." }),
        h("p", { text: q.rationale })
      ]));
    }

    var nav = h("div", { class: "step-nav" });
    if (session.phase !== "revealed") {
      nav.appendChild(h("button", {
        type: "button", class: "btn btn-primary", text: "Check my answer",
        "data-fkey": "quiz-commit",
        disabled: session.selected ? null : "disabled",
        onclick: function () {
          session.phase = "revealed";
          session.done++;
          if (session.selected === q.correct) session.right++;
          app.announce(session.selected === q.correct ? "Correct." : "Not correct. Rationale shown.");
          app.pause();
          render(pane, app);
        }
      }));
    } else {
      nav.appendChild(h("button", {
        type: "button", class: "btn btn-primary", text: "Next question",
        "data-fkey": "quiz-commit",
        onclick: function () {
          session.index++; session.selected = null; session.phase = "answering";
          render(pane, app);
        }
      }));
    }
    nav.appendChild(h("button", {
      type: "button", class: "btn", text: "Shuffle",
      "data-fkey": "quiz-shuffle",
      onclick: function () {
        session.order = shuffle(pool(app.state), (Math.random() * 1e9) | 0);
        session.index = 0; session.selected = null; session.phase = "answering";
        render(pane, app);
      }
    }));
    pane.appendChild(nav);

    pane.appendChild(h("p", { class: "quiz-meta" }, [
      h("span", { class: "quiz-score", text: session.right + " of " + session.done + " correct" }),
      h("span", { text: "Item " + ((session.index % session.order.length) + 1) + " of " + session.order.length })
    ]));
    pane.appendChild(h("p", { class: "illustrative",
      text: "Formative practice written for this simulator. Not NCLEX items and not endorsed by NCSBN." }));
  }

  /* ------------------------------------------------------ signal detection */

  var CHALLENGE_SET = [
    { rhythm: "nsr", condition: "normal", abnormal: false, name: "Normal sinus rhythm" },
    { rhythm: "nsr", condition: "normal", abnormal: false, name: "Normal sinus rhythm" },
    { rhythm: "sinus-brady", condition: "normal", abnormal: true, name: "Sinus bradycardia" },
    { rhythm: "sinus-tachy", condition: "normal", abnormal: true, name: "Sinus tachycardia" },
    { rhythm: "af", condition: "normal", abnormal: true, name: "Atrial fibrillation" },
    { rhythm: "aflutter", condition: "normal", abnormal: true, name: "Atrial flutter" },
    { rhythm: "pvc", condition: "normal", abnormal: true, name: "Premature ventricular complexes" },
    { rhythm: "pac", condition: "normal", abnormal: true, name: "Premature atrial complexes" },
    { rhythm: "avb1", condition: "normal", abnormal: true, name: "First-degree AV block" },
    { rhythm: "mobitz1", condition: "normal", abnormal: true, name: "Mobitz I" },
    { rhythm: "mobitz2", condition: "normal", abnormal: true, name: "Mobitz II" },
    { rhythm: "avb3", condition: "normal", abnormal: true, name: "Third-degree AV block" },
    { rhythm: "vt", condition: "normal", abnormal: true, name: "Ventricular tachycardia" },
    { rhythm: "nsr", condition: "hyperkalemia", abnormal: true, name: "Sinus rhythm with hyperkalaemic changes" },
    { rhythm: "nsr", condition: "hypokalemia", abnormal: true, name: "Sinus rhythm with hypokalaemic changes" },
    { rhythm: "nsr", condition: "normal", abnormal: false, name: "Normal sinus rhythm" }
  ];

  function nextChallenge(app) {
    var s = session.sdt;
    var pick = CHALLENGE_SET[Math.floor(Math.random() * CHALLENGE_SET.length)];
    var noise = [0, 0, 0.18, 0.35, 0.55][Math.floor(Math.random() * 5)];
    s.current = pick;
    s.phase = "answering";
    s.answer = null;
    app.applySetup({ rhythm: pick.rhythm, condition: pick.condition, lead: "II" }, { hideName: true });
    app.setNoise(noise);
    app.play();
  }

  function renderChallenge(pane, app) {
    var s = session.sdt;

    pane.appendChild(h("p", { class: "eyebrow", text: "Detection under uncertainty" }));
    pane.appendChild(h("h3", { class: "headline", text: "Is something wrong with this strip?" }));

    if (s.phase === "idle") {
      pane.appendChild(h("p", { text: "You will see strips one at a time, some clean and some noisy. Decide whether the rhythm is normal or abnormal before you look for a name." }));
      pane.appendChild(h("p", { class: "illustrative", text: "Missing a real abnormality and calling a normal strip abnormal are different mistakes. Both are counted separately here, because in practice they cost different things." }));
      pane.appendChild(h("button", {
        type: "button", class: "btn btn-primary", text: "Start",
        onclick: function () { nextChallenge(app); render(pane, app); }
      }));
      return;
    }

    if (s.phase === "answering") {
      pane.appendChild(h("p", { text: "Look at the strip, then commit." }));
      var row = h("div", { class: "step-nav" }, [
        h("button", { type: "button", class: "btn", text: "Normal", onclick: function () { judge(app, pane, false); } }),
        h("button", { type: "button", class: "btn", text: "Abnormal", onclick: function () { judge(app, pane, true); } })
      ]);
      pane.appendChild(row);
    } else {
      var truth = s.current.abnormal, said = s.answer;
      var outcome = truth && said ? "Hit" : truth && !said ? "Miss"
                   : !truth && said ? "False alarm" : "Correct rejection";
      pane.appendChild(h("div", { class: "quiz-feedback" + (truth === said ? "" : " is-wrong") }, [
        h("p", { html: "<strong>" + outcome + ".</strong> This was: " + s.current.name + "." }),
        h("p", { text: truth === said ? "Your call matched the strip."
          : (truth ? "You called it normal; there was a real abnormality to find."
                   : "You called it abnormal; this one was normal. Noise can make a clean strip look suspicious.") })
      ]));
      pane.appendChild(h("button", {
        type: "button", class: "btn btn-primary", text: "Next strip",
        onclick: function () { nextChallenge(app); render(pane, app); }
      }));
    }

    var total = s.hits + s.misses + s.fa + s.cr;
    if (total) {
      var dl = h("dl", { class: "sdt-grid" }, [
        cell("Hits", s.hits, "hit", "abnormal, called abnormal"),
        cell("Misses", s.misses, "", "abnormal, called normal"),
        cell("False alarms", s.fa, "fa", "normal, called abnormal"),
        cell("Correct rejections", s.cr, "", "normal, called normal")
      ]);
      pane.appendChild(dl);
      pane.appendChild(h("p", { class: "illustrative", text: interpret(s) }));
    }
  }

  function cell(label, n, cls, sub) {
    return h("div", { class: "sdt-cell " + cls }, [
      h("dt", { text: label }), h("dd", { text: String(n) }),
      h("p", { class: "illustrative", text: sub })
    ]);
  }

  function judge(app, pane, said) {
    var s = session.sdt;
    s.answer = said;
    s.phase = "revealed";
    var truth = s.current.abnormal;
    if (truth && said) s.hits++;
    else if (truth && !said) s.misses++;
    else if (!truth && said) s.fa++;
    else s.cr++;
    app.pause();
    app.revealName();
    render(pane, app);
  }

  function interpret(s) {
    var signal = s.hits + s.misses, noise = s.fa + s.cr;
    if (signal < 3 || noise < 2) return "Keep going — a few more strips and the pattern in your errors will be readable.";
    var hitRate = s.hits / signal, faRate = s.fa / noise;
    if (hitRate > 0.8 && faRate < 0.25) return "You are separating the two well: you catch most real abnormalities without over-calling normal strips.";
    if (hitRate > 0.8 && faRate >= 0.25) return "You catch nearly everything, but you are also flagging normal strips. That is a liberal threshold — safe, but it generates alarm fatigue on a real unit.";
    if (hitRate <= 0.6 && faRate < 0.2) return "You rarely over-call, but you are missing real abnormalities. That is a conservative threshold, and misses are the more costly error here.";
    return "Your hits and false alarms are running close together, which usually means the strips are genuinely hard to tell apart rather than that your threshold is off. Slow the playback and check P waves one at a time.";
  }

  C.ui.quiz = { render: render, session: session };
})(window.CARDIAC);
