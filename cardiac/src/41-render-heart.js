/* 41-render-heart.js — the layered heart.
 *
 * The SVG is built once and then only attributes change, so a whole beat costs
 * a handful of path updates. Every moving thing reads the frame snapshot: no
 * layer keeps its own clock, and nothing animates on its own.
 */
(function (C) {
  "use strict";

  var M = C.M, GEO = C.geometry, G = GEO.G;

  /* How long the wavefront takes to cross the whole Purkinje network, and
   * how many activation samples are shared across the fibres to model it. */
  var PURKINJE_SPREAD_MS = 38, PURKINJE_TAPS = 8;
  var NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /* Great vessels are stable scaffolding — drawn once, never morphed. */
  /* Great vessels, drawn as stroked tubes and layered so the crossings read
   * correctly: the pulmonary trunk passes in front of the aortic root, and the
   * aortic arch passes over the pulmonary bifurcation. */
  var VESSELS = [
    // behind the chambers
    { id: "svc", cls: "deox", w: 29, layer: 0, d: "M198,12 C198,58 197,102 196,150" },
    /* The inferior vena cava really does run behind the ventricular mass, but in
     * a flat frontal cutaway that hides the thing a learner needs to see: where
     * systemic venous return actually arrives. Held lateral to the right
     * ventricle's silhouette until the ventricle has ended, it still enters the
     * right atrium from below and the junction is visible. */
    { id: "ivc", cls: "deox", w: 26, layer: 0, d: "M104,516 C100,442 96,368 96,290 C96,262 110,240 142,234" },
    /* Two drawn, though there are four in a real heart. Drawing all four added
     * lines without adding anything a learner of this material needs: the point
     * here is only that oxygenated blood arrives at the left atrium. */
    { id: "pv1", cls: "ox", w: 15, layer: 0, d: "M470,150 C438,158 410,166 384,176" },
    { id: "pv2", cls: "ox", w: 15, layer: 0, d: "M466,230 C438,220 410,208 384,202" },

    /* Pulmonary branches BEFORE the aorta, so the arch paints over them.
     * The right branch passes behind the ascending aorta and the left branch
     * runs underneath the arch — the ligamentum arteriosum is exactly that gap.
     * Drawn the other way round, the left branch lay across the arch and read as
     * deoxygenated blood running through the aorta. */
    { id: "rpa", cls: "deox", w: 15, layer: 1, d: "M250,150 C218,120 188,108 162,112" },
    { id: "lpa", cls: "deox", w: 15, layer: 1, d: "M250,150 C278,136 304,128 328,130" },

    // aortic root and arch, in front of the atria and of both pulmonary branches
    { id: "aorta", cls: "ox", w: 25, layer: 1,
      d: "M271,250 C271,216 272,180 284,152 C302,110 350,88 380,112 C404,131 412,158 414,190" },
    { id: "aorta-br1", cls: "ox", w: 11, layer: 1, d: "M314,102 C311,84 310,68 309,54" },
    { id: "aorta-br2", cls: "ox", w: 11, layer: 1, d: "M344,94 C344,78 344,64 344,52" },
    { id: "aorta-br3", cls: "ox", w: 11, layer: 1, d: "M372,104 C376,88 378,74 379,62" },

    // The trunk itself IS anterior to the aortic root, so it stays on top.
    // Springing from the top of the RIGHT VENTRICLE matters: starting it any
    // higher makes it look as though it drains an atrium.
    { id: "pulmonary-artery", cls: "deox", w: 24, layer: 2,
      d: "M187,248 C198,212 220,180 248,152" }
  ];

  function create(host, opts) {
    opts = opts || {};
    host.innerHTML = "";
    var svg = el("svg", {
      viewBox: G.viewBox, class: "heart-svg",
      role: "img", "aria-labelledby": "heartTitle heartDesc",
      preserveAspectRatio: "xMidYMid meet"
    }, host);

    var title = el("title", { id: "heartTitle" }, svg);
    title.textContent = "Semi-anatomic cutaway of the heart";
    var desc = el("desc", { id: "heartDesc" }, svg);
    desc.textContent = "Four chambers, valves, great vessels and the electrical conduction system, animated in step with the ECG.";

    var defs = el("defs", null, svg);
    var glow = el("filter", { id: "condGlow", x: "-60%", y: "-60%", width: "220%", height: "220%" }, defs);
    el("feGaussianBlur", { stdDeviation: "3.4", result: "b" }, glow);
    var mg = el("feMerge", null, glow);
    el("feMergeNode", { in: "b" }, mg);
    el("feMergeNode", { in: "SourceGraphic" }, mg);

    var drop = el("filter", { id: "inFront", x: "-25%", y: "-25%", width: "150%", height: "150%" }, defs);
    el("feDropShadow", { dx: 0, dy: 2.5, stdDeviation: 2.6,
                         "flood-opacity": 0.42, "flood-color": "#2A2118" }, drop);

    /* Deoxygenated blood is hatched as well as coloured, so the two circulations
     * stay distinguishable without relying on a red/blue difference. */
    var hatch = el("pattern", {
      id: "deoxHatch", width: 7, height: 7, patternUnits: "userSpaceOnUse",
      patternTransform: "rotate(45)"
    }, defs);
    el("rect", { width: 7, height: 7, fill: "var(--blood-deox)" }, hatch);
    el("line", { x1: 0, y1: 0, x2: 0, y2: 7, stroke: "var(--myo-edge)",
                 "stroke-width": 2.4, opacity: 0.55 }, hatch);

    var layers = {};
    /* No "pathology" layer: hypertrophy is drawn as real wall-thickness geometry
       rather than a colour wash over the top, so the layer was never populated. */
    ["vessels", "chambers", "vesselsFront", "valves", "flow", "conduction", "wavefront", "labels", "markers"]
      .forEach(function (name) {
        layers[name] = el("g", { class: "layer layer-" + name, "data-layer": name }, svg);
      if (name === "vesselsFront") layers[name].setAttribute("filter", "url(#inFront)");
      });

    /* ---- vessels (static) ----
     * Each is stroked twice: a dark edge first, then the lumen colour. Without
     * the edge a blue vein running past a blue chamber merges into one shape. */
    var vesselEls = {};
    VESSELS.forEach(function (v) {
      // Layer 0 sits behind the chambers; 1 and 2 in front, so the aortic root
      // emerges from the ventricle and the pulmonary trunk crosses in front of it.
      var host = v.layer === 0 ? layers.vessels : layers.vesselsFront;
      el("path", {
        d: v.d, class: "vessel-edge", "stroke-width": v.w + 3.4,
        fill: "none", "stroke-linecap": "round", "aria-hidden": "true"
      }, host);
      vesselEls[v.id] = el("path", {
        d: v.d, class: "vessel vessel-" + v.cls, "data-region": v.id,
        "stroke-width": v.w, fill: "none", "stroke-linecap": "round"
      }, host);
    });

    /* ---- chambers ---- */
    var ch = {};
    /* Each chamber is an outlined cavity with blood that rises and falls inside
     * it, rather than a solid shape that changes size. A level a learner can
     * watch climb during filling and drop during ejection is far easier to read
     * than a silhouette that quietly gets smaller. The wall still moves — both
     * signals point the same way. */
    var clipSeq = 0;
    function chamber(key, cls) {
      var g = el("g", { class: "chamber chamber-" + key, "data-region": key }, layers.chambers);
      var n = ++clipSeq;
      var clip = el("clipPath", { id: "fill" + n }, defs);
      var clipRect = el("rect", { x: -120, y: 0, width: 780, height: 780 }, clip);
      // The surface line has to be clipped to the CAVITY, not to the fill
      // rectangle, or it draws straight across the whole illustration.
      var cavClip = el("clipPath", { id: "cav" + n }, defs);
      var cavClipPath = el("path", {}, cavClip);
      return {
        empty: el("path", { class: "cavity cavity-" + cls, "data-region": key }, g),
        blood: el("path", { class: "blood blood-" + cls, "data-region": key,
                            "clip-path": "url(#fill" + n + ")" }, g),
        surface: el("path", { class: "blood-surface", fill: "none",
                              "clip-path": "url(#cav" + n + ")" }, g),
        clipRect: clipRect, cavClipPath: cavClipPath,
        wall: el("path", { class: "myo", "fill-rule": "evenodd", "data-region": key }, g),
        group: g
      };
    }
    ch.rv = chamber("right-ventricle", "deox");
    ch.lv = chamber("left-ventricle", "ox");

    /* Endocardial detail. Papillary muscles and chordae are the clearest
     * illustration of contraction in the drawing: the muscle shortens with the
     * wall, and the chordae snap taut the instant the valve shuts. */
    ch.detail = {};
    ["right", "left"].forEach(function (side) {
      var g = el("g", { class: "endo endo-" + side,
        "data-region": side === "left" ? "left-ventricle" : "right-ventricle" }, layers.chambers);
      var trab = [], pap = [], chord = [];
      for (var t = 0; t < 10; t++) trab.push(el("path", { class: "trabecula", fill: "none" }, g));
      for (var pmi = 0; pmi < 2; pmi++) {
        pap.push(el("path", { class: "papillary", "data-region": "papillary" }, g));
        chord.push(el("path", { class: "chorda", fill: "none", "data-region": "chordae" }, g));
        chord.push(el("path", { class: "chorda", fill: "none", "data-region": "chordae" }, g));
      }
      ch.detail[side] = { trab: trab, pap: pap, chord: chord };
    });
    // Drawn after the ventricles and before the atria, so the junction reads as
    // the tissue the atria rest on.
    ch.tract = {
      right: el("path", { class: "outflow outflow-deox", "data-region": "right-ventricle" }, layers.chambers),
      left: el("path", { class: "outflow outflow-ox", "data-region": "left-ventricle" }, layers.chambers)
    };
    ch.junction = el("path", { class: "av-junction", "data-region": "junction" }, layers.chambers);
    ch.raAur = el("path", { class: "auricle auricle-deox", "data-region": "right-atrium" }, layers.chambers);
    ch.laAur = el("path", { class: "auricle auricle-ox", "data-region": "left-atrium" }, layers.chambers);
    ch.ra = chamber("right-atrium", "deox");
    ch.la = chamber("left-atrium", "ox");

    /* ---- valves ---- */
    var valveEls = {};
    ["tricuspid", "mitral", "pulmonic", "aortic"].forEach(function (v) {
      var g = el("g", { class: "valve valve-" + v, "data-region": v }, layers.valves);
      var count = (GEO.valveGeometry(0, 1)[v] || {}).leaflets || 2;
      var leaves = [];
      for (var li = 0; li < count; li++) leaves.push(el("path", { class: "leaflet" }, g));
      valveEls[v] = {
        group: g,
        leaves: leaves,
        dot: el("circle", { class: "valve-dot", r: 3.4 }, g)
      };
    });

    /* ---- conduction ---- */
    var cond = {};
    var anchors = GEO.conductionAnchors(1);

    /* No spreading arcs. With three internodal tracts, Bachmann's bundle and a
     * travelling marker all showing the route, arcs drawn through the cavity
     * added clutter without adding information — and depolarisation is the
     * MUSCLE changing state, not rings propagating through space. The atrial
     * wall itself lights instead. */
    cond.atrialGlow = {
      right: el("path", { class: "atrial-glow", "data-region": "right-atrium", fill: "none" }, layers.conduction),
      left: el("path", { class: "atrial-glow", "data-region": "left-atrium", fill: "none" }, layers.conduction)
    };

    /* Fibres radiating out of the sinus node into surrounding atrial muscle. */
    cond.saRadials = GEO.saRadials(anchors).map(function (seg) {
      return el("path", { class: "cond-radial", fill: "none", d: GEO.polyline(seg) }, layers.conduction);
    });

    /* Three internodal tracts rather than one wire, plus Bachmann's bundle
     * carrying the impulse across to the left atrium. */
    var tracts = GEO.internodalTracts(anchors);
    cond.tracts = {};
    ["posterior", "middle", "anterior", "bachmann"].forEach(function (k) {
      cond.tracts[k] = el("path", {
        class: "cond-track cond-tract cond-tract-" + k, fill: "none",
        "data-region": k === "bachmann" ? "bachmann" : "right-atrium",
        d: GEO.smoothOpenPath(tracts[k])
      }, layers.conduction);
    });
    cond.internodal = cond.tracts.anterior;

    cond.his = el("path", { class: "cond-track cond-his", fill: "none", "data-region": "his-bundle" }, layers.conduction);
    cond.rbb = el("path", { class: "cond-track cond-bundle", fill: "none", "data-region": "right-bundle" }, layers.conduction);
    // The left bundle is a sheet that fans into two fascicles, not a cord.
    cond.lbb = el("path", { class: "cond-track cond-bundle", fill: "none", "data-region": "left-bundle" }, layers.conduction);
    cond.lbbAnt = el("path", { class: "cond-track cond-bundle cond-fascicle", fill: "none", "data-region": "left-bundle" }, layers.conduction);
    cond.lbbPost = el("path", { class: "cond-track cond-bundle cond-fascicle", fill: "none", "data-region": "left-bundle" }, layers.conduction);

    cond.purkinje = { left: [], right: [] };
    ["left", "right"].forEach(function (side) {
      GEO.purkinjeTree(side, 1).forEach(function (br) {
        cond.purkinje[side].push({
          node: el("path", {
            class: "cond-purkinje cond-purkinje-" + br.order, fill: "none",
            "data-region": side + "-purkinje", d: GEO.smoothOpenPath(br.pts)
          }, layers.conduction),
          delay: br.delay || 0
        });
      });
    });

    cond.saNode = el("ellipse", {
      class: "node node-sa", "data-region": "sa-node",
      cx: anchors.saNode.x, cy: anchors.saNode.y, rx: 11, ry: 7,
      transform: "rotate(-28 " + anchors.saNode.x + " " + anchors.saNode.y + ")"
    }, layers.conduction);

    cond.avNode = el("ellipse", {
      class: "node node-av", "data-region": "av-node",
      cx: anchors.avNode.x, cy: anchors.avNode.y, rx: 10, ry: 7
    }, layers.conduction);

    /* A bright marker that physically travels the pathway. At 0.05x or 2x a
     * brightness change alone is hard to follow; a moving object is not. */
    cond.wave = el("g", { class: "wavefront-group", opacity: 0 }, layers.wavefront);
    cond.waveHalo = el("circle", { class: "wavefront-halo", r: 13 }, cond.wave);
    cond.waveDot = el("circle", { class: "wavefront", r: 6 }, cond.wave);

    cond.blockMark = el("g", { class: "block-mark", opacity: 0 }, layers.markers);
    el("line", { x1: 236, y1: 224, x2: 264, y2: 250, class: "block-x" }, cond.blockMark);
    el("line", { x1: 264, y1: 224, x2: 236, y2: 250, class: "block-x" }, cond.blockMark);

    cond.ectopicMark = el("circle", { class: "ectopic-mark", r: 13, opacity: 0, cx: 0, cy: 0 }, layers.markers);

    /* ---- flow ----
     * Arrows rather than dots. A moving dot only conveys direction if you watch
     * it for a while; an arrow states it in a single frame, which matters
     * because this product is meant to be paused constantly. The arrows still
     * travel, so motion is preserved — but the information survives the pause.
     *
     * They remain gated on valve state: an arrow drawn across a shut valve
     * would assert flow that is not happening, which is the one thing this
     * layer must never do. */
    var flowEls = {};
    var OX_ROUTES = ["lv-to-aorta", "pulmonary-veins-to-la", "la-to-lv"];
    Object.keys(GEO.FLOW_ROUTES).forEach(function (id) {
      var g = el("g", { class: "flowpath", "data-path": id }, layers.flow);
      var route = GEO.FLOW_ROUTES[id].map(function (p) { return { x: p[0], y: p[1] }; });
      // Replaced below by points sampled off the drawn vessel, so arrows travel
      // the vessel itself rather than a parallel set of typed coordinates that
      // drifts away from it every time the anatomy moves.
      var len = 0;
      for (var i = 1; i < route.length; i++) len += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
      var count = M.clamp(Math.round(len / 52), 2, 6);
      var cls = OX_ROUTES.indexOf(id) >= 0 ? "ox" : "deox";
      var arrows = [];
      for (var k = 0; k < count; k++) {
        var a = el("g", { class: "flow-arrow flow-" + cls, opacity: 0 }, g);
        // A dart: filled head with a short tail, which stays legible at
        // projector distance without swamping the anatomy behind it.
        el("path", { d: "M6,0 L-5,-5 L-2.4,0 L-5,5 Z" }, a);
        arrows.push(a);
      }
      flowEls[id] = { arrows: arrows, route: route, count: count, staticRoute: route };
    });

    /* Trace each flow route along the vessel element it belongs to. Sampling the
     * rendered path is the only way to guarantee the arrows sit IN the vessel:
     * any second set of coordinates is a copy that will fall out of step. */
    var ROUTE_VESSEL = {
      "svc-to-ra":              { id: "svc", to: 1 },
      "ivc-to-ra":              { id: "ivc", to: 1 },
      "pulmonary-veins-to-la":  { id: "pv1", to: 1 },
      "rv-to-pulmonary-artery": { id: "pulmonary-artery", to: 1 },
      "lv-to-aorta":            { id: "aorta", to: 0.86 }
    };
    Object.keys(ROUTE_VESSEL).forEach(function (rid) {
      var spec = ROUTE_VESSEL[rid], vp = vesselEls[spec.id];
      if (!vp || !vp.getTotalLength) return;
      try {
        var total = vp.getTotalLength(), pts = [], STEPS = 14;
        for (var i = 0; i <= STEPS; i++) {
          var pt = vp.getPointAtLength(total * (spec.to * i / STEPS));
          pts.push({ x: pt.x, y: pt.y });
        }
        flowEls[rid].vesselRoute = pts;
      } catch (e) { C.diag.warnings.push("route length unmeasurable: " + e.message); }
    });

    /* ---- labels ---- */
    var labelEls = {};
    Object.keys(GEO.LABELS).forEach(function (key) {
      var L = GEO.LABELS[key];
      var g = el("g", { class: "anno", "data-region": key, opacity: 0 }, layers.labels);
      el("path", { class: "anno-line", d: "M" + L.tx + "," + L.ty + " L" + L.x + "," + L.y }, g);
      el("circle", { class: "anno-dot", cx: L.x, cy: L.y, r: 3 }, g);
      // Left-gutter labels read outward to the left; right-gutter labels
      // outward to the right. Either way the text never sits on the anatomy.
      var t = el("text", {
        class: "anno-text", x: L.tx + (L.tx < 260 ? -6 : 6), y: L.ty + 4,
        "text-anchor": L.tx < 260 ? "end" : "start"
      }, g);
      t.textContent = L.text;
      labelEls[key] = g;
    });

    return {
      svg: svg, layers: layers, vessels: vesselEls, chambers: ch,
      valves: valveEls, cond: cond, flow: flowEls, labels: labelEls,
      lastLabelSet: null, lastFocus: null
    };
  }


  /* Set a chamber's outline, then clip its blood to the volume it holds.
   *
   * Which END the blood retreats toward is not cosmetic — it is the physiology.
   *
   * Ventricles contract APEX FIRST, and the wave travels toward the base where
   * both valves sit. So the apex obliterates first and the last blood sits up
   * against the outflow, on its way out. Anchoring the blood to the top and
   * letting the empty space grow from the apex says that. A falling level would
   * say the opposite — that the chamber drains downward, out of an apex that has
   * no opening in it.
   *
   * Atria are the other way round: they empty DOWNWARD through the AV valve in
   * their floor, so for them a falling level is exactly right.
   */
  function setFill(part, d, pts, volume, lo0, hi0, anchor) {
    part.empty.setAttribute("d", d);
    part.blood.setAttribute("d", d);
    part.cavClipPath.setAttribute("d", d);

    var top = Infinity, bot = -Infinity;
    for (var i = 0; i < pts.length; i++) {
      if (pts[i][1] < top) top = pts[i][1];
      if (pts[i][1] > bot) bot = pts[i][1];
    }
    // Map the chamber's working volume range onto the visible one, so
    // end-diastole reads as nearly full and end-systole as nearly empty.
    var frac = M.clamp((volume - lo0) / (hi0 - lo0), 0.06, 0.97);
    var span = bot - top;
    var edgeY;

    if (anchor === "top") {
      // Blood hangs from the base; the empty apex grows upward as it ejects.
      edgeY = top + span * frac;
      part.clipRect.setAttribute("y", (top - 8).toFixed(1));
      part.clipRect.setAttribute("height", (edgeY - top + 8).toFixed(1));
    } else {
      // Blood sits in the floor; the level falls as it drains out below.
      edgeY = bot - span * frac;
      part.clipRect.setAttribute("y", edgeY.toFixed(1));
      part.clipRect.setAttribute("height", (bot - edgeY + 8).toFixed(1));
    }

    // A visible boundary makes the volume readable even when the blood colour
    // sits close to the chamber behind it. Clipped to the cavity, so it appears
    // only across the width of the chamber it belongs to.
    part.surface.setAttribute("d", "M-120," + edgeY.toFixed(1) + " L660," + edgeY.toFixed(1));
    return edgeY;
  }

  /* ------------------------------------------------------------------ update */

  function update(view, sim, frame) {
    var s = sim.state;
    var lvThick = s.condition === "lvh" ? 1.62 : 1;
    var rvThick = s.condition === "rvh" ? 2.3 : 1;

    /* Cavity volumes -> wall motion. The base descends toward the apex during
     * ejection, which is what the annulus really does. */
    /* Map the physiologic volume range onto most of the available visual range,
     * so a normal beat has an obvious excursion — while a failing ventricle that
     * empties less still visibly moves less. Referencing a FIXED volume window
     * rather than each beat's own extremes is what preserves that difference. */
    var lvVol = frame.volumes.leftVentricle, rvVol = frame.volumes.rightVentricle;
    var excursion = function (v, max) {
      return M.clamp((0.62 - v) / 0.52, 0, 1) * max;
    };
    var lvShrink = excursion(lvVol, 0.66);
    var rvShrink = excursion(rvVol, 0.60);
    var descend = M.clamp(lvShrink / 0.66, 0, 1);

    // Fuller chamber, deeper blood. Gives filling a second visual channel
    // besides shape, which is much easier to read at speed.
    var fullness = function (v) { return M.clamp((v - 0.12) / 0.55, 0, 1); };
    view.chambers.lv.blood.style.setProperty("--fill", fullness(lvVol).toFixed(3));
    view.chambers.rv.blood.style.setProperty("--fill", fullness(rvVol).toFixed(3));

    var lvCav = GEO.lvCavityPoints(lvShrink, descend);
    var lvOut = GEO.lvOuterPoints(lvThick, descend);
    var rvCav = GEO.rvCavityPoints(rvShrink, lvThick, descend);
    var rvOut = GEO.rvOuterPoints(rvThick, lvThick, descend);

    var lvCavD = GEO.smoothClosedPath(lvCav);
    var rvCavD = GEO.smoothClosedPath(rvCav);
    setFill(view.chambers.lv, lvCavD, lvCav, lvVol, 0.10, 0.52, "top");
    setFill(view.chambers.rv, rvCavD, rvCav, rvVol, 0.10, 0.52, "top");
    view.chambers.lv.wall.setAttribute("d", GEO.smoothClosedPath(lvOut) + lvCavD);
    view.chambers.rv.wall.setAttribute("d", GEO.smoothClosedPath(rvOut) + rvCavD);

    var aFill = M.clamp((frame.volumes.atria - 0.45) / 0.45, 0, 1);
    view.chambers.ra.blood.style.setProperty("--fill", aFill.toFixed(3));
    view.chambers.la.blood.style.setProperty("--fill", aFill.toFixed(3));
    var aShrink = M.clamp(frame.volumes.atrialContraction * 0.34, 0, 0.36);
    var quiver = frame.volumes.quiver ? (Math.sin(frame.tMs / 22) * 0.012) : 0;
    var raCav = GEO.atriumPoints(G.ra, aShrink + quiver, 0);
    var laCav = GEO.atriumPoints(G.la, aShrink + quiver, 0);
    var raCavD = GEO.smoothClosedPath(raCav);
    var laCavD = GEO.smoothClosedPath(laCav);
    setFill(view.chambers.ra, raCavD, raCav, frame.volumes.atria, 0.30, 0.95, "bottom");
    setFill(view.chambers.la, laCavD, laCav, frame.volumes.atria, 0.30, 0.95, "bottom");
    view.chambers.ra.wall.setAttribute("d",
      GEO.smoothClosedPath(GEO.atriumPoints({ cx: G.ra.cx, cy: G.ra.cy, rx: G.ra.rx + 9, ry: G.ra.ry + 9 }, aShrink * 0.5, 0)) + raCavD);
    view.chambers.la.wall.setAttribute("d",
      GEO.smoothClosedPath(GEO.atriumPoints({ cx: G.la.cx, cy: G.la.cy, rx: G.la.rx + 9, ry: G.la.ry + 9 }, aShrink * 0.5, 0)) + laCavD);

    /* Valves. openFraction is leaflet travel only; it never decides whether
     * blood may cross. That is the valve's flowPermitted flag. */
    /* Valves. Shut, the leaflets meet in the middle and seal the orifice; open,
     * they swing back against the walls and the orifice is clear. openFraction
     * is leaflet travel only — it never decides whether blood may cross. That is
     * the valve's flowPermitted flag. */
    view.chambers.raAur.setAttribute("d", GEO.smoothClosedPath(GEO.auriclePoints("right", aShrink)));
    view.chambers.laAur.setAttribute("d", GEO.smoothClosedPath(GEO.auriclePoints("left", aShrink)));

    view.chambers.tract.right.setAttribute("d",
      GEO.smoothClosedPath(GEO.outflowTract("right", rvShrink, lvThick, descend)));
    view.chambers.tract.left.setAttribute("d",
      GEO.smoothClosedPath(GEO.outflowTract("left", lvShrink, lvThick, descend)));

    view.chambers.junction.setAttribute("d",
      GEO.smoothClosedPath(GEO.junctionPoints(descend, lvThick)));

    /* Trabeculae, papillary muscles and chordae. The chordae run from each
     * papillary tip to the free edge of the leaflet it restrains, so they are
     * taut whenever the valve is shut and slack when it hangs open — which is
     * exactly what a learner needs to see to understand why the leaflets do not
     * invert when the ventricle squeezes. */
    var vgeo = GEO.valveGeometry(descend, lvThick);
    [["left", lvShrink, "mitral"], ["right", rvShrink, "tricuspid"]].forEach(function (spec) {
      var side = spec[0], shrink = spec[1], det = view.chambers.detail[side];
      var trabs = GEO.trabeculae(side, shrink, lvThick, descend);
      det.trab.forEach(function (el2, i) {
        if (i < trabs.length) { el2.setAttribute("d", GEO.polyline(trabs[i])); el2.setAttribute("opacity", 1); }
        else el2.setAttribute("opacity", 0);
      });

      var paps = GEO.papillary(side, shrink, lvThick, descend);
      var v = frame.valves[spec[2]], geo = vgeo[spec[2]];
      var open = v.openFraction;
      var mid = (geo.x1 + geo.x2) / 2, half = (geo.x2 - geo.x1) / 2;
      var tips = [
        { x: M.lerp(mid, geo.x1 + half * 0.22, open), y: geo.y + geo.span * (1 - 0.45 * open) },
        { x: M.lerp(mid, geo.x2 - half * 0.22, open), y: geo.y + geo.span * (1 - 0.45 * open) }
      ];
      paps.forEach(function (pm, i) {
        det.pap[i].setAttribute("d", GEO.smoothClosedPath(pm.body));
        for (var c = 0; c < 2; c++) {
          var target = tips[c];
          var el3 = det.chord[i * 2 + c];
          var dx = target.x - pm.tip.x, dy = target.y - pm.tip.y;
          var span = Math.hypot(dx, dy);
          // Slack when the valve is open; a straight taut line when it is shut.
          var sag = open * Math.min(16, span * 0.22);
          var mx = pm.tip.x + dx * 0.5 - dy / (span || 1) * sag * 0.35;
          var my = pm.tip.y + dy * 0.5 + sag;
          el3.setAttribute("d", "M" + pm.tip.x.toFixed(1) + "," + pm.tip.y.toFixed(1) +
            " Q" + mx.toFixed(1) + "," + my.toFixed(1) +
            " " + target.x.toFixed(1) + "," + target.y.toFixed(1));
          el3.classList.toggle("is-taut", open < 0.35);
        }
      });
    });

    var vg = GEO.valveGeometry(descend, lvThick);
    ["tricuspid", "mitral", "pulmonic", "aortic"].forEach(function (name) {
      var v = frame.valves[name], geo = vg[name], e = view.valves[name];
      var open = v.openFraction;
      var mid = (geo.x1 + geo.x2) / 2;
      var span = geo.span * geo.axis;
      var n = e.leaves.length;

      /* One stroke per leaflet, hinged at its own share of the annulus and
       * meeting the others near the middle. Shut, the tips converge and seal;
       * open, each retreats toward its hinge and lies back against the wall.
       * With three, the middle cusp sits a little shallower so it reads as the
       * one behind rather than as a line through the other two. */
      e.leaves.forEach(function (leaf, i) {
        var hinge = n === 1 ? geo.x1 : M.lerp(geo.x1, geo.x2, i / (n - 1));
        var inward = hinge <= mid ? 1 : -1;
        var rest = hinge + (mid - hinge) * 0.78;
        var tipX = M.lerp(rest, hinge + inward * Math.abs(mid - hinge) * 0.18, open);
        var depth = (n > 2 && i > 0 && i < n - 1) ? 0.68 : 1;
        var tipY = geo.y + span * depth * (1 - 0.45 * open);
        leaf.setAttribute("d", "M" + hinge.toFixed(1) + "," + geo.y.toFixed(1) +
          " Q" + (M.lerp(hinge, tipX, .55)).toFixed(1) + "," + (geo.y + span * depth * 0.72).toFixed(1) +
          " " + tipX.toFixed(1) + "," + tipY.toFixed(1));
      });

      e.dot.setAttribute("cx", mid);
      e.dot.setAttribute("cy", geo.y);
      e.dot.setAttribute("r", 0);
      e.group.setAttribute("data-open", v.open ? "1" : "0");
      e.group.classList.toggle("is-open", !!v.open);
    });

    /* Conduction. Region intensity comes straight from the event schedule. */
    var anchors = GEO.conductionAnchors(lvThick, descend);
    // The nodes sit on structures that move, so they move too.
    view.cond.avNode.setAttribute("cy", anchors.avNode.y.toFixed(1));
    var cd = frame.conduction;

    setNode(view.cond.saNode, cd["sa-node"]);
    setNode(view.cond.avNode, cd["av-node"]);

    var hisPts = [anchors.hisTop, anchors.hisBottom];
    view.cond.his.setAttribute("d", GEO.smoothOpenPath(hisPts));
    /* The internodal tracts terminate on the AV node, so they have to be
     * repathed as it descends — leaving them static detached them from it by
     * the full descent at peak systole. */
    var liveTracts = GEO.internodalTracts(anchors);
    ["posterior", "middle", "anterior", "bachmann"].forEach(function (k) {
      view.cond.tracts[k].setAttribute("d", GEO.smoothOpenPath(liveTracts[k]));
    });
    view.cond.rbb.setAttribute("d", GEO.smoothOpenPath(GEO.bundlePath(anchors, "right")));
    view.cond.lbb.setAttribute("d", GEO.smoothOpenPath(GEO.bundlePath(anchors, "left")));
    view.cond.lbbAnt.setAttribute("d", GEO.smoothOpenPath(GEO.bundlePath(anchors, "left", "anterior")));
    view.cond.lbbPost.setAttribute("d", GEO.smoothOpenPath(GEO.bundlePath(anchors, "left", "posterior")));

    setTrack(view.cond.his, cd["his-bundle"]);
    setTrack(view.cond.rbb, cd["right-bundle"]);
    setTrack(view.cond.lbb, cd["left-bundle"]);
    setTrack(view.cond.lbbAnt, cd["left-bundle"]);
    setTrack(view.cond.lbbPost, cd["left-bundle"]);
    // The three tracts light in sequence, so the impulse visibly crosses the
    // atrium rather than the whole bundle flashing at once.
    var atrialSt = cd["right-atrium"];
    ["posterior", "middle", "anterior"].forEach(function (k, i) {
      var st = atrialSt ? { level: atrialSt.level * (1 - i * 0.12), state: atrialSt.state } : null;
      setTrack(view.cond.tracts[k], st);
    });
    setTrack(view.cond.tracts.bachmann, cd["left-atrium"] || atrialSt);
    view.cond.saRadials.forEach(function (r) { setTrack(r, cd["sa-node"]); });

    /* Fibres light in sequence, apex first, the way activation really spreads.
     *
     * Two things had to be right for this to render at all. The value is driven
     * through --lvl the way setTrack does for the trunks, because a presentation
     * attribute is the weakest thing in the cascade and the stylesheet was
     * winning. And the delay is applied in TIME rather than as a dimming: the
     * whole Purkinje activation lasts about 22 ms and the level reaches 0.94
     * within four of them, so subtracting each fibre's distance from its
     * brightness squeezed the entire apex-to-base sweep into roughly two
     * milliseconds — present in the numbers, invisible to a learner. Sampling a
     * fibre at (t minus its own travel time) is what conduction delay physically
     * is, and it spreads the sweep across a window you can actually watch.
     *
     * Nine offsets are sampled per frame and interpolated across all sixty
     * fibres, rather than sixty separate activation lookups. */
    var taps = [], q;
    for (q = 0; q <= PURKINJE_TAPS; q++) {
      taps.push(C.engine.frame.regionActivation(
        sim.schedule, frame.tMs - (q / PURKINJE_TAPS) * PURKINJE_SPREAD_MS));
    }
    ["left", "right"].forEach(function (side) {
      var key = side + "-purkinje";
      view.cond.purkinje[side].forEach(function (p) {
        var g = p.delay * PURKINJE_TAPS;
        var i0 = Math.floor(g), i1 = Math.min(PURKINJE_TAPS, i0 + 1);
        var a = taps[i0][key], b = taps[i1][key];
        var v = M.clamp(M.lerp(a ? a.level : 0, b ? b.level : 0, g - i0), 0, 1);
        var s = v.toFixed(3);
        if (p._last !== s) { p.node.style.setProperty("--lvl", s); p._last = s; }
        p.node.classList.toggle("is-active", v > 0.25);
      });
    });

    /* Atrial depolarisation lights the atrial wall itself. The right atrium
     * leads and the left follows via Bachmann's bundle, so they glow in turn
     * rather than together. */
    var atr = cd["right-atrium"], atrL = cd["left-atrium"];
    view.cond.atrialGlow.right.setAttribute("d", raCavD);
    view.cond.atrialGlow.left.setAttribute("d", laCavD);
    [["right", atr, 0], ["left", atrL || atr, 0.28]].forEach(function (spec) {
      var g = view.cond.atrialGlow[spec[0]], st = spec[1];
      var lvl = st ? M.clamp(st.level - spec[2] * 0.5, 0, 1) : 0;
      g.setAttribute("opacity", lvl.toFixed(2));
      g.classList.toggle("is-chaotic", !!st && st.state === "chaotic");
    });

    /* Place the travelling marker on whichever segment of the pathway the
     * impulse currently occupies. The AV node holds it, which is exactly the
     * point of the PR segment, so it sits there and pulses during the delay. */
    var routes = {
      // The marker follows the anterior tract, which is the shortest route from
      // the sinus node to the AV node and the one the impulse effectively takes.
      internodal: GEO.internodalTracts(anchors).anterior,
      his: GEO.hisPath(anchors),
      right: GEO.bundlePath(anchors, "right"),
      left: GEO.bundlePath(anchors, "left")
    };
    var marker = null;
    var pick = function (key, st) {
      if (!st || st.level < 0.08) return;
      marker = { pts: routes[key], u: M.clamp(st.progress, 0, 1), level: st.level, state: st.state };
    };
    pick("internodal", cd["right-atrium"]);
    if (cd["av-node"] && cd["av-node"].level > 0.08) {
      var avSt = cd["av-node"];
      marker = { pts: routes.internodal, u: 1, level: avSt.level, state: avSt.state, hold: true };
    }
    pick("his", cd["his-bundle"]);
    pick("left", cd["left-bundle"]);
    pick("right", cd["right-bundle"]);
    if (cd["left-purkinje"] && cd["left-purkinje"].level > 0.08) {
      marker = { pts: routes.left, u: 1, level: cd["left-purkinje"].level, state: "spread" };
    }

    var chaotic = (cd["right-atrium"] && cd["right-atrium"].state === "chaotic") ||
                  (cd["left-ventricle"] && cd["left-ventricle"].state === "chaotic");
    if (marker && !chaotic && !sim.reducedMotion) {
      var pos = GEO.pointAlong(marker.pts, marker.u);
      view.cond.wave.setAttribute("opacity", (0.35 + 0.65 * marker.level).toFixed(2));
      view.cond.waveDot.setAttribute("cx", pos.x.toFixed(1));
      view.cond.waveDot.setAttribute("cy", pos.y.toFixed(1));
      view.cond.waveHalo.setAttribute("cx", pos.x.toFixed(1));
      view.cond.waveHalo.setAttribute("cy", pos.y.toFixed(1));
      var held = marker.hold ? 1 + 0.22 * Math.sin(frame.tMs / 90) : 1;
      view.cond.waveHalo.setAttribute("r", (11 * held).toFixed(1));
      view.cond.wave.classList.toggle("is-held", !!marker.hold);
      view.cond.wave.classList.toggle("is-blocked", marker.state === "blocked");
    } else {
      view.cond.wave.setAttribute("opacity", 0);
    }

    /* A blocked impulse stops at the node, and says so. */
    var avState = cd["av-node"];
    view.cond.blockMark.setAttribute("opacity", (avState && avState.state === "blocked") ? 1 : 0);

    /* An ectopic beat starts somewhere it should not. Mark where. */
    var ect = null;
    for (var i = 0; i < frame.events.length; i++) {
      var e = frame.events[i];
      if (e.type === "ventricular-depolarization" && e.wide) ect = { x: 352, y: 396 };
      if (e.type === "atrial-depolarization" && e.origin === "ectopic-atrial") ect = { x: 340, y: 200 };
    }
    if (ect) {
      view.cond.ectopicMark.setAttribute("cx", ect.x);
      view.cond.ectopicMark.setAttribute("cy", ect.y);
      view.cond.ectopicMark.setAttribute("opacity", 0.9);
    } else {
      view.cond.ectopicMark.setAttribute("opacity", 0);
    }

    /* Flow. Arrow position derives from simulation time, so Pause freezes them
     * and scrubbing recomputes them — and unlike dots, a frozen arrow still
     * says which way the blood is going. Nothing crosses a shut valve. */
    /* The chamber-side leg of each route is rebuilt from the live geometry, so
     * it stays attached to the valve and the cavity as they move. */
    var leadIn = {
      "rv-to-pulmonary-artery": [
        { x: (vg.tricuspid.x1 + vg.tricuspid.x2) / 2 + 6, y: vg.pulmonic.y + 96 },
        { x: (vg.pulmonic.x1 + vg.pulmonic.x2) / 2 - 6, y: vg.pulmonic.y + 40 },
        { x: (vg.pulmonic.x1 + vg.pulmonic.x2) / 2, y: vg.pulmonic.y + 2 }
      ],
      "lv-to-aorta": [
        { x: (vg.mitral.x1 + vg.mitral.x2) / 2 - 12, y: vg.aortic.y + 104 },
        { x: (vg.aortic.x1 + vg.aortic.x2) / 2 - 4, y: vg.aortic.y + 44 },
        { x: (vg.aortic.x1 + vg.aortic.x2) / 2, y: vg.aortic.y + 2 }
      ],
      "ra-to-rv": [
        { x: (vg.tricuspid.x1 + vg.tricuspid.x2) / 2 + 4, y: vg.tricuspid.y - 46 },
        { x: (vg.tricuspid.x1 + vg.tricuspid.x2) / 2, y: vg.tricuspid.y + 4 },
        { x: (vg.tricuspid.x1 + vg.tricuspid.x2) / 2 - 10, y: vg.tricuspid.y + 62 }
      ],
      "la-to-lv": [
        { x: (vg.mitral.x1 + vg.mitral.x2) / 2 + 4, y: vg.mitral.y - 46 },
        { x: (vg.mitral.x1 + vg.mitral.x2) / 2, y: vg.mitral.y + 4 },
        { x: (vg.mitral.x1 + vg.mitral.x2) / 2 - 12, y: vg.mitral.y + 66 }
      ]
    };
    Object.keys(view.flow).forEach(function (id) {
      var fe = view.flow[id];
      var lead = leadIn[id], tail = fe.vesselRoute;
      fe.route = lead && tail ? lead.concat(tail)
               : lead ? lead
               : tail ? tail
               : fe.staticRoute;
    });

    var reduced = sim.reducedMotion;
    Object.keys(view.flow).forEach(function (id) {
      var f = frame.flow[id], fe = view.flow[id];
      if (!f.active) {
        fe.arrows.forEach(function (a) { a.setAttribute("opacity", 0); });
        return;
      }
      // Reduced motion keeps the arrows, parked at fixed stations. Direction is
      // the information here and it does not require movement to convey.
      var speed = 0.00020 + 0.00040 * f.intensity;
      var phase = reduced ? 0 : (frame.tMs * speed) % 1;
      fe.arrows.forEach(function (a, k) {
        var u = (phase + k / fe.count) % 1;
        var p = GEO.pointAlong(fe.route, u);
        var deg = (p.angle || 0) * 180 / Math.PI;
        var scale = 0.85 + 0.35 * f.intensity;
        a.setAttribute("transform", "translate(" + p.x.toFixed(1) + "," + p.y.toFixed(1) +
                       ") rotate(" + deg.toFixed(1) + ") scale(" + scale.toFixed(2) + ")");
        // Fade in and out at the ends of the route so arrows do not pop into
        // existence mid-vessel.
        var fade = reduced ? 1 : Math.min(1, Math.min(u, 1 - u) * 7);
        a.setAttribute("opacity", (0.45 + 0.55 * f.intensity * fade).toFixed(2));
      });
    });

    /* Re-anchor every label whose target is generated rather than fixed, so a
     * leader line always lands on the structure it names. Hand-typed anchors
     * drift the moment the geometry moves — that is how "Pulmonary artery"
     * ended up pointing at the aorta. */
    var dyn = GEO.labelAnchors(lvThick, descend);

    // Vessels: a point measured along the drawn path itself.
    var VESSEL_AT = { "svc": 0.62, "ivc": 0.42, "aorta": 0.26,
                      "pulmonary-artery": 0.55, "pulmonary-veins": 0.40 };
    /* Any label NOT anchored here keeps its static gutter position, which the
     * hover repositioning below never sees — that is how the coronary label came
     * to hang off the right edge of the narrow crop. */
    var VESSEL_SOURCE = { "pulmonary-veins": "pv1" };
    for (var vk in VESSEL_AT) {
      var vp = view.vessels[VESSEL_SOURCE[vk] || vk];
      if (!vp || !vp.getTotalLength) continue;
      try {
        var pt = vp.getPointAtLength(vp.getTotalLength() * VESSEL_AT[vk]);
        dyn[vk] = { x: pt.x, y: pt.y };
      } catch (e) { C.diag.warnings.push("vessel path unmeasurable: " + e.message); }
    }

    // Chambers: the centre of the shape as it currently stands.
    var CHAMBER_OF = { "right-atrium": "ra", "left-atrium": "la",
                       "right-ventricle": "rv", "left-ventricle": "lv" };
    for (var ck in CHAMBER_OF) {
      var part = view.chambers[CHAMBER_OF[ck]];
      if (!part) continue;
      var cb = part.empty.getBBox();
      dyn[ck] = { x: cb.x + cb.width * 0.5, y: cb.y + cb.height * 0.55 };
    }

    /* Valves: the middle of the annulus, which moves with the valve plane.
     * Offset along the direction the valve OPENS (axis: +1 for the AV valves,
     * -1 for the semilunars), not always downward. Pushing every anchor down
     * shoved the pulmonic label into the top of the tricuspid — it ended up
     * 1.5 px from the wrong valve and 4.5 px from its own. */
    ["tricuspid", "mitral", "aortic", "pulmonic"].forEach(function (vn) {
      var gv = vg[vn];
      dyn[vn] = { x: (gv.x1 + gv.x2) / 2, y: gv.y + gv.span * 0.35 * gv.axis };
    });

    var septS = 0.42;
    dyn.septum = { x: GEO.lvCx(septS) - GEO.lvOuterHalfWidth(septS, lvThick) + 8,
                   y: GEO.lvY(septS, descend) };

    /* Keep the live anchors on the view: the inspector uses them as the
     * proximity fallback for structures too thin to hit natively. */
    view.labelPos = dyn;

    for (var dk in dyn) {
      var lab = view.labels[dk];
      if (!lab) continue;
      var L = GEO.LABELS[dk];
      var dot = lab.querySelector(".anno-dot"), line = lab.querySelector(".anno-line");
      var txt = lab.querySelector(".anno-text");
      dot.setAttribute("cx", dyn[dk].x.toFixed(1));
      dot.setAttribute("cy", dyn[dk].y.toFixed(1));

      /* A label summoned by hovering, with no label set pinned, cannot use the
       * gutters — the drawing is cropped tighter and the text ran off the edge.
       * Widening the crop was the first fix and it was wrong: it rescaled the
       * whole illustration, so the picture jumped every time the pointer moved
       * on or off. Put the text beside the structure instead. The crop never
       * changes, and a name next to the thing it names reads better than one at
       * the end of a long leader line anyway. */
      var beside = (dk === view._hoverLabel) && lab.getAttribute("data-pinned") !== "1";
      var tx = L.tx, ty = L.ty, anchorEnd = L.tx < 260;
      if (beside) {
        var box = (view.svg.getAttribute("viewBox") || "").split(/\s+/).map(Number);
        var right = box.length === 4 ? box[0] + box[2] : 554;
        var left = box.length === 4 ? box[0] : -52;
        var toRight = (right - dyn[dk].x) > (dyn[dk].x - left);
        tx = dyn[dk].x + (toRight ? 20 : -20);
        ty = dyn[dk].y - 10;
        anchorEnd = !toRight;
      }
      line.setAttribute("d", "M" + tx.toFixed(1) + "," + ty.toFixed(1) + " L" +
                        dyn[dk].x.toFixed(1) + "," + dyn[dk].y.toFixed(1));
      if (txt) {
        txt.setAttribute("x", (tx + (anchorEnd ? -6 : 6)).toFixed(1));
        txt.setAttribute("y", (ty + 4).toFixed(1));
        txt.setAttribute("text-anchor", anchorEnd ? "end" : "start");
      }
    }

    /* Pathology: wall thickness is real geometry, not a colour wash. */
    view.chambers.lv.group.classList.toggle("is-hypertrophied", s.condition === "lvh");
    view.chambers.rv.group.classList.toggle("is-hypertrophied", s.condition === "rvh");
  }

  function setNode(node, st) {
    var lvl = st ? st.level : 0;
    node.setAttribute("data-level", lvl.toFixed(2));
    node.style.setProperty("--lvl", lvl.toFixed(3));
    node.classList.toggle("is-active", lvl > 0.15);
    node.classList.toggle("is-blocked", !!st && st.state === "blocked");
    node.classList.toggle("is-delay", !!st && st.state === "delay");
  }

  function setTrack(path, st) {
    var lvl = st ? st.level : 0;
    path.style.setProperty("--lvl", lvl.toFixed(3));
    path.classList.toggle("is-active", lvl > 0.15);
  }

  /* Atrial depolarisation spreads outward from the SA node across both atria.
   * Drawn as expanding arcs rather than two wires, because that is what it is. */
  function arcPath(origin, r) {
    var cx = origin.x, cy = origin.y;
    var a0 = 2.55, a1 = 0.05;   // sweep down-left, round the bottom, up to the left atrium
    return "M" + (cx + r * Math.cos(a0)).toFixed(1) + "," + (cy + r * Math.sin(a0) * 0.82).toFixed(1) +
           " A" + r.toFixed(1) + "," + (r * 0.82).toFixed(1) + " 0 0 0 " +
           (cx + r * Math.cos(a1)).toFixed(1) + "," + (cy + r * Math.sin(a1) * 0.82).toFixed(1);
  }

  /* Focus modes: one relationship at a time. */
  var FOCUS_LAYERS = {
    anatomy:     { vessels: 1, vesselsFront: 1, chambers: 1, valves: 0.85, conduction: 0.55, flow: 0, labels: 1, markers: 0 },
    conduction:  { vessels: 0.30, vesselsFront: 0.30, chambers: 0.40, valves: 0.30, conduction: 1, flow: 0, labels: 1, markers: 1 },
    contraction: { vessels: 0.5, vesselsFront: 0.5, chambers: 1, valves: 1, conduction: 0.22, flow: 0.55, labels: 1, markers: 0 },
    flow:        { vessels: 1, vesselsFront: 1, chambers: 0.88, valves: 1, conduction: 0.10, flow: 1, labels: 1, markers: 0 },
    integrated:  { vessels: 0.95, vesselsFront: 0.95, chambers: 1, valves: 1, conduction: 1, flow: 1, labels: 1, markers: 1 }
  };

  /* With labels off there is no need for the side gutters, so the drawing gets
   * the whole panel. */
  var BOX_LABELLED = "-52 14 606 522";
  /* Classroom text size enlarges the annotation text relative to the drawing,
     which pushed the two longest labels past the right gutter. A slightly wider
     box gives them room without shrinking the heart noticeably. */
  var BOX_LABELLED_LARGE = "-62 14 632 522";
  var BOX_BARE = "86 14 400 522";

  function labelledBox() {
    return document.documentElement.getAttribute("data-size") === "large"
      ? BOX_LABELLED_LARGE : BOX_LABELLED;
  }

  function applyFocus(view, focus, labelSet, highlight) {
    var map = FOCUS_LAYERS[focus] || FOCUS_LAYERS.integrated;
    // Naming conduction structures while the conduction layer is dimmed to a
    // tenth leaves labels pointing at things the learner cannot see.
    if (labelSet === "conduction") {
      map = Object.keys(map).reduce(function (o, k) { o[k] = map[k]; return o; }, {});
      map.conduction = 1;
    }
    var wantsLabels = labelSet && labelSet !== "none";
    view._labelledBox = labelledBox();
    view._restBox = wantsLabels ? view._labelledBox : BOX_BARE;
    view.svg.setAttribute("viewBox", view._restBox);
    map.wavefront = map.conduction;
    Object.keys(view.layers).forEach(function (name) {
      var o = map[name];
      if (o === undefined) o = 1;
      view.layers[name].style.opacity = o;
      view.layers[name].style.pointerEvents = o < 0.2 ? "none" : "";
    });

    var set = GEO.LABEL_SETS[labelSet] || [];
    Object.keys(view.labels).forEach(function (key) {
      var on = set.indexOf(key) >= 0;
      // Remember what the label-set control asked for, so a hover can light one
      // extra label and then put things back exactly as they were.
      view.labels[key].setAttribute("data-pinned", on ? "1" : "0");
      view.labels[key].setAttribute("opacity", on ? 1 : 0);
      view.labels[key].classList.remove("is-hover-label");
    });
    view._hoverLabel = null;

    // Spotlight: dim everything that is not the structure being talked about.
    var hi = highlight && highlight.length ? highlight : null;
    view.svg.classList.toggle("has-spotlight", !!hi);
    var all = view.svg.querySelectorAll("[data-region]");
    for (var i = 0; i < all.length; i++) {
      var r = all[i].getAttribute("data-region");
      all[i].classList.toggle("is-spotlit", !!hi && hi.indexOf(r) >= 0);
    }
  }

  /* ------------------------------------------------------------- inspection
   *
   * Hovering a structure names it; clicking asks what it is doing. The ECG has
   * been interrogable since the beginning and the heart was not, so the causal
   * link the product exists to teach only ran one way.
   *
   * Hit testing is hybrid. Native hit testing is accurate for anything with
   * area — chambers, vessels, valve groups — but useless for a 1.3 px Purkinje
   * twig or a chorda, so anything that misses falls back to the nearest label
   * anchor within a radius. Those anchors are already computed from live
   * geometry every frame, so nothing has to be kept in sync. */

  var HIT_RADIUS = 26;
  /* Small structures drawn under big ones would otherwise be unreachable: the
   * aortic valve sits directly beneath the aortic root, and the pulmonic valve
   * beneath the pulmonary trunk, so a native hit always returns the vessel.
   * When one of these is close to the pointer it wins. */
  var PRECISE = ["aortic", "pulmonic", "mitral", "tricuspid",
                 "sa-node", "av-node", "his-bundle"];
  var PRECISE_RADIUS = 17;

  function resolveRegion(view, ev) {
    var pt = toUser(view.svg, ev);

    if (pt) {
      var near = nearestAnchor(view, pt, PRECISE_RADIUS, PRECISE);
      if (near) return canonical(near);
    }

    var el0 = ev.target && ev.target.closest ? ev.target.closest("[data-region]") : null;
    if (el0) {
      // A dimmed-out layer should not answer questions about itself.
      var layer = el0.closest("[data-layer]");
      if (!layer || parseFloat(layer.style.opacity || 1) >= 0.2) {
        return canonical(el0.getAttribute("data-region"));
      }
    }
    if (!pt) return null;
    var any = nearestAnchor(view, pt, HIT_RADIUS, null);
    return any ? canonical(any) : null;
  }

  function nearestAnchor(view, pt, radius, only) {
    var best = null, bestD = radius, pos = view.labelPos || {};
    Object.keys(pos).forEach(function (key) {
      if (only && only.indexOf(canonical(key)) < 0) return;
      var a = pos[key];
      var d = Math.sqrt(Math.pow(a.x - pt.x, 2) + Math.pow(a.y - pt.y, 2));
      if (d < bestD) { bestD = d; best = key; }
    });
    return best;
  }

  function canonical(region) {
    if (!region) return null;
    return (C.content.partAlias && C.content.partAlias[region]) || region;
  }

  function toUser(svg, ev) {
    if (!svg.getScreenCTM) return null;
    var m = svg.getScreenCTM();
    if (!m) return null;
    var p = svg.createSVGPoint();
    p.x = ev.clientX; p.y = ev.clientY;
    return p.matrixTransform(m.inverse());
  }

  /* Show one structure's label on demand, without disturbing whichever label set
   * the user has pinned. */
  function setHoverLabel(view, region) {
    if (view._hoverLabel === region) return;
    view._hoverLabel = region;


    var hoverKey = null;
    Object.keys(view.labels).forEach(function (key) {
      var g = view.labels[key];
      var pinned = g.getAttribute("data-pinned") === "1";
      var isHover = region !== null && labelMatches(key, region);
      if (isHover) hoverKey = key;
      g.setAttribute("opacity", (pinned || isHover) ? 1 : 0);
      g.classList.toggle("is-hover-label", !pinned && isHover);
    });
    if (!hoverKey) return;

    /* The pinned sets are laid out so nothing inside a set collides, but a
     * hovered label comes from outside that set and can land on top of one.
     * The hovered label is the thing being asked about, so it wins and whatever
     * it covers steps aside until the pointer leaves. */
    if (view._onHoverChange) view._onHoverChange();
    var hb = textBox(view.labels[hoverKey]);
    if (!hb) return;
    Object.keys(view.labels).forEach(function (key) {
      if (key === hoverKey) return;
      var g = view.labels[key];
      if (g.getAttribute("data-pinned") !== "1") return;
      var b = textBox(g);
      if (b && intersects(hb, b)) g.setAttribute("opacity", 0);
    });
  }

  function textBox(g) {
    var t = g && g.querySelector("text");
    if (!t) return null;
    try {
      var b = t.getBBox();
      // A little slack, so labels that merely graze each other also separate.
      return { x: b.x - 3, y: b.y - 2, w: b.width + 6, h: b.height + 4 };
    } catch (e) { return null; }
  }

  function intersects(a, b) {
    return !(a.x + a.w < b.x || b.x + b.w < a.x ||
             a.y + a.h < b.y || b.y + b.h < a.y);
  }

  function labelMatches(labelKey, region) {
    return labelKey === region || canonical(labelKey) === region;
  }

  C.render.heart = {
    create: create, update: update, applyFocus: applyFocus,
    FOCUS_LAYERS: FOCUS_LAYERS,
    resolveRegion: resolveRegion, canonical: canonical, setHoverLabel: setHoverLabel
  };
})(window.CARDIAC);
