/* 22a-conditions-electrolyte.js
   CARDIAC.content.conditions — electrolyte group: normal, hyperkalemia, hypokalemia,
   hypercalcemia, hypocalcemia, hypomagnesemia. Plus CARDIAC.content.mechanisms deep-dives
   for selected chain links. Authored data only, no logic. */

CARDIAC.content.conditions = CARDIAC.content.conditions || {};
CARDIAC.content.mechanisms = CARDIAC.content.mechanisms || {};

Object.assign(CARDIAC.content.conditions, {

  "normal": {
    id: "normal",
    label: "Normal ionic environment",
    short: "Normal",
    group: "electrolyte",
    level: "basic",
    evidence: "D",
    requiresTwelveLead: false,

    headline: "The reference tracing: ordinary wave sequence, no electrolyte distortion.",

    chain: [
      { id: "normal-1", layer: "trigger", label: "Ions sit where they belong",
        text: "Normal extracellular potassium holds the resting membrane at its usual very negative voltage; calcium and magnesium steady threshold and the plateau." },
      { id: "normal-2", layer: "cellular", label: "Phase 0: sodium floods in",
        text: "Because the cell rests fully negative, fast Na+ (sodium) channels are available; a stimulus opens them and the upstroke is steep and uniform." },
      { id: "normal-3", layer: "conduction", label: "One wavefront, in order",
        text: "Atria depolarize first, the AV (atrioventricular) node delays the wavefront, then His-Purkinje fibers deliver it to both ventricles almost at once." },
      { id: "normal-4", layer: "ecg", label: "P, PR and QRS get written",
        text: "Atrial depolarization writes the P wave, AV delay writes the flat PR segment, and fast ventricular depolarization writes a narrow QRS (< 0.12 s)." },
      { id: "normal-5", layer: "ecg", label: "Plateau, then the T wave",
        text: "Calcium entry balances potassium exit as a plateau — the isoelectric ST segment — then potassium exit wins and repolarization writes the T wave." },
      { id: "normal-6", layer: "mechanical", label: "Signal first, squeeze second",
        text: "Each depolarization releases calcium inside the cell and triggers contraction, so the squeeze follows the signal; the ECG shows only the signal." },
      { id: "normal-7", layer: "clinical", label: "A normal strip is not a normal patient",
        text: "A normal-looking tracing rules nothing in or out. Assess the patient, the pulse and the perfusion, and read laboratory values for actual ion levels." }
    ],

    ecgFindings: [
      "One upright, uniform P wave may be seen before every QRS in lead II",
      "PR interval is usually 0.12-0.20 s and constant beat to beat",
      "QRS is usually narrow, under 0.12 s, with a stable shape",
      "T wave is usually upright in lead II, asymmetric, and separate from the QRS",
      "ST segment usually sits on the isoelectric baseline with no prominent U wave"
    ],
    nonspecific: "A normal tracing does not exclude electrolyte disturbance, ischemia or structural disease; many patients with abnormal chemistries look ordinary.",

    mechanical: "Normal timing gives atrial contraction a moment to top off the ventricles before systole, so stroke volume gets the full atrial contribution.",
    perfusionNote: "Normal timing supports, but never proves, adequate output — confirm perfusion at the patient with pulse, blood pressure, skin and mental status.",

    complications: [
      "A normal-appearing strip can delay recognition of a real problem",
      "Artifact can mimic disease and prompt unnecessary intervention",
      "A single monitoring lead can hide changes seen in other leads"
    ],

    nursing: {
      assess: [
        "Confirm patient identity and that leads and signal are clean",
        "Check pulse, blood pressure, skin and level of consciousness",
        "Compare the current strip with the patient's own baseline"
      ],
      act: [
        "Document a labeled baseline strip at the start of the shift",
        "Set telemetry alarm limits and keep alarms audible",
        "Report change from baseline rather than one isolated reading"
      ],
      escalate: "Escalate any new symptom or change in perfusion even when the tracing still looks entirely normal."
    },

    limits: [
      "The ECG shows electrical timing only; it never measures contraction, cardiac output, or tissue perfusion.",
      "One monitoring lead views the heart from one angle; a 12-lead is needed to judge morphology fully.",
      "No waveform reports a serum potassium, calcium or magnesium — only laboratory testing does."
    ],

    sourceIds: ["src-goldberger", "src-klabunde", "src-aha-std"],
    compare: ["hyperkalemia", "hypokalemia"]
  },

  "hyperkalemia": {
    id: "hyperkalemia",
    label: "Hyperkalemia (elevated serum potassium)",
    short: "High K+",
    group: "electrolyte",
    level: "basic",
    evidence: "A",
    requiresTwelveLead: false,

    headline: "Two separate effects: potassium slows depolarization and speeds repolarization.",

    chain: [
      { id: "hyperK-1", layer: "trigger", label: "Potassium rises outside the cell",
        text: "Impaired excretion, tissue breakdown or a shift out of cells raises extracellular K+ (potassium), narrowing the gradient across the membrane." },
      { id: "hyperK-2", layer: "cellular", label: "Resting membrane sits less negative",
        text: "That smaller gradient moves the potassium equilibrium potential, so the resting membrane drifts toward zero and the cell rests partly depolarized." },
      { id: "hyperK-3", layer: "cellular", label: "Fast sodium channels inactivate",
        text: "Fast Na+ channels inactivate at less negative voltages, so fewer are available for phase 0 and the upstroke becomes slower and weaker." },
      { id: "hyperK-4", layer: "conduction", label: "Every wavefront travels slower",
        text: "A slower upstroke spreads more slowly. Atrial muscle is the most sensitive tissue, so atrial signal fades before AV and ventricular conduction slow." },
      { id: "hyperK-5", layer: "ecg", label: "Flat P, long PR, wide QRS may appear",
        text: "P waves may flatten, widen or disappear; PR may stretch beyond 0.20 s and QRS may widen past 0.12 s — these are the later, more ominous changes." },
      { id: "hyperK-6", layer: "cellular", label: "A second, independent effect",
        text: "Separately, high external K+ raises conductance through the potassium channels carrying phase 3, so repolarization finishes faster and more uniformly." },
      { id: "hyperK-7", layer: "ecg", label: "Peaked T, shortened QT may appear",
        text: "Faster, more synchronous repolarization across the wall may write a tall, narrow, symmetric, pointed T with a shorter QT — an early change." }
    ],

    ecgFindings: [
      "Tall, narrow, symmetric, pointed T waves may occur as an early change",
      "P waves may flatten, widen, or become undetectable as atrial signal fades",
      "PR interval may lengthen past 0.20 s and QRS may widen past 0.12 s",
      "QT may shorten while the T wave grows taller and narrower",
      "A sine-wave pattern may occur at extremes and can precede arrest",
      "Bradycardia, sinus arrest or wide-complex rhythms may occur"
    ],
    nonspecific: "Tall T waves are nonspecific: they also occur with early ischemia, early repolarization, or as a normal variant. The tracing may look normal.",

    mechanical: "Slowed, disorganized conduction wastes the coordinated squeeze; when atrial activity fails and the QRS widens, stroke volume and output may fall.",
    perfusionNote: "A wide, slow complex on the monitor says nothing about perfusion — feel a pulse and check blood pressure, skin and mental status before interpreting.",

    complications: [
      "Progressive conduction block, bradycardia or asystole",
      "Ventricular fibrillation or pulseless electrical activity",
      "Sine-wave pattern that may immediately precede cardiac arrest",
      "Muscle weakness and paresthesias may accompany the changes"
    ],

    nursing: {
      assess: [
        "Check responsiveness, pulse and perfusion before reading the strip",
        "Verify leads and signal so artifact is not mistaken for change",
        "Review renal function, urine output and recent potassium results",
        "Ask about missed dialysis, supplements, or crush injury"
      ],
      act: [
        "Keep the patient on continuous telemetry with alarms audible",
        "Obtain a 12-lead ECG and laboratory sample as ordered",
        "Ensure emergency equipment and a defibrillator are nearby",
        "Document timed strips and report the trend, not one reading"
      ],
      escalate: "Notify the provider immediately for new peaked T waves, widening QRS, bradycardia, or a change in perfusion."
    },

    limits: [
      "The ECG never establishes a serum potassium; only a laboratory sample can.",
      "Changes follow no guaranteed sequence — a patient may arrest without ever showing peaked T waves.",
      "A single monitoring lead may miss changes that a 12-lead would show."
    ],

    sourceIds: ["src-weiss-k", "src-surawicz", "src-aha-intervals"],
    compare: ["hypokalemia", "hypocalcemia"]
  },

  "hypokalemia": {
    id: "hypokalemia",
    label: "Hypokalemia (low serum potassium)",
    short: "Low K+",
    group: "electrolyte",
    level: "basic",
    evidence: "A",
    requiresTwelveLead: false,

    headline: "Low potassium drags repolarization out: flat T, ST depression, U wave may appear.",

    chain: [
      { id: "hypoK-1", layer: "trigger", label: "Potassium falls outside the cell",
        text: "Urinary or gastrointestinal losses, or a shift into cells, lower extracellular K+ (potassium) and widen the gradient across the membrane." },
      { id: "hypoK-2", layer: "cellular", label: "Potassium channels close down",
        text: "Paradoxically, less external K+ closes rather than opens the potassium channels that repolarize the cell, so the current driving phase 3 shrinks." },
      { id: "hypoK-3", layer: "cellular", label: "Repolarization drags out",
        text: "With less outward current, phase 3 takes longer and lengthens unevenly, so the ventricle repolarizes over a longer and patchier window." },
      { id: "hypoK-4", layer: "ecg", label: "Flat T and ST depression may appear",
        text: "Repolarization is stretched thin and low in amplitude, so the T wave may flatten or invert and the ST segment may sag below baseline." },
      { id: "hypoK-5", layer: "ecg", label: "A U wave emerges",
        text: "Purkinje and mid-myocardial cells finish last; their late repolarization may surface as a separate U wave, giving a long QU rather than a clean QT." },
      { id: "hypoK-6", layer: "cellular", label: "Ectopy becomes easier",
        text: "Low K+ also enhances automaticity and lets early afterdepolarizations form during the long phase 3 — extra beats landing in a vulnerable window." },
      { id: "hypoK-7", layer: "clinical", label: "Torsades risk, and the magnesium link",
        text: "Dispersed repolarization plus ectopy raises torsades de pointes risk, and low potassium often resists correction until magnesium is replaced." }
    ],

    ecgFindings: [
      "T waves may flatten or invert as repolarization loses amplitude",
      "ST segment depression may occur",
      "A prominent U wave may appear just after the T wave",
      "T and U may fuse, so what is measured is a long QU, not a clean QT",
      "Premature atrial or ventricular beats may occur",
      "Torsades de pointes may occur, especially with other QT influences"
    ],
    nonspecific: "U waves and ST depression are nonspecific: they also occur with bradycardia, some medications, and hypertrophy. The tracing may look normal.",

    mechanical: "Extra beats shorten filling and lose the atrial kick, so those beats eject less; a sustained torsades run drops forward output sharply.",
    perfusionNote: "Ectopy on the monitor tells you nothing about the pulse it produced — palpate during the run and check blood pressure and mental status.",

    complications: [
      "Torsades de pointes and ventricular fibrillation",
      "Increased digoxin toxicity risk at usual serum digoxin levels",
      "Potassium that stays low until magnesium is corrected",
      "Muscle weakness, cramping and slowed bowel motility"
    ],

    nursing: {
      assess: [
        "Assess pulse, blood pressure and mental status during ectopy",
        "Confirm leads and signal before calling a change real",
        "Review potassium and magnesium results and diuretic use",
        "Ask about vomiting, diarrhea, or poor oral intake"
      ],
      act: [
        "Keep continuous telemetry and measure the QT on a 12-lead",
        "Report ectopy trends and any lengthening QT to the provider",
        "Keep emergency equipment and a defibrillator accessible",
        "Monitor more closely if the patient also takes digoxin"
      ],
      escalate: "Notify the provider urgently for new ectopy, a lengthening QT, or any run of polymorphic wide-complex beats."
    },

    limits: [
      "No waveform gives a serum potassium; only a laboratory sample does.",
      "U waves can be normal at slow rates and can be absent despite a low potassium.",
      "Severity does not follow a fixed sequence of ECG changes."
    ],

    sourceIds: ["src-weiss-k", "src-aha-intervals", "src-goldberger"],
    compare: ["hypomagnesemia", "hypocalcemia"]
  },

  "hypercalcemia": {
    id: "hypercalcemia",
    label: "Hypercalcemia (elevated serum calcium)",
    short: "High Ca2+",
    group: "electrolyte",
    level: "advanced",
    evidence: "A",
    requiresTwelveLead: false,

    headline: "More calcium ends the plateau sooner, so the ST segment and QT may shorten.",

    chain: [
      { id: "hyperCa-1", layer: "trigger", label: "Calcium rises outside the cell",
        text: "Bone release, excess intake or impaired excretion raises extracellular Ca2+ (calcium), steepening the gradient that drives calcium into the cell." },
      { id: "hyperCa-2", layer: "cellular", label: "The plateau ends sooner",
        text: "More calcium entering during phase 2 speeds calcium-dependent inactivation of its own channels, so the plateau current shuts itself off earlier." },
      { id: "hyperCa-3", layer: "cellular", label: "The action potential shortens",
        text: "With the plateau cut short, phase 3 begins sooner and the whole ventricular action potential is briefer, though its shape is otherwise unchanged." },
      { id: "hyperCa-4", layer: "ecg", label: "Short ST and short QT may appear",
        text: "The ST segment is the surface signature of the plateau, so it may shorten or nearly vanish, pulling the T toward the QRS and shortening the QT." },
      { id: "hyperCa-5", layer: "ecg", label: "QRS and T usually look normal",
        text: "Depolarization is untouched, so QRS width and T shape usually stay normal; only at extremes may a J-wave hump, bradycardia or block appear." },
      { id: "hyperCa-6", layer: "clinical", label: "Subtle, and easy to miss",
        text: "Because only a segment length changes, this is easy to overlook on a monitor, and a short-looking QT never establishes a calcium level." }
    ],

    ecgFindings: [
      "The QT interval may shorten, mostly by shortening the ST segment",
      "The T wave may appear to begin almost immediately after the QRS",
      "QRS width and T wave shape usually remain normal",
      "Bradycardia or heart block may occur at extreme elevations",
      "A J-wave hump at the end of the QRS may occur, but only rarely and at extremes"
    ],
    nonspecific: "A short QT is nonspecific: it also occurs with tachycardia, digoxin effect and inherited short-QT syndromes. The tracing may look normal.",

    mechanical: "Contraction is usually preserved or brisk; the danger comes from the systemic effects of high calcium rather than from pump timing itself.",
    perfusionNote: "Calcium-driven diuresis can dehydrate the patient and lower blood pressure — assess hydration, urine output and mental status, not just the strip.",

    complications: [
      "Dehydration from calcium-induced polyuria",
      "Confusion, lethargy and a falling level of consciousness",
      "Bradyarrhythmia or heart block at extreme elevations",
      "Kidney stones, nausea and abdominal pain"
    ],

    nursing: {
      assess: [
        "Assess level of consciousness, pulse and blood pressure",
        "Check hydration status with intake, output and mucous membranes",
        "Review calcium results and any calcium-containing intake",
        "Confirm signal quality before calling the QT short"
      ],
      act: [
        "Keep telemetry running and obtain a 12-lead as ordered",
        "Support hydration as ordered and use fall precautions",
        "Report neurologic and cardiac changes together with the strip"
      ],
      escalate: "Notify the provider for new bradycardia, new heart block, or a declining level of consciousness."
    },

    limits: [
      "The ECG never establishes a serum calcium; a laboratory sample does.",
      "QT length depends on heart rate and is hard to judge on one lead.",
      "Mild elevations commonly produce no visible ECG change at all."
    ],

    sourceIds: ["src-surawicz", "src-aha-intervals", "src-goldberger"],
    compare: ["hypocalcemia", "normal"]
  },

  "hypocalcemia": {
    id: "hypocalcemia",
    label: "Hypocalcemia (low serum calcium)",
    short: "Low Ca2+",
    group: "electrolyte",
    level: "advanced",
    evidence: "A",
    requiresTwelveLead: false,

    headline: "A stretched plateau lengthens the ST segment: long QT with a normal-width T.",

    chain: [
      { id: "hypoCa-1", layer: "trigger", label: "Calcium falls outside the cell",
        text: "Loss, binding, or low parathyroid activity lowers extracellular Ca2+ (calcium), so less calcium is available to enter during the plateau." },
      { id: "hypoCa-2", layer: "cellular", label: "The plateau is held open",
        text: "Less calcium entry means slower calcium-dependent inactivation, so phase 2 keeps inward and outward currents balanced for a longer stretch." },
      { id: "hypoCa-3", layer: "cellular", label: "The action potential lengthens",
        text: "Phase 3 therefore starts later and the action potential is longer overall — but once repolarization begins it proceeds at a normal speed." },
      { id: "hypoCa-4", layer: "ecg", label: "Long ST and long QT may appear",
        text: "The ST segment may stretch into a long flat isoelectric line and the QT may lengthen, while the T wave keeps a normal width and shape." },
      { id: "hypoCa-5", layer: "ecg", label: "The discriminator worth memorizing",
        text: "Contrast with hypokalemia: there the T itself is flat and a U appears. Here a normal-looking T simply sits at the end of a long, flat ST segment." },
      { id: "hypoCa-6", layer: "clinical", label: "A long QT is a vulnerable QT",
        text: "A long QT widens the window in which an early beat can land, so torsades risk rises, especially alongside other QT-prolonging influences." }
    ],

    ecgFindings: [
      "The QT interval may lengthen, mostly by lengthening the ST segment",
      "The ST segment may appear as a long flat isoelectric line",
      "The T wave usually keeps a normal width and shape",
      "U waves are usually absent, unlike in hypokalemia",
      "Torsades de pointes may occur when the QT is markedly long"
    ],
    nonspecific: "A long QT is nonspecific: medications, low potassium, low magnesium and inherited syndromes all prolong it. Mild hypocalcemia may show nothing.",

    mechanical: "Calcium drives the contractile machinery, so low calcium may weaken contraction and, when severe, reduce stroke volume and blood pressure.",
    perfusionNote: "Watch blood pressure and perfusion alongside neuromuscular signs; the strip cannot tell you whether contraction has actually weakened.",

    complications: [
      "Torsades de pointes, uncommon but possible with a very long QT",
      "Tetany, carpopedal spasm and seizures",
      "Laryngospasm and airway compromise",
      "Weaker contraction and hypotension if severe"
    ],

    nursing: {
      assess: [
        "Assess airway, breathing, pulse and blood pressure first",
        "Check for numbness, tingling, cramping or muscle twitching",
        "Review calcium results and any recent neck or thyroid surgery",
        "Confirm signal quality before judging the QT"
      ],
      act: [
        "Keep telemetry on and obtain a 12-lead to measure the QT",
        "Keep emergency airway equipment available at the bedside",
        "Use seizure precautions and report neuromuscular signs"
      ],
      escalate: "Notify the provider urgently for stridor, seizure, tetany, or a markedly prolonged QT interval."
    },

    limits: [
      "The ECG never establishes a serum calcium; a laboratory sample does.",
      "QT varies with heart rate, so compare rate-corrected values over time.",
      "A normal-looking QT does not exclude a low calcium level."
    ],

    sourceIds: ["src-surawicz", "src-aha-intervals", "src-brunner"],
    compare: ["hypokalemia", "hypercalcemia"]
  },

  "hypomagnesemia": {
    id: "hypomagnesemia",
    label: "Hypomagnesemia (low serum magnesium)",
    short: "Low Mg2+",
    group: "electrolyte",
    level: "advanced",
    evidence: "A",
    requiresTwelveLead: false,

    headline: "Often no specific ECG signature, yet it keeps potassium low and the QT long.",

    chain: [
      { id: "hypoMg-1", layer: "trigger", label: "Magnesium falls",
        text: "Diuretics, alcohol use, gastrointestinal losses or poor intake lower serum Mg2+ (magnesium), which normally steadies several cardiac ion channels." },
      { id: "hypoMg-2", layer: "cellular", label: "The kidney's potassium brake lets go",
        text: "Magnesium inside cells normally plugs the potassium channels of the kidney tubule; as it falls, the plug lifts and the kidney wastes potassium." },
      { id: "hypoMg-3", layer: "clinical", label: "Hypokalemia turns stubborn",
        text: "This is why a low potassium often will not correct until magnesium is replaced; the two disturbances travel together and are corrected together." },
      { id: "hypoMg-4", layer: "cellular", label: "Repolarization lengthens and scatters",
        text: "Low magnesium can lengthen and destabilize repolarization much as low potassium does, so the QT may stretch and recovery may spread unevenly." },
      { id: "hypoMg-5", layer: "ecg", label: "The findings are borrowed, not specific",
        text: "Anything visible — flat T, U wave, long QT, ectopy — looks like hypokalemia, and very often the tracing shows nothing specific at all." },
      { id: "hypoMg-6", layer: "clinical", label: "Torsades is the real danger",
        text: "That uneven, prolonged repolarization is the substrate for torsades de pointes, which is why magnesium matters even when the strip looks unremarkable." }
    ],

    ecgFindings: [
      "Often no specific change occurs; the tracing may look entirely normal",
      "The QT interval may lengthen",
      "Flattened T waves or U waves may occur, mimicking hypokalemia",
      "Premature ventricular beats may occur",
      "Torsades de pointes may occur, sometimes as the first visible sign"
    ],
    nonspecific: "Hypomagnesemia has no signature waveform; anything seen overlaps with low potassium or drug effect, and the tracing is frequently normal.",

    mechanical: "Pump function is usually unchanged until an arrhythmia interrupts filling; while torsades runs, effective ejection essentially stops.",
    perfusionNote: "Because the strip is so often normal, base concern on the patient, the risk factors and the laboratory trend rather than on the waveform.",

    complications: [
      "Torsades de pointes and other ventricular arrhythmias",
      "Hypokalemia that stays refractory until magnesium is corrected",
      "Coexisting hypocalcemia, which is common",
      "Tremor, weakness, and seizures"
    ],

    nursing: {
      assess: [
        "Assess pulse, blood pressure and mental status",
        "Look for tremor, weakness, or hyperactive deep tendon reflexes",
        "Review magnesium, potassium and calcium results together",
        "Ask about alcohol use, diuretics, and prolonged diarrhea"
      ],
      act: [
        "Keep continuous telemetry with alarms audible",
        "Obtain a 12-lead to measure the QT interval as ordered",
        "Report a lengthening QT or new ectopy promptly",
        "Keep a defibrillator and emergency equipment nearby"
      ],
      escalate: "Notify the provider for any polymorphic wide-complex run, syncope, or a QT interval that keeps lengthening."
    },

    limits: [
      "The ECG never establishes a serum magnesium; a laboratory sample does.",
      "A completely normal tracing does not rule out significant depletion.",
      "Serum magnesium reflects total body stores poorly, so trend the patient too."
    ],

    sourceIds: ["src-aha-intervals", "src-lewis", "src-surawicz"],
    compare: ["hypokalemia", "hypocalcemia"]
  }

});

Object.assign(CARDIAC.content.mechanisms, {

  "normal-5": {
    detail: "Phase 2, the plateau, is a standoff: calcium drifting in nearly cancels potassium drifting out, so voltage barely moves and the surface tracing sits flat at the ST segment. When calcium channels finish inactivating, the outward potassium current wins unopposed, voltage falls, and that falling limb is the T wave. ST length reports plateau length; T shape reports how repolarization spread.",
    figure: null
  },

  "hyperK-2": {
    detail: "The resting membrane potential tracks the potassium equilibrium potential, set by the ratio of potassium inside the cell to potassium outside. Adding potassium outside shrinks that ratio, so the equilibrium potential — and the resting voltage that follows it — moves toward zero. The cell now sits partly depolarized before any stimulus arrives, which is the setup for everything after.",
    figure: null
  },

  "hyperK-3": {
    detail: "Fast sodium channels carry a voltage-dependent inactivation gate. At a normal, very negative resting voltage most gates are reset and available. Sitting partly depolarized leaves a fraction stuck inactivated, so the next stimulus opens fewer channels. Less sodium current means a slower, smaller phase 0 upstroke, and because each cell depolarizes its neighbor with that upstroke, conduction slows.",
    figure: null
  },

  "hyperK-5": {
    detail: "Atrial muscle conducts on the smallest safety margin, so it fails first: P waves flatten, widen, and can vanish entirely even while the ventricle still conducts. Losing a visible P does not mean the atria stopped mattering — it means their signal is too slow and small to write one. Next the AV node and His-Purkinje slow, stretching PR, and finally ventricular muscle widens the QRS.",
    figure: null
  },

  "hyperK-6": {
    detail: "This is the insight students miss. The conduction problem and the T-wave change are two different mechanisms running at once. Elevated extracellular potassium increases conductance through the inward-rectifier and delayed-rectifier potassium channels that carry phase 3. More outward current means repolarization is faster and finishes at nearly the same moment across the ventricular wall.",
    figure: null
  },

  "hyperK-7": {
    detail: "T wave shape reports the spread of repolarization times across the wall. Normally the wall recovers over a range of moments, giving a broad, asymmetric T. When repolarization synchronizes, that range collapses: the T turns tall, narrow, symmetric and pointed, and the QT shortens. Potassium conductance rises before sodium availability fails, so a peaked T often comes first — but not reliably.",
    figure: null
  },

  "hypoK-2": {
    detail: "The inward-rectifier potassium channel behaves backward from intuition: its conductance depends on how much potassium sits outside the cell, so lowering external potassium closes it rather than opening it. Less outward current is available to end the action potential, so phase 3 loses its main driver. This is the mirror image of hyperkalemia, and why the two write opposite T waves.",
    figure: null
  },

  "hypoK-5": {
    detail: "The U wave is thought to come from tissue that repolarizes last — Purkinje fibers and mid-myocardial M cells. When phase 3 is slowed, that late tissue falls far enough behind the rest of the wall that its recovery separates out as its own deflection after the T. Because T and U blur together, what is measured is really a QU interval, and calling it a QT overstates how cleanly repolarization ended.",
    figure: null
  },

  "hypoK-6": {
    detail: "Two ectopy mechanisms stack. Partial resting depolarization in pacemaker tissue makes spontaneous firing easier, so automaticity rises. Separately, a long phase 3 gives calcium channels time to reopen before repolarization finishes, producing an early afterdepolarization — a bump that can reach threshold and fire a beat in the vulnerable period. Uneven recovery then lets that beat re-enter.",
    figure: null
  },

  "hyperCa-2": {
    detail: "L-type calcium channels are switched off partly by calcium itself: incoming calcium binds calmodulin on the channel and closes it. Raising extracellular calcium delivers that feedback sooner, so the plateau current ends earlier. The plateau is the only part of the action potential that changes, which is why the ST segment shortens while depolarization, QRS width and T shape are untouched.",
    figure: null
  },

  "hypoCa-5": {
    detail: "Use this to tell two long-repolarization pictures apart. Hypocalcemia stretches the plateau, so the flat isoelectric ST segment lengthens while the T wave keeps normal width and shape — a normal T pushed late. Hypokalemia slows phase 3 itself, so the abnormality is in the T (flat or inverted) and a U wave appears. Both may prolong the measured interval; the question is which structure is abnormal.",
    figure: null
  },

  "hypoMg-2": {
    detail: "Magnesium sitting inside the cell normally plugs the potassium channels of the kidney tubule. When magnesium falls, that plug lifts, those channels stay open, and the kidney keeps secreting potassium into the urine no matter how much is replaced. Magnesium is also needed by the Na+/K+ ATPase that pulls potassium back into cells, so replaced potassium is retained poorly as well.",
    figure: null
  }

});
