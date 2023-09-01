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

Include the line INIT_MODE=demo in .env or uncomment it if .env.example copied to intiate the database with the DEMO dataset, it will create an empty openIMIS database otherwise

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

To run on a Dockerized instance (database, backend, and frontend of openIMIS), please follow the steps below:
  * Add a value for the OPENSEARCH_BASIC_TOKEN in the environment (env) file. This should be based on the admin and password credentials for openSearch.
  * In the .env file in openimis-fe_js, use the following environment variable: `ENV OPENSEARCH_PROXY_ROOT="opensearch"`.
  * Run the backend and frontend services.

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
