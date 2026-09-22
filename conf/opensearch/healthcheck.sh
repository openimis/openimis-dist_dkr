#!/bin/bash
# Compose healthcheck. Plain http with the plugin off; TLS against our CA
# with the superuser's credential when it is on.
if [ "${OPENSEARCH_SECURITY_DISABLED:-true}" = "false" ]; then
    exec curl -sf --cacert /usr/share/opensearch/config/certs/ca/ca.pem \
        -u "admin:${OPENSEARCH_SUPERUSER_PASSWORD}" https://localhost:9200/_cluster/health
fi
exec curl -sf http://localhost:9200/_cluster/health
