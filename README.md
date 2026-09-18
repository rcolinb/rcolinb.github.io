# R.C. Blenis — scholarship and writing

This is a dependency-free static site published through GitHub Pages.

## Local preview

```sh
python3 _scripts/serve.py
```

Serves the site root at http://localhost:4173 (optional port argument),
including the custom 404 page. Uses only the Python standard library.

## Pages and the hand-sync rule

- `index.html` — home (introduction, Selected Scholarship, Selected Writing, About, Contact)
- `publications.html` — the creative record, labeled **Writing** in the nav
  and H1 (the URL is deliberately unchanged; GitHub Pages has no server
  redirects)
- `research.html` — static academic page; the build does not process it, it
  only copies it into `_site`
- `_drafts/teaching.html` — revised Teaching page draft awaiting publication;
  underscore directories are not deployed by GitHub Pages
- `404.html` — shared manuscript styling with root-relative assets; `/cardiac/` — built teaching artifact, currently
  unlinked from the site

The generated regions (`INCANTATIONS_NAV`, `INCANTATIONS_HERO`,
`INCANTATIONS_EDITOR_RESOURCES`, `PUBLICATIONS_LIST`, `SELECTED_WORK`,
`INCANTATIONS_PUBLICATION`) and the `person-jsonld` block are maintained by
`_scripts/build-incantations.mjs`. Edit `publications.js` for writing records
and homepage selections, then run the build to update both pages. If Node is not on PATH, invoke the script using the absolute path to an
available Node executable.

The homepage's three selected scholarly publications are maintained by hand;
keep their citations and links in sync with `research.html`. The selection
covers nursing education (ANS), memory and communication (JAPNA), and ethics
(What We Owe). Academic citations display years consistently, retain known
online publication dates in their `time` elements, and use “View publication”
links. ORCID appears once per page, in the footer.

`site.js` provides publication-list fallbacks. Content and navigation
work without JavaScript; the navigation remains visible on mobile. If Teaching returns from `_drafts/`, restore its
nav/footer links on every page and in the build templates, and add it back to
`publicPaths`.

### September 2026 refresh

The design takes its cues from a manuscript: an off-white page, system serif
fonts, a consistent 680px reading measure, centered section headings, hanging
publication entries, and restrained text links. The shared stylesheet also
supports the optional essay page, the 404 page, printing, and reduced motion.

The homepage and navigation lead with scholarship. Creative writing and the
Incantations award remain in their own section; Books in Progress has been
removed. Interactive concept sketches are saved separately and are not part
of the published site. The `INCANTATIONS_HERO` marker is retained for build
compatibility, but now sits within Selected Writing.

Publication updates verified against publisher records and PubMed on September 18, 2026:

- [Applied Encounter Design — Feign](https://www.feignlit.com/featured/applied-encounter-design-by-rc-blenis)
  is published; a precise publication date was not confirmed, so the record uses 2026.
- [Interruption, Not Transmission — Advances in Nursing Science](https://doi.org/10.1097/ANS.0000000000000692)
  was published online September 16, 2026, ahead of print.
- [Therapeutic Communication as Autobiographical Memory Scaffolding — JAPNA](https://pubmed.ncbi.nlm.nih.gov/42728759/)
  was published online September 11, 2026, ahead of print; added to the Research page.

Other forthcoming entries retain their existing status until publication can
be confirmed. The Teaching draft remains unpublished.

### Shared-link image

`social-card.jpg` is the 1200 × 630 typographic preview used by all main pages
and the optional essay template. Its filename differs from the original
portrait so existing social-preview caches can recognize the new asset.
Open Graph and Twitter metadata include its dimensions or descriptive alt text.
The original `og-image.jpg` portrait is retained in the repository.

To regenerate the card on macOS using system fonts and Core Graphics:

```sh
swift _scripts/build-social-card.swift
```

The regular site build copies the rendered JPEG; it does not require Swift.

## Incantations release states

The essay update is controlled in one place: `_incantations.json`.

- `"status": "hidden"` removes the homepage prize feature, publication entry,
  structured-data award, and `incantations.html`.
- `"status": "announced"` adds the prize feature within Selected Writing, the
  forthcoming publication entry and award metadata.
- `"status": "published"` changes the copy and actions to the publication
  state and enables the optional citation, judge quotation, excerpt, and
  author's note.

`dedicatedPage` is `false` for the announcement. Set it to `true` only if
there is enough authorized material for a standalone essay page. Leave `issue`
empty until Indiana Review confirms the exact issue designation.

After editing the configuration, run:

```sh
node _scripts/build-incantations.mjs
```

The command updates the deployable root files and creates an ignored `_site`
snapshot for local review. Commit the updated root files, not `_site`.

For local state checks without changing the configured status, use:

```sh
node _scripts/build-incantations.mjs --status=announced
node _scripts/build-incantations.mjs --status=published
node _scripts/build-incantations.mjs
```

The last command restores the configured state.

### Announcement

When the journal's announcement is public, set `status` to `announced`. Add its
public URL to `announcementUrl` when available. An empty URL simply omits the
announcement button.

The Publications page is pre-rendered from `publications.js` during this build,
so its records remain present in delivered HTML and readable without
JavaScript.

### Headshot

The expected source location is
`RCBlenis_headshot_4x5_crop.png` in the repository root. Keep that original,
then add optimized WebP and JPEG derivatives beside it before enabling the
headshot and download link in the editor-resources section. Do not substitute
another image.

### Publication

Set `status` to `published`, then fill the fields that are available:

- `publicationUrl`: direct essay link, preferred when both links exist
- `purchaseUrl`: issue-purchase link used only without a direct essay link
- `citation`: publication details following the essay title, including volume,
  issue, season or date, and pages as supplied by the journal
- `judgeQuote`: optional quotation from Ross Gay
- `excerpt`: optional excerpt, only after permissions are confirmed
- `authorNote`: optional brief author's note

Empty optional fields do not render.
