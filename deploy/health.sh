#!/usr/bin/env bash
# Is the app on this port alive? Sourced by deploy.sh and rollback.sh.
#
#   app_alive <port> [label]      returns 0 if alive, 1 if not, and prints why
#
# It asks /api/health first. That route is under /api, which the app's proxy
# never touches, so MAINTENANCE MODE CANNOT FAIL IT. The check used to ask "/",
# got the 503 holding page while the shop was deliberately paused, decided a
# healthy app was dead, rolled it back — and then reported the previous build
# dead too, for the same reason.
#
# A build from before /api/health existed answers 404 there. That is the build a
# rollback lands on, so the check falls back to "/" and accepts what a living
# app can say: any 2xx or 3xx, or a 503 that carries Retry-After, which is the
# holding page and not a crash. A 503 without it, a 5xx, or no answer is dead.
#
# It retries for up to 30 seconds, because PM2 reload returns before Next has
# finished starting.

app_alive() {
  local port="$1" label="${2:-}" base="http://127.0.0.1:$1" code headers i
  for i in $(seq 1 15); do
    code=$(curl -s -o /dev/null -m 5 -w '%{http_code}' "$base/api/health" 2>/dev/null || true)
    if [ "$code" = "200" ]; then
      echo "  HTTP 200 from $base/api/health${label:+ ($label)}"
      return 0
    fi
    if [ "$code" = "404" ]; then
      headers=$(curl -s -o /dev/null -m 5 -D - "$base/" 2>/dev/null || true)
      code=$(printf '%s' "$headers" | head -1 | awk '{print $2}')
      case "$code" in
        2??|3??)
          echo "  HTTP $code from $base/${label:+ ($label)} — a build from before /api/health"
          return 0 ;;
        503)
          if printf '%s' "$headers" | grep -qi '^retry-after:'; then
            echo "  HTTP 503 with Retry-After from $base/${label:+ ($label)} — maintenance mode is on, the app is alive"
            return 0
          fi ;;
      esac
    fi
    sleep 2
  done
  echo "  No healthy answer from $base after 30s (last status: ${code:-none})${label:+ ($label)}"
  return 1
}
