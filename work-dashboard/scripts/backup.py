#!/usr/bin/env python3
"""Create a consistent, owner-readable backup of the dashboard database."""
from datetime import datetime, timezone
from pathlib import Path
import os
import sqlite3

root = Path(__file__).resolve().parents[1]
source = root / 'data' / 'dashboard.sqlite3'
if not source.exists():
    raise SystemExit('No dashboard database exists yet.')
directory = root / 'data' / 'backups'
directory.mkdir(mode=0o700, exist_ok=True)
destination = directory / ('dashboard-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '.sqlite3')
os.umask(0o077)
with sqlite3.connect(source.as_uri() + '?mode=ro', uri=True) as original:
    with sqlite3.connect(destination) as backup:
        original.backup(backup)
destination.chmod(0o600)
print('Saved backup:', destination)
