"""Tiny SQLite store. Each record is one JSON document. Uploaded files live on disk, never in a public static dir."""
import json, os, sqlite3, threading
from datetime import datetime, timezone

from pathlib import Path

_DEFAULT_DB = Path(__file__).resolve().parent.parent / "carepilot.db"
DB_PATH = os.getenv("DB_PATH") or str(_DEFAULT_DB if _DEFAULT_DB.exists() else Path("carepilot.db"))
_lock = threading.Lock()


def _conn():
    c = sqlite3.connect(DB_PATH, check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c


def init():
    with _lock, _conn() as c:
        c.execute("CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, created_at TEXT, data TEXT)")
        c.execute("CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY, v TEXT)")


try:
    init()
except Exception:
    pass


def save(rec: dict):
    rec.setdefault("created_at", datetime.now(timezone.utc).isoformat())
    with _lock, _conn() as c:
        c.execute("INSERT OR REPLACE INTO records VALUES(?,?,?)", (rec["id"], rec["created_at"], json.dumps(rec)))
    return rec


def get(rid):
    with _lock, _conn() as c:
        row = c.execute("SELECT data FROM records WHERE id=?", (rid,)).fetchone()
    return json.loads(row["data"]) if row else None


def all_records():
    with _lock, _conn() as c:
        rows = c.execute("SELECT data FROM records ORDER BY created_at DESC").fetchall()
    return [json.loads(r["data"]) for r in rows]


def delete(rid):
    with _lock, _conn() as c:
        return c.execute("DELETE FROM records WHERE id=?", (rid,)).rowcount > 0


def delete_all():
    with _lock, _conn() as c:
        c.execute("DELETE FROM records")


def set_setting(k, v):
    with _lock, _conn() as c:
        c.execute("INSERT OR REPLACE INTO settings VALUES(?,?)", (k, v))


def get_setting(k):
    with _lock, _conn() as c:
        row = c.execute("SELECT v FROM settings WHERE k=?", (k,)).fetchone()
    return row["v"] if row else None
