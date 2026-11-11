#!/bin/bash
# Exit 0 only when the StartOS-facing server (wg0) is up and the PIA tunnel
# (pia) has completed a WireGuard handshake recently.
set -u

STALE_SECONDS=180

if ! wg show wg0 >/dev/null 2>&1; then
  echo "The relay server interface (wg0) is down"
  exit 1
fi

if ! wg show pia >/dev/null 2>&1; then
  state=$(jq -r '.message // .state // "connecting"' /data/pia.status 2>/dev/null || echo connecting)
  echo "Not connected to PIA: $state"
  exit 1
fi

last=$(wg show pia latest-handshakes | awk '{print $2}' | head -1)
now=$(date +%s)
if [ -z "${last:-}" ] || [ "$last" -eq 0 ]; then
  echo "Waiting for the first handshake with PIA"
  exit 1
fi
age=$((now - last))
if [ "$age" -gt "$STALE_SECONDS" ]; then
  echo "No handshake with PIA for ${age}s"
  exit 1
fi

region=$(jq -r '.regionName // "PIA"' /data/pia.status 2>/dev/null || echo PIA)
echo "Connected to PIA ($region)"
exit 0
