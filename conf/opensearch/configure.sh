#!/bin/bash
# Applies the cluster's security configuration, on every start.
#
# Renders internal_users.yml from the passwords in .env.openSearch and the
# security files from conf/, then uploads them with securityadmin. Runs as a
# one-shot beside the node rather than inside it, so that changing a password or
# a role mapping converges on the next "docker compose up" instead of needing an
# operator to remember a reload.
#
# Uploading is idempotent and authenticates with the admin certificate, so it
# works before the cluster has any users and after the passwords have changed.
set -euo pipefail
OS=/usr/share/opensearch
SEC="$OS/config/opensearch-security"

if [ "${OPENSEARCH_SECURITY_DISABLED:-true}" != "false" ]; then
    echo "security plugin disabled; nothing to configure"
    exit 0
fi

for v in OPENSEARCH_SUPERUSER_PASSWORD OPENSEARCH_PASSWORD OPENSEARCH_DASHBOARDS_PASSWORD OPENSEARCH_DASHBOARDS_IP; do
    [ -n "${!v:-}" ] || { echo "$v is empty: the security plugin needs it set in .env.openSearch" >&2; exit 1; }
done

# hash.sh prints its usage on STDOUT when it fails, so an unchecked read writes
# a usage fragment as the hash: a file that parses and locks everyone out.
bcrypt() {
    local h
    h=$("$OS/plugins/opensearch-security/tools/hash.sh" -p "$1" 2>/dev/null | tail -n1) \
        || { echo "hash.sh exited non-zero - the JVM may have run out of memory" >&2; return 1; }
    case "$h" in
        '$2'[aby]'$'*) printf '%s' "$h" ;;
        *) echo "hash.sh did not return a bcrypt hash" >&2; return 1 ;;
    esac
}
# Hashed before the document below: a failure inside a command substitution only
# ends that subshell, so the file would still be written, with an empty hash.
h_admin=$(bcrypt "$OPENSEARCH_SUPERUSER_PASSWORD") || exit 1
h_indexer=$(bcrypt "$OPENSEARCH_PASSWORD") || exit 1
h_dashboards=$(bcrypt "$OPENSEARCH_DASHBOARDS_PASSWORD") || exit 1

# Roles are granted on the user record, never by name in roles_mapping.yml: a
# mapping by user name also matches a proxy-authenticated user of that name,
# and the proxy's user name is whatever openIMIS login reached the gate.
cat > "$SEC/internal_users.yml" <<EOF
---
_meta:
  type: "internalusers"
  config_version: 2
admin:
  hash: "$h_admin"
  reserved: true
  opendistro_security_roles: ["all_access"]
  description: "Cluster superuser: operators and manual administration"
openimis_indexer:
  hash: "$h_indexer"
  reserved: true
  opendistro_security_roles: ["all_access"]
  description: "openIMIS backend and worker: index creation and document indexing"
dashboards_server:
  hash: "$h_dashboards"
  reserved: true
  opendistro_security_roles: ["kibana_server"]
  description: "OpenSearch Dashboards server user"
EOF

# The pin is a regex, so the dots are escaped to mean dots. Substituted with
# bash rather than sed: sed strips backslashes from its replacement text, which
# would silently turn the escaped form back into "any character".
ip_re=${OPENSEARCH_DASHBOARDS_IP//./\\.}
template=$(cat /conf/security/config.yml)
printf '%s\n' "${template//__DASHBOARDS_IP_REGEX__/$ip_re}" > "$SEC/config.yml"
cp /conf/security/roles.yml "$SEC/roles.yml"
cp /conf/security/roles_mapping.yml "$SEC/roles_mapping.yml"
cp /conf/security/tenants.yml "$SEC/tenants.yml"

# Port 9200: this tool speaks the REST API, not the transport protocol, despite
# the transport port being its historical default. The node answers "not
# initialized" until the upload lands, so the first attempts are expected to
# fail while it finishes starting. Output is kept until it matters.
for attempt in $(seq 1 30); do
    if out=$("$OS/plugins/opensearch-security/tools/securityadmin.sh" \
        -cd "$SEC" -icl -nhnv -h "${OPENSEARCH_NODE:-opensearch}" -p 9200 \
        -cacert "$OS/config/certs/ca/ca.pem" \
        -cert "$OS/config/certs/admin/admin.pem" \
        -key "$OS/config/certs/admin/admin-key.pem" 2>&1); then
        echo "security configuration applied; proxy identity trusted from $OPENSEARCH_DASHBOARDS_IP"
        exit 0
    fi
    sleep 5
done
echo "securityadmin did not succeed after 30 attempts:" >&2
printf '%s\n' "$out" | grep -viE "^\s+at |^\s*$" | tail -15 >&2
exit 1
