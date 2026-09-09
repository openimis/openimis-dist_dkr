#!/bin/sh
# Bootstrap GlitchTip (superuser, org, team, projects, DSN files).
#
# Runs inside the GlitchTip image itself, so it reaches the ORM directly rather
# than shelling back into a running container over the docker socket.
# Idempotent: safe to re-run; it will not create duplicate projects.
#
# Set FORCE_GLITCHTIP_INIT=1 to ignore the lock (still idempotent).
set -e

OUT_DIR="${GLITCHTIP_OUT_DIR:-/out}"
LOCK_FILE="${OUT_DIR}/.setup.lock"

if [ -f "$LOCK_FILE" ] && [ "${FORCE_GLITCHTIP_INIT:-0}" != "1" ]; then
  echo "=== GlitchTip init lock present — refreshing DSN files only ==="
else
  echo "=== GlitchTip bootstrap (superuser, org, team, projects, DSN files) ==="
fi

# The bootstrap is idempotent, so run it either way: a changed public host has
# to be reflected in the DSN files even when the lock is already in place.
./manage.py shell < "${OUT_DIR}/bootstrap.py"

touch "$LOCK_FILE"

echo "=== GlitchTip initialization completed successfully! ==="
echo "    DSNs written to conf/glitchtip/ — copy into .env:"
sed 's/^/      /' "${OUT_DIR}/dsn.env" 2>/dev/null || true
