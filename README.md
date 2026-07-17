# R.C. Blenis author site

This is a dependency-free static site published through GitHub Pages.

## Incantations release states

The essay update is controlled in one place: `_incantations.json`.

- `"status": "hidden"` removes the homepage feature, navigation item, award
  listing, publication entry, structured-data award, and `incantations.html`.
- `"status": "announced"` adds the prize announcement, the forthcoming
  citation, and the dedicated essay page.
- `"status": "published"` changes the copy and actions to the publication
  state and enables the optional citation, judge quotation, excerpt, and
  author's note.

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
