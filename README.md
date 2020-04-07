# openIMIS dockerized

 This repository provides a dockerized openIMIS (all components) as a quick setup for development, testing or demoing.
 
 The docker-compose currently only contains the openIMIS database, backend, frontend and gateway components. It will be completed as the other components are added to the platform (batch platform,...)
 
| Disclaimer : NOT FOR PRODUCTION USE  |
| --- |
| <ul><li>**The gateway is not secure** (no ssl,...) and must be adapted before being exposed to the internet! For demo, it is also configured with basic auth for external application accesses, while the intend is to have a certificate-based authentication.</li><li>**The database is contenerized**, not even with a mounted volume. Production should run on a full SQL Server installation.</li><li>**The backend secret key** must be generated (specific) to your production platform</li><li>...</li></ul>|

In case of troubles, please consult/contact our service desk via our [ticketing site](https://openimis.atlassian.net/servicedesk/customer).

#Prerequisit
- Windows 10 or Windows server 2016
- Docker installed and in Windows container mode
- Docker Experimental features on <https://github.com/docker/cli/tree/master/experimental#docker-experimental-features>

In case of troubles, please consult/contact our service desk via our [ticketing site](https://openimis.atlassian.net/servicedesk/customer).

# First startup
First startup is special since it will create the necessary docker images and containers to run openIMIS.
To build necessary, docker images, docker-compose  relies on ***local*** docker files.
In order to build these images, you need to clone, next to `openimis-dist_dkr/` the following github repository:branch: 
* openimis-db_dkr:windows_container
* openimis-be_py:master
* openimis-fe_js:master
* openimis-gateway_dkr:master

```
git clone https://github.com/openimis/openimis-dist_dkr.git
git clone https://github.com/openimis/openimis-db_dkr.git
git clone https://github.com/openimis/openimis-be_py.git
git clone https://github.com/openimis/openimis-fe_js.git
git clone https://github.com/openimis/openimis-gateway_dkr.git
```

From within `openimis-dist_dkr/` directory:
* create a `.env` file, providing the following variables:
```
 #DB_SQL_SCRIPT=<URL pointing to the SQL script>
 #ACCEPT_EULA=<must put Y but it means you accept Microsoft EULA for the MSSQL database container>
 DB_HOST=<your database host, or db to use the demo docker 'db' service>
 DB_PORT=<your database port on the host, 1433 if you use the demo docker 'db' service>
 DB_NAME=<your database name, imis if you use the demo docker 'db' service>
 DB_USER=<your database user, sa if you use the demo docker 'db' service >
 DB_PASSWORD=<your database password, generate one if you use the demo docker 'db' service>
 ACCEPT_EULA=Y
 NEW_OPENIMIS_HOST=<(sub)domain under which the (new) openIMIS will be served (e.g. openimis.domaine) >
 LEGACY_OPENIMIS_HOST=<(sub)domain under which legacy openIMIS is served (e.g. demo.openimis.org) >
```

* If you use the demo docker 'db' service:
  * choose the SQL script to create/restore the database. Reference models are provided in [database_ms_sqlserver](https://github.com/openimis/database_ms_sqlserver) github. Example:
    * Empty database: `https://github.com/openimis/database_ms_sqlserver/raw/master/Empty%20databases/openIMIS_ONLINE.sql`
    * Demo database: `https://github.com/openimis/database_ms_sqlserver/raw/develop/Demo%20database/openIMIS_demo_1.3.0.sql`
  * build and start the database docker image:  `docker-compose up db`
  (note: use --force-recreate if you already created the image but want to change the password)
  * create the imis database into the container:
    * `docker container ls` and spot the line (CONTAINER ID) with `openimis-db` IMAGE name
    * `docker exec <CONTAINER ID> /create_database.bat`
* build and start the gateway (and backend) docker image: `docker-compose up gateway`
  (note: at each start, openIMIS will apply the necessary database migrations to update the database scheme)
* (if your are not working on localhost) register a letsencrypt certificate for your openIMIS gateway
  * list running containers and spot the gateway: `docker container ls` (the gateway should be named `openimis-gateway`)
  * connect to the gateway: `docker exec -it <CONTAINER ID> /bin/sh` (sh and not bash)
  * issue the command `install-certificate.sh` ... and follow the setup wizzard (provide contact address,
    * in case you are using your own computer and localhost NEW_OPENIMIS_HOST, running the lets encrypt script will activate the SSL but the SSL generation will fail, to solve this you can use self signed certificates
     `openssl req -sha256 -newkey rsa:4096 -nodes -keyout privkey.pem -x509 -days 730 -out /etc/letsencrypt/live/localhost/fullchain.pem`
* register your openIMIS superuser in the gateway:
  * list running containers and spot the gateway: `docker container ls` (the gateway should be named `openimis-gateway`)
  * connect to the gateway: `docker exec -it <CONTAINER ID> /bin/sh` (sh and not bash)
  * you should be in /script directory, if not, just `cd /script`)
  * in the gateway container, register your openIMIS superuser: `./add-user.sh <SUPERUSER_NAME> <SUPER_USER_PASSWORD>`
  Notes:
    * same procedure (add-user.sh) must be followed to add external applications accesses
    * in `/script`, there are also `remove-user.sh`and `update-user.sh`
* If connecting to brand new database, register your openIMIS superuser:
  * list running containers and spot the backend: `docker container ls` (the gateway should be named `openimis-backend`)
  * connect to the gateway: `docker exec -it <CONTAINER ID> /bin/bash` (bash and not sh this time)
  * you should be in /openimis-be/openIMIS directory, if not, just `cd /openimis-be/openIMIS`)
  * register your openIMIS superuser: `python manage.py createsuperuser` (and follow instructions)

# stop /start
From within `openimis-dist_dkr/` directory:
To stop all docker containers: `docker-compose stop`
To (re-)start all docker containers: `docker-compose start` 
