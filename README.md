# openIMIS dockerized

 This repository provides a dockerized openIMIS (all components) as a quick setup for development, testing or demoing.
 

 Please look for further instructions on the openIMIS Wiki: https://openimis.atlassian.net/wiki/spaces/OP/pages/963182705/MO1.1+Install+the+modular+openIMIS+using+Docker

 
 The docker-compose currently contains the openIMIS database, backend + worker, frontend, restapi and gateway components.
 

In case of troubles, please consult/contact our service desk via our [ticketing site](https://openimis.atlassian.net/servicedesk/customer).

#Prerequisit
- Docker installed


# First startup

* create a `.env` file, use .env.example as starting point

## configure the restapi
 the rest api config files appsettings.json, appsettings.Production.json, appsetting.Developments.json must be created in the folder ./conf/restapi
 create the log folder ./logs¨

 to remove the restapi one will have to:
   - uncomment the volume in the fronend config
   - replace openimis.conf with openimis.conf.without_restapi

## configure the gateway (optionnal)
  
   - uncomment the volume in the fronend config
   - make modification in openimis.conf


## init database

by default the database is initialised with demo data without any action

## OpenFN/Lightning setup 
Lightning is not by default enabled in dockerized instance. To make it work it's required to: 
  * Copy `.env.lightning.example` to `.env.lightning` and make adjustments 
  * Create `lightning_dev` database in db container 
  * Run container build `docker compose -f docker-compose.yml -f docker-compose.lightning.yml build lightning`
  * Run migrations `docker compose -f docker-compose.yml -f docker-compose.lightning.yml run --rm lightning mix ecto.migrate`
  * Run imis demo setup `docker compose -f docker-compose.yml -f docker-compose.lightning.yml run --rm lightning ./imisSetup.sh`
  * Run service `docker compose -f docker-compose.yml -f docker-compose.lightning.yml up lightning`

## OpenSearch/OpenSearch Dashboards setup 
Both OpenSearch and OpenSearch Dashboards are not by default enabled in dockerized instance. To make them work it's required to: 
  * Copy `.env.openSearch.example` to `.env.openSearch` and make adjustments
  * Run container build `docker compose -f docker-compose.yml -f docker-compose.openSearch.yml build opensearch opensearch-dashboards nginx`
  * Run service `docker compose -f docker-compose.yml -f docker-compose.openSearch.yml up opensearch opensearch-dashboards nginx`
This build provides also additional nginx proxy server in order to handle openSearch Dashboard application on frontend level. 

How to run on dockerized instance (db, backend, frontend of openIMIS):
   * add to env file value for `OPENSEARCH_BASIC_TOKEN` (based on admin and password credentials to openSearch)
   * use in env variables file in openimis-dist_dkr such env variables `DOCKERFILE_NAME=Dockerfile-nginx-`, `NGINX_CONF_VOLUME=nginx.conf.template` 
     to switch into dockerized context
   * Use the following environment variables in the .env file in openimis-fe_js:
   - `ENV OPENSEARCH_PROXY_ROOT="opensearch"`
   - `ENV OPENSEARCH_PROXY_HOST="172.20.20.98"`
   - `ENV PROXY_HOST="172.20.20.13"`
   * run backend and frontend services.

How to run on local development mode (only for development purposes): 
   * Add the following value to the environment file in openimis-dist_dkr `OPENSEARCH_BASIC_TOKEN` (based on admin and password credentials to OpenSearch).
   * Use the following environment variables in the file in openimis-dist_dkr:
      - `DOCKERFILE_NAME=Dockerfile-nginx-dev-`
      - `NGINX_CONF_VOLUME=nginx-dev.conf.template`
      These variables are used to switch into the local context.
   * Add the following section to the `docker-compose.openSearch.yml` file:
      ```yaml
      extra_hosts:
      - ${FRONTEND_HOST:-host.docker.internal:host-gateway}
     ```
     This ensures proper communication between the dockerized openSearch Dashboard and frontend of the openIMIS app.
   * Use the following environment variables in the .env file in openimis-fe_js:
     - `ENV OPENSEARCH_PROXY_ROOT=""`
     - `ENV PROXY_HOST="172.20.20.98"`
   * Run the backend and frontend of the openIMIS app locally without using Docker (the openIMIS database can be Dockerized).
   * Please note that this setup is for development purposes only. DO NOT use this context in a production environment.

# stop /start

To stop all docker containers: `docker-compose  stop`
To (re-)start all docker containers: `docker-compose  start` 

# pull new images

To pull new images or images update `docker-compose pull` 


# create lets encrypt certs

use the certbot docker compose file

export NEW_OPENIMIS_HOST first


## dry run 
docker-compose run --rm --entrypoint "  certbot certonly --webroot -w /var/www/certbot  --staging  --register-unsafely-without-email  -d  ${NEW_OPENIMIS_HOST}    --rsa-key-size 2048     --agree-tos     --force-renewal" certbot

## actual setup

docker-compose run --rm --entrypoint "  certbot certonly --webroot -w /var/www/certbot    --register-unsafely-without-email  -d  ${NEW_OPENIMIS_HOST}    --rsa-key-size 2048     --agree-tos     --force-renewal" certbot