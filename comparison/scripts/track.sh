#!/usr/bin/env bash
# Append one tracking event to comparison/metrics/events.jsonl
# Usage: track.sh KIND [JSON_FIELDS]
#   KIND        : phase | prompt | tool | cmd | note
#   JSON_FIELDS : optional compact JSON object merged into the event (default {})
# Always exits 0 — must never disrupt a Claude Code session.
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
METRICS="$ROOT/metrics"
STATE="$ROOT/.current-phase"
mkdir -p "$METRICS" 2>/dev/null

kind="${1:-note}"
extra="${2:-{}}"
ts="$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)"

impl="none"; phase="none"
if [ -f "$STATE" ] && command -v jq >/dev/null 2>&1; then
  impl="$(jq -r '.impl // "none"' "$STATE" 2>/dev/null || echo none)"
  phase="$(jq -r '.phase // "none"' "$STATE" 2>/dev/null || echo none)"
fi

line=""
if command -v jq >/dev/null 2>&1; then
  line="$(printf '%s' "$extra" | jq -c \
    --arg ts "$ts" --arg impl "$impl" --arg phase "$phase" --arg kind "$kind" \
    '. + {ts:$ts, impl:$impl, phase:$phase, kind:$kind}' 2>/dev/null)"
fi
if [ -z "$line" ]; then
  line="$(printf '{"ts":"%s","impl":"%s","phase":"%s","kind":"%s"}' "$ts" "$impl" "$phase" "$kind")"
fi

printf '%s\n' "$line" >> "$METRICS/events.jsonl" 2>/dev/null
exit 0
