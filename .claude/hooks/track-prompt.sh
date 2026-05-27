#!/usr/bin/env bash
# UserPromptSubmit hook: count one AI prompt. Non-blocking, always exit 0.
set -u
cat >/dev/null 2>&1   # drain stdin (payload unused — we only count)
PROJ="${CLAUDE_PROJECT_DIR:-$(pwd)}"
"$PROJ/comparison/scripts/track.sh" prompt '{}' >/dev/null 2>&1
exit 0
