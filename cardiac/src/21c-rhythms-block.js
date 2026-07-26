/* 21c-rhythms-block.js — AV conduction block rhythms: first-degree, Mobitz I,
   Mobitz II, 2:1 (unclassified), and third-degree (complete) block, plus
   mechanism deep-dives for selected chain links. Content only, no logic. */

CARDIAC.content.rhythms = CARDIAC.content.rhythms || {};
CARDIAC.content.mechanisms = CARDIAC.content.mechanisms || {};

Object.assign(CARDIAC.content.rhythms, {

  "avb1": {
    id: "avb1",
    label: "First-degree AV block",
    short: "1st-degree AVB",
    family: "av-conduction",
    level: "basic",
    evidence: "D",

    headline: "Every P wave still conducts — each one just takes too long. Delay, not dropped beats.",

    features: {
      rate:       "Whatever the underlying sinus rate is; the delay itself does not change the rate.",
      regularity: "Regular. P-P and R-R stay steady because no beat is ever dropped.",
      pWaves:     "One upright P before every QRS and one QRS after every P — a strict 1:1 pairing.",
      prInterval: "Constant and long: greater than 0.20 s (normal 0.12-0.20 s), the same on every beat.",
      qrs:        "Usually narrow, under 0.12 s — the ventricles are still activated through both bundles."
    },

    chain: [
      { id: "avb1-1", layer: "trigger", label: "The AV node conducts slowly",
        text: "High vagal tone, AV nodal disease, ischemia, or rate-slowing drugs increase the resistance an impulse meets inside the AV node." },
      { id: "avb1-2", layer: "cellular", label: "A slow upstroke gets slower",
        text: "AV nodal cells depolarize on a slow Ca2+ inward current, so anything that reduces that current lowers upstroke speed and cell-to-cell conduction." },
      { id: "avb1-3", layer: "conduction", label: "Delayed, but never blocked",
        text: "The delay lengthens yet conduction never fails, so every atrial impulse still reaches the ventricles and no QRS is ever dropped." },
      { id: "avb1-4", layer: "ecg", label: "A long but unchanging PR",
        text: "The same extra nodal pause is added to every beat, so PR exceeds 0.20 s, measures the same each time, and is always followed by a QRS." },
      { id: "avb1-5", layer: "mechanical", label: "Atrial kick lands early",
        text: "The atria contract further ahead of the ventricles, so the atrial kick arrives earlier in filling and may add slightly less to stroke volume." },
      { id: "avb1-6", layer: "clinical", label: "Usually silent — watch for change",
        text: "Output is essentially preserved and most patients notice nothing, so the value of finding it is that it flags conduction tissue worth watching." }
    ],

    mechanical: "Every P still produces a ventricular contraction and an ejection, so stroke volume and cardiac output are essentially unchanged.",
    perfusionNote: "Perfusion is normally maintained. Judge it at the patient — pulse, blood pressure, skin, mentation — never from the length of the PR.",
    complications: [
      "May progress to higher-degree block if the disease advances",
      "Marked PR delay can reduce the atrial contribution to filling",
      "Can be an early clue to drug effect, ischemia, or myocarditis"
    ],
    nursing: {
      assess: [
        "Patient first: responsiveness, pulse, blood pressure, and skin",
        "Confirm the signal — leads, artifact, and a readable P wave",
        "Measure PR across several beats; it should be long and unchanging",
        "Review rate-slowing medications and any reported symptoms"
      ],
      act: [
        "Continue cardiac monitoring and save a labeled rhythm strip",
        "Trend the PR interval each shift and with any status change",
        "Teach the patient to report dizziness, syncope, or new fatigue",
        "Report new PR prolongation before giving rate-slowing drugs"
      ],
      escalate: "Notify the provider for new or lengthening PR delay, any dropped beat, or symptoms of low output."
    },
    limits: [
      "A strip shows delay, not its cause, and cannot tell you whether it sits in the node or below it.",
      "The ECG shows electrical timing only — never contraction, pulse, output, or perfusion.",
      "One lead can hide P waves; characterizing conduction disease needs a 12-lead and provider review."
    ],
    sourceIds: ["src-brady-guideline", "src-goldberger", "src-lewis"],
    compare: ["nsr", "mobitz1"]
  },

  "mobitz1": {
    id: "mobitz1",
    label: "Second-degree AV block, Mobitz type I (Wenckebach)",
    short: "Mobitz I",
    family: "av-conduction",
    level: "basic",
    evidence: "D",

    headline: "PR stretches a little more each beat until one P wave finally fails to conduct.",

    features: {
      rate:       "Atrial rate regular; ventricular rate is slightly lower because beats drop out.",
      regularity: "Irregular in a repeating pattern — grouped beating, with R-R gradually shortening.",
      pWaves:     "Upright and on time, and there are more P waves than QRS complexes on the strip.",
      prInterval: "Lengthens progressively, by a smaller increment each beat, then resets after the drop.",
      qrs:        "Usually narrow, under 0.12 s, because the trouble is in the AV node above the bundles."
    },

    chain: [
      { id: "mobitz1-1", layer: "trigger", label: "The node needs longer to recover",
        text: "High vagal tone, inferior wall ischemia, or AV nodal blocking drugs leave the node needing more time to recover between atrial impulses." },
      { id: "mobitz1-2", layer: "cellular", label: "Slow channels reset incompletely",
        text: "Each impulse arrives before the node's slow Ca2+ channels have fully reset, so every successive beat conducts a little more slowly than the last." },
      { id: "mobitz1-3", layer: "conduction", label: "Decremental delay accumulates",
        text: "Delay builds beat after beat, in shrinking increments, until one atrial impulse finds the node still refractory and is not conducted at all." },
      { id: "mobitz1-4", layer: "ecg", label: "PR grows, then a P stands alone",
        text: "PR lengthens across the group until a P appears with no QRS after it; the pause lets the node recover, so the next PR is the shortest of the group." },
      { id: "mobitz1-5", layer: "mechanical", label: "The dropped P ejects nothing",
        text: "A nonconducted P means no ventricular depolarization — therefore no contraction, no ejection, and no pulse for that beat: a gap at the radial artery." },
      { id: "mobitz1-6", layer: "clinical", label: "Usually benign, usually tolerated",
        text: "Only occasional beats drop, and nodal conduction usually improves as vagal tone falls or a rate-slowing drug wears off, so most patients cope." }
    ],

    mechanical: "Most beats eject normally; each nonconducted P yields no contraction and no ejection, so the pulse skips a beat and mean output falls slightly.",
    perfusionNote: "Usually well tolerated, but take an apical-radial pulse and a blood pressure — the strip cannot tell you which beats actually perfused.",
    complications: [
      "Dropped beats may cluster and slow the ventricular rate",
      "Symptomatic bradycardia with dizziness or near-syncope",
      "Progression to higher-degree block is uncommon but possible"
    ],
    nursing: {
      assess: [
        "Patient first: responsiveness, pulse, blood pressure, and skin",
        "Compare apical and radial rates to count nonperfusing beats",
        "Map the group — does PR lengthen before each dropped QRS?",
        "Review vagal triggers and AV nodal blocking medications"
      ],
      act: [
        "Maintain continuous monitoring; save and label a rhythm strip",
        "Assist with position changes and activity if lightheaded",
        "Report symptoms together with the rate, never the rate alone",
        "Anticipate provider review of rate-slowing drug therapy"
      ],
      escalate: "Call the provider for symptomatic bradycardia, hypotension, or a change to constant-PR dropped beats."
    },
    limits: [
      "Grouped beating alone does not classify the block; you must see PR lengthen across conducted beats.",
      "A strip cannot tell you whether a dropped beat was tolerated — that is a pulse and perfusion finding.",
      "The site of block is inferred, not proven; confirmation needs a 12-lead and provider assessment."
    ],
    sourceIds: ["src-brady-guideline", "src-goldberger", "src-surawicz"],
    compare: ["mobitz2", "avb2to1"]
  },

  "mobitz2": {
    id: "mobitz2",
    label: "Second-degree AV block, Mobitz type II",
    short: "Mobitz II",
    family: "av-conduction",
    level: "advanced",
    evidence: "D",

    headline: "PR never changes, then a QRS simply vanishes — all-or-none failure below the AV node.",

    features: {
      rate:       "Atrial rate regular; ventricular rate is lower and frequently bradycardic.",
      regularity: "Regular except for abrupt pauses where an expected QRS is missing.",
      pWaves:     "Regular and marching on time, with more P waves than QRS complexes.",
      prInterval: "Constant on every conducted beat — no lengthening at all before the dropped one.",
      qrs:        "Often 0.12 s or wider, reflecting disease in the His-Purkinje conduction system."
    },

    chain: [
      { id: "mobitz2-1", layer: "trigger", label: "Disease below the AV node",
        text: "Fibrosis, anterior wall infarction, or degenerative disease damages the His bundle and its Purkinje branches rather than the node above them." },
      { id: "mobitz2-2", layer: "cellular", label: "Fast-sodium tissue is all-or-none",
        text: "His-Purkinje cells fire on a fast Na+ current with little capacity for graded slowing, so they either conduct at full speed or do not conduct at all." },
      { id: "mobitz2-3", layer: "conduction", label: "Failure with no warning",
        text: "Without decremental slowing there is no advance signal: an impulse fails on a beat that looked exactly like the ones that conducted before it." },
      { id: "mobitz2-4", layer: "ecg", label: "Fixed PR, missing QRS",
        text: "Every conducted PR measures the same, and then a P wave stands alone with no QRS; the pause equals a whole multiple of the P-P interval." },
      { id: "mobitz2-5", layer: "mechanical", label: "Each dropped P is a lost beat",
        text: "A P with no QRS means no ventricular depolarization, therefore no contraction and no ejection; consecutive drops cut cardiac output abruptly." },
      { id: "mobitz2-6", layer: "clinical", label: "This is the dangerous one",
        text: "The diseased tissue can fail entirely without warning, so Mobitz II may progress to complete block and warrants pacing readiness at the bedside." }
    ],

    mechanical: "Conducted beats eject normally, but every dropped P produces no contraction at all, and consecutive drops lower cardiac output sharply.",
    perfusionNote: "Assess the patient continuously: hypotension, pallor, chest pain, or altered mentation during the pauses signals failing perfusion.",
    complications: [
      "Abrupt progression to complete heart block or asystole",
      "Symptomatic bradycardia, syncope, and injury from falls",
      "Low cardiac output with hypotension and chest pain"
    ],
    nursing: {
      assess: [
        "Patient first: responsiveness, pulse, blood pressure, and skin",
        "Confirm PR is constant on every conducted beat before the drop",
        "Note QRS width; a wide QRS suggests disease below the node",
        "Watch for syncope, chest pain, dyspnea, or new confusion"
      ],
      act: [
        "Keep continuous monitoring; do not leave the patient alone",
        "Apply oxygen per protocol if hypoxemic; ensure working IV access",
        "Place pacing pads and bring a pacing-capable defibrillator",
        "Escalate early and anticipate transcutaneous pacing orders"
      ],
      escalate: "Notify the provider or rapid response now for pauses, syncope, hypotension, or a widening QRS."
    },
    limits: [
      "A single strip cannot prove the block sits below the node; QRS width is a clue, not a diagnosis.",
      "The ECG shows no contraction or pulse — a conducted QRS is not proof that blood was ejected.",
      "Nothing on the strip predicts when, or whether, complete block will occur."
    ],
    sourceIds: ["src-brady-guideline", "src-acls", "src-goldberger"],
    compare: ["mobitz1", "avb2to1"]
  },

  "avb2to1": {
    id: "avb2to1",
    label: "2:1 AV block (type not classifiable)",
    short: "2:1 AV block",
    family: "av-conduction",
    level: "advanced",
    evidence: "X",

    headline: "Every other P conducts, so the type of block cannot be classified from this strip.",

    features: {
      rate:       "The ventricular rate is exactly half the atrial rate and is often bradycardic.",
      regularity: "Regular — conducted and blocked P waves alternate in a fixed 2:1 pattern.",
      pWaves:     "Two P waves for every QRS; every second P has no QRS after it.",
      prInterval: "Constant on conducted beats, but never two conducted beats in a row to compare.",
      qrs:        "May be narrow or wide; width hints at the level of block but does not prove it."
    },

    chain: [
      { id: "avb2to1-1", layer: "trigger", label: "Either level of disease fits",
        text: "Slow, progressive fatigue inside the AV node and abrupt failure below it can each block every second impulse and produce exactly the same strip." },
      { id: "avb2to1-2", layer: "conduction", label: "Alternate impulses fail",
        text: "Every second atrial impulse arrives while the conduction system is still refractory, so beats alternate: conducted, blocked, conducted, blocked." },
      { id: "avb2to1-3", layer: "ecg", label: "No two conducted PRs in a row",
        text: "PR lengthening can only be seen by comparing consecutive conducted beats, and with every other P blocked that comparison never exists here." },
      { id: "avb2to1-4", layer: "ecg", label: "So report it as unclassified",
        text: "The honest reading is 2:1 AV block, type not determined — naming it Mobitz I or Mobitz II from this strip is a guess, not an interpretation." },
      { id: "avb2to1-5", layer: "mechanical", label: "Half the P waves eject nothing",
        text: "Each blocked P produces no ventricular depolarization, so no contraction and no ejection; the ventricular rate halves and output usually falls." },
      { id: "avb2to1-6", layer: "clinical", label: "Treat it as the dangerous kind",
        text: "Because a below-node cause cannot be excluded, 2:1 block is monitored with the caution owed to Mobitz II until a provider characterizes it." }
    ],

    mechanical: "Only every second atrial impulse produces a contraction, so ventricular rate and cardiac output can fall far enough to cause symptoms.",
    perfusionNote: "A halved ventricular rate may not sustain perfusion; check pulse, blood pressure, mentation, and urine output rather than trusting the strip.",
    complications: [
      "Symptomatic bradycardia with syncope and fall injury",
      "Progression to complete heart block",
      "Mislabeling the type, which hides the real risk"
    ],
    nursing: {
      assess: [
        "Patient first: responsiveness, pulse, blood pressure, and skin",
        "Count atrial and ventricular rates separately to confirm 2:1",
        "Note QRS width and check prior strips for the same pattern",
        "Screen for dizziness, syncope, chest pain, or dyspnea"
      ],
      act: [
        "Document it as 2:1 AV block, type not determined",
        "Maintain continuous monitoring and keep the patient safe in bed",
        "Have pacing pads and a pacing-capable monitor available",
        "Anticipate a 12-lead and provider evaluation of the block level"
      ],
      escalate: "Report promptly — 2:1 conduction with symptoms, hypotension, or a wide QRS needs provider review."
    },
    limits: [
      "This strip cannot separate Mobitz I from Mobitz II; only unclassified 2:1 block is defensible.",
      "QRS width suggests, but never proves, the anatomic level of the block.",
      "Rate and rhythm say nothing about pulse or perfusion — assess the patient for those."
    ],
    sourceIds: ["src-brady-guideline", "src-goldberger", "src-surawicz"],
    compare: ["mobitz1", "mobitz2"]
  },

  "avb3": {
    id: "avb3",
    label: "Third-degree (complete) AV block",
    short: "Complete heart block",
    family: "av-conduction",
    level: "basic",
    evidence: "D",

    headline: "Atria and ventricles run on separate clocks — no atrial impulse reaches the ventricles.",

    features: {
      rate:       "The atrial rate is usually faster than the escape ventricular rate, which is slow.",
      regularity: "P-P is regular and R-R is regular, but the two have no relationship to each other.",
      pWaves:     "Present and marching through, landing before, inside, and after QRS complexes.",
      prInterval: "Not measurable: the P-to-QRS distance keeps shifting because no P wave conducts.",
      qrs:        "Narrow if the escape is junctional, wide if it arises lower in the ventricle."
    },

    chain: [
      { id: "avb3-1", layer: "trigger", label: "Conduction fails completely",
        text: "Infarction, fibrosis, or drug toxicity interrupts the AV conduction pathway so completely that no atrial impulse reaches the ventricles." },
      { id: "avb3-2", layer: "conduction", label: "Two independent pacemakers",
        text: "The sinus node keeps pacing the atria on schedule while tissue below the block escapes at its own intrinsic rate — atrioventricular dissociation." },
      { id: "avb3-3", layer: "ecg", label: "P waves march through the QRS",
        text: "P-P and R-R are each regular but unlinked, so the P-to-QRS distance shifts steadily and P waves drift into and out of QRS complexes and T waves." },
      { id: "avb3-4", layer: "ecg", label: "Escape site sets rate and width",
        text: "A junctional escape is faster and uses normal pathways, so its QRS is narrow; a ventricular escape is slower and spreads cell to cell, so it is wide." },
      { id: "avb3-5", layer: "mechanical", label: "Atrial kick lost, timing random",
        text: "Atria contract at moments unrelated to ventricular filling, so the atrial kick is wasted or fired against closed valves and stroke volume falls." },
      { id: "avb3-6", layer: "clinical", label: "The escape may not be enough",
        text: "Only escape beats eject blood, so a slow escape rate lowers cardiac output and perfusion of the brain, kidneys, and myocardium suffers." },
      { id: "avb3-7", layer: "clinical", label: "Escape rhythms are unreliable",
        text: "The escape focus can slow or stop without warning, so complete block calls for continuous monitoring, pacing readiness, and immediate escalation." }
    ],

    mechanical: "Only the escape rhythm generates contractions, and it fires without atrial coordination, so stroke volume and cardiac output both fall.",
    perfusionNote: "A slow escape often cannot sustain perfusion — expect hypotension, confusion, chest pain, or syncope, and reassess pulse and mentation often.",
    complications: [
      "Escape failure leading to ventricular standstill or asystole",
      "Syncope, falls, and injury from abrupt loss of output",
      "Hypotension, heart failure, and end-organ hypoperfusion"
    ],
    nursing: {
      assess: [
        "Patient first: responsiveness, pulse, blood pressure, and skin",
        "Confirm dissociation: regular P-P, regular R-R, no fixed PR",
        "Note the escape rate and QRS width — slow and wide is worse",
        "Track mentation, chest pain, and urine output for hypoperfusion"
      ],
      act: [
        "Stay with the patient; continuous monitoring and full vital signs",
        "Apply pacing pads and bring a pacing-capable defibrillator",
        "Ensure working IV access and apply oxygen per protocol if hypoxemic",
        "Anticipate transcutaneous pacing and provider-directed therapy"
      ],
      escalate: "Activate rapid response now for complete block with bradycardia, hypotension, altered mentation, or syncope."
    },
    limits: [
      "The strip shows escape activity, not perfusion; a QRS on the screen never proves a pulse.",
      "One lead cannot tell you exactly where in the conduction system the escape focus sits.",
      "Cause — ischemia, drug effect, or fibrosis — needs a provider workup, not a rhythm strip."
    ],
    sourceIds: ["src-brady-guideline", "src-acls", "src-lewis"],
    compare: ["mobitz2", "sinus-brady"]
  }

});

Object.assign(CARDIAC.content.mechanisms, {

  "avb1-4": {
    detail: "The PR interval is a stopwatch on one trip: atrial depolarization, then the deliberate pause inside the AV node, then rapid travel down the His bundle. Usually the added time is nodal pause, though a strip cannot prove where it sits. Because the pause is long but stable, each P is followed by its own QRS at a fixed distance. The defining test: a long PR with no dropped beats is delay, not block.",
    figure: null
  },

  "mobitz1-2": {
    detail: "AV nodal cells rely on a slow Ca2+ inward current, which recovers from inactivation slowly. When impulses arrive faster than that recovery, each one meets fewer available channels than the one before, so its upstroke is weaker and conduction is slower. Recovery is nonlinear, so the biggest jump in PR is usually from the first to the second beat and the increments then shrink.",
    figure: null
  },

  "mobitz1-3": {
    detail: "Decremental conduction means the impulse weakens as it travels rather than failing outright. Delay accumulates across the group until an atrial impulse finds the node fully refractory and is not conducted. That dropped beat gives the node a long recovery, so the next impulse conducts with the shortest PR of the cycle and the pattern begins again — the grouped beating seen on the strip.",
    figure: null
  },

  "mobitz1-5": {
    detail: "Follow the deterministic rule. A nonconducted P wave means the ventricles were never depolarized. No depolarization means no ventricular contraction, no systolic pressure rise, no aortic valve opening, and no stroke volume. That beat is electrically visible as a P wave, mechanically absent, and palpably absent at the radial artery. This is why the apical-radial comparison matters.",
    figure: null
  },

  "mobitz2-2": {
    detail: "His-Purkinje fibers depolarize on a fast Na+ current and are built for speed and fidelity, not for graded slowing. Diseased fibers therefore behave in an all-or-none way: they conduct essentially normally, or they fail. That single property explains the whole strip — a PR that never varies, no warning before the drop, and a QRS that is often wide because the surviving pathway is abnormal.",
    figure: null
  },

  "mobitz2-3": {
    detail: "In Mobitz I the strip warns you: PR lengthening is a visible countdown to the drop. Mobitz II removes the countdown. Every conducted beat looks identical, so the next failure is unpredictable, and nothing on the strip tells you whether one, two, or all subsequent impulses will fail. Unpredictability, not the number of dropped beats, is what makes this rhythm dangerous.",
    figure: null
  },

  "avb2to1-3": {
    detail: "Classification depends on comparing PR intervals of consecutive conducted beats. In 2:1 conduction, conducted beats are always separated by a blocked P, so no two conducted PRs ever sit side by side. A PR that looks constant proves nothing, because you are only sampling every other beat. The correct report is 2:1 AV block, type not determined, pending a 12-lead and provider evaluation.",
    figure: null
  },

  "avb2to1-5": {
    detail: "Half the atrial impulses never reach the ventricles, so half the P waves produce no QRS, no contraction, and no ejection. With an atrial rate near normal, the resulting ventricular rate is often bradycardic. Cardiac output equals stroke volume times heart rate, so halving the rate can outpace whatever compensatory increase in stroke volume the ventricle can produce.",
    figure: null
  },

  "avb3-2": {
    detail: "With conduction fully interrupted, the sinus node continues to pace the atria on its own schedule while a subsidiary pacemaker below the block takes over the ventricles. Both are regular, neither one drives the other, and the P-P interval simply marches through the strip. That independence is what makes PR unmeasurable — the intervals you can draw are coincidences, not conduction.",
    figure: null
  },

  "avb3-4": {
    detail: "The escape focus tells you two things at once. A junctional escape near the His bundle enters the normal Purkinje network, so ventricular activation is fast and the QRS is narrow, and its intrinsic rate is higher. A ventricular escape arises below that network and spreads muscle to muscle, so activation is slow, the QRS is wide, and the intrinsic rate is lower and less reliable.",
    figure: null
  },

  "avb3-6": {
    detail: "Only escape beats produce ventricular contraction, so the escape rate is the perfusing rate. When it is slow, cardiac output falls, so the pressure driving coronary and cerebral blood flow drops and the patient can become hypotensive, confused, or syncopal. The strip shows the electrical escape but says nothing about whether it perfuses; that answer comes from pulse, pressure, mentation, and skin.",
    figure: null
  }

});
