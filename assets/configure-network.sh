#!/bin/sh
set -eu

sysctl -w net.ipv4.ip_forward=1 >/dev/null
# Replies from PIA arrive on `pia` while the container's default route is eth0,
# so strict reverse-path filtering would drop them.
sysctl -w net.ipv4.conf.all.rp_filter=0 >/dev/null
sysctl -w net.ipv4.conf.default.rp_filter=0 >/dev/null
# The relay is IPv4 only. IPv6 is switched off so nothing can slip past the
# IPv4 kill switch.
sysctl -w net.ipv6.conf.all.disable_ipv6=1 >/dev/null
sysctl -w net.ipv6.conf.default.disable_ipv6=1 >/dev/null
