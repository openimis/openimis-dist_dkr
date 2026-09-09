#!/usr/bin/env bash
# Dump PostgreSQL 13 (openimis-pgsql:26.04) and restore into PostgreSQL 18.
set -euo pipefail

log() { echo "[migrate_pg_13_18] $*"; }
die() { log "ERROR: $*"; exit 1; }

: "${DB_NAME:?DB_NAME is required}"
: "${DB_USER:?DB_USER is required}"
: "${DB_PASSWORD:?DB_PASSWORD is required}"

SRC_HOST="${PG13_HOST:-db_pg13}"
DST_HOST="${PG18_HOST:-db_pg18}"
DUMP_PATH="${DUMP_PATH:-/dump/imis.dump}"
TOC_PATH="${DUMP_PATH}.toc"
export PGPASSWORD="${DB_PASSWORD}"

psql_src() { psql -h "$SRC_HOST" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"; }
psql_dst() { psql -h "$DST_HOST" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"; }
psql_dst_postgres() { psql -h "$DST_HOST" -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 "$@"; }

require_pg18_client() {
  command -v pg_dump >/dev/null 2>&1 || die "pg_dump not found in this image"
  local v
  v="$(pg_dump --version | awk '{print $3}')"
  case "$v" in
    18.*) log "using PostgreSQL client ${v}" ;;
    *) die "need a PostgreSQL 18 client to restore into 18 (got ${v})" ;;
  esac
}

wait_ready() {
  local host="$1"
  local i=0
  log "waiting for $host"
  until pg_isready -h "$host" -U "$DB_USER" -d postgres >/dev/null 2>&1; do
    i=$((i + 1))
    [ "$i" -le 90 ] || die "timeout waiting for $host"
    sleep 2
  done
}

require_pg18_client
wait_ready "$SRC_HOST"
wait_ready "$DST_HOST"

SRC_VER="$(psql_src -tAc 'SHOW server_version')"
DST_VER="$(psql -h "$DST_HOST" -U "$DB_USER" -d postgres -tAc 'SHOW server_version')"
log "source ${SRC_HOST} is PostgreSQL ${SRC_VER}"
log "target ${DST_HOST} is PostgreSQL ${DST_VER}"
[[ "$SRC_VER" == 13.* ]] || die "source is not PostgreSQL 13 (got ${SRC_VER})"
[[ "$DST_VER" == 18.* ]] || die "target is not PostgreSQL 18 (got ${DST_VER})"

mkdir -p "$(dirname "$DUMP_PATH")"
log "dumping ${DB_NAME} from ${SRC_HOST}"
pg_dump \
  -h "$SRC_HOST" -U "$DB_USER" -d "$DB_NAME" \
  -Fc --no-owner --no-acl --quote-all-identifiers \
  -f "$DUMP_PATH"

IFS='|' read -r ENCODING COLLATE CTYPE <<<"$(
  psql_src -tAc "SELECT pg_encoding_to_char(encoding) || '|' || datcollate || '|' || datctype
                 FROM pg_database WHERE datname = current_database();"
)"
log "source database encoding=${ENCODING} collate=${COLLATE} ctype=${CTYPE}"

log "recreating ${DB_NAME} on ${DST_HOST}"
psql_dst_postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" >/dev/null
dropdb -h "$DST_HOST" -U "$DB_USER" --if-exists --force "$DB_NAME"
if ! createdb -h "$DST_HOST" -U "$DB_USER" -O "$DB_USER" -E "$ENCODING" \
      --lc-collate="$COLLATE" --lc-ctype="$CTYPE" -T template0 "$DB_NAME"; then
  log "locale ${COLLATE}/${CTYPE} not available on pg18, using template0 defaults"
  createdb -h "$DST_HOST" -U "$DB_USER" -O "$DB_USER" -E "$ENCODING" -T template0 "$DB_NAME"
fi

# openimis-pgsql packages postgres-json-schema; a stock postgres image does not.
# When it is packaged, replay the dump's CREATE EXTENSION as-is; otherwise fall
# back to loading the PL/pgSQL functions into public and skipping that entry.
RESTORE_ARGS=()
if [ -n "$(psql_dst -tAc "SELECT 1 FROM pg_available_extensions WHERE name = 'postgres-json-schema'")" ]; then
  log "postgres-json-schema is packaged on ${DST_HOST}; restoring the extension from the dump"
else
  log "postgres-json-schema not packaged; installing its functions into public"
  command -v curl >/dev/null 2>&1 || die "postgres-json-schema is neither packaged on ${DST_HOST} nor installable here (no curl)"
  curl -fsSL --proto '=https' --tlsv1.2 \
    https://raw.githubusercontent.com/gavinwahl/postgres-json-schema/master/postgres-json-schema--0.1.1.sql \
    | sed 's/@extschema@/public/g' \
    | psql_dst -f -
  pg_restore -l "$DUMP_PATH" | grep -vE 'postgres-json-schema' > "$TOC_PATH"
  RESTORE_ARGS=(-L "$TOC_PATH")
fi

log "restoring dump into ${DST_HOST}"
pg_restore \
  -h "$DST_HOST" -U "$DB_USER" -d "$DB_NAME" \
  --no-owner --no-acl --exit-on-error \
  "${RESTORE_ARGS[@]+"${RESTORE_ARGS[@]}"}" \
  "$DUMP_PATH"

SRC_TABLES="$(psql_src -tAc "SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema');")"
DST_TABLES="$(psql_dst -tAc "SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema');")"
log "tables (non-catalog): source=${SRC_TABLES} target=${DST_TABLES}"
[ "$SRC_TABLES" = "$DST_TABLES" ] || die "table count mismatch after restore"

psql_dst -c "ANALYZE;"
log "migration completed successfully"
log "the data is in the live \`database_pg18\` volume — start the stack with 'docker compose up -d'"
