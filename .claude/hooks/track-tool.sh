#!/usr/bin/env bash
# PostToolUse hook (Edit|Write|MultiEdit): record one file-edit event.
# Best-effort extraction of tool name / file path from stdin. Always exit 0.
set -u
payload="$(cat 2>/dev/null)"
PROJ="${CLAUDE_PROJECT_DIR:-$(pwd)}"

tool="edit"; file=""
if command -v jq >/dev/null 2>&1; then
  tool="$(printf '%s' "$payload" | jq -r '.tool_name // "edit"' 2>/dev/null || echo edit)"
  file="$(printf '%s' "$payload" | jq -r '(.tool_input.file_path // .tool_input.path // "")' 2>/dev/null || echo "")"
fi

if command -v jq >/dev/null 2>&1; then
  fields="$(jq -nc --arg tool "$tool" --arg file "$file" '{tool:$tool, file:$file}')"
else
  fields="$(printf '{"tool":"%s"}' "$tool")"
fi

"$PROJ/comparison/scripts/track.sh" tool "$fields" >/dev/null 2>&1
exit 0
