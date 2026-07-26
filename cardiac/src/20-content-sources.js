/* 20-content-sources.js — CARDIAC.content.sources
   The fixed source registry (21 records). Every other content file cites these ids and
   only these ids. Reference style is APA-based, with one deliberate deviation: the very
   long author lists on the multisociety statements and guidelines are abbreviated with an
   ellipsis before the final author rather than listed in full, so every entry stays one
   readable line. Each record resolves through its DOI or publisher.
   `verified:true` means the bibliographic record was confirmed against an indexed database
   during authoring; `verified:false` means the record is written from fields the author is
   certain of but was not machine-confirmed. */

CARDIAC.content.sources = CARDIAC.content.sources || [];

[].push.apply(CARDIAC.content.sources, [

  {
    id: "src-aha-std",
    cite: "Kligfield, P., Gettes, L. S., Bailey, J. J., Childers, R., Deal, B. J., Hancock, E. W., ... Wagner, G. S. (2007). Recommendations for the standardization and interpretation of the electrocardiogram: Part I: The electrocardiogram and its technology. Circulation, 115(10), 1306-1324. https://doi.org/10.1161/CIRCULATIONAHA.106.180200",
    note: "Backs how a lead is derived, what electrode placement and the calibration grid mean, and the standard interval conventions used throughout the simulator.",
    verified: true
  },

  {
    id: "src-aha-ischemia",
    cite: "Wagner, G. S., Macfarlane, P., Wellens, H., Josephson, M., Gorgels, A., Mirvis, D. M., ... van Herpen, G. (2009). AHA/ACCF/HRS recommendations for the standardization and interpretation of the electrocardiogram: Part VI: Acute ischemia/infarction. Circulation, 119(10), e262-e270. https://doi.org/10.1161/CIRCULATIONAHA.108.191098",
    note: "Backs the ST-segment content and, more importantly, the stated limit that ischemia cannot be localized from a single monitoring lead.",
    verified: true
  },

  {
    id: "src-aha-hypertrophy",
    cite: "Hancock, E. W., Deal, B. J., Mirvis, D. M., Okin, P., Kligfield, P., Gettes, L. S., ... Wellens, H. (2009). AHA/ACCF/HRS recommendations for the standardization and interpretation of the electrocardiogram: Part V: Electrocardiogram changes associated with cardiac chamber hypertrophy. Circulation, 119(10), e251-e261. https://doi.org/10.1161/CIRCULATIONAHA.108.191097",
    note: "Backs the left- and right-ventricular hypertrophy content, including the low sensitivity of voltage findings and the requirement for a full 12-lead recording.",
    verified: true
  },

  {
    id: "src-aha-intervals",
    cite: "Rautaharju, P. M., Surawicz, B., Gettes, L. S., Bailey, J. J., Childers, R., Deal, B. J., ... Wellens, H. (2009). AHA/ACCF/HRS recommendations for the standardization and interpretation of the electrocardiogram: Part IV: The ST segment, T and U waves, and the QT interval. Circulation, 119(10), e241-e250. https://doi.org/10.1161/CIRCULATIONAHA.108.191096",
    note: "Backs T-wave and U-wave morphology, QT measurement and rate correction, and the repolarization changes described in the electrolyte conditions.",
    verified: true
  },

  {
    id: "src-goldberger",
    cite: "Goldberger, A. L., Goldberger, Z. D., & Shvilkin, A. (2018). Goldberger's clinical electrocardiography: A simplified approach (9th ed.). Elsevier.",
    note: "General reference for waveform genesis, lead vectors, and the systematic strip-reading method taught in the rhythm-detective lesson.",
    verified: false
  },

  {
    id: "src-surawicz",
    cite: "Surawicz, B., & Knilans, T. K. (2008). Chou's electrocardiography in clinical practice: Adult and pediatric (6th ed.). Saunders/Elsevier.",
    note: "Comprehensive reference for arrhythmia mechanisms, conduction-delay patterns, and the variability of electrolyte-associated ECG findings.",
    verified: false
  },

  {
    id: "src-weiss-k",
    cite: "Weiss, J. N., Qu, Z., & Shivkumar, K. (2017). Electrophysiology of hypokalemia and hyperkalemia. Circulation: Arrhythmia and Electrophysiology, 10(3), Article e004667. https://doi.org/10.1161/CIRCEP.116.004667",
    note: "Backs the ion-level causal chains for potassium: resting potential, sodium-channel availability, phase 3 conductance, and why surface findings are inconsistent.",
    verified: true
  },

  {
    id: "src-klabunde",
    cite: "Klabunde, R. E. (2021). Cardiovascular physiology concepts (3rd ed.). Wolters Kluwer.",
    note: "Backs the hemodynamic chains: preload, afterload, contractility, the Frank-Starling relation, and rate-dependent filling time.",
    verified: false
  },

  {
    id: "src-guyton",
    cite: "Hall, J. E., & Hall, M. E. (2021). Guyton and Hall textbook of medical physiology (14th ed.). Elsevier.",
    note: "Backs the cardiac cycle itself: valve timing, pressure-volume events, heart sounds, and the coupling between depolarization and contraction.",
    verified: false
  },

  {
    id: "src-lewis",
    cite: "Harding, M. M., Kwong, J., Hagler, D., & Reinisch, C. (Eds.). (2023). Lewis's medical-surgical nursing: Assessment and management of clinical problems (12th ed.). Elsevier.",
    note: "Backs prelicensure nursing scope: assessment priorities, monitoring, patient teaching, and escalation language in the nursing blocks.",
    verified: false
  },

  {
    id: "src-brunner",
    cite: "Hinkle, J. L., & Cheever, K. H. (2018). Brunner & Suddarth's textbook of medical-surgical nursing (14th ed.). Wolters Kluwer.",
    note: "Second nursing reference for assessment sequencing, complications to watch for, and communication of rhythm changes to the provider.",
    verified: false
  },

  {
    id: "src-acls",
    cite: "Wigginton, J. G., Agarwal, S., Bartos, J. A., Coute, R. A., Drennan, I. R., Haamid, A., ... Kurz, M. C. (2025). Part 9: Adult advanced life support: 2025 American Heart Association guidelines for cardiopulmonary resuscitation and emergency cardiovascular care. Circulation, 152(16, Suppl. 2), S538-S577. https://doi.org/10.1161/CIR.0000000000001376",
    note: "Backs the arrest content: shockable versus nonshockable rhythms, the distinction between pulseless ventricular tachycardia and pulseless electrical activity, and the primacy of the pulse check.",
    verified: true
  },

  {
    id: "src-af-guideline",
    cite: "Joglar, J. A., Chung, M. K., Armbruster, A. L., Benjamin, E. J., Chyou, J. Y., Cronin, E. M., ... Van Wagoner, D. R. (2024). 2023 ACC/AHA/ACCP/HRS guideline for the diagnosis and management of atrial fibrillation: A report of the American College of Cardiology/American Heart Association Joint Committee on Clinical Practice Guidelines. Circulation, 149(1), e1-e156. https://doi.org/10.1161/CIR.0000000000001193",
    note: "Backs atrial fibrillation and flutter content: loss of atrial contraction, stasis and thromboembolic risk, and why anticoagulation decisions are risk-based rather than antiplatelet-based.",
    verified: true
  },

  {
    id: "src-svt-guideline",
    cite: "Page, R. L., Joglar, J. A., Caldwell, M. A., Calkins, H., Conti, J. B., Deal, B. J., ... Al-Khatib, S. M. (2016). 2015 ACC/AHA/HRS guideline for the management of adult patients with supraventricular tachycardia: A report of the American College of Cardiology/American Heart Association Task Force on Clinical Practice Guidelines and the Heart Rhythm Society. Circulation, 133(14), e506-e574. https://doi.org/10.1161/CIR.0000000000000311",
    note: "Backs the narrow-complex tachycardia content: reentry as the usual mechanism, the effect of rate on filling, and stability-driven escalation.",
    verified: true
  },

  {
    id: "src-brady-guideline",
    cite: "Kusumoto, F. M., Schoenfeld, M. H., Barrett, C., Edgerton, J. R., Ellenbogen, K. A., Gold, M. R., ... Varosy, P. D. (2019). 2018 ACC/AHA/HRS guideline on the evaluation and management of patients with bradycardia and cardiac conduction delay: A report of the American College of Cardiology/American Heart Association Task Force on Clinical Practice Guidelines and the Heart Rhythm Society. Circulation, 140(8), e382-e482. https://doi.org/10.1161/CIR.0000000000000628",
    note: "Backs sinus bradycardia, the atrioventricular blocks, and conduction delay: where the block sits, escape-rhythm reliability, and symptom-driven urgency.",
    verified: true
  },

  {
    id: "src-hf-guideline",
    cite: "Heidenreich, P. A., Bozkurt, B., Aguilar, D., Allen, L. A., Byun, J. J., Colvin, M. M., ... Yancy, C. W. (2022). 2022 AHA/ACC/HFSA guideline for the management of heart failure: A report of the American College of Cardiology/American Heart Association Joint Committee on Clinical Practice Guidelines. Circulation, 145(18), e895-e1032. https://doi.org/10.1161/CIR.0000000000001063",
    note: "Backs the reduced- and preserved-ejection-fraction conditions and the reasons a rhythm change is tolerated poorly in a failing pump.",
    verified: true
  },

  {
    id: "src-mayer",
    cite: "Mayer, R. E. (2009). Multimedia learning (2nd ed.). Cambridge University Press.",
    note: "Design basis for pairing the animated heart with short spoken-register text rather than dense on-screen paragraphs.",
    verified: false
  },

  {
    id: "src-sweller",
    cite: "Sweller, J., van Merriënboer, J. J. G., & Paas, F. (2019). Cognitive architecture and instructional design: 20 years later. Educational Psychology Review, 31(2), 261-292. https://doi.org/10.1007/s10648-019-09465-5",
    note: "Design basis for the one-sentence-per-step lesson format, staged causal chains, and the deliberate limit on simultaneous on-screen elements.",
    verified: false
  },

  {
    id: "src-ncsbn",
    cite: "National Council of State Boards of Nursing. (2023). 2023 NCLEX-RN test plan. NCSBN.",
    note: "Defines the clinical judgment steps (recognize cues through evaluate outcomes) used to tag every practice question in this product.",
    verified: false
  },

  {
    id: "src-swets",
    cite: "Green, D. M., & Swets, J. A. (1966). Signal detection theory and psychophysics. Wiley.",
    note: "Framework for teaching that a monitor finding is a signal with false alarms and misses, so artifact must be considered alongside true rhythm change.",
    verified: false
  },

  {
    id: "src-wcag",
    cite: "World Wide Web Consortium. (2023). Web content accessibility guidelines (WCAG) 2.2. W3C Recommendation. https://www.w3.org/TR/WCAG22/",
    note: "Accessibility target for this interface: contrast, keyboard operability, motion control, and never encoding meaning by color alone.",
    verified: false
  }

]);
