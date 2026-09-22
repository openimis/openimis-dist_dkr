#!/bin/bash
# Cluster CA, node certificate and admin client certificate for the security
# plugin. Runs once: a complete set is left alone, a partial one is redone.
set -euo pipefail
OUT=/out
if [ -s "$OUT/ca/ca.pem" ] && [ -s "$OUT/node/node.pem" ] && [ -s "$OUT/admin/admin.pem" ]; then
    echo "opensearch certificates present"; exit 0
fi
DAYS=3650
T="$OUT/.new"; rm -rf "$T"; mkdir -p "$T/ca" "$T/node" "$T/admin" "$T/private"
umask 077
# Subject order matters: the plugin compares RFC 2253 strings, which print
# the components reversed, so /O=.../CN=... yields "CN=...,O=..." - the form
# opensearch.yml's admin_dn uses.
openssl req -x509 -newkey rsa:2048 -nodes -days $DAYS -subj "/O=openIMIS/CN=openIMIS OpenSearch CA" \
    -keyout "$T/private/ca-key.pem" -out "$T/ca/ca.pem"
openssl req -newkey rsa:2048 -nodes -subj "/O=openIMIS/CN=opensearch" \
    -keyout "$T/node/node-key.pem" -out "$T/node.csr"
openssl x509 -req -in "$T/node.csr" -CA "$T/ca/ca.pem" -CAkey "$T/private/ca-key.pem" -CAcreateserial \
    -days $DAYS -out "$T/node/node.pem" \
    -extfile <(printf 'subjectAltName=DNS:opensearch,DNS:localhost,IP:127.0.0.1\nextendedKeyUsage=serverAuth,clientAuth\nbasicConstraints=CA:FALSE\n')
openssl req -newkey rsa:2048 -nodes -subj "/O=openIMIS/CN=openimis-admin" \
    -keyout "$T/admin/admin-key.pem" -out "$T/admin.csr"
openssl x509 -req -in "$T/admin.csr" -CA "$T/ca/ca.pem" -CAkey "$T/private/ca-key.pem" -CAcreateserial \
    -days $DAYS -out "$T/admin/admin.pem" \
    -extfile <(printf 'extendedKeyUsage=clientAuth\nbasicConstraints=CA:FALSE\n')
rm -f "$T"/*.csr "$T/ca/"*.srl
chmod 644 "$T/ca/ca.pem" "$T/node/node.pem" "$T/admin/admin.pem"
chmod 600 "$T/node/node-key.pem" "$T/admin/admin-key.pem" "$T/private/ca-key.pem"
# The node and Dashboards run as uid 1000 and must read their key.
chown -R 1000:1000 "$T/ca" "$T/node" "$T/admin"
# Move files, never directories: a consumer's bind mount created before this
# ran points at the directory inode, and replacing it would leave that
# container looking at an empty, deleted directory.
for d in ca node admin private; do
    mkdir -p "$OUT/$d"; rm -f "$OUT/$d"/*; mv "$T/$d"/* "$OUT/$d"/
done
rm -rf "$T"
# Set the destination modes explicitly rather than inheriting the umask above:
# it applies to mkdir too, and a 0700 root-owned directory is one the node
# cannot even traverse, however readable the certificate inside it is.
chmod 755 "$OUT/ca" "$OUT/node" "$OUT/admin"
chown 1000:1000 "$OUT/ca" "$OUT/node" "$OUT/admin"
# The CA key issues new certificates and no service reads it. Root only.
chmod 700 "$OUT/private"
echo "opensearch certificates written to $OUT"
