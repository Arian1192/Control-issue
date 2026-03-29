#!/bin/sh

set -eu

TEMPLATE_PATH="${TURN_TEMPLATE_PATH:-/etc/coturn/turnserver.conf.template}"
CONFIG_PATH="${TURN_CONFIG_PATH:-/tmp/turnserver.conf}"
TURN_EXTERNAL_IP="${TURN_EXTERNAL_IP-}"

: "${TURN_SECRET:?TURN_SECRET is required}"
: "${TURN_REALM:?TURN_REALM is required}"
: "${TURN_MIN_PORT:=56000}"
: "${TURN_MAX_PORT:=56100}"

export TURN_SECRET TURN_REALM TURN_EXTERNAL_IP TURN_MIN_PORT TURN_MAX_PORT

while IFS= read -r line || [ -n "$line" ]; do
  eval "printf '%s\\n' \"$line\""
done < "$TEMPLATE_PATH" > "$CONFIG_PATH"

# Append relay-ip=LOCAL and external-ip=PUBLIC.
# In this deployment there is a single public relay IP with router/NAT forwarding
# to the host, so Coturn should bind relay sockets to the host-route local IP
# but advertise only the public IP back to browsers.
if [ -n "$TURN_EXTERNAL_IP" ]; then
  LOCAL_IP=$(ip route get 8.8.8.8 2>/dev/null | grep -oE 'src [0-9.]+' | awk '{print $2}')
  if [ -n "$LOCAL_IP" ]; then
    echo "relay-ip=${LOCAL_IP}" >> "$CONFIG_PATH"
  fi
  echo "external-ip=${TURN_EXTERNAL_IP}" >> "$CONFIG_PATH"
fi

exec turnserver -c "$CONFIG_PATH" -n
