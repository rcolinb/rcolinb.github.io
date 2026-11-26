# Your workspace

A private, Mac-hosted dashboard for organizing work and returning to its source conversations. Home, Projects, Ideas, Finished, and Library views separate chosen commitments from unsorted conversations and reference material.

This repository contains application source and synthetic test fixtures. It does not contain conversation history, task databases, account configuration, credentials, or a deployed dashboard. Publishing the source to GitHub does not expose the local service. GitHub Pages cannot run the Python API or its local history collector.

## Everyday use

Start with **Sort a few**. Each session presents up to five saved conversations with editable short names, recaps, project suggestions, and next steps. Choose **Track this**, **Keep as reference**, **Save as idea**, or **Already finished**. **Skip for now** makes no change. **Undo last choice** reverses the last choice when its record has not changed elsewhere.

Home and Projects count only work explicitly chosen for tracking. Library retains unsorted conversations and references; global search can find them from any view. Reading context, acknowledging an update, and completing a task are separate actions. Conflicting edits retain the unsaved draft for comparison and an explicit retry.

## Local setup

Use Python, Node.js, and the pnpm version specified in `package.json`. Run these commands from this directory:

```sh
pnpm install --frozen-lockfile
pnpm build
python3 -m server.app
```

Open <http://127.0.0.1:8767>. The app binds to loopback. Local and Tailscale modes use Python's standard library; Cloudflare authentication additionally needs `requirements.txt`. Node.js is needed to build and test the interface, not to serve the built app.

`Start Dashboard.command` starts the local app in a terminal; `Open Dashboard.command` opens its local address. To start independently of a terminal and after macOS login:

```sh
python3 scripts/manage_service.py install
python3 scripts/manage_service.py status
```

Use `stop` to stop the current service, or `remove` to remove login startup too. Pausing refresh in the interface stops collection while leaving the dashboard available.

## History connection and suggestions

The collector reads up to 20 recent, non-archived local Codex conversations through the installed desktop app-server protocol. It reads stored history without resuming, starting, messaging, or modifying source chats. Refresh runs every five minutes and can also be requested manually.

The default executable is bundled with the ChatGPT macOS app. `WORK_DASHBOARD_CODEX_BINARY` can specify an absolute path to a compatible installed executable. This connection does not establish coverage of ordinary ChatGPT cloud history or live execution state in another desktop process. Runtime activity is shown as unknown; a response ending does not establish that its project is complete.

Imported conversations begin in Library's **Needs sorting** queue. Task status, next action, project, domain, owner, and triage are separate editable records. User corrections survive later imports, and source changes are flagged for review. Multiple conversations can support one task.

New imports receive conservative starter fields. Optional assistant-prepared drafts remain separate from confirmed task fields. They are suggestions, not completion decisions. The collector does not call a model or automatically refresh semantic summaries; suggestions become stale when their source changes.

To import a separately prepared, reviewed draft batch into an existing local database:

```sh
python3 scripts/import_suggestions.py path/to/drafts.json
```

The importer validates identifiers, source ownership, timestamps, field lengths, and record shape before applying the batch atomically. It does not classify tasks or overwrite chosen fields. Private draft files belong outside version control.

## Phone access through Tailscale

With Tailscale running on the Mac and phone, configure the actual assigned hostname and exact account login. The values below are examples:

```sh
python3 scripts/manage_service.py install \
  --tailscale-host your-mac.your-network.ts.net \
  --tailscale-login owner@example.com
env TAILSCALE_BE_CLI=1 /Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg --https=443 http://127.0.0.1:8767
```

Enable Serve/HTTPS in the Tailscale account first. Open the resulting HTTPS address on the phone and test over cellular. The Mac must be awake and connected for live access. Requests require the configured account identity supplied by Tailscale Serve; other identities and public Funnel requests are rejected.

An HTTP Serve fallback can use `--http=80` instead of `--https=443`. Tailscale encrypts transport between devices, but a remote HTTP URL is not a browser secure context and does not provide the same service-worker installation or offline reopening support. Prefer HTTPS for phone use.

## Phone access through Cloudflare Access and Tunnel

For an authenticated custom address such as `https://dashboard.example.com`, the Mac continues to host the frontend, Python API, and SQLite database. Cloudflare Access authenticates the owner and a named Cloudflare Tunnel forwards authorized requests to loopback. The origin independently verifies the Access JWT's RSA signature, issuer, audience, expiration, and exact owner email.

Configure the account and route for each installation; this source publication makes no claim that a custom domain is deployed.

1. Prepare an active domain in Cloudflare. If DNS management must move, export and reconcile the complete authoritative zone before changing nameservers, preserving website, mail, verification, subdomain, and DNSSEC settings. Automatic scans cannot establish completeness. Review the provider's current enrollment requirements.
2. Create a self-hosted Access application covering the entire dashboard hostname **before publishing a tunnel route**. Use one Allow policy for the exact owner email and the intended login provider. Do not use Everyone, an email-domain allowance, or Bypass.
3. Record the team's issuer URL and the application's audience identifier (AUD). Configure the origin below while retaining its loopback-only binding.
4. Create a named, remotely managed tunnel. Route the dashboard hostname to `http://127.0.0.1:8767`, preserve the public Host header or explicitly set `httpHostHeader` to the dashboard hostname, set `originRequest.disableChunkedEncoding: true`, and enable **Protect with Access** for the same team and audience. Do not use a quick tunnel.
5. Start the connector only after these protections are configured. Verify denial or authentication for signed-out HTML and API requests, successful owner login, and phone access over cellular.

Install the authentication dependencies and configure the local service:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/manage_service.py install \
  --cloudflare-host dashboard.example.com \
  --cloudflare-issuer https://your-team.cloudflareaccess.com \
  --cloudflare-audience APPLICATION_AUD \
  --cloudflare-email owner@example.com
```

Replace all example account values with the verified configuration. The helper rejects partial settings and missing dependencies before replacing the service. Later installs preserve saved Cloudflare and Tailscale configuration.

Place a verified vendor macOS `cloudflared` executable at `.tools/cloudflared`. Use an actual executable file, not a symlink; binaries are not included in this repository. The connector flags were checked against version `2026.11.2`.

Store the tunnel token only in `data/cloudflare/tunnel.token`, owned by the current user, mode `0600`, inside owner-only directories. Never put it in source, shell history, command-line arguments, screenshots, or logs. The startup helper uses a token file and rechecks configuration, file ownership, permissions, and the trusted binary on each start:

```sh
.venv/bin/python scripts/manage_tunnel.py install
.venv/bin/python scripts/manage_tunnel.py status
```

The connector starts after login and reconnects after interruptions. It has a separate per-user service; `stop` stops it now, and `remove` removes its login startup while retaining the token. Status reports local readiness and process state, not verification of the remote policy or connection.

To remove Cloudflare configuration while retaining local/Tailscale access:

```sh
.venv/bin/python scripts/manage_tunnel.py stop
.venv/bin/python scripts/manage_service.py install --disable-cloudflare
```

References: [Access and Tunnel setup](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/), [full DNS setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/), [connector downloads](https://developers.cloudflare.com/tunnel/downloads/).

## When the Mac is off

A browser that previously loaded the app over HTTPS and retained its cache can reopen the last saved metadata view. It displays the saved time and disables edits and actions that require a connection. Live updates resume after the Mac and connection return.

First-time devices and browsers whose storage has been cleared need the Mac online. The cache is specific to each website address, so visiting one address does not populate another address's saved view. HTTP fallback does not guarantee offline reopening.

Full conversation excerpts, draft evidence, and mutation tokens are excluded from the saved view. Task and source metadata remain private information on that device; use a trusted browser and clear its website data to remove the local snapshot. Authentication pages and private API responses are not added to the app-shell cache.

## Data and recovery

The database is `data/dashboard.sqlite3`, with owner-only permissions. The static server serves only `dist/`, not the database, source code, or logs. Browser persistence stores sanitized task/source metadata and preferences.

Run `python3 scripts/backup.py` for a consistent database backup in `data/backups/`. Private data, drafts, credentials, backups, build output, dependencies, connector binaries, and internal previews are excluded from version control. Keep generated deployment configuration out of the public source tree.

## Development checks

```sh
.venv/bin/python -m unittest discover -s tests -v
pnpm test:ui
pnpm build
```

Install `requirements.txt` into `.venv` to include real signed-token authentication tests. The latest recorded validation included 88 Python server/authentication/startup tests and 32 frontend/model/worker tests, for 120 automated checks. Fixtures use synthetic data.

An isolated Chrome fixture reopened a saved view after HTTP 503 responses and a stopped origin, disabled mutations, and reconnected after restart. Reflow checks covered 320, 390, and 1280 CSS pixels. Automated and fixture checks do not establish actual phone, cellular, or assistive-technology compatibility; verify those for the intended installation.

The interface targets WCAG 2.2 AA, with large touch controls, labeled state, visible focus, reduced motion, and narrow-screen reflow. No conformance claim is made. Design rationale is in `design-spec.json`; illustrative design studies are in `design-directions.html`.
