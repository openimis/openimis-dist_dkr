#!/bin/bash
# Compose healthcheck. Plain http with the plugin off; TLS against our CA
# with the superuser's credential when it is on.
if [ "${OPENSEARCH_SECURITY_DISABLED:-true}" = "false" ]; then
    # start.sh already refuses to start the node without this. Checked again so
    # that an empty one fails as the configuration error it is, rather than
    # looking like a rejected password.
    [ -n "${OPENSEARCH_SUPERUSER_PASSWORD:-}" ] || exit 1
    exec curl -sf --cacert /usr/share/opensearch/config/certs/ca/ca.pem \
        -u "admin:${OPENSEARCH_SUPERUSER_PASSWORD}" https://localhost:9200/_cluster/health
fi
exec curl -sf http://localhost:9200/_cluster/health
