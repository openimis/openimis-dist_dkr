#!/bin/bash
# Dashboards start wrapper. With the security plugin on, renders the config
# from the template (the cookie password cannot be passed as an environment
# variable), then runs the image's own entrypoint.
set -euo pipefail
H=/usr/share/opensearch-dashboards
if [ "${DISABLE_SECURITY_DASHBOARDS_PLUGIN:-true}" = "false" ]; then
    cookie=${OPENSEARCH_DASHBOARDS_COOKIE_PASSWORD:-}
    [ "${#cookie}" -ge 32 ] \
        || { echo "OPENSEARCH_DASHBOARDS_COOKIE_PASSWORD must be set to 32+ characters in .env.openSearch" >&2; exit 1; }
    template=$(cat /conf/opensearch_dashboards.yml.template)
    printf '%s\n' "${template//__COOKIE_PASSWORD__/$cookie}" > "$H/config/opensearch_dashboards.yml"
    echo "dashboards security configuration rendered (proxy auth)"
fi
exec "$H/opensearch-dashboards-docker-entrypoint.sh" opensearch-dashboards
