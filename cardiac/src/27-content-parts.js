/* 27-content-parts.js — what each structure in the drawing IS.
 *
 * Hovering a part names it; clicking it opens this text plus a generated
 * sentence about what that part is doing at the instant you paused on. The
 * split matters: what a structure is gets authored once, what it is doing is
 * read from the frame. Authoring a line per part per phase would be a hundred
 * strings that drift out of step with the model the moment anything changes.
 *
 * `ecg` names the wave regions where this structure's activity shows up on the
 * tracing, so clicking a part can highlight the part of the complex it explains.
 * That is the reverse of clicking a wave and having the heart light up, and it
 * is the whole point: the causal link should be walkable in both directions.
 *
 * Several drawn elements collapse onto one part — the aortic arch branches are
 * all "aorta", the two drawn pulmonary veins are one "pulmonary-veins".
 */

Object.assign(CARDIAC.content.parts, {

  /* ----------------------------------------------------------- great veins */

  "svc": {
    label: "Superior vena cava",
    what: "Returns deoxygenated blood from the head, neck and arms to the right atrium. It has no valve, which is why a rise in right atrial pressure is visible as distended neck veins.",
    ecg: []
  },
  "ivc": {
    label: "Inferior vena cava",
    what: "Returns deoxygenated blood from the abdomen and legs to the right atrium. Together the two venae cavae deliver the entire systemic venous return.",
    ecg: []
  },
  "pulmonary-veins": {
    label: "Pulmonary veins",
    what: "Carry oxygenated blood from the lungs back to the left atrium. They are the only veins in the body carrying oxygenated blood.",
    ecg: []
  },

  /* --------------------------------------------------------------- chambers */

  "right-atrium": {
    label: "Right atrium",
    what: "Receives systemic venous return and delivers it to the right ventricle. It holds the sinus node in its wall, so it is both a receiving chamber and the origin of the heartbeat.",
    ecg: ["p", "pr"]
  },
  "left-atrium": {
    label: "Left atrium",
    what: "Receives oxygenated blood from the pulmonary veins and delivers it to the left ventricle. It depolarises slightly after the right, which is why the P wave has two overlapping halves.",
    ecg: ["p", "pr"]
  },
  "right-ventricle": {
    label: "Right ventricle",
    what: "Pumps blood to the lungs against low pulmonary pressure, so its wall is thin. It is the chamber that fails first when pulmonary pressures rise.",
    ecg: ["qrs", "st"]
  },
  "left-ventricle": {
    label: "Left ventricle",
    what: "Pumps blood to the whole body against systemic pressure, so its wall is roughly three times thicker than the right. Its mass dominates the QRS complex.",
    ecg: ["qrs", "st"]
  },
  "septum": {
    label: "Interventricular septum",
    what: "The shared muscular wall between the ventricles. It depolarises first and from left to right, which is what produces the small initial q wave in the lateral leads.",
    ecg: ["qrs"]
  },
  "junction": {
    label: "Atrioventricular junction",
    what: "The fibrous ring the atria sit on and the ventricles hang from. It is electrically insulating: apart from the AV node there is no route through it, which is what forces the impulse to pause.",
    ecg: ["pr"]
  },

  /* ----------------------------------------------------------------- valves */

  "tricuspid": {
    label: "Tricuspid valve",
    what: "Between the right atrium and right ventricle, with three leaflets — which is where the name comes from. It opens to let the ventricle fill and shuts when ventricular pressure rises above atrial pressure.",
    ecg: ["qrs", "tp"]
  },
  "mitral": {
    label: "Mitral valve",
    what: "Between the left atrium and left ventricle, and the only heart valve with two leaflets rather than three. It shuts at the start of ventricular contraction — that closure, with the tricuspid, is the first heart sound.",
    ecg: ["qrs", "tp"]
  },
  "pulmonic": {
    label: "Pulmonic valve",
    what: "Guards the outlet from the right ventricle into the pulmonary trunk. Three cup-shaped cusps that fill and swing shut from above, and it opens only once right ventricular pressure exceeds pulmonary artery pressure.",
    ecg: ["st", "t"]
  },
  "aortic": {
    label: "Aortic valve",
    what: "Guards the outlet from the left ventricle into the aorta, with three cup-shaped cusps like the pulmonic. Its closure, with the pulmonic, is the second heart sound.",
    ecg: ["st", "t"]
  },
  "papillary": {
    label: "Papillary muscles",
    what: "Cone-shaped muscles that spring from the ventricular wall and anchor the chordae. They shorten with the wall around them, keeping tension on the valve rather than pulling it open.",
    ecg: ["qrs", "st"]
  },
  "chordae": {
    label: "Chordae tendineae",
    what: "Fibrous cords running from each papillary muscle to the edge of an AV valve leaflet. They hang slack while the valve is open and snap taut the instant it shuts, which is what stops the leaflets inverting into the atrium.",
    ecg: ["qrs", "st"]
  },

  /* ---------------------------------------------------------- great arteries */

  "aorta": {
    label: "Aorta",
    what: "Carries oxygenated blood from the left ventricle to the body. The coronary arteries leave it just above the valve, and they fill during diastole rather than systole.",
    ecg: ["st", "t"]
  },
  "pulmonary-artery": {
    label: "Pulmonary artery",
    what: "Carries deoxygenated blood from the right ventricle to the lungs. It is the only artery in the body carrying deoxygenated blood, and it passes in front of the aortic root before dividing.",
    ecg: ["st", "t"]
  },


  /* ------------------------------------------------------- conduction system */

  "sa-node": {
    label: "Sinoatrial node",
    what: "The heart's normal pacemaker, in the wall of the right atrium. It depolarises spontaneously about 60 to 100 times a minute and sets the rate unless something faster or a block takes over.",
    ecg: ["p"],
    caution: "The SA node firing produces no deflection of its own. The P wave is the atrial muscle responding to it, not the node itself."
  },
  "av-node": {
    label: "Atrioventricular node",
    what: "The only electrical route from atria to ventricles. It deliberately conducts slowly, holding the impulse long enough for the atria to finish emptying before the ventricles squeeze.",
    ecg: ["pr"],
    caution: "The AV node's own signal is far too small to reach the body surface. The flat PR segment is what its delay looks like — a pause, not a wave."
  },
  "bachmann": {
    label: "Bachmann's bundle",
    what: "The muscular bridge carrying the impulse from the right atrium across to the left, so the two atria depolarise almost together rather than one after the other.",
    ecg: ["p"]
  },
  "his-bundle": {
    label: "Bundle of His",
    what: "Carries the impulse from the AV node through the insulating fibrous ring into the ventricles. It is the only normal electrical connection between the two halves of the heart.",
    ecg: ["pr", "qrs"]
  },
  "right-bundle": {
    label: "Right bundle branch",
    what: "A discrete cord running down the right side of the septum to the right ventricle. Being a single narrow strand, it is the more easily interrupted of the two branches.",
    ecg: ["qrs"]
  },
  "left-bundle": {
    label: "Left bundle branch",
    what: "Fans out over the left side of the septum into anterior and posterior fascicles. Because it activates the septum and the bulk of the ventricular mass, losing it changes the QRS far more than losing the right.",
    ecg: ["qrs"]
  },
  "left-purkinje": {
    label: "Purkinje network — left",
    what: "The fastest-conducting tissue in the heart, spreading activation through the left ventricular wall from the apex upward. It is what lets the whole ventricle contract almost as one unit.",
    ecg: ["qrs"],
    caution: "Depolarising is not contracting. The Purkinje network delivers the signal; the muscle takes a few tens of milliseconds more to respond."
  },
  "right-purkinje": {
    label: "Purkinje network — right",
    what: "Spreads activation through the right ventricular wall from the apex upward. Reaching the ventricles this way, rather than muscle-to-muscle, is what keeps the QRS narrow.",
    ecg: ["qrs"],
    caution: "Depolarising is not contracting. The Purkinje network delivers the signal; the muscle takes a few tens of milliseconds more to respond."
  }
});

/* Several drawn elements are parts of one structure. */
Object.assign(CARDIAC.content.partAlias, {
  "aorta-br1": "aorta",
  "aorta-br2": "aorta",
  "aorta-br3": "aorta",
  "rpa": "pulmonary-artery",
  "lpa": "pulmonary-artery",
  "pv1": "pulmonary-veins",
  "pv2": "pulmonary-veins"
});
