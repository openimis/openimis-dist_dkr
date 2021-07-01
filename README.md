# openIMIS dockerized

 This repository provides a dockerized openIMIS (all components) as a quick setup for development, testing or demoing.
 
 Please look for the direction on the openIMIS Wiki: https://openimis.atlassian.net/wiki/spaces/OP/pages/963182705/MO1.1+Install+the+modular+openIMIS+using+Docker
 
 The docker-compose currently only contains the openIMIS database, backend, frontend and gateway components. It will be completed as the other components are added to the platform (batch platform,...)
 
| Disclaimer : NOT FOR PRODUCTION USE  |
| --- |
| <ul><li>**The gateway is not secure** (no ssl,...) and must be adapted before being exposed to the internet! For demo, it is also configured with basic auth for external application accesses, while the intend is to have a certificate-based authentication.</li><li>**The database is contenerized**, not even with a mounted volume. Production should run on a full SQL Server installation.</li><li>**The backend secret key** must be generated (specific) to your production platform</li><li>...</li></ul>|

In case of troubles, please consult/contact our service desk via our [ticketing site](https://openimis.atlassian.net/servicedesk/customer).

#Prerequisit
- Windows 10 or Windows server 2016
- Docker installed and in Windows container mode
-
In case of troubles, please consult/contact our service desk via our [ticketing site](https://openimis.atlassian.net/servicedesk/customer).

# First startup
First startup is special since it will create the necessary docker images and containers to run openIMIS. \
This will be done, using the GitHub URL of the different openIMIS components in the main docker-compose file. The branch from where to build each of those components can be specified with the appropriate variables BE/FE/DB/GW BRANCH (as specified in the following list). 


From within `openimis-dist_dkr/windows` directory:
* create a `.env` file, providing the following variables:
```
 DB_SQL_SCRIPT=<URL pointing to the SQL script>
 ACCEPT_EULA=<must put Y but it means you accept Microsoft EULA for the MSSQL database container>
 DB_HOST=database
 DB_PORT=1433
 DB_NAME=<your database name, imis if you use the demo docker 'db' service>
 DB_USER=<your database user, sa if you use the demo docker 'db' service >
 DB_PASSWORD=<your database password, generate one if you use the demo docker 'db' service>
 NEW_OPENIMIS_HOST=<(sub)domain under which the (new) openIMIS will be served (e.g. openimis.domaine) >
 LEGACY_OPENIMIS_HOST=frontend
 BE_CONF_PATH=<the path to your config file, has to be local>
 FE_CONF_PATH=<the path to your config file, has to be local>
 DEV_PATH=<the path to your developer config, optional>
 BE_BRANCH=<branch of the backend repository to be used>
 FE_BRANCH=<branch of the frontend repository to be used>
 DB_BRANCH=<branch of the database repository to be used>
 GW_BRANCH=<branch of the gateway repository to be used>
```
Note: BE and FE openimis.json file has to be provided locally. The user can with it use their own configuration. Additionally if the user wants to provide development settings, there is a variable for the path where this configuration file would be located with the DEV_PATH. 

* If you use the demo docker 'db' service:
  * choose the SQL script to create/restore the database. Reference models are provided in [database_ms_sqlserver](https://github.com/openimis/database_ms_sqlserver) github. Example:
    * Empty database: `https://github.com/openimis/database_ms_sqlserver/blob/master/Empty%20databases/openIMIS_ONLINE.sql?raw=true`
    * Demo database: `https://github.com/openimis/database_ms_sqlserver/blob/master/Demo%20database/openIMIS_demo_ONLINE.sql?raw=true`
  * build and start the database docker image:  `docker-compose up db`
  * create the imis database into the container:
    * `docker container ls` and spot the line (CONTAINER ID) with `openimis-db` IMAGE name
    * `docker exec <CONTAINER ID> /create_database.bat`
  * create the imis users
    * `docker exec <CONTAINER ID> /create_user_db.bat`
* build and start rest of the container (and backend) docker image: `docker-compose up`
  (note: at each start, openIMIS will apply the necessary database migrations to update the database scheme)
  With this command, docker-compose.override.yml will be used. To use the main docker-compose file, it should be specified as `docker-compose -f docker-compose.yml up`
* register your openIMIS superuser in the gateway:
  * list running containers and spot the gateway: `docker container ls` (the gateway should be named `openimis-gateway`)
  * connect to the gateway: `docker exec -it <CONTAINER ID> /bin/sh` (sh and not bash)
  * you should be in /script directory, if not, just `cd /script`)
  * in the gateway container, register your openIMIS superuser: `./add-user.sh <SUPERUSER_NAME> <SUPER_USER_PASSWORD>`
  Notes:
    * same procedure (add-user.sh) must be followed to add external applications accesses
    * in `/script`, there are also `remove-user.sh`and `update-user.sh`

# stop /start
From within `openimis-dist_dkr/windows` directory:
To stop all docker containers: `docker-compose stop`
To (re-)start all docker containers: `docker-compose start` 

# Integrating services

If you require a larger infrastructure to use e.g. OpenHIM mediators to talk to a FHIR server, please refer to the repository [openIMIS instant OHIE](https://github.com/openimis/openimis-dist_instant_openhie/tree/develop)
