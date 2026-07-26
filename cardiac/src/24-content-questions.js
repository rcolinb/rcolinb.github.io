/* 24-content-questions.js — CARDIAC.content.questions
   30 NCLEX-style items for NR324 Adult Health I (prelicensure BSN).
   Blueprint: domains cycle 4, sinus-ectopy 4, atrial 5, av-block 5, arrest 4,
   hemodynamics 4, electrolyte 4. Clinical-judgment process: 5 each of
   recognize-cues, analyze-cues, prioritize-hypotheses, generate-solutions,
   take-action, evaluate-outcomes. Level: 18 basic / 12 advanced.
   No dosing, no prescribing, no patient-specific diagnosis. Patient-first ordering. */

CARDIAC.content.questions = CARDIAC.content.questions || [];

[

/* ---------------------------------------------------------------- CYCLE (4) */

{
  id: "q-01",
  domain: "cycle",
  family: "sinus",
  process: "recognize-cues",
  level: "basic",
  stem: "A nurse reviews a lead II rhythm strip on a stable adult. Which waveform on the strip represents depolarization spreading through the ventricular myocardium?",
  options: [
    { id: "A", text: "The P wave, the small rounded deflection that opens each cardiac cycle" },
    { id: "B", text: "The QRS complex, the tall narrow deflection that follows the P wave" },
    { id: "C", text: "The T wave, the broad rounded deflection that follows the QRS complex" },
    { id: "D", text: "The PR segment, the flat line lying between the P wave and the QRS" }
  ],
  correct: "B",
  rationale: "The QRS records ventricular depolarization; its narrow width means the impulse traveled the His-Purkinje system, so both ventricles activate nearly together. The T wave tempts students because it sits closest to ejection, but it records ventricular repolarization — recovery, not activation. The electrocardiogram shows electrical events only; contraction is judged by pulse and perfusion.",
  setup: { rhythm: "nsr", condition: "normal", lead: "II" },
  sourceIds: ["src-goldberger", "src-aha-std"]
},

{
  id: "q-02",
  domain: "cycle",
  family: "sinus",
  process: "analyze-cues",
  level: "basic",
  stem: "On a lead II strip the PR interval measures within the conventional range of 0.12 to 0.20 seconds and is identical in every cycle. What does this finding tell the nurse about conduction?",
  options: [
    { id: "A", text: "The ventricles are contracting forcefully enough to generate an adequate stroke volume" },
    { id: "B", text: "The sinus node is firing faster than the atrioventricular node is able to conduct" },
    { id: "C", text: "Atrial depolarization and the atrioventricular nodal delay are completing within the expected time" },
    { id: "D", text: "Ventricular repolarization is finishing evenly across the thickness of the ventricular wall" }
  ],
  correct: "C",
  rationale: "The PR interval spans atrial depolarization plus the deliberate atrioventricular nodal delay that lets atrial contraction top off ventricular filling, so a stable interval says that path is intact. Option A is tempting because filling feels mechanical, but the tracing records voltage only; contraction is judged by pulse, blood pressure, and perfusion.",
  setup: { rhythm: "nsr", condition: "normal", lead: "II" },
  sourceIds: ["src-goldberger", "src-klabunde"]
},

{
  id: "q-03",
  domain: "cycle",
  family: "sinus",
  process: "prioritize-hypotheses",
  level: "basic",
  stem: "A monitored adult is talking comfortably. The bedside monitor suddenly shows a wandering fuzzy baseline that obscures the small waveforms, while the tall deflections continue at the same rate and spacing. Which explanation should the nurse consider most likely first?",
  options: [
    { id: "A", text: "Motion and poor electrode contact are adding noise to the recorded signal" },
    { id: "B", text: "The atria have stopped depolarizing and an escape focus has taken over" },
    { id: "C", text: "The ventricular conduction system has developed a new bundle branch delay" },
    { id: "D", text: "Serum potassium has risen far enough to erase the atrial waveforms" }
  ],
  correct: "A",
  rationale: "A comfortable, talking patient with an unchanged rate and unchanged complex spacing points to a signal problem rather than a rhythm change; motion and loose electrodes distort the baseline. Option B tempts because missing P waves suggest atrial arrest, but a true rhythm change would alter rate or regularity, and no waveform establishes a potassium value.",
  setup: { rhythm: "nsr", condition: "normal", lead: "II" },
  sourceIds: ["src-aha-std", "src-swets"]
},

{
  id: "q-04",
  domain: "cycle",
  family: null,
  process: "generate-solutions",
  level: "basic",
  stem: "The nurse cannot interpret a monitor tracing because the baseline drifts and the complexes vary in size from beat to beat. Which plan should the nurse carry out to obtain an interpretable tracing?",
  options: [
    { id: "A", text: "Widen the monitor rate alarm limits and document that the tracing is unreadable" },
    { id: "B", text: "Ask the patient to hold a deep breath while the tracing is printed at double speed" },
    { id: "C", text: "Move the limb electrodes onto the chest wall so that the complexes look taller" },
    { id: "D", text: "Prepare the skin, replace dried electrodes, and secure the lead wires, then repeat" }
  ],
  correct: "D",
  rationale: "Skin preparation, fresh electrodes, and secured wires correct the usual causes of baseline drift and varying amplitude, restoring a signal worth reading. Option C is tempting because larger complexes look clearer, but relocating electrodes changes what the lead views, which invalidates comparison with earlier tracings and can create findings that were never there.",
  setup: null,
  sourceIds: ["src-aha-std", "src-lewis"]
},

/* -------------------------------------------------------- SINUS-ECTOPY (4) */

{
  id: "q-05",
  domain: "sinus-ectopy",
  family: "sinus",
  process: "recognize-cues",
  level: "basic",
  stem: "An adult resting comfortably has a regular rhythm at 48 beats per minute with an upright P wave before every narrow QRS complex and a constant PR interval. How should the nurse describe this rhythm?",
  options: [
    { id: "A", text: "Junctional rhythm, because a slow rate reflects an escape focus below the atria" },
    { id: "B", text: "Sinus bradycardia, because the sinus node is pacing and the rate is under 60" },
    { id: "C", text: "Second-degree block, because a slow rate reflects intermittent failure to conduct" },
    { id: "D", text: "Atrial fibrillation, because a slow rate reflects disorganized atrial depolarization" }
  ],
  correct: "B",
  rationale: "An upright P wave before every narrow QRS with a constant PR interval means the sinus node is pacing and every impulse conducts; the only abnormal feature is rate. Junctional rhythm tempts because it is also slow, but it arises below the atria and produces P waves that are inverted in lead II, hidden in the QRS, or absent rather than upright.",
  setup: { rhythm: "sinus-brady", condition: "normal", lead: "II" },
  sourceIds: ["src-goldberger", "src-lewis"]
},

{
  id: "q-06",
  domain: "sinus-ectopy",
  family: "sinus",
  process: "take-action",
  level: "basic",
  stem: "A monitored adult with sinus bradycardia at 42 beats per minute suddenly reports dizziness and appears pale. Which action should the nurse take first?",
  options: [
    { id: "A", text: "Print a rhythm strip and measure the PR interval and the QRS duration" },
    { id: "B", text: "Document the rate change and recheck the monitor in fifteen minutes" },
    { id: "C", text: "Raise the low rate alarm limit so the monitor stops sounding an alarm" },
    { id: "D", text: "Assess the pulse, blood pressure, and level of consciousness at the bedside" }
  ],
  correct: "D",
  rationale: "New symptoms with a slow rate raise the question of whether output is adequate, and only bedside pulse, pressure, and mentation answer it — that judgment drives escalation. Measuring intervals is tempting because it feels like rhythm analysis, but characterizing the strip comes after the patient and the perfusion have been assessed.",
  setup: { rhythm: "sinus-brady", condition: "normal", lead: "II" },
  sourceIds: ["src-brady-guideline", "src-lewis", "src-ncsbn"]
},

{
  id: "q-07",
  domain: "sinus-ectopy",
  family: "ectopy",
  process: "generate-solutions",
  level: "basic",
  stem: "A telemetry patient has occasional wide early complexes that are not preceded by P waves and are followed by a pause. The patient is asymptomatic and comfortable. Which monitoring plan should the nurse implement?",
  options: [
    { id: "A", text: "Track how often the early beats occur, whether they cluster, and how they are tolerated" },
    { id: "B", text: "Silence the ectopy alarm and reassess the rhythm at the end of the nursing shift" },
    { id: "C", text: "Count only the early beats and report the rhythm as a ventricular tachycardia" },
    { id: "D", text: "Record the early beats and hold all patient activity until the rhythm normalizes" }
  ],
  correct: "A",
  rationale: "Isolated premature ventricular complexes matter mainly by frequency, pattern, and tolerance, so trending those three yields data worth reporting and a baseline for detecting change. Option D is tempting because ectopy sounds dangerous, but immobilizing an asymptomatic patient adds deconditioning and anxiety without altering the ectopy itself.",
  setup: { rhythm: "pvc", condition: "normal", lead: "II" },
  sourceIds: ["src-lewis", "src-goldberger"]
},

{
  id: "q-08",
  domain: "sinus-ectopy",
  family: "ectopy",
  process: "evaluate-outcomes",
  level: "advanced",
  stem: "A patient with frequent premature ventricular complexes has been treated for a correctable trigger and has rested for an hour. Which finding best indicates that the situation has improved?",
  options: [
    { id: "A", text: "The monitor counts fewer total beats per minute than it counted an hour ago" },
    { id: "B", text: "The early complexes have narrowed while occurring at the same frequency as before" },
    { id: "C", text: "The early complexes are less frequent and the pulse is regular and perfusing well" },
    { id: "D", text: "The patient reports the palpitations feel stronger and now occur in longer runs" }
  ],
  correct: "C",
  rationale: "Improvement means fewer ectopic beats plus evidence the pump is keeping up, which requires a bedside pulse and perfusion check rather than a monitor readout. Option A tempts because a lower total rate looks calmer, but a falling rate can signal a new conduction problem and says nothing about ectopy or about perfusion.",
  setup: { rhythm: "pvc", condition: "normal", lead: "II" },
  sourceIds: ["src-lewis", "src-klabunde"]
},

{
  id: "q-09",
  domain: "atrial",
  family: "atrial-tachyarrhythmia",
  process: "recognize-cues",
  level: "basic",
  stem: "On a lead II strip the R-to-R intervals vary with no repeating pattern, no P waves are discernible, the baseline is fine and undulating, and the QRS complexes are narrow. Which rhythm do these features describe?",
  options: [
    { id: "A", text: "Atrial flutter, with organized atrial activity conducted at a fixed ratio to the ventricles" },
    { id: "B", text: "Sinus tachycardia, with a rate rapid enough that the P waves are hidden in the T waves" },
    { id: "C", text: "Ventricular tachycardia, with a rapid ventricular focus producing wide irregular complexes" },
    { id: "D", text: "Atrial fibrillation, with disorganized atrial activity conducted irregularly to the ventricles" }
  ],
  correct: "D",
  rationale: "An irregularly irregular ventricular response with no discernible P waves and narrow QRS complexes is the fingerprint of fibrillatory atrial activity filtered unpredictably by the atrioventricular node. Flutter tempts because it also hides ordinary P waves, but flutter produces uniform sawtooth waves and usually a regular ventricular response at a fixed conduction ratio.",
  setup: { rhythm: "af", condition: "normal", lead: "II" },
  sourceIds: ["src-af-guideline", "src-goldberger"]
},

{
  id: "q-10",
  domain: "atrial",
  family: "atrial-tachyarrhythmia",
  process: "analyze-cues",
  level: "advanced",
  stem: "A 12-lead tracing shows uniform sawtooth atrial waves, seen best in the inferior leads, occurring about four times for every narrow QRS complex, with regular R-to-R intervals. What does this pattern indicate about conduction?",
  options: [
    { id: "A", text: "Many atrial sites fire chaotically, so the ventricles respond at unpredictable intervals" },
    { id: "B", text: "One organized atrial circuit is repeatedly filtered at the AV node, so every fourth impulse conducts" },
    { id: "C", text: "The sinus node is firing at four times its usual rate and each impulse reaches the ventricles" },
    { id: "D", text: "An ectopic ventricular focus is pacing the heart and the atrial waves are retrograde echoes" }
  ],
  correct: "B",
  rationale: "Uniform sawtooth waves mean a single reentrant atrial circuit; the refractory period of the atrioventricular node filters that fast rate, and a fixed filtering ratio produces regular R-to-R intervals. Option A tempts because both rhythms have very fast atrial rates, but chaotic multiple wavefronts give irregularly irregular ventricular timing and no uniform wave shape.",
  setup: { rhythm: "aflutter", condition: "normal", lead: "II" },
  sourceIds: ["src-goldberger", "src-svt-guideline", "src-aha-std"]
},

{
  id: "q-11",
  domain: "atrial",
  family: "atrial-tachyarrhythmia",
  process: "prioritize-hypotheses",
  level: "basic",
  stem: "An adult has been in atrial fibrillation for several days. Which complication should the nurse consider the greatest ongoing risk when planning ongoing assessment?",
  options: [
    { id: "A", text: "Permanent injury to the sinus node caused by the rapid atrial electrical activity" },
    { id: "B", text: "Widening of the QRS complex caused by delayed conduction through the bundle branches" },
    { id: "C", text: "Thrombus forming in the poorly emptied atrium and embolizing to the brain or an organ" },
    { id: "D", text: "Progressive shortening of the QT interval caused by the irregular ventricular response" }
  ],
  correct: "C",
  rationale: "Fibrillating atria never contract as a unit, so blood stagnates — especially in the left atrial appendage — and organized clot can embolize, most consequentially to the brain. Option A tempts because the atria are electrically overwhelmed, but the clinically decisive danger is stasis and embolism rather than destruction of the sinus node.",
  setup: { rhythm: "af", condition: "normal", lead: "II" },
  sourceIds: ["src-af-guideline", "src-lewis"]
},

{
  id: "q-12",
  domain: "atrial",
  family: "atrial-tachyarrhythmia",
  process: "generate-solutions",
  level: "advanced",
  stem: "A patient with atrial fibrillation and several stroke risk factors asks why the plan for stroke prevention is not simply a daily aspirin. Which explanation should the nurse give?",
  options: [
    { id: "A", text: "Anticoagulant therapy targets the clot pathway atrial stasis activates; antiplatelet therapy does not substitute" },
    { id: "B", text: "Aspirin provides the same protection but is reserved for patients who cannot take other medicines" },
    { id: "C", text: "The risk of bleeding outweighs the clot risk, so clot-directed therapy is deferred in this rhythm" },
    { id: "D", text: "Stroke prevention becomes unnecessary once the ventricular rate has been brought under reliable control" }
  ],
  correct: "A",
  rationale: "Stasis in the fibrillating atrium favors fibrin-rich clot, which anticoagulant therapy addresses; antiplatelet therapy acts on a different step and is not an equivalent substitute. Option B is tempting because aspirin is familiar and easy to obtain, but treating the two as interchangeable leaves the patient's embolic risk inadequately covered.",
  setup: { rhythm: "af", condition: "normal", lead: "II" },
  sourceIds: ["src-af-guideline", "src-lewis"]
},

{
  id: "q-13",
  domain: "atrial",
  family: "atrial-tachyarrhythmia",
  process: "take-action",
  level: "basic",
  stem: "The monitor shows a regular narrow-complex tachycardia near 180 beats per minute in an adult who reports palpitations and light-headedness. Which action should the nurse take first?",
  options: [
    { id: "A", text: "Print a long rhythm strip and measure the R-to-R intervals to confirm regularity" },
    { id: "B", text: "Check the pulse, blood pressure, and mental status while staying at the bedside" },
    { id: "C", text: "Ask the patient to walk to the chair to see whether the rate settles with activity" },
    { id: "D", text: "Reposition the chest electrodes to confirm the rate the monitor is displaying" }
  ],
  correct: "B",
  rationale: "The decision that changes care is whether this rate is being tolerated, and pulse, pressure, and mentation at the bedside answer it; stability determines urgency and the level of escalation. Measuring the strip is tempting because it names the rhythm, but a name does not establish whether the patient is perfusing.",
  setup: { rhythm: "svt", condition: "normal", lead: "II" },
  sourceIds: ["src-svt-guideline", "src-ncsbn", "src-lewis"]
},

/* ------------------------------------------------------------ AV-BLOCK (5) */

{
  id: "q-14",
  domain: "av-block",
  family: "av-conduction",
  process: "recognize-cues",
  level: "basic",
  stem: "A lead II strip shows a regular rate of 72, a P wave before every narrow QRS complex, and a PR interval of 0.26 seconds that is identical in every cycle. How should the nurse describe this finding?",
  options: [
    { id: "A", text: "First-degree AV block, in which every impulse conducts but each one takes longer than expected" },
    { id: "B", text: "Second-degree AV block, in which some impulses conduct and others are blocked entirely" },
    { id: "C", text: "Third-degree AV block, in which the atria and the ventricles depolarize independently" },
    { id: "D", text: "Sinus arrhythmia, in which conduction time varies with the phase of the respiratory cycle" }
  ],
  correct: "A",
  rationale: "A PR interval fixed above 0.20 seconds with a QRS after every P wave means conduction is delayed but never interrupted, which defines first-degree atrioventricular block. Second-degree tempts students because both involve nodal trouble, but second-degree requires at least one P wave that is not followed by a QRS complex.",
  setup: { rhythm: "avb1", condition: "normal", lead: "II" },
  sourceIds: ["src-brady-guideline", "src-goldberger"]
},

{
  id: "q-15",
  domain: "av-block",
  family: "av-conduction",
  process: "analyze-cues",
  level: "basic",
  stem: "Across four consecutive cycles on a lead II strip the PR interval lengthens progressively, then one P wave appears with no QRS complex after it, and the sequence repeats. What does this pattern indicate?",
  options: [
    { id: "A", text: "The bundle branches conduct at different speeds, widening every alternate QRS complex" },
    { id: "B", text: "The sinus node pauses intermittently, so one atrial impulse fails to be generated" },
    { id: "C", text: "The AV node fatigues progressively until one impulse fails, then recovers during the pause" },
    { id: "D", text: "The atria and ventricles are driven by two independent and completely unrelated pacemakers" }
  ],
  correct: "C",
  rationale: "Progressive PR lengthening before a dropped beat is decremental conduction in the atrioventricular node; the resulting pause lets the node recover, so the sequence restarts. Option B tempts because a beat is missing, but the P wave is present and on time — the atrium fired and the impulse simply failed to reach the ventricles.",
  setup: { rhythm: "mobitz1", condition: "normal", lead: "II" },
  sourceIds: ["src-brady-guideline", "src-goldberger"]
},

{
  id: "q-16",
  domain: "av-block",
  family: "av-conduction",
  process: "prioritize-hypotheses",
  level: "advanced",
  stem: "A monitored adult shows a constant PR interval on conducted beats, sudden loss of a QRS complex after an otherwise normal P wave with no preceding PR lengthening, and a QRS duration of 0.14 seconds. Which concern should the nurse treat as the priority?",
  options: [
    { id: "A", text: "Vagal tone is raising the degree of block, so the rhythm should settle once the patient relaxes" },
    { id: "B", text: "Block below the AV node can fail without warning, so a profoundly slow rhythm may appear abruptly" },
    { id: "C", text: "The dropped beats will shorten the QT interval, so repolarization will finish far too quickly" },
    { id: "D", text: "The atria will fatigue from the added work, so atrial fibrillation is likely to develop soon" }
  ],
  correct: "B",
  rationale: "A fixed PR interval with abruptly dropped beats and a wide QRS points to disease in the His-Purkinje system, which tends to fail all at once rather than gradually, so profound bradycardia can appear without warning. Option A tempts because vagally mediated block is common, but that pattern shows progressive PR lengthening instead.",
  setup: { rhythm: "mobitz2", condition: "normal", lead: "II" },
  sourceIds: ["src-brady-guideline", "src-goldberger", "src-surawicz"]
},

{
  id: "q-17",
  domain: "av-block",
  family: "av-conduction",
  process: "take-action",
  level: "basic",
  stem: "The monitor shows P waves and QRS complexes marching independently at different rates, with a ventricular rate near 32. The patient is newly confused and cool to the touch. Which action should the nurse take first?",
  options: [
    { id: "A", text: "Obtain a 12-lead tracing and measure the atrial and ventricular rates separately" },
    { id: "B", text: "Position the patient flat and recheck the monitor rate again in five minutes" },
    { id: "C", text: "Stay with the patient, check pulse and blood pressure, and call for immediate help" },
    { id: "D", text: "Change the monitor lead to find a view in which the P waves are easier to see" }
  ],
  correct: "C",
  rationale: "Confusion and cool skin with a very slow ventricular rate signal that perfusion is failing, so the nurse verifies pulse and pressure and summons help without leaving the bedside. Obtaining a 12-lead is tempting because it documents the block, but documentation does not help a patient whose organ perfusion is falling now.",
  setup: { rhythm: "avb3", condition: "normal", lead: "II" },
  sourceIds: ["src-brady-guideline", "src-acls", "src-ncsbn"]
},

{
  id: "q-18",
  domain: "av-block",
  family: "av-conduction",
  process: "evaluate-outcomes",
  level: "advanced",
  stem: "Transcutaneous pacing has been started for a patient in complete heart block. The monitor shows a pacing spike followed by a wide QRS complex at the rate that was selected. Which finding best indicates that pacing is producing effective circulation?",
  options: [
    { id: "A", text: "A palpable central pulse at the paced rate, with improving blood pressure and mentation" },
    { id: "B", text: "A pacing spike appearing before each wide QRS complex at the rate that was selected" },
    { id: "C", text: "The independent P waves disappearing from the tracing after pacing has been started" },
    { id: "D", text: "The paced QRS complexes narrowing toward the width seen before the block developed" }
  ],
  correct: "A",
  rationale: "Electrical capture on the monitor proves only that the ventricle depolarized; circulation requires mechanical capture, confirmed by a palpable central pulse at the paced rate plus improving pressure and mentation. Option B is tempting because it looks like success, but a captured complex can occur without an ejection that reaches the tissues.",
  setup: { rhythm: "avb3", condition: "normal", lead: "II" },
  sourceIds: ["src-acls", "src-brady-guideline", "src-klabunde"]
},

/* -------------------------------------------------------------- ARREST (4) */

{
  id: "q-19",
  domain: "arrest",
  family: "arrest",
  process: "recognize-cues",
  level: "basic",
  stem: "An adult is found unresponsive with no breathing and no pulse. Compressions are underway, and during a brief pause for a rhythm check the monitor shows chaotic undulations of varying height and width with no identifiable P waves, QRS complexes, or T waves. How should the nurse describe the rhythm?",
  options: [
    { id: "A", text: "Asystole, in which no electrical activity is being generated anywhere in the heart" },
    { id: "B", text: "Ventricular tachycardia, in which one ventricular focus fires rapidly and regularly" },
    { id: "C", text: "Ventricular fibrillation, in which ventricular muscle depolarizes chaotically with no organized beat" },
    { id: "D", text: "Coarse artifact, in which outside movement distorts an otherwise organized underlying rhythm" }
  ],
  correct: "C",
  rationale: "Continuous chaotic deflections with no identifiable complexes mean many simultaneous ventricular wavefronts rather than one organized activation. Artifact tempts because it also looks chaotic, but compressions were paused for this look and the patient is unresponsive and pulseless, so the tracing is believed; compressions resume and defibrillation readiness proceeds rather than the tracing being second-guessed.",
  setup: { rhythm: "vf", condition: "normal", lead: "II" },
  sourceIds: ["src-acls", "src-goldberger"]
},

{
  id: "q-20",
  domain: "arrest",
  family: "arrest",
  process: "prioritize-hypotheses",
  level: "basic",
  stem: "The central monitor shows a flat line for a patient who, when the nurse enters the room, is sitting up talking with a visitor and reports feeling fine. Which explanation should the nurse consider first?",
  options: [
    { id: "A", text: "The patient has entered asystole and the visitor has not yet noticed any change" },
    { id: "B", text: "A lead has detached, so the monitor is showing an absent signal rather than an absent rhythm" },
    { id: "C", text: "The patient has pulseless electrical activity, which the monitor displays as a flat line" },
    { id: "D", text: "The heart rate has fallen below the lowest rate that the monitor is able to display" }
  ],
  correct: "B",
  rationale: "A talking, comfortable patient is perfusing, so the flat tracing reflects a signal problem, most often a detached lead or dried electrode. Option C tempts because both involve a monitor-patient mismatch, but pulseless electrical activity is a clinical state — organized electrical activity with no pulse — not a waveform and not a flat line.",
  setup: { rhythm: "asystole", condition: "normal", lead: "II" },
  sourceIds: ["src-acls", "src-aha-std", "src-swets"]
},

{
  id: "q-21",
  domain: "arrest",
  family: "ventricular",
  process: "take-action",
  level: "basic",
  stem: "The monitor alarms and displays a wide-complex tachycardia near 190 beats per minute for a patient the nurse cannot see from the hallway. Which action should the nurse take first?",
  options: [
    { id: "A", text: "Print the tracing and measure the QRS width to confirm a ventricular origin" },
    { id: "B", text: "Review the chart for a history of ventricular arrhythmia and earlier tracings" },
    { id: "C", text: "Silence the alarm and watch the monitor to see whether the rhythm converts" },
    { id: "D", text: "Go to the patient, check responsiveness and a central pulse, and call for help" }
  ],
  correct: "D",
  rationale: "A waveform never establishes pulse status; only the patient does. Checking responsiveness and a central pulse at the bedside determines whether this is a perfusing tachycardia or a pulseless arrest requiring compressions. Measuring QRS width is tempting because it classifies the rhythm, but classification does not answer the question that changes care.",
  setup: { rhythm: "vt", condition: "normal", lead: "II" },
  sourceIds: ["src-acls", "src-ncsbn"]
},

{
  id: "q-22",
  domain: "arrest",
  family: "arrest",
  process: "evaluate-outcomes",
  level: "advanced",
  stem: "During resuscitation, a rhythm check shows an organized narrow-complex rhythm near 70 beats per minute where ventricular fibrillation had been. Which assessment finding tells the team that spontaneous circulation has returned?",
  options: [
    { id: "A", text: "A palpable carotid pulse during the rhythm check, together with a measurable blood pressure" },
    { id: "B", text: "An organized rhythm on the monitor that persists for several consecutive complexes" },
    { id: "C", text: "QRS complexes on the monitor that have narrowed to less than 0.12 seconds in width" },
    { id: "D", text: "Chest wall movement that continues during the pause between sets of compressions" }
  ],
  correct: "A",
  rationale: "Return of spontaneous circulation is a pump finding: a palpable central pulse with a measurable blood pressure. Option B is tempting because an organized rhythm looks like recovery, but organized electrical activity without a pulse is pulseless electrical activity, and compressions must resume immediately rather than being held to admire the tracing.",
  setup: { rhythm: "vf", condition: "normal", lead: "II" },
  sourceIds: ["src-acls", "src-klabunde"]
},

/* ------------------------------------------------------- HEMODYNAMICS (4) */

{
  id: "q-23",
  domain: "hemodynamics",
  family: "sinus",
  process: "analyze-cues",
  level: "basic",
  stem: "An adult's sinus rate climbs from 88 to 165 beats per minute and the blood pressure falls. Which physiologic change best explains the drop in blood pressure?",
  options: [
    { id: "A", text: "The ventricle ejects a larger stroke volume, so the arteries dilate to accept the extra flow" },
    { id: "B", text: "The atria stop contracting at fast rates, so the ventricle receives no filling volume at all" },
    { id: "C", text: "Diastole shortens more than systole, so the ventricle fills less and ejects a smaller stroke volume" },
    { id: "D", text: "The coronary arteries dilate at fast rates, so blood is diverted from the systemic circulation" }
  ],
  correct: "C",
  rationale: "Filling occurs during diastole, and diastole is what a fast rate steals; less end-diastolic volume means less myocardial stretch, a smaller stroke volume, and a falling output despite the high rate. Option B is tempting because atrial contraction genuinely contributes to filling, but the atria keep contracting in sinus tachycardia.",
  setup: { rhythm: "sinus-tachy", condition: "normal", lead: "II" },
  sourceIds: ["src-klabunde", "src-guyton"]
},

{
  id: "q-24",
  domain: "hemodynamics",
  family: "av-conduction",
  process: "prioritize-hypotheses",
  level: "advanced",
  stem: "An adult in complete heart block with a ventricular rate of 34 becomes confused, and urine output has nearly stopped over the past two hours. Which explanation should the nurse consider the priority?",
  options: [
    { id: "A", text: "Cerebral vessels have constricted because the slow rate has raised the arterial pressure" },
    { id: "B", text: "Cardiac output has fallen because the rate is too low for stroke volume to compensate" },
    { id: "C", text: "The kidneys have retained fluid because the slow rate has increased renal perfusion" },
    { id: "D", text: "The ventricles have hypertrophied because the escape focus demands more work per beat" }
  ],
  correct: "B",
  rationale: "Output equals rate multiplied by stroke volume; at 34 beats per minute the extra filling time cannot raise stroke volume enough to close the gap, so cerebral and renal perfusion fall and produce confusion and oliguria. Option A tempts because the long pause does raise stroke volume, but mean pressure and flow fall at this rate, and confusion reflects too little cerebral blood flow.",
  setup: { rhythm: "avb3", condition: "normal", lead: "II" },
  sourceIds: ["src-klabunde", "src-guyton", "src-brady-guideline"]
},

{
  id: "q-25",
  domain: "hemodynamics",
  family: "atrial-tachyarrhythmia",
  process: "generate-solutions",
  level: "basic",
  stem: "A patient with new atrial fibrillation and a rapid ventricular response reports fatigue. Which plan should the nurse implement to monitor the effect of this rhythm on perfusion?",
  options: [
    { id: "A", text: "Trend apical and radial pulses, blood pressure, mentation, skin temperature, and urine output" },
    { id: "B", text: "Trend the monitor heart rate alone, since the rate reflects how much blood is being ejected" },
    { id: "C", text: "Trend the QRS duration hourly, since its width reflects how well the ventricles are filling" },
    { id: "D", text: "Trend the count of irregular beats, since that count reflects the size of each stroke volume" }
  ],
  correct: "A",
  rationale: "Perfusion is judged by what the pump delivers — pulses, pressure, mentation, skin, and urine output — and comparing apical with radial pulses exposes beats too weak to reach the wrist. Option B is tempting because the monitor number is always in view, but rate is only one factor in output and reveals nothing about ejection.",
  setup: { rhythm: "af", condition: "normal", lead: "II" },
  sourceIds: ["src-af-guideline", "src-lewis", "src-klabunde"]
},

{
  id: "q-26",
  domain: "hemodynamics",
  family: "atrial-tachyarrhythmia",
  process: "evaluate-outcomes",
  level: "advanced",
  stem: "After treatment for atrial fibrillation with a rapid ventricular response, the nurse reassesses the patient. Which set of findings best indicates that perfusion has improved?",
  options: [
    { id: "A", text: "Monitor rate lower, telemetry alarm silent, rhythm still irregularly irregular" },
    { id: "B", text: "P waves now visible on the monitor, QRS complexes unchanged in width" },
    { id: "C", text: "Patient drowsy, skin cool and mottled, blood pressure reading unobtainable" },
    { id: "D", text: "Alert and oriented, warm dry skin, pulse deficit resolved, urine output increased" }
  ],
  correct: "D",
  rationale: "Improved perfusion shows up in the organs: mentation, skin, a closed pulse deficit, and restored urine output. Option A is tempting because a lower rate is the visible target of rate control, but a smaller number on the monitor does not by itself confirm that tissues are receiving more blood.",
  setup: { rhythm: "af", condition: "normal", lead: "II" },
  sourceIds: ["src-af-guideline", "src-klabunde", "src-lewis"]
},

/* --------------------------------------------------------- ELECTROLYTE (4) */

{
  id: "q-27",
  domain: "electrolyte",
  family: null,
  process: "analyze-cues",
  level: "advanced",
  stem: "A lead II strip shows tall, narrow, symmetric T waves. The nurse recalls that this appearance may occur when the extracellular potassium level rises. Which conclusion is supported by the strip itself?",
  options: [
    { id: "A", text: "The potassium level is elevated, and the value can be estimated from the height of the T waves" },
    { id: "B", text: "The potassium level is within range, because the QRS complexes have not yet begun to widen" },
    { id: "C", text: "The appearance may occur with hyperkalemia and with other conditions, so a measured level is needed" },
    { id: "D", text: "A potassium disturbance is excluded, because the underlying rhythm has remained regular throughout" }
  ],
  correct: "C",
  rationale: "Peaked T waves may occur when rising extracellular potassium speeds phase 3 repolarization, but tall symmetric T waves may also occur with early ischemia, early repolarization, or as a normal variant. Option A is tempting because the association is real, yet no waveform establishes a serum concentration; only a measured laboratory value does.",
  setup: { rhythm: "nsr", condition: "hyperkalemia", lead: "II" },
  sourceIds: ["src-weiss-k", "src-aha-intervals", "src-lewis"]
},

{
  id: "q-28",
  domain: "electrolyte",
  family: null,
  process: "take-action",
  level: "advanced",
  stem: "A patient being treated for acute kidney injury has new tall, peaked T waves on the monitor and reports increasing muscle weakness. Which action should the nurse take first?",
  options: [
    { id: "A", text: "Print a 12-lead tracing and compare the T wave height against the earlier tracing" },
    { id: "B", text: "Assess the patient, obtain vital signs, and notify the provider of the new change" },
    { id: "C", text: "Encourage oral fluid intake and reassess the monitor at the end of the shift" },
    { id: "D", text: "Record the finding in the chart and continue with the scheduled plan of care" }
  ],
  correct: "B",
  rationale: "A new waveform change plus new symptoms in a patient at risk calls for bedside assessment and prompt communication so a level can be measured and the plan revised. Option A is tempting because comparison documents the change, but gathering tracings delays the report that actually gets the patient evaluated and treated.",
  setup: { rhythm: "nsr", condition: "hyperkalemia", lead: "II" },
  sourceIds: ["src-weiss-k", "src-lewis", "src-brunner"]
},

{
  id: "q-29",
  domain: "electrolyte",
  family: null,
  process: "generate-solutions",
  level: "advanced",
  stem: "A patient at risk for a low serum calcium level has a QT interval that appears longer than expected for the heart rate. Which monitoring plan should the nurse implement?",
  options: [
    { id: "A", text: "Watch for shortening of the PR interval and for progressive widening of the P waves" },
    { id: "B", text: "Watch for narrowing of the QRS complex and for a steadily rising monitor heart rate" },
    { id: "C", text: "Watch for flattening of the T waves and for a falling respiratory rate overnight" },
    { id: "D", text: "Watch for further QT lengthening and for runs of ventricular ectopy or syncope" }
  ],
  correct: "D",
  rationale: "A low ionized calcium level may prolong the action potential plateau, which may lengthen the QT interval and widen the window in which polymorphic ventricular tachycardia can start, so serial QT checks and watching for ectopy or syncope match that risk. Option C tempts because T wave change accompanies electrolyte shifts, but flattening points toward low potassium.",
  setup: { rhythm: "nsr", condition: "hypocalcemia", lead: "II" },
  sourceIds: ["src-aha-intervals", "src-lewis", "src-surawicz"]
},

{
  id: "q-30",
  domain: "electrolyte",
  family: null,
  process: "evaluate-outcomes",
  level: "advanced",
  stem: "A patient treated for a low serum potassium level is reassessed several hours later. Which combination of findings best indicates that the disturbance is resolving?",
  options: [
    { id: "A", text: "Repeat serum potassium within range, U waves receding, muscle strength improving" },
    { id: "B", text: "Monitor heart rate ten beats per minute lower than at the previous assessment" },
    { id: "C", text: "U waves still visible while the T waves have become taller and more peaked" },
    { id: "D", text: "Blood pressure higher while the patient continues to report cramping in both legs" }
  ],
  correct: "A",
  rationale: "Evaluation pairs the measured level with the findings that prompted concern: U waves attributed to the low level recede and weakness improves. Option C is tempting because a taller T wave looks like the opposite of a flattened one, but persistent U waves alongside newly peaked T waves suggests a new problem rather than resolution.",
  setup: { rhythm: "nsr", condition: "hypokalemia", lead: "II" },
  sourceIds: ["src-weiss-k", "src-lewis", "src-aha-intervals"]
}

].forEach(function (q) { CARDIAC.content.questions.push(q); });
