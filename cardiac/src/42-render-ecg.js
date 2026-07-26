/* 42-render-ecg.js — the tracing.
 *
 * Drawn on real ECG paper geometry: 25 mm/s and 10 mm/mV, isotropic, so a
 * small square is 0.04 s wide and 0.1 mV tall and a learner can actually count
 * squares. All twelve leads come from the same dipole at the same instants, so
 * they cannot drift apart.
 */
(function (C) {
  "use strict";

  var M = C.M, E = C.engine.ecg, VEC = C.engine.vector;

  var MM_PER_SEC = 25, MM_PER_MV = 10;
  // The magnified single-complex view runs at double paper speed.
  var DETAIL_MM_PER_SEC = 50;

  function dpr() { return Math.min(window.devicePixelRatio || 1, 2); }

  function fitCanvas(canvas) {
    var r = canvas.getBoundingClientRect();
    var k = dpr();
    var w = Math.max(1, Math.round(r.width * k)), h = Math.max(1, Math.round(r.height * k));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    var ctx = canvas.getContext("2d");
    ctx.setTransform(k, 0, 0, k, 0, 0);
    return { ctx: ctx, w: r.width, h: r.height };
  }

  function css(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }

  /* ------------------------------------------------------------------- grid */

  /* The grid takes separate horizontal and vertical millimetre scales. A small
   * square always means 0.04 s by 0.1 mV, so counting squares stays valid even
   * when a magnified view stretches time relative to voltage. */
  function drawGrid(ctx, x, y, w, h, pxX, pxY) {
    pxY = pxY || pxX;
    ctx.save();
    ctx.fillStyle = css("--ecg-paper", "#fffdfb");
    ctx.fillRect(x, y, w, h);

    var minor = css("--ecg-grid-minor", "#F3D6D1");
    var major = css("--ecg-grid-major", "#E9AAA0");
    var i, p;

    ctx.lineWidth = 1;
    ctx.strokeStyle = minor;
    ctx.beginPath();
    for (i = 0; (p = i * pxX) <= w + 0.5; i++) {
      if (i % 5 === 0) continue;
      ctx.moveTo(x + p + 0.5, y); ctx.lineTo(x + p + 0.5, y + h);
    }
    for (i = 0; (p = i * pxY) <= h + 0.5; i++) {
      if (i % 5 === 0) continue;
      ctx.moveTo(x, y + p + 0.5); ctx.lineTo(x + w, y + p + 0.5);
    }
    ctx.stroke();

    ctx.strokeStyle = major;
    ctx.beginPath();
    for (i = 0; (p = i * 5 * pxX) <= w + 0.5; i++) { ctx.moveTo(x + p + 0.5, y); ctx.lineTo(x + p + 0.5, y + h); }
    for (i = 0; (p = i * 5 * pxY) <= h + 0.5; i++) { ctx.moveTo(x, y + p + 0.5); ctx.lineTo(x + w, y + p + 0.5); }
    ctx.stroke();
    ctx.restore();
  }

  /* ---------------------------------------------------------------- tracing */

  /* One vertical segment per pixel column, spanning the minimum and maximum of
   * the samples in that column, so a narrow QRS spike keeps its true height
   * instead of being decimated away. */
  function drawTrace(ctx, wv, state, lead, t0Ms, durMs, x, y, w, h, pxPerMm, opts) {
    opts = opts || {};
    var baselineY = opts.baselineY !== undefined
      ? opts.baselineY
      : y + h * (opts.baseline === undefined ? 0.62 : opts.baseline);
    var pxPerMv = (opts.pxPerMmY || pxPerMm) * MM_PER_MV * (opts.gain || 1);
    var cols = Math.max(2, Math.round(w));
    var msPerCol = durMs / cols;
    var subSteps = Math.max(1, Math.min(8, Math.round(msPerCol / 2)));

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    ctx.lineWidth = opts.thin ? 1.3 : 1.7;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = opts.color || css("--ecg-trace", "#1A1A1A");

    ctx.beginPath();
    for (var c = 0; c < cols; c++) {
      var lo = Infinity, hi = -Infinity;
      for (var s = 0; s < subSteps; s++) {
        var t = t0Ms + (c + s / subSteps) * msPerCol;
        var mv = E.sampleLead(wv, t, lead, state);
        if (mv < lo) lo = mv;
        if (mv > hi) hi = mv;
      }
      var yHi = baselineY - hi * pxPerMv;
      var yLo = baselineY - lo * pxPerMv;
      var px = x + c + 0.5;
      if (c === 0) ctx.moveTo(px, yHi);
      ctx.lineTo(px, yHi);
      ctx.lineTo(px, yLo);
    }
    ctx.stroke();
    ctx.restore();
    return { baselineY: baselineY, pxPerMv: pxPerMv };
  }

  /* Calibration mark: a 1 mV, 200 ms step. Standard on every real tracing. */
  function drawCalibration(ctx, x, baselineY, pxPerMm) {
    var w = 5 * pxPerMm, h = 10 * pxPerMm;
    ctx.save();
    ctx.strokeStyle = css("--ecg-trace", "#1A1A1A");
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(x, baselineY);
    ctx.lineTo(x + w * 0.25, baselineY);
    ctx.lineTo(x + w * 0.25, baselineY - h);
    ctx.lineTo(x + w * 0.95, baselineY - h);
    ctx.lineTo(x + w * 0.95, baselineY);
    ctx.lineTo(x + w * 1.3, baselineY);
    ctx.stroke();
    ctx.restore();
    return w * 1.3;
  }

  /* What the signal actually spans in this window, so a view can be scaled to
   * hold it instead of clipping the top off the QRS. */
  function amplitudeRange(wv, state, leads, t0Ms, durMs, stepMs) {
    var lo = Infinity, hi = -Infinity;
    var step = stepMs || 4;
    for (var i = 0; i < leads.length; i++) {
      for (var t = t0Ms; t <= t0Ms + durMs; t += step) {
        var v = E.sampleLead(wv, t, leads[i], state);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    if (!isFinite(lo)) { lo = -0.5; hi = 1.0; }
    return { lo: lo, hi: hi };
  }

  /* --------------------------------------------------- wave-segment finding */

  /* Where each named wave sits in time, taken from the wavelets that actually
   * generated it. Used to point at "this T wave" rather than at a guess. */
  function segments(wv, t0Ms, t1Ms, tag) {
    var out = [];
    for (var i = 0; i < wv.list.length; i++) {
      var w = wv.list[i];
      if (tag && w.tag !== tag) continue;
      if (w.t0 + w.dur < t0Ms || w.t0 > t1Ms) continue;
      out.push({ tag: w.tag, t0: w.t0, t1: w.t0 + w.dur, eventId: w.eventId });
    }
    out.sort(function (a, b) { return a.t0 - b.t0; });
    var merged = [];
    for (var j = 0; j < out.length; j++) {
      var last = merged[merged.length - 1];
      if (last && out[j].tag === last.tag && out[j].t0 <= last.t1 + 30) {
        last.t1 = Math.max(last.t1, out[j].t1);
      } else merged.push(out[j]);
    }
    return merged;
  }

  var TAG_LABEL = { P: "P", QRS: "QRS", T: "T", U: "U", ST: "ST", f: "f", Ta: "" };

  /* The clickable anatomy of the tracing. Named waves come straight from the
   * wavelets that generated them; the intervals BETWEEN them are derived from
   * the gaps, which is how the PR segment and the ST segment become things a
   * learner can point at rather than stretches of empty paper. */
  var GAP_KEY = { "P>QRS": "pr", "QRS>T": "st", "T>P": "tp", "U>P": "tp", "T>QRS": "tp", "U>QRS": "tp" };

  function waveRegions(wv, schedule, t0Ms, durMs) {
    var t1 = t0Ms + durMs;
    var named = [];
    ["P", "QRS", "T", "U"].forEach(function (tag) {
      segments(wv, t0Ms, t1, tag).forEach(function (sg) {
        named.push({ key: tag.toLowerCase(), tag: tag, t0: sg.t0, t1: sg.t1 });
      });
    });
    named.sort(function (a, b) { return a.t0 - b.t0; });

    var out = named.slice();
    for (var i = 0; i < named.length - 1; i++) {
      var a = named[i], b = named[i + 1];
      var gap = b.t0 - a.t1;
      if (gap < 18) continue;
      var key = GAP_KEY[a.tag + ">" + b.tag];
      if (!key) continue;
      out.push({ key: key, tag: null, t0: a.t1, t1: b.t0 });
    }

    // Rhythms with no organised atrial activity get their baseline named for
    // what it actually is, rather than left unlabelled.
    if (schedule.rhythmId === "aflutter") out.push({ key: "flutter", tag: null, t0: t0Ms, t1: t1, weak: true });
    if (schedule.rhythmId === "af") out.push({ key: "fib", tag: null, t0: t0Ms, t1: t1, weak: true });

    out.sort(function (a, b) { return (a.weak ? 1 : 0) - (b.weak ? 1 : 0); });
    return out;
  }

  /* Which region a pointer is over. Strong regions win over the weak
   * whole-window ones, so clicking a QRS in flutter selects the QRS. */
  function regionAt(regions, tMs) {
    for (var i = 0; i < regions.length; i++) {
      if (tMs >= regions[i].t0 && tMs <= regions[i].t1) return regions[i];
    }
    return null;
  }

  function timeAtX(layout, canvas, clientX) {
    var r = canvas.getBoundingClientRect();
    var frac = M.clamp((clientX - r.left - layout.gx) / layout.gw, 0, 1);
    return layout.t0 + frac * layout.durMs;
  }

  /* Paint a band over a region and name it. */
  function drawRegionBand(ctx, layout, region, mode) {
    if (!region) return;
    var x1 = layout.gx + ((region.t0 - layout.t0) / layout.durMs) * layout.gw;
    var x2 = layout.gx + ((region.t1 - layout.t0) / layout.durMs) * layout.gw;
    x1 = Math.max(x1, layout.gx); x2 = Math.min(x2, layout.gx + layout.gw);
    if (x2 - x1 < 1.5) return;
    var g = C.content.waveGuide[region.key];
    ctx.save();
    ctx.fillStyle = mode === "selected"
      ? "color-mix(in srgb, " + css("--accent", "#A0522D") + " 26%, transparent)"
      : "color-mix(in srgb, " + css("--accent", "#A0522D") + " 13%, transparent)";
    ctx.fillRect(x1, layout.gy, x2 - x1, layout.gh);
    ctx.strokeStyle = css("--accent", "#A0522D");
    ctx.lineWidth = mode === "selected" ? 2 : 1;
    ctx.setLineDash(mode === "selected" ? [] : [4, 3]);
    ctx.beginPath();
    ctx.moveTo(x1, layout.gy); ctx.lineTo(x1, layout.gy + layout.gh);
    ctx.moveTo(x2, layout.gy); ctx.lineTo(x2, layout.gy + layout.gh);
    ctx.stroke();
    ctx.setLineDash([]);
    if (g && x2 - x1 > 26) {
      ctx.font = "700 11px " + css("--font-ui", "system-ui, sans-serif");
      ctx.fillStyle = css("--accent", "#A0522D");
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(g.label.split(" — ")[0], (x1 + x2) / 2, layout.gy + 3);
    }
    ctx.restore();
  }

  function drawHighlights(ctx, wv, t0Ms, durMs, x, y, w, h, tags) {
    if (!tags || !tags.length) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    for (var k = 0; k < tags.length; k++) {
      var segs = segments(wv, t0Ms, t0Ms + durMs, tags[k]);
      ctx.fillStyle = css("--wave-highlight", "rgba(237,181,46,0.24)");
      for (var i = 0; i < segs.length; i++) {
        var sx = x + ((segs[i].t0 - t0Ms) / durMs) * w;
        var sw = ((segs[i].t1 - segs[i].t0) / durMs) * w;
        if (sw < 1) continue;
        ctx.fillRect(sx, y + 2, sw, h - 4);
      }
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------ single lead */

  function drawStrip(canvas, sim, opts) {
    opts = opts || {};
    var fit = fitCanvas(canvas);
    var ctx = fit.ctx, W = fit.w, H = fit.h;
    var state = sim.state, wv = sim.wave;

    var seconds = opts.seconds || state.stripSeconds || 6;
    var padL = 6, padR = 6, padT = 4, padB = 16;
    var gx = padL, gy = padT, gw = W - padL - padR, gh = H - padT - padB;
    var pxPerMm = gw / (MM_PER_SEC * seconds);

    ctx.clearRect(0, 0, W, H);
    drawGrid(ctx, gx, gy, gw, gh, pxPerMm);

    var durMs = seconds * 1000;
    // Sweep display: the window holds still and the trace is written across it,
    // the way a bedside monitor behaves.
    var winIndex = Math.floor(sim.tMs / durMs);
    var t0 = winIndex * durMs;
    var cursorFrac = (sim.tMs - t0) / durMs;

    drawHighlights(ctx, wv, t0, durMs, gx, gy, gw, gh, opts.highlightTags);

    var geom = drawTrace(ctx, wv, state, opts.lead || state.selectedLead, t0, durMs,
                         gx, gy, gw, gh, pxPerMm, { baseline: 0.60 });

    // Blank the short segment just ahead of the cursor so the sweep reads as a
    // sweep rather than as a wall of overlapping beats.
    if (!opts.static && sim.playing) {
      var cx = gx + cursorFrac * gw;
      var gap = Math.min(gw * 0.03, 26);
      ctx.save();
      ctx.fillStyle = css("--ecg-paper", "#fffdfb");
      ctx.globalAlpha = 0.92;
      ctx.fillRect(cx, gy + 1, gap, gh - 2);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = css("--accent", "#A0522D");
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, gy); ctx.lineTo(cx, gy + gh); ctx.stroke();
      ctx.restore();
    } else {
      var cx2 = gx + cursorFrac * gw;
      ctx.save();
      ctx.strokeStyle = css("--accent", "#A0522D");
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(cx2, gy); ctx.lineTo(cx2, gy + gh); ctx.stroke();
      ctx.restore();
    }

    if (opts.calibration !== false) drawCalibration(ctx, gx + 4, geom.baselineY, pxPerMm);

    ctx.save();
    ctx.fillStyle = css("--muted", "#6B6560");
    ctx.font = "600 12px " + css("--font-ui", "system-ui, sans-serif");
    ctx.textBaseline = "top";
    ctx.fillText((opts.lead || state.selectedLead), gx + 6, gy + 4);
    ctx.textAlign = "right";
    ctx.fillText(seconds + " s  ·  25 mm/s  ·  10 mm/mV", gx + gw - 6, gy + gh + 2);
    ctx.restore();

    var layout = { t0: t0, durMs: durMs, gx: gx, gy: gy, gw: gw, gh: gh, pxPerMm: pxPerMm, geom: geom };
    drawRegionBand(ctx, layout, opts.hoverRegion, "hover");
    drawRegionBand(ctx, layout, opts.selectedRegion, "selected");
    return layout;
  }

  /* ------------------------------------------------------------ beat detail
   *
   * One complex, magnified, with each wave named and the intervals bracketed.
   * This is where a learner who has never read a strip finds out which bump is
   * which — and, because the waves are located from the wavelets that generated
   * them, the labels cannot drift out of step with the tracing.
   */
  function drawBeatDetail(canvas, sim, opts) {
    opts = opts || {};
    var fit = fitCanvas(canvas);
    var ctx = fit.ctx, W = fit.w, H = fit.h;
    var state = sim.state, wv = sim.wave;

    // Park on the last complete beat so the labels are not chasing the cursor.
    var beat = null, beats = sim.schedule.beats;
    for (var i = 0; i < beats.length; i++) {
      if (beats[i].tMs <= sim.tMs) beat = beats[i]; else { if (!beat) beat = beats[i]; break; }
    }

    var padL = 6, padR = 6, padT = 26, padB = 58;
    var gx = padL, gy = padT, gw = W - padL - padR, gh = H - padT - padB;
    ctx.clearRect(0, 0, W, H);

    if (!beat || sim.hemo.noOutput) {
      var pxNoX = gw / (DETAIL_MM_PER_SEC * 1.4);
      var t0no = sim.tMs - 700;
      var rngNo = amplitudeRange(wv, state, [opts.lead || state.selectedLead], t0no, 1400, 4);
      var spanNo = Math.max(1.5, (rngNo.hi - rngNo.lo) + 0.44);
      var pxNoY = gh / (spanNo * MM_PER_MV);
      drawGrid(ctx, gx, gy, gw, gh, pxNoX, pxNoY);
      drawTrace(ctx, wv, state, opts.lead || state.selectedLead, t0no, 1400, gx, gy, gw, gh, pxNoX,
                { pxPerMmY: pxNoY, baselineY: gy + ((rngNo.hi + 0.22) / spanNo) * gh });
      ctx.save();
      ctx.fillStyle = css("--muted", "#6B6560");
      ctx.font = "600 12px " + css("--font-ui", "system-ui, sans-serif");
      ctx.textAlign = "center";
      ctx.fillText(sim.schedule.rhythmId === "asystole"
        ? "No organised complexes to label"
        : "No organised complexes — nothing here is a P, QRS or T", W / 2, gy - 12);
      ctx.restore();
      return;
    }

    // Show one complex and a little breathing room, not two. At slow rates the
    // window is capped so the trace does not shrink into the middle.
    var rr = beat.rrMs || 800;
    var durMs = M.clamp(rr * 1.06, 620, 1500);
    var seconds = durMs / 1000;
    var t0 = beat.tMs - durMs * 0.30;

    // Time is deliberately magnified here, so the horizontal and vertical
    // millimetre scales are set independently: double paper speed across, and
    // whatever vertical scale holds the whole complex. Deriving both from the
    // width is what used to push a 1 mV R wave to 367 px in a 230 px canvas and
    // slice the top off the QRS. A small square still means 0.04 s by 0.1 mV,
    // so counting squares still works.
    var pxX = gw / (DETAIL_MM_PER_SEC * seconds);
    var rng = amplitudeRange(wv, state, [opts.lead || state.selectedLead], t0, durMs, 3);
    var padMv = 0.22;
    var spanMv = Math.max(1.5, (rng.hi - rng.lo) + padMv * 2);
    var pxY = gh / (spanMv * MM_PER_MV);
    var baseY = gy + ((rng.hi + padMv) / spanMv) * gh;

    drawGrid(ctx, gx, gy, gw, gh, pxX, pxY);
    drawHighlights(ctx, wv, t0, durMs, gx, gy, gw, gh, opts.highlightTags);
    var geom = drawTrace(ctx, wv, state, opts.lead || state.selectedLead, t0, durMs,
                         gx, gy, gw, gh, pxX, { pxPerMmY: pxY, baselineY: baseY });

    var toX = function (t) { return gx + ((t - t0) / durMs) * gw; };

    /* Wave names, placed over the wave that produced them. */
    var named = [];
    ["P", "QRS", "T", "U"].forEach(function (tag) {
      var segs = segments(wv, t0, t0 + durMs, tag);
      for (var s = 0; s < segs.length; s++) {
        var mid = (segs[s].t0 + segs[s].t1) / 2;
        if (mid < t0 + 60 || mid > t0 + durMs - 60) continue;
        named.push({ tag: tag, mid: mid, t0: segs[s].t0, t1: segs[s].t1 });
      }
    });

    ctx.save();
    ctx.font = "700 13px " + css("--font-ui", "system-ui, sans-serif");
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    named.forEach(function (n) {
      var x = toX(n.mid);
      ctx.fillStyle = css("--accent", "#A0522D");
      ctx.fillText(n.tag, x, gy - 6);
      ctx.strokeStyle = css("--accent", "#A0522D");
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, gy - 4); ctx.lineTo(x, gy + 4); ctx.stroke();
      ctx.globalAlpha = 1;
    });
    ctx.restore();

    /* Interval brackets along the bottom. */
    var pSeg = named.filter(function (n) { return n.tag === "P"; })[0];
    var qSeg = named.filter(function (n) { return n.tag === "QRS"; })[0];
    var tSeg = named.filter(function (n) { return n.tag === "T"; })[0];
    var by = gy + gh + 12;

    function bracket(a, b, label, row) {
      if (a === null || b === null || b <= a) return;
      var x1 = toX(a), x2 = toX(b);
      if (x2 - x1 < 12) return;
      var y = by + row * 15;
      ctx.save();
      ctx.strokeStyle = css("--muted", "#6B6560");
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, y - 4); ctx.lineTo(x1, y); ctx.lineTo(x2, y); ctx.lineTo(x2, y - 4);
      ctx.stroke();
      ctx.fillStyle = css("--muted", "#6B6560");
      ctx.font = "600 11px " + css("--font-ui", "system-ui, sans-serif");
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(label, (x1 + x2) / 2, y + 1);
      ctx.restore();
    }

    // Only measure a PR where a P actually conducted to this QRS. In complete
    // block the two are independent, so the distance between them is not a PR
    // interval and printing one would invent a relationship.
    var prMeasurable = sim.schedule.rhythmId !== "avb3" &&
                       sim.schedule.rhythmId !== "aflutter" &&
                       sim.schedule.rhythmId !== "af" &&
                       !!(beat && beat.prMs);
    if (!state.hideName) {
      if (pSeg && qSeg && prMeasurable) bracket(pSeg.t0, qSeg.t0, "PR " + ((qSeg.t0 - pSeg.t0) / 1000).toFixed(2) + " s", 0);
      if (qSeg && tSeg) bracket(qSeg.t0, tSeg.t1, "QT " + ((tSeg.t1 - qSeg.t0) / 1000).toFixed(2) + " s", 1);
      if (qSeg) bracket(qSeg.t0, qSeg.t1, "QRS " + ((qSeg.t1 - qSeg.t0) / 1000).toFixed(2) + " s", prMeasurable ? 2 : 0);
    }

    ctx.save();
    ctx.fillStyle = css("--muted", "#6B6560");
    ctx.font = "500 11px " + css("--font-ui", "system-ui, sans-serif");
    ctx.textAlign = "right"; ctx.textBaseline = "bottom";
    ctx.fillText("50 mm/s · small square = 0.04 s × 0.1 mV", gx + gw - 6, gy + gh - 5);
    ctx.restore();

    var layout = { t0: t0, durMs: durMs, gx: gx, gy: gy, gw: gw, gh: gh };
    drawRegionBand(ctx, layout, opts.hoverRegion, "hover");
    drawRegionBand(ctx, layout, opts.selectedRegion, "selected");
    return layout;
  }

  /* ---------------------------------------------------------- 12-lead grid */

  function drawTwelve(canvas, sim, opts) {
    opts = opts || {};
    var fit = fitCanvas(canvas);
    var ctx = fit.ctx, W = fit.w, H = fit.h;
    var state = sim.state, wv = sim.wave;

    var rows = C.GRID_ROWS;
    var padL = 4, padR = 4, padT = 4, padB = 4;
    var rhythmH = opts.rhythmStrip === false ? 0 : Math.max(56, (H - padT - padB) * 0.22);
    var gridH = H - padT - padB - rhythmH;
    var cellW = (W - padL - padR) / 4;
    var cellH = gridH / 3;

    ctx.clearRect(0, 0, W, H);

    // Every cell shows the SAME 2.5 seconds. This is a simultaneous display, not
    // the sequential columns of a printed ECG.
    var segMs = 2500;
    var t0 = Math.floor(sim.tMs / segMs) * segMs;
    var cursorFrac = (sim.tMs - t0) / segMs;

    var pxPerMm = cellW / (MM_PER_SEC * (segMs / 1000));

    /* One gain for the whole grid so leads stay comparable, but each cell is
     * centred on its OWN isoelectric line, the way a printed ECG is. Sizing
     * every cell to the range spanned by all twelve leads together would force
     * half gain on a perfectly normal tracing. Gain drops only when the tallest
     * single lead genuinely will not fit — which left ventricular hypertrophy
     * does — and the grid says so when it happens. */
    var perLead = {}, worstSpan = 0;
    for (var li = 0; li < C.LEAD_ORDER.length; li++) {
      var lk = C.LEAD_ORDER[li];
      var rl = amplitudeRange(wv, state, [lk], t0, segMs, 8);
      perLead[lk] = rl;
      worstSpan = Math.max(worstSpan, rl.hi - rl.lo);
    }
    var neededPx = (worstSpan + 0.25) * MM_PER_MV * pxPerMm;
    var gain = neededPx > (cellH - 8) ? 0.5 : 1;

    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 4; c++) {
        var lead = rows[r][c];
        var x = padL + c * cellW, y = padT + r * cellH;
        drawGrid(ctx, x, y, cellW - 1, cellH - 1, pxPerMm);
        drawHighlights(ctx, wv, t0, segMs, x, y, cellW - 1, cellH - 1, opts.highlightTags);
        drawTrace(ctx, wv, state, lead, t0, segMs, x, y, cellW - 1, cellH - 1, pxPerMm,
                  { thin: true, gain: gain,
                    baselineY: y + (cellH - 1) / 2 +
                      ((perLead[lead].hi + perLead[lead].lo) / 2) * MM_PER_MV * pxPerMm * gain,
                    color: lead === state.selectedLead ? css("--accent", "#A0522D") : null });

        ctx.save();
        ctx.font = "700 12px " + css("--font-ui", "system-ui, sans-serif");
        ctx.fillStyle = lead === state.selectedLead ? css("--accent", "#A0522D") : css("--ink", "#1A1A1A");
        ctx.textBaseline = "top";
        ctx.fillText(lead, x + 5, y + 3);
        ctx.restore();

        if (lead === state.selectedLead) {
          ctx.save();
          ctx.strokeStyle = css("--accent", "#A0522D");
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, cellW - 3, cellH - 3);
          ctx.restore();
        }

        ctx.save();
        ctx.strokeStyle = css("--rule", "#DED7CC");
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);
        ctx.restore();
      }
    }

    if (rhythmH > 0) {
      var ry = padT + gridH;
      var rPxPerMm = (W - padL - padR) / (MM_PER_SEC * (segMs / 1000) * 2.4);
      drawGrid(ctx, padL, ry, W - padL - padR, rhythmH - 2, rPxPerMm);
      drawTrace(ctx, wv, state, "II", t0 - segMs * 1.4, segMs * 2.4,
                padL, ry, W - padL - padR, rhythmH - 2, rPxPerMm, { baseline: 0.58 });
      ctx.save();
      ctx.font = "700 12px " + css("--font-ui", "system-ui, sans-serif");
      ctx.fillStyle = css("--ink", "#1A1A1A");
      ctx.textBaseline = "top";
      ctx.fillText("II — rhythm strip", padL + 5, ry + 3);
      ctx.textAlign = "right";
      ctx.fillStyle = css("--muted", "#6B6560");
      ctx.fillText("25 mm/s · " + (gain === 1 ? "10 mm/mV" : "5 mm/mV (half gain — complexes are too tall for full gain)"),
                   W - padR - 5, ry + 3);
      ctx.restore();
    }

    // One cursor across the whole grid, because all twelve are one moment.
    ctx.save();
    ctx.strokeStyle = css("--accent", "#A0522D");
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.6;
    for (var cc = 0; cc < 4; cc++) {
      var lx = padL + cc * cellW + cursorFrac * (cellW - 1);
      ctx.beginPath(); ctx.moveTo(lx, padT); ctx.lineTo(lx, padT + gridH); ctx.stroke();
    }
    ctx.restore();

    return { t0: t0, segMs: segMs, cellW: cellW, cellH: cellH, padL: padL, padT: padT, gridH: gridH };
  }

  /* Which grid cell is under a pointer, so the learner can click a lead. */
  function leadAtPoint(canvas, layout, clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    var x = clientX - r.left, y = clientY - r.top;
    if (y > layout.padT + layout.gridH) return "II";
    var c = Math.floor((x - layout.padL) / layout.cellW);
    var rw = Math.floor((y - layout.padT) / layout.cellH);
    if (c < 0 || c > 3 || rw < 0 || rw > 2) return null;
    return C.GRID_ROWS[rw][c];
  }

  /* ------------------------------------------------------------ vector loop */

  /* The QRS loop in the frontal plane. Shows directly why a lead that faces the
   * loop records a tall R and a lead that faces away records a deep S. */
  function drawVectorLoop(canvas, sim, opts) {
    opts = opts || {};
    var fit = fitCanvas(canvas);
    var ctx = fit.ctx, W = fit.w, H = fit.h;
    var cx = W / 2, cy = H / 2;
    var scale = Math.min(W, H) * 0.32;

    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.strokeStyle = css("--rule", "#DED7CC");
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, scale, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - scale, cy); ctx.lineTo(cx + scale, cy);
    ctx.moveTo(cx, cy - scale); ctx.lineTo(cx, cy + scale); ctx.stroke();
    ctx.restore();

    // Lead axes of the frontal plane.
    ctx.save();
    ctx.font = "600 11px " + css("--font-ui", "system-ui, sans-serif");
    C.LIMB_LEADS.forEach(function (lead) {
      var info = VEC.LEAD_INFO[lead];
      var a = info.angle * Math.PI / 180;
      var sel = lead === sim.state.selectedLead;
      ctx.strokeStyle = sel ? css("--accent", "#A0522D") : css("--quiet", "#9E9890");
      ctx.lineWidth = sel ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(a) * scale * 0.9, cy - Math.sin(a) * scale * 0.9);
      ctx.lineTo(cx + Math.cos(a) * scale * 1.06, cy + Math.sin(a) * scale * 1.06);
      ctx.stroke();
      ctx.fillStyle = sel ? css("--accent", "#A0522D") : css("--muted", "#6B6560");
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(lead, cx + Math.cos(a) * scale * 1.2, cy + Math.sin(a) * scale * 1.2);
    });
    ctx.restore();

    // The loop itself, over the beat nearest the current time.
    var beat = null, beats = sim.schedule.beats;
    for (var i = 0; i < beats.length; i++) {
      if (beats[i].tMs <= sim.tMs + 260) beat = beats[i]; else break;
    }
    if (!beat) return;

    var span = 200, step = 2;
    var vscale = scale / 1.5;
    ctx.save();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = css("--conduction", "#EDB52E");
    ctx.beginPath();
    var started = false;
    for (var t = beat.tMs - 20; t < beat.tMs + span; t += step) {
      var d = E.dipoleAt(sim.wave, t);
      var px = cx + d[0] * vscale, py = cy + d[1] * vscale;
      if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    // The instantaneous vector right now.
    var dn = E.dipoleAt(sim.wave, sim.tMs);
    var mag = Math.hypot(dn[0], dn[1]);
    if (mag > 0.02) {
      ctx.save();
      ctx.strokeStyle = css("--ink", "#1A1A1A");
      ctx.fillStyle = css("--ink", "#1A1A1A");
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + dn[0] * vscale, cy + dn[1] * vscale);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + dn[0] * vscale, cy + dn[1] * vscale, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = css("--muted", "#6B6560");
    ctx.font = "500 10px " + css("--font-ui", "system-ui, sans-serif");
    ctx.textAlign = "center";
    ctx.fillText("frontal plane", cx, H - 4);
    ctx.restore();
  }

  C.render.ecg = {
    MM_PER_SEC: MM_PER_SEC, MM_PER_MV: MM_PER_MV,
    drawStrip: drawStrip, drawTwelve: drawTwelve, drawVectorLoop: drawVectorLoop,
    drawBeatDetail: drawBeatDetail,
    leadAtPoint: leadAtPoint, segments: segments, TAG_LABEL: TAG_LABEL,
    waveRegions: waveRegions, regionAt: regionAt, timeAtX: timeAtX,
    fitCanvas: fitCanvas
  };
})(window.CARDIAC);
