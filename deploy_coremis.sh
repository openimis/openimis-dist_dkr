#!/bin/bash
#rename .env
cp .env.example .env
cp .env.lightning.example .env.lightning
cp .env.openSearch.example .env.openSearch

docker compose -f docker-compose.coremis.yml up -d db
set -a # automatically export all variables
source .env
source .env.lightning
set +a
docker compose -f docker-compose.coremis.yml run -e  PGPASSWORD=${POSTGRES_PASSWORD} --rm db createdb -h db -U ${POSTGRES_USER}  ${POSTGRES_DB}
docker compose -f docker-compose.coremis.yml run --rm  web mix ecto.migrate
docker compose -f docker-compose.coremis.yml run --rm web mix run imisSetupScripts/imisSetup.exs
docker compose -f docker-compose.coremis.yml up -d


