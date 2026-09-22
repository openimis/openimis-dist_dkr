# CONTRIBUTING

This repository provides a Docker package for openIMIS that includes all components to quickly setup, test and demo the solution.

If you are only looking to setup and test the solution please look for further instructions on the [openIMIS Wiki](https://openimis.atlassian.net/wiki/spaces/OP/pages/963182705/MO1.1+Install+the+modular+openIMIS+using+Docker)

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

OpenSearch and OpenSearch Dashboards ship in `compose.openSearch.yml`, which `compose.yml` includes - `docker compose up -d` starts them with everything else. Neither service publishes a host port: the only route to Dashboards is the frontend nginx at `/opensearch/`, which authorizes every request against the openIMIS dashboards right (`opensearch_reports/auth_check`) and redirects anonymous users to the login page. That same check returns the caller's username and OpenSearch right codes, which nginx forwards to Dashboards as `x-proxy-user` / `x-proxy-rights`, and Dashboards relays them to the cluster, whose proxy authenticator files the codes as backend roles.

**The cluster can run the OpenSearch security plugin:** TLS on 9200, every request authenticated, and identity headers trusted from Dashboards' address and nowhere else. It is **off in `.env.openSearch.example`**, temporarily: the backend verifies the cluster's private certificate authority through `OPENSEARCH_CA_CERTS`, which no released backend image carries yet, and with the plugin on against an older `BE_TAG` the whole stack looks healthy while every indexing call fails with a certificate error. Turn it on once your `BE_TAG` carries that setting - the three lines to change are named in `.env.openSearch.example`. Then:

  * Copy `.env.openSearch.example` to `.env.openSearch` and set the four passwords (`openssl rand -base64 24` each). The node refuses to start and names any that is empty. `deploy_openimis.sh` fills them for you on a first install.
  * `opensearch-certgen` generates the cluster CA, the node certificate and an admin client certificate into `data/opensearch/` on the first `docker compose up`, then does nothing. **Back that directory up together with `data/jwt`.** Losing `ca/` means reissuing and redistributing to every consumer; losing `private/` means you cannot renew.
  * Three internal users, rendered from those passwords at every node start: `admin` (cluster superuser, for operators and the health check), `openimis_indexer` (what the backend and worker connect as - `OPENSEARCH_ADMIN`/`OPENSEARCH_PASSWORD` keep the backend's variable names), and `dashboards_server`.
  * Rights: `199001` maps to the built-in `kibana_user` and `readall` roles. That is deliberately coarse - a holder reads **every** index and every other user's saved objects, and can edit saved objects, because the gate cannot tell a reading request from a writing one. Per-index roles, per-user tenants and the audit log are a separate piece of work.
  * `openimis_indexer` currently holds `all_access`, which includes the security REST API. A compromised backend could therefore rewrite the trusted-proxy address and assert any identity - the one privilege that undoes the proxy pin. Narrowing it to a role of its own belongs with the per-index work above.

**Changing anything under `conf/opensearch/security/`, or any password, after the first start needs a second command.** The cluster seeds its security index once; later edits are rendered into the container but not loaded:

```
docker compose up -d --force-recreate opensearch
docker compose exec opensearch plugins/opensearch-security/tools/securityadmin.sh \
  -cd config/opensearch-security -icl -nhnv \
  -cacert config/certs/ca/ca.pem -cert config/certs/admin/admin.pem -key config/certs/admin/admin-key.pem
```

Skipping the second command has a misleading symptom: the cluster keeps working on the **old** password while the health check uses the new one, so the node reports unhealthy and Dashboards, which waits for it, never starts. It looks like a Dashboards fault and is not. The reload authenticates with the admin certificate rather than a password, so a password mistake never locks you out of fixing it.

**Upgrading an installation that already enabled the plugin the old way** (with the demo configuration) is the same two commands, once. Before you run them the demo `admin` and `kibanaserver` still work and your new passwords do not; afterwards the reverse. Installations running with the plugin **off** keep running with it off until they set `OPENSEARCH_SECURITY_DISABLED=false` and switch both `*_HOSTS` to `https`. The upgrade is not a no-op for them, though: a second network `opensearch-net` is created on a fixed `172.29.0.0/24`, so `docker compose up` fails with a pool overlap if the host already routes that range - set `OPENSEARCH_NET_SUBNET` and `OPENSEARCH_DASHBOARDS_IP` in `.env.openSearch` if so; the cluster moves off `openimis-net` onto it; `opensearch-certgen` runs before `migrations`, so the backend waits on it even in legacy mode; and every api container gains a read-only mount of `data/opensearch/ca`.

**Legacy mode still exists** (`OPENSEARCH_SECURITY_DISABLED=true`, both `*_HOSTS` on `http`). The cluster then trusts every container on its network, so network isolation is the only control.

**The OpenSearch include is now required.** `compose.base.yml` names `opensearch-certgen`, so removing `compose.openSearch.yml` from `compose.yml` makes every `docker compose` command fail with `depends on undefined service`. To run without the cluster, stop the two services or use legacy mode rather than dropping the include.

Verify the gate once the stack is up:

```
curl -so /dev/null -w '%{http_code}\n' http://localhost/opensearch/app/home   # 302 -> login
docker compose exec backend curl -s -o /dev/null -w '%{http_code}\n' \
  --cacert /run/opensearch-ca/ca.pem https://opensearch:9200/                  # 401 -> cluster refuses anonymous
```

A logged-in user holding the dashboards right gets 200; without the right, 403.

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

Additionally, if you are using social protection specific language pack,
e.g. benefit plan would be called programme, you can pass in 
`--env useSocialProtectionLanguagePack=true`

- Headless: `npx cypress run --config "baseUrl=http://localhost:3000" --env useSocialProtectionLanguagePack=true`
- Headed: `npx cypress open --config "baseUrl=http://localhost:3000" --env useSocialProtectionLanguagePack=true`
