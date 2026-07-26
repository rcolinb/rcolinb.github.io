/* 22b-conditions-structural.js — structural and pump-failure condition records:
   left ventricular hypertrophy, right ventricular hypertrophy, heart failure with
   reduced ejection fraction, heart failure with preserved ejection fraction, plus
   mechanism deep-dives for selected chain links. */

Object.assign(CARDIAC.content.conditions, {

  "lvh": {
    "id": "lvh",
    "label": "Left ventricular hypertrophy",
    "short": "LVH",
    "group": "structural",
    "level": "advanced",
    "evidence": "A",
    "headline": "Thicker left ventricle, bigger leftward QRS forces — a 12-lead finding, not a rhythm.",
    "chain": [
      {
        "id": "lvh-1",
        "layer": "trigger",
        "label": "Chronic pressure load",
        "text": "Long-standing hypertension or aortic stenosis makes the left ventricle eject against high resistance on every single beat."
      },
      {
        "id": "lvh-2",
        "layer": "cellular",
        "label": "Myocytes thicken the wall inward",
        "text": "Wall stress drives myocytes to add contractile units side by side, so the wall thickens inward and far more muscle sits left and posterior."
      },
      {
        "id": "lvh-3",
        "layer": "conduction",
        "label": "Bigger vector, longer wall to cross",
        "text": "More muscle depolarizing leftward and posteriorly enlarges the net QRS vector, and the thicker wall takes longer to activate inner surface to outer."
      },
      {
        "id": "lvh-4",
        "layer": "ecg",
        "label": "Tall R left, deep S right",
        "text": "So left-facing leads (I, aVL, V5, V6) record taller R waves and right-facing V1 and V2 deeper S waves; the QRS widens slightly and peaks later."
      },
      {
        "id": "lvh-5",
        "layer": "ecg",
        "label": "Repolarization over a thick wall",
        "text": "Repolarization then sweeps abnormally across that thickened wall, which may produce downsloping ST depression with asymmetric T inversion — strain."
      },
      {
        "id": "lvh-6",
        "layer": "mechanical",
        "label": "Stiff chamber, atrial kick matters",
        "text": "A thick ventricle is less compliant, so filling pressure rises for a given volume and the atrial kick supplies a bigger share of filling."
      },
      {
        "id": "lvh-7",
        "layer": "clinical",
        "label": "Voltage is not a diagnosis",
        "text": "Voltage criteria are fairly specific but quite insensitive; body build, lung disease and lead placement move voltage — echocardiography confirms it."
      }
    ],
    "ecgFindings": [
      "Tall R waves in I, aVL, V5 and V6 with deep S waves in V1-V2 may occur.",
      "Slight QRS widening, usually still under 0.12 s, with a later peak may occur.",
      "Downsloping ST depression with asymmetric T inversion laterally may occur.",
      "A wide, notched P wave in lead II (left atrial abnormality) may accompany it.",
      "Left axis deviation may occur, but axis needs limb leads, never one strip."
    ],
    "nonspecific": "Voltage may be normal in real hypertrophy and high in thin healthy young adults — the ECG may look completely normal, or reflect body habitus alone.",
    "mechanical": "Concentric thickening raises stiffness: filling pressure climbs, diastole leans on atrial contraction, and oxygen demand rises with muscle mass.",
    "perfusionNote": "Thicker muscle demands more oxygen while inner-wall supply is squeezed, so demand-supply mismatch may occur even without coronary obstruction.",
    "complications": [
      "Diastolic dysfunction with pulmonary congestion",
      "Atrial fibrillation from chronic left atrial stretch",
      "Angina-type chest pain without coronary obstruction",
      "Ventricular arrhythmia and syncope risk"
    ],
    "nursing": {
      "assess": [
        "Patient first: symptoms, pulse quality, blood pressure, perfusion",
        "Exertional dyspnea, orthopnea, chest discomfort, activity tolerance",
        "Heart and lung sounds; note an S4, crackles, or neck vein distention",
        "Blood pressure trend and adherence to the prescribed regimen"
      ],
      "act": [
        "Verify a 12-lead with correct lead placement before calling voltage",
        "Monitor and document resting blood pressure as ordered",
        "Reinforce sodium, activity and medication-adherence teaching",
        "Pace activity; report exertional chest pain or presyncope"
      ],
      "escalate": "Report new chest pain, syncope, worsening dyspnea, or new ST-T change promptly, with a repeat 12-lead."
    },
    "limits": [
      "Hypertrophy can never be read from a single rhythm lead; it needs a full 12-lead ECG.",
      "The ECG cannot measure wall thickness or mass — echocardiography establishes hypertrophy.",
      "Voltage criteria are insensitive: normal voltage does not rule hypertrophy out.",
      "Obesity, lung disease, effusion and lead misplacement shift voltage on their own.",
      "Strain-pattern ST-T change cannot be separated from ischemia on the ECG alone."
    ],
    "sourceIds": ["src-aha-hypertrophy", "src-goldberger", "src-klabunde"],
    "requiresTwelveLead": true,
    "compare": ["rvh", "hfpef"]
  },

  "rvh": {
    "id": "rvh",
    "label": "Right ventricular hypertrophy",
    "short": "RVH",
    "group": "structural",
    "level": "advanced",
    "evidence": "A",
    "headline": "Right ventricle thick enough to compete electrically — a 12-lead finding, never one lead.",
    "chain": [
      {
        "id": "rvh-1",
        "layer": "trigger",
        "label": "Chronic pulmonary afterload",
        "text": "Pulmonary hypertension, chronic lung disease, repeated pulmonary emboli or a congenital shunt make the right ventricle eject against high resistance."
      },
      {
        "id": "rvh-2",
        "layer": "cellular",
        "label": "The thin right wall thickens",
        "text": "The normally thin right ventricular wall adds muscle to meet that load, so right-sided and anterior muscle mass grows well beyond normal."
      },
      {
        "id": "rvh-3",
        "layer": "conduction",
        "label": "Right forces start to compete",
        "text": "Left ventricular current normally swamps the right, so this shows on the ECG only once right and anterior forces grow large enough to compete."
      },
      {
        "id": "rvh-4",
        "layer": "ecg",
        "label": "Anterior R grows tall",
        "text": "Those forces now travel toward V1 — a tall R in V1 with R taller than S, persistent S waves in I, V5 and V6, and right axis deviation."
      },
      {
        "id": "rvh-5",
        "layer": "ecg",
        "label": "Right-sided repolarization change",
        "text": "Repolarization over the thickened right wall may depress ST segments and invert T waves in V1-V3 and the inferior leads — right-sided strain."
      },
      {
        "id": "rvh-6",
        "layer": "mechanical",
        "label": "Stiff, pressure-loaded right ventricle",
        "text": "A pressure-loaded right ventricle fills poorly and empties incompletely, so systemic venous pressure rises and left-sided filling falls with it."
      },
      {
        "id": "rvh-7",
        "layer": "clinical",
        "label": "Same picture, other causes",
        "text": "A tall R in V1 also comes from posterior infarction, right bundle branch block, an accessory pathway or misplaced leads — echocardiography settles it."
      }
    ],
    "ecgFindings": [
      "A tall R wave in V1, with R taller than S, may occur on a 12-lead.",
      "Right axis deviation may occur; axis needs limb leads, never one strip.",
      "Persistent S waves in leads I, V5 and V6 may occur.",
      "ST depression with T inversion in V1-V3 or inferior leads may occur.",
      "A tall, peaked P wave in II, III and aVF may occur with right atrial enlargement."
    ],
    "nonspecific": "Early right-sided hypertrophy is often electrically silent, and the same V1 pattern may come from infarction, bundle branch block, or misplaced leads.",
    "mechanical": "The pressure-loaded right ventricle dilates and moves less blood forward: systemic venous congestion rises while pulmonary transit and left-sided filling fall.",
    "perfusionNote": "Less blood crossing the lungs means less left ventricular filling, so cardiac output and blood pressure may fall despite a normal left ventricle.",
    "complications": [
      "Right-sided failure with edema and hepatic congestion",
      "Low cardiac output as right ventricular output falls",
      "Atrial arrhythmia from right atrial stretch",
      "Poor tolerance of hypoxemia, acidosis and volume loading"
    ],
    "nursing": {
      "assess": [
        "Patient first: work of breathing, oxygen saturation, pulse, perfusion",
        "Neck vein distention, peripheral edema, abdominal fullness, liver edge",
        "Daily weight, intake and output, and tolerance of activity",
        "Oxygenation history: chronic lung disease, sleep apnea, prior embolism"
      ],
      "act": [
        "Obtain a 12-lead with verified lead placement before calling this",
        "Support oxygenation as ordered; hypoxemia raises pulmonary pressure",
        "Position for breathing comfort and pace activity to tolerance",
        "Document weight, edema and oxygen requirement each shift"
      ],
      "escalate": "Report a rising oxygen requirement, new or worsening edema, syncope, or a falling blood pressure."
    },
    "limits": [
      "Right ventricular hypertrophy can never be read from a single rhythm lead.",
      "Criteria are insensitive: a normal ECG does not exclude right ventricular hypertrophy.",
      "The ECG cannot measure pulmonary artery pressure or right ventricular size.",
      "A tall R in V1 has several causes the ECG alone cannot separate.",
      "Right-sided strain change cannot be distinguished from ischemia on the ECG."
    ],
    "sourceIds": ["src-aha-hypertrophy", "src-surawicz", "src-klabunde"],
    "requiresTwelveLead": true,
    "compare": ["lvh", "hfref"]
  },

  "hfref": {
    "id": "hfref",
    "label": "Heart failure with reduced ejection fraction",
    "short": "HFrEF",
    "group": "failure",
    "level": "basic",
    "evidence": "X",
    "headline": "Weak, dilated left ventricle: low stroke volume, low ejection fraction. No ECG shows it.",
    "chain": [
      {
        "id": "hfref-1",
        "layer": "trigger",
        "label": "Muscle injured or overloaded",
        "text": "Infarction, chronic ischemia, uncontrolled hypertension, valve disease or cardiomyopathy leaves left ventricular muscle unable to shorten normally."
      },
      {
        "id": "hfref-2",
        "layer": "cellular",
        "label": "Each contraction ejects less",
        "text": "Impaired calcium handling and cross-bridge work mean systole empties the chamber less completely, so the volume left behind at end-systole rises."
      },
      {
        "id": "hfref-3",
        "layer": "mechanical",
        "label": "Stroke volume and fraction fall",
        "text": "Stroke volume is end-diastolic minus end-systolic volume, so a larger leftover volume drops stroke volume and drops ejection fraction with it."
      },
      {
        "id": "hfref-4",
        "layer": "mechanical",
        "label": "Chamber dilates, pressures rise",
        "text": "That retained blood stretches the ventricle; it dilates, wall stress climbs, and diastolic and left atrial pressures back up into the lungs."
      },
      {
        "id": "hfref-5",
        "layer": "clinical",
        "label": "Compensation costs oxygen",
        "text": "Sympathetic and renin-angiotensin-aldosterone activation raise rate, vessel tone and fluid retention — pressure holds, demand and afterload worsen."
      },
      {
        "id": "hfref-6",
        "layer": "clinical",
        "label": "Congestion plus low forward flow",
        "text": "High filling pressures push fluid into lungs and periphery while forward flow stays low — dyspnea, fatigue, edema and falling activity tolerance."
      },
      {
        "id": "hfref-7",
        "layer": "ecg",
        "label": "No heart-failure ECG exists",
        "text": "No waveform diagnoses heart failure — the ECG may show old infarction, bundle branch block, or nothing. Echocardiography measures ejection fraction."
      }
    ],
    "ecgFindings": [
      "No ECG pattern is specific for heart failure; every finding below may be absent.",
      "Q waves from prior infarction may occur when ischemic injury caused it.",
      "A wide QRS or left bundle branch block may occur and is not diagnostic.",
      "Sinus tachycardia or atrial fibrillation may occur as compensation or trigger.",
      "Hypertrophy voltage or left atrial abnormality may occur on a 12-lead."
    ],
    "nonspecific": "The ECG may be entirely normal in severe heart failure, and abnormal in people whose pumps work fine; only imaging measures ejection fraction.",
    "mechanical": "Weak, dilated ventricle: stroke volume and ejection fraction fall, filling and left atrial pressures rise, and output leans heavily on heart rate.",
    "perfusionNote": "Low forward flow narrows pulse pressure and cools extremities — the strip can look unchanged while output falls, so check pulse and perfusion directly.",
    "complications": [
      "Acute pulmonary edema and respiratory failure",
      "Cardiogenic shock with organ hypoperfusion",
      "Ventricular arrhythmia and sudden cardiac death",
      "Kidney dysfunction and refractory fluid overload"
    ],
    "nursing": {
      "assess": [
        "Patient first: breathing, pulse quality, blood pressure, perfusion",
        "Daily weight — same scale, same time, after voiding; intake and output",
        "Lung and heart sounds; edema, neck vein distention, an S3 gallop",
        "Orthopnea, night-time dyspnea, and any drop in activity tolerance"
      ],
      "act": [
        "Sit the patient upright, support oxygenation as ordered, limit effort",
        "Report weight gain over 2-3 lb in a day or 5 lb in a week",
        "Reinforce sodium, fluid, weight-log and medication-adherence teaching",
        "Cluster care, pace activity, and document response to exertion"
      ],
      "escalate": "Report new or worsening dyspnea, weight gain, hypotension, confusion, or falling urine output."
    },
    "limits": [
      "The ECG cannot measure ejection fraction, stroke volume, filling pressure or output.",
      "A normal ECG does not rule heart failure out; an abnormal one does not confirm it.",
      "Rhythm alone never tells you whether the patient is perfusing — palpate a pulse.",
      "Only echocardiography or comparable imaging quantifies ventricular function.",
      "Symptom severity and ECG appearance track each other poorly in heart failure."
    ],
    "sourceIds": ["src-hf-guideline", "src-klabunde", "src-lewis"],
    "requiresTwelveLead": false,
    "compare": ["hfpef", "lvh"]
  },

  "hfpef": {
    "id": "hfpef",
    "label": "Heart failure with preserved ejection fraction",
    "short": "HFpEF",
    "group": "failure",
    "level": "basic",
    "evidence": "X",
    "headline": "Stiff ventricle fills poorly at high pressure — the fraction is normal, the heart is not.",
    "chain": [
      {
        "id": "hfpef-1",
        "layer": "trigger",
        "label": "Chronic stiffening",
        "text": "Hypertension, aging, diabetes, obesity and hypertrophy stiffen the ventricular wall and the connective tissue woven between the muscle cells."
      },
      {
        "id": "hfpef-2",
        "layer": "cellular",
        "label": "Compliance falls",
        "text": "Fibrosis and thicker walls mean the chamber gains less volume for each unit of pressure — compliance falls, so filling now costs pressure."
      },
      {
        "id": "hfpef-3",
        "layer": "mechanical",
        "label": "High pressure, small volume",
        "text": "Diastole therefore ends at a high pressure but a smaller end-diastolic volume, so preload is limited and stroke volume is limited with it."
      },
      {
        "id": "hfpef-4",
        "layer": "mechanical",
        "label": "The fraction still reads normal",
        "text": "Ejection fraction is stroke volume over end-diastolic volume; both shrank together, so the fraction still reads normal while stroke volume has fallen."
      },
      {
        "id": "hfpef-5",
        "layer": "mechanical",
        "label": "Rate and atrial kick matter more",
        "text": "Tachycardia shortens diastole, and a stiff ventricle needs that time plus the atrial kick, so a fast rate or atrial fibrillation cuts filling sharply."
      },
      {
        "id": "hfpef-6",
        "layer": "clinical",
        "label": "Pressure backs into the lungs",
        "text": "That high diastolic pressure passes back to the left atrium and pulmonary veins, so congestion and exertional dyspnea appear with a normal fraction."
      },
      {
        "id": "hfpef-7",
        "layer": "ecg",
        "label": "The ECG cannot see filling",
        "text": "No ECG finding diagnoses it; hypertrophy voltage or left atrial abnormality may appear, but diastolic filling is an echocardiographic measurement."
      }
    ],
    "ecgFindings": [
      "No ECG finding is specific for heart failure with preserved ejection fraction.",
      "Left ventricular hypertrophy voltage may occur on a 12-lead, or may not.",
      "A wide, notched P wave in lead II (left atrial abnormality) may occur.",
      "Atrial fibrillation may occur, and is tolerated especially poorly here.",
      "Sinus tachycardia may occur and itself worsens filling."
    ],
    "nonspecific": "The ECG may look completely normal in symptomatic disease, and these same findings occur in people without heart failure, so they confirm nothing.",
    "mechanical": "Small, stiff, high-pressure filling: end-diastolic and stroke volume fall together, so a normal fraction can sit on high filling pressure and little reserve.",
    "perfusionNote": "Preserved ejection fraction never means normal output, normal filling pressure, or normal perfusion — assess pulse, pressure and end-organ signs directly.",
    "complications": [
      "Rapid pulmonary edema with hypertension or tachycardia",
      "Sharp decompensation when atrial fibrillation begins",
      "Exercise intolerance and repeat hospitalization",
      "Poor tolerance of both fluid loading and volume depletion"
    ],
    "nursing": {
      "assess": [
        "Patient first: breathing, pulse quality, blood pressure, perfusion",
        "Heart rate and regularity — note any new fast or irregular rhythm",
        "Daily weight, intake and output, lung sounds, edema, exertion limits",
        "Blood pressure trend; hypertension drives decompensation here"
      ],
      "act": [
        "Treat a normal ejection fraction as no reassurance; assess perfusion",
        "Report new tachycardia or atrial fibrillation early",
        "Monitor closely during fluid administration; watch work of breathing",
        "Reinforce weight logging, sodium limits and blood pressure control"
      ],
      "escalate": "Report new atrial fibrillation, a rising heart rate, worsening dyspnea, or a rising oxygen need."
    },
    "limits": [
      "Ejection fraction cannot be seen on the ECG; it is an imaging measurement.",
      "A normal ejection fraction does not mean normal output, filling pressure or perfusion.",
      "The rhythm strip shows no preload, no filling pressure and no diastolic function.",
      "The ECG cannot separate this from heart failure with reduced ejection fraction.",
      "Symptom severity does not track the ECG in either heart failure phenotype."
    ],
    "sourceIds": ["src-hf-guideline", "src-klabunde", "src-guyton"],
    "requiresTwelveLead": false,
    "compare": ["hfref", "lvh"]
  }

});

Object.assign(CARDIAC.content.mechanisms, {

  "lvh-3": {
    "detail": "Every depolarizing region adds a small current vector; the ECG records their sum. Thickening the left-posterior-lateral wall adds muscle whose vectors point left, back and down, so the summed QRS vector grows in that direction. The wall is also physically deeper, so the activation wavefront needs longer to travel from inner to outer surface — the QRS widens a little and its peak arrives later.",
    "figure": null
  },

  "lvh-4": {
    "detail": "Lead polarity decides the sign. A lead whose positive electrode faces the enlarged leftward vector (I, aVL, V5, V6) sees the wave coming toward it and writes a taller upward R. A lead facing the opposite way (V1, V2) sees the same enlarged vector going away and writes a deeper downward S. One vector, opposite deflections — which is exactly why a single rhythm lead cannot judge it.",
    "figure": null
  },

  "lvh-5": {
    "detail": "Repolarization normally travels opposite to depolarization, keeping the T wave upright. A thickened wall repolarizes unevenly across its depth, and the inner layer, whose blood supply is squeezed hardest, recovers abnormally. The resulting ST-T vector points away from the thickened wall: downsloping ST depression with asymmetric T inversion in the lateral leads. Ischemia can look identical.",
    "figure": null
  },

  "lvh-7": {
    "detail": "Voltage criteria are fairly specific but insensitive — most people with echocardiographic hypertrophy do not meet them. Voltage also reflects everything between muscle and electrode: chest-wall thickness, adipose tissue, air-trapping lung disease, pericardial or pleural fluid, and electrode position. Echocardiography measures wall thickness and mass; the ECG only suggests.",
    "figure": null
  },

  "rvh-3": {
    "detail": "Left ventricular mass normally exceeds right ventricular mass several times over, so left-directed vectors dominate every beat and the right ventricle is electrically hidden. Right ventricular hypertrophy is therefore a late ECG finding: the right-anterior forces must grow enough to survive the cancellation. A normal ECG never excludes it, and early disease is commonly silent.",
    "figure": null
  },

  "rvh-4": {
    "detail": "V1 sits over the right ventricle. Normally the septum depolarizes left to right, toward V1, writing the small initial r; the much larger left ventricular forces then travel away, writing the deep S. When right-anterior mass grows, those later forces travel toward V1 instead, so R grows until it exceeds S. The same shift leaves persistent S waves in I, V5 and V6 and swings the axis rightward.",
    "figure": null
  },

  "hfref-3": {
    "detail": "Stroke volume = end-diastolic volume - end-systolic volume; ejection fraction = stroke volume / end-diastolic volume. Weak contraction leaves more blood behind, so end-systolic volume climbs. Stroke volume shrinks and, because the denominator does not shrink with it, the fraction falls too. A reduced fraction really does signal weak contraction; a preserved one proves nothing.",
    "figure": null
  },

  "hfref-5": {
    "detail": "Falling output is read by baroreceptors and the kidney as low volume. Sympathetic outflow raises heart rate and contractility; renin-angiotensin-aldosterone signaling constricts vessels and retains sodium and water. Pressure is defended, but a faster rate shortens diastole and raises oxygen demand, vasoconstriction raises afterload, and retained fluid raises the filling pressures already too high.",
    "figure": null
  },

  "hfpef-4": {
    "detail": "Ejection fraction is a ratio, not a volume. If end-diastolic volume falls from a normal value to a much smaller one, an unchanged percentage now represents a smaller stroke volume. The fraction stayed the same because the denominator fell alongside the numerator. Preserved ejection fraction therefore never means normal cardiac output, normal filling pressure, or adequate perfusion.",
    "figure": null
  },

  "hfpef-5": {
    "detail": "Diastole shortens faster than systole as rate rises, and a stiff ventricle fills slowly, so tachycardia steals the time it needs most. Atrial contraction — the atrial kick — contributes a larger share of end-diastolic volume when the ventricle is stiff, so atrial fibrillation removes an outsized share of filling. A fast, irregular rhythm does both, so decompensation can be abrupt.",
    "figure": null
  }

});
