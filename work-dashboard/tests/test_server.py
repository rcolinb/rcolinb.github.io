import http.client
import json
import os
from pathlib import Path
import sqlite3
import stat
import tempfile
import threading
import unittest
from unittest.mock import patch

from server.app import SyncController, create_server
from server.store import Conflict, DashboardStore, StoreError


def source(**updates):
    value = {
        "id": "thread-1", "title": "A lecture project", "summary": "Draft ready for review.",
        "last_user_message": "Please prepare the lecture.", "last_assistant_message": "The draft is ready.",
        "updated_at": "2026-11-12T13:00:00Z", "cwd": "/work/Teaching",
        "source": "codex", "source_url": "codex://threads/thread-1", "runtime_status": "idle",
    }
    value.update(updates)
    return value


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = DashboardStore(Path(self.temp.name) / "data")

    def tearDown(self):
        self.temp.cleanup()

    def test_import_is_candidate_and_runtime_is_not_task_status(self):
        self.store.reconcile_sources([source(runtime_status="idle")])
        task = self.store.list_tasks()[0]
        self.assertEqual(task["triage"], "untriaged")
        self.assertEqual(task["status"], "active")
        self.assertIsNone(task["verifiedAt"])
        self.assertEqual(task["project"], "")
        self.assertEqual(task["disposition"], "inbox")
        self.assertEqual(task["recap"], "")
        self.assertEqual(task["suggestion"]["method"], "starter")
        self.assertEqual(self.store.get_source("thread-1")["runtimeStatus"], "unknown")
        self.assertNotIn("lastUserMessage", self.store.list_sources()[0])
        self.assertNotIn("lastAssistantMessage", self.store.list_sources()[0])

    def test_user_edits_survive_source_changes_and_restart(self):
        self.store.reconcile_sources([source()])
        initial = self.store.list_tasks()[0]
        edited = self.store.patch_task(initial["id"], {
            "revision": 1, "title": "My chosen title", "status": "done", "triage": "later",
            "nextAction": "Use the final deck next week.", "owner": "you",
            "priorityReason": "Instructor review complete.",
        })
        self.store.reconcile_sources([source(title="New source title", last_assistant_message="An appendix is available.", updated_at="2026-11-12T14:00:00Z")])
        restarted = DashboardStore(self.store.data_dir)
        item = restarted.get_task(initial["id"])
        for key in ("title", "status", "triage", "nextAction", "owner", "priorityReason", "verifiedAt"):
            self.assertEqual(item[key], edited[key])
        self.assertTrue(item["hasNewActivity"])
        self.assertEqual(item["revision"], 3)
        self.assertEqual(len(restarted.list_tasks()), 1)
        self.assertEqual(restarted.get_source("thread-1")["title"], "New source title")

    def test_idempotent_sync_does_not_bump_revision_or_duplicate(self):
        self.store.reconcile_sources([source()])
        before = self.store.list_tasks()
        result = self.store.reconcile_sources([source(), source()])
        self.assertEqual(result, {"new": 0, "changed": 0, "received": 1})
        self.assertEqual(self.store.list_tasks(), before)

    def test_existing_sidebar_group_is_initial_domain_and_user_edit_survives(self):
        self.store.reconcile_sources([source(section="Teaching & Faculty Work"), source(id="thread-2", section="Pinned")])
        first = next(item for item in self.store.list_tasks() if "thread-1" in item["sourceIds"])
        second = next(item for item in self.store.list_tasks() if "thread-2" in item["sourceIds"])
        self.assertEqual(first["domain"], "Teaching & Faculty Work")
        self.assertEqual(second["domain"], "Unsorted")
        edited = self.store.patch_task(first["id"], {"revision": 1, "domain": "My own grouping"})
        self.store.reconcile_sources([source(section="Scholarship & Publications")])
        self.assertEqual(self.store.get_task(first["id"])["domain"], edited["domain"])
        self.assertEqual(self.store.get_source("thread-1")["section"], "Scholarship & Publications")

    def test_revision_conflict_returns_latest_task(self):
        item = self.store.create_task({"title": "An idea"})
        latest = self.store.patch_task(item["id"], {"revision": 1, "title": "Refined idea"})
        with self.assertRaises(Conflict) as error:
            self.store.patch_task(item["id"], {"revision": 1, "title": "Stale overwrite"})
        self.assertEqual(error.exception.task, latest)

    def test_validation_and_batch_atomicity(self):
        with self.assertRaises(StoreError):
            self.store.create_task({"title": "One", "status": "apparently-done"})
        with self.assertRaises(StoreError):
            self.store.create_task({"title": "One", "sourceIds": ["missing"]})
        with self.assertRaises(StoreError):
            self.store.reconcile_sources([source(), source(id="../../invalid")])
        self.assertEqual(self.store.list_tasks(), [])
        self.assertEqual(self.store.list_sources(), [])

    def test_database_permissions(self):
        self.assertEqual(stat.S_IMODE(self.store.data_dir.stat().st_mode), 0o700)
        self.assertEqual(stat.S_IMODE(self.store.path.stat().st_mode), 0o600)

    def test_reopening_preserves_existing_projects_and_revisions(self):
        self.store.reconcile_sources([source(), source(id="thread-2")])
        tasks = self.store.list_tasks()
        untouched = next(t for t in tasks if t["sourceIds"] == ["thread-1"])
        edited = next(t for t in tasks if t["sourceIds"] == ["thread-2"])
        self.store.patch_task(edited["id"], {"revision": 1, "project": "Teaching"})
        with sqlite3.connect(str(self.store.path)) as db:
            untouched["project"] = "Teaching"
            untouched.pop("suggestion")
            db.execute("UPDATE tasks SET payload = ? WHERE id = ?", (json.dumps(untouched), untouched["id"]))
        reopened = DashboardStore(self.store.data_dir)
        self.assertEqual(reopened.get_task(untouched["id"])["project"], "Teaching")
        self.assertEqual(reopened.get_task(untouched["id"])["revision"], 1)
        self.assertEqual(reopened.get_task(edited["id"])["project"], "Teaching")


class SyncTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = DashboardStore(Path(self.temp.name) / "data")

    def tearDown(self):
        self.temp.cleanup()

    def test_failed_refresh_preserves_last_success_and_data(self):
        controller = SyncController(self.store, collector=lambda limit: [source()])
        controller.request_sync()
        self.assertTrue(controller.wait())
        old_success = controller.state()["lastSuccess"]
        old_tasks = self.store.list_tasks()
        def fail(limit):
            raise RuntimeError("Private diagnostic text that must not reach the browser")
        controller.collector = fail
        controller.request_sync()
        self.assertTrue(controller.wait())
        state = controller.state()
        self.assertEqual(state["lastSuccess"], old_success)
        self.assertIsNotNone(state["lastAttempt"])
        self.assertIn("Refresh failed", state["error"])
        self.assertNotIn("Private diagnostic", state["error"])
        self.assertFalse(state["inProgress"])
        self.assertEqual(self.store.list_tasks(), old_tasks)

    def test_only_one_refresh_can_run_and_pause_persists(self):
        entered, release = threading.Event(), threading.Event()
        def collect(limit):
            entered.set()
            release.wait(3)
            return []
        controller = SyncController(self.store, collector=collect)
        self.assertTrue(controller.request_sync())
        self.assertTrue(entered.wait(2))
        self.assertFalse(controller.request_sync())
        self.assertTrue(controller.state()["inProgress"])
        controller.set_paused(True)
        release.set()
        self.assertTrue(controller.wait())
        restarted = SyncController(self.store)
        self.assertTrue(restarted.state()["paused"])
        self.assertFalse(restarted.state()["inProgress"])

    def test_failure_to_record_attempt_does_not_leave_sync_busy(self):
        controller = SyncController(self.store, collector=lambda limit: [])
        with patch.object(self.store, "update_meta", side_effect=OSError("Database temporarily unavailable")):
            with self.assertRaises(OSError):
                controller.request_sync()
        self.assertFalse(controller.state()["inProgress"])
        self.assertTrue(controller.request_sync())
        self.assertTrue(controller.wait())


class HTTPTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.dist = self.root / "dist"
        self.dist.mkdir()
        (self.dist / "index.html").write_text("<!doctype html><title>Work</title>")
        (self.root / "secret.txt").write_text("private")
        (self.dist / "escape.txt").symlink_to(self.root / "secret.txt")
        self.server = create_server(port=0, data_dir=self.root / "data", static_dir=self.dist,
                                    collector=lambda limit: [source()], start_sync=False, allowed_hosts=[])
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.port = self.server.server_address[1]

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(2)
        self.temp.cleanup()

    def request(self, method, path, body=None, headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        request_headers = headers or {}
        encoded = json.dumps(body) if body is not None else None
        connection.request(method, path, body=encoded, headers=request_headers)
        response = connection.getresponse()
        status, response_headers, payload = response.status, dict(response.getheaders()), response.read()
        connection.close()
        try:
            value = json.loads(payload)
        except (ValueError, UnicodeDecodeError):
            value = payload.decode("utf-8")
        return status, response_headers, value

    def mutation_headers(self):
        return {"Content-Type": "application/json", "X-Dashboard-Token": self.server.csrf_token,
                "Origin": "http://127.0.0.1:%s" % self.port}

    def test_state_and_mutation_contract_with_http_conflict(self):
        status, headers, state = self.request("GET", "/api/state")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertEqual(state["csrfToken"], self.server.csrf_token)
        self.assertIn("coverage", state["sync"])
        status, _, item = self.request("POST", "/api/tasks", {"title": "Saved idea"}, self.mutation_headers())
        self.assertEqual(status, 201)
        status, _, revised = self.request("PATCH", "/api/tasks/" + item["id"], {"revision": 1, "triage": "ready"}, self.mutation_headers())
        self.assertEqual(status, 200)
        self.assertEqual(revised["revision"], 2)
        status, _, conflict = self.request("PATCH", "/api/tasks/" + item["id"], {"revision": 1, "triage": "blocking"}, self.mutation_headers())
        self.assertEqual(status, 409)
        self.assertEqual(conflict["task"], revised)

    def test_classification_and_suggestion_api_contract(self):
        self.server.store.reconcile_sources([source()])
        status, _, state = self.request("GET", "/api/state")
        item = state["tasks"][0]
        self.assertEqual(status, 200)
        self.assertEqual(item["disposition"], "inbox")
        self.assertIn("suggestion", item)
        status, _, updated = self.request("PATCH", "/api/tasks/" + item["id"], {
            "revision": item["revision"], "disposition": "reference", "recap": "Background material."}, self.mutation_headers())
        self.assertEqual(status, 200)
        self.assertEqual(updated["disposition"], "reference")
        self.assertEqual(updated["recap"], "Background material.")
        self.assertIn("suggestion", updated)
        status, _, _ = self.request("PATCH", "/api/tasks/" + item["id"], {
            "revision": updated["revision"], "suggestion": updated["suggestion"]}, self.mutation_headers())
        self.assertEqual(status, 400)
        status, _, _ = self.request("POST", "/api/tasks", {
            "title": "Not allowed", "suggestion": {}}, self.mutation_headers())
        self.assertEqual(status, 400)
        status, _, created = self.request("POST", "/api/tasks", {"title": "Manual idea"}, self.mutation_headers())
        self.assertEqual(status, 201)
        self.assertEqual(created["disposition"], "tracked")
        self.assertIsNone(created["suggestion"]["sourceId"])

    def test_rejects_untrusted_host_origin_and_missing_token(self):
        for headers in ({"Host": "attacker.example"}, {"Origin": "https://attacker.example"}, {"Origin": "null"}):
            status, _, _ = self.request("GET", "/api/state", headers=headers)
            self.assertEqual(status, 403)
        status, _, _ = self.request("POST", "/api/tasks", {"title": "Injected"}, {"Content-Type": "application/json"})
        self.assertEqual(status, 403)
        headers = self.mutation_headers()
        headers["Origin"] = "https://attacker.example"
        status, _, _ = self.request("POST", "/api/tasks", {"title": "Injected"}, headers)
        self.assertEqual(status, 403)
        headers = self.mutation_headers()
        headers["Content-Type"] = "text/plain"
        status, _, _ = self.request("POST", "/api/tasks", {"title": "Injected"}, headers)
        self.assertEqual(status, 415)
        self.assertEqual(self.server.store.list_tasks(), [])

    def test_private_https_proxy_host_and_origin(self):
        self.server.allowed_hosts.add("work.example.ts.net")
        self.server.allowed_tailscale_login = "owner@example.com"
        headers = {"Host": "work.example.ts.net", "Origin": "https://work.example.ts.net",
                   "X-Forwarded-Proto": "https", "X-Forwarded-Host": "work.example.ts.net",
                   "Tailscale-User-Login": "owner@example.com"}
        status, _, state = self.request("GET", "/api/state", headers=headers)
        self.assertEqual(status, 200)
        headers.update({"Content-Type": "application/json", "X-Dashboard-Token": state["csrfToken"]})
        status, _, _ = self.request("POST", "/api/tasks", {"title": "Private phone idea"}, headers)
        self.assertEqual(status, 201)
        headers["Origin"] = "https://another.example.ts.net"
        status, _, _ = self.request("POST", "/api/tasks", {"title": "Wrong origin"}, headers)
        self.assertEqual(status, 403)
        headers["Origin"] = "https://work.example.ts.net"
        headers["Host"] = "work.example.ts.net.attacker.example"
        status, _, _ = self.request("GET", "/api/state", headers=headers)
        self.assertEqual(status, 403)

    def test_private_host_requires_one_owner_identity(self):
        self.server.allowed_hosts.add("work.example.ts.net")
        self.server.allowed_tailscale_login = "owner@example.com"
        for login in (None, "other@example.com", "owner@example.com,other@example.com"):
            for path in ("/api/state", "/"):
                with self.subTest(login=login, path=path):
                    headers = {"Host": "work.example.ts.net"}
                    if login is not None:
                        headers["Tailscale-User-Login"] = login
                    status, response_headers, value = self.request("GET", path, headers=headers)
                    self.assertEqual(status, 403)
                    self.assertEqual(value["code"], "untrusted_identity")
                    self.assertEqual(response_headers["Cache-Control"], "no-store")
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        connection.putrequest("GET", "/api/state", skip_host=True)
        connection.putheader("Host", "work.example.ts.net")
        connection.putheader("Tailscale-User-Login", "owner@example.com")
        connection.putheader("Tailscale-User-Login", "owner@example.com")
        connection.endheaders()
        response = connection.getresponse()
        self.assertEqual(response.status, 403)
        self.assertEqual(json.loads(response.read())["code"], "untrusted_identity")
        connection.close()

    def test_private_host_fails_closed_without_configured_owner(self):
        self.server.allowed_hosts.add("work.example.ts.net")
        self.server.allowed_tailscale_login = ""
        status, _, value = self.request("GET", "/api/state", headers={
            "Host": "work.example.ts.net", "Tailscale-User-Login": "owner@example.com"})
        self.assertEqual(status, 403)
        self.assertEqual(value["code"], "untrusted_identity")
        status, _, _ = self.request("GET", "/api/state")
        self.assertEqual(status, 200)

    def test_forwarded_local_host_cannot_skip_owner_check(self):
        self.server.allowed_tailscale_login = "owner@example.com"
        for login in (None, "other@example.com"):
            headers = {"Host": "localhost", "X-Forwarded-Host": "localhost"}
            if login is not None:
                headers["Tailscale-User-Login"] = login
            status, _, value = self.request("GET", "/api/state", headers=headers)
            self.assertEqual(status, 403)
            self.assertEqual(value["code"], "untrusted_identity")
        status, _, _ = self.request("GET", "/api/state", headers={"Host": "localhost"})
        self.assertEqual(status, 200)

    def test_public_funnel_and_malformed_csrf_are_rejected(self):
        status, _, value = self.request("GET", "/api/state", headers={"Tailscale-Funnel-Request": "?1"})
        self.assertEqual(status, 403)
        self.assertEqual(value["code"], "public_forwarding_disabled")
        headers = self.mutation_headers()
        headers["X-Dashboard-Token"] = "malformed-\u00e9"
        status, _, value = self.request("POST", "/api/tasks", {"title": "Not saved"}, headers)
        self.assertEqual(status, 403)
        self.assertEqual(value["code"], "invalid_csrf_token")

    def test_static_boundary_and_no_cors(self):
        status, headers, _ = self.request("GET", "/")
        self.assertEqual(status, 200)
        self.assertNotIn("Access-Control-Allow-Origin", headers)
        self.assertEqual(headers["X-Frame-Options"], "DENY")
        for path in ("/../secret.txt", "/%2e%2e/secret.txt", "/escape.txt", "/data/dashboard.sqlite3", "/server/app.py", "/.env"):
            status, _, payload = self.request("GET", path)
            self.assertEqual(status, 404, path)
            self.assertNotEqual(payload, "private")

    def test_manual_refresh_and_pause(self):
        status, _, payload = self.request("POST", "/api/settings", {"paused": True}, self.mutation_headers())
        self.assertEqual(status, 200)
        self.assertTrue(payload["sync"]["paused"])
        status, _, payload = self.request("POST", "/api/sync", {}, self.mutation_headers())
        self.assertEqual(status, 202)
        self.assertTrue(payload["started"])
        self.assertTrue(self.server.sync.wait())
        status, _, state = self.request("GET", "/api/state")
        self.assertEqual(len(state["tasks"]), 1)
        self.assertIsNotNone(state["sync"]["lastSuccess"])
        self.assertNotIn("lastUserMessage", state["sources"][0])
        status, _, detail = self.request("GET", "/api/sources/thread-1")
        self.assertEqual(status, 200)
        self.assertEqual(detail["lastAssistantMessage"], "The draft is ready.")


if __name__ == "__main__":
    unittest.main()
