/* 25-content-lessons.js — CARDIAC.content.lessons
   Five guided step sequences: three basic (normal-cycle, lead-as-lens, rhythm-detective)
   and two advanced (why-the-ecg-changes, pump-consequences). Each step carries exactly one
   contextual sentence; roughly half carry a prediction prompt. `focus` values come from the
   set fixed in CONTRACT.md. `highlight` values come from CARDIAC.REGIONS (10-namespace.js)
   plus the four valve regions the scheduler emits: mitral, tricuspid, aortic, pulmonic.
   `seek.eventType` values must be event types the scheduler actually emits
   (31-engine-rhythm.js); nothing else will ever resolve. */

CARDIAC.content.lessons = CARDIAC.content.lessons || [];

[].push.apply(CARDIAC.content.lessons, [

  /* ------------------------------------------------------------------ 1 */
  {
    id: "normal-cycle",
    label: "One normal beat, start to finish",
    level: "basic",
    blurb: "Walk a single sinus beat from the first cell that fires to the last valve that closes.",
    steps: [
      {
        id: "normal-cycle-1",
        rhythm: "nsr", condition: "normal",
        title: "Two stories, one beat",
        text: "Every beat has an electrical story and a mechanical story; the tracing shows only the electrical one, so watch both panels together.",
        focus: "integrated",
        seek: { kind: "start" },
        highlight: ["right-atrium", "left-atrium", "right-ventricle", "left-ventricle"],
        predict: null
      },
      {
        id: "normal-cycle-2",
        title: "The SA node fires, and the P wave",
        text: "The sinoatrial (SA) node depolarizes spontaneously, and the atrial wavefront spreading away from it is exactly what the P wave records.",
        focus: "conduction",
        seek: { kind: "event", eventType: "pacemaker-fire", occurrence: 1 },
        highlight: ["sa-node", "right-atrium", "left-atrium"],
        predict: {
          q: "What does the P wave represent?",
          options: ["Atrial depolarization spreading", "Atrial contraction force", "Atrial filling volume"],
          correct: 0,
          reveal: "The P wave is atrial depolarization only — the electrical wavefront leaving the SA node. Contraction follows depolarization, but it is a separate mechanical event that the ECG never measures."
        }
      },
      {
        id: "normal-cycle-3",
        title: "PR interval and atrial systole",
        text: "The atrioventricular (AV) node conducts slowly, so the PR interval of 0.12-0.20 s buys time for atrial contraction to top off the ventricles.",
        focus: "contraction",
        seek: { kind: "event", eventType: "av-arrival", occurrence: 1 },
        highlight: ["av-node", "right-atrium", "left-atrium", "tricuspid", "mitral", "left-ventricle"],
        predict: null
      },
      {
        id: "normal-cycle-4",
        title: "His-Purkinje activation and the QRS",
        text: "Past the AV node the impulse races down the His bundle and Purkinje fibers, depolarizing both ventricles almost at once as a narrow QRS.",
        focus: "conduction",
        seek: { kind: "event", eventType: "ventricular-depolarization", occurrence: 1 },
        highlight: ["his-bundle", "right-bundle", "left-bundle", "right-purkinje", "left-purkinje"],
        predict: {
          q: "Why is a normal QRS under 0.12 s?",
          options: ["Fast His-Purkinje spread", "Strong ventricular muscle", "Slow AV node conduction"],
          correct: 0,
          reveal: "Specialized His-Purkinje fibers conduct far faster than working myocardium, so the whole ventricular mass depolarizes nearly simultaneously. Damage to that highway forces slower muscle-to-muscle spread and the QRS widens."
        }
      },
      {
        id: "normal-cycle-5",
        title: "ST segment and ejection",
        text: "During the ST segment the ventricles are fully depolarized and contracting, so pressure climbs, the aortic valve opens, and blood leaves the heart.",
        focus: "flow",
        seek: { kind: "event", eventType: "semilunar-valve-open", occurrence: 1 },
        highlight: ["left-ventricle", "right-ventricle", "aortic", "pulmonic"],
        predict: null
      },
      {
        id: "normal-cycle-6",
        title: "T wave and late ejection",
        text: "The T wave is ventricular repolarization resetting the cells, while ejection is still finishing underneath it, so electrical and mechanical timing never align exactly.",
        focus: "integrated",
        seek: { kind: "event", eventType: "ventricular-repolarization", occurrence: 1 },
        highlight: ["left-ventricle", "right-ventricle", "aortic"],
        predict: {
          q: "The T wave tells you the ventricles are doing what?",
          options: ["Repolarizing", "Fully relaxed", "Completely empty"],
          correct: 0,
          reveal: "Repolarization restores the resting membrane charge so the cell can fire again; mechanical relaxation lags behind it. A T wave never proves that the ventricle has emptied or that a pulse exists."
        }
      },
      {
        id: "normal-cycle-7",
        title: "Relaxation, S2 and filling",
        text: "When ventricular pressure drops below aortic pressure the aortic valve snaps shut as S2, then the mitral and tricuspid valves open and filling begins.",
        focus: "flow",
        seek: { kind: "event", eventType: "av-valve-open", occurrence: 1 },
        highlight: ["aortic", "pulmonic", "mitral", "tricuspid", "right-atrium", "left-atrium"],
        predict: null
      },
      {
        id: "normal-cycle-8",
        title: "The integrated beat",
        text: "Run the cycle once more and track how each electrical event sets up the mechanical event that follows it after a predictable short delay.",
        focus: "integrated",
        seek: { kind: "start" },
        highlight: ["right-atrium", "left-atrium", "right-ventricle", "left-ventricle"],
        predict: {
          q: "Which of these does the ECG actually measure?",
          options: ["Electrical activation only", "Contraction strength", "Cardiac output"],
          correct: 0,
          reveal: "The ECG records the summed electrical activation and recovery of myocardium. Contraction, output and perfusion are separate questions, answered at the bedside with a pulse check and assessment."
        }
      }
    ]
  },

  /* ------------------------------------------------------------------ 2 */
  {
    id: "lead-as-lens",
    label: "A lead is a lens, not a picture",
    level: "basic",
    blurb: "Why the same beat looks different in every lead, and what no single lead can ever show you.",
    steps: [
      {
        id: "lead-as-lens-1",
        rhythm: "nsr", condition: "normal",
        title: "What a lead actually records",
        text: "A lead is a recording of the voltage between a positive electrode and a reference, which makes it one viewpoint on a single shared electrical event.",
        focus: "conduction",
        seek: { kind: "start" },
        highlight: ["right-atrium", "left-atrium", "right-ventricle", "left-ventricle"],
        predict: null
      },
      {
        id: "lead-as-lens-2",
        title: "Toward, away, perpendicular",
        text: "Current moving toward the positive electrode writes an upward deflection, moving away writes a downward one, and moving perpendicular writes almost nothing.",
        focus: "conduction",
        seek: { kind: "event", eventType: "ventricular-depolarization", occurrence: 1 },
        highlight: ["left-ventricle", "right-ventricle"],
        predict: {
          q: "A wavefront moving away from the positive electrode produces what?",
          options: ["A downward deflection", "An upward deflection", "A flat line"],
          correct: 0,
          reveal: "Polarity encodes direction relative to that one lead, not the health of the heart. The same beat looks different in different leads because each lead watches from a different angle."
        }
      },
      {
        id: "lead-as-lens-3",
        lead: "II",
        title: "Why Lead II looks the way it does",
        text: "Lead II looks from the right shoulder toward the left hip, roughly along the normal path of activation, so the P wave and QRS point upward.",
        focus: "conduction",
        seek: { kind: "event", eventType: "atrial-depolarization", occurrence: 1 },
        highlight: ["sa-node", "right-atrium", "left-atrium", "left-ventricle"],
        predict: null
      },
      {
        id: "lead-as-lens-4",
        lead: "I",
        title: "Compare Lead I, aVR and V1",
        text: "Switch among Lead I, aVR and V1 and watch the same beat change shape, because each lead views the wavefront from a different angle.",
        focus: "conduction",
        seek: { kind: "event", eventType: "ventricular-depolarization", occurrence: 1 },
        highlight: ["right-ventricle", "left-ventricle", "right-bundle", "left-bundle"],
        predict: {
          q: "Why is the QRS usually negative in aVR?",
          options: ["It views activation from the opposite side", "The right ventricle is smaller", "aVR records only repolarization"],
          correct: 0,
          reveal: "aVR sits at the right shoulder while the main ventricular wavefront travels leftward and downward, so aVR records a wave moving away from it. Nothing is wrong with the heart."
        }
      },
      {
        id: "lead-as-lens-5",
        title: "The limit of any single lead",
        text: "A lead is a flat projection of a three-dimensional event, so no single lead can trace the conduction pathway, localize damage, or determine axis.",
        focus: "integrated",
        seek: { kind: "start" },
        highlight: ["his-bundle", "right-bundle", "left-bundle", "right-ventricle", "left-ventricle"],
        predict: null
      }
    ]
  },

  /* ------------------------------------------------------------------ 3 */
  {
    id: "rhythm-detective",
    label: "Reading a strip systematically",
    level: "basic",
    blurb: "The same six questions, in the same order, every time you look at a rhythm strip.",
    steps: [
      {
        id: "rhythm-detective-1",
        rhythm: "nsr", condition: "normal",
        title: "Patient first, then the signal",
        text: "Before analyzing anything, check the patient first for responsiveness, pulse and perfusion, and only then confirm that electrodes and cable are giving a clean signal.",
        focus: "integrated",
        seek: { kind: "start" },
        highlight: ["right-atrium", "left-atrium", "right-ventricle", "left-ventricle"],
        predict: {
          q: "The monitor alarms. What comes first?",
          options: ["Look at the patient", "Print the strip", "Measure the PR interval"],
          correct: 0,
          reveal: "The monitor reports a signal, not a patient. Assess responsiveness, pulse and perfusion first; an unresponsive pulseless patient needs immediate action, and lead checking never comes before that."
        }
      },
      {
        id: "rhythm-detective-2",
        rhythm: "sinus-tachy",
        title: "Rate",
        text: "Count the ventricular rate first, because rate is what most directly threatens filling time and cardiac output once it reaches either extreme.",
        focus: "integrated",
        seek: { kind: "time", ms: 0 },
        highlight: ["left-ventricle", "right-ventricle"],
        predict: null
      },
      {
        id: "rhythm-detective-3",
        rhythm: "af",
        title: "Regularity",
        text: "Walk out the R-to-R intervals and label the pattern regular, regularly irregular, or irregularly irregular, because the pattern narrows the possibilities quickly.",
        focus: "conduction",
        seek: { kind: "time", ms: 0 },
        highlight: ["av-node", "left-ventricle", "right-ventricle"],
        predict: null
      },
      {
        id: "rhythm-detective-4",
        rhythm: "aflutter",
        title: "P waves",
        text: "Ask three questions in order: is a P wave present, is it upright and uniform, and is there exactly one before every QRS?",
        focus: "conduction",
        seek: { kind: "event", eventType: "atrial-depolarization", occurrence: 1 },
        highlight: ["sa-node", "right-atrium", "left-atrium"],
        predict: null
      },
      {
        id: "rhythm-detective-5",
        rhythm: "avb1",
        title: "PR interval",
        text: "Measure from P onset to QRS onset, because a PR of 0.12-0.20 s means the AV node delayed the impulse by the expected amount.",
        focus: "conduction",
        seek: { kind: "event", eventType: "av-arrival", occurrence: 1 },
        highlight: ["av-node", "his-bundle"],
        predict: {
          q: "A PR interval of 0.28 s that never changes suggests what?",
          options: ["First-degree AV block", "Second-degree AV block", "Normal conduction"],
          correct: 0,
          reveal: "Every impulse still reaches the ventricles, only slowly, so each P wave is followed by a QRS at a fixed long PR. Nothing is dropped, which is what separates it from second-degree block."
        }
      },
      {
        id: "rhythm-detective-6",
        rhythm: "vt",
        title: "QRS width, and what a strip cannot say",
        text: "A QRS under 0.12 s means the ventricles were activated through the normal fast pathway, but no strip of any width proves a pulse.",
        focus: "integrated",
        seek: { kind: "event", eventType: "ventricular-depolarization", occurrence: 1 },
        highlight: ["his-bundle", "right-bundle", "left-bundle", "right-purkinje", "left-purkinje"],
        predict: {
          q: "What can a rhythm strip never tell you?",
          options: ["Whether the patient has a pulse", "The ventricular rate", "The QRS width"],
          correct: 0,
          reveal: "The strip records voltage, not mechanical output. Organized complexes can march across the screen with no palpable pulse, so pulse and perfusion are always confirmed by assessing the patient."
        }
      }
    ]
  },

  /* ------------------------------------------------------------------ 4 */
  {
    id: "why-the-ecg-changes",
    label: "From ion channel to waveform",
    level: "advanced",
    blurb: "How a change in ion movement becomes a change in shape, using potassium and a bundle delay.",
    steps: [
      {
        id: "why-the-ecg-changes-1",
        rhythm: "nsr", condition: "normal",
        title: "Every change starts at the membrane",
        text: "Every ECG change begins as a change in ion movement across the cell membrane, which alters how fast and how uniformly tissue depolarizes or recovers.",
        focus: "conduction",
        seek: { kind: "start" },
        highlight: ["left-ventricle", "right-ventricle"],
        predict: null
      },
      {
        id: "why-the-ecg-changes-2",
        condition: "normal",
        title: "Resting potential sets excitability",
        text: "The resting membrane potential is set mainly by the potassium (K⁺) gradient, and it decides how many fast sodium (Na⁺) channels are available to fire.",
        focus: "conduction",
        seek: { kind: "time", ms: 0 },
        highlight: ["right-atrium", "left-atrium", "right-ventricle", "left-ventricle"],
        predict: {
          q: "Raising extracellular potassium does what to the resting potential?",
          options: ["Makes it less negative", "Makes it more negative", "Leaves it unchanged"],
          correct: 0,
          reveal: "A smaller K⁺ gradient leaves the cell sitting closer to threshold, so more fast Na⁺ channels are inactivated at rest and the upstroke of the action potential becomes slower and smaller."
        }
      },
      {
        id: "why-the-ecg-changes-3",
        condition: "hyperkalemia",
        title: "Hyperkalemia: faster, tighter recovery",
        text: "Raised extracellular K⁺ speeds the potassium currents that end repolarization, so recovery finishes sooner and more synchronously, and a tall narrow symmetric T wave may appear.",
        focus: "conduction",
        seek: { kind: "event", eventType: "ventricular-repolarization", occurrence: 1 },
        highlight: ["left-ventricle", "right-ventricle"],
        predict: null
      },
      {
        id: "why-the-ecg-changes-4",
        condition: "hyperkalemia",
        title: "Hyperkalemia: slower activation",
        text: "With fewer available Na⁺ channels the upstroke slows and conduction velocity falls, so the P wave may flatten and the QRS may widen — neither finding is specific.",
        focus: "conduction",
        seek: { kind: "event", eventType: "ventricular-depolarization", occurrence: 1 },
        highlight: ["right-atrium", "left-atrium", "his-bundle", "left-ventricle"],
        predict: {
          q: "Can a widened QRS confirm a serum potassium level?",
          options: ["No, never infer a lab value", "Yes, if it is very wide", "Yes, with a 12-lead"],
          correct: 0,
          reveal: "Potassium-associated ECG changes are variable associations, not measurements, and the tracing may look entirely normal at abnormal levels. Only a serum sample reports a concentration; report the change and escalate."
        }
      },
      {
        id: "why-the-ecg-changes-5",
        rhythm: "avb1", condition: "normal",
        title: "A delay in one bundle region",
        text: "If one bundle branch conducts slowly, its ventricle is activated late through working muscle instead of Purkinje fibers, so total activation time lengthens.",
        focus: "conduction",
        seek: { kind: "event", eventType: "bundle-activation", occurrence: 1 },
        highlight: ["right-bundle", "left-bundle", "right-purkinje", "left-purkinje", "right-ventricle", "left-ventricle"],
        predict: null
      },
      {
        id: "why-the-ecg-changes-6",
        condition: "hyperkalemia",
        title: "Why the QRS widens, and its limits",
        text: "Sequential rather than simultaneous ventricular activation is written on the surface as a QRS of 0.12 s or more, and it distorts repolarization too.",
        focus: "integrated",
        seek: { kind: "event", eventType: "ventricular-depolarization", occurrence: 1 },
        highlight: ["right-bundle", "left-bundle", "right-ventricle", "left-ventricle"],
        predict: {
          q: "A wide QRS in one lead lets you say what?",
          options: ["Activation took longer", "Which bundle is damaged", "That hypertrophy is present"],
          correct: 0,
          reveal: "Width is a timing measurement that any lead can show. Naming the conduction structure involved, or judging chamber size, requires a full 12-lead recording and clinician interpretation."
        }
      }
    ]
  },

  /* ------------------------------------------------------------------ 5 */
  {
    id: "pump-consequences",
    label: "What the rhythm does to the pump",
    level: "advanced",
    blurb: "Rate, atrial kick, preload, afterload and contractility, and why organized beats can be pulseless.",
    steps: [
      {
        id: "pump-consequences-1",
        rhythm: "sinus-tachy", condition: "normal",
        title: "Rate governs filling time",
        text: "Diastole shortens far more than systole as rate climbs, so at very fast rates the ventricle simply has less time in which to fill.",
        focus: "flow",
        seek: { kind: "event", eventType: "av-valve-open", occurrence: 1 },
        highlight: ["mitral", "tricuspid", "right-ventricle", "left-ventricle"],
        predict: {
          q: "Why can a very fast rate lower stroke volume?",
          options: ["Filling time falls", "Contractility fails", "Afterload disappears"],
          correct: 0,
          reveal: "Shorter diastole means less end-diastolic volume, so each beat ejects less. Rate can climb high enough that output falls despite more beats per minute, so check the pulse and perfusion."
        }
      },
      {
        id: "pump-consequences-2",
        rhythm: "af", condition: "normal",
        title: "The atrial kick",
        text: "Coordinated atrial contraction adds a final increment of ventricular filling, so losing organized atrial contraction removes a meaningful share of end-diastolic volume.",
        focus: "contraction",
        /* This step is ABOUT the absence of coordinated atrial contraction, so
         * seeking "atrial-systole" in atrial fibrillation resolved to nothing
         * and silently fell back to the schedule start. Land on filling instead,
         * which is the thing the missing kick would have topped up. */
        seek: { kind: "event", eventType: "av-valve-open", occurrence: 1 },
        highlight: ["right-atrium", "left-atrium", "mitral", "tricuspid"],
        predict: null
      },
      {
        id: "pump-consequences-3",
        rhythm: "nsr", condition: "normal",
        title: "Preload and the Frank-Starling relation",
        text: "Greater end-diastolic stretch improves the overlap of contractile filaments, so within limits a fuller ventricle ejects a larger stroke volume.",
        focus: "contraction",
        seek: { kind: "time", ms: 0 },
        highlight: ["left-ventricle", "left-atrium", "right-atrium", "mitral"],
        predict: {
          q: "Preload most directly describes what?",
          options: ["End-diastolic stretch", "Arterial resistance", "Contraction strength"],
          correct: 0,
          reveal: "Preload is the volume-driven stretch on the ventricle at end-diastole. Afterload is the load it must overcome before the aortic valve opens, and the two move stroke volume in opposite directions."
        }
      },
      {
        id: "pump-consequences-4",
        rhythm: "nsr", condition: "lvh",
        title: "Afterload: the load before the valve",
        text: "The ventricle must exceed aortic pressure before the aortic valve opens, so rising afterload lengthens that pressure-building phase and trims what is ejected.",
        focus: "flow",
        seek: { kind: "event", eventType: "semilunar-valve-open", occurrence: 1 },
        highlight: ["aortic", "left-ventricle"],
        predict: null
      },
      {
        id: "pump-consequences-5",
        rhythm: "nsr", condition: "hfref",
        title: "Contractility, independent of load",
        text: "Contractility is the force generated at any given preload, driven largely by the calcium (Ca²⁺) made available to the myofilaments during each beat.",
        focus: "contraction",
        seek: { kind: "event", eventType: "ventricular-depolarization", occurrence: 1 },
        highlight: ["left-ventricle", "right-ventricle"],
        predict: null
      },
      {
        id: "pump-consequences-6",
        rhythm: "nsr", condition: "normal", patientState: "pea",
        title: "Organized electricity, still no pulse",
        text: "Electrical organization can persist while the ventricle produces no effective flow, which is why a pulse check, not the monitor, decides what happens next.",
        focus: "integrated",
        seek: { kind: "start" },
        highlight: ["left-ventricle", "right-ventricle", "aortic"],
        predict: {
          q: "An organized rhythm on the monitor means the patient what?",
          options: ["May still have no pulse", "Definitely has a pulse", "Has adequate output"],
          correct: 0,
          reveal: "Depolarization does not guarantee contraction, and contraction does not guarantee flow. Pulseless electrical activity is a clinical finding made at the bedside, never a waveform you can read off a strip."
        }
      }
    ]
  }

]);
