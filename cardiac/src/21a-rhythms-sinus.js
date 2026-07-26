/* 21a-rhythms-sinus.js — rhythm records and mechanism deep-dives for the sinus
   and ectopy families: nsr, sinus-brady, sinus-tachy, pac, pvc.
   Assigns onto the pre-existing CARDIAC.content registries. No declarations. */

Object.assign(CARDIAC.content.rhythms, {

  "nsr": {
    id: "nsr",
    label: "Normal sinus rhythm",
    short: "NSR",
    family: "sinus",
    level: "basic",
    evidence: "D",

    headline: "The reference rhythm: the sinus node fires, every impulse conducts, rate 60-100/min.",

    features: {
      rate:       "60-100 beats/min in a resting adult.",
      regularity: "Regular — R-R intervals barely change from beat to beat.",
      pWaves:     "One upright P before every QRS in lead II, all the same shape.",
      prInterval: "Constant, 0.12-0.20 s.",
      qrs:        "Narrow, under 0.12 s — the ventricles were activated through His-Purkinje."
    },

    chain: [
      { id: "nsr-1", layer: "trigger", label: "Sinus node sets the pace",
        text: "Pacemaker cells in the sinoatrial (SA) node leak Na+ and Ca2+ inward between beats, drifting toward threshold faster than any other cardiac tissue." },
      { id: "nsr-2", layer: "cellular", label: "Fastest drift wins",
        text: "Whichever cell reaches threshold first captures the heart, so the SA node suppresses slower backup pacemakers in the AV junction and Purkinje fibers." },
      { id: "nsr-3", layer: "conduction", label: "Atria, then a deliberate delay",
        text: "The impulse spreads cell to cell across both atria, then slows in the atrioventricular (AV) node — a built-in pause so atrial emptying finishes first." },
      { id: "nsr-4", layer: "ecg", label: "P wave, then PR segment",
        text: "Atrial depolarization writes the P wave and the AV delay writes the flat PR segment, so a constant PR of 0.12-0.20 s means the same delay every beat." },
      { id: "nsr-5", layer: "conduction", label: "His-Purkinje delivers fast",
        text: "Below the node the impulse enters the His bundle and Purkinje network, which fires both ventricles nearly at once — that speed keeps the QRS narrow." },
      { id: "nsr-6", layer: "mechanical", label: "Filling, then ejection",
        text: "The atrial kick tops off filling, then near-simultaneous ventricular depolarization produces one coordinated squeeze and a full stroke volume." },
      { id: "nsr-7", layer: "clinical", label: "Electrical normal is not perfusion",
        text: "The tracing only says the electrical sequence was normal. You still palpate a pulse and assess perfusion to learn whether the pump actually followed." }
    ],

    mechanical: "Atrial systole adds roughly the last 20-30% of ventricular filling, then a synchronized ventricular contraction ejects a full stroke volume.",
    perfusionNote: "At 60-100/min diastole is long enough to fill the ventricles and to perfuse the left coronary circulation, which fills mainly during diastole.",
    complications: [
      "None from the rhythm itself — it is the comparison standard",
      "A normal strip does not exclude ischemia or heart failure",
      "Rate can be normal while stroke volume is not"
    ],
    nursing: {
      assess: [
        "Confirm this is your patient and the leads are on correctly",
        "Palpate a pulse and compare it with the monitor rate",
        "Check blood pressure, skin, and level of consciousness",
        "Ask about chest pain, dyspnea, or dizziness despite a normal strip"
      ],
      act: [
        "Document the strip with rate, rhythm, and patient response",
        "Set alarm limits for this patient rather than leaving defaults",
        "Reassess after activity, position change, or new medication"
      ],
      escalate: "Report new symptoms even when the rhythm looks normal — perfusion can fail with normal electrical activity."
    },
    limits: [
      "A single monitoring lead cannot localize ischemia, judge axis, or diagnose chamber enlargement.",
      "The tracing shows electrical activity only; it never proves a pulse, an output, or perfusion.",
      "Normal rate and rhythm do not rule out structural, valvular, or coronary disease."
    ],
    sourceIds: ["src-goldberger", "src-klabunde", "src-aha-std"],
    compare: ["sinus-brady", "sinus-tachy", "pac"]
  },

  "sinus-brady": {
    id: "sinus-brady",
    label: "Sinus bradycardia",
    short: "Sinus brady",
    family: "sinus",
    level: "basic",
    evidence: "D",

    headline: "Sinus rhythm under 60/min — normal conduction, a slow pacemaker.",

    features: {
      rate:       "Under 60 beats/min.",
      regularity: "Regular.",
      pWaves:     "Upright and uniform, one before every QRS.",
      prInterval: "Constant, 0.12-0.20 s.",
      qrs:        "Narrow, under 0.12 s."
    },

    chain: [
      { id: "sinus-brady-1", layer: "trigger", label: "Vagal tone or a slowed node",
        text: "Rising parasympathetic (vagal) traffic, sinus node disease, hypothermia, or rate-slowing drugs all make the SA node take longer to reach threshold." },
      { id: "sinus-brady-2", layer: "cellular", label: "Slower diastolic drift",
        text: "Acetylcholine opens K+ channels and blunts the pacemaker current, so the cell sits more negative and climbs toward threshold more slowly." },
      { id: "sinus-brady-3", layer: "conduction", label: "Everything else stays normal",
        text: "Each impulse still takes the usual atria → AV node → His-Purkinje route, so P wave, PR, and QRS keep their shape; only the gap between beats grows." },
      { id: "sinus-brady-4", layer: "ecg", label: "Long, evenly spaced R-R",
        text: "The strip looks like sinus rhythm stretched out. An upright P before every QRS with a PR still 0.12-0.20 s separates this from block or escape." },
      { id: "sinus-brady-5", layer: "mechanical", label: "Longer diastole, bigger beats",
        text: "More filling time raises end-diastolic volume, and the stretched ventricle contracts more forcefully (Frank-Starling), so stroke volume rises." },
      { id: "sinus-brady-6", layer: "mechanical", label: "When compensation runs out",
        text: "Once filling is maximal, stroke volume cannot rise further; since output equals stroke volume times rate, more slowing now drops cardiac output." },
      { id: "sinus-brady-7", layer: "clinical", label: "Treat the patient, not the number",
        text: "An athlete or a sleeping adult at 48/min can be fine. The same rate with cool skin, confusion, or falling pressure is symptomatic bradycardia." }
    ],

    mechanical: "Diastole lengthens, preload rises, and stroke volume climbs by the Frank-Starling mechanism until the ventricle simply cannot fill any further.",
    perfusionNote: "Longer diastole also lengthens coronary filling time, but if mean arterial pressure falls the coronary and cerebral supply falls along with it.",
    complications: [
      "Hypotension with reduced cerebral perfusion",
      "Syncope or near-syncope with fall injury",
      "Escape rhythms or pauses if the sinus node slows further",
      "Worsening ischemia when cardiac output drops"
    ],
    nursing: {
      assess: [
        "Confirm patient and leads; rule out a monitor undercounting artifact",
        "Palpate the pulse — does it perfuse and does it match the monitor?",
        "Blood pressure, level of consciousness, skin, urine output",
        "Ask about dizziness, near-fainting, chest pain, or dyspnea"
      ],
      act: [
        "Keep continuous monitoring and position the patient for safety",
        "Review rate-slowing medications and recent doses with the provider",
        "Obtain a 12-lead ECG and ordered laboratory studies",
        "Have transcutaneous pacing equipment ready if the patient is unstable"
      ],
      escalate: "Call for help now if slow rate comes with hypotension, altered mentation, chest pain, or signs of shock."
    },
    limits: [
      "Rate alone does not define significance — symptoms and perfusion do.",
      "This view cannot say whether the cause is vagal, drug effect, ischemic, or sinus node disease.",
      "A single lead cannot localize ischemia or diagnose conduction disease beyond rate and intervals."
    ],
    sourceIds: ["src-brady-guideline", "src-klabunde", "src-lewis"],
    compare: ["nsr", "avb1", "avb3"]
  },

  "sinus-tachy": {
    id: "sinus-tachy",
    label: "Sinus tachycardia",
    short: "Sinus tach",
    family: "sinus",
    level: "basic",
    evidence: "D",

    headline: "Sinus rhythm above 100/min — a normal node answering a demand somewhere else.",

    features: {
      rate:       "Over 100 beats/min; commonly 100-150 in a resting adult.",
      regularity: "Regular, though it may drift gradually with breathing or activity.",
      pWaves:     "Upright and uniform, but may hide inside the preceding T wave as rate climbs.",
      prInterval: "Constant, 0.12-0.20 s, and may sit at the short end at fast rates.",
      qrs:        "Narrow, under 0.12 s."
    },

    chain: [
      { id: "sinus-tachy-1", layer: "trigger", label: "A demand the body is answering",
        text: "Fever, pain, anxiety, hypovolemia, hypoxemia, anemia, or stimulants raise sympathetic outflow and circulating catecholamines such as epinephrine." },
      { id: "sinus-tachy-2", layer: "cellular", label: "Faster pacemaker drift",
        text: "Beta-1 receptor stimulation speeds the pacemaker current and Ca2+ entry in SA nodal cells, so they reach threshold sooner and fire more often." },
      { id: "sinus-tachy-3", layer: "conduction", label: "Same road, more traffic",
        text: "The path is unchanged, so P-QRS-T keeps its normal shape; sympathetic tone also speeds the AV node, holding the PR at the short end of normal." },
      { id: "sinus-tachy-4", layer: "ecg", label: "Diastole is what gets shorter",
        text: "Rate rises mostly by eating into the interval between beats, so the T-P segment narrows first and P waves start to perch on the previous T wave." },
      { id: "sinus-tachy-5", layer: "mechanical", label: "Less filling time per beat",
        text: "A shorter diastole leaves less time to fill, so stroke volume falls; cardiac output still rises while the gain in rate outweighs the loss in filling." },
      { id: "sinus-tachy-6", layer: "mechanical", label: "Where the curve turns over",
        text: "Somewhere past roughly 150/min in most adults, filling time gets too short to sustain stroke volume, and cardiac output starts to fall." },
      { id: "sinus-tachy-7", layer: "clinical", label: "A symptom, not a diagnosis",
        text: "Hunt the cause — fever, bleeding, pain, hypoxemia, withdrawal — because slowing the rate without fixing the driver removes the patient's compensation." }
    ],

    mechanical: "Each beat ejects less because filling time falls; output is propped up by rate until shortened diastole becomes the limiting factor.",
    perfusionNote: "The left coronary circulation fills mainly during diastole, so a fast rate shortens supply time just as myocardial oxygen demand is rising.",
    complications: [
      "Ischemia as demand rises and coronary filling time falls",
      "Hypotension once stroke volume can no longer keep up",
      "A missed underlying cause such as bleeding, sepsis, or hypoxemia",
      "Palpitations and poor activity tolerance"
    ],
    nursing: {
      assess: [
        "Verify the patient and the tracing before reacting to a number",
        "Pulse, blood pressure, respirations, oxygen saturation, temperature",
        "Look for bleeding, pain, fever, dehydration, anxiety, or withdrawal",
        "Ask about chest pain, dyspnea, palpitations, and lightheadedness"
      ],
      act: [
        "Address the driver within orders: comfort, fluids, oxygen, warmth",
        "Continue monitoring and obtain a 12-lead ECG per protocol",
        "Recheck vital signs and document the response to each intervention"
      ],
      escalate: "Escalate for a rate that stays high with hypotension, chest pain, confusion, or suspected bleeding or sepsis."
    },
    limits: [
      "The strip cannot tell you why the rate is fast; the cause is found on assessment, not on the monitor.",
      "At very fast rates buried P waves make sinus tachycardia hard to separate from other narrow-complex tachycardias.",
      "A single lead cannot localize ischemia even when ST-segment changes appear on it."
    ],
    sourceIds: ["src-klabunde", "src-goldberger", "src-lewis"],
    compare: ["svt", "aflutter", "af"]
  },

  "pac": {
    id: "pac",
    label: "Premature atrial complex",
    short: "PAC",
    family: "ectopy",
    level: "basic",
    evidence: "D",

    headline: "An early beat from atrial tissue outside the sinus node — narrow, with an odd P.",

    features: {
      rate:       "Set by the underlying rhythm; PACs arrive early on top of it.",
      regularity: "Regular except where the early beat falls.",
      pWaves:     "The early P differs in shape from the sinus Ps and may hide in the prior T.",
      prInterval: "May be longer or shorter than the sinus PR — the impulse started elsewhere.",
      qrs:        "Usually narrow like the sinus beats; a very early PAC may conduct oddly or not at all."
    },

    chain: [
      { id: "pac-1", layer: "trigger", label: "An irritable atrial focus",
        text: "Atrial stretch, caffeine, nicotine, alcohol, hypoxemia, or electrolyte shifts let a non-sinus atrial cell reach threshold before the SA node does." },
      { id: "pac-2", layer: "cellular", label: "The early cell wins the race",
        text: "Because that cell depolarizes first, its impulse captures the atria and resets the sinus node before it ever fires — so the beat lands early." },
      { id: "pac-3", layer: "conduction", label: "Wrong starting point, right path",
        text: "The impulse crosses the atria from an abnormal direction, then usually drops into the AV node and down the His-Purkinje system just like a sinus beat." },
      { id: "pac-4", layer: "ecg", label: "Odd P, ordinary QRS",
        text: "That abnormal spread writes a P of different shape or direction; since ventricular activation is unchanged, the QRS stays narrow and matches the rest." },
      { id: "pac-5", layer: "ecg", label: "Noncompensatory pause",
        text: "Having reset the sinus node, the PAC makes the next sinus beat start a fresh cycle early, so the pause is shorter than two normal R-R intervals." },
      { id: "pac-6", layer: "mechanical", label: "A beat that arrives underfilled",
        text: "Coming early, the ventricle has had less filling time, so that beat ejects a smaller stroke volume and its pulse can feel weaker at the wrist." },
      { id: "pac-7", layer: "clinical", label: "Usually benign, sometimes a warning",
        text: "Isolated PACs are common in healthy people; frequent ones may precede atrial fibrillation or may just reflect stimulants, hypoxemia, or low K+." }
    ],

    mechanical: "The early beat fills less and ejects less, so a radial count can come out below the monitor rate — a pulse deficit — when PACs are frequent.",
    perfusionNote: "Occasional PACs barely change output; frequent early beats shorten average filling time and can lower effective output in a marginal patient.",
    complications: [
      "Frequent PACs may precede atrial fibrillation or flutter",
      "Palpitations and anxiety about skipped beats",
      "Pulse deficit when early beats are frequent"
    ],
    nursing: {
      assess: [
        "Look at the patient and the pulse before labeling the strip",
        "Count apical and radial rates and note any deficit",
        "Ask about caffeine, nicotine, alcohol, stimulants, stress, and sleep",
        "Note how often the early beats occur and any symptoms"
      ],
      act: [
        "Document the underlying rhythm and the frequency of PACs",
        "Review ordered electrolyte and oxygenation data with the team",
        "Teach reduction of caffeine, nicotine, and stimulants as indicated"
      ],
      escalate: "Report a rising burden of early beats, a newly irregular rhythm, or PACs with chest pain or syncope."
    },
    limits: [
      "The strip cannot tell you where the atrial focus sits or why that cell fired early.",
      "A P wave hidden inside a T wave can make a PAC look like a pause or a junctional beat.",
      "PAC frequency on one strip does not establish an individual patient's risk of atrial fibrillation."
    ],
    sourceIds: ["src-goldberger", "src-surawicz", "src-lewis"],
    compare: ["pvc", "af", "nsr"]
  },

  "pvc": {
    id: "pvc",
    label: "Premature ventricular complex",
    short: "PVC",
    family: "ectopy",
    level: "basic",
    evidence: "D",

    headline: "An early beat born in the ventricle — wide, bizarre, with no P wave in front.",

    features: {
      rate:       "Set by the underlying rhythm; PVCs interrupt it early.",
      regularity: "Irregular where the PVC falls; patterns include bigeminy and couplets.",
      pWaves:     "No P precedes the PVC; a sinus P may be buried inside the wide complex.",
      prInterval: "Not measurable for this beat — it did not come from the atria.",
      qrs:        "Wide, 0.12 s or more, bizarre, with the T wave pointing opposite the QRS."
    },

    chain: [
      { id: "pvc-1", layer: "trigger", label: "An irritable ventricular focus",
        text: "Ischemia, ventricular stretch, catecholamines, hypoxemia, or low K+ or Mg2+ can push a ventricular cell to fire before the next sinus impulse arrives." },
      { id: "pvc-2", layer: "cellular", label: "Firing below the gatekeeper",
        text: "That focus sits below the AV node, so no atrial impulse launches this beat and none precedes it; a sinus P on time may hide in the wide complex." },
      { id: "pvc-3", layer: "conduction", label: "Muscle to muscle, not Purkinje first",
        text: "The beat starts in working myocardium and creeps cell to cell instead of racing down His-Purkinje, so activating both ventricles takes far longer." },
      { id: "pvc-4", layer: "ecg", label: "Wide QRS with a discordant T",
        text: "Slow sequential activation widens the QRS to 0.12 s or more, and repolarization follows that same abnormal sequence, so the T points opposite the QRS." },
      { id: "pvc-5", layer: "ecg", label: "Full compensatory pause",
        text: "The sinus node usually keeps its own timing undisturbed, so the intervals on either side of a PVC add up to about two normal R-R cycles." },
      { id: "pvc-6", layer: "mechanical", label: "A complex you may not feel",
        text: "Underfilled and contracting from the wrong place, that beat may eject too little to open the aortic valve — a complex on the monitor, no pulse." },
      { id: "pvc-7", layer: "clinical", label: "Count what matters, find the cause",
        text: "Compare apical with radial rate to size the pulse deficit, look for ischemia, hypoxemia, or low K+ or Mg2+, and watch for runs of consecutive PVCs." }
    ],

    mechanical: "The early, uncoordinated contraction ejects less blood, so frequent PVCs or bigeminy can drop effective cardiac output well below the displayed rate.",
    perfusionNote: "Every non-perfusing beat is a lost stroke volume; a patient in bigeminy may be perfusing at roughly half the rate shown on the monitor.",
    complications: [
      "Pulse deficit with falling effective cardiac output",
      "Runs of three or more in a row are ventricular tachycardia",
      "May signal ischemia, hypoxemia, or low potassium or magnesium",
      "Palpitations and a sensation of skipped or thudding beats"
    ],
    nursing: {
      assess: [
        "Look at the patient first: responsive, perfusing, symptomatic?",
        "Compare apical and radial rates to identify a pulse deficit",
        "Blood pressure, oxygen saturation, mentation, chest pain",
        "Note frequency, whether the complexes look alike, and any runs"
      ],
      act: [
        "Maintain continuous monitoring with alarms set to catch runs",
        "Obtain a 12-lead ECG and ordered electrolyte studies",
        "Support oxygenation and confirm working IV access per protocol",
        "Document PVC frequency, pattern, and how the patient tolerates them"
      ],
      escalate: "Escalate now for runs of PVCs, PVCs with chest pain or hypotension, or any loss of pulse or responsiveness."
    },
    limits: [
      "One monitoring lead cannot localize the ectopic focus or prove that ischemia caused it.",
      "The strip never proves a beat produced a pulse; only palpation and perfusion assessment can.",
      "A PVC count from a short strip does not establish an individual patient's arrhythmia risk."
    ],
    sourceIds: ["src-goldberger", "src-surawicz", "src-lewis"],
    compare: ["pac", "vt", "nsr"]
  }

});

Object.assign(CARDIAC.content.mechanisms, {

  "nsr-1": {
    detail: "Sinoatrial cells have no stable resting potential. After each beat they leak positive charge inward — the funny current carried largely by Na+, then Ca2+ through slow calcium channels — so the membrane drifts upward on its own. This spontaneous phase 4 drift is automaticity. The SA node drifts fastest, which is the whole reason it, and not the AV junction, sets the rate.",
    figure: null
  },

  "nsr-3": {
    detail: "AV nodal cells depolarize using slow Ca2+ current rather than fast Na+ current, so conduction crawls through the node. That delay is protective and useful: it holds the ventricles still long enough for atrial contraction to finish loading them, and it limits how many atrial impulses can ever reach the ventricles — the property that protects the patient in atrial fibrillation and flutter.",
    figure: null
  },

  "nsr-5": {
    detail: "The His bundle, bundle branches, and Purkinje fibers conduct several times faster than working myocardium, so they deliver the impulse to many points in both ventricles at nearly the same instant. Depolarization therefore finishes quickly and the QRS stays under 0.12 s. Whenever a beat bypasses this network — a PVC, an escape beat, a bundle branch block — the QRS widens.",
    figure: null
  },

  "nsr-7": {
    detail: "The ECG records the sum of cardiac electrical activity at the skin. It cannot record force, flow, pressure, or perfusion. Electrical activity with no effective mechanical response is exactly what pulseless electrical activity means, which is why every rhythm assessment starts at the patient: verify the patient and the signal, palpate a pulse, judge perfusion, then name the rhythm.",
    figure: null
  },

  "sinus-brady-2": {
    detail: "Vagal acetylcholine binds muscarinic receptors on SA nodal cells, opening K+ channels and reducing the inward pacemaker current. More K+ leaving means a more negative starting point; less inward current means a shallower drift. Both changes lengthen the time to threshold, so the interval between beats grows. Sleep, vomiting, straining, suctioning, and carotid pressure all raise vagal tone.",
    figure: null
  },

  "sinus-brady-5": {
    detail: "The Frank-Starling relationship: the more the ventricle is filled during diastole, the more its fibers are stretched, and the more forcefully it contracts on the next beat. A slow rate lengthens diastole, raises end-diastolic volume, and so raises stroke volume. This is why many people tolerate a resting rate in the 50s with a normal blood pressure and no symptoms at all.",
    figure: null
  },

  "sinus-brady-6": {
    detail: "Cardiac output equals stroke volume times heart rate. Slowing raises stroke volume only until the ventricle reaches the limit of useful filling; beyond that point the rate term keeps falling with nothing to offset it, and output falls with it. Clinically that shows up as low blood pressure, cool and clammy skin, dizziness, confusion, chest pain, or reduced urine output.",
    figure: null
  },

  "sinus-tachy-4": {
    detail: "Systole is relatively protected as rate climbs; diastole is what gets sacrificed. On the strip, watch the T-P segment — the electrically quiet stretch between the end of the T wave and the next P — narrow first. As it disappears, P waves ride up onto the preceding T, which is why fast sinus rhythm can be mistaken for a supraventricular tachycardia with no visible P waves.",
    figure: null
  },

  "sinus-tachy-6": {
    detail: "Cardiac output rises with rate only while the loss in stroke volume stays smaller than the gain in beats per minute. Once diastole is too short to fill the ventricle, each beat delivers so little that output plateaus and then declines. The same shortened diastole cuts coronary filling time while a faster, harder-working myocardium demands more oxygen — the setup for demand ischemia.",
    figure: null
  },

  "sinus-tachy-7": {
    detail: "Sinus tachycardia is almost always a response, not the primary problem. The nursing move is to look for what the heart is compensating for: bleeding, dehydration, fever, sepsis, pain, anxiety, hypoxemia, pulmonary embolism, alcohol or drug withdrawal, or a stimulant. Report the rate together with the assessment findings that suggest the driver, and reassess after each intervention.",
    figure: null
  },

  "pac-4": {
    detail: "P wave shape is a map of the direction atrial depolarization travels. A sinus impulse starts high in the right atrium and sweeps down and left, which writes an upright P in lead II. An ectopic focus starts elsewhere, so the wave travels differently and writes a P of different shape — flattened, notched, biphasic, or inverted. The QRS is unchanged because the ventricular route is unchanged.",
    figure: null
  },

  "pac-5": {
    detail: "The premature atrial impulse usually reaches the sinus node and discharges it, wiping out its timing. The node then restarts its drift from scratch, so the next sinus beat arrives about one full cycle after the PAC rather than staying on the original schedule. The result is a pause shorter than two normal R-R intervals — noncompensatory, unlike the full compensatory pause after a PVC.",
    figure: null
  },

  "pvc-3": {
    detail: "Working myocardium conducts far more slowly than specialized conduction tissue. An impulse arising in the ventricular wall must therefore propagate muscle cell to muscle cell across the ventricle rather than being distributed all at once by Purkinje fibers. Total activation time lengthens, and every ECG lead records that prolonged, abnormally directed wavefront as a wide, oddly shaped QRS.",
    figure: null
  },

  "pvc-4": {
    detail: "Repolarization normally recovers in roughly the reverse order of depolarization, which keeps the T wave pointing the same way as the QRS. When a beat depolarizes along an abnormal path, recovery follows that same sequence and the T wave flips to the opposite direction. This discordance is expected in any wide beat — PVC, paced, or bundle branch block — and is not by itself evidence of ischemia.",
    figure: null
  },

  "pvc-5": {
    detail: "A PVC usually does not travel backward through the AV node far enough to reset the sinus node, so the node keeps ticking on schedule. The next sinus impulse often arrives while the ventricle is still refractory and is not conducted; the following one is. The interval spanning the PVC therefore equals about two normal R-R cycles — a full compensatory pause, unlike the shorter pause after a PAC.",
    figure: null
  },

  "pvc-6": {
    detail: "Two problems stack: the beat comes early, so end-diastolic volume is low, and it starts outside the conduction system, so the ventricle contracts in an uncoordinated sequence rather than as a unit. Ejection may not generate enough pressure to open the aortic valve, and no blood leaves. The monitor still draws a complex. Only palpation tells you whether that complex produced a pulse.",
    figure: null
  }

});
