/* 21b-rhythms-atrial.js — atrial tachyarrhythmia rhythm records (atrial fibrillation,
   atrial flutter, supraventricular tachycardia) plus mechanism deep-dives for their chain links. */

Object.assign(CARDIAC.content.rhythms, {

  "af": {
    id: "af",
    label: "Atrial fibrillation",
    short: "A-fib",
    family: "atrial-tachyarrhythmia",
    level: "basic",
    evidence: "D",

    headline: "Irregularly irregular narrow-complex rhythm with no P waves — only fibrillatory baseline.",

    features: {
      rate: "Atrial activity is chaotic and uncountable; ventricular rate ranges from slow to fast.",
      regularity: "Irregularly irregular — no repeating pattern in the R-R intervals at all.",
      pWaves: "None discernible; the baseline shows fine or coarse fibrillatory waves instead.",
      prInterval: "Not measurable — there is no organized P wave to measure from.",
      qrs: "Narrow (under 0.12 s) unless a bundle branch block is also present."
    },

    chain: [
      { id: "af-1", layer: "trigger", label: "Stretched, irritable atrial tissue",
        text: "Stretched, fibrosed, or irritated atrial muscle fires rapidly from many sites at once instead of waiting for one sinus impulse." },
      { id: "af-2", layer: "cellular", label: "Multiple reentrant wavelets",
        text: "Wavefronts reenter tissue that has just recovered, so many wavelets circle at once and the atria never depolarize as one unit." },
      { id: "af-3", layer: "conduction", label: "The AV node is bombarded",
        text: "Hundreds of impulses a minute hit the AV node; it slows the harder it is driven and blocks most; partial penetrations leave it randomly refractory." },
      { id: "af-4", layer: "ecg", label: "No P waves, irregular R-R",
        text: "So the strip shows no P waves, a wavering fibrillatory baseline, and narrow QRS at irregularly irregular intervals — no repeating R-R pattern." },
      { id: "af-5", layer: "mechanical", label: "Lost atrial kick, variable filling",
        text: "Without a coordinated atrial contraction the ventricle loses its end-diastolic top-off, and every irregular cycle allows a different filling time." },
      { id: "af-6", layer: "mechanical", label: "Variable stroke volume, pulse deficit",
        text: "Beats after a short filling time eject too little to raise a palpable radial pulse, so the radial rate reads lower than the apical — a pulse deficit." },
      { id: "af-7", layer: "clinical", label: "Stasis and thromboembolic risk",
        text: "Blood pools in the quivering atrium — especially the left atrial appendage — and can clot over time, so stroke risk is assessed, never assumed." }
    ],

    mechanical: "Atrial kick is gone and filling time changes beat to beat, so stroke volume is inconsistent; output falls furthest when the rate is fast.",
    perfusionNote: "Perfusion depends on the patient, not the strip: check mentation, blood pressure, skin, and pulse quality rather than reading output off the ECG.",
    complications: [
      "Thromboembolic stroke risk that rises with time in fibrillation",
      "Rapid ventricular response with hypotension and chest discomfort",
      "Tachycardia-mediated heart failure if fast rates persist",
      "Symptomatic pauses or bradycardia when the rhythm converts"
    ],
    nursing: {
      assess: [
        "Look at the patient first: responsiveness, breathing, color, pulse",
        "Confirm lead contact and artifact before trusting an irregular tracing",
        "Take a blood pressure; compare apical and radial rates for one minute",
        "Ask about palpitations, dyspnea, chest pain, dizziness, and onset"
      ],
      act: [
        "Keep the patient on continuous monitoring with pulse oximetry",
        "Position for comfort; apply oxygen per protocol if hypoxemic",
        "Obtain a 12-lead ECG and anticipate ordered labs and imaging",
        "Support shared decision-making on stroke risk and anticoagulation"
      ],
      escalate: "Escalate now for a fast irregular rhythm with hypotension, chest pain, dyspnea, or altered mental status."
    },
    limits: [
      "This strip cannot tell you when the atrial fibrillation started, and onset timing shapes the treatment conversation.",
      "The ECG shows electrical activity only — it cannot show a clot, an atrial contraction, or the strength of a pulse.",
      "Fibrillatory wave size (fine versus coarse) does not grade severity and does not predict stroke risk.",
      "Antiplatelet therapy is not a routine substitute for anticoagulation; stroke-risk decisions belong to the care team and patient."
    ],
    sourceIds: ["src-af-guideline", "src-goldberger", "src-lewis"],
    compare: ["aflutter", "svt"]
  },

  "aflutter": {
    id: "aflutter",
    label: "Atrial flutter",
    short: "A-flutter",
    family: "atrial-tachyarrhythmia",
    level: "basic",
    evidence: "D",

    headline: "Organized sawtooth atrial waves at a rapid regular rate; the AV node filters conduction.",

    features: {
      rate: "Atrial rate is rapid and fixed, near 250-350/min; ventricular rate depends on the ratio.",
      regularity: "Regular when the conduction ratio is fixed; irregular when the ratio varies.",
      pWaves: "No true P waves — repeating sawtooth flutter waves, best seen in leads II, III, aVF.",
      prInterval: "Not measurable in the usual way; flutter waves march on independent of the QRS.",
      qrs: "Narrow (under 0.12 s) unless a bundle branch block is also present."
    },

    chain: [
      { id: "aflutter-1", layer: "trigger", label: "One macroreentrant circuit",
        text: "One wavefront circles a fixed anatomic loop in the atrium; the common pattern runs around the tricuspid valve through the cavotricuspid isthmus." },
      { id: "aflutter-2", layer: "cellular", label: "Same loop, same lap time",
        text: "Each lap meets tissue that has just recovered, so the wave is never extinguished and lap time barely varies — one constant, rapid atrial rate." },
      { id: "aflutter-3", layer: "ecg", label: "Sawtooth flutter waves",
        text: "Each lap writes the same atrial deflection and the next begins at once, so the baseline becomes a continuous sawtooth with no flat rest between waves." },
      { id: "aflutter-4", layer: "conduction", label: "AV node acts as a filter",
        text: "The AV node cannot recover fast enough to conduct every lap, so only a fraction gets through — conduction ratios such as 2:1, 3:1, or 4:1." },
      { id: "aflutter-5", layer: "ecg", label: "Ratio sets the ventricular rate",
        text: "A fixed ratio gives regular R-R at a set fraction of the atrial rate; a shifting ratio makes R-R irregular while the flutter waves stay regular." },
      { id: "aflutter-6", layer: "mechanical", label: "Atrial contraction adds little",
        text: "At flutter rates the atria never fully relax and refill, so their contraction contributes little to ventricular filling — atrial kick is largely lost." },
      { id: "aflutter-7", layer: "clinical", label: "Fast rates and stasis risk",
        text: "A 2:1 ratio can drive the ventricle fast enough to shorten filling and cut output, and poor atrial emptying carries thromboembolic risk over time." }
    ],

    mechanical: "Output depends on how fast the ventricle is driven: 4:1 is often well tolerated, while 2:1 can shorten diastole enough to lower stroke volume.",
    perfusionNote: "Two patients with the same atrial rate can look entirely different; the conduction ratio and the bedside assessment decide, not the sawtooth itself.",
    complications: [
      "Rapid ventricular response with hypotension and reduced output",
      "Thromboembolic stroke risk requiring the same risk assessment",
      "Degeneration into atrial fibrillation, or recurrence after conversion",
      "Tachycardia-mediated cardiomyopathy if fast rates persist"
    ],
    nursing: {
      assess: [
        "Assess the patient first: responsiveness, pulse, blood pressure, skin",
        "Confirm clean leads; artifact can imitate or hide flutter waves",
        "Count atrial and ventricular rates separately and note the ratio",
        "Ask about palpitations, dyspnea, chest pain, and symptom onset"
      ],
      act: [
        "Keep continuous monitoring and obtain a 12-lead ECG",
        "Watch for an abrupt change in ratio that changes the rate",
        "Position for comfort; apply oxygen per protocol if hypoxemic",
        "Support shared decision-making on stroke risk and anticoagulation"
      ],
      escalate: "Escalate for a ventricular rate near 150/min with hypotension, chest pain, dyspnea, or altered mental status."
    },
    limits: [
      "The cavotricuspid isthmus circuit is the representative pattern; a strip cannot prove which circuit is present.",
      "A single lead may bury flutter waves; the inferior leads of a 12-lead show them best.",
      "A regular narrow tachycardia near 150/min may be flutter with 2:1 conduction or another supraventricular tachycardia.",
      "The strip shows conduction, not contraction — it cannot show how much blood the atria actually move."
    ],
    sourceIds: ["src-goldberger", "src-af-guideline", "src-surawicz"],
    compare: ["af", "svt"]
  },

  "svt": {
    id: "svt",
    label: "Supraventricular tachycardia",
    short: "SVT",
    family: "atrial-tachyarrhythmia",
    level: "basic",
    evidence: "D",

    headline: "Regular narrow-complex tachycardia too fast to show a clear P wave before each QRS.",

    features: {
      rate: "Regular and fast, commonly 150-250/min in adults — faster than usual sinus tachycardia.",
      regularity: "Regular, with R-R intervals that stay strikingly constant beat to beat.",
      pWaves: "Often not visible; atrial activity may hide in the QRS or distort a nearby T wave.",
      prInterval: "Not measurable — no separate P wave can be found before the QRS to measure from.",
      qrs: "Narrow (under 0.12 s) in the usual case; a wide QRS raises other possibilities."
    },

    chain: [
      { id: "svt-1", layer: "trigger", label: "An early beat starts a loop",
        text: "An early beat blocks in one pathway, travels down a second, then returns up the first once it recovers — a self-sustaining loop above the ventricles." },
      { id: "svt-2", layer: "cellular", label: "The loop outruns the sinus node",
        text: "The circuit re-excites its own tissue faster than the sinus node can fire, so the loop — not the sinus node — now sets the heart rate." },
      { id: "svt-3", layer: "conduction", label: "Each lap reaches the ventricles",
        text: "Every lap conducts down the normal His-Purkinje system, so the ventricles are still activated by the usual fast, coordinated route." },
      { id: "svt-4", layer: "ecg", label: "Regular narrow complexes",
        text: "The QRS stays narrow (under 0.12 s) and each interval matches the last, because the same loop takes the same time on every lap." },
      { id: "svt-5", layer: "ecg", label: "P waves vanish into the QRS and T",
        text: "Atrial and ventricular activation happen almost together, so the P wave hides in the QRS or just after it, distorting a nearby T wave." },
      { id: "svt-6", layer: "mechanical", label: "Diastole is squeezed",
        text: "Speed steals time from diastole far more than from systole, so the ventricle has much less time to fill and stroke volume falls." },
      { id: "svt-7", layer: "clinical", label: "Supply falls as demand climbs",
        text: "Output can drop while myocardial oxygen demand rises, producing palpitations, dyspnea, chest discomfort, lightheadedness, or near-syncope." }
    ],

    mechanical: "Rapid regular firing shortens filling time, so stroke volume falls; a healthy heart may compensate while a stiff or failing one decompensates fast.",
    perfusionNote: "Rate alone does not predict how the patient looks — check mentation, blood pressure, skin, and pulse quality before judging whether this is tolerated.",
    complications: [
      "Hypotension and poor perfusion if the rate is sustained",
      "Chest pain from rising demand and shortened coronary filling",
      "Syncope or near-syncope from falling cardiac output",
      "Heart failure symptoms if the tachycardia continues for hours"
    ],
    nursing: {
      assess: [
        "Assess the patient first: responsiveness, pulse, blood pressure, skin",
        "Confirm the rate at the pulse and check the leads for artifact",
        "Ask about sudden onset, palpitations, chest pain, and dyspnea",
        "Reassess often; a tolerated rhythm can stop being tolerated"
      ],
      act: [
        "Stay with the patient, keep monitoring, and obtain a 12-lead ECG",
        "Position for comfort; apply oxygen per protocol if hypoxemic",
        "Ensure working IV access and a functioning monitor per protocol",
        "Notify the provider and anticipate vagal maneuvers per orders"
      ],
      escalate: "Escalate immediately for hypotension, altered mental status, chest pain, or acute dyspnea with this rhythm."
    },
    limits: [
      "A rhythm strip cannot name which reentrant circuit this is; call it a supraventricular tachycardia.",
      "Atrial flutter with 2:1 conduction can look identical on a single monitoring lead.",
      "The ECG cannot show blood pressure or perfusion; only assessing the patient can.",
      "Very fast sinus tachycardia from fever, pain, fear, or hypovolemia can mimic this."
    ],
    sourceIds: ["src-svt-guideline", "src-goldberger", "src-acls"],
    compare: ["aflutter", "sinus-tachy"]
  }

});

Object.assign(CARDIAC.content.mechanisms, {

  "af-2": {
    detail: "Stretch and fibrosis slow conduction in patches of atrial muscle while shortening the refractory period elsewhere. A wavefront that meets already-recovered tissue reenters it, and the atrium can hold several of these circulating wavelets at once. Because each wavelet is small and independent, their vectors cancel instead of summing — so nothing resembling a single P wave ever reaches the surface.",
    figure: null
  },

  "af-3": {
    detail: "Decremental conduction means the AV node conducts more slowly the more often it is stimulated, so it works as a rate-limiting gate. Concealed conduction adds the randomness: impulses that enter the node but die before reaching the ventricle still leave it refractory. The next impulse therefore meets a gate that is open, partly open, or shut, and R-R intervals vary with no pattern.",
    figure: null
  },

  "af-4": {
    detail: "Fibrillatory waves range from fine, nearly flat undulation to coarse deflections that can be mistaken for flutter waves. That description carries no prognosis: wave size does not grade severity, duration, or stroke risk. What identifies atrial fibrillation is the absence of any repeating atrial pattern together with an irregularly irregular ventricular response.",
    figure: null
  },

  "af-5": {
    detail: "Atrial kick is the last portion of ventricular filling delivered by atrial systole — conventionally taught as roughly 20-30% of end-diastolic volume, and worth most when the ventricle is stiff or the rate is fast. In atrial fibrillation that contribution is gone, and because every R-R interval differs, passive filling time differs too, so stroke volume changes beat to beat.",
    figure: null
  },

  "af-6": {
    detail: "Palpate the radial pulse while a second nurse auscultates the apex for a full minute. A beat that follows a very short diastole ejects a stroke volume too small to produce a palpable peripheral pulse, yet it still generates a QRS on the monitor. The apical rate therefore exceeds the radial rate, and that difference — the pulse deficit — is hemodynamic information the ECG cannot supply.",
    figure: null
  },

  "af-7": {
    detail: "Blood moves sluggishly in an atrium that quivers rather than contracts, and the left atrial appendage is the usual site of stasis. Risk accumulates over time; a few irregular beats do not guarantee a clot. Stroke risk is estimated with a validated risk score, weighed against bleeding risk, and decided with the patient. Antiplatelet therapy is not a routine substitute for anticoagulation.",
    figure: null
  },

  "aflutter-1": {
    detail: "Macroreentry means one wavefront circling a single large anatomic loop rather than many small wavelets. The representative circuit travels around the tricuspid annulus and through the cavotricuspid isthmus, the strip of tissue between the tricuspid valve and the inferior vena cava. Other flutter circuits exist, and a rhythm strip cannot prove which one a given patient has.",
    figure: null
  },

  "aflutter-3": {
    detail: "Every lap of the circuit writes an identical atrial deflection, and the next lap starts as the last ends, so there is no isoelectric rest between waves — hence a continuous sawtooth rather than discrete P waves. In the common circuit the wavefront moves away from the inferior leads, so II, III, and aVF display the pattern best; V1 may instead show separate upright waves.",
    figure: null
  },

  "aflutter-4": {
    detail: "The AV node's refractory period is longer than the flutter cycle length, so it physically cannot conduct every atrial impulse. Impulses that arrive once it has recovered get through, producing ratios such as 2:1, 3:1, or 4:1. The ratio describes filtering, not a separate diagnosis, and it can shift abruptly with autonomic tone, illness, or medication.",
    figure: null
  },

  "aflutter-5": {
    detail: "With a fixed ratio the ventricular rate is the atrial rate divided by that ratio, so 2:1 from an atrial rate near 300/min gives roughly 150/min. When the ratio alternates, R-R intervals vary and the pulse feels irregular — yet the flutter waves keep marching at a constant rate. That preserved atrial regularity is the discriminator from atrial fibrillation.",
    figure: null
  },

  "svt-5": {
    detail: "In common forms of reentry the atria and ventricles are activated almost simultaneously, so the retrograde atrial deflection is buried in the QRS or falls just after it — showing only as a small extra notch at the end of the QRS or a subtle change in the ST-T. That is why hunting for a separate P wave fails here. Comparing it with the patient's own baseline ECG after the rate slows can reveal it.",
    figure: null
  },

  "svt-6": {
    detail: "As rate climbs, diastole absorbs nearly all of the lost time; systole shortens only modestly. A shorter filling interval means a smaller end-diastolic volume, and by the Frank-Starling relationship a smaller stroke volume. Left ventricular coronary perfusion also occurs mainly during diastole, so supply falls at the same moment that a fast, forceful rhythm raises demand.",
    figure: null
  }

});
