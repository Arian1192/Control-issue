#!/bin/sh

set -eu

TEMPLATE_PATH="${TURN_TEMPLATE_PATH:-/etc/coturn/turnserver.conf.template}"
CONFIG_PATH="${TURN_CONFIG_PATH:-/tmp/turnserver.conf}"
TURN_EXTERNAL_IP="${TURN_EXTERNAL_IP-}"

: "${TURN_SECRET:?TURN_SECRET is required}"
: "${TURN_REALM:?TURN_REALM is required}"
: "${TURN_MIN_PORT:=56000}"
: "${TURN_MAX_PORT:=56100}"

# In Docker, external-ip must be PUBLIC/PRIVATE so coturn binds relay sockets
# to the container IP but advertises the public IP to TURN clients.
if [ -n "$TURN_EXTERNAL_IP" ]; then
  CONTAINER_IP=$(hostname -i | awk '{print $1}')
  TURN_EXTERNAL_IP="${TURN_EXTERNAL_IP}/${CONTAINER_IP}"
fi

export TURN_SECRET TURN_REALM TURN_EXTERNAL_IP TURN_MIN_PORT TURN_MAX_PORT

while IFS= read -r line || [ -n "$line" ]; do
  eval "printf '%s\\n' \"$line\""
done < "$TEMPLATE_PATH" > "$CONFIG_PATH"

exec turnserver -c "$CONFIG_PATH" -n
