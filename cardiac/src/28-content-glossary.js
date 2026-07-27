/* 28-content-glossary.js — one plain sentence per term.
 *
 * Written for someone who has never seen an ECG. Rules the definitions follow,
 * because a definition is read as authoritative AND read out of context — it is
 * the one place where the surrounding framing that protects the honesty rules
 * everywhere else is absent:
 *
 *   - `short` is one sentence, under thirty words, containing no other jargon.
 *     If a definition needs a second defined term, that term gets its own entry
 *     and the reader can follow it.
 *   - Nothing electrical is described as mechanical. The ECG records electrical
 *     activity; it does not record beating, pumping, squeezing or output.
 *   - "Pulse" says it is FELT. A beginner's default model is "line on the screen
 *     means alive", and this is the single entry most likely to reinforce it.
 *
 * `also` carries the spelling variants. This is not optional plumbing: the
 * codebase already writes both "depolarization" (25-content-lessons.js) and
 * "depolarisation" (26-content-waveguide.js), so a single-spelling term list
 * would silently miss half the places it should fire.
 *
 * `see` points at a structure in content.parts; `wave` at an entry in
 * content.waveGuide. Both are optional, and both turn the definition into a
 * doorway to the same explain-this machinery the rest of the product uses.
 */

Object.assign(CARDIAC.content.glossary, {

  /* ---------------------------------------------------- the two big stories */

  "electrical": {
    term: "Electrical activity",
    short: "The signal that travels through the heart telling muscle when to work. It is what the tracing records.",
    also: ["electrical", "electrical signal", "electrically"]
  },
  "ecg": {
    term: "ECG",
    short: "A recording of the heart's electrical activity, made from sensors on the skin. It shows the signal, not the squeeze.",
    also: ["electrocardiogram", "EKG"]
  },
  "depolarize": {
    term: "Depolarise",
    short: "What a heart muscle cell does when the signal reaches it — an electrical change that tells the cell to get ready to work.",
    also: ["depolarisation", "depolarization", "depolarises",
           "depolarizes", "depolarising", "depolarizing", "depolarized", "depolarised"],
    wave: "p"
  },
  "repolarize": {
    term: "Repolarise",
    short: "The cell resetting itself electrically after it has worked, so that it is ready for the next beat.",
    also: ["repolarisation", "repolarization", "repolarises",
           "repolarizes", "repolarising", "repolarizing"],
    wave: "t"
  },
  "wavefront": {
    term: "Wavefront",
    short: "The leading edge of the signal as it spreads through the heart, like the edge of a ripple crossing a pond.",
    also: ["wave front"]
  },
  "conduction": {
    term: "Conduction",
    short: "The passing of the electrical signal from one part of the heart to the next.",
    also: ["conducts", "conducting", "conducted", "conduction velocity"]
  },
  "myocardium": {
    term: "Myocardium",
    short: "The muscular wall of the heart — the part that does the actual work of squeezing.",
    also: ["myocardial"]
  },

  /* ------------------------------------------------------- the pumping cycle */

  "systole": {
    term: "Systole",
    short: "The part of each beat when the ventricles are squeezing and pushing blood out.",
    also: ["systolic"]
  },
  "diastole": {
    term: "Diastole",
    short: "The part of each beat when the ventricles are relaxed and filling with blood. It is the longer half at a normal rate.",
    also: ["diastolic"]
  },
  "isovolumetric": {
    term: "Isovolumetric",
    short: "A moment when every valve is shut, so the ventricle changes pressure without changing volume. No blood moves.",
    also: ["isovolumic"]
  },
  "atrium": {
    term: "Atrium",
    short: "One of the two upper chambers. They receive blood arriving at the heart and hand it down to the chamber below.",
    also: ["atria", "atrial"],
    see: "right-atrium"
  },
  "ventricle": {
    term: "Ventricle",
    short: "One of the two lower chambers. They do the forceful work of pushing blood out to the lungs and to the body.",
    also: ["ventricles", "ventricular"],
    see: "left-ventricle"
  },
  "atrial-kick": {
    term: "Atrial kick",
    short: "The last top-up of filling the atria add by squeezing, just before the ventricles take over.",
    also: ["atrial contraction"]
  },
  "end-diastolic-volume": {
    term: "End-diastolic volume",
    short: "How much blood is in a ventricle at the instant it stops filling and starts to squeeze.",
    also: ["end diastolic volume", "EDV"]
  },
  "stroke-volume": {
    term: "Stroke volume",
    short: "The amount of blood one ventricle pushes out in a single beat.",
    also: []
  },
  "cardiac-output": {
    term: "Cardiac output",
    short: "How much blood the heart moves each minute. It depends on both the rate and the amount moved per beat.",
    also: []
  },
  "preload": {
    term: "Preload",
    short: "How full the ventricle is before it squeezes — the stretch on the muscle at the start of the beat.",
    also: []
  },
  "afterload": {
    term: "Afterload",
    short: "How hard the ventricle has to push to open its outlet valve and move blood onward.",
    also: []
  },
  "contractility": {
    term: "Contractility",
    short: "How forcefully the muscle squeezes for a given amount of filling — the strength of the beat itself.",
    also: ["contractile"]
  },
  "frank-starling": {
    term: "Frank-Starling relation",
    short: "The observation that a ventricle filled more fully squeezes out more, up to a point beyond which extra filling stops helping.",
    also: ["Frank-Starling", "Starling"]
  },

  /* ------------------------------------------------ the patient, not the trace */

  "pulse": {
    term: "Pulse",
    short: "A wave you can feel with your fingers at an artery when blood is actually moving. You feel it; you cannot see it on a tracing.",
    also: ["pulses", "pulseless"]
  },
  "perfusion": {
    term: "Perfusion",
    short: "Blood actually reaching the body's tissues and delivering oxygen to them.",
    also: ["perfusing", "perfused"]
  },

  /* --------------------------------------------------------- reading a strip */

  "lead": {
    term: "Lead",
    short: "One viewpoint on the heart's electrical activity. Different sensor positions give different views of the same signal.",
    also: ["leads"]
  },
  "sinus-rhythm": {
    term: "Sinus rhythm",
    short: "The normal pattern, in which each beat starts at the heart's own pacemaker and travels its usual route.",
    also: ["sinus"],
    see: "sa-node"
  },
  "deflection": {
    term: "Deflection",
    short: "Any movement of the tracing away from the flat baseline, up or down.",
    also: ["deflections"]
  },
  "baseline": {
    term: "Baseline",
    short: "The flat line the tracing rests on when no electrical change is being recorded.",
    also: ["isoelectric"]
  },
  "interval": {
    term: "Interval",
    short: "The time between two named points on the tracing, measured by counting squares.",
    also: ["intervals"]
  },
  "hypertrophy": {
    term: "Hypertrophy",
    short: "Muscle that has thickened over time in response to working against a heavier load.",
    also: ["hypertrophied", "hypertrophic"]
  }
});
