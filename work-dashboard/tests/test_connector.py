"""Fixtures exercise safe extraction and the independent stdio lifecycle."""

import json
import sys
import unittest
from unittest.mock import patch

from server import connector


def user(text):
    return {"type": "userMessage", "content": [{"type": "text", "text": text}]}


def assistant(text):
    return {"type": "agentMessage", "text": text}


def metadata(thread_id="thread-1"):
    return {
        "id": thread_id, "name": "Prepare a lesson", "preview": "Initial request",
        "updatedAt": 1730831111, "cwd": "/work/teaching",
        "status": {"type": "active", "activeFlags": []},
        "section": {"id": "section-1", "name": "Teaching", "appearance": None},
        "extra": {"secret": "must not be copied"},
    }


class FixtureClient:
    def __init__(self, responses):
        self.responses = responses
        self.calls = []
        self.closed = False

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.closed = True

    def request(self, method, params):
        self.calls.append((method, params))
        if not self.responses:
            raise AssertionError("Unexpected request")
        expected_method, response = self.responses.pop(0)
        if method != expected_method:
            raise AssertionError((method, expected_method))
        if isinstance(response, Exception):
            raise response
        return response


class CollectorTests(unittest.TestCase):
    def test_only_messages_are_extracted_and_runtime_is_unknown(self):
        tool = {"type": "commandExecution", "command": "secret command", "aggregatedOutput": "secret output"}
        fixture = FixtureClient([
            ("thread/list", {"data": [metadata()], "nextCursor": None}),
            ("thread/read", {"thread": metadata()}),
            ("thread/turns/list", {"data": [{"items": [user("Please revise the lesson."), tool, assistant("A draft is ready for review.")]}], "nextCursor": None}),
        ])
        with patch.object(connector, "_AppServerClient", return_value=fixture):
            result = connector.collect_threads()
        self.assertTrue(fixture.closed)
        self.assertEqual(len(result), 1)
        row = result[0]
        self.assertEqual(row["last_user_message"], "Please revise the lesson.")
        self.assertEqual(row["summary"], "A draft is ready for review.")
        self.assertEqual(row["runtime_status"], "unknown")
        self.assertEqual(row["updated_at"], "2024-11-05T18:25:11Z")
        self.assertEqual(row["source_url"], "codex://threads/thread-1")
        self.assertEqual(row["section"], "Teaching")
        self.assertNotIn("secret", json.dumps(row))
        list_params = fixture.calls[0][1]
        self.assertIn("appServer", list_params["sourceKinds"])
        self.assertTrue(list_params["useStateDbOnly"])
        self.assertFalse(list_params["archived"])
        self.assertEqual(list_params["sortKey"], "updated_at")
        self.assertFalse(fixture.calls[1][1]["includeTurns"])
        self.assertEqual(fixture.calls[2][1]["itemsView"], "summary")

    def test_turn_pagination_preserves_latest_user_and_finds_older_reply(self):
        fixture = FixtureClient([
            ("thread/turns/list", {"data": [{"items": [user("Newest request")]}], "nextCursor": "older"}),
            ("thread/turns/list", {"data": [{"items": [user("Old request"), assistant("Most recent reply")]}], "nextCursor": None}),
        ])
        result = connector._recent_messages(fixture, "thread-1")
        self.assertEqual(result, ("Newest request", "Most recent reply"))
        self.assertEqual(fixture.calls[1][1]["cursor"], "older")

    def test_thread_pagination_deduplicates_and_stops_at_limit(self):
        responses = []
        for index in (1, 2):
            row = metadata(f"thread-{index}")
            listing = [row] if index == 1 else [metadata("thread-1"), row]
            responses.extend([
                ("thread/list", {"data": listing, "nextCursor": "page-2" if index == 1 else "page-3"}),
                ("thread/read", {"thread": row}),
                ("thread/turns/list", {"data": [{"items": [user("Request"), assistant("Reply")]}], "nextCursor": None}),
            ])
        fixture = FixtureClient(responses)
        with patch.object(connector, "_AppServerClient", return_value=fixture):
            rows = connector.collect_threads(2)
        self.assertEqual([row["id"] for row in rows], ["thread-1", "thread-2"])
        self.assertEqual(fixture.calls[3][1]["cursor"], "page-2")

    def test_failure_is_atomic_and_closes_client(self):
        fixture = FixtureClient([
            ("thread/list", {"data": [metadata()], "nextCursor": None}),
            ("thread/read", connector.ConnectorError("History unavailable")),
        ])
        with patch.object(connector, "_AppServerClient", return_value=fixture):
            with self.assertRaisesRegex(connector.ConnectorError, "History unavailable"):
                connector.collect_threads()
        self.assertTrue(fixture.closed)

    def test_malformed_cursor_is_safe_error(self):
        fixture = FixtureClient([
            ("thread/turns/list", {"data": [], "nextCursor": {"unexpected": "object"}}),
        ])
        with self.assertRaisesRegex(connector.ConnectorError, "cursor"):
            connector._recent_messages(fixture, "thread-1")

    def test_excerpts_are_bounded_and_known_credentials_are_redacted(self):
        secret = "sk-" + "a" * 40
        value = f"<environment_context>private environment</environment_context>\nUse {secret}.\nAPI_KEY=unprefixed-secret\n" + "x" * 4000
        cleaned = connector._clean_text(value, 2500)
        self.assertLessEqual(len(cleaned), 2500)
        self.assertNotIn(secret, cleaned)
        self.assertNotIn("unprefixed-secret", cleaned)
        self.assertNotIn("private environment", cleaned)
        self.assertIn("[credential redacted]", cleaned)
        self.assertLessEqual(len(connector._clean_text(cleaned, 600)), 600)

    def test_private_key_and_bearer_token_are_redacted(self):
        value = "-----BEGIN RSA PRIVATE KEY-----\nexample-private-data\n-----END RSA PRIVATE KEY-----\nBearer ABCDEFGHIJKLMNOP"
        cleaned = connector._clean_text(value, 2500)
        self.assertNotIn("example-private-data", cleaned)
        self.assertNotIn("ABCDEFGHIJKLMNOP", cleaned)

    def test_timestamps_are_utc_and_invalid_values_fail(self):
        self.assertEqual(connector._utc_timestamp("2026-11-12T09:00:00-05:00"), "2026-11-12T14:00:00Z")
        for invalid in (None, True, "invalid", "2026-11-12T09:00:00", float("nan")):
            with self.subTest(invalid=invalid):
                with self.assertRaises(connector.ConnectorError):
                    connector._utc_timestamp(invalid)

    def test_limit_validation_does_not_launch_process(self):
        with patch.object(connector, "_AppServerClient") as factory:
            for limit in (0, -1, 101, True, "20"):
                with self.assertRaises(connector.ConnectorError):
                    connector.collect_threads(limit)
            factory.assert_not_called()

    def test_configured_binary_requires_absolute_path(self):
        with patch.dict(connector.os.environ, {"WORK_DASHBOARD_CODEX_BINARY": "relative/codex"}):
            with self.assertRaisesRegex(connector.ConnectorError, "absolute"):
                connector._binary()


_FAKE_SERVER = r'''
import json, os, sys, time
initialized = False
declined = False
for line in sys.stdin:
    message = json.loads(line)
    if "error" in message:
        declined = message["error"]["code"] == -32601
        continue
    method = message.get("method")
    if method == "initialized":
        initialized = True
        continue
    if method == "initialize":
        print(json.dumps({"method": "informational/notice", "params": {}}), flush=True)
        print(json.dumps({"id": 999, "method": "unexpected/action", "params": {}}), flush=True)
        print(json.dumps({"id": message["id"], "result": {}}), flush=True)
    elif method == "thread/list":
        print(json.dumps({"id": message["id"], "result": {"data": [], "handshake": initialized, "declined": declined, "cwd": os.getcwd()}}), flush=True)
'''


class ProtocolTests(unittest.TestCase):
    def test_independent_stdio_handshake_and_process_cleanup(self):
        client = connector._AppServerClient([sys.executable, "-u", "-c", _FAKE_SERVER], timeout=3)
        with client:
            result = client.request("thread/list", {})
            self.assertTrue(result["handshake"])
            self.assertTrue(result["declined"])
            self.assertEqual(result["cwd"], str(connector.Path.home()))
            with self.assertRaisesRegex(connector.ConnectorError, "read-only"):
                client.request("turn/start", {})
        self.assertIsNotNone(client._process.poll())
        self.assertTrue(client._process.stdout.closed)

    def test_timeout_stops_process_even_when_enter_fails(self):
        client = connector._AppServerClient([sys.executable, "-u", "-c", "import time; time.sleep(20)"], timeout=0.15)
        with self.assertRaisesRegex(connector.ConnectorError, "timed out"):
            with client:
                pass
        self.assertIsNotNone(client._process.poll())

    def test_upstream_error_does_not_disclose_private_message(self):
        error = connector._rpc_error("thread/read", {"code": -32601, "message": "token=SECRET_AND_PRIVATE_PROMPT"})
        self.assertNotIn("SECRET", str(error))
        self.assertIn("update", str(error))


if __name__ == "__main__":
    unittest.main()
