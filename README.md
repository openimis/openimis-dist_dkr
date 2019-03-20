# openIMIS dockerized

| :bomb: Disclaimer : NOT FOR PRODUCTION USE :bomb: |
| --- |
| This repository provides a dockerized openIMIS (all components). It provides a quick setup for development, testing or demoing. ***It is NOT INTENDED FOR PRODUCTION USE.*** |
| The docker-compose currently only contains the openIMIS database and openIMIS backend components. It will be completed as the other components are added to the platform (frontend,...) |


# First startup
First startup is special since it will create the necessary docker images and containers to run openIMIS.
To build necessary, docker images, docker-compose  relies on ***local*** docker files.
In order to build these images, you need to clone, next to `openimis-dist_dkr/` the following github repository:
* openimis-db_dkr
* openimis-be_py

From within `openimis-dist_dkr/` directory:
* create a `.env` file, providing the database sa password:
```
 DB_SA_PASSWORD=<your sql server sa password>
```
* build and start the database docker image:  `docker-compose up db`
(note: use --force-recreate if you already created the image but want to change the password)
* restore the openIMIS default backup into the container:
  * `docker container ls` and spot the line (CONTAINER ID) with `openimis-dist_dkr_db` IMAGE name
  * `docker exec <CONTAINER ID> /restore.sh`
* build and start the backend docker image: `docker-compose up backend`
(note: at each start, openIMIS will apply the necessary database migrations to update the database scheme)

# stop /start
From within `openimis-dist_dkr/` directory:
To stop all docker containers: `docker-compose stop`
To (re-)start all docker containers: `docker-compose start` 