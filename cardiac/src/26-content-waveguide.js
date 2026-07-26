/* 26-content-waveguide.js — what each part of the complex means.
 *
 * Clicking a wave on the tracing pauses there and shows this. Each entry answers
 * three questions in order: what is happening electrically, what the heart is
 * doing mechanically at that same instant, and what a learner should not
 * conclude from it. The mechanical line is the point — it is where "the ECG is
 * not the pump" stops being a slogan and becomes something you can look at.
 */

Object.assign(CARDIAC.content.waveGuide, {

  "p": {
    label: "P wave",
    electrical: "Atrial depolarisation. The impulse has left the SA node and is spreading across both atria; the P wave is that wavefront seen from the body surface.",
    mechanical: "The atria have not contracted yet. Contraction follows depolarisation by a few tens of milliseconds — the electrical event always comes first.",
    caution: "A P wave tells you the atria depolarised. It does not tell you they contracted, or that anything reached the ventricles.",
    spotlight: ["sa-node", "right-atrium", "left-atrium"],
    tags: ["P"]
  },

  "pr": {
    label: "PR segment — the AV delay",
    electrical: "The flat stretch after the P wave is not nothing happening. The impulse is being held in the AV node, whose signal is far too small to register at the body surface.",
    mechanical: "This pause is what the atria contract into. It buys the time for the atrial kick to top up the ventricles before the AV valves shut.",
    caution: "Lengthen this delay and you get first-degree block; interrupt it and a QRS goes missing entirely.",
    spotlight: ["av-node", "right-atrium", "left-atrium", "tricuspid", "mitral"],
    tags: ["P", "QRS"]
  },

  "qrs": {
    label: "QRS complex",
    electrical: "Ventricular depolarisation. The impulse runs down the His bundle, splits into the bundle branches and reaches the Purkinje network, activating the whole ventricular mass in under 0.12 s.",
    mechanical: "Contraction starts just after this, not during it. The AV valves slam shut at the beginning of the squeeze — the first heart sound.",
    caution: "Width is the clue to the route. A wide QRS means the ventricles were reached some way other than the fast pathway.",
    spotlight: ["his-bundle", "right-bundle", "left-bundle", "left-purkinje", "right-purkinje", "left-ventricle"],
    tags: ["QRS"]
  },

  "st": {
    label: "ST segment",
    electrical: "Every part of the ventricular muscle is depolarised at the same time, so there is no voltage difference left to record and the trace sits on the baseline.",
    mechanical: "This is ejection. The semilunar valves are open and most of the stroke volume leaves the ventricles during this quiet-looking stretch of trace.",
    caution: "The flattest part of the tracing is the busiest part of the cardiac cycle. Electrical silence is not mechanical silence.",
    spotlight: ["left-ventricle", "right-ventricle", "aortic", "pulmonic"],
    tags: ["ST"]
  },

  "t": {
    label: "T wave",
    electrical: "Ventricular repolarisation — the muscle resetting its membranes. It is broad and asymmetric because repolarisation is far less synchronous than depolarisation was.",
    mechanical: "Ejection is finishing and the ventricles are relaxing. The semilunar valves close near the end of the T wave, giving the second heart sound.",
    caution: "The T wave is the first thing electrolyte disturbances change, because they act on the currents that end repolarisation.",
    spotlight: ["left-ventricle", "right-ventricle", "aortic"],
    tags: ["T"]
  },

  "u": {
    label: "U wave",
    electrical: "A small deflection after the T, generally attributed to late repolarisation of Purkinje and mid-myocardial cells.",
    mechanical: "Nothing distinct. By now the ventricles are relaxing and filling has begun.",
    caution: "Usually invisible. When it becomes prominent, low potassium is the classic reason to think of.",
    spotlight: ["left-purkinje", "right-purkinje"],
    tags: ["U"]
  },

  "tp": {
    label: "Baseline — electrical diastole",
    electrical: "Nothing is depolarising or repolarising. The tracing rests on the isoelectric line until the next pacemaker impulse.",
    mechanical: "This is when the ventricles do most of their filling, and when the left coronary circulation is perfused. It is the part of the cycle tachycardia steals.",
    caution: "Shorten this and you shorten filling time and coronary perfusion together — which is why a fast rate can hurt a heart that needs both.",
    spotlight: ["right-atrium", "left-atrium", "left-ventricle", "right-ventricle", "mitral", "tricuspid"],
    tags: []
  },

  "flutter": {
    label: "Flutter waves",
    electrical: "A single organised wavefront circling the right atrium, typically around the tricuspid annulus, at roughly 250–350 per minute. The atria never return to baseline between waves, which is why the trace looks like a sawtooth rather than discrete P waves.",
    mechanical: "Atrial contraction is rapid and ineffective. The AV node filters most of these impulses out; only the ones that get through produce a ventricular beat.",
    caution: "This is organised atrial activity, unlike fibrillation. That distinction is the whole point of comparing the two.",
    spotlight: ["right-atrium", "left-atrium", "av-node"],
    tags: []
  },

  "fib": {
    label: "Fibrillatory baseline",
    electrical: "Many reentrant wavelets at once. No single organised atrial depolarisation ever forms, so there is no P wave to find — only a wavering baseline.",
    mechanical: "The atria quiver instead of contracting. The atrial kick is gone, and the ventricle fills only passively.",
    caution: "Looking harder for a P wave will not help. Its absence is the finding.",
    spotlight: ["right-atrium", "left-atrium", "av-node"],
    tags: []
  }
});
