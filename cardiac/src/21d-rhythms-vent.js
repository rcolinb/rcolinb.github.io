/* 21d-rhythms-vent.js — ventricular and arrest rhythms: ventricular tachycardia,
   ventricular fibrillation, asystole; plus the pulseless electrical activity (PEA)
   patient state as a condition, and mechanism deep-dives for selected chain links. */

Object.assign(CARDIAC.content.rhythms, {

  "vt": {
    id: "vt",
    label: "Ventricular tachycardia",
    short: "V-tach",
    family: "ventricular",
    level: "basic",
    evidence: "D",

    headline: "Fast, wide, regular ventricular rhythm — the strip never tells you if there is a pulse.",

    features: {
      rate:       "Usually 100-250/min, driven from the ventricle rather than the sinus node.",
      regularity: "Regular or very nearly regular; beat-to-beat spacing changes little.",
      pWaves:     "Absent, hidden, or unrelated to the QRS; the atria may march independently.",
      prInterval: "Not measurable — no P wave reliably precedes the wide complex.",
      qrs:        "Wide — 0.12 s or more — and bizarre; the T wave usually points opposite the QRS."
    },

    chain: [
      { id: "vt-1", layer: "trigger", label: "A ventricular site takes over",
        text: "Scarred, ischemic, or irritable ventricular tissue starts firing — or sustains a reentrant loop — faster than the sinus node can drive the heart." },
      { id: "vt-2", layer: "cellular", label: "Impulse starts in working muscle",
        text: "The impulse begins in working myocardium rather than the His-Purkinje network, so it must travel myocyte to myocyte through gap junctions." },
      { id: "vt-3", layer: "conduction", label: "Cell-to-cell spread is slow",
        text: "Muscle-to-muscle conduction is several times slower than Purkinje conduction, so the two ventricles depolarize in sequence instead of together." },
      { id: "vt-4", layer: "ecg", label: "Wide, bizarre QRS; discordant T",
        text: "Slow, sequential activation writes a QRS of 0.12 s or more with an odd shape; repolarization retraces that abnormal path, so the T points opposite." },
      { id: "vt-5", layer: "mechanical", label: "Filling time collapses",
        text: "The ventricles contract out of step and the fast rate shortens diastole, so they fill less with each cycle and stroke volume falls." },
      { id: "vt-6", layer: "clinical", label: "Pulse status is a patient finding",
        text: "The same wide-complex timing may perfuse adequately, perfuse poorly, or produce no pulse at all — only assessing the patient decides which." }
    ],

    mechanical: "Diastolic filling time is cut short and the atrial contribution is lost, so stroke volume drops; output may hold, fall sharply, or cease.",
    perfusionNote: "Rate and QRS width do not predict perfusion. Responsiveness, a central pulse, blood pressure, skin, and mentation do — the waveform reports none of them.",

    complications: [
      "May deteriorate into ventricular fibrillation without warning",
      "Hypotension, chest pain, dyspnea, or altered mental status",
      "Loss of pulse and cardiac arrest",
      "Coronary flow falls as diastole shortens, worsening ischemia"
    ],

    nursing: {
      assess: [
        "Check responsiveness and breathing before reading the monitor",
        "Palpate a central pulse; assess blood pressure, skin, mentation",
        "Confirm leads and signal quality after assessing the patient",
        "Note onset, duration, and symptoms the patient reports"
      ],
      act: [
        "Pulseless: start compressions, call a code, get the defibrillator",
        "With a pulse: stay with the patient and monitor continuously",
        "Call for help and bring the code cart to the bedside",
        "Support IV access and a 12-lead ECG once the team is present"
      ],
      escalate: "Activate rapid response or the code team at once; call a code immediately if the patient is pulseless."
    },

    limits: [
      "This view cannot tell you whether the rhythm is producing a pulse or any perfusion.",
      "A single lead cannot separate ventricular tachycardia from a supraventricular rhythm conducted aberrantly.",
      "The strip does not identify the cause — ischemia, electrolytes, and drug effects all look alike here."
    ],

    sourceIds: ["src-goldberger", "src-acls", "src-lewis"],
    compare: ["svt", "pvc", "vf"]
  },

  "vf": {
    id: "vf",
    label: "Ventricular fibrillation",
    short: "V-fib",
    family: "arrest",
    level: "basic",
    evidence: "D",

    headline: "Chaotic ventricular activity, no organized contraction, no pulse — a shockable arrest.",

    features: {
      rate:       "Not measurable; there are no countable QRS complexes.",
      regularity: "Chaotically irregular — no repeating cycle of any kind.",
      pWaves:     "None visible; any atrial activity is buried in the chaos.",
      prInterval: "Not measurable; there is no P wave and no discrete QRS.",
      qrs:        "No discrete QRS — only coarse or fine wandering undulations."
    },

    chain: [
      { id: "vf-1", layer: "trigger", label: "The activation wavefront fractures",
        text: "Ischemia, scar, electrolyte derangement, or a beat landing on the vulnerable part of the T wave breaks the orderly ventricular wavefront apart." },
      { id: "vf-2", layer: "cellular", label: "Cells recover at different times",
        text: "Neighboring myocytes regain excitability at different moments, so an advancing wave meets tissue that is ready in places and refractory in others." },
      { id: "vf-3", layer: "conduction", label: "Wavelets split and re-enter",
        text: "The wave breaks around refractory patches into daughter wavelets that circle, collide, and regenerate — self-sustaining reentry with no fixed circuit." },
      { id: "vf-4", layer: "ecg", label: "No organized complexes at all",
        text: "With no shared activation sequence, the surface tracing shows only undulations that start coarse and grow finer — no P wave, no QRS, no T." },
      { id: "vf-5", layer: "mechanical", label: "The ventricle quivers, not pumps",
        text: "Myocytes shorten out of step with one another, so the chamber never builds pressure, the valves never open, nothing is ejected, and there is no pulse." },
      { id: "vf-6", layer: "clinical", label: "Shockable — compressions buy the time",
        text: "Only defibrillation can silence the wavelets at once; high-quality compressions keep coronary and cerebral flow going until that shock is delivered." }
    ],

    mechanical: "There is no coordinated ejection: stroke volume and cardiac output are zero, and coronary perfusion stops within seconds.",
    perfusionNote: "There is no perfusion. A patient in true ventricular fibrillation is unresponsive and pulseless; a palpable pulse means you are seeing artifact.",

    complications: [
      "Death within minutes without CPR and defibrillation",
      "Neurologic injury rises with every minute of no-flow time",
      "Coarse fibrillation may become fine over time, then asystole"
    ],

    nursing: {
      assess: [
        "Confirm unresponsiveness, absent normal breathing, no central pulse",
        "Take no more than about 10 seconds for that pulse check",
        "Verify the pattern in a second lead only while CPR continues"
      ],
      act: [
        "Call a code, start compressions, send for the defibrillator now",
        "Apply pads and defibrillate as soon as the device is ready",
        "Resume compressions immediately after the shock is delivered",
        "Rotate compressors and use feedback for rate and depth"
      ],
      escalate: "This is a code. Activate the resuscitation team immediately and start compressions before anything else."
    },

    limits: [
      "The monitor cannot separate true fibrillation from motion, CPR, or electrical artifact on its own.",
      "How coarse or fine the waveform looks does not reliably predict the response to a shock.",
      "This view cannot identify the cause; that comes from history, labs, and the team's assessment."
    ],

    sourceIds: ["src-acls", "src-goldberger", "src-lewis"],
    compare: ["vt", "asystole"]
  },

  "asystole": {
    id: "asystole",
    label: "Asystole",
    short: "Asystole",
    family: "arrest",
    level: "basic",
    evidence: "D",

    headline: "No organized electrical activation — a flat or near-flat line; a nonshockable arrest.",

    features: {
      rate:       "None; no depolarizations are being generated or conducted.",
      regularity: "Not applicable — there are no complexes to time against each other.",
      pWaves:     "Usually absent; occasionally P waves appear with no QRS following.",
      prInterval: "Not measurable; there are no conducted beats to time.",
      qrs:        "Absent — a flat or nearly flat baseline showing only slow drift."
    },

    chain: [
      { id: "asystole-1", layer: "trigger", label: "Every pacemaker fails together",
        text: "Prolonged hypoxia, acidosis, or severe metabolic derangement leaves sinus, junctional, and ventricular pacemaker cells unable to reach threshold." },
      { id: "asystole-2", layer: "cellular", label: "Phase 4 never reaches threshold",
        text: "Without spontaneous phase 4 drift up to threshold, no pacemaker cell fires, so no action potential is generated anywhere to propagate." },
      { id: "asystole-3", layer: "conduction", label: "Nothing is left to conduct",
        text: "With no impulse launched, the conduction system has nothing to carry, and the escape rhythms that normally rescue a failing sinus node are silent." },
      { id: "asystole-4", layer: "ecg", label: "Flat line — or a signal problem",
        text: "The tracing shows no waves. A disconnected lead, low gain, or fine fibrillation can produce the same picture, so a flat line is a claim to verify." },
      { id: "asystole-5", layer: "mechanical", label: "No excitation, no contraction",
        text: "With no depolarization there is no calcium release to couple excitation to contraction, so no pressure develops, nothing is ejected, and no pulse." },
      { id: "asystole-6", layer: "clinical", label: "Nonshockable; compressions and causes",
        text: "A shock can only stop activity that is already there, and here there is none, so survival rests on immediate CPR and finding a reversible cause." },
      { id: "asystole-7", layer: "clinical", label: "Verify while you resuscitate",
        text: "Check lead contact, gain, and a second lead during compressions — verification runs alongside the response and never delays CPR or the code call." }
    ],

    mechanical: "There is no contraction at all; cardiac output is zero and any forward flow depends entirely on chest compressions.",
    perfusionNote: "The patient is unresponsive and pulseless. If someone has a pulse and the screen is flat, the problem is the signal, not the heart.",

    complications: [
      "Survival is very low and falls with every minute of no flow",
      "Mistaking fine ventricular fibrillation for asystole delays a shock",
      "Reversible causes are missed when no one looks for them"
    ],

    nursing: {
      assess: [
        "Confirm unresponsiveness, absent breathing, and no central pulse",
        "While CPR continues, check lead contact, cables, and monitor gain",
        "Confirm the flat line in more than one lead during compressions"
      ],
      act: [
        "Start compressions and call the code before troubleshooting leads",
        "Do not defibrillate — asystole is a nonshockable rhythm",
        "Report history that suggests a reversible cause to the team",
        "Document rhythm checks, timing, and the patient's response"
      ],
      escalate: "Call the code the moment a patient is unresponsive and pulseless — equipment checks happen during CPR."
    },

    limits: [
      "A flat line in one lead may be artifact, a loose lead, or low gain rather than asystole.",
      "This view cannot reliably separate fine ventricular fibrillation from a true flat line.",
      "The monitor cannot tell you the cause of the arrest or how long it has lasted."
    ],

    sourceIds: ["src-acls", "src-swets", "src-goldberger"],
    compare: ["vf", "avb3"]
  }

});

Object.assign(CARDIAC.content.conditions, {

  "pea": {
    id: "pea",
    label: "Pulseless electrical activity",
    short: "PEA",
    group: "failure",
    level: "basic",
    evidence: "D",

    headline: "Organized electrical activity on the monitor with no effective pulse — a patient state.",

    chain: [
      { id: "pea-1", layer: "trigger", label: "The wiring survives; the pump does not",
        text: "Lost volume, blocked flow, poor oxygen delivery, or a metabolic insult can leave the conduction system intact while mechanical output fails." },
      { id: "pea-2", layer: "cellular", label: "Depolarization without force",
        text: "Impulses still spread, but hypoxia, acidosis, or potassium shifts impair the calcium handling that turns depolarization into contraction." },
      { id: "pea-3", layer: "ecg", label: "The monitor still looks organized",
        text: "Because activation is preserved, the tracing can look ordinary — sinus, slow, fast, narrow, or wide — which is what makes this state easy to miss." },
      { id: "pea-4", layer: "mechanical", label: "No output you can feel",
        text: "Either the ventricle cannot generate pressure, or it has nothing to eject, or it has nowhere to eject into — so no palpable pulse is produced." },
      { id: "pea-5", layer: "clinical", label: "A patient finding, never a waveform",
        text: "You identify it by pulse check in an unresponsive patient, never from the strip; the identical tracing with a pulse is simply that rhythm." },
      { id: "pea-6", layer: "clinical", label: "CPR plus the reversible-cause search",
        text: "Compressions substitute for the failed pump while the team works through reversible causes — without correcting the cause, output does not return." }
    ],

    ecgFindings: [
      "Any organized rhythm may be present — sinus, slow, fast, narrow, or wide",
      "Complexes may narrow or widen over time; neither pattern names the cause",
      "The rate may look entirely unremarkable on the monitor"
    ],
    nonspecific: "The tracing may look completely normal. Nothing on the monitor confirms or excludes this state; only a pulse check in an unresponsive patient does.",

    mechanical: "Electrical activation is preserved but effective ejection is not, so there is no palpable pulse and no measurable blood pressure.",
    perfusionNote: "There is no effective perfusion, and no waveform shows that; only an unresponsive patient with no pulse does.",

    complications: [
      "Deteriorates to asystole if the cause is not corrected",
      "A missed reversible cause makes return of circulation unlikely",
      "Watching the monitor instead of the patient delays compressions"
    ],

    nursing: {
      assess: [
        "Check responsiveness and a central pulse in any organized rhythm",
        "Reassess the pulse at rhythm checks, not during compressions",
        "Gather history and recent events that point to a reversible cause"
      ],
      act: [
        "Start high-quality compressions and call the code immediately",
        "Do not defibrillate — this is a nonshockable patient state",
        "Report likely contributors: bleeding, dialysis, trauma, hypoxia",
        "Anticipate and support the team's reversible-cause workup"
      ],
      escalate: "Any unresponsive patient without a pulse is a code, no matter how normal the monitor looks."
    },

    limits: [
      "No waveform feature identifies this state; only assessment of the patient can.",
      "Pulseless ventricular tachycardia and fibrillation are not this state — they are shockable.",
      "This view cannot tell you which reversible cause is present, or whether one is."
    ],

    sourceIds: ["src-acls", "src-lewis", "src-klabunde"],
    requiresTwelveLead: false,
    compare: ["normal", "hfref"]
  }

});

Object.assign(CARDIAC.content.mechanisms, {

  "vt-3": {
    detail: "The His-Purkinje system is built for speed: large fibers rich in gap junctions hand the impulse to both ventricles nearly at once, so normal activation fits inside a QRS under 0.12 s. A ventricular focus bypasses that highway and creeps through working muscle instead. The wave crosses the ventricles the long way, region after region, so activation takes far longer than it should.",
    figure: null
  },

  "vt-4": {
    detail: "QRS width is a stopwatch on ventricular activation, not a measure of strength. Normal activation finishes under 0.12 s because Purkinje fibers deliver it almost everywhere at once; muscle-to-muscle spread stretches it past 0.12 s. Recovery normally runs in roughly the reverse order of activation, which keeps the T upright; here it follows the abnormal path, so the T flips — expected discordance.",
    figure: null
  },

  "vt-6": {
    detail: "Two patients can show the same wide-complex tracing at the same rate: one is talking to you with a strong radial pulse, the other is unresponsive and pulseless. The ECG records electrical activation only — it cannot report contraction, ejection, blood pressure, or perfusion. The strip narrows the possibilities; assessing the patient decides the response.",
    figure: null
  },

  "vf-3": {
    detail: "Reentry needs slow conduction, tissue that is still refractory, and a path back to muscle that has recovered. In fibrillation those conditions exist everywhere at once and keep moving, so each wavelet splinters into more wavelets and no fixed circuit exists to interrupt. Defibrillation depolarizes a critical mass of myocardium at once, leaving no recovered tissue for a wavelet to enter.",
    figure: null
  },

  "vf-5": {
    detail: "Ejection requires many myocytes to shorten together so chamber pressure rises above aortic pressure and the aortic valve opens. In fibrillation the cells shorten at random times, so their forces cancel; pressure never crosses that threshold, the valve stays shut, and nothing leaves the ventricle. Compressions supply an external pressure gradient until a shock can restore order.",
    figure: null
  },

  "asystole-4": {
    detail: "A flat line is a signal you must interpret, and several different situations produce it: true absence of electrical activity, a lead off the chest or unplugged, gain set too low to show small deflections, or fine fibrillation near the noise floor. Because the response differs — shock or no shock — confirm in more than one lead, during compressions, never instead of them.",
    figure: null
  },

  "asystole-7": {
    detail: "Sequence matters. An unresponsive, pulseless patient gets a code call and compressions first; lead, cable, gain, and second-lead checks happen while compressions continue, done by someone not compressing. Troubleshooting before starting CPR, or waiting for a better tracing before calling for help, turns verification into delay. Verification informs the response; it never gates it.",
    figure: null
  },

  "pea-6": {
    detail: "At this level the goal is to recognize and report contributors, not to run an algorithm. Commonly taught reversible causes: hypovolemia, hypoxia, acidosis, low or high potassium, hypothermia, tension pneumothorax, cardiac tamponade, toxins, and thrombosis in the lungs or coronary arteries. The nurse contributes history, recent events, and trends — plus uninterrupted compressions.",
    figure: null
  }

});
