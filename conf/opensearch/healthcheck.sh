#!/bin/bash
# Compose healthcheck. Deliberately anonymous: with the plugin on, a refusal is
# the proof that TLS is up and the plugin is enforcing, and it needs no
# credential - so a password change can never make a working cluster look
# broken. Unhealthy here means the configuration has not been applied yet.
set -u
if [ "${OPENSEARCH_SECURITY_DISABLED:-true}" = "false" ]; then
    code=$(curl -s -o /dev/null -w '%{http_code}' \
        --cacert /usr/share/opensearch/config/certs/ca/ca.pem \
        https://localhost:9200/_cluster/health || true)
    [ "$code" = "401" ]
    exit $?
fi
exec curl -sf http://localhost:9200/_cluster/health
