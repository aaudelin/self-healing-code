#!/usr/bin/env bash
# Runtime measurements for one implementation (section 4 of TRACKING.md).
# Best-effort: fills what it can, prints n/a + a note otherwise.
#
# Usage: bench.sh <python|rust>
# Env (optional):
#   HEALER_URL   base URL of the running backend (default per impl)
#   HEALER_PID   PID of the running server (for RSS memory)
#   ARTIFACT     path to the binary (rust) or image tag (python) to size
set -u

impl="${1:?usage: bench.sh <python|rust>}"
case "$impl" in
  python) url="${HEALER_URL:-http://localhost:8001}" ;;
  rust)   url="${HEALER_URL:-http://localhost:8002}" ;;
  *) echo "unknown impl: $impl" >&2; exit 1 ;;
esac

note() { printf '  %-28s %s\n' "$1" "$2"; }

echo "== bench: $impl ($url) =="

# --- artifact size ---------------------------------------------------------
if [ -n "${ARTIFACT:-}" ] && [ -e "${ARTIFACT:-/nonexistent}" ]; then
  note "Artifact size" "$(du -h "$ARTIFACT" | cut -f1)"
else
  note "Artifact size" "n/a (set ARTIFACT=<binary|image>)"
fi

# --- health latency / cold start proxy ------------------------------------
if command -v curl >/dev/null 2>&1; then
  t="$(curl -s -o /dev/null -w '%{time_total}' "$url/api/health" 2>/dev/null || echo '')"
  note "GET /api/health" "${t:-n/a}s"
else
  note "GET /api/health" "n/a (curl missing)"
fi

# --- idle memory (RSS) -----------------------------------------------------
if [ -n "${HEALER_PID:-}" ] && [ -d "/proc/${HEALER_PID:-x}" ]; then
  rss_kb="$(awk '/VmRSS/{print $2}' "/proc/$HEALER_PID/status" 2>/dev/null)"
  note "Idle memory (RSS)" "${rss_kb:-n/a} kB"
else
  note "Idle memory (RSS)" "n/a (set HEALER_PID=<server pid>)"
fi

echo
echo "TODO once a real ticket can be processed:"
echo "  - peak memory under load (sample /proc/\$HEALER_PID/status during a job)"
echo "  - average ticket processing time (time a full POST /api/jobs -> done)"
echo "  - cold start (kill server, time until /api/health responds 200)"
echo
echo "Report these numbers into comparison/TRACKING.md section 4."
