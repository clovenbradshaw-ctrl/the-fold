#!/usr/bin/env bash
# solon-keeper.sh — keep the Integrity archon alive.
#
# A supervisor, not a launcher: if Solon dies for any reason other than an
# explicit stop, it is re-forged (heimdall's REC posture applied to the
# watcher itself — a dead watcher is a finding; a restart storm is also a
# finding, so the loop backs off between re-forges).
#
# Usage:
#   scripts/solon-keeper.sh start    — start the supervisor (nohup + pidfile)
#   scripts/solon-keeper.sh stop     — stop the supervisor and the keeper
#   scripts/solon-keeper.sh status   — pid, last heartbeat age, log size
#
# The surface: http://localhost:8812/solon.html (forwarded /solon).

set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${ER7_SOLON_PORT:-11438}"
PIDFILE="$HERE/record/solon.pid"
LOGFILE="$HERE/record/solon-keeper.log"
SOLON_LOG="$HERE/record/solon-log.jsonl"

mkdir -p "$HERE/record"

case "${1:-}" in
  start)
    if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
      echo "solon keeper already running (pid $(cat "$PIDFILE"))" >&2
      exit 0
    fi
    rm -f "$HERE/record/solon.stop"   # a prior stop leaves this; clear it or the loop exits before spawning
    ( "$0" loop ) >>"$LOGFILE" 2>&1 &
    echo $! >"$PIDFILE"
    echo "solon keeper up — pid $(cat "$PIDFILE"), status http://localhost:8812/solon.html"
    ;;
  loop)
    # the supervisor loop: re-forge until an explicit stop or a clean exit
    while :; do
      if [ -f "$HERE/record/solon.stop" ]; then rm -f "$HERE/record/solon.stop"; break; fi
      node "$HERE/solon.js" "$PORT" 2>&1
      code=$?
      if [ "$code" -eq 0 ] || [ "$code" -eq 130 ] || [ "$code" -eq 143 ]; then break; fi
      echo "[$(date -u +%FT%TZ)] solon exited $code — re-forging in 5s" >>"$LOGFILE"
      sleep 5
    done
    ;;
stop)
    touch "$HERE/record/solon.stop"
    if [ -f "$PIDFILE" ]; then kill "$(cat "$PIDFILE")" 2>/dev/null; rm -f "$PIDFILE"; fi
    # also stop the keeper child itself if the supervisor went away
    pkill -f "$HERE/solon.js" 2>/dev/null
    echo "solon keeper stopped"
    ;;
  status)
    if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
      echo "supervisor: running (pid $(cat "$PIDFILE"))"
    else
      echo "supervisor: not running"
    fi
    if [ -f "$SOLON_LOG" ]; then
      beats=$(grep -c '"event":"heartbeat"' "$SOLON_LOG" 2>/dev/null || echo 0)
      sweeps=$(grep -c '"event":"sweep"' "$SOLON_LOG" 2>/dev/null || echo 0)
      last=$(tail -n 1 "$SOLON_LOG" 2>/dev/null | grep -o '"at":[0-9]*' | head -1 | grep -o '[0-9]*' || echo 0)
      now=$(date +%s000)
      age=$(( (now - last) / 1000 ))
      echo "log: $beats beats, $sweeps sweeps, last event ${age}s ago"
    else
      echo "log: none yet"
    fi
    ;;
  *)
    echo "usage: $0 start|stop|status" >&2
    exit 2
    ;;
esac