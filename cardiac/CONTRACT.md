# Cardiac Simulator — module contract

Single-file build. `build.py` concatenates `src/*` into `index.html`.
Everything is plain ES5-compatible-ish ES2017 JavaScript in browser globals. No modules, no imports,
no build tooling beyond string concatenation, no network requests at runtime.

Each source file assigns onto the global `CARDIAC` namespace object, which is created by
`src/10-namespace.js`.

## Global namespace

```js
window.CARDIAC = {
  VERSION: "1.0.0",
  content: {},   // clinical content registries (authored data, no logic)
  engine:  {},   // pure functions: rhythm scheduling, ECG synthesis, hemodynamics
  render:  {},   // DOM/SVG renderers
  ui:      {},   // controls, panels
};
```

## File order (build.py concatenates in lexical order)

```
00-doc-open.html          <!doctype, head, opening body -->
05-style.css              (wrapped in <style>)
10-namespace.js           (wrapped in <script>)
20-content-sources.js
21-content-rhythms.js
22-content-conditions.js
23-content-mechanisms.js
24-content-questions.js
25-content-lessons.js
30-engine-vector.js
31-engine-rhythm.js
32-engine-ecg.js
33-engine-hemo.js
34-engine-frame.js
40-svg-heart.html         (inert SVG markup template, hidden)
41-render-heart.js
42-render-ecg.js
43-render-timeline.js
50-ui-controls.js
51-ui-panels.js
52-ui-quiz.js
53-ui-lessons.js
60-app.js
90-doc-close.html
```

---

## Content schemas

### `CARDIAC.content.sources` — array

```js
{ id: "src-xxx", cite: "APA-style citation string", note: "what it supports" }
```

**Fixed source IDs.** Every content file references these and only these. Do not invent new IDs.

| id | work |
|---|---|
| `src-aha-std` | Kligfield et al., AHA/ACCF/HRS recommendations for the standardization and interpretation of the electrocardiogram, Part I |
| `src-aha-ischemia` | Wagner et al., AHA/ACCF/HRS Part VI: acute ischemia/infarction |
| `src-aha-hypertrophy` | Hancock et al., AHA/ACCF/HRS Part V: ECG changes associated with cardiac chamber hypertrophy |
| `src-aha-intervals` | Rautaharju et al., AHA/ACCF/HRS Part IV: ST segment, T and U waves, and the QT interval |
| `src-goldberger` | Goldberger, Goldberger & Shvilkin, *Goldberger's Clinical Electrocardiography* |
| `src-surawicz` | Surawicz & Knilans, *Chou's Electrocardiography in Clinical Practice* |
| `src-weiss-k` | Weiss, Qu & Shivkumar, Electrophysiology of hypokalemia and hyperkalemia |
| `src-klabunde` | Klabunde, *Cardiovascular Physiology Concepts* |
| `src-guyton` | Hall & Hall, *Guyton and Hall Textbook of Medical Physiology* |
| `src-lewis` | Harding et al., *Lewis's Medical-Surgical Nursing* |
| `src-brunner` | Hinkle & Cheever, *Brunner & Suddarth's Textbook of Medical-Surgical Nursing* |
| `src-acls` | American Heart Association, Guidelines for CPR and Emergency Cardiovascular Care |
| `src-af-guideline` | Joglar et al., ACC/AHA/ACCP/HRS Guideline for the Diagnosis and Management of Atrial Fibrillation |
| `src-svt-guideline` | Page et al., ACC/AHA/HRS Guideline for the Management of Adult Patients With Supraventricular Tachycardia |
| `src-brady-guideline` | Kusumoto et al., ACC/AHA/HRS Guideline on the Evaluation and Management of Patients With Bradycardia and Cardiac Conduction Delay |
| `src-hf-guideline` | Heidenreich et al., AHA/ACC/HFSA Guideline for the Management of Heart Failure |
| `src-mayer` | Mayer, *Multimedia Learning* |
| `src-sweller` | Sweller, van Merriënboer & Paas, Cognitive architecture and instructional design: 20 years later |
| `src-ncsbn` | NCSBN, NCLEX-RN Test Plan / Clinical Judgment Measurement Model |
| `src-swets` | Green & Swets, *Signal Detection Theory and Psychophysics* |
| `src-wcag` | W3C, Web Content Accessibility Guidelines (WCAG) 2.2 |

### `CARDIAC.content.rhythms` — object keyed by rhythmId

Rhythm ids (16):
`nsr sinus-brady sinus-tachy pac pvc af aflutter svt avb1 mobitz1 mobitz2 avb2to1 avb3 vt vf asystole`

```js
"af": {
  id: "af",
  label: "Atrial fibrillation",
  short: "A-fib",
  family: "atrial-tachyarrhythmia",  // sinus | ectopy | atrial-tachyarrhythmia | av-conduction | ventricular | arrest
  level: "basic",                    // basic | advanced  — which mode surfaces it by default
  evidence: "D",                     // D | M | A | X  (see spec Appendix B)

  // One-line answer to "what am I looking at?"
  headline: "≤ 90 chars",

  // Structured strip-reading features. Each is <= 90 chars, student-facing.
  features: {
    rate:        "…",
    regularity:  "…",
    pWaves:      "…",
    prInterval:  "…",
    qrs:         "…"
  },

  // THE CAUSAL CHAIN — the core teaching object. 4–7 links, ordered.
  // Each link answers "and therefore…". Keep each `text` <= 150 chars.
  chain: [
    { id: "af-1", layer: "trigger",    label: "≤ 40 chars", text: "…" },
    { id: "af-2", layer: "cellular",   label: "…", text: "…" },
    { id: "af-3", layer: "conduction", label: "…", text: "…" },
    { id: "af-4", layer: "ecg",        label: "…", text: "…" },
    { id: "af-5", layer: "mechanical", label: "…", text: "…" },
    { id: "af-6", layer: "clinical",   label: "…", text: "…" }
  ],
  // layer ∈ trigger | cellular | conduction | ecg | mechanical | clinical

  mechanical: "≤ 160 chars — what the pump actually does",
  perfusionNote: "≤ 160 chars",
  complications: ["≤ 70 chars", …],           // 2–4
  nursing: {
    assess: ["…", …],   // 2–4 items, ≤ 70 chars each, patient-first order
    act:    ["…", …],   // 2–4
    escalate: "≤ 110 chars"
  },
  limits: ["≤ 130 chars", …],   // what this view CANNOT tell you (evidence class X)
  sourceIds: ["src-…"],
  compare: ["aflutter", "svt"]  // rhythms students confuse this with
}
```

### `CARDIAC.content.conditions` — object keyed by conditionId

Ids: `normal hyperkalemia hypokalemia hypercalcemia hypocalcemia hypomagnesemia lvh rvh hfref hfpef`

Same shape as a rhythm minus `features`, plus:

```js
{
  id, label, short, group: "electrolyte" | "structural" | "failure",
  level: "basic" | "advanced",
  evidence: "A",                     // most are variable associations
  headline, chain: [...],            // same link shape
  ecgFindings: ["≤ 90 chars", …],    // "may occur" phrasing REQUIRED
  nonspecific: "≤ 150 chars — the 'or the ECG may look normal' statement",
  mechanical: "…", complications: [...], nursing: {...}, limits: [...],
  sourceIds: [...],
  requiresTwelveLead: true|false     // LVH/RVH => true
}
```

### `CARDIAC.content.mechanisms` — object

Deep-dive expansions keyed by chain-link id. Optional; a link without an entry just shows `text`.

```js
{ "hyperK-3": { detail: "≤ 400 chars, may use plain-text ion notation", figure: null } }
```

### `CARDIAC.content.questions` — array

```js
{
  id: "q-01",
  domain: "cycle" | "sinus-ectopy" | "atrial" | "av-block" | "arrest" | "hemodynamics" | "electrolyte",
  family: "…",                     // rhythm family this maps to, or null
  process: "recognize-cues" | "analyze-cues" | "prioritize-hypotheses" |
           "generate-solutions" | "take-action" | "evaluate-outcomes",
  level: "basic" | "advanced",
  stem: "≤ 55 words",
  options: [ {id:"A", text:"≤ 25 words"}, {id:"B",…}, {id:"C",…}, {id:"D",…} ],
  correct: "A"|"B"|"C"|"D",
  rationale: "≤ 65 words — says why the key is right AND why the best distractor is wrong",
  setup: { rhythm: "af", condition: "normal", lead: "II" } | null,  // optional sim state to load
  sourceIds: [...]
}
```

### `CARDIAC.content.lessons` — array of guided sequences

```js
{
  id: "normal-cycle",
  label: "…",
  level: "basic",
  blurb: "≤ 100 chars",
  steps: [{
    id, title: "≤ 45 chars",
    // exactly ONE contextual sentence, <= 30 words:
    text: "…",
    focus: "anatomy"|"conduction"|"contraction"|"flow"|"integrated",
    seek: { kind:"event", eventType:"…", occurrence:1 } | { kind:"time", ms:0 } | { kind:"start" },
    highlight: ["sa-node", …],       // region ids to spotlight
    predict: { q: "≤ 20 words", options: ["…","…","…"], correct: 0, reveal: "≤ 45 words" } | null
  }]
}
```

---

## Engine interfaces (implemented by me, not by content authors)

```js
CARDIAC.engine.buildSchedule(state) -> { events: CardiacEvent[], meta }
CARDIAC.engine.synthesize(schedule, state) -> { leads: {II: Float32Array, …}, fs: 500, t0ms }
CARDIAC.engine.frameAt(schedule, waveform, state, tMs) -> FrameSnapshot
```

`CardiacEvent`: `{ id, beatId, type, onsetMs, durMs, region, conducted, mech, intensity }`

`FrameSnapshot`: `{ tMs, phase, electrical{active,progress}, mechanical{chambers}, valves, flow,
hemo, patient, summary }`

## Hard rules (from spec §Appendix B) — content authors MUST honor

1. Never state that the ECG measures contraction, pulse, output, or perfusion.
2. Never let a single lead diagnose LVH/RVH, localize ischemia, or determine axis.
3. Never infer a serum concentration from a waveform; use "may occur" + a nonspecific alternative.
4. Never present antiplatelet therapy as a routine substitute for AF anticoagulation.
5. Never imply pulseless VT is PEA, that PEA is a waveform, or that a strip proves pulse status.
6. Never give dosing, prescriptive treatment, or patient-specific diagnosis.
7. Arrest content must never teach that signal/lead verification delays response to an
   unresponsive pulseless patient.
8. Every displayed number is illustrative unless separately validated; prefer direction words.
