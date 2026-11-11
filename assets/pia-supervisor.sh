#!/bin/bash
# Keeps two WireGuard interfaces up inside the container:
#
#   wg0  a static server. StartOS imports its client config once as an
#        outbound-only gateway. Its keys never change.
#   pia  a client to Private Internet Access. This script logs in, registers a
#        fresh key, brings the tunnel up, and renews it before PIA's 24 hour
#        token expires. It reconnects (to the next server) when the tunnel stops
#        handshaking.
#
# Everything that arrives on wg0 is forwarded out `pia` and nowhere else. The
# firewall policy and the routing table are installed before wg0 exists, so no
# packet can leave by another route while PIA is down.
set -u

STORE=/data/store.json
STATUS=/data/pia.status
SERVER_CONF=/data/wg0.conf
PIA_CONF=/run/pia.conf
CA=/usr/local/share/pia/ca.rsa.4096.crt
SERVERLIST_URL='https://serverlist.piaservers.net/vpninfo/servers/v6'
TOKEN_URL='https://www.privateinternetaccess.com/api/client/v2/token'
TABLE=51888
RENEW_SECONDS=${PIA_RENEW_SECONDS:-43200} # 12 hours, half of PIA's token life
STALE_SECONDS=180
GRACE_SECONDS=60
POLL_SECONDS=10

connected_at=0
renew_at=0
region_name=""
server_ip=""
attempt=0
stopping=0

log() { echo "[pia] $*"; }

write_status() {
  # write_status <state> <message>
  local tmp="$STATUS.tmp"
  jq -n \
    --arg state "$1" \
    --arg message "$2" \
    --arg regionName "$region_name" \
    --arg server "$server_ip" \
    --argjson connectedAt "$connected_at" \
    --argjson renewAt "$renew_at" \
    '{state: $state, message: $message, regionName: $regionName, server: $server, connectedAt: $connectedAt, renewAt: $renewAt}' \
    >"$tmp" 2>/dev/null && mv "$tmp" "$STATUS"
}

sleep_interruptible() {
  sleep "$1" &
  wait $!
}

# --- Firewall and routing: installed once, before wg0 comes up ---------------

setup_firewall() {
  sysctl -w net.ipv4.ip_forward=1 >/dev/null
  sysctl -w net.ipv4.conf.all.rp_filter=0 >/dev/null
  sysctl -w net.ipv4.conf.default.rp_filter=0 >/dev/null
  sysctl -w net.ipv6.conf.all.disable_ipv6=1 >/dev/null
  sysctl -w net.ipv6.conf.default.disable_ipv6=1 >/dev/null

  for tool in iptables ip6tables; do
    "$tool" -P FORWARD DROP
    "$tool" -F FORWARD
  done
  iptables -t nat -F POSTROUTING
  iptables -t mangle -F FORWARD

  iptables -A FORWARD -i wg0 -o pia -j ACCEPT
  iptables -A FORWARD -i pia -o wg0 -m conntrack \
    --ctstate RELATED,ESTABLISHED -j ACCEPT
  iptables -t mangle -A FORWARD -o pia -p tcp \
    --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu
  iptables -t nat -A POSTROUTING -o pia -j MASQUERADE

  # Traffic from wg0 uses its own table. With `pia` down the table is empty and
  # the second rule makes the lookup fail, so it never falls through to eth0.
  ip rule del priority 100 2>/dev/null || true
  ip rule del priority 101 2>/dev/null || true
  ip rule add iif wg0 lookup "$TABLE" priority 100
  ip rule add iif wg0 unreachable priority 101
}

teardown_pia() {
  ip route flush table "$TABLE" 2>/dev/null || true
  wg-quick down "$PIA_CONF" >/dev/null 2>&1 || true
  rm -f "$PIA_CONF"
}

cleanup() {
  stopping=1
  teardown_pia
  wg-quick down "$SERVER_CONF" >/dev/null 2>&1 || true
  ip rule del priority 100 2>/dev/null || true
  ip rule del priority 101 2>/dev/null || true
  iptables -F FORWARD 2>/dev/null || true
  iptables -t nat -F POSTROUTING 2>/dev/null || true
  iptables -t mangle -F FORWARD 2>/dev/null || true
  write_status stopped "The relay is stopped"
  exit 0
}

# --- PIA API -----------------------------------------------------------------

# Prints a login token, or returns non-zero.
pia_login() {
  local user pass userfile passfile response token
  user=$(jq -r '.piaUsername // empty' "$STORE")
  pass=$(jq -r '.piaPassword // empty' "$STORE")
  if [ -z "$user" ] || [ -z "$pass" ]; then
    return 2
  fi
  userfile=$(mktemp)
  passfile=$(mktemp)
  chmod 600 "$userfile" "$passfile"
  printf '%s' "$user" >"$userfile"
  printf '%s' "$pass" >"$passfile"
  response=$(curl -sS --max-time 20 --request POST "$TOKEN_URL" \
    --form "username=<$userfile" \
    --form "password=<$passfile" 2>/dev/null)
  rm -f "$userfile" "$passfile"
  token=$(printf '%s' "$response" | jq -r '.token // empty' 2>/dev/null)
  [ -n "$token" ] || return 1
  printf '%s' "$token"
}

# Prints "<ip> <cn> <region name>" for the server to try on this attempt.
pick_server() {
  local region list candidates count index
  region=$(jq -r '.region // "auto"' "$STORE")
  list=$(curl -fsS --max-time 20 "$SERVERLIST_URL" 2>/dev/null | head -1)
  [ -n "$list" ] || return 1

  if [ "$region" != "auto" ] &&
    printf '%s' "$list" |
      jq -e --arg id "$region" '.regions[] | select(.id == $id)' >/dev/null 2>&1; then
    # A chosen region: its WireGuard servers, in the order PIA lists them.
    candidates=$(printf '%s' "$list" | jq -r --arg id "$region" '
      .regions[] | select(.id == $id) | . as $r |
      $r.servers.wg[] | "\(.ip) \(.cn) \($r.name)"')
  else
    # Automatic: regions ranked by connect time to their meta server. Virtual
    # (geo) locations are skipped because their latency says nothing about
    # where the traffic really exits.
    candidates=$(printf '%s' "$list" | jq -r '
      .regions[] | select((.geo // false) == false)
      | select((.servers.wg // []) | length > 0)
      | "\(.servers.meta[0].ip)|\(.servers.wg[0].ip)|\(.servers.wg[0].cn)|\(.name)"' |
      xargs -P 20 -I{} bash -c '
        row="$1"
        meta=${row%%|*}
        rest=${row#*|}
        time=$(curl -o /dev/null -s --connect-timeout 1 \
          --write-out "%{time_connect}" "http://$meta:443") || exit 0
        echo "$time|$rest"' _ {} |
      sort -t'|' -k1,1n |
      awk -F'|' '{print $2" "$3" "$4}')
  fi

  count=$(printf '%s\n' "$candidates" | grep -c .)
  [ "$count" -gt 0 ] || return 1
  index=$((attempt % count))
  printf '%s\n' "$candidates" | sed -n "$((index + 1))p"
}

# Registers a fresh key with the server and writes $PIA_CONF.
register_key() {
  local ip=$1 cn=$2 token=$3 priv pub response
  priv=$(wg genkey)
  pub=$(printf '%s' "$priv" | wg pubkey)
  response=$(curl -sS --max-time 20 -G \
    --connect-to "$cn::$ip:" \
    --cacert "$CA" \
    --data-urlencode "pt=$token" \
    --data-urlencode "pubkey=$pub" \
    "https://$cn:1337/addKey" 2>/dev/null) || return 1
  [ "$(printf '%s' "$response" | jq -r '.status // empty')" = "OK" ] || return 1

  (
    umask 077
    cat >"$PIA_CONF" <<EOF
[Interface]
PrivateKey = $priv
Address = $(printf '%s' "$response" | jq -r '.peer_ip')
Table = off
MTU = 1420

[Peer]
PublicKey = $(printf '%s' "$response" | jq -r '.server_key')
AllowedIPs = 0.0.0.0/0
Endpoint = $ip:$(printf '%s' "$response" | jq -r '.server_port')
PersistentKeepalive = 25
EOF
  )
}

# --- Connect and monitor -----------------------------------------------------

connect_pia() {
  local token entry cn rc

  write_status connecting "Logging in to PIA"
  token=$(pia_login)
  rc=$?
  if [ "$rc" -eq 2 ]; then
    write_status error "No PIA login is saved. Run the Set PIA Login action."
    return 1
  elif [ "$rc" -ne 0 ]; then
    write_status error "PIA login failed. Check the username and password, or that PIA is reachable."
    return 1
  fi

  write_status connecting "Choosing a PIA server"
  entry=$(pick_server) || {
    write_status error "Could not load PIA's server list"
    return 1
  }
  server_ip=${entry%% *}
  entry=${entry#* }
  cn=${entry%% *}
  region_name=${entry#* }

  write_status connecting "Registering a key with $region_name"
  register_key "$server_ip" "$cn" "$token" || {
    write_status error "PIA did not accept the key from $region_name"
    return 1
  }

  wg-quick down "$PIA_CONF" >/dev/null 2>&1 || true
  if ! wg-quick up "$PIA_CONF" >/dev/null 2>&1; then
    write_status error "Could not bring up the PIA tunnel"
    return 1
  fi
  ip route replace default dev pia table "$TABLE"

  # Wait for the first handshake.
  local waited=0
  while [ "$waited" -lt 30 ]; do
    local last
    last=$(wg show pia latest-handshakes | awk '{print $2}' | head -1)
    if [ -n "${last:-}" ] && [ "$last" -gt 0 ]; then
      connected_at=$(date +%s)
      renew_at=$((connected_at + RENEW_SECONDS))
      write_status connected "Connected to $region_name"
      log "connected to $region_name ($server_ip)"
      return 0
    fi
    sleep_interruptible 1
    waited=$((waited + 1))
  done
  write_status error "No handshake from $region_name"
  return 1
}

monitor_pia() {
  # Returns when the tunnel needs to be rebuilt.
  while [ "$stopping" -eq 0 ]; do
    sleep_interruptible "$POLL_SECONDS"
    local now last
    now=$(date +%s)
    if [ "$now" -ge "$renew_at" ]; then
      log "renewing PIA registration"
      return 0
    fi
    if ! wg show pia >/dev/null 2>&1; then
      log "pia interface disappeared"
      return 1
    fi
    last=$(wg show pia latest-handshakes | awk '{print $2}' | head -1)
    if [ "$((now - connected_at))" -gt "$GRACE_SECONDS" ] &&
      { [ -z "${last:-}" ] || [ "$((now - last))" -gt "$STALE_SECONDS" ]; }; then
      log "no handshake for ${STALE_SECONDS}s"
      return 1
    fi
  done
  return 0
}

# --- Main --------------------------------------------------------------------

trap cleanup INT TERM

write_status starting "Starting"
setup_firewall

if ! wg-quick up "$SERVER_CONF"; then
  write_status error "Could not bring up the relay server (wg0)"
  exit 1
fi

while [ "$stopping" -eq 0 ]; do
  if connect_pia; then
    attempt=0
    # A renewal returns 0 and does not count as a failure; a stale tunnel
    # returns 1 and moves on to the next server.
    if monitor_pia; then
      :
    else
      attempt=$((attempt + 1))
    fi
    teardown_pia
  else
    teardown_pia
    attempt=$((attempt + 1))
    backoff=$((attempt * 5))
    [ "$backoff" -gt 60 ] && backoff=60
    sleep_interruptible "$backoff"
  fi
done
