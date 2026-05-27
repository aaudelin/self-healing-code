#!/usr/bin/env bash
# Run a build/test/run feedback command and record its exit code + duration
# as a 'cmd' tracking event. Use this (instead of calling the tool directly)
# for things like `cargo build`, `tsc`, `pytest`, `uvicorn ...` so the
# comparison captures how often builds fail and how fast the edit->feedback
# loop is. Exit code of the wrapped command is preserved.
#
# Usage: run.sh <command> [args...]
#   e.g. comparison/scripts/run.sh cargo build
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

start="$(date +%s%3N 2>/dev/null || echo 0)"
"$@"
code=$?
end="$(date +%s%3N 2>/dev/null || echo 0)"
ms=$(( end - start ))
cmd_str="$*"

if command -v jq >/dev/null 2>&1; then
  fields="$(jq -nc --arg cmd "$cmd_str" --argjson exit "$code" --argjson ms "$ms" \
    '{cmd:$cmd, exit:$exit, ms:$ms}')"
else
  fields="$(printf '{"cmd":"%s","exit":%s,"ms":%s}' "$cmd_str" "$code" "$ms")"
fi

"$ROOT/scripts/track.sh" cmd "$fields"
exit $code
