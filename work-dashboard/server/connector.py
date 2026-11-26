"""Read a bounded snapshot of local Codex history through its stdio API.

This module never starts/resumes a conversation or invokes a model. The app
server is a separate, short-lived process, so its runtime state is deliberately
not treated as the execution state of conversations in the desktop app.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import selectors
import shutil
import signal
import subprocess
import time
from urllib.parse import quote


class ConnectorError(RuntimeError):
    """A safe, actionable failure message suitable for the dashboard."""


_APP_BINARY = Path("/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex")
_READ_METHODS = frozenset({"initialize", "thread/list", "thread/read", "thread/turns/list"})
_TIMEOUT_SECONDS = 45.0
_MAX_RESPONSE_BYTES = 8 * 1024 * 1024
_MESSAGE_LIMIT = 2500
_SUMMARY_LIMIT = 600
_TURN_PAGE_SIZE = 3
_MAX_TURN_PAGES = 3
_RUNTIME_NOTE = (
    "Saved conversation history is available. Live activity in the desktop app "
    "cannot be verified through this connection."
)


def _binary() -> str:
    configured = os.environ.get("WORK_DASHBOARD_CODEX_BINARY")
    candidate = str(Path(configured).expanduser()) if configured else str(_APP_BINARY)
    if configured and not Path(candidate).is_absolute():
        raise ConnectorError("Set WORK_DASHBOARD_CODEX_BINARY to an absolute executable path.")
    if not configured and not os.access(candidate, os.X_OK):
        candidate = shutil.which("codex") or candidate
    if not Path(candidate).is_file() or not os.access(candidate, os.X_OK):
        raise ConnectorError(
            "Codex executable was not found. Install/open the ChatGPT desktop app, "
            "or set WORK_DASHBOARD_CODEX_BINARY to the installed Codex executable."
        )
    return candidate


def _rpc_error(method: str, error: object) -> ConnectorError:
    # Do not expose upstream messages: they may contain paths, prompts, or tokens.
    data = error if isinstance(error, dict) else {}
    code = data.get("code")
    message = str(data.get("message", "")).lower()
    if code == -32601:
        advice = "The installed Codex version lacks this history API; update the desktop app."
    elif code == -32602:
        advice = "The installed Codex history API has changed; update the dashboard connector."
    elif any(word in message for word in ("unauthorized", "authentication", "login", "sign in")):
        advice = "Open the desktop app, confirm you are signed in, then refresh again."
    else:
        advice = "Open the desktop app, confirm local history is available, then refresh again."
    safe_code = str(code) if isinstance(code, int) else "unknown"
    return ConnectorError(f"Codex history request {method} failed ({safe_code}). {advice}")


class _AppServerClient:
    """Bounded synchronous client, with a strict read-only method allowlist."""

    def __init__(self, command: list[str] | None = None, timeout: float = _TIMEOUT_SECONDS):
        self.command = command
        self.timeout = timeout
        self._process: subprocess.Popen | None = None
        self._selector: selectors.BaseSelector | None = None
        self._buffer = bytearray()
        self._counter = 0
        self._deadline = 0.0

    def __enter__(self):
        command = self.command or [_binary(), "app-server", "--listen", "stdio://"]
        self._deadline = time.monotonic() + self.timeout
        try:
            self._process = subprocess.Popen(
                command,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                bufsize=0,
                start_new_session=True,
                cwd=str(Path.home()),
            )
            self._selector = selectors.DefaultSelector()
            self._selector.register(self._process.stdout, selectors.EVENT_READ)
            self.request("initialize", {
                "clientInfo": {
                    "name": "work_dashboard_readonly",
                    "title": "Work Dashboard",
                    "version": "0.1.0",
                },
            })
            self._send({"method": "initialized"})
        except Exception as exc:
            self.close()
            if isinstance(exc, ConnectorError):
                raise
            raise ConnectorError(
                "Could not start the Codex history reader. Check the executable and reopen the desktop app."
            ) from exc
        return self

    def __exit__(self, *_):
        self.close()

    def close(self):
        if self._selector is not None:
            self._selector.close()
            self._selector = None
        process = self._process
        if process is None:
            return
        # start_new_session gives this child its own group. Never signal the app
        # or its shared daemon; only stop the process group created above.
        if process.poll() is None:
            try:
                os.killpg(process.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            try:
                process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                process.wait(timeout=2)
        for stream in (process.stdin, process.stdout):
            if stream is not None:
                stream.close()
        self._buffer.clear()

    def _send(self, message: dict):
        if self._process is None or self._process.stdin is None:
            raise ConnectorError("The Codex history reader is not connected. Refresh to reconnect.")
        try:
            self._process.stdin.write((json.dumps(message) + "\n").encode("utf-8"))
        except (BrokenPipeError, OSError) as exc:
            raise ConnectorError(
                "The Codex history reader disconnected. Reopen the desktop app and refresh."
            ) from exc

    def request(self, method: str, params: dict) -> dict:
        if method not in _READ_METHODS:
            raise ConnectorError("The dashboard history reader only permits read-only requests.")
        self._counter += 1
        request_id = self._counter
        self._send({"id": request_id, "method": method, "params": params})
        while True:
            while b"\n" in self._buffer:
                raw, _, rest = self._buffer.partition(b"\n")
                self._buffer = bytearray(rest)
                try:
                    message = json.loads(raw)
                except (ValueError, UnicodeDecodeError) as exc:
                    raise ConnectorError(
                        "Codex returned an unreadable history response. Update the desktop app and retry."
                    ) from exc
                if not isinstance(message, dict):
                    raise ConnectorError("Codex returned an unexpected history response. Update the connector.")
                if "method" in message:
                    if "id" in message:
                        self._send({
                            "id": message["id"],
                            "error": {"code": -32601, "message": "Read-only history client"},
                        })
                    continue
                if message.get("id") != request_id:
                    continue
                if "error" in message:
                    raise _rpc_error(method, message["error"])
                result = message.get("result")
                if not isinstance(result, dict):
                    raise ConnectorError("Codex returned an unexpected history response. Update the connector.")
                return result
            remaining = self._deadline - time.monotonic()
            if remaining <= 0:
                raise ConnectorError(
                    "Reading Codex history timed out. Check that the desktop app is responsive, then refresh."
                )
            if self._selector is None or self._process is None or self._process.stdout is None:
                raise ConnectorError("The Codex history reader disconnected. Refresh to reconnect.")
            if not self._selector.select(remaining):
                continue
            try:
                chunk = os.read(self._process.stdout.fileno(), 65536)
            except OSError as exc:
                raise ConnectorError(
                    "The Codex history connection failed. Reopen the desktop app and refresh."
                ) from exc
            if not chunk:
                raise ConnectorError(
                    "Codex stopped before history could be read. Open the desktop app and refresh."
                )
            self._buffer.extend(chunk)
            if len(self._buffer) > _MAX_RESPONSE_BYTES:
                raise ConnectorError(
                    "A Codex history page exceeded the safe size limit. Reduce the history page size."
                )


def _clean_text(value: object, limit: int) -> str:
    """Keep plain message excerpts and redact recognizable credential formats.

    This is defense in depth, not an assertion that arbitrary private text can
    be classified perfectly. Never pass tool arguments, outputs, or auth data.
    """
    if not isinstance(value, str):
        return ""
    value = re.sub(r"<environment_context>.*?</environment_context>", "", value, flags=re.S)
    value = re.sub(
        r"-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----.*?(?:-----END (?:[A-Z ]+ )?PRIVATE KEY-----|$)",
        "[credential redacted]", value, flags=re.S,
    )
    value = re.sub(r"\b(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{12,}|AKIA[A-Z0-9]{16})\b", "[credential redacted]", value)
    value = re.sub(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b", "[credential redacted]", value)
    value = re.sub(r"(?i)\bBearer\s+[A-Za-z0-9._~+/=-]{8,}", "Bearer [credential redacted]", value)
    value = re.sub(
        r"(?im)(\b(?:[A-Z_]*API[_ -]?KEY|[A-Z_]*ACCESS[_ -]?TOKEN|[A-Z_]*REFRESH[_ -]?TOKEN|[A-Z_]*CLIENT[_ -]?SECRET|PASSWORD|PASSWD|AUTHORIZATION|COOKIE)\b[\"']?\s*[:=]\s*)[^\r\n]+",
        r"\1[credential redacted]", value,
    )
    value = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", value)
    value = value.strip()
    return value if len(value) <= limit else value[:limit - 1].rstrip() + "…"


def _utc_timestamp(value: object) -> str:
    try:
        if isinstance(value, bool):
            raise ValueError
        if isinstance(value, (int, float)):
            dt = datetime.fromtimestamp(value, tz=timezone.utc)
        elif isinstance(value, str):
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                raise ValueError
            dt = dt.astimezone(timezone.utc)
        else:
            raise ValueError
        return dt.isoformat(timespec="seconds").replace("+00:00", "Z")
    except (ValueError, OverflowError, OSError) as exc:
        raise ConnectorError(
            "Codex returned an unreadable last-update time. Update the dashboard connector before refreshing."
        ) from exc


def _page_rows(result: dict) -> list[dict]:
    rows = result.get("data")
    if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
        raise ConnectorError("Codex returned an unexpected history page. Update the dashboard connector.")
    return rows


def _recent_messages(client: _AppServerClient, thread_id: str) -> tuple[str, str]:
    user = assistant = ""
    cursor = None
    seen_cursors = set()
    for _ in range(_MAX_TURN_PAGES):
        params = {
            "threadId": thread_id,
            "limit": _TURN_PAGE_SIZE,
            "sortDirection": "desc",
            "itemsView": "summary",
        }
        if cursor:
            params["cursor"] = cursor
        result = client.request("thread/turns/list", params)
        for turn in _page_rows(result):
            # Turns are newest-first; items within each turn are chronological.
            items = turn.get("items", [])
            if not isinstance(items, list):
                raise ConnectorError("Codex returned unreadable message summaries. Update the connector.")
            for item in reversed(items):
                if not isinstance(item, dict):
                    continue
                if not user and item.get("type") == "userMessage":
                    content = item.get("content", [])
                    if isinstance(content, list):
                        text = "\n".join(
                            part["text"] for part in content
                            if isinstance(part, dict) and part.get("type") == "text"
                            and isinstance(part.get("text"), str)
                        )
                        user = _clean_text(text, _MESSAGE_LIMIT)
                elif not assistant and item.get("type") == "agentMessage":
                    assistant = _clean_text(item.get("text"), _MESSAGE_LIMIT)
                if user and assistant:
                    return user, assistant
        cursor = result.get("nextCursor")
        if not cursor:
            break
        if not isinstance(cursor, str):
            raise ConnectorError("Codex returned an unreadable history cursor. Update the connector.")
        if cursor in seen_cursors:
            break
        seen_cursors.add(cursor)
    return user, assistant


def collect_threads(limit: int = 20) -> list[dict]:
    """Return up to ``limit`` local, non-archived Codex conversation snapshots.

    ChatGPT web/cloud conversations and archived chats are outside this source.
    All API calls are reads. A failure raises ConnectorError, allowing callers
    to retain the prior snapshot and accurately show that refresh failed.
    """
    if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 100:
        raise ConnectorError("Choose a conversation limit between 1 and 100.")
    collected = []
    seen_ids = set()
    seen_cursors = set()
    cursor = None
    with _AppServerClient() as client:
        while len(collected) < limit:
            params = {
                "limit": min(50, limit - len(collected)),
                "sortKey": "updated_at",
                "sortDirection": "desc",
                "sourceKinds": ["appServer", "cli", "vscode", "exec", "unknown"],
                "useStateDbOnly": True,
                "archived": False,
            }
            if cursor:
                params["cursor"] = cursor
            page = client.request("thread/list", params)
            for listed in _page_rows(page):
                thread_id = listed.get("id")
                if not isinstance(thread_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", thread_id):
                    raise ConnectorError("Codex returned an unreadable conversation identifier. Update the connector.")
                if thread_id in seen_ids:
                    continue
                seen_ids.add(thread_id)
                detail = client.request("thread/read", {"threadId": thread_id, "includeTurns": False})
                thread = detail.get("thread")
                if not isinstance(thread, dict) or thread.get("id") != thread_id:
                    raise ConnectorError("Codex returned unexpected conversation metadata. Refresh again.")
                user, assistant = _recent_messages(client, thread_id)
                title = _clean_text(thread.get("name") or listed.get("name"), 300)
                if not title:
                    title = _clean_text(thread.get("preview") or listed.get("preview"), 140)
                section = thread.get("section") or listed.get("section")
                collected.append({
                    "id": thread_id,
                    "title": title or "Untitled conversation",
                    "summary": _clean_text(assistant or thread.get("preview") or user, _SUMMARY_LIMIT),
                    "last_user_message": user,
                    "last_assistant_message": assistant,
                    "updated_at": _utc_timestamp(thread.get("updatedAt", listed.get("updatedAt"))),
                    "cwd": _clean_text(thread.get("cwd"), 2000),
                    "section": _clean_text(section.get("name"), 300) if isinstance(section, dict) else "",
                    "source": "codex",
                    "source_url": f"codex://threads/{quote(thread_id, safe='')}",
                    "runtime_status": "unknown",
                    "source_status_note": _RUNTIME_NOTE,
                })
                if len(collected) >= limit:
                    break
            cursor = page.get("nextCursor")
            if not cursor:
                break
            if not isinstance(cursor, str):
                raise ConnectorError("Codex returned an unreadable history cursor. Update the connector.")
            if cursor in seen_cursors:
                break
            seen_cursors.add(cursor)
    return collected
