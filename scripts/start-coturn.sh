#!/bin/sh

set -eu

TEMPLATE_PATH="${TURN_TEMPLATE_PATH:-/etc/coturn/turnserver.conf.template}"
CONFIG_PATH="${TURN_CONFIG_PATH:-/tmp/turnserver.conf}"
TURN_EXTERNAL_IP="${TURN_EXTERNAL_IP-}"

# When running inside Docker, coturn must know both the public and private IPs.
# Format: external-ip=PUBLIC/PRIVATE — binds relay sockets to PRIVATE, advertises PUBLIC.
if [ -n "$TURN_EXTERNAL_IP" ]; then
  CONTAINER_IP=$(hostname -i | awk '{print $1}')
  TURN_EXTERNAL_IP="${TURN_EXTERNAL_IP}/${CONTAINER_IP}"
fi

: "${TURN_SECRET:?TURN_SECRET is required}"
: "${TURN_REALM:?TURN_REALM is required}"
: "${TURN_MIN_PORT:=56000}"
: "${TURN_MAX_PORT:=56100}"

export TURN_SECRET TURN_REALM TURN_EXTERNAL_IP TURN_MIN_PORT TURN_MAX_PORT

while IFS= read -r line || [ -n "$line" ]; do
  eval "printf '%s\\n' \"$line\""
done < "$TEMPLATE_PATH" > "$CONFIG_PATH"

exec turnserver -c "$CONFIG_PATH" -n
