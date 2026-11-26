#!/usr/bin/env python3
"""Import unconfirmed assistant drafts into the dashboard's separate suggestion store."""

import argparse
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from server.store import DashboardStore, StoreError


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path, help="JSON array containing assistant-draft suggestions")
    parser.add_argument("--data-dir", type=Path, default=ROOT / "data")
    args = parser.parse_args()
    os.umask(0o077)
    try:
        with args.path.open("rb") as source:
            payload = source.read(5 * 1024 * 1024 + 1)
        if len(payload) > 5 * 1024 * 1024:
            raise StoreError("The suggestion file must be no larger than 5 MiB.")
        records = json.loads(payload.decode("utf-8"))
        if not (args.data_dir / "dashboard.sqlite3").is_file():
            raise StoreError("No existing dashboard database was found.")
        result = DashboardStore(args.data_dir).import_suggestions(records)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, StoreError) as exc:
        # Never echo imported conversation text or a JSON parser excerpt.
        message = str(exc) if isinstance(exc, StoreError) else "Could not read a valid suggestion JSON file."
        parser.exit(1, message + "\n")
    print(json.dumps(result))


if __name__ == "__main__":
    main()
