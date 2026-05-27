#!/usr/bin/env python3
"""Roll up comparison/metrics/events.jsonl into comparison/metrics/SUMMARY.md.

Captures only the deterministic, auto-measurable signals. Never touches the
manual judgement fields in TRACKING.md.
"""
from __future__ import annotations

import json
import os
import statistics
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]          # comparison/
REPO = ROOT.parent                                   # repo root
EVENTS = ROOT / "metrics" / "events.jsonl"
OUT = ROOT / "metrics" / "SUMMARY.md"

IMPLS = ["python", "rust"]
EDIT_TOOLS = {"Edit", "Write", "MultiEdit", "NotebookEdit"}
CODE_DIRS = {"python": "backend-python", "rust": "backend-rust"}
CODE_EXT = {".py", ".rs", ".ts", ".tsx", ".js", ".jsx", ".toml", ".json"}


def parse_ts(s: str) -> datetime | None:
    for fmt in ("%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            return datetime.strptime(s, fmt)
        except (ValueError, TypeError):
            continue
    return None


def load_events() -> list[dict]:
    if not EVENTS.exists():
        return []
    out = []
    for line in EVENTS.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out


def fmt_duration(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h:
        return f"{h}h{m:02d}m"
    if m:
        return f"{m}m{s:02d}s"
    return f"{s}s"


def phase_durations(events: list[dict], impl: str) -> dict[str, float]:
    """Sum start->end deltas per phase for an implementation."""
    totals: dict[str, float] = {}
    open_starts: dict[str, datetime] = {}
    for e in events:
        if e.get("kind") != "phase":
            continue
        ev_impl = e.get("impl")
        phase = e.get("phase")
        state = e.get("state")
        ts = parse_ts(e.get("ts", ""))
        if ts is None:
            continue
        if state == "start" and ev_impl == impl:
            open_starts[phase] = ts
        elif state == "end" and ev_impl == impl and phase in open_starts:
            totals[phase] = totals.get(phase, 0.0) + (ts - open_starts.pop(phase)).total_seconds()
    return totals


def feedback_latencies(events: list[dict], impl: str) -> list[float]:
    """Delta between an edit and the next command, within the same impl."""
    deltas, last_edit = [], None
    for e in events:
        if e.get("impl") != impl:
            continue
        ts = parse_ts(e.get("ts", ""))
        if ts is None:
            continue
        if e.get("kind") == "tool" and e.get("tool") in EDIT_TOOLS:
            last_edit = ts
        elif e.get("kind") == "cmd" and last_edit is not None:
            deltas.append((ts - last_edit).total_seconds())
            last_edit = None
    return deltas


def self_corrections(events: list[dict], impl: str) -> int:
    """Heuristic: failed cmd -> edit -> succeeding cmd."""
    count, saw_fail, saw_edit = 0, False, False
    for e in events:
        if e.get("impl") != impl:
            continue
        if e.get("kind") == "cmd":
            exit_code = e.get("exit")
            if exit_code not in (0, None) and not saw_fail:
                saw_fail, saw_edit = True, False
            elif exit_code == 0 and saw_fail and saw_edit:
                count += 1
                saw_fail, saw_edit = False, False
        elif e.get("kind") == "tool" and e.get("tool") in EDIT_TOOLS and saw_fail:
            saw_edit = True
    return count


def loc(impl: str) -> int:
    d = REPO / CODE_DIRS[impl]
    if not d.exists():
        return 0
    total = 0
    for p in d.rglob("*"):
        if p.is_file() and p.suffix in CODE_EXT and "node_modules" not in p.parts and "target" not in p.parts:
            try:
                total += sum(1 for _ in p.open(encoding="utf-8", errors="ignore"))
            except OSError:
                pass
    return total


def per_impl(events: list[dict], impl: str) -> dict:
    ev = [e for e in events if e.get("impl") == impl]
    cmds = [e for e in ev if e.get("kind") == "cmd"]
    failed = [e for e in cmds if e.get("exit") not in (0, None)]
    lat = feedback_latencies(events, impl)
    durs = phase_durations(events, impl)
    return {
        "prompts": sum(1 for e in ev if e.get("kind") == "prompt"),
        "edits": sum(1 for e in ev if e.get("kind") == "tool" and e.get("tool") in EDIT_TOOLS),
        "cmds": len(cmds),
        "cmds_failed": len(failed),
        "feedback_median": statistics.median(lat) if lat else None,
        "self_corrections": self_corrections(events, impl),
        "phases": durs,
        "loc": loc(impl),
    }


def main() -> None:
    events = load_events()
    stats = {impl: per_impl(events, impl) for impl in IMPLS}
    phases = sorted({p for impl in IMPLS for p in stats[impl]["phases"]})

    L = []
    L.append("# SUMMARY (auto-généré — ne pas éditer à la main)\n")
    L.append(f"_Généré le {datetime.utcnow().isoformat(timespec='seconds')}Z "
             f"— {len(events)} événements._\n")

    L.append("\n## Durées par phase\n")
    L.append("| Phase | Python | Rust |\n|---|---|---|")
    for p in phases:
        py = stats["python"]["phases"].get(p)
        rs = stats["rust"]["phases"].get(p)
        L.append(f"| {p} | {fmt_duration(py) if py else 'n/a'} | {fmt_duration(rs) if rs else 'n/a'} |")
    if not phases:
        L.append("| _(aucune phase enregistrée)_ | n/a | n/a |")

    def row(label, key, fmt=str):
        py, rs = stats["python"][key], stats["rust"][key]
        py = fmt(py) if py is not None else "n/a"
        rs = fmt(rs) if rs is not None else "n/a"
        return f"| {label} | {py} | {rs} |"

    L.append("\n## Indicateurs événementiels\n")
    L.append("| Indicateur | Python | Rust |\n|---|---|---|")
    L.append(row("Prompts IA", "prompts"))
    L.append(row("Éditions de fichiers (tool)", "edits"))
    L.append(row("Commandes lancées", "cmds"))
    L.append(row("Commandes en échec", "cmds_failed"))
    L.append(row("Latence médiane modif→feedback", "feedback_median",
                 lambda s: fmt_duration(s)))
    L.append(row("Auto-corrections sur échec (heuristique)", "self_corrections"))
    L.append(row("LOC (dossier backend)", "loc"))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(L) + "\n")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
