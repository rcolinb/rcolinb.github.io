"""Persistent work items, source snapshots, and synchronization metadata.

Only this dashboard's database is modified. Source conversations remain read-only.
"""

import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone

from .suggestions import starter_suggestion, validate_draft


STATUSES = {"active", "waiting", "idea", "done"}
TRIAGE = {"blocking", "review", "ready", "later", "untriaged"}
OWNERS = {"you", "assistant", "other", "none"}
DISPOSITIONS = {"inbox", "tracked", "reference"}
ID_PATTERN = re.compile(r"^[A-Za-z0-9_.:-]{1,180}$")
TEXT_LIMITS = {
    "title": 8000,
    "project": 200,
    "domain": 120,
    "nextAction": 2000,
    "priorityReason": 2000,
    "recap": 1000,
}
EDITABLE = set(TEXT_LIMITS) | {"status", "triage", "owner", "disposition", "sourceIds", "hasNewActivity"}
CONFIRMATION_FIELDS = {"status", "triage", "nextAction", "owner", "priorityReason", "disposition"}


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


class StoreError(Exception):
    status = 400
    code = "invalid_request"


class NotFound(StoreError):
    status = 404
    code = "not_found"


class Conflict(StoreError):
    status = 409
    code = "revision_conflict"

    def __init__(self, task):
        super().__init__("This item changed since you opened it. Review the latest version and try again.")
        self.task = task


def _string(value, key, maximum, required=False):
    if not isinstance(value, str):
        raise StoreError("%s must be text." % key)
    value = value.strip()
    if "\x00" in value or len(value) > maximum:
        raise StoreError("%s must be no longer than %s characters." % (key, maximum))
    if required and not value:
        raise StoreError("%s cannot be empty." % key)
    return value


def _source_text(record, key, maximum):
    value = record.get(key, "")
    return value[:maximum] if isinstance(value, str) else ""


class DashboardStore:
    def __init__(self, data_dir):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        os.chmod(self.data_dir, 0o700)
        self.path = self.data_dir / "dashboard.sqlite3"
        if self.path.is_symlink():
            raise ValueError("The dashboard database may not be a symbolic link.")
        fd = os.open(str(self.path), os.O_CREAT | os.O_WRONLY, 0o600)
        os.close(fd)
        os.chmod(self.path, 0o600)
        self.lock = threading.RLock()
        with self._connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sources (
                    id TEXT PRIMARY KEY,
                    fingerprint TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS metadata (
                    key TEXT PRIMARY KEY,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS suggestions (
                    task_id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL
                );
            """)
        self._migrate_task_fields()

    def _migrate_task_fields(self):
        """Add classification fields without revising any existing user data."""
        with self.lock, self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            rows = list(db.execute("SELECT id, payload FROM tasks"))
            for row in rows:
                task = json.loads(row["payload"])
                changed = "disposition" not in task or "recap" not in task
                task.setdefault("disposition", "tracked" if task.get("verifiedAt") is not None else "inbox")
                task.setdefault("recap", "")
                if changed:
                    db.execute("UPDATE tasks SET payload = ? WHERE id = ?", (self._json(task), row["id"]))
                self._ensure_suggestion(db, task)

    @staticmethod
    def _linked_source(db, task):
        for source_id in task["sourceIds"]:
            row = db.execute("SELECT payload FROM sources WHERE id = ?", (source_id,)).fetchone()
            if row:
                return json.loads(row["payload"])
        return None

    def _ensure_suggestion(self, db, task, refresh_starter=False):
        row = db.execute("SELECT payload FROM suggestions WHERE task_id = ?", (task["id"],)).fetchone()
        if row and (not refresh_starter or json.loads(row["payload"])["method"] == "assistant-draft"):
            return
        suggestion = starter_suggestion(task, self._linked_source(db, task), utc_now())
        db.execute("INSERT OR REPLACE INTO suggestions(task_id, payload) VALUES (?, ?)",
                   (task["id"], self._json(suggestion)))

    def _task_with_suggestion(self, db, task):
        result = dict(task)
        row = db.execute("SELECT payload FROM suggestions WHERE task_id = ?", (task["id"],)).fetchone()
        suggestion = json.loads(row["payload"]) if row else starter_suggestion(task, self._linked_source(db, task), utc_now())
        source_id = suggestion["sourceId"]
        source_row = db.execute("SELECT payload FROM sources WHERE id = ?", (source_id,)).fetchone() if source_id else None
        suggestion["stale"] = bool(source_id and (
            source_id not in task["sourceIds"] or not source_row
            or json.loads(source_row["payload"])["updatedAt"] != suggestion["sourceUpdatedAt"]))
        result["suggestion"] = suggestion
        return result

    @contextmanager
    def _connect(self):
        db = sqlite3.connect(str(self.path), timeout=15)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA busy_timeout = 15000")
        try:
            with db:
                yield db
        finally:
            db.close()

    @staticmethod
    def _json(value):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))

    def get_meta(self, key, default=None):
        with self.lock, self._connect() as db:
            row = db.execute("SELECT payload FROM metadata WHERE key = ?", (key,)).fetchone()
            return json.loads(row["payload"]) if row else default

    def update_meta(self, key, updates):
        with self.lock, self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT payload FROM metadata WHERE key = ?", (key,)).fetchone()
            value = json.loads(row["payload"]) if row else {}
            value.update(updates)
            db.execute("INSERT OR REPLACE INTO metadata(key, payload) VALUES (?, ?)", (key, self._json(value)))
            return value

    def list_tasks(self):
        with self.lock, self._connect() as db:
            items = [self._task_with_suggestion(db, json.loads(row["payload"]))
                     for row in db.execute("SELECT payload FROM tasks")]
        # Stable creation order avoids reshuffling a task merely because it refreshed.
        return sorted(items, key=lambda item: (item["createdAt"], item["id"]), reverse=True)

    def list_sources(self):
        with self.lock, self._connect() as db:
            sources = [json.loads(row["payload"]) for row in db.execute("SELECT payload FROM sources")]
        for source in sources:
            source.pop("lastUserMessage", None)
            source.pop("lastAssistantMessage", None)
        return sorted(sources, key=lambda item: (item.get("updatedAt", ""), item["id"]), reverse=True)

    def get_source(self, source_id):
        with self.lock, self._connect() as db:
            row = db.execute("SELECT payload FROM sources WHERE id = ?", (source_id,)).fetchone()
            if not row:
                raise NotFound("Conversation not found.")
            return json.loads(row["payload"])

    def get_task(self, task_id):
        with self.lock, self._connect() as db:
            row = db.execute("SELECT payload FROM tasks WHERE id = ?", (task_id,)).fetchone()
            if not row:
                raise NotFound("Work item not found.")
            return self._task_with_suggestion(db, json.loads(row["payload"]))

    def _validate_fields(self, fields, db, creating=False):
        if not isinstance(fields, dict):
            raise StoreError("The request body must be a JSON object.")
        unknown = set(fields) - EDITABLE
        if unknown:
            raise StoreError("Unknown fields: %s." % ", ".join(sorted(unknown)))
        cleaned = {}
        for key, value in fields.items():
            if key in TEXT_LIMITS:
                cleaned[key] = _string(value, key, TEXT_LIMITS[key], required=key == "title")
            elif key in {"status", "triage", "owner", "disposition"}:
                choices = {"status": STATUSES, "triage": TRIAGE, "owner": OWNERS, "disposition": DISPOSITIONS}[key]
                if not isinstance(value, str) or value not in choices:
                    raise StoreError("Invalid %s." % key)
                cleaned[key] = value
            elif key == "hasNewActivity":
                if type(value) is not bool:
                    raise StoreError("hasNewActivity must be true or false.")
                cleaned[key] = value
            elif key == "sourceIds":
                if not isinstance(value, list) or len(value) > 50:
                    raise StoreError("sourceIds must contain no more than 50 conversation IDs.")
                result = []
                for source_id in value:
                    if not isinstance(source_id, str) or not ID_PATTERN.fullmatch(source_id):
                        raise StoreError("Invalid conversation ID.")
                    if not db.execute("SELECT 1 FROM sources WHERE id = ?", (source_id,)).fetchone():
                        raise StoreError("One of the selected conversations is no longer available.")
                    if source_id not in result:
                        result.append(source_id)
                cleaned[key] = result
        if creating and not cleaned.get("title"):
            raise StoreError("title cannot be empty.")
        return cleaned

    def create_task(self, fields):
        with self.lock, self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            cleaned = self._validate_fields(fields, db, creating=True)
            now = utc_now()
            task = {
                "id": "task_" + uuid.uuid4().hex,
                "title": "", "project": "", "domain": "Unsorted",
                "status": "idea", "triage": "untriaged", "nextAction": "",
                "owner": "none", "priorityReason": "", "sourceIds": [],
                "createdAt": now, "updatedAt": now, "verifiedAt": now,
                "hasNewActivity": False, "revision": 1,
                "disposition": "tracked", "recap": "",
            }
            task.update(cleaned)
            db.execute("INSERT INTO tasks(id, payload) VALUES (?, ?)", (task["id"], self._json(task)))
            self._ensure_suggestion(db, task)
            return self._task_with_suggestion(db, task)

    def patch_task(self, task_id, fields):
        if not isinstance(fields, dict):
            raise StoreError("The request body must be a JSON object.")
        fields = dict(fields)
        revision = fields.pop("revision", None)
        if type(revision) is not int or revision < 1:
            raise StoreError("A valid revision is required to save changes.")
        if not fields:
            raise StoreError("No changes were supplied.")
        with self.lock, self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT payload FROM tasks WHERE id = ?", (task_id,)).fetchone()
            if not row:
                raise NotFound("Work item not found.")
            task = json.loads(row["payload"])
            if task["revision"] != revision:
                raise Conflict(self._task_with_suggestion(db, task))
            cleaned = self._validate_fields(fields, db)
            task.update(cleaned)
            task["updatedAt"] = utc_now()
            task["revision"] += 1
            if set(cleaned) & CONFIRMATION_FIELDS:
                task["verifiedAt"] = task["updatedAt"]
            db.execute("UPDATE tasks SET payload = ? WHERE id = ?", (self._json(task), task_id))
            self._ensure_suggestion(db, task, refresh_starter=bool(set(cleaned) & {"sourceIds", "title"}))
            return self._task_with_suggestion(db, task)

    def import_suggestions(self, records):
        """Atomically install assistant drafts without confirming or editing tasks."""
        if not isinstance(records, list) or len(records) > 10000:
            raise StoreError("Suggestions must be an array of at most 10000 records.")
        try:
            cleaned = [validate_draft(record) for record in records]
        except ValueError as exc:
            raise StoreError(str(exc))
        with self.lock, self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            seen = set()
            for draft in cleaned:
                task_id, source_id = draft["taskId"], draft["sourceId"]
                if any(not isinstance(value, str) or not ID_PATTERN.fullmatch(value) for value in (task_id, source_id)):
                    raise StoreError("Suggestion taskId and sourceId must be valid IDs.")
                if task_id in seen:
                    raise StoreError("A suggestion import may contain only one draft per task.")
                seen.add(task_id)
                task_row = db.execute("SELECT payload FROM tasks WHERE id = ?", (task_id,)).fetchone()
                if not task_row:
                    raise StoreError("A suggestion refers to an unknown work item.")
                if source_id not in json.loads(task_row["payload"])["sourceIds"]:
                    raise StoreError("A suggestion source must already belong to its work item.")
                if not db.execute("SELECT 1 FROM sources WHERE id = ?", (source_id,)).fetchone():
                    raise StoreError("A suggestion refers to an unknown conversation.")
            generated_at = utc_now()
            for draft in cleaned:
                suggestion = {key: value for key, value in draft.items() if key != "taskId"}
                suggestion["generatedAt"] = generated_at
                db.execute("INSERT OR REPLACE INTO suggestions(task_id, payload) VALUES (?, ?)",
                           (draft["taskId"], self._json(suggestion)))
        return {"imported": len(cleaned)}

    @staticmethod
    def normalize_source(record):
        if not isinstance(record, dict):
            raise StoreError("The conversation source returned an invalid record.")
        source_id = record.get("id")
        if not isinstance(source_id, str) or not ID_PATTERN.fullmatch(source_id):
            raise StoreError("The conversation source returned an invalid ID.")
        source_url = _source_text(record, "source_url", 500)
        if source_url != "codex://threads/" + source_id:
            source_url = "codex://threads/" + source_id
        return {
            "id": source_id,
            "title": _source_text(record, "title", 8000) or "Untitled conversation",
            "summary": _source_text(record, "summary", 600),
            "lastUserMessage": _source_text(record, "last_user_message", 2500),
            "lastAssistantMessage": _source_text(record, "last_assistant_message", 2500),
            "updatedAt": _source_text(record, "updated_at", 60),
            "cwd": _source_text(record, "cwd", 2000),
            "section": _source_text(record, "section", 200),
            "source": "codex", "sourceUrl": source_url,
            "runtimeStatus": "unknown",
            "sourceStatusNote": _source_text(record, "source_status_note", 600) or
                "Activity in the desktop app is not observable from this connection.",
        }

    def reconcile_sources(self, records):
        if not isinstance(records, list):
            raise StoreError("The conversation source returned an invalid collection.")
        # Validate the whole batch before opening a write transaction.
        normalized = {source["id"]: source for source in map(self.normalize_source, records)}
        now = utc_now()
        new_count, changed_count = 0, 0
        with self.lock, self._connect() as db:
            db.execute("BEGIN IMMEDIATE")
            tasks = [json.loads(row["payload"]) for row in db.execute("SELECT payload FROM tasks")]
            for source_id, source in normalized.items():
                fingerprint = hashlib.sha256(self._json(source).encode("utf-8")).hexdigest()
                previous = db.execute("SELECT fingerprint FROM sources WHERE id = ?", (source_id,)).fetchone()
                if previous and previous["fingerprint"] == fingerprint:
                    continue
                db.execute("INSERT OR REPLACE INTO sources(id, fingerprint, payload) VALUES (?, ?, ?)",
                           (source_id, fingerprint, self._json(source)))
                if previous:
                    changed_count += 1
                    for task in tasks:
                        if source_id in task["sourceIds"]:
                            task["hasNewActivity"] = True
                            task["updatedAt"] = now
                            task["revision"] += 1
                            db.execute("UPDATE tasks SET payload = ? WHERE id = ?", (self._json(task), task["id"]))
                            self._ensure_suggestion(db, task, refresh_starter=True)
                else:
                    new_count += 1
                    task = {
                        "id": "task_" + uuid.uuid4().hex,
                        "title": source["title"],
                        "project": "",
                        "domain": source["section"] if source["section"].strip().casefold() not in {"", "pinned", "projects", "tasks", "chats"} else "Unsorted",
                        "status": "active", "triage": "untriaged",
                        "nextAction": "", "owner": "none",
                        "priorityReason": "Imported conversation; task status has not been assessed.",
                        "sourceIds": [source_id], "createdAt": now, "updatedAt": now,
                        "verifiedAt": None, "hasNewActivity": False, "revision": 1,
                        "disposition": "inbox", "recap": "",
                    }
                    db.execute("INSERT INTO tasks(id, payload) VALUES (?, ?)", (task["id"], self._json(task)))
                    self._ensure_suggestion(db, task)
                    tasks.append(task)
        return {"new": new_count, "changed": changed_count, "received": len(normalized)}
