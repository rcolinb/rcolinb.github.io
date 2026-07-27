/* 50-ui-glossary.js — turn defined terms in already-written prose into buttons.
 *
 * Lesson text is a plain string rendered with textContent, and the five existing
 * sequences went through a clinical review pass. So rather than marking terms up
 * by hand — which would mean editing reviewed prose, and which fails open the
 * moment somebody forgets to tag a word — this walks the rendered text nodes and
 * linkifies whatever it recognises. Adding a term to the glossary makes it
 * clickable everywhere it already appears, retroactively.
 *
 * Definitions open inline, immediately under the paragraph they came from. Not
 * a tooltip (dead on touch, keyboard and screen readers) and not the shared
 * explainer panel, which lives a column away in the ECG pane and gets hidden
 * whenever the rhythm changes — a definition that vanishes when a lesson step
 * changes rhythm is worse than no definition.
 *
 * Loads before 53-ui-lessons.js so C.ui.glossary exists when lessons render.
 */
(function (C) {
  "use strict";

  var MAX_PER_BLOCK = 3;      // a paragraph of buttons is not a paragraph
  var uid = 0;
  var matcher = null;         // built lazily, once the content files have run

  function build() {
    if (matcher) return matcher;
    var pairs = [];
    Object.keys(C.content.glossary).forEach(function (id) {
      var g = C.content.glossary[id];
      pairs.push([g.term, id]);
      (g.also || []).forEach(function (a) { pairs.push([a, id]); });
    });
    /* Longest alias first, or "atrial" swallows the start of "atrial kick" and
     * the more specific entry never fires. */
    pairs.sort(function (a, b) { return b[0].length - a[0].length; });

    var index = {};
    var alts = pairs.map(function (p) {
      index[p[0].toLowerCase()] = p[1];
      return p[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    });
    matcher = {
      re: new RegExp("\\b(" + alts.join("|") + ")\\b", "i"),
      index: index
    };
    return matcher;
  }

  function idFor(text) {
    return build().index[String(text).toLowerCase()] || null;
  }

  /* Walk text nodes and replace the first few recognised terms with buttons.
   * Idempotent: nodes already inside a .gloss are skipped, so running twice
   * changes nothing. */
  function decorate(root) {
    if (!root || root.closest && root.closest('[data-gloss="off"]')) return root;
    /* Idempotent by mark, not by inspection. The text left over after a button
     * is a sibling of it, not a descendant, so a second pass would happily
     * match it again and stack up duplicate buttons. */
    if (root.getAttribute && root.getAttribute("data-gloss-done") === "1") return root;
    if (root.setAttribute) root.setAttribute("data-gloss-done", "1");

    var m = build();
    var used = {}, made = 0;

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        while (p && p !== root) {
          if (p.classList && (p.classList.contains("gloss") || p.classList.contains("gloss-def"))) {
            return NodeFilter.FILTER_REJECT;
          }
          if (p.getAttribute && p.getAttribute("data-gloss") === "off") return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    var texts = [], n;
    while ((n = walker.nextNode())) texts.push(n);

    texts.forEach(function (node) {
      /* Keep matching the remainder of this node, not just its first term — a
       * step's whole sentence is usually a single text node, so stopping after
       * one match meant only ever one definable word per step. */
      while (made < MAX_PER_BLOCK) {
        var hit = m.re.exec(node.nodeValue);
        if (!hit) return;
        var id = idFor(hit[1]);
        if (!id) return;
        // One button per term per block: the third reminder is noise.
        if (used[id]) {
          // Skip past this occurrence and keep looking for a different term.
          var skip = document.createTextNode(node.nodeValue.slice(0, hit.index + hit[1].length));
          node.parentNode.insertBefore(skip, node);
          node.nodeValue = node.nodeValue.slice(hit.index + hit[1].length);
          continue;
        }
        used[id] = 1; made++;

        var before = node.nodeValue.slice(0, hit.index);
        var after = node.nodeValue.slice(hit.index + hit[1].length);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "gloss";
        btn.textContent = hit[1];
        btn.setAttribute("data-term", id);
        btn.setAttribute("aria-expanded", "false");
        btn.setAttribute("aria-controls", "glossdef-" + (++uid));
        btn.addEventListener("click", function (e) { e.preventDefault(); toggle(btn); });

        var parent = node.parentNode;
        parent.insertBefore(document.createTextNode(before), node);
        parent.insertBefore(btn, node);
        node.nodeValue = after;
      }
    });

    return root;
  }

  function toggle(btn) {
    var id = btn.getAttribute("data-term");
    var g = C.content.glossary[id];
    if (!g) return;
    var defId = btn.getAttribute("aria-controls");
    var open = btn.getAttribute("aria-expanded") === "true";

    // One definition open at a time in a given pane, so the panel does not
    // become a stack of half-read boxes.
    var pane = btn.closest(".rail-pane") || btn.ownerDocument.body;
    pane.querySelectorAll(".gloss[aria-expanded='true']").forEach(function (b) {
      if (b !== btn) closeDef(b);
    });

    if (open) return closeDef(btn);

    var host = btn.closest("p, li, dd, .step-text") || btn.parentNode;
    var box = document.createElement("div");
    box.className = "gloss-def";
    box.id = defId;

    var t = document.createElement("b");
    t.textContent = g.term;
    box.appendChild(t);
    var s = document.createElement("span");
    s.textContent = " — " + g.short;
    box.appendChild(s);

    // A definition is also a doorway to the same explain-this machinery the
    // rest of the product uses, rather than a fourth parallel one.
    if (g.see || g.wave) {
      var row = document.createElement("div");
      row.className = "gloss-links";
      if (g.see && C.content.parts[g.see]) {
        row.appendChild(pill("Show me on the heart", function () { C.api.inspectPart(g.see); }));
      }
      if (g.wave && C.content.waveGuide[g.wave]) {
        row.appendChild(pill("Show me on the tracing", function () { C.api.showWave(g.wave); }));
      }
      if (row.childNodes.length) box.appendChild(row);
    }

    host.parentNode.insertBefore(box, host.nextSibling);
    btn.setAttribute("aria-expanded", "true");
  }

  function pill(label, fn) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "pill"; b.textContent = label;
    b.addEventListener("click", fn);
    return b;
  }

  function closeDef(btn) {
    var box = document.getElementById(btn.getAttribute("aria-controls"));
    if (box && box.parentNode) box.parentNode.removeChild(box);
    btn.setAttribute("aria-expanded", "false");
  }

  /* The whole list, rendered wherever it is asked for. No sixth rail tab: the
   * tablist is already five wide and collapses at 1180px. */
  function renderAll(host) {
    var dl = document.createElement("dl");
    dl.className = "gloss-list";
    dl.setAttribute("data-gloss", "off");     // do not linkify the glossary itself
    Object.keys(C.content.glossary)
      .map(function (id) { return C.content.glossary[id]; })
      .sort(function (a, b) { return a.term.localeCompare(b.term); })
      .forEach(function (g) {
        var dt = document.createElement("dt"); dt.textContent = g.term;
        var dd = document.createElement("dd"); dd.textContent = g.short;
        dl.appendChild(dt); dl.appendChild(dd);
      });
    host.appendChild(dl);
    return host;
  }

  C.ui.glossary = { decorate: decorate, renderAll: renderAll, idFor: idFor };
})(CARDIAC);
