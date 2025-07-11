#!/bin/sh
set -e

REPO_DIR="/openimis-be/openimis-be-opensearch_reports_py"

if [ ! -d "$REPO_DIR" ]; then
  echo "Cloning OpenIMIS OpenSearch dashboards config..."
  git clone --depth 1 --branch develop https://github.com/openimis/openimis-be-opensearch_reports_py.git "$REPO_DIR"
else
  echo "OpenSearch reports repo already exists, skipping clone."
fi

echo "Running dashboard configuration upload..."

cd /openimis-be/openIMIS

exec python3 manage.py upload_opensearch_dashboards --host-domain http://backend:8080 --imis-password "${OPENIMIS_ADMIN_PASS}"
