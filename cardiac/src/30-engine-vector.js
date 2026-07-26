/* 30-engine-vector.js — lead geometry and dipole projection.
 *
 * The heart's electrical activity is modelled as one net dipole vector that
 * changes direction and magnitude through the beat. Every lead is a projection
 * of that vector onto an axis. This is why all twelve leads stay synchronised
 * for free, why Einthoven's law holds exactly, and why a structural change that
 * enlarges one vector changes several leads in a coordinated way.
 *
 * Body axes:  +x = patient's LEFT, +y = INFERIOR (feet), +z = ANTERIOR (front).
 *
 * Illustrative model. Amplitudes are calibrated so a normal Lead II R wave is
 * about 1 mV; they are not measurements from any patient.
 */
(function (C) {
  "use strict";

  var M = C.M;
  var DEG = Math.PI / 180;

  function frontal(deg) { return [Math.cos(deg * DEG), Math.sin(deg * DEG), 0]; }
  function horizontal(deg) { return [Math.cos(deg * DEG), 0, Math.sin(deg * DEG)]; }

  /* Lead axes.
   * Frontal plane (hexaxial): I 0°, II 60°, III 120°, aVR -150°, aVL -30°, aVF 90°.
   * Horizontal plane: angle measured from the patient's left toward the front,
   * so V6 looks left and V1 looks right-and-forward.
   *
   * `gain` is a proximity factor: chest electrodes sit close to the heart and
   * see larger deflections than the far-field limb electrodes. It is an
   * illustrative correction, not a physical constant.
   */
  var AXES = {
    I:  { v: frontal(0),   gain: 1.00, plane: "frontal",    angle: 0,    pos: "left arm" },
    II: { v: frontal(60),  gain: 1.00, plane: "frontal",    angle: 60,   pos: "left leg" },
    V1: { v: horizontal(115), gain: 1.35, plane: "horizontal", angle: 115, pos: "4th ICS, right sternal border" },
    V2: { v: horizontal(94),  gain: 2.00, plane: "horizontal", angle: 94,  pos: "4th ICS, left sternal border" },
    V3: { v: horizontal(66),  gain: 2.00, plane: "horizontal", angle: 66,  pos: "between V2 and V4" },
    V4: { v: horizontal(45),  gain: 1.80, plane: "horizontal", angle: 45,  pos: "5th ICS, midclavicular line" },
    V5: { v: horizontal(23),  gain: 1.45, plane: "horizontal", angle: 23,  pos: "5th ICS, anterior axillary line" },
    V6: { v: horizontal(0),   gain: 1.20, plane: "horizontal", angle: 0,   pos: "5th ICS, midaxillary line" }
  };

  /* Display metadata for every lead, including the four derived limb leads. */
  var LEAD_INFO = {
    I:   { plane: "frontal", angle: 0,    view: "lateral wall (left side)" },
    II:  { plane: "frontal", angle: 60,   view: "inferior wall — the rhythm lead" },
    III: { plane: "frontal", angle: 120,  view: "inferior wall" },
    aVR: { plane: "frontal", angle: -150, view: "heart seen from the right shoulder" },
    aVL: { plane: "frontal", angle: -30,  view: "high lateral wall" },
    aVF: { plane: "frontal", angle: 90,   view: "inferior wall" },
    V1:  { plane: "horizontal", angle: 115, view: "right ventricle and septum" },
    V2:  { plane: "horizontal", angle: 94,  view: "septum" },
    V3:  { plane: "horizontal", angle: 66,  view: "anterior wall" },
    V4:  { plane: "horizontal", angle: 45,  view: "anterior wall / apex" },
    V5:  { plane: "horizontal", angle: 23,  view: "lateral wall" },
    V6:  { plane: "horizontal", angle: 0,   view: "lateral wall" }
  };

  /* Project a dipole onto every lead.
   * I and II are projected directly. III, aVR, aVL and aVF are then derived
   * arithmetically, which is what guarantees II = I + III exactly. */
  function project(d, out) {
    out = out || {};
    var i = M.dot3(AXES.I.v, d);
    var ii = M.dot3(AXES.II.v, d);
    out.I = i;
    out.II = ii;
    out.III = ii - i;
    out.aVR = -(i + ii) / 2;
    out.aVL = i - ii / 2;
    out.aVF = ii - i / 2;
    for (var n = 0; n < 6; n++) {
      var k = C.PRECORDIAL[n], a = AXES[k];
      out[k] = M.dot3(a.v, d) * a.gain;
    }
    return out;
  }

  /* Project onto one named lead. */
  function projectLead(d, lead) {
    if (AXES[lead]) return M.dot3(AXES[lead].v, d) * AXES[lead].gain;
    var i = M.dot3(AXES.I.v, d), ii = M.dot3(AXES.II.v, d);
    if (lead === "III") return ii - i;
    if (lead === "aVR") return -(i + ii) / 2;
    if (lead === "aVL") return i - ii / 2;
    if (lead === "aVF") return ii - i / 2;
    return 0;
  }

  /* Unit vector of a lead axis in its own plane, for the lead-lens overlay. */
  function axisUnit(lead) {
    var info = LEAD_INFO[lead];
    var a = info.angle * DEG;
    return { x: Math.cos(a), y: Math.sin(a), plane: info.plane };
  }

  /* Mean frontal-plane QRS axis of a beat, in degrees, from net area under the
   * curve in leads I and aVF. This is how axis is actually estimated. */
  function frontalAxis(samplesI, samplesAVF) {
    var sx = 0, sy = 0, n = samplesI.length;
    for (var k = 0; k < n; k++) { sx += samplesI[k]; sy += samplesAVF[k]; }
    if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) return null;
    return Math.atan2(sy, sx) / DEG;
  }

  function axisLabel(deg) {
    if (deg === null) return "not determinable";
    if (deg >= -30 && deg <= 90) return "normal axis";
    if (deg > 90 && deg <= 180) return "right axis deviation";
    if (deg < -30 && deg >= -90) return "left axis deviation";
    return "extreme axis";
  }

  C.engine.vector = {
    AXES: AXES,
    LEAD_INFO: LEAD_INFO,
    project: project,
    projectLead: projectLead,
    axisUnit: axisUnit,
    frontalAxis: frontalAxis,
    axisLabel: axisLabel,
    frontal: frontal,
    horizontal: horizontal
  };
})(window.CARDIAC);
