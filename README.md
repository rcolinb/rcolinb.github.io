# R.C. Blenis author site

This is a dependency-free static site published through GitHub Pages.

## Local preview

```sh
python3 _scripts/serve.py
```

Serves the site root at http://localhost:4173 (optional port argument),
including the custom 404 page. Uses only the Python standard library.

## Incantations release states

The essay update is controlled in one place: `_incantations.json`.

- `"status": "hidden"` removes the homepage feature, publication entry,
  editor bio, structured-data award, and `incantations.html`.
- `"status": "announced"` adds the integrated homepage prize feature, the
  forthcoming publication entry, editor bio, and award metadata.
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
