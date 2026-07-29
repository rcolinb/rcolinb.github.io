/* 51-ui-panels.js — the teaching rail.
 *
 * "Rhythm" answers what am I looking at. "Why" answers how did it get that way,
 * which is the reason this product exists. "Set up" is where the learner changes
 * one thing at a time and watches what follows.
 */
(function (C) {
  "use strict";

  var M = C.M;

  function h(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== false) n.setAttribute(k, attrs[k]);
    }
    if (kids) [].concat(kids).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function section(title, kids) {
    var f = document.createDocumentFragment();
    f.appendChild(h("h4", { text: title }));
    [].concat(kids).forEach(function (c) { if (c) f.appendChild(c); });
    return f;
  }

  function list(items, cls) {
    return h("ul", cls ? { class: cls } : null, (items || []).map(function (t) {
      return h("li", { text: t });
    }));
  }

  /* Whichever record the learner is currently looking at: the condition when one
   * is selected, otherwise the rhythm. */
  function activeRecord(state) {
    if (state.condition && state.condition !== "normal") {
      var c = C.content.conditions[state.condition];
      if (c) return { kind: "condition", rec: c };
    }
    var r = C.content.rhythms[state.rhythm];
    return { kind: "rhythm", rec: r };
  }

  /* ------------------------------------------------------------ rhythm pane */

  function renderRhythm(pane, app) {
    var s = app.state;
    var r = C.content.rhythms[s.rhythm];
    pane.innerHTML = "";
    if (!r) { pane.appendChild(h("p", { text: "No record for this rhythm." })); return; }

    pane.appendChild(h("p", { class: "eyebrow", text: r.family.replace(/-/g, " ") }));
    pane.appendChild(h("h3", { class: "headline", text: r.label }));
    pane.appendChild(h("p", { text: r.headline }));

    /* With a condition applied, the strip no longer matches the plain rhythm
     * description below, so say so before the learner reads on. */
    var cond = s.condition !== "normal" ? C.content.conditions[s.condition] : null;
    if (cond) {
      var kids = [
        h("h5", { text: "Condition applied — the strip will not match the rhythm alone" }),
        h("p", { text: cond.label + ". " + (cond.headline || "") })
      ];
      if (cond.ecgFindings && cond.ecgFindings.length) kids.push(list(cond.ecgFindings.slice(0, 4)));
      kids.push(h("button", {
        type: "button", class: "pill", text: "Why does it do that?",
        onclick: function () { app.setTab("why"); }
      }));
      kids.push(h("button", {
        type: "button", class: "pill", text: "Remove condition",
        onclick: function () { app.setCondition("normal"); }
      }));
      pane.appendChild(h("div", { class: "callout variable" }, kids));
    }

    /* The flutter ratio is the single most instructive control in the app and it
     * lives two tabs away, rendered only when flutter is already selected. Say
     * so here, where the learner actually is when they pick the rhythm. */
    if (s.rhythm === "aflutter") {
      var fr = String(s.flutterRatio) === "variable" ? "variable" : String(s.flutterRatio) + ":1";
      pane.appendChild(h("div", { class: "callout" }, [
        h("p", { text: "Conducting " + fr + " — the atrial rate is fixed, and how many "
                     + "flutter waves reach the ventricles is what sets the pulse." }),
        h("button", {
          type: "button", class: "pill", text: "Change the conduction ratio",
          onclick: function () { app.setTab("setup"); }
        })
      ]));
    }

    if (r.features) {
      var tb = h("tbody");
      [["Rate", "rate"], ["Regularity", "regularity"], ["P waves", "pWaves"],
       ["PR", "prInterval"], ["QRS", "qrs"]].forEach(function (row) {
        if (!r.features[row[1]]) return;
        tb.appendChild(h("tr", null, [h("th", { text: row[0] }), h("td", { text: r.features[row[1]] })]));
      });
      pane.appendChild(section("Reading the strip", h("table", { class: "features" }, tb)));
    }

    if (r.mechanical) {
      pane.appendChild(section("What the pump does", h("p", { text: r.mechanical })));
    }
    if (r.perfusionNote) {
      pane.appendChild(h("div", { class: "callout" }, [
        h("h5", { text: "Perfusion" }), h("p", { text: r.perfusionNote })
      ]));
    }
    if (r.complications && r.complications.length) {
      pane.appendChild(section("Watch for", list(r.complications)));
    }
    if (r.nursing) {
      var n = r.nursing;
      var kids = [];
      if (n.assess && n.assess.length) { kids.push(h("p", { class: "eyebrow", text: "Assess" })); kids.push(list(n.assess)); }
      if (n.act && n.act.length) { kids.push(h("p", { class: "eyebrow", text: "Act" })); kids.push(list(n.act)); }
      if (n.escalate) { kids.push(h("p", { class: "eyebrow", text: "Escalate" })); kids.push(h("p", { text: n.escalate })); }
      pane.appendChild(section("Nursing priorities", kids));
    }
    if (r.limits && r.limits.length) {
      pane.appendChild(h("div", { class: "callout limit" }, [
        h("h5", { text: "What this view cannot tell you" }),
        list(r.limits)
      ]));
    }
    if (r.compare && r.compare.length) {
      var row = h("div", { class: "pill-row" });
      r.compare.forEach(function (id) {
        var other = C.content.rhythms[id];
        if (!other) return;
        row.appendChild(h("button", {
          type: "button", class: "pill", text: "Compare with " + other.short || other.label,
          onclick: function () { app.setRhythm(id); }
        }));
      });
      if (row.childNodes.length) pane.appendChild(section("Easily confused with", row));
    }
    pane.appendChild(sourceLine(r.sourceIds));
  }

  function sourceLine(ids) {
    if (!ids || !ids.length) return document.createDocumentFragment();
    var names = ids.map(function (id) {
      var s = (C.content.sources || []).filter(function (x) { return x.id === id; })[0];
      if (!s) return null;
      var m = /^([^(]+)\(/.exec(s.cite);
      return m ? m[1].trim().replace(/,$/, "") : s.id;
    }).filter(Boolean);
    if (!names.length) return document.createDocumentFragment();
    return h("p", { class: "illustrative", text: "Sources: " + names.join("; ") + "." });
  }

  /* --------------------------------------------------------------- why pane */

  var LAYER_NAME = {
    trigger: "Trigger", cellular: "Cell level", conduction: "Conduction",
    ecg: "On the ECG", mechanical: "The pump", clinical: "For the patient"
  };

  /* Which wave on the strip a chain link is talking about, so selecting the link
   * lights up the part of the tracing it explains. */
  function tagsForLink(link) {
    var t = (link.label + " " + link.text).toLowerCase();
    var tags = [];
    if (/\bt wave|t-wave|repolaris|repolariz|peaked t|flat t/.test(t)) tags.push("T");
    if (/\bp wave|p-wave|atrial depolaris|atrial depolariz|fibrillatory|flutter wave/.test(t)) tags.push("P");
    if (/\bqrs|ventricular depolaris|ventricular depolariz|widen/.test(t)) tags.push("QRS");
    if (/\bu wave|u-wave/.test(t)) tags.push("U");
    if (/\bst segment|st depress|st elev/.test(t)) tags.push("ST");
    return tags;
  }

  function renderWhy(pane, app) {
    var s = app.state;
    var active = activeRecord(s);
    var rec = active.rec;
    pane.innerHTML = "";
    if (!rec) { pane.appendChild(h("p", { text: "No mechanism recorded." })); return; }

    pane.appendChild(h("p", { class: "eyebrow", text: "Cause and effect" }));
    pane.appendChild(h("h3", { class: "headline", text: rec.label }));

    if (active.kind === "condition") {
      // Switch what is being explained, not what is loaded. Silently deleting
      // the learner's condition to change the topic of a panel is a surprise.
      var row = h("div", { class: "pill-row" }, [
        h("button", {
          type: "button", class: "pill", text: "Read the underlying rhythm instead",
          "data-fkey": "why-rhythm",
          onclick: function () { app.setTab("rhythm"); }
        }),
        h("button", {
          type: "button", class: "pill", text: "Remove " + (rec.short || rec.label),
          "data-fkey": "why-remove",
          onclick: function () { app.setCondition("normal"); }
        })
      ]);
      pane.appendChild(row);
    }

    pane.appendChild(h("p", { class: "illustrative",
      text: "Each step should make the next one feel inevitable. Open a step for the detail behind it." }));

    var ol = h("ol", { class: "chain" });
    (rec.chain || []).forEach(function (link) {
      var li = h("li");
      li.appendChild(h("span", { class: "layer-tag layer-" + link.layer, text: LAYER_NAME[link.layer] || link.layer }));
      li.appendChild(h("span", { class: "chain-label", text: link.label }));
      li.appendChild(h("p", { class: "chain-text", text: link.text }));

      var detail = C.content.mechanisms[link.id];
      var tags = tagsForLink(link);

      if (detail || tags.length) {
        var open = false;
        var box = null;
        var btn = h("button", {
          type: "button", class: "more",
          text: detail ? "Go deeper" : "Show me on the tracing",
          "aria-expanded": "false",
          onclick: function () {
            open = !open;
            btn.setAttribute("aria-expanded", open ? "true" : "false");
            btn.textContent = open ? "Close" : (detail ? "Go deeper" : "Show me on the tracing");
            if (open) {
              if (detail && !box) { box = h("p", { class: "detail", text: detail.detail }); li.appendChild(box); }
              else if (box) box.hidden = false;
              app.setHighlight(tags);
              [].forEach.call(ol.querySelectorAll("li"), function (x) { x.classList.remove("is-current"); });
              li.classList.add("is-current");
            } else {
              if (box) box.hidden = true;
              app.setHighlight([]);
              li.classList.remove("is-current");
            }
          }
        });
        li.appendChild(btn);
      }
      ol.appendChild(li);
    });
    pane.appendChild(ol);

    if (rec.ecgFindings && rec.ecgFindings.length) {
      pane.appendChild(h("div", { class: "callout variable" }, [
        h("h5", { text: "What may appear on the ECG" }),
        list(rec.ecgFindings)
      ]));
    }
    if (rec.nonspecific) {
      pane.appendChild(h("div", { class: "callout variable" }, [
        h("h5", { text: "Or it may not" }), h("p", { text: rec.nonspecific })
      ]));
    }
    if (rec.requiresTwelveLead) {
      pane.appendChild(h("div", { class: "callout limit" }, [
        h("h5", { text: "Needs more than one lead" }),
        h("p", { text: "This pattern is a relationship between leads. A single rhythm strip cannot show it, and cannot rule it in or out." }),
        s.mode === "basic" ? h("button", {
          type: "button", class: "pill", text: "Switch to Advanced 12-lead",
          onclick: function () { app.setMode("advanced"); }
        }) : null
      ]));
    }
    if (rec.limits && rec.limits.length && active.kind === "condition") {
      pane.appendChild(h("div", { class: "callout limit" }, [
        h("h5", { text: "Limits" }), list(rec.limits)
      ]));
    }
    var mod = C.engine.ecg.MODS[s.condition];
    if (mod && mod.note) {
      pane.appendChild(h("div", { class: "callout" }, [
        h("h5", { text: "How the model draws it" }), h("p", { text: mod.note })
      ]));
    }
    pane.appendChild(sourceLine(rec.sourceIds));
  }

  /* ------------------------------------------------------------- setup pane */

  function slider(label, value, opts, onInput) {
    var row = h("div", { class: "slider-row" });
    var id = "sl-" + Math.random().toString(36).slice(2, 8);
    var val = h("span", { class: "val", text: opts.format(value) });
    row.appendChild(h("label", { for: id, text: label }));
    row.appendChild(val);
    var input = h("input", {
      type: "range", id: id, min: opts.min, max: opts.max, step: opts.step || 1, value: value,
      // Without valuetext a screen reader reads "62" for a control whose scale
      // is qualitative, which tells the learner nothing.
      "aria-valuetext": opts.format(value),
      oninput: function () {
        var v = parseFloat(input.value);
        var t = opts.format(v);
        val.textContent = t;
        input.setAttribute("aria-valuetext", t);
        onInput(v);
      }
    });
    row.appendChild(input);
    if (opts.hint) row.appendChild(h("p", { class: "hint", text: opts.hint }));
    return row;
  }

  function renderSetup(pane, app) {
    var s = app.state;
    pane.innerHTML = "";

    /* --- rate --- */
    var spec = C.engine.rhythm.RATE_SPEC[s.rhythm];
    var rateKids = [];
    if (spec && spec.kind !== "none") {
      rateKids.push(slider(spec.label, s.rates[spec.key] !== undefined ? s.rates[spec.key] : spec.def,
        { min: spec.min, max: spec.max, format: function (v) { return Math.round(v) + " / min"; },
          hint: spec.kind === "atrial" ? "The ventricular rate follows from how many impulses get through." : null },
        function (v) { app.setRate(spec.key, v); }));
      if (spec.kind === "dual") {
        rateKids.push(slider(spec.label2, s.rates[spec.key2] !== undefined ? s.rates[spec.key2] : spec.def2,
          { min: spec.min2, max: spec.max2, format: function (v) { return Math.round(v) + " / min"; },
            hint: "The escape pacemaker is completely independent of the atria." },
          function (v) { app.setRate(spec.key2, v); }));
      }
    } else {
      rateKids.push(h("p", { class: "illustrative", text: "This rhythm has no countable rate to set." }));
    }
    if (s.rhythm === "aflutter") {
      var ratios = [["2", "2:1"], ["3", "3:1"], ["4", "4:1"], ["variable", "Variable"]];
      var rr = h("div", { class: "pill-row" });
      ratios.forEach(function (p) {
        rr.appendChild(h("button", {
          type: "button", class: "pill", text: p[1], "data-fkey": "ratio-" + p[0],
          "aria-pressed": String(String(s.flutterRatio) === p[0]),
          onclick: function () { app.setFlutterRatio(p[0] === "variable" ? "variable" : parseInt(p[0], 10)); }
        }));
      });
      rateKids.push(h("p", { class: "eyebrow", text: "AV conduction ratio" }));
      rateKids.push(rr);
    }
    pane.appendChild(section("Rate", rateKids));

    /* --- patient state --- */
    var psOptions = patientStatesFor(s.rhythm);
    if (psOptions.length > 1) {
      var ps = h("div", { class: "pill-row" });
      psOptions.forEach(function (o) {
        ps.appendChild(h("button", {
          type: "button", class: "pill", text: o.label, "data-fkey": "pstate-" + o.id,
          "aria-pressed": String(s.patientState === o.id),
          onclick: function () { app.setPatientState(o.id); }
        }));
      });
      pane.appendChild(section("Patient state", [
        ps,
        h("p", { class: "illustrative",
          text: "The same tracing can belong to very different patients. This is a finding you get from the patient, never from the monitor." })
      ]));
    }

    /* --- physiology --- */
    var phys = C.engine.hemo.resolvePhysiology(s);
    var pk = [];
    var VARS = [
      ["preload", "Preload — filling volume", "How much the ventricle is filled before it contracts."],
      ["contractility", "Contractility", "How forcefully the muscle shortens, independent of how full it is."],
      ["compliance", "Compliance — stiffness", "How readily the ventricle accepts volume. Low compliance means a stiff ventricle."],
      ["systemicAfterload", "Systemic afterload", "The load the LEFT ventricle ejects against."],
      ["pulmonaryAfterload", "Pulmonary afterload", "The load the RIGHT ventricle ejects against. Not the same variable."]
    ];
    var shown = s.mode === "advanced" ? VARS : VARS.slice(0, 3);
    shown.forEach(function (v) {
      pk.push(slider(v[1], Math.round(phys[v[0]] * 100),
        { min: 0, max: 100, format: function (x) { return qualitative(x); }, hint: v[2] },
        function (x) { app.setPhysiology(v[0], x / 100); }));
    });
    pk.push(h("button", { type: "button", class: "btn", text: "Reset to baseline",
      onclick: function () { app.resetPhysiology(); } }));
    pane.appendChild(section("Loading conditions", pk));

    /* --- compensation --- */
    if (s.mode === "advanced") {
      var comp = h("div", { class: "pill-row" });
      Object.keys(C.engine.hemo.COMPENSATION).forEach(function (id) {
        var c = C.engine.hemo.COMPENSATION[id];
        comp.appendChild(h("button", {
          type: "button", class: "pill", text: c.label, "data-fkey": "comp-" + id,
          "aria-pressed": String(s.compensation === id),
          onclick: function () { app.setCompensation(id); }
        }));
      });
      var kids = [comp];
      var cur = C.engine.hemo.COMPENSATION[s.compensation];
      if (cur && cur.scale) {
        kids.push(h("div", { class: "callout" }, [
          h("h5", { text: "Timescale: " + cur.scale }),
          h("p", { text: "Buys: " + cur.buys }),
          h("p", { text: "Costs: " + cur.costs }),
          h("p", { class: "illustrative", text: "Playback seconds are not physiologic hours. Nothing here is retained fluid appearing beat to beat." })
        ]));
      }
      pane.appendChild(section("Compensation", kids));
    }

    /* --- signal quality: the signal-detection lesson --- */
    pane.appendChild(section("Signal quality", [
      slider("Artifact and noise", Math.round((s.noise || 0) * 100),
        { min: 0, max: 100, format: function (v) { return v === 0 ? "Clean" : v < 35 ? "Slight" : v < 70 ? "Moderate" : "Heavy"; },
          hint: "Deciding whether a P wave is really there is a judgement made in noise. Turn this up and see where your own threshold sits." },
        function (v) { app.setNoise(v / 100); })
    ]));

    /* --- seed --- */
    if (s.mode === "advanced") {
      pane.appendChild(section("Reproducibility", [
        h("p", { class: "illustrative", text: "Irregular rhythms are generated from a seed, so the same seed always gives the same strip." }),
        h("button", { type: "button", class: "btn", text: "New random pattern",
          onclick: function () { app.randomizeSeed(); } })
      ]));
    }
  }

  function qualitative(x) {
    if (x < 12) return "very low";
    if (x < 32) return "low";
    if (x < 44) return "below normal";
    if (x <= 56) return "baseline";
    if (x < 70) return "above normal";
    if (x < 88) return "high";
    return "very high";
  }

  function patientStatesFor(rhythm) {
    if (rhythm === "vf") return [{ id: "vf-arrest", label: "Arrest — no pulse" }];
    if (rhythm === "asystole") return [{ id: "asystole-arrest", label: "Arrest — no pulse" }];
    if (rhythm === "vt") return [
      { id: "vt-with-pulse", label: "VT with a pulse" },
      { id: "pulseless-vt", label: "Pulseless VT" }
    ];
    return [
      { id: "perfusing-default", label: "Perfusing" },
      { id: "pea", label: "PEA — organised rhythm, no pulse" }
    ];
  }

  C.ui.panels = {
    h: h, section: section, list: list, slider: slider,
    renderRhythm: renderRhythm, renderWhy: renderWhy, renderSetup: renderSetup,
    patientStatesFor: patientStatesFor, activeRecord: activeRecord, sourceLine: sourceLine
  };
})(window.CARDIAC);
