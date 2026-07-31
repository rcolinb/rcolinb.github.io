(function () {
  'use strict';

  /* Already running? Just toggle the panel. */
  if (document.getElementById('sdf-fab')) {
    var panel = document.getElementById('sdf-panel');
    if (panel) panel.classList.toggle('open');
    return;
  }

  /* ── Brand palette ───────────────────────────────────────────── */
  var C = {
    cream:'#FAF7F2', linen:'#F5F0E8', clay:'#A0522D', clayDk:'#8B4513',
    ink:'#1A1A1A', sage:'#7A8B7A', mist:'#9E9890', parch:'#EDE7DA',
    red:'#B85450', redLt:'#F5E6E5', grn:'#5B8C5A', grnLt:'#E8F0E8', wht:'#ffffff'
  };

  /* ── Known literary journals (for autocomplete) ──────────────── */
  var KNOWN = [
    'AGNI','Alaska Quarterly Review','American Poetry Review','American Short Fiction',
    'Antioch Review','Baltimore Review','Bellevue Literary Review','Black Warrior Review',
    'Boulevard','Brevity','Callaloo','Carve Magazine','Catapult','Chicago Review',
    'Cincinnati Review','Colorado Review','Conjunctions','Copper Nickel',
    'Crab Orchard Review','Craft Literary','Creative Nonfiction','Cutbank','Ecotone',
    'Electric Literature','Five Points','Florida Review','Flyway','Fourth Genre',
    'Frontier Poetry','Fugue','Georgia Review','Gettysburg Review','Granta','Guernica',
    'Gulf Coast','Harvard Review','Heavy Feather Review','Hudson Review','Image',
    'Indiana Review','Iowa Review','Kenyon Review','Massachusetts Review','McSweeneys',
    'Meridian','Missouri Review','Modern Haiku','Narrative','New England Review',
    'Nimrod','Ninth Letter','One Story','Orion','Oxford American','PANK','Panorama',
    'Paris Review','Pleiades','Ploughshares','Poetry','Prairie Schooner','Rattle',
    'River Teeth','Sewanee Review','Shenandoah','SmokeLong Quarterly','Southern Review',
    'Split Lip Magazine','Sun Magazine','Third Coast','Tin House',
    'Virginia Quarterly Review','West Trade Review','Wild Willow Magazine',
    'Willow Springs','X-R-A-Y Literary Magazine','Zoetrope: All-Story','Zyzzva'
  ].sort();

  var DEF_KW = [
    'screenwriting','screenplay','journalism','film','filmmaking','photography',
    'music','songwriting','playwriting','theatre','theater','dance','podcast',
    'visual art','visual arts','comic','comics','graphic novel','manga',
    'business','corporate','marketing','technical writing'
  ];

  var TYPES = [
    'grant','residency','fellowship','award','scholarship',
    'contest','anthology','chapbook contest','book contest'
  ];

  /* ── LocalStorage helpers ────────────────────────────────────── */
  function LS(key, val) {
    if (val === undefined) {
      try { return JSON.parse(localStorage.getItem('sdf_' + key)); }
      catch (e) { return null; }
    }
    localStorage.setItem('sdf_' + key, JSON.stringify(val));
  }

  /* ── State ───────────────────────────────────────────────────── */
  var st = {
    on:    LS('on') !== false,
    pubs:  LS('pubs')  || [],
    kws:   LS('kws')   || DEF_KW.slice(),
    types: LS('types')  || ['grant','residency','fellowship','award','scholarship'],
    orgs:  LS('orgs')  || {},
    seen:  LS('seen')  || {}
  };

  function save() {
    LS('on', st.on); LS('pubs', st.pubs); LS('kws', st.kws);
    LS('types', st.types); LS('orgs', st.orgs); LS('seen', st.seen);
  }

  var hidden = 0, total = 0, newC = 0, panelOpen = false, tab = 'freq';

  /* ── Inject CSS ──────────────────────────────────────────────── */
  var css = document.createElement('style');
  css.id = 'sdf-css';
  css.textContent = [
    '.sdf-hide{display:none!important}',

    '#sdf-fab{position:fixed;bottom:14px;right:14px;z-index:99999;width:52px;height:52px;',
    'border-radius:50%;background:'+C.clay+';color:'+C.cream+';border:none;cursor:pointer;',
    'font-size:20px;font-weight:700;box-shadow:0 3px 16px rgba(0,0,0,.22);display:flex;',
    'align-items:center;justify-content:center;font-family:system-ui,sans-serif;',
    '-webkit-tap-highlight-color:transparent;touch-action:manipulation}',
    '#sdf-fab:active{transform:scale(.94)}',

    '.sdf-bdg{position:absolute;top:-4px;right:-4px;background:'+C.red+';color:#fff;',
    'border-radius:10px;font-size:10px;font-weight:700;padding:1px 5px;min-width:14px;',
    'text-align:center;line-height:16px}',
    '.sdf-bdg-n{position:absolute;top:-4px;left:-4px;background:'+C.grn+';color:#fff;',
    'border-radius:10px;font-size:10px;font-weight:700;padding:1px 5px;min-width:14px;',
    'text-align:center;line-height:16px}',

    '#sdf-panel{position:fixed;bottom:74px;right:10px;left:10px;max-width:420px;',
    'max-height:75vh;z-index:99998;background:'+C.cream+';border:1px solid '+C.parch+';',
    'border-radius:14px;box-shadow:0 6px 28px rgba(0,0,0,.16);',
    'font-family:system-ui,sans-serif;font-size:13px;color:'+C.ink+';',
    'display:none;flex-direction:column;overflow:hidden}',
    '#sdf-panel.open{display:flex}',

    '.sdf-h{padding:12px 14px 8px;background:'+C.linen+';border-bottom:1px solid '+C.parch+';flex-shrink:0}',
    '.sdf-h h2{margin:0 0 3px;font-family:Georgia,serif;font-size:16px;font-weight:700;color:'+C.clay+'}',
    '.sdf-h .st{display:flex;gap:10px;font-size:11px;color:'+C.mist+';flex-wrap:wrap}',
    '.sdf-h .st .r{color:'+C.red+';font-weight:600}',
    '.sdf-h .st .g{color:'+C.grn+';font-weight:600}',

    '.sdf-ts{display:flex;border-bottom:1px solid '+C.parch+';background:'+C.linen+';',
    'padding:0 6px;flex-shrink:0;overflow-x:auto;-webkit-overflow-scrolling:touch}',
    '.sdf-t{padding:7px 9px;border:none;background:0;cursor:pointer;font-size:11.5px;',
    'color:'+C.mist+';border-bottom:2px solid transparent;font-family:inherit;white-space:nowrap}',
    '.sdf-t.a{font-weight:700;color:'+C.clay+';border-bottom-color:'+C.clay+'}',

    '.sdf-bd{flex:1;overflow-y:auto;padding:10px 14px;-webkit-overflow-scrolling:touch;max-height:55vh}',

    '.sdf-rw{display:flex;align-items:center;gap:7px;padding:5px 0;border-bottom:1px solid '+C.parch+';font-size:12px}',
    '.sdf-rw:last-child{border-bottom:0}',
    '.sdf-rw.blk{opacity:.3}',
    '.sdf-ct{min-width:26px;text-align:center;font-weight:700;border-radius:6px;padding:1px 5px;font-size:11px;flex-shrink:0}',
    '.sdf-ct.hi{background:'+C.redLt+';color:'+C.red+'}',
    '.sdf-ct.md{background:'+C.linen+';color:'+C.clay+'}',
    '.sdf-ct.lo{color:'+C.mist+'}',
    '.sdf-nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.sdf-nm.x{text-decoration:line-through;color:'+C.mist+'}',

    '.sdf-b{padding:6px 12px;background:'+C.clay+';color:'+C.cream+';border:none;',
    'border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap}',
    '.sdf-b.r{background:'+C.red+'}.sdf-b.o{background:#C87A5A}',
    '.sdf-b.s{background:'+C.sage+'}.sdf-b.m{background:'+C.mist+'}',

    '.sdf-sb{background:0;border:1px solid;border-radius:4px;font-size:10px;padding:2px 7px;',
    'cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0}',
    '.sdf-sb.bl{border-color:'+C.red+';color:'+C.red+'}',
    '.sdf-sb.ub{border-color:'+C.sage+';color:'+C.sage+'}',

    '.sdf-nt{font-size:12px;color:'+C.mist+';line-height:1.5;margin:0 0 8px}',
    '.sdf-ta{width:100%;box-sizing:border-box;border:1px solid '+C.parch+';border-radius:6px;',
    'padding:7px;font-size:11px;font-family:monospace;resize:vertical;min-height:50px;background:'+C.wht+'}',
    '.sdf-in{flex:1;padding:7px 10px;border:1px solid '+C.parch+';border-radius:6px;',
    'font-size:13px;font-family:inherit;background:'+C.wht+';outline:none;box-sizing:border-box;min-width:0}',

    '.sdf-tg{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:11px;',
    'font-size:11px;font-weight:500;margin:0 3px 4px 0}',
    '.sdf-tgx{background:0;border:none;cursor:pointer;font-size:12px;padding:0;line-height:1;font-weight:700;opacity:.7}',

    '.sdf-tb{display:inline-flex;padding:5px 10px;border-radius:14px;font-size:11px;',
    'cursor:pointer;font-family:inherit;margin:0 4px 5px 0}',
    '.sdf-tb.on{background:'+C.redLt+';color:'+C.red+';border:1px solid '+C.red+';font-weight:600}',
    '.sdf-tb.off{background:'+C.wht+';color:'+C.mist+';border:1px solid '+C.parch+'}',

    '.sdf-ac{position:absolute;top:100%;left:0;right:0;z-index:100;background:'+C.wht+';',
    'border:1px solid '+C.parch+';border-radius:0 0 6px 6px;box-shadow:0 4px 12px rgba(0,0,0,.08);',
    'max-height:180px;overflow-y:auto}',
    '.sdf-aci{padding:8px 12px;font-size:13px;cursor:pointer;border-bottom:1px solid '+C.parch+';color:'+C.ink+'}',
    '.sdf-aci:last-child{border-bottom:0}',
    '.sdf-aci:active,.sdf-aci.sel{background:'+C.linen+'}',
    '.sdf-acm{color:'+C.clay+';font-weight:700}',

    '.sdf-br{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap}',
    '.sdf-lb{font-size:12px;font-weight:600;color:'+C.ink+';margin:0 0 6px}',
    '.sdf-ib{margin-top:12px;padding:10px;background:'+C.linen+';border-radius:8px;border:1px solid '+C.parch+'}',
    '.sdf-ib p{margin:0;font-size:11.5px;color:'+C.mist+';line-height:1.5}',
    '.sdf-ib strong{color:'+C.ink+'}',

    '.sdf-cb{position:absolute;top:4px;right:4px;background:'+C.red+';color:#fff;border:none;',
    'border-radius:4px;font-size:10px;padding:3px 7px;cursor:pointer;opacity:0;',
    'transition:opacity .15s;z-index:10}',
    '[data-sdf]:hover .sdf-cb,[data-sdf]:active .sdf-cb{opacity:.9}',
    '.sdf-nd{position:absolute;top:6px;left:6px;font-size:9px;font-weight:700;color:'+C.grn+';',
    'background:'+C.grnLt+';border-radius:3px;padding:1px 5px;z-index:10}',

    '@media(max-width:480px){#sdf-panel{left:6px;right:6px;bottom:70px;max-height:70vh}}'
  ].join('\n');
  document.head.appendChild(css);

  /* ── Utility ─────────────────────────────────────────────────── */
  function esc(s)  { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escA(s) { return (s||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  function isBlk(name) {
    var lo = name.toLowerCase();
    return st.pubs.some(function(p) { return p.toLowerCase() === lo; });
  }

  function blk(name) {
    if (isBlk(name)) return;
    st.pubs.push(name);
    st.pubs.sort();
    save(); proc(); render();
  }

  function ublk(name) {
    var lo = name.toLowerCase();
    st.pubs = st.pubs.filter(function(p) { return p.toLowerCase() !== lo; });
    save(); proc(); render();
  }

  function blkAbove(n) {
    var add = Object.entries(st.orgs)
      .filter(function(e) { return e[1] >= n && !isBlk(e[0]); })
      .map(function(e) { return e[0]; });
    st.pubs = st.pubs.concat(add)
      .filter(function(v, i, a) { return a.indexOf(v) === i; })
      .sort();
    save(); proc(); render();
  }

  /* ── Card detection ──────────────────────────────────────────── */
  function findCards() {
    var sels = [
      '[class*="OpportunityCard"]','[class*="opportunity-card"]',
      '[class*="DiscoverCard"]','[class*="discover-item"]',
      '[data-testid*="opportunity"]','[role="listitem"]'
    ];
    for (var i = 0; i < sels.length; i++) {
      var nodes = document.querySelectorAll(sels[i]);
      if (nodes.length > 2) return Array.from(nodes);
    }
    var m = document.querySelector('#user-view,[class*="discover"],main,[role="main"]');
    if (!m) return [];
    var links = m.querySelectorAll('a[href*="/submit"]');
    if (links.length > 2) {
      return Array.from(links).map(function(a) {
        var e = a;
        for (var j = 0; j < 5; j++) {
          if (e.parentElement && e.parentElement !== m) e = e.parentElement;
          else break;
        }
        return e;
      }).filter(function(e, i, a) { return a.indexOf(e) === i; });
    }
    var lists = m.querySelectorAll('ul,[class*="list"],[class*="List"]');
    for (var k = 0; k < lists.length; k++) {
      if (lists[k].children.length > 3) return Array.from(lists[k].children);
    }
    return [];
  }

  function getOrg(card) {
    var els = card.querySelectorAll('span,div,p,a,h3,h4,strong,b');
    for (var i = 0; i < els.length; i++) {
      var t = els[i].textContent.trim();
      if (t.length < 3 || t.length > 70) continue;
      if (/^(ends? in|deadline|no deadline|free|fee|\$|tags?:|submit|apply|view|follow|save|load)/i.test(t)) continue;
      if (/^\d/.test(t)) continue;
      if (t === t.toUpperCase() && t.length > 10) continue;
      if (els[i].children.length > 3) continue;
      if (els[i].offsetHeight === 0) continue;
      return t;
    }
    return null;
  }

  function hsh(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
    return 'i' + Math.abs(h).toString(36);
  }

  function shouldHide(txt) {
    if (!st.on) return false;
    var lo = txt.toLowerCase();
    for (var i = 0; i < st.pubs.length; i++)
      if (st.pubs[i] && lo.indexOf(st.pubs[i].toLowerCase()) >= 0) return true;
    for (var j = 0; j < st.kws.length; j++)
      if (st.kws[j] && lo.indexOf(st.kws[j].toLowerCase()) >= 0) return true;
    for (var k = 0; k < st.types.length; k++)
      if (st.types[k] && lo.indexOf(st.types[k].toLowerCase()) >= 0) return true;
    return false;
  }

  /* ── Process listings ────────────────────────────────────────── */
  function proc() {
    var cards = findCards();
    hidden = 0; total = 0; newC = 0;
    var now = new Date().toISOString();
    var pc = {};

    cards.forEach(function(c) {
      if (c.id === 'sdf-fab' || c.id === 'sdf-panel' || c.closest('#sdf-panel')) return;
      total++;

      var org = getOrg(c);
      var txt = c.textContent || '';
      var lid = hsh(txt.trim().substring(0, 200));

      if (org) pc[org] = (pc[org] || 0) + 1;

      var isNew = !st.seen[lid];
      if (isNew) { st.seen[lid] = now; newC++; }

      if (shouldHide(txt)) { c.classList.add('sdf-hide'); hidden++; }
      else { c.classList.remove('sdf-hide'); }

      if (!c.hasAttribute('data-sdf')) {
        c.setAttribute('data-sdf', '1');
        c.style.position = c.style.position || 'relative';
        if (org) {
          var btn = document.createElement('button');
          btn.className = 'sdf-cb';
          btn.textContent = '\u2715 Block ' + org.substring(0, 22);
          btn.onclick = function(e) { e.preventDefault(); e.stopPropagation(); blk(org); };
          c.appendChild(btn);
        }
        if (isNew) {
          var dot = document.createElement('span');
          dot.className = 'sdf-nd';
          dot.textContent = 'NEW';
          c.appendChild(dot);
        }
      }
    });

    for (var o in pc) st.orgs[o] = Math.max(st.orgs[o] || 0, pc[o]);
    save();
    updFab();
  }

  /* ── FAB button ──────────────────────────────────────────────── */
  var fab = document.createElement('button');
  fab.id = 'sdf-fab';
  fab.textContent = '\u2298';
  fab.onclick = function() {
    panelOpen = !panelOpen;
    document.getElementById('sdf-panel').classList.toggle('open', panelOpen);
    if (panelOpen) render();
  };
  document.body.appendChild(fab);

  function updFab() {
    fab.querySelectorAll('.sdf-bdg,.sdf-bdg-n').forEach(function(b) { b.remove(); });
    if (hidden > 0) {
      var b1 = document.createElement('span');
      b1.className = 'sdf-bdg'; b1.textContent = hidden;
      fab.appendChild(b1);
    }
    if (newC > 0) {
      var b2 = document.createElement('span');
      b2.className = 'sdf-bdg-n'; b2.textContent = newC;
      fab.appendChild(b2);
    }
  }

  /* ── Panel ───────────────────────────────────────────────────── */
  var panel = document.createElement('div');
  panel.id = 'sdf-panel';
  document.body.appendChild(panel);

  function render() {
    var so = Object.entries(st.orgs).sort(function(a, b) { return b[1] - a[1]; });

    var h = '<div class="sdf-h"><h2>Submittable Filter</h2>' +
      '<div class="st">' +
      '<span class="r">' + hidden + ' hidden</span>' +
      '<span>' + total + ' on page</span>' +
      '<span class="g">' + newC + ' new</span>' +
      '<span>' + so.length + ' orgs</span></div></div>';

    h += '<div class="sdf-ts">';
    [{id:'freq',l:'Frequency'},{id:'blkd',l:'Blocked ('+st.pubs.length+')'},{id:'kw',l:'Keywords'},{id:'cfg',l:'Settings'}]
      .forEach(function(t) {
        h += '<button class="sdf-t ' + (tab === t.id ? 'a' : '') + '" data-t="' + t.id + '">' + t.l + '</button>';
      });
    h += '</div><div class="sdf-bd" id="sdf-bd"></div>';

    panel.innerHTML = h;
    panel.querySelectorAll('.sdf-t').forEach(function(b) {
      b.onclick = function() { tab = b.dataset.t; render(); };
    });

    var bd = panel.querySelector('#sdf-bd');

    /* ── Frequency tab ───────────────────────────────────────── */
    if (tab === 'freq') {
      var inner = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
        '<input type="checkbox" id="sdf-en" ' + (st.on ? 'checked' : '') + ' style="accent-color:'+C.clay+'">' +
        '<label for="sdf-en" style="font-size:12px;font-weight:600;cursor:pointer">Filter ' + (st.on ? 'on' : 'off') + '</label></div>';

      if (so.length === 0) {
        inner += '<p class="sdf-nt">Scroll through the Discover page to auto-detect publications and their posting frequency.</p>';
      } else {
        inner += '<div class="sdf-br">' +
          '<button class="sdf-b r" id="sb5">Block 5+</button>' +
          '<button class="sdf-b o" id="sb3">Block 3+</button>' +
          '<button class="sdf-b s" id="sms">Mark Seen</button></div>' +
          '<p class="sdf-nt">Ranked by listings. Scroll page for more data.</p>';

        so.forEach(function(entry) {
          var org = entry[0], count = entry[1];
          var blocked = isBlk(org);
          var cls = count >= 5 ? 'hi' : count >= 3 ? 'md' : 'lo';
          inner += '<div class="sdf-rw ' + (blocked ? 'blk' : '') + '">' +
            '<span class="sdf-ct ' + cls + '">' + count + '</span>' +
            '<span class="sdf-nm ' + (blocked ? 'x' : '') + '">' + esc(org) + '</span>' +
            (blocked
              ? '<button class="sdf-sb ub" data-o="' + escA(org) + '">Unblock</button>'
              : '<button class="sdf-sb bl" data-o="' + escA(org) + '">Block</button>') +
            '</div>';
        });
      }

      bd.innerHTML = inner;

      var en = bd.querySelector('#sdf-en');
      if (en) en.onchange = function(e) { st.on = e.target.checked; save(); proc(); render(); };
      var s5 = bd.querySelector('#sb5');
      if (s5) s5.onclick = function() { blkAbove(5); };
      var s3 = bd.querySelector('#sb3');
      if (s3) s3.onclick = function() { blkAbove(3); };
      var sm = bd.querySelector('#sms');
      if (sm) sm.onclick = function() {
        newC = 0; save(); updFab();
        document.querySelectorAll('.sdf-nd').forEach(function(d) { d.remove(); });
        render();
      };
      bd.querySelectorAll('.sdf-sb.bl').forEach(function(b) { b.onclick = function() { blk(b.dataset.o); }; });
      bd.querySelectorAll('.sdf-sb.ub').forEach(function(b) { b.onclick = function() { ublk(b.dataset.o); }; });
    }

    /* ── Blocked tab ─────────────────────────────────────────── */
    else if (tab === 'blkd') {
      var inner = '<div style="position:relative;margin-bottom:8px">' +
        '<div style="display:flex;gap:6px">' +
        '<input class="sdf-in" id="sdf-ai" placeholder="Type publication name...">' +
        '<button class="sdf-b" id="sdf-ab">Add</button></div>' +
        '<div class="sdf-ac" id="sdf-acd" style="display:none"></div></div>' +
        '<p class="sdf-nt">' + st.pubs.length + ' blocked. Type to search ' + KNOWN.length + '+ journals + detected orgs.</p>';

      if (st.pubs.length > 0) {
        inner += '<div>';
        st.pubs.forEach(function(p) {
          inner += '<span class="sdf-tg" style="background:'+C.redLt+';color:'+C.red+'">' +
            esc(p) + '<button class="sdf-tgx" data-o="' + escA(p) + '" style="color:'+C.red+'">\u00d7</button></span>';
        });
        inner += '</div><button class="sdf-b r" id="sdf-ca" style="margin-top:8px">Clear All</button>';
      }

      bd.innerHTML = inner;

      var inp = bd.querySelector('#sdf-ai');
      var acd = bd.querySelector('#sdf-acd');
      var acI = -1, acL = [];

      function uAC() {
        var q = inp.value.trim().toLowerCase();
        if (q.length < 2) { acd.style.display = 'none'; return; }
        acL = KNOWN.filter(function(p) { return p.toLowerCase().indexOf(q) >= 0 && !isBlk(p); }).slice(0, 6);
        var om = Object.keys(st.orgs).filter(function(o) {
          return o.toLowerCase().indexOf(q) >= 0 && !isBlk(o) && !acL.some(function(a) { return a.toLowerCase() === o.toLowerCase(); });
        }).slice(0, 4);
        acL = acL.concat(om).slice(0, 8);
        if (!acL.length) { acd.style.display = 'none'; return; }
        acd.style.display = 'block';
        acd.innerHTML = acL.map(function(item, idx) {
          var mi = item.toLowerCase().indexOf(q);
          var hl = mi >= 0
            ? esc(item.slice(0, mi)) + '<span class="sdf-acm">' + esc(item.slice(mi, mi + q.length)) + '</span>' + esc(item.slice(mi + q.length))
            : esc(item);
          var fr = st.orgs[item] ? ' <span style="color:'+C.mist+';font-size:10px">(' + st.orgs[item] + ' posts)</span>' : '';
          return '<div class="sdf-aci ' + (idx === acI ? 'sel' : '') + '" data-v="' + escA(item) + '">' + hl + fr + '</div>';
        }).join('');
        acd.querySelectorAll('.sdf-aci').forEach(function(el) {
          el.ontouchstart = el.onmousedown = function(e) {
            e.preventDefault(); blk(el.dataset.v); inp.value = ''; acd.style.display = 'none';
          };
        });
      }

      inp.oninput = function() { acI = -1; uAC(); };
      inp.onfocus = uAC;
      inp.onblur = function() { setTimeout(function() { acd.style.display = 'none'; }, 200); };
      inp.onkeydown = function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var v = acI >= 0 ? acL[acI] : inp.value.trim();
          if (v) blk(v);
          inp.value = ''; acd.style.display = 'none'; acI = -1;
        }
      };
      bd.querySelector('#sdf-ab').onclick = function() { if (inp.value.trim()) blk(inp.value.trim()); inp.value = ''; };
      bd.querySelectorAll('.sdf-tgx').forEach(function(b) { b.onclick = function() { ublk(b.dataset.o); }; });
      var ca = bd.querySelector('#sdf-ca');
      if (ca) ca.onclick = function() { st.pubs = []; save(); proc(); render(); };
    }

    /* ── Keywords tab ────────────────────────────────────────── */
    else if (tab === 'kw') {
      var inner = '<div style="display:flex;gap:6px;margin-bottom:10px">' +
        '<input class="sdf-in" id="sdf-ki" placeholder="Add keyword...">' +
        '<button class="sdf-b" id="sdf-ka">Add</button></div>' +
        '<p class="sdf-lb">Submission types</p><div style="margin-bottom:12px">';
      TYPES.forEach(function(t) {
        var on = (st.types || []).indexOf(t) >= 0;
        inner += '<button class="sdf-tb ' + (on ? 'on' : 'off') + '" data-t="' + escA(t) + '">' + (on ? '\u2715' : '+') + ' ' + esc(t) + '</button>';
      });
      inner += '</div><p class="sdf-lb">Keywords</p><div>';
      st.kws.forEach(function(k) {
        inner += '<span class="sdf-tg" style="background:'+C.parch+';color:'+C.ink+'">' +
          esc(k) + '<button class="sdf-tgx" data-k="' + escA(k) + '" style="color:'+C.ink+'">\u00d7</button></span>';
      });
      inner += '</div>';
      bd.innerHTML = inner;

      var ki = bd.querySelector('#sdf-ki');
      function addK() {
        var k = ki.value.trim().toLowerCase();
        if (!k || st.kws.indexOf(k) >= 0) return;
        st.kws.push(k); st.kws.sort(); save(); proc(); render();
      }
      ki.onkeydown = function(e) { if (e.key === 'Enter') addK(); };
      bd.querySelector('#sdf-ka').onclick = addK;
      bd.querySelectorAll('.sdf-tb').forEach(function(b) {
        b.onclick = function() {
          var t = b.dataset.t;
          st.types = (st.types || []).indexOf(t) >= 0
            ? (st.types || []).filter(function(x) { return x !== t; })
            : (st.types || []).concat([t]);
          save(); proc(); render();
        };
      });
      bd.querySelectorAll('.sdf-tgx[data-k]').forEach(function(b) {
        b.onclick = function() {
          st.kws = st.kws.filter(function(k) { return k !== b.dataset.k; });
          save(); proc(); render();
        };
      });
    }

    /* ── Settings tab ────────────────────────────────────────── */
    else if (tab === 'cfg') {
      var exp = JSON.stringify({ blockedPubs: st.pubs, blockedKeywords: st.kws, blockedTypes: st.types, orgCounts: st.orgs }, null, 2);
      bd.innerHTML = '<p class="sdf-nt">Export/import your config. Your data saves automatically in this browser.</p>' +
        '<textarea class="sdf-ta" id="sdf-ex" rows="6">' + esc(exp) + '</textarea>' +
        '<div class="sdf-br" style="margin-top:8px">' +
        '<button class="sdf-b" id="sdf-cp">Copy</button>' +
        '<button class="sdf-b s" id="sdf-im">Import</button>' +
        '<button class="sdf-b m" id="sdf-ro">Reset Orgs</button>' +
        '<button class="sdf-b r" id="sdf-ra">Reset All</button></div>' +
        '<div class="sdf-ib"><p><strong>Your filters are saved automatically</strong> and persist between visits. ' +
        'Use Copy/Import to share your block list with other writers or transfer between devices.</p></div>';

      bd.querySelector('#sdf-cp').onclick = function() {
        var text = bd.querySelector('#sdf-ex').value;
        if (navigator.clipboard) navigator.clipboard.writeText(text);
        else prompt('Copy this:', text);
      };
      bd.querySelector('#sdf-im').onclick = function() {
        try {
          var d = JSON.parse(bd.querySelector('#sdf-ex').value);
          if (d.blockedPubs) st.pubs = st.pubs.concat(d.blockedPubs).filter(function(v, i, a) { return a.indexOf(v) === i; }).sort();
          if (d.blockedKeywords) st.kws = d.blockedKeywords;
          if (d.blockedTypes) st.types = d.blockedTypes;
          if (d.orgCounts) { for (var k in d.orgCounts) st.orgs[k] = Math.max(st.orgs[k] || 0, d.orgCounts[k]); }
          save(); proc(); render();
        } catch (e) { alert('Invalid JSON'); }
      };
      bd.querySelector('#sdf-ro').onclick = function() { st.orgs = {}; st.seen = {}; save(); proc(); render(); };
      bd.querySelector('#sdf-ra').onclick = function() {
        st = { on: true, pubs: [], kws: DEF_KW.slice(), types: ['grant','residency','fellowship','award','scholarship'], orgs: {}, seen: {} };
        save(); proc(); render();
      };
    }
  }

  /* ── Start ───────────────────────────────────────────────────── */
  proc();
  var obs = new MutationObserver(function() { proc(); });
  obs.observe(document.body, { childList: true, subtree: true });
  var sT;
  window.addEventListener('scroll', function() {
    clearTimeout(sT);
    sT = setTimeout(proc, 400);
  });

})();
