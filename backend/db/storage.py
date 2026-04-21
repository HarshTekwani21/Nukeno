import sqlite3
import os
from typing import Dict, List, Optional
from datetime import datetime
from pathlib import Path

_DB_PATH = Path(__file__).parent / "nukeno.db"


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(_DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _init_db():
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS tasks (
                id          TEXT PRIMARY KEY,
                title       TEXT NOT NULL,
                priority    TEXT NOT NULL DEFAULT 'medium',
                deadline    TEXT,
                completed   INTEGER NOT NULL DEFAULT 0,
                completed_at TEXT,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS notes (
                id          TEXT PRIMARY KEY,
                title       TEXT NOT NULL,
                content     TEXT NOT NULL DEFAULT '',
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            );
        """)


def _task_row_to_dict(row) -> Dict:
    d = dict(row)
    d["completed"] = bool(d["completed"])
    return d


def _note_row_to_dict(row) -> Dict:
    return dict(row)


_init_db()


class Storage:
    def get_tasks(self, include_completed: bool = True) -> List[Dict]:
        with _get_conn() as conn:
            if include_completed:
                rows = conn.execute("SELECT * FROM tasks ORDER BY created_at DESC").fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM tasks WHERE completed = 0 ORDER BY created_at DESC"
                ).fetchall()
        return [_task_row_to_dict(r) for r in rows]

    def get_task_by_id(self, task_id: str) -> Optional[Dict]:
        with _get_conn() as conn:
            row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        return _task_row_to_dict(row) if row else None

    def add_task(self, task: Dict) -> Dict:
        now = datetime.now().isoformat()
        task_id = str(datetime.now().timestamp())
        priority = task.get("priority", "medium")
        with _get_conn() as conn:
            conn.execute(
                """INSERT INTO tasks (id, title, priority, deadline, completed, created_at, updated_at)
                   VALUES (?, ?, ?, ?, 0, ?, ?)""",
                (task_id, task["title"], priority, task.get("deadline"), now, now),
            )
        return self.get_task_by_id(task_id)

    def update_task(self, task_id: str, updates: Dict) -> Optional[Dict]:
        if not updates:
            return self.get_task_by_id(task_id)
        now = datetime.now().isoformat()
        allowed = {"title", "priority", "deadline", "completed", "completed_at"}
        cols = {k: v for k, v in updates.items() if k in allowed}
        cols["updated_at"] = now
        set_clause = ", ".join(f"{k} = ?" for k in cols)
        values = list(cols.values()) + [task_id]
        with _get_conn() as conn:
            cur = conn.execute(f"UPDATE tasks SET {set_clause} WHERE id = ?", values)
            if cur.rowcount == 0:
                return None
        return self.get_task_by_id(task_id)

    def delete_task(self, task_id: str) -> bool:
        with _get_conn() as conn:
            cur = conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        return cur.rowcount > 0

    def complete_task(self, task_id: str) -> Optional[Dict]:
        return self.update_task(
            task_id,
            {"completed": True, "completed_at": datetime.now().isoformat()},
        )

    def get_notes(self, limit: Optional[int] = None) -> List[Dict]:
        with _get_conn() as conn:
            if limit:
                rows = conn.execute(
                    "SELECT * FROM notes ORDER BY created_at DESC LIMIT ?", (limit,)
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM notes ORDER BY created_at DESC"
                ).fetchall()
        return [_note_row_to_dict(r) for r in rows]

    def get_note_by_id(self, note_id: str) -> Optional[Dict]:
        with _get_conn() as conn:
            row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
        return _note_row_to_dict(row) if row else None

    def add_note(self, note: Dict) -> Dict:
        now = datetime.now().isoformat()
        note_id = str(datetime.now().timestamp())
        with _get_conn() as conn:
            conn.execute(
                "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (note_id, note["title"], note.get("content", ""), now, now),
            )
        return self.get_note_by_id(note_id)

    def update_note(self, note_id: str, updates: Dict) -> Optional[Dict]:
        if not updates:
            return self.get_note_by_id(note_id)
        now = datetime.now().isoformat()
        allowed = {"title", "content"}
        cols = {k: v for k, v in updates.items() if k in allowed}
        cols["updated_at"] = now
        set_clause = ", ".join(f"{k} = ?" for k in cols)
        values = list(cols.values()) + [note_id]
        with _get_conn() as conn:
            cur = conn.execute(f"UPDATE notes SET {set_clause} WHERE id = ?", values)
            if cur.rowcount == 0:
                return None
        return self.get_note_by_id(note_id)

    def delete_note(self, note_id: str) -> bool:
        with _get_conn() as conn:
            cur = conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        return cur.rowcount > 0

    def search_notes(self, query: str) -> List[Dict]:
        q = f"%{query.lower()}%"
        with _get_conn() as conn:
            rows = conn.execute(
                "SELECT * FROM notes WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ? ORDER BY created_at DESC",
                (q, q),
            ).fetchall()
        return [_note_row_to_dict(r) for r in rows]

    def get_stats(self) -> Dict:
        with _get_conn() as conn:
            total_tasks = conn.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
            completed = conn.execute("SELECT COUNT(*) FROM tasks WHERE completed = 1").fetchone()[0]
            high_priority = conn.execute(
                "SELECT COUNT(*) FROM tasks WHERE priority = 'high' AND completed = 0"
            ).fetchone()[0]
            total_notes = conn.execute("SELECT COUNT(*) FROM notes").fetchone()[0]
        return {
            "total_tasks": total_tasks,
            "completed_tasks": completed,
            "pending_tasks": total_tasks - completed,
            "high_priority_tasks": high_priority,
            "total_notes": total_notes,
        }


storage = Storage()
