/* ─────────────────────────────────────────────────────────────
   PUBLICATIONS — single source of truth for both pages.

   Add a piece by adding ONE object below. Fields:
     genre    'poetry' | 'cnf' | 'fiction'
     status   'forthcoming' | 'published'
     title    string
     venue    string
     date     string  (e.g. 'April 2026', 'Forthcoming, Issue 83')
     url      optional — makes the title a link and adds a Read link
     linkText optional — overrides the default 'Read →'
     note     optional — small line under the entry (e.g. a column name)
     featured optional true — appears in the homepage writing feature, but only while
              the Incantations feature is in the 'hidden' state (the build
              restores the #hero-highlight element renderHero targets)
     selected optional true — appears in the homepage "Selected Writing" list
     form     optional — e.g. 'haiku' (tagging only; not displayed yet)
   ───────────────────────────────────────────────────────────── */

window.PUBLICATIONS = [
  // ── Poetry ──
  { genre:'poetry', status:'published', title:'Asterixis', venue:'Stone Circle Review', date:'July 2026', url:'https://stonecirclereview.com/asterixis/' },
  { genre:'poetry', status:'forthcoming', title:'Perseveration', venue:'The Examined Life Journal', date:'Forthcoming, 2026' },
  { genre:'poetry', status:'forthcoming', title:'morning coffee', venue:'Presence', date:'Forthcoming, Issue 83', form:'haiku' },
  { genre:'poetry', status:'forthcoming', title:'wildfire smoke', venue:'Modern Haiku', date:'Forthcoming, Issue 57.2', form:'haiku' },
  { genre:'poetry', status:'forthcoming', title:'Archeological Inheritance', venue:'Flyway: Journal of Writing &amp; Environment', date:'Forthcoming, 2026' },
  { genre:'poetry', status:'published', featured:true, selected:true, title:'Camera Review', venue:'Massachusetts Review', date:'Vol. 67.2, 2026', url:'https://massreview.org/issue/volume-67-issue-2', linkText:'View issue &rarr;' },
  { genre:'poetry', status:'published', featured:true, selected:true, title:'Mechanism of Action', venue:'JAMA', date:'April 2026', url:'https://doi.org/10.1001/jama.2026.1799' },
  { genre:'poetry', status:'published', title:'Disaster North', venue:'Pulse: Voices from the Heart of Medicine', date:'April 2026', url:'https://pulsevoices.org/poems/disaster-north/' },
  { genre:'poetry', status:'published', title:'Rung', venue:'Panorama: Journal of Travel, Place, and Nature', date:'January 2026', url:'https://panoramajournal.org/issues/issue-16-encounters/encounters-rung/' },
  { genre:'poetry', status:'published', title:'TUESDAYS', venue:'Heavy Feather Review', date:'January 2026', url:'https://heavyfeatherreview.org/2026/01/14/tuesdays/' },
  { genre:'poetry', status:'published', title:"Sigyn's Bowl", venue:'Wild Willow Magazine', date:'Issue 4, 2025', url:'https://wildwillowmagazine.com/wp-content/uploads/2025/11/wwm-issue-4-6.pdf', linkText:'Read in Issue 4, p. 25 (PDF) &rarr;' },
  { genre:'poetry', status:'published', title:'stepping away now', venue:'The Dewdrop', date:'November 2025', url:'https://thedewdrop.org/2025/11/24/dewdrops-autumn-week-8-2/', form:'haiku' },

  // ── Creative Nonfiction ──
  // INCANTATIONS_PUBLICATION:START
  {"genre":"cnf","status":"forthcoming","title":"Incantations","awardNote":"Winner of the 2026 Indiana Review Creative Nonfiction Prize, selected by Ross Gay","venue":"Indiana Review","date":"Forthcoming","announcementUrl":"https://www.instagram.com/p/DbGP1PPkadH/?img_index=1"},
  // INCANTATIONS_PUBLICATION:END
  { genre:'cnf', status:'forthcoming', title:'Without Identifiable Antecedent', venue:'Fourth Genre: Explorations in Nonfiction', date:'Forthcoming' },
  { genre:'cnf', status:'forthcoming', title:'The Net', venue:'River Teeth: A Journal of Nonfiction Narrative', date:'Forthcoming' },
  { genre:'cnf', status:'forthcoming', title:'Holding', venue:'American Journal of Nursing', date:'Forthcoming', note:'Reflections' },
  { genre:'cnf', status:'published', selected:true, title:'The Body Knows First', venue:'American Journal of Nursing', date:'Vol. 126.5, May 2026', url:'https://journals.lww.com/ajnonline/citation/2026/05000/the_body_knows_first.14.aspx' },
  { genre:'cnf', status:'published', selected:true, title:'The Thread You Follow', venue:'West Trade Review', date:'January 2026', url:'https://www.westtradereview.com/onlineexclusiveW25Blenis.html' },

  // ── Fiction ──
  { genre:'fiction', status:'published', selected:true, title:'Applied Encounter Design', venue:'Feign', date:'2026', url:'https://www.feignlit.com/featured/applied-encounter-design-by-rc-blenis' },
];

/* ── Rendering ───────────────────────────────────────────────── */

function pubItem(p){
  const div = document.createElement('div');
  div.className = 'publication-item';
  const titleEnd = p.citation ? '.&rdquo;' : '&rdquo;';
  const titleHtml = p.url
    ? '<span class="pub-title"><a href="' + p.url + '" target="_blank" rel="noopener">&ldquo;' + p.title + titleEnd + '</a></span>'
    : '<span class="pub-title">&ldquo;' + p.title + titleEnd + '</span>';
  const publicationHtml = p.citation
    ? '<span class="pub-citation">' + p.citation + '</span>'
    : '<span class="pub-venue">' + p.venue + '</span>\n      <span class="pub-year"> &middot; ' + p.date + '</span>';
  let html = titleHtml + (p.citation ? ' ' : ' &middot;\n      ') + publicationHtml;
  if (p.note) { html += '<div class="pub-note">' + p.note + '</div>'; }
  if (p.awardNote) { html += '<div class="pub-note pub-award-note">' + p.awardNote + '</div>'; }
  if (p.announcementUrl) {
    html += ' <a class="pub-link pub-announcement-link" href="' + p.announcementUrl + '" target="_blank" rel="noopener" aria-label="View the announcement for &ldquo;' + p.title + '&rdquo;">Announcement &rarr;</a>';
  }
  if (p.url) {
    // Descriptive accessible name: repeated "Read →" links otherwise all
    // announce identically. Keep this rule in sync with publicationItemHtml()
    // in _scripts/build-incantations.mjs.
    const lt = p.linkText || 'Read &rarr;';
    const base = lt.replace(/\s*&rarr;\s*$/, '');
    const quoted = '&ldquo;' + p.title + '&rdquo;';
    const label = base.indexOf(quoted) !== -1 ? base : base + ' ' + quoted;
    html += ' <a class="pub-link" href="' + p.url + '" target="_blank" rel="noopener" aria-label="' + label + '">' + lt + '</a>';
  }
  div.innerHTML = html;
  return div;
}

/* Homepage writing feature — retains the legacy renderHero function name.
   Live only in the 'hidden' Incantations state: the announced/published
   states replace #hero-highlight with the build-generated prize block,
   so this becomes a no-op until the build restores that element. */
function renderHero(){
  const el = document.getElementById('hero-highlight');
  if (!el) return;
  const featured = window.PUBLICATIONS.filter(function(p){ return p.featured; });
  el.innerHTML = featured.map(function(p){
    const venue = p.url
      ? '<em><a href="' + p.url + '" target="_blank" rel="noopener" class="hero-venue-link">' + p.venue + '</a></em>'
      : '<em>' + p.venue + '</em>';
    const lead = (p.status === 'forthcoming') ? ' forthcoming in ' : ' in ';
    return '&ldquo;' + p.title + '&rdquo;' + lead + venue + ', ' + p.date;
  }).join('<br>');
}

/* Homepage — a short curated list, links out to the full page.
   Essays lead: the collection in progress is nonfiction. */
function renderSelected(){
  const root = document.getElementById('selected-work');
  if (!root) return;
  // Pre-rendered in index.html for crawlers; mirror renderFullList's guard.
  if (root.querySelector('.publication-item')) return;
  const groups = [ {key:'cnf', label:'Essays'}, {key:'poetry', label:'Poetry'}, {key:'fiction', label:'Fiction'} ];
  groups.forEach(function(g){
    const items = window.PUBLICATIONS.filter(function(p){ return p.selected && p.genre === g.key; });
    if (!items.length) return;
    const label = document.createElement('p');
    label.className = 'pub-status-label';
    label.textContent = g.label;
    root.appendChild(label);
    items.forEach(function(p){ root.appendChild(pubItem(p)); });
  });
}

/* Publications page — the complete record, grouped by genre and status.
   Creative nonfiction leads; keep this order in sync with the build script. */
function renderFullList(){
  const root = document.getElementById('pub-list-full');
  if (!root) return;
  if (root.querySelector('.work-category')) return;
  const genres = [ {key:'cnf', label:'Creative Nonfiction'}, {key:'poetry', label:'Poetry'}, {key:'fiction', label:'Fiction'} ];
  const statuses = [ {key:'published', label:'Published'}, {key:'forthcoming', label:'Forthcoming'} ];
  genres.forEach(function(g){
    const items = window.PUBLICATIONS.filter(function(p){ return p.genre === g.key; });
    if (!items.length) return;
    const cat = document.createElement('div');
    cat.className = 'work-category reveal';
    cat.innerHTML = '<h2 class="work-category-title">' + g.label + '</h2>';
    statuses.forEach(function(s){
      const sItems = items.filter(function(p){ return p.status === s.key; });
      if (!sItems.length) return;
      const label = document.createElement('p');
      label.className = 'pub-status-label';
      label.textContent = s.label;
      cat.appendChild(label);
      sItems.forEach(function(p){ cat.appendChild(pubItem(p)); });
    });
    root.appendChild(cat);
  });
}
