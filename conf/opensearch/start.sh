#!/bin/bash
# Node start wrapper. With the plugin on, renders internal_users.yml from the
# passwords in .env.openSearch and the security config from conf/, then runs
# the image's own entrypoint. With it off, runs the entrypoint unchanged.
set -euo pipefail
OS=/usr/share/opensearch
SEC="$OS/config/opensearch-security"
if [ "${OPENSEARCH_SECURITY_DISABLED:-true}" = "false" ]; then
    for v in OPENSEARCH_SUPERUSER_PASSWORD OPENSEARCH_PASSWORD OPENSEARCH_DASHBOARDS_PASSWORD OPENSEARCH_DASHBOARDS_IP; do
        [ -n "${!v:-}" ] || { echo "$v is empty: the security plugin needs it set in .env.openSearch" >&2; exit 1; }
    done
    # hash.sh prints its usage on STDOUT when it fails, so an unchecked tail
    # writes a usage fragment as the hash: a file that parses and locks
    # everyone out.
    bcrypt() {
        local h
        h=$("$OS/plugins/opensearch-security/tools/hash.sh" -p "$1" 2>/dev/null | tail -n1) || return 1
        case "$h" in
            '$2'[aby]'$'*) printf '%s' "$h" ;;
            *) echo "hash.sh did not return a bcrypt hash - check the container's memory limit" >&2; return 1 ;;
        esac
    }
    # Hashed here rather than inside the heredoc below: a failure inside a
    # command substitution only ends that subshell, so the document would still
    # be written, with an empty hash, and the node would start unusable.
    h_admin=$(bcrypt "$OPENSEARCH_SUPERUSER_PASSWORD") || exit 1
    h_indexer=$(bcrypt "$OPENSEARCH_PASSWORD") || exit 1
    h_dashboards=$(bcrypt "$OPENSEARCH_DASHBOARDS_PASSWORD") || exit 1
    cat > "$SEC/internal_users.yml" <<EOF
---
_meta:
  type: "internalusers"
  config_version: 2
admin:
  hash: "$h_admin"
  reserved: true
  description: "Cluster superuser: operators and the healthcheck"
openimis_indexer:
  hash: "$h_indexer"
  reserved: true
  description: "openIMIS backend and worker: index creation and document indexing"
dashboards_server:
  hash: "$h_dashboards"
  reserved: true
  description: "OpenSearch Dashboards server user"
EOF
    # The pin is a regex, so the dots are escaped to mean dots. Substituted with
    # bash rather than sed: sed strips backslashes from its replacement text,
    # which would silently turn the escaped form back into "any character".
    ip_re=${OPENSEARCH_DASHBOARDS_IP//./\\.}
    template=$(cat /conf/security/config.yml)
    printf '%s\n' "${template//__DASHBOARDS_IP_REGEX__/$ip_re}" > "$SEC/config.yml"
    cp /conf/security/roles_mapping.yml "$SEC/roles_mapping.yml"
    echo "security configuration rendered; proxy identity trusted from $OPENSEARCH_DASHBOARDS_IP"
fi
exec "$OS/opensearch-docker-entrypoint.sh" opensearch
