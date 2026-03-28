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

# Append external-ip=PUBLIC/LOCAL so coturn binds relay sockets to the host's
# default-route interface and advertises the public IP to TURN clients.
if [ -n "$TURN_EXTERNAL_IP" ]; then
  LOCAL_IP=$(ip route get 1 2>/dev/null | grep -oE 'src [0-9.]+' | awk '{print $2}')
  if [ -n "$LOCAL_IP" ]; then
    echo "external-ip=${TURN_EXTERNAL_IP}/${LOCAL_IP}" >> "$CONFIG_PATH"
  else
    echo "external-ip=${TURN_EXTERNAL_IP}" >> "$CONFIG_PATH"
  fi
fi

exec turnserver -c "$CONFIG_PATH" -n
