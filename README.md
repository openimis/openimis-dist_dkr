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
 create the log folder ./logs

## configure the gateway (optionnal)
if you want to change the gateway config, you can uncomment the volume in the docker-compose:gateway and then edit ./conf/gateway/openimis.json

## init database
* If you use the demo docker 'db' service:
  * choose the SQL script to create/restore the database. Reference models are provided in [database_ms_sqlserver](https://github.com/openimis/database_ms_sqlserver) github
* build and start rest of the container (and backend) docker image: `docker-compose up -d`
  * note: if the db is a container, it can take 90 sec to start the first time
  * note: at each start, openIMIS will apply the necessary database migrations to update the database scheme
* register your openIMIS superuser in the gateway:
  * list running containers and spot the gateway: `docker container ls` (the gateway should be named `openimis-gateway`)
  * connect to the gateway: `docker exec -it <CONTAINER ID> /bin/sh` (sh and not bash)
  * you should be in /script directory, if not, just `cd /script`)
  * in the gateway container, register your openIMIS superuser: `./add-user.sh <SUPERUSER_NAME> <SUPER_USER_PASSWORD>`
  Notes:
    * same procedure (add-user.sh) must be followed to add external applications accesses
    * in `/script`, there are also `remove-user.sh`and `update-user.sh`

# stop /start
To stop all docker containers: `docker-compose stop`
To (re-)start all docker containers: `docker-compose start` 

# rebuild 
To rebuild `docker-compose up -d --build --force-recreate`

