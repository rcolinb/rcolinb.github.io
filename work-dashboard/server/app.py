"""Loopback-only HTTP API and static UI for the personal work dashboard."""

import argparse
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
import os
from pathlib import Path
import secrets
import threading
from urllib.parse import unquote, urlsplit

from .store import DashboardStore, StoreError, Conflict, utc_now
from .cloudflare_access import CloudflareAccess, AccessDenied


PROJECT_ROOT = Path(__file__).resolve().parent.parent
MAX_BODY_BYTES = 65536
LOCAL_HOSTS = {"localhost", "127.0.0.1"}
DEFAULT_COVERAGE = (
    "Up to 20 recent local Codex conversations. Ordinary ChatGPT cloud conversations "
    "are not connected. Desktop running/idle state is unavailable."
)


def default_collector(limit=20):
    from .connector import collect_threads
    return collect_threads(limit=limit)


class SyncController:
    def __init__(self, store, collector=default_collector, interval=300, limit=20):
        self.store = store
        self.collector = collector
        self.interval = max(30, interval)
        self.limit = max(1, min(50, limit))
        self.lock = threading.RLock()
        self.in_progress = False
        self.stop_event = threading.Event()
        self.wake_event = threading.Event()
        self.scheduler = None
        self.worker = None

    def state(self):
        saved = self.store.get_meta("sync", {})
        with self.lock:
            return {
                "lastAttempt": saved.get("lastAttempt"),
                "lastSuccess": saved.get("lastSuccess"),
                "error": saved.get("error"),
                "inProgress": self.in_progress,
                "paused": bool(saved.get("paused", False)),
                "intervalSeconds": self.interval,
                "coverage": DEFAULT_COVERAGE.replace("20 recent", "%s recent" % self.limit),
            }

    def start(self):
        if self.scheduler:
            return
        self.scheduler = threading.Thread(target=self._schedule, name="dashboard-schedule", daemon=True)
        self.scheduler.start()

    def _schedule(self):
        while not self.stop_event.is_set():
            try:
                if not self.state()["paused"]:
                    self.request_sync()
            except Exception:
                # A transient local database failure must not silently terminate
                # the background scheduler. The API remains available to report it.
                pass
            self.wake_event.wait(self.interval)
            self.wake_event.clear()

    def request_sync(self):
        with self.lock:
            if self.in_progress or self.stop_event.is_set():
                return False
            self.in_progress = True
            try:
                self.store.update_meta("sync", {"lastAttempt": utc_now(), "error": None})
            except Exception:
                self.in_progress = False
                raise
            self.worker = threading.Thread(target=self._perform_sync, name="dashboard-sync", daemon=True)
            self.worker.start()
            return True

    def _perform_sync(self):
        try:
            records = self.collector(limit=self.limit)
            self.store.reconcile_sources(records)
            self.store.update_meta("sync", {"lastSuccess": utc_now(), "error": None})
        except Exception as exc:
            # ConnectorError is intentionally safe/actionable; never expose arbitrary
            # exception details, subprocess output, or private source content.
            if exc.__class__.__name__ == "ConnectorError":
                message = str(exc)[:700]
            elif isinstance(exc, StoreError):
                message = str(exc)
            else:
                message = "Refresh failed. The last saved data is still available."
            self.store.update_meta("sync", {"error": message})
        finally:
            with self.lock:
                self.in_progress = False

    def set_paused(self, paused):
        self.store.update_meta("sync", {"paused": paused})
        if not paused:
            self.wake_event.set()
        return self.state()

    def wait(self, timeout=10):
        worker = self.worker
        if worker:
            worker.join(timeout)
        return not self.in_progress

    def close(self):
        self.stop_event.set()
        self.wake_event.set()
        if self.scheduler:
            self.scheduler.join(timeout=1)


class DashboardHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def server_close(self):
        if hasattr(self, "sync"):
            self.sync.close()
        super().server_close()


class DashboardHandler(BaseHTTPRequestHandler):
    server_version = "WorkDashboard"
    sys_version = ""

    def log_message(self, format, *args):
        # Do not log arbitrary request URLs or source identifiers.
        return

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; form-action 'self'")
        super().end_headers()

    def _json(self, code, value):
        payload = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(payload)

    def _error(self, code, message, error_code="invalid_request", **extra):
        self._json(code, dict(error=message, code=error_code, **extra))

    def _trusted_request(self, mutation=False):
        # Serve strips spoofed values and adds this header only for public Funnel
        # traffic. This service is intended for local/private network access.
        if self.headers.get("Tailscale-Funnel-Request") is not None:
            self._error(403, "Public forwarding is not enabled for this dashboard.", "public_forwarding_disabled")
            return False
        hosts = self.headers.get_all("Host", [])
        if len(hosts) != 1:
            self._error(403, "A valid local dashboard host is required.", "untrusted_host")
            return False
        raw_host = hosts[0].strip().lower()
        try:
            parsed = urlsplit("http://" + raw_host)
            parsed.port  # Reject malformed port syntax.
            hostname = parsed.hostname
            if parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment:
                raise ValueError()
        except ValueError:
            hostname = None
        if hostname not in self.server.allowed_hosts:
            self._error(403, "This host is not allowed to access the dashboard.", "untrusted_host")
            return False
        # Serve removes client-supplied identity headers before injecting the
        # authenticated tailnet user's login. Trust these only because this
        # backend binds to loopback. Direct local UI access needs no identity.
        # Forwarded headers also trigger the check, even if a proxy supplies a
        # local Host, so proxy traffic cannot use the direct-local exception.
        cloudflare_headers = any(self.headers.get(name) is not None for name in (
            "Cf-Access-Jwt-Assertion", "Cf-Access-Authenticated-User-Email",
        ))
        proxied = cloudflare_headers or any(self.headers.get(name) is not None for name in (
            "X-Forwarded-Host", "X-Forwarded-For", "X-Forwarded-Proto",
            "Tailscale-User-Login", "Tailscale-Headers-Info",
        ))
        if self.server.cloudflare_access.host and hostname == self.server.cloudflare_access.host:
            assertions = self.headers.get_all("Cf-Access-Jwt-Assertion", [])
            if len(assertions) != 1:
                self._error(403, "Sign in with the account allowed to use this dashboard.", "untrusted_identity")
                return False
            try:
                self.server.cloudflare_access.verify(assertions[0])
            except AccessDenied as exc:
                self._error(exc.status, str(exc), exc.code)
                return False
        elif cloudflare_headers:
            # Never reinterpret a Cloudflare request as trusted Tailscale/local
            # traffic after a Host rewrite, even if it carries a spoofed login.
            self._error(403, "This request identity does not match the dashboard host.", "untrusted_identity")
            return False
        elif hostname not in LOCAL_HOSTS or proxied:
            logins = self.headers.get_all("Tailscale-User-Login", [])
            if (not self.server.allowed_tailscale_login or len(logins) != 1
                    or logins[0] != self.server.allowed_tailscale_login):
                self._error(403, "This dashboard is available only to its owner.", "untrusted_identity")
                return False
        origins = self.headers.get_all("Origin", [])
        if len(origins) > 1:
            self._error(403, "This request origin is not allowed.", "untrusted_origin")
            return False
        if origins:
            try:
                origin = urlsplit(origins[0])
            except ValueError:
                self._error(403, "This request origin is not allowed.", "untrusted_origin")
                return False
            if (origin.scheme not in {"http", "https"} or origin.netloc.lower() != raw_host
                    or origin.path or origin.query or origin.fragment):
                self._error(403, "This request origin is not allowed.", "untrusted_origin")
                return False
        if mutation:
            tokens = self.headers.get_all("X-Dashboard-Token", [])
            supplied = tokens[0] if len(tokens) == 1 else ""
            if len(supplied) > 256 or not hmac.compare_digest(supplied.encode("utf-8"), self.server.csrf_token.encode("ascii")):
                self._error(403, "Reload the dashboard before saving changes.", "invalid_csrf_token")
                return False
            if self.headers.get_content_type() != "application/json":
                self._error(415, "Send changes as JSON.", "unsupported_media_type")
                return False
        return True

    def _body(self):
        if self.headers.get("Transfer-Encoding"):
            raise StoreError("Chunked request bodies are not supported.")
        if len(self.headers.get_all("Content-Length", [])) != 1:
            raise StoreError("One request body length is required.")
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise StoreError("Invalid request body length.")
        if length < 1 or length > MAX_BODY_BYTES:
            raise StoreError("The request body must be between 1 and 65536 bytes.")
        try:
            value = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise StoreError("The request body is not valid JSON.")
        if not isinstance(value, dict):
            raise StoreError("The request body must be a JSON object.")
        return value

    def _path(self):
        return unquote(urlsplit(self.path).path)

    def do_GET(self):
        if not self._trusted_request():
            return
        try:
            path = self._path()
            if path == "/api/health":
                self._json(200, {"ok": True, "service": "work-dashboard"})
            elif path == "/api/state":
                self._json(200, {"tasks": self.server.store.list_tasks(),
                                 "sources": self.server.store.list_sources(),
                                 "sync": self.server.sync.state(), "csrfToken": self.server.csrf_token})
            elif path.startswith("/api/sources/"):
                source_id = path[len("/api/sources/"):]
                self._json(200, self.server.store.get_source(source_id))
            elif path.startswith("/api/"):
                self._error(404, "Endpoint not found.", "not_found")
            else:
                self._serve_static(path)
        except StoreError as exc:
            self._store_error(exc)
        except (BrokenPipeError, ConnectionResetError):
            return
        except Exception:
            self._error(500, "The dashboard could not complete this request.", "server_error")

    def do_HEAD(self):
        self.do_GET()

    def do_OPTIONS(self):
        if self._trusted_request():
            self._error(405, "Cross-origin access is not enabled.", "method_not_allowed")

    def do_POST(self):
        self._mutate("POST")

    def do_PATCH(self):
        self._mutate("PATCH")

    def _mutate(self, method):
        if not self._trusted_request(mutation=True):
            return
        try:
            body = self._body()
            path = self._path()
            if method == "POST" and path == "/api/sync":
                if body:
                    raise StoreError("Refresh does not accept additional fields.")
                started = self.server.sync.request_sync()
                self._json(202, {"started": started, "sync": self.server.sync.state()})
            elif method == "POST" and path == "/api/settings":
                if set(body) != {"paused"} or type(body["paused"]) is not bool:
                    raise StoreError("Settings must contain a true or false paused value.")
                self._json(200, {"sync": self.server.sync.set_paused(body["paused"])})
            elif method == "POST" and path == "/api/tasks":
                self._json(201, self.server.store.create_task(body))
            elif method == "PATCH" and path.startswith("/api/tasks/"):
                task_id = path[len("/api/tasks/"):]
                self._json(200, self.server.store.patch_task(task_id, body))
            else:
                self._error(404, "Endpoint not found.", "not_found")
        except StoreError as exc:
            self._store_error(exc)
        except (BrokenPipeError, ConnectionResetError):
            return
        except Exception:
            self._error(500, "The dashboard could not save this change.", "server_error")

    def _store_error(self, exc):
        extra = {"task": exc.task} if isinstance(exc, Conflict) else {}
        self._error(exc.status, str(exc), exc.code, **extra)

    def _serve_static(self, path):
        parts = path.split("/")
        if "\x00" in path or "\\" in path or any(part in {"..", "."} or part.startswith(".") for part in parts if part):
            self._error(404, "File not found.", "not_found")
            return
        relative = "index.html" if path == "/" else path.lstrip("/")
        target = (self.server.static_dir / relative).resolve()
        try:
            target.relative_to(self.server.static_dir)
        except ValueError:
            self._error(404, "File not found.", "not_found")
            return
        if not target.is_file():
            self._error(404, "The dashboard UI has not been built yet." if path == "/" else "File not found.", "not_found")
            return
        data = target.read_bytes()
        content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        if target.suffix in {".js", ".mjs"}:
            content_type = "text/javascript"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)


def create_server(port=8767, data_dir=None, static_dir=None, collector=default_collector,
                  start_sync=True, interval=300, limit=20, allowed_hosts=None,
                  allowed_tailscale_login=None, cloudflare_access=None):
    # Validate all-or-none remote auth before touching the database or listener.
    access = cloudflare_access if cloudflare_access is not None else CloudflareAccess.from_env()
    store = DashboardStore(data_dir or PROJECT_ROOT / "data")
    server = DashboardHTTPServer(("127.0.0.1", port), DashboardHandler)
    server.store = store
    server.static_dir = Path(static_dir or PROJECT_ROOT / "dist").resolve()
    server.csrf_token = secrets.token_urlsafe(32)
    extra_hosts = allowed_hosts if allowed_hosts is not None else [host.strip().lower() for host in os.environ.get("DASHBOARD_ALLOWED_HOSTS", "").split(",") if host.strip()]
    server.allowed_hosts = LOCAL_HOSTS | set(extra_hosts)
    server.cloudflare_access = access
    if access.host:
        server.allowed_hosts.add(access.host)
    server.allowed_tailscale_login = (allowed_tailscale_login if allowed_tailscale_login is not None
                                     else os.environ.get("DASHBOARD_ALLOWED_TAILSCALE_LOGIN", "")).strip()
    server.sync = SyncController(store, collector=collector, interval=interval, limit=limit)
    if start_sync:
        server.sync.start()
    return server


def main():
    parser = argparse.ArgumentParser(description="Run the private work dashboard on this Mac.")
    parser.add_argument("--port", type=int, default=8767)
    parser.add_argument("--data-dir", type=Path, default=PROJECT_ROOT / "data")
    parser.add_argument("--static-dir", type=Path, default=PROJECT_ROOT / "dist")
    parser.add_argument("--interval", type=int, default=300)
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--no-sync", action="store_true", help="Disable automatic collection; manual refresh remains available.")
    args = parser.parse_args()
    os.umask(0o077)
    server = create_server(port=args.port, data_dir=args.data_dir, static_dir=args.static_dir,
                           interval=args.interval, limit=args.limit, start_sync=not args.no_sync)
    print("Work dashboard: http://127.0.0.1:%s" % server.server_address[1], flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
