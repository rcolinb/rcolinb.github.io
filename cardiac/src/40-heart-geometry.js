/* 40-heart-geometry.js — the anatomy, built from parameters rather than traced.
 *
 * Chambers, walls, valve planes, papillary muscles, chordae, the conduction
 * system and the Purkinje network are all derived from the same few functions,
 * so when a wall thickens or a cavity empties, everything attached to it moves
 * correctly instead of drifting.
 *
 * Building it parametrically rather than tracing a reference illustration is
 * what makes contraction possible at all: a flattened drawing cannot morph, and
 * every structure here has to be independently hideable, highlightable and
 * labellable.
 *
 * Frontal cutaway. The patient's right is on the viewer's left, as it is on a
 * chest film.
 */
(function (C) {
  "use strict";

  var M = C.M;

  var G = {
    // Extra room either side of the drawing so labels sit in gutters rather
    // than on top of the anatomy.
    viewBox: "-52 14 606 522",

    // Proportions matter: a real heart is about as wide as it is tall, so tall
    // narrow ventricles read as two separate organs rather than one.
    lv: { cx: 306, baseY: 244, apexY: 486, wCav: 64, wall: 32, lean: 40 },
    rv: { baseY: 252, apexY: 448, depth: 82, wall: 11 },

    // The atria overlap the ventricular base rather than floating above it, so
    // the four chambers read as one organ and each AV valve sits in a junction.
    ra: { cx: 172, cy: 198, rx: 57, ry: 45 },
    la: { cx: 328, cy: 194, rx: 54, ry: 43 }
  };

  /* Profile of a ventricle from base (s = 0) to apex (s = 1). */
  function profile(s) { return Math.sqrt(Math.max(0, 1 - Math.pow(s, 2.2))); }

  /* The ventricular long axis leans, so the apex sits down and to the patient's
   * left rather than straight below the valve plane. Every structure that hangs
   * off the ventricle reads this, which is why the whole mass tilts together. */
  function lvCx(s) { return G.lv.cx - G.lv.lean * Math.pow(M.clamp(s, 0, 1), 1.25); }

  /* Half-width of the LV cavity. `shrink` is systolic shortening: 0 is fully
   * relaxed. The base contributes less than the free wall and the apex, which is
   * why contraction reads as wall motion rather than the whole shape scaling. */
  function lvCavityHalfWidth(s, shrink) {
    var wall = 1 - 0.30 * Math.pow(1 - s, 1.5);
    return G.lv.wCav * profile(s) * (1 - shrink * wall);
  }

  function lvOuterHalfWidth(s, thicken) {
    var t = G.lv.wall * (thicken || 1) * (1 - 0.32 * s);
    return (G.lv.wCav + t) * profile(s);
  }

  function rvProfile(s) { return Math.sqrt(Math.max(0, 1 - Math.pow(s, 1.8))); }

  function rvDepthAt(s, shrink) {
    return G.rv.depth * rvProfile(s) * (1 - shrink * 0.72);
  }

  /* y for a given base-to-apex fraction. During systole the valve plane descends
   * toward the apex — a real motion, and a visible one. */
  function lvY(s, descend) {
    var b = G.lv.baseY + (descend || 0) * 14;
    return b + s * (G.lv.apexY - b);
  }
  function rvY(s, descend) {
    var b = G.rv.baseY + (descend || 0) * 12;
    return b + s * (G.rv.apexY - b);
  }
  /* The right ventricle spans a shorter length, so map its parameter onto the
   * left ventricle's before asking for a shared width. */
  function rvToLv(s) { return s * (G.rv.apexY - G.rv.baseY) / (G.lv.apexY - G.lv.baseY); }

  var STEPS = 24;

  function lvCavityPoints(shrink, descend) {
    var pts = [], i, s;
    for (i = 0; i <= STEPS; i++) {
      s = i / STEPS;
      pts.push([lvCx(s) - lvCavityHalfWidth(s, shrink), lvY(s, descend)]);
    }
    for (i = STEPS; i >= 0; i--) {
      s = i / STEPS;
      pts.push([lvCx(s) + lvCavityHalfWidth(s, shrink), lvY(s, descend)]);
    }
    return pts;
  }

  function lvOuterPoints(thicken, descend) {
    var pts = [], i, s;
    for (i = 0; i <= STEPS; i++) {
      s = i / STEPS;
      pts.push([lvCx(s) - lvOuterHalfWidth(s, thicken), lvY(s, descend)]);
    }
    for (i = STEPS; i >= 0; i--) {
      s = i / STEPS;
      pts.push([lvCx(s) + lvOuterHalfWidth(s, thicken), lvY(s, descend)]);
    }
    return pts;
  }

  /* The right ventricle is a crescent wrapped around the septal surface of the
   * left. Its inner boundary IS the left ventricle's outer wall. */
  function rvCavityPoints(shrink, lvThicken, descend) {
    var pts = [], i, s, sl, x;
    for (i = 0; i <= STEPS; i++) {
      s = i / STEPS; sl = Math.min(1, rvToLv(s));
      x = lvCx(sl) - lvOuterHalfWidth(sl, lvThicken) - G.rv.wall;
      pts.push([x, rvY(s, descend)]);
    }
    for (i = STEPS; i >= 0; i--) {
      s = i / STEPS; sl = Math.min(1, rvToLv(s));
      x = lvCx(sl) - lvOuterHalfWidth(sl, lvThicken) - G.rv.wall - rvDepthAt(s, shrink);
      pts.push([x, rvY(s, descend)]);
    }
    return pts;
  }

  function rvOuterPoints(rvThicken, lvThicken, descend) {
    var t = G.rv.wall * (rvThicken || 1);
    var pts = [], i, s, sl, x;
    for (i = 0; i <= STEPS; i++) {
      s = i / STEPS; sl = Math.min(1, rvToLv(s));
      pts.push([lvCx(sl) - lvOuterHalfWidth(sl, lvThicken), rvY(s, descend)]);
    }
    for (i = STEPS; i >= 0; i--) {
      s = i / STEPS; sl = Math.min(1, rvToLv(s));
      x = lvCx(sl) - lvOuterHalfWidth(sl, lvThicken) - t - rvDepthAt(s, 0) - t * 0.4;
      pts.push([x, rvY(s, descend)]);
    }
    return pts;
  }

  /* Trabeculae carneae — the muscular ridges lining the ventricular cavity.
   * Short arcs just inside the endocardial border, which is enough to stop the
   * cavity reading as a flat cut-out shape. */
  function trabeculae(side, shrink, lvThicken, descend) {
    var out = [], rand = C.rng(side === "left" ? 5150881 : 9902317);
    var n = side === "left" ? 9 : 7;
    for (var i = 0; i < n; i++) {
      var s = 0.20 + (i / n) * 0.64 + (rand() - 0.5) * 0.03;
      var wall = (i % 2 === 0) ? 1 : -1;
      var x0, y0;
      if (side === "left") {
        y0 = lvY(s, descend);
        x0 = lvCx(s) + wall * (lvCavityHalfWidth(s, shrink) - 3);
      } else {
        var sl = Math.min(1, rvToLv(s));
        var inner = lvCx(sl) - lvOuterHalfWidth(sl, lvThicken) - G.rv.wall;
        y0 = rvY(s, descend);
        x0 = wall > 0 ? inner - 4 : inner - rvDepthAt(s, shrink) + 4;
      }
      var len = 6 + rand() * 8;
      out.push([[x0, y0], [x0 - wall * len, y0 + 4 + rand() * 4]]);
    }
    return out;
  }

  /* Papillary muscles and chordae tendineae.
   *
   * These are the clearest illustration of contraction in the whole drawing:
   * the muscle shortens with the wall it springs from, and the chordae pull
   * taut the moment the valve shuts, which is what stops the leaflets inverting
   * into the atrium under ventricular pressure. */
  function papillary(side, shrink, lvThicken, descend) {
    var out = [];
    var specs = side === "left"
      ? [{ s: 0.58, wall: 1 }, { s: 0.56, wall: -1 }]
      : [{ s: 0.56, wall: -1 }, { s: 0.48, wall: 1 }];

    for (var i = 0; i < specs.length; i++) {
      var sp = specs[i];
      var base, dir;
      if (side === "left") {
        base = { x: lvCx(sp.s) + sp.wall * (lvCavityHalfWidth(sp.s, shrink) - 1), y: lvY(sp.s, descend) };
        dir = -sp.wall;
      } else {
        var sl = Math.min(1, rvToLv(sp.s));
        var inner = lvCx(sl) - lvOuterHalfWidth(sl, lvThicken) - G.rv.wall;
        base = { x: sp.wall > 0 ? inner - 2 : inner - rvDepthAt(sp.s, shrink) + 2, y: rvY(sp.s, descend) };
        dir = sp.wall > 0 ? -1 : 1;
      }
      // The muscle shortens and thickens as the ventricle contracts.
      var len = (32 - 8 * shrink) * (side === "left" ? 1 : 0.82);
      var lift = 0.66;
      var tip = { x: base.x + dir * len * 0.40, y: base.y - len * lift };
      var halfW = 6.5 + 1.5 * shrink;
      out.push({
        base: base, tip: tip,
        body: [
          [base.x - halfW, base.y + 3],
          [base.x + dir * len * 0.18 - halfW * 0.4, base.y - len * lift * 0.55],
          [tip.x, tip.y],
          [base.x + dir * len * 0.18 + halfW * 0.6, base.y - len * lift * 0.45],
          [base.x + halfW, base.y + 3]
        ]
      });
    }
    return out;
  }

  /* Atria, flattened where they meet the valve plane and rounded above. */
  function atriumPoints(a, shrink, bulge) {
    var pts = [], n = 28;
    for (var i = 0; i < n; i++) {
      var th = (i / n) * Math.PI * 2 - Math.PI / 2;
      var sy = Math.sin(th);
      var squash = sy > 0 ? 1 - 0.30 * Math.pow(sy, 2.4) : 1;
      var move = 0.35 + 0.65 * Math.max(0, -sy);
      var k = 1 - shrink * move;
      var rx = a.rx * k * squash * (1 + (bulge || 0) * 0.10);
      var ry = a.ry * k * (1 + (bulge || 0) * 0.08);
      pts.push([a.cx + rx * Math.cos(th), a.cy + ry * sy]);
    }
    return pts;
  }

  /* The auricle — the ear-shaped appendage that gives each atrium its
   * silhouette. Not decoration: the left atrial appendage is where thrombus
   * forms in atrial fibrillation, which the rhythm content already teaches. */
  function auriclePoints(side, shrink) {
    var a = side === "right" ? G.ra : G.la;
    var k = 1 - shrink * 0.7;
    var dir = side === "right" ? -1 : 1;
    var ox = a.cx + dir * a.rx * 0.70;
    var oy = a.cy - a.ry * 0.40;
    var L = 42 * k, H = 26 * k;
    return [
      [ox, oy + H * 0.44],
      [ox + dir * L * 0.34, oy + H * 0.64],
      [ox + dir * L * 0.78, oy + H * 0.18],
      [ox + dir * L, oy - H * 0.44],
      [ox + dir * L * 0.64, oy - H * 0.88],
      [ox + dir * L * 0.18, oy - H * 0.74],
      [ox - dir * 4, oy - H * 0.28]
    ];
  }

  /* The atrioventricular junction — the fibrous plane the atria sit on and the
   * ventricles hang from. Without it the atria read as discs floating above the
   * ventricles instead of as chambers opening into them. */
  function junctionPoints(descend, lvThicken) {
    var drop = (descend || 0) * 9;
    var rvOut = lvCx(0.02) - lvOuterHalfWidth(0.02, lvThicken) - G.rv.wall - rvDepthAt(0.02, 0) - 6;
    var lvOut = lvCx(0.02) + lvOuterHalfWidth(0.02, lvThicken);
    var top = G.lv.baseY - 16 + drop, bot = G.lv.baseY + 12 + drop;
    return [
      [rvOut, top + 6], [rvOut + 30, top], [G.lv.cx - 40, top - 2],
      [G.lv.cx + 20, top], [lvOut - 24, top + 1], [lvOut + 4, top + 8],
      [lvOut + 4, bot], [lvOut - 30, bot + 5], [G.lv.cx - 30, bot + 6],
      [rvOut + 26, bot + 4], [rvOut - 2, bot - 2]
    ];
  }

  /* The ventricular outflow tracts.
   *
   * Without these the great arteries merely start somewhere near the top of the
   * heart, and a learner cannot see which chamber they drain. Each tract is a
   * tapering channel of the SAME blood as its ventricle, running from inside
   * the cavity up to the semilunar valve, so the route out is continuous. */
  function outflowTract(side, shrink, lvThicken, descend) {
    var v = valveGeometry(descend, lvThicken)[side === "left" ? "aortic" : "pulmonic"];
    var mid = (v.x1 + v.x2) / 2, half = (v.x2 - v.x1) / 2;
    var root, lean;
    if (side === "left") {
      // Rises from the septal side of the LV cavity.
      root = { x: lvCx(0.18) - lvCavityHalfWidth(0.18, shrink) * 0.15, y: lvY(0.18, descend) };
      lean = 6;
    } else {
      var sl = Math.min(1, rvToLv(0.16));
      var inner = lvCx(sl) - lvOuterHalfWidth(sl, lvThicken) - G.rv.wall;
      root = { x: inner - rvDepthAt(0.16, shrink) * 0.55, y: rvY(0.16, descend) };
      lean = -4;
    }
    var w = Math.max(half * 0.9, 14);
    return [
      [root.x - w, root.y],
      [mid - half + lean, v.y + 4],
      [mid - half * 0.92 + lean, v.y - 2],
      [mid + half * 0.92 + lean, v.y - 2],
      [mid + half + lean, v.y + 4],
      [root.x + w, root.y]
    ];
  }

  /* ------------------------------------------------------- conduction system */

  function conductionAnchors(lvThicken, descend) {
    /* The valve plane descends during systole and the fibrous junction goes with
     * it (see junctionPoints). Anything sitting ON that junction has to descend
     * by the same amount or it detaches: the AV node used to be pinned at a
     * fixed y and visibly floated up off the heart at peak contraction. */
    var drop = (descend || 0) * 9;
    var sept = function (s) {
      return { x: lvCx(s) - lvOuterHalfWidth(s, lvThicken) + 6, y: lvY(s, descend || 0) };
    };
    var septL = function (s) {
      return { x: lvCx(s) - lvCavityHalfWidth(s, 0) + 3, y: lvY(s, descend || 0) };
    };
    var septR = function (s) {
      return { x: lvCx(s) - lvOuterHalfWidth(s, lvThicken) - 4, y: lvY(s, descend || 0) };
    };
    return {
      // In the atrial wall at the junction of the superior vena cava and the
      // right atrium — inside the wall, not on the vena cava itself. The atria
      // do not descend, so this one stays put.
      saNode: { x: 196, y: 152 },
      // Low in the interatrial septum, at the top of the fibrous junction —
      // the apex of the triangle of Koch, just above the tricuspid annulus.
      avNode: { x: 248, y: 233 + drop },
      hisTop: { x: 246, y: 241 + drop },
      hisBottom: sept(0.12),
      septum: sept, septumLeft: septL, septumRight: septR
    };
  }

  /* Short fibres radiating from the sinus node into the surrounding atrial
   * muscle — the reason the node looks like a starburst in every reference. */
  function saRadials(anchors) {
    var out = [], n = 9, a = anchors.saNode;
    for (var i = 0; i < n; i++) {
      var th = (i / n) * Math.PI * 2 + 0.4;
      var r0 = 8, r1 = 15 + (i % 3) * 4;
      out.push([
        [a.x + Math.cos(th) * r0, a.y + Math.sin(th) * r0 * 0.8],
        [a.x + Math.cos(th) * r1, a.y + Math.sin(th) * r1 * 0.8]
      ]);
    }
    return out;
  }

  /* Three internodal tracts, not one wire — and Bachmann's bundle branching off
   * toward the left atrium, which is how the left atrium is reached at all. A
   * single line cannot express either fact. */
  function internodalTracts(anchors) {
    var sa = anchors.saNode, av = anchors.avNode;
    return {
      /* All three converge INSIDE the node — the node is only 10 x 7, so an
       * endpoint eight pixels out sits on its rim and reads as not quite
       * arriving. They approach from different directions, which is what makes
       * three tracts legible as three. */
      anterior: [
        { x: sa.x + 4, y: sa.y + 7 },
        { x: 214, y: 172 }, { x: 234, y: 200 }, { x: av.x + 1, y: av.y - 3 }
      ],
      middle: [
        { x: sa.x - 2, y: sa.y + 9 },
        { x: 192, y: 182 }, { x: 218, y: 212 }, { x: av.x - 3, y: av.y - 1 }
      ],
      posterior: [
        { x: sa.x - 8, y: sa.y + 8 },
        { x: 162, y: 192 }, { x: 170, y: 226 }, { x: 212, y: av.y + 4 },
        { x: av.x - 4, y: av.y + 2 }
      ],
      bachmann: [
        { x: sa.x + 7, y: sa.y + 2 },
        { x: 240, y: 148 }, { x: 282, y: 150 }, { x: 322, y: 162 }
      ]
    };
  }

  function hisPath(anchors) {
    return [anchors.hisTop,
            { x: (anchors.hisTop.x + anchors.hisBottom.x) / 2 - 2,
              y: (anchors.hisTop.y + anchors.hisBottom.y) / 2 },
            anchors.hisBottom];
  }

  /* The right bundle stays a discrete cord down the right side of the septum.
   * The left bundle is a broad sheet that fans into anterior and posterior
   * fascicles — which is why the two behave so differently when they fail. */
  function bundlePath(anchors, side, fascicle) {
    var f = side === "left" ? anchors.septumLeft : anchors.septumRight;
    var pts = [anchors.hisBottom];
    var split = f(0.18);
    pts.push({ x: (anchors.hisBottom.x + split.x) / 2 + (side === "left" ? 5 : -5),
               y: (anchors.hisBottom.y + split.y) / 2 });
    var spread = fascicle === "anterior" ? -1 : fascicle === "posterior" ? 1 : 0;
    for (var i = 2; i <= 9; i++) {
      var s = i / 10.5;
      var p = f(s);
      var g = Math.pow((i - 2) / 7, 1.4);
      pts.push({ x: p.x + spread * 14 * g, y: p.y + spread * 5 * g });
    }
    return pts;
  }

  /* Purkinje network: a branching tree, not a bundle of parallel strokes. Each
   * fibre leaves the fascicle terminus, runs along the endocardium, then
   * divides — twice — so the network visibly ramifies. */
  function purkinjeTree(side, lvThicken) {
    var out = [], rand = C.rng(side === "left" ? 20240117 : 771103);
    var apexS = 0.92;

    var origin = side === "left"
      ? { x: lvCx(0.86) - lvCavityHalfWidth(0.86, 0) + 4, y: lvY(0.86, 0) }
      : (function () {
          var sl = Math.min(1, rvToLv(0.86));
          return { x: lvCx(sl) - lvOuterHalfWidth(sl, lvThicken) - G.rv.wall - 3, y: rvY(0.86, 0) };
        })();

    function endo(s, wall) {
      if (side === "left") {
        var half = lvCavityHalfWidth(s, 0) - 5;
        return lvCx(s) + (wall === "free" ? half : -half);
      }
      var sl = Math.min(1, rvToLv(s));
      var inner = lvCx(sl) - lvOuterHalfWidth(sl, lvThicken) - G.rv.wall;
      return wall === "free" ? inner - rvDepthAt(s, 0) + 6 : inner - 4;
    }
    function yAt(s) { return side === "left" ? lvY(s, 0) : rvY(s, 0); }

    /* Length along a polyline, optionally only as far as index `upTo`. Used to
     * turn the tree into conduction distances. */
    function polyLen(pts, upTo) {
      var end = (upTo === undefined ? pts.length - 1 : upTo), d = 0;
      for (var i = 1; i <= end; i++) {
        d += Math.sqrt(Math.pow(pts[i].x - pts[i - 1].x, 2) +
                       Math.pow(pts[i].y - pts[i - 1].y, 2));
      }
      return d;
    }

    // Three trunks a side, each carrying three branches that twig again. Dense
    // enough to read as a network, but every fibre stays pinned to the
    // endocardium — what made the earlier version a scribble was fibres cutting
    // across the middle of the cavity, not the number of them.
    var walls = side === "left" ? ["sept", "free", "free"] : ["free", "sept", "free"];
    var ORIGIN_WALL = "sept";     // both origins sit on the septal surface

    /* Which way the cavity lies from a given wall. The previous single
     * expression assumed the left ventricle's orientation for both sides, so on
     * the right the offsets pushed fibres OUT through the free wall instead of
     * just inside it. */
    function inward(wall) {
      if (side === "left") return wall === "free" ? -1 : 1;
      return wall === "free" ? 1 : -1;
    }
    /* A point just inside the endocardium — where Purkinje fibres actually run. */
    function onWall(s, wall, extra) {
      return { x: endo(s, wall) + inward(wall) * (1.5 + (extra || 0)), y: yAt(s) };
    }
    function midline(s) { return (endo(s, "sept") + endo(s, "free")) / 2; }

    /* Distance across the cavity at s, so branch spread can be expressed as a
     * fraction of the space available rather than a fixed pixel count that is
     * too wide at the apex and too narrow at the base. */
    function cavityWidth(s) {
      return side === "left"
        ? 2 * lvCavityHalfWidth(s, 0)
        : rvDepthAt(s, 0);
    }
    /* A point `frac` of the way from the wall toward the MIDLINE — so frac is
     * read against the half-width, not the full wall-to-wall span. Measuring it
     * against the full width sent branch tips 88% of the way across, which put
     * the two sides' networks nose to nose at the septum. */
    function offWall(s, wall, frac) {
      var f = Math.min(frac, 0.55);
      return { x: endo(s, wall) + inward(wall) * (cavityWidth(s) / 2) * f, y: yAt(s) };
    }

    for (var w = 0; w < walls.length; w++) {
      var wall = walls[w];
      var top = 0.34 + w * 0.13;
      var trunk = [{ x: origin.x, y: origin.y }];
      var trunkS = [apexS];

      /* Fibres travel along the endocardium; they do not cut across the cavity.
       * Both origins sit on the septal side, so a trunk bound for the free wall
       * runs down to the apex and rounds it — where the cavity is at its
       * narrowest — before climbing the far side. Interpolating straight to the
       * target wall instead sent two of the three trunks slashing diagonally
       * through the middle of the ventricle, which is anatomically wrong and was
       * the main source of clutter in this network. */
      var startS = apexS;
      if (wall !== ORIGIN_WALL) {
        trunk.push(onWall(0.95, ORIGIN_WALL)); trunkS.push(0.95);
        trunk.push({ x: midline(0.985), y: yAt(0.985) }); trunkS.push(0.985);
        trunk.push(onWall(0.95, wall)); trunkS.push(0.95);
        startS = 0.95;
      }

      var steps = 5;
      for (var j = 1; j <= steps; j++) {
        var s = M.lerp(startS, top, Math.pow(j / steps, 0.85));
        trunk.push(onWall(s, wall, (rand() - 0.5) * 1.5));
        trunkS.push(s);
      }
      out.push({ pts: trunk, order: 1, travel: polyLen(trunk) * 0.5 });

      // Branch off the upper half of the trunk, once it is running up the wall.
      var first = trunk.length - steps + 1;
      for (var b = 0; b < 3; b++) {
        var at = first + b;
        if (at >= trunk.length) break;
        var from = trunk[at];
        var trunkTo = polyLen(trunk, at);
        var sHere = trunkS[at];
        /* Branches run ACROSS the wall as well as up it. The subendocardial
         * network arborises over the endocardial surface, and pinning every
         * order to the same vertical line turns it into a bundle of parallel
         * wires. Spread is a fraction of the local cavity width, so it stays
         * proportionate from the narrow apex to the wide base and never reaches
         * the midline — which is what made the earlier version a scribble. */
        var sUp = Math.max(0.20, sHere - 0.055 - rand() * 0.03);
        var sMid = (sHere + sUp) / 2;
        var reach = 0.28 + rand() * 0.12;
        var tip = offWall(sUp, wall, reach);
        var branch = [from, offWall(sMid, wall, reach * 0.45), tip];
        var branchLen = polyLen(branch);
        out.push({ pts: branch, order: 2, travel: trunkTo + branchLen * 0.5 });

        // Two twigs off each tip: one reaching further across the wall, one
        // continuing up it, so the network fills area rather than a line.
        for (var t2 = 0; t2 < 2; t2++) {
          var sTip = Math.max(0.16, sUp - 0.03 - t2 * 0.055);
          var twig = [tip, offWall(sTip, wall, reach * (t2 === 0 ? 1.4 : 0.55))];
          out.push({ pts: twig, order: 3,
                     travel: trunkTo + branchLen + polyLen(twig) * 0.5 });
        }
      }
    }

    /* Activation order comes from distance travelled ALONG the network, not
     * from array order and not from straight-line distance to the apex. Array
     * order is wrong because each of the three wall groups restarts its trunk
     * at the origin, so entries 0, 10 and 20 are all apex trunks. Straight-line
     * distance is wrong because a branch that doubles back toward the apex sits
     * close to it while the impulse still had to run up the trunk to reach the
     * branch point. Path length is what conduction time is actually made of. */
    var maxT = 0;
    out.forEach(function (br) { if (br.travel > maxT) maxT = br.travel; });
    out.forEach(function (br) { br.delay = maxT > 0 ? br.travel / maxT : 0; });

    return out;
  }

  /* Label anchors that have to sit ON a generated path rather than at a
   * hand-typed coordinate — otherwise a geometry change silently leaves the
   * leader line pointing at empty myocardium. */
  function labelAnchors(lvThicken, descend) {
    var a = conductionAnchors(lvThicken);
    var rbb = bundlePath(a, "right"), lbb = bundlePath(a, "left");
    var pick = function (pts, u) { return pointAlong(pts, u); };
    var out = {
      "sa-node": a.saNode,
      "av-node": a.avNode,
      "his-bundle": pick(hisPath(a), 0.55),
      "right-bundle": pick(rbb, 0.62),
      "left-bundle": pick(lbb, 0.62),
      "bachmann": pick(internodalTracts(a).bachmann, 0.62)
    };
    ["left", "right"].forEach(function (side) {
      var tree = purkinjeTree(side, lvThicken);
      var mid = tree.filter(function (b) { return b.order === 2; });
      var t = mid.length ? mid[Math.floor(mid.length / 2)] : tree[0];
      out[side + "-purkinje"] = pointAlong(t.pts, 0.9);
    });
    ["left", "right"].forEach(function (side) {
      var pm = papillary(side, 0.2, lvThicken, descend || 0);
      if (pm.length) {
        if (side === "left") { out.papillary = pm[0].base; out.chordae = pm[0].tip; }
      }
    });
    return out;
  }

  /* ------------------------------------------------------------- valve planes */

  /* `axis` is the direction the leaflets point when shut: AV valves shut into
   * the ventricle below, semilunar valves shut across the vessel above. */
  function valveGeometry(descend, lvThicken) {
    var drop = (descend || 0) * 9;
    return {
      tricuspid: { x1: 126, x2: 194, y: 250 + drop, axis: 1,  span: 18 },
      mitral:    { x1: 288, x2: 354, y: 246 + drop, axis: 1,  span: 18 },
      // Both semilunar valves sit at the TOP OF THEIR OWN VENTRICLE. Placed any
      // higher they hover between the atria, and the great artery above them
      // reads as if it drains an atrium — which is the single most misleading
      // thing this drawing could say.
      pulmonic:  { x1: 168, x2: 206, y: 246 + drop * 0.6, axis: -1, span: 13 },
      aortic:    { x1: 252, x2: 290, y: 250 + drop * 0.6, axis: -1, span: 13 }
    };
  }

  /* ------------------------------------------------------------ path helpers */

  function smoothClosedPath(pts) {
    var n = pts.length;
    if (n < 3) return "";
    var d = "M" + pts[0][0].toFixed(1) + "," + pts[0][1].toFixed(1);
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += "C" + c1x.toFixed(1) + "," + c1y.toFixed(1) + " " +
                 c2x.toFixed(1) + "," + c2y.toFixed(1) + " " +
                 p2[0].toFixed(1) + "," + p2[1].toFixed(1);
    }
    return d + "Z";
  }

  function smoothOpenPath(pts) {
    if (!pts.length) return "";
    var d = "M" + pts[0].x.toFixed(1) + "," + pts[0].y.toFixed(1);
    for (var i = 1; i < pts.length; i++) {
      var prev = pts[i - 1], cur = pts[i];
      var mx = (prev.x + cur.x) / 2, my = (prev.y + cur.y) / 2;
      d += "Q" + prev.x.toFixed(1) + "," + prev.y.toFixed(1) + " " + mx.toFixed(1) + "," + my.toFixed(1);
    }
    var last = pts[pts.length - 1];
    d += "L" + last.x.toFixed(1) + "," + last.y.toFixed(1);
    return d;
  }

  function polyline(pts) {
    return pts.map(function (p, i) {
      return (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1);
    }).join("");
  }

  function pointAlong(pts, u) {
    if (!pts.length) return { x: 0, y: 0 };
    var segs = [], total = 0, i;
    for (i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      var ax = a.x !== undefined ? a.x : a[0], ay = a.y !== undefined ? a.y : a[1];
      var bx = b.x !== undefined ? b.x : b[0], by = b.y !== undefined ? b.y : b[1];
      var len = Math.hypot(bx - ax, by - ay);
      segs.push({ ax: ax, ay: ay, bx: bx, by: by, len: len });
      total += len;
    }
    if (!total) { var p0 = pts[0]; return { x: p0.x !== undefined ? p0.x : p0[0], y: p0.y !== undefined ? p0.y : p0[1] }; }
    var target = M.clamp(u, 0, 1) * total, acc = 0;
    for (i = 0; i < segs.length; i++) {
      if (acc + segs[i].len >= target) {
        var f = (target - acc) / (segs[i].len || 1);
        return { x: M.lerp(segs[i].ax, segs[i].bx, f), y: M.lerp(segs[i].ay, segs[i].by, f),
                 angle: Math.atan2(segs[i].by - segs[i].ay, segs[i].bx - segs[i].ax) };
      }
      acc += segs[i].len;
    }
    var last = segs[segs.length - 1];
    return { x: last.bx, y: last.by, angle: Math.atan2(last.by - last.ay, last.bx - last.ax) };
  }

  /* ------------------------------------------------------------ flow routes */

  var FLOW_ROUTES = {
    "svc-to-ra":               [[198, 22], [197, 86], [196, 150]],
    "ivc-to-ra":               [[112, 500], [120, 420], [134, 320], [154, 240]],
    "pulmonary-veins-to-la":   [[470, 172], [424, 178], [390, 186]],
    "ra-to-rv":                [[172, 200], [176, 248], [166, 296], [152, 344]],
    "la-to-lv":                [[330, 198], [326, 250], [312, 302], [292, 356]],
    // Each outflow route starts INSIDE its ventricle and travels out through
    // the tract and the valve, so the arrows show which chamber the blood left.
    "rv-to-pulmonary-artery":  [[158, 330], [170, 288], [184, 252], [196, 208], [216, 168], [236, 140]],
    "lv-to-aorta":             [[292, 350], [284, 300], [274, 252], [278, 200], [292, 152], [330, 110], [382, 116], [412, 174]]
  };

  /* Labels live in two gutters either side of the drawing. */
  var LEFT_TX = 128, RIGHT_TX = 406;

  var LABELS = {
    "svc":             { x: 197, y: 70,  tx: LEFT_TX,  ty: 60,  text: "Superior vena cava" },
    "sa-node":         { x: 196, y: 152, tx: LEFT_TX,  ty: 110, text: "SA node" },
    "pulmonary-artery":{ x: 205, y: 196, tx: LEFT_TX,  ty: 176, text: "Pulmonary artery" },
    "right-atrium":    { x: 150, y: 194, tx: LEFT_TX,  ty: 162, text: "Right atrium" },
    "pulmonic":        { x: 222, y: 226, tx: LEFT_TX,  ty: 206, text: "Pulmonic valve" },
    "tricuspid":       { x: 158, y: 250, tx: LEFT_TX,  ty: 250, text: "Tricuspid valve" },
    "right-ventricle": { x: 140, y: 330, tx: LEFT_TX,  ty: 306, text: "Right ventricle" },
    "right-bundle":    { x: 226, y: 356, tx: LEFT_TX,  ty: 350, text: "Right bundle branch" },
    "papillary":       { x: 196, y: 352, tx: LEFT_TX,  ty: 394, text: "Papillary muscle" },
    "septum":          { x: 214, y: 316, tx: LEFT_TX,  ty: 438, text: "Interventricular septum" },
    "right-purkinje":  { x: 172, y: 392, tx: LEFT_TX,  ty: 482, text: "Purkinje fibres" },
    "ivc":             { x: 128, y: 440, tx: LEFT_TX,  ty: 526, text: "Inferior vena cava" },

    "aorta":           { x: 348, y: 116, tx: RIGHT_TX, ty: 66,  text: "Aorta" },

    "pulmonary-veins": { x: 430, y: 176, tx: RIGHT_TX, ty: 146, text: "Pulmonary veins" },
    "left-atrium":     { x: 348, y: 186, tx: RIGHT_TX, ty: 190, text: "Left atrium" },
    "bachmann":        { x: 300, y: 154, tx: RIGHT_TX, ty: 230, text: "Bachmann's bundle" },
    "mitral":          { x: 326, y: 246, tx: RIGHT_TX, ty: 270, text: "Mitral valve" },
    "aortic":          { x: 268, y: 244, tx: RIGHT_TX, ty: 310, text: "Aortic valve" },
    "av-node":         { x: 248, y: 228, tx: RIGHT_TX, ty: 290, text: "AV node" },
    "his-bundle":      { x: 240, y: 266, tx: RIGHT_TX, ty: 350, text: "Bundle of His" },
    "left-bundle":     { x: 258, y: 348, tx: RIGHT_TX, ty: 470, text: "Left bundle branch" },
    "left-ventricle":  { x: 300, y: 350, tx: RIGHT_TX, ty: 464, text: "Left ventricle" },
    "left-purkinje":   { x: 286, y: 412, tx: RIGHT_TX, ty: 410, text: "Purkinje fibres" },
    "chordae":         { x: 240, y: 288, tx: RIGHT_TX, ty: 340, text: "Chordae tendineae" }
  };

  var LABEL_SETS = {
    chambers: ["right-atrium", "left-atrium", "right-ventricle", "left-ventricle", "septum"],
    valves: ["tricuspid", "mitral", "aortic", "pulmonic", "papillary", "chordae"],
    vessels: ["svc", "ivc", "aorta", "pulmonary-artery", "pulmonary-veins"],
    conduction: ["sa-node", "av-node", "his-bundle", "right-bundle", "left-bundle", "left-purkinje", "bachmann"],
    none: []
  };

  C.geometry = {
    G: G, STEPS: STEPS,
    profile: profile,
    lvCx: lvCx,
    lvCavityHalfWidth: lvCavityHalfWidth,
    lvOuterHalfWidth: lvOuterHalfWidth,
    rvDepthAt: rvDepthAt,
    rvToLv: rvToLv,
    lvY: lvY, rvY: rvY,
    lvCavityPoints: lvCavityPoints, lvOuterPoints: lvOuterPoints,
    rvCavityPoints: rvCavityPoints, rvOuterPoints: rvOuterPoints,
    trabeculae: trabeculae,
    papillary: papillary,
    atriumPoints: atriumPoints,
    auriclePoints: auriclePoints,
    junctionPoints: junctionPoints,
    outflowTract: outflowTract,
    conductionAnchors: conductionAnchors,
    saRadials: saRadials,
    internodalTracts: internodalTracts,
    hisPath: hisPath,
    bundlePath: bundlePath,
    purkinjeTree: purkinjeTree,
    labelAnchors: labelAnchors,
    valveGeometry: valveGeometry,
    smoothClosedPath: smoothClosedPath,
    smoothOpenPath: smoothOpenPath,
    polyline: polyline,
    pointAlong: pointAlong,
    FLOW_ROUTES: FLOW_ROUTES,
    LABELS: LABELS,
    LABEL_SETS: LABEL_SETS
  };
})(window.CARDIAC);
