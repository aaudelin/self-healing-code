#!/usr/bin/env bash
# Mark a work-phase boundary so durations can be attributed per implementation.
# Usage: phase.sh <python|rust|none> <setup|agent-loop|review|bench|...> <start|end>
set -eu

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE="$ROOT/.current-phase"

impl="${1:?usage: phase.sh <python|rust|none> <phase> <start|end>}"
phase="${2:?usage: phase.sh <python|rust|none> <phase> <start|end>}"
state="${3:?usage: phase.sh <python|rust|none> <phase> <start|end>}"

if [ "$state" = "end" ]; then
  # Log the end event under the phase that is ending, then clear current phase.
  "$ROOT/scripts/track.sh" phase "$(printf '{"state":"end","impl":"%s","phase":"%s"}' "$impl" "$phase")"
  printf '{"impl":"none","phase":"none"}\n' > "$STATE"
else
  printf '{"impl":"%s","phase":"%s"}\n' "$impl" "$phase" > "$STATE"
  "$ROOT/scripts/track.sh" phase '{"state":"start"}'
fi

echo "phase: impl=$impl phase=$phase state=$state"
