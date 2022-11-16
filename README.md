# openIMIS dockerized

 This repository provides a dockerized openIMIS (all components) as a quick setup for development, testing or demoing.
 
 Please look for the direction on the openIMIS Wiki: https://openimis.atlassian.net/wiki/spaces/OP/pages/963182705/MO1.1+Install+the+modular+openIMIS+using+Docker
 
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

* build and start rest of the container (and backend) docker image:  `docker-compose -f docker-compose-psql.yml up -d` (`docker-compose -f docker-compose-mssql.yml up -d` for mssql database)
  * note: if the db is a container, it can take 90 sec to start the first time
  * note: at each start, openIMIS will apply the necessary database migrations to update the database scheme

  Notes:
    * same procedure (add-user.sh) must be followed to add external applications accesses
    * in `/script`, there are also `remove-user.sh`and `update-user.sh`

# stop /start
To stop all docker containers: `docker-compose -f docker-compose-psql.yml stop`
To (re-)start all docker containers: `docker-compose -f docker-compose-psql.yml start` 

# rebuild 
To rebuild `docker-compose up -d -f docker-compose-psql.yml --build --force-recreate` 

