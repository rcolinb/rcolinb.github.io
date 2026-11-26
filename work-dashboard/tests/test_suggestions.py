import json
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest

from server.store import DashboardStore, StoreError
from server.suggestions import STARTER_NEXT_ACTION


def conversation(**updates):
    record = {"id": "source-1", "title": "Plan a lecture", "summary": "Outline proposed for review.",
              "updated_at": "2026-11-23T15:00:00Z", "cwd": "/work/Teaching"}
    record.update(updates)
    return record


class SuggestionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = DashboardStore(Path(self.temp.name) / "data")
        self.store.reconcile_sources([conversation()])
        self.item = self.store.list_tasks()[0]

    def tearDown(self):
        self.temp.cleanup()

    def draft(self, **updates):
        record = {"taskId": self.item["id"], "title": "Prepare a lecture outline", "project": "Teaching",
                  "recap": "An outline is proposed; its completion has not been confirmed.",
                  "nextAction": "Review the outline and decide what to develop.",
                  "evidence": "The latest reply proposes an outline for review.",
                  "sourceId": "source-1", "sourceUpdatedAt": "2026-11-23T15:00:00Z", "method": "assistant-draft"}
        record.update(updates)
        return record

    def raw_task(self, task_id=None):
        with sqlite3.connect(str(self.store.path)) as db:
            return json.loads(db.execute("SELECT payload FROM tasks WHERE id = ?", (task_id or self.item["id"],)).fetchone()[0])

    def test_additive_migration_preserves_confirmed_and_unconfirmed_values(self):
        manual = self.store.create_task({"title": "Confirmed work", "project": "My project", "status": "waiting", "nextAction": "Keep my next step."})
        old_tasks = []
        with sqlite3.connect(str(self.store.path)) as db:
            for task_id in (self.item["id"], manual["id"]):
                task = json.loads(db.execute("SELECT payload FROM tasks WHERE id = ?", (task_id,)).fetchone()[0])
                task.pop("disposition")
                task.pop("recap")
                task["project"] = "Teaching" if task_id == self.item["id"] else task["project"]
                old_tasks.append(task)
                db.execute("UPDATE tasks SET payload = ? WHERE id = ?", (json.dumps(task), task_id))
            db.execute("DROP TABLE suggestions")
        migrated = DashboardStore(self.store.data_dir)
        for old in old_tasks:
            actual = migrated.get_task(old["id"])
            for key, value in old.items():
                self.assertEqual(actual[key], value, key)
            self.assertEqual(actual["disposition"], "tracked" if old["verifiedAt"] else "inbox")
            self.assertEqual(actual["recap"], "")
            self.assertEqual(actual["suggestion"]["method"], "starter")
        self.assertEqual(len(migrated.list_sources()), 1)
        self.assertEqual(DashboardStore(self.store.data_dir).list_tasks(), migrated.list_tasks())

    def test_new_imports_are_uncommitted_and_manual_tasks_are_tracked(self):
        self.assertEqual(self.item["disposition"], "inbox")
        self.assertIsNone(self.item["verifiedAt"])
        self.assertEqual(self.item["nextAction"], "")
        manual = self.store.create_task({"title": "My idea"})
        self.assertEqual(manual["disposition"], "tracked")
        self.assertIsNotNone(manual["verifiedAt"])
        self.assertEqual(manual["suggestion"]["method"], "starter")
        self.assertIsNone(manual["suggestion"]["sourceId"])
        self.assertIsNone(manual["suggestion"]["sourceUpdatedAt"])

    def test_draft_import_never_confirms_or_overwrites_task(self):
        before = self.raw_task()
        result = self.store.import_suggestions([self.draft()])
        self.assertEqual(result, {"imported": 1})
        self.assertEqual(self.raw_task(), before)
        suggestion = self.store.get_task(self.item["id"])["suggestion"]
        self.assertEqual(suggestion["method"], "assistant-draft")
        self.assertFalse(suggestion["stale"])
        self.assertNotIn("taskId", suggestion)
        self.assertTrue(suggestion["generatedAt"].endswith("Z"))
        self.assertNotIn("suggestion", self.raw_task())

    def test_source_update_marks_draft_stale_without_replacing_it(self):
        self.store.import_suggestions([self.draft()])
        before = self.store.get_task(self.item["id"])["suggestion"]
        self.store.reconcile_sources([conversation(title="Later conversation title", updated_at="2026-11-23T16:00:00Z")])
        after = self.store.get_task(self.item["id"])
        self.assertEqual(after["suggestion"], dict(before, stale=True))
        self.assertEqual(after["title"], self.item["title"])
        self.assertEqual(after["nextAction"], "")
        self.assertIsNone(after["verifiedAt"])
        self.assertEqual(after["disposition"], "inbox")
        self.assertTrue(after["hasNewActivity"])

    def test_older_draft_is_importable_but_immediately_stale(self):
        self.store.import_suggestions([self.draft(sourceUpdatedAt="2026-11-22T15:00:00Z")])
        self.assertTrue(self.store.get_task(self.item["id"])["suggestion"]["stale"])

    def test_starter_is_bounded_conservative_and_stable_until_source_changes(self):
        self.store.reconcile_sources([conversation(title="A long topic " * 200, summary="summary " * 100)])
        first = self.store.get_task(self.item["id"])["suggestion"]
        self.assertLessEqual(len(first["title"]), 160)
        self.assertLessEqual(len(first["recap"]), 600)
        self.assertEqual(first["project"], "")
        self.assertEqual(first["nextAction"], STARTER_NEXT_ACTION)
        self.assertEqual(first["method"], "starter")
        self.assertFalse(first["stale"])
        self.assertEqual(self.store.get_task(self.item["id"])["suggestion"], first)
        self.store.reconcile_sources([conversation(title="New source title", summary="New summary", updated_at="2026-11-23T16:00:00Z")])
        updated = self.store.get_task(self.item["id"])["suggestion"]
        self.assertEqual(updated["title"], "New source title")
        self.assertEqual(updated["recap"], "New summary")
        self.assertFalse(updated["stale"])

    def test_classify_undo_and_reference_keeps_source_available(self):
        item = self.item
        for disposition in ("reference", "inbox", "tracked", "reference"):
            item = self.store.patch_task(item["id"], {"revision": item["revision"], "disposition": disposition})
            self.assertEqual(item["disposition"], disposition)
            self.assertIsNotNone(item["verifiedAt"])
            self.assertEqual(item["status"], "active")
        self.assertIn(item["id"], [value["id"] for value in self.store.list_tasks()])
        self.assertEqual(self.store.get_source("source-1")["title"], "Plan a lecture")
        self.store.reconcile_sources([conversation(summary="Fresh searchable reference", updated_at="2026-11-23T16:00:00Z")])
        updated = self.store.get_task(item["id"])
        self.assertEqual(updated["disposition"], "reference")
        self.assertTrue(updated["hasNewActivity"])
        self.assertEqual(self.store.list_sources()[0]["summary"], "Fresh searchable reference")

    def test_acknowledging_activity_does_not_confirm_or_finish(self):
        self.store.reconcile_sources([conversation(updated_at="2026-11-23T16:00:00Z")])
        before = self.store.get_task(self.item["id"])
        after = self.store.patch_task(before["id"], {"revision": before["revision"], "hasNewActivity": False})
        self.assertFalse(after["hasNewActivity"])
        for key in ("verifiedAt", "disposition", "status", "triage", "nextAction"):
            self.assertEqual(after[key], before[key])
        self.assertIsNone(after["verifiedAt"])

    def test_confirmed_fields_survive_draft_and_source_refresh(self):
        chosen = self.store.patch_task(self.item["id"], {"revision": self.item["revision"],
            "title": "My wording", "project": "My grouping", "recap": "My recap", "nextAction": "My next step",
            "status": "waiting", "triage": "review", "disposition": "tracked"})
        self.store.import_suggestions([self.draft()])
        self.store.reconcile_sources([conversation(updated_at="2026-11-23T16:00:00Z")])
        actual = self.store.get_task(chosen["id"])
        for key in ("title", "project", "recap", "nextAction", "status", "triage", "disposition", "verifiedAt"):
            self.assertEqual(actual[key], chosen[key])

    def test_unlinking_draft_source_marks_it_stale_and_never_deletes_source(self):
        self.store.import_suggestions([self.draft()])
        item = self.store.patch_task(self.item["id"], {"revision": self.item["revision"], "sourceIds": []})
        self.assertTrue(item["suggestion"]["stale"])
        self.assertEqual(self.store.get_source("source-1")["id"], "source-1")

    def test_draft_validation_and_ownership_are_atomic(self):
        self.store.reconcile_sources([conversation(id="source-2")])
        before = self.store.get_task(self.item["id"])["suggestion"]
        invalid = [self.draft(title="x" * 161), self.draft(method="starter"),
                   self.draft(sourceId="source-2"), self.draft(sourceId="missing"),
                   self.draft(sourceUpdatedAt="2026-11-23T15:00:00"), self.draft(sourceUpdatedAt="yesterday"),
                   self.draft(taskId="unknown"), self.draft(evidence="x" * 221),
                   self.draft(extra="not accepted")]
        for record in invalid:
            with self.subTest(record=list(record)):
                with self.assertRaises(StoreError):
                    self.store.import_suggestions([record])
                self.assertEqual(self.store.get_task(self.item["id"])["suggestion"], before)
        other = next(item for item in self.store.list_tasks() if item["sourceIds"] == ["source-2"])
        with self.assertRaises(StoreError):
            self.store.import_suggestions([self.draft(), self.draft(taskId=other["id"])])
        self.assertEqual(self.store.get_task(self.item["id"])["suggestion"], before)
        with self.assertRaises(StoreError):
            self.store.import_suggestions([self.draft(), self.draft()])
        with self.assertRaises(StoreError):
            self.store.patch_task(self.item["id"], {"revision": 1, "recap": "x" * 1001})
        with self.assertRaises(StoreError):
            self.store.patch_task(self.item["id"], {"revision": 1, "disposition": "finished"})

    def test_import_command_uses_existing_database_and_prints_only_count(self):
        fixture = Path(self.temp.name) / "drafts.json"
        fixture.write_text(json.dumps([self.draft()]))
        script = Path(__file__).resolve().parents[1] / "scripts" / "import_suggestions.py"
        command = [sys.executable, str(script), str(fixture), "--data-dir", str(self.store.data_dir)]
        result = subprocess.run(command, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), {"imported": 1})
        self.assertEqual(self.store.get_task(self.item["id"])["suggestion"]["method"], "assistant-draft")
        fixture.write_text('{"private text that must not be echoed"')
        result = subprocess.run(command, text=True, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("private text", result.stderr)


if __name__ == "__main__":
    unittest.main()
