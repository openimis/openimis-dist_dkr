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
   - uncomment the volume in the gateway config
   - replace openimis.conf with openimis.conf.without_restapi

## configure the gateway (optionnal)
if you want to change the gateway config, you can uncomment the volume in the docker-compose:gateway and then edit ./conf/gateway/openimis.json

## init database

* build and start rest of the container (and backend) docker image:  `docker-compose  up -d` (`docker-compose -f docker-compose-mssql.yml up -d` for mssql database)
  * note: if the db is a container, it can take 90 sec to start the first time
  * note: at each start, openIMIS will apply the necessary database migrations to update the database scheme

  Notes:
    * same procedure (add-user.sh) must be followed to add external applications accesses
    * in `/script`, there are also `remove-user.sh`and `update-user.sh`

## OpenFN/Lightning setup 
Lightning is not by default enabled in dockerized instance. To make it work it's required to: 
  * Copy .env.lightning to .env and make adjustments 
  * Run container build `docker compose -f docker-compose.yml -f docker-compose.lightning.yml build lightning`
  * Run imis demo setup `docker compose -f docker-compose.yml -f docker-compose.lightning.yml run --rm lightning ./imisSetup.sh`
  * Run service `docker compose -f docker-compose.yml -f docker-compose.lightning.yml up lightning`
  
# stop /start
To stop all docker containers: `docker-compose  stop`
To (re-)start all docker containers: `docker-compose  start` 

# rebuild 
To rebuild `docker-compose up -d  --build --force-recreate` 

