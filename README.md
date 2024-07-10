# openIMIS dockerized

 This repository provides a Docker package for openIMIS that includes all components to quickly setup, test and demo the solution.
 

 Please look for further instructions on the openIMIS Wiki: https://openimis.atlassian.net/wiki/spaces/OP/pages/963182705/MO1.1+Install+the+modular+openIMIS+using+Docker

 
 The openIMIS docker compose currently includes the database, backend and worker, frontend, and third parties components (Lightning, OpenSearch, RabbitMQ, etc.).
 

In case of troubles, please contact our service desk via our [ticketing platform](https://openimis.atlassian.net/servicedesk/customer).

## Prerequisite

* Docker installed

## Fast lane

You can use the script `deploy_openimis.sh` to initialise all components (uses PostgreSQL DB).

## First startup

* Copy `.env.example` to `.env` and make the necessary adjustments.
* Choose a database default system to use. The default is PostgreSQL (`DB_DEFAULT=postgresql`, `DB_PORT=5432`), but you can also use MSSQL (`DB_DEFAULT=mssql`, `DB_PORT=1433`, `ACCEPT_EULA=Y`). 
* Uncomment the line `DEMO_DATASET=true` in `.env` to initialise the database with the DEMO dataset. If you leave it commented, an empty openIMIS database will be created.

## OpenFN/Lightning setup 

If the implementation involves managing the social protection workflow/import, then OpenFN/Lightning must be set up with the following steps:

* Copy `.env.lightning.example` to `.env.lightning` and make the necessary adjustments.
* Create the `lightning_dev` database in the database container.
* Build the container: `docker compose -f docker-compose.yml -f docker-compose.lightning.yml build lightning`.
* Run migrations: `docker compose -f docker-compose.yml -f docker-compose.lightning.yml run --rm lightning mix ecto.migrate`.
* Set up the IMIS demo: `docker compose -f docker-compose.yml -f docker-compose.lightning.yml run --rm lightning ./imisSetup.sh`.
* Start the service: `docker compose -f docker-compose.yml -f docker-compose.lightning.yml up lightning`.

## OpenSearch/OpenSearch Dashboards setup 

Both OpenSearch and OpenSearch Dashboards are not by default enabled in dockerized instance. To make them work, it's required to: 

  * Copy `.env.openSearch.example` to `.env.openSearch` and make adjustments
  * Run container build `docker compose -f docker-compose.yml -f docker-compose.openSearch.yml build opensearch opensearch-dashboards nginx`
  * Run service `docker compose -f docker-compose.yml -f docker-compose.openSearch.yml up opensearch opensearch-dashboards nginx`

This build provides also additional nginx proxy server in order to handle OpenSearch Dashboard application on frontend level. 

To run on a dockerized instance of openIMIS (database, backend, and frontend), including OpenSearch, please follow the steps below:

  * Add a value for the OPENSEARCH_BASIC_TOKEN in the environment (`.env`) file. This should be based on the admin and password credentials for OpenSearch.
  * In the `.env` file in openimis-fe_js, use the following environment variable: `ENV OPENSEARCH_PROXY_ROOT="opensearch"`.
  * Run the backend and frontend services.

## Run openIMIS with Docker

You can run the docker compose commands from within `openimis-dist_dkr` folder.

### Pull new images

To pull new images or images update `docker-compose pull` 

### Start / Stop

* To start or restart all docker containers: `docker-compose start` 
* To stop all docker containers: `docker-compose stop`

## Create LetsEncrypt certificates

Use the certbot docker compose file. 

`export DOMAIN [domain_name]`

### Dry run 

`docker-compose run --rm --entrypoint "  certbot certonly --webroot -w /var/www/certbot  --staging  --register-unsafely-without-email  -d  ${DOMAIN}    --rsa-key-size 2048     --agree-tos     --force-renewal" certbot`

### Actual setup

`docker-compose run --rm --entrypoint "  certbot certonly --webroot -w /var/www/certbot    --register-unsafely-without-email  -d  ${DOMAIN}    --rsa-key-size 2048     --agree-tos     --force-renewal" certbot`


## Run integration tests

Integration tests live in the `/cypress` folder of this repo.

### Requirements

Ensure npm is installed, then install the required dependencies:

`npm install`

### Run e2e tests against local docker containers

Make sure all expected containers are running: `docker ps`;
if not, start them with `docker compose start`. Then run tests:

Headless: `npx cypress run`
Headed: `npx cypress open` or `npm run cy:open`

### Run e2e tests against any local or remote url

This can be useful for local development or verifying a staging deployment,
for example, if the target host is localhost:3000,
pass it into the corresponding test command with `-- --config "baseUrl=http://localhost:3000"`:

Headless: `npx cypress run -- --config "baseUrl=http://localhost:3000"`
Headed: `npx cypress open -- --config "baseUrl=http://localhost:3000"`
