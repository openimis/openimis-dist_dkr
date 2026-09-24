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

**The cluster can run the OpenSearch security plugin:** TLS on 9200, every request authenticated, and identity headers trusted from Dashboards' address and nowhere else. Only nginx can reach Dashboards (`dashboards-net`), and the backend and worker reach the node over a network of their own (`search-net`), so no container can hand Dashboards an identity to relay. It is **off in `.env.openSearch.example`**, temporarily: the backend verifies the cluster's private certificate authority through `OPENSEARCH_CA_CERTS`, which no released backend image carries yet, and with the plugin on against an older `BE_TAG` the whole stack looks healthy while every indexing call fails with a certificate error. Copy `.env.openSearch.example` to `.env.openSearch` either way. To turn the plugin on, once your `BE_TAG` carries that setting, change the three lines named in that file. Then:

  * Set the four passwords (`openssl rand -base64 24` each). If one of the three internal-user passwords is empty, `opensearch-config` exits naming it; an empty or short cookie password stops Dashboards itself. Either way Dashboards does not start. `deploy_openimis.sh` fills them for you on a first install, so they are already there.
  * `opensearch-certgen` generates the cluster CA, the node certificate and an admin client certificate into `data/opensearch/` on the first `docker compose up`, then does nothing. **Back that directory up together with `data/jwt`.** Losing `ca/` means reissuing and redistributing to every consumer; losing `private/` means you cannot renew.
  * Three internal users, applied from those passwords on every start by the `opensearch-config` service: `admin` (cluster superuser, for operators), `openimis_indexer` (what the backend and worker connect as - `OPENSEARCH_ADMIN`/`OPENSEARCH_PASSWORD` keep the backend's variable names), and `dashboards_server`. The image's own demo users are never created.
  * Roles, in `conf/opensearch/security/roles.yml`, mapped from the right codes the gate forwards: `199001` (view dashboards) gives Dashboards itself, read on the nine openIMIS indices by name and read on the Global tenant; `199003` (update dashboards), held **in addition** to `199001`, adds write on the Global tenant, which re-importing the shipped dashboards needs. Nothing shipped reads any other index - not the audit log, not another user's saved objects. Grant and remove access in the openIMIS role screen; the mapping is the same constants in every installation and is never edited per deployment. Access per index would be new rights in the `opensearch_reports` module, not a change here. The built-in `kibana_user` is deliberately not mapped: the plugin gives Global-tenant write to any holder of a role by that name.
  * **Upgrading from the first plugin-on release changes who may re-import dashboards.** There, `199001` mapped to `kibana_user`, which the plugin grants Global-tenant write, so any Dashboards user could run `upload_opensearch_dashboards`. Now only `199003` holders can; an administrator role carrying `199001` alone starts getting 403 from that command, and the fix is to grant it the right.
  * **Saved objects from before this release become read-only for most users.** Without multitenancy - the plugin off, or the first plugin-on release - everything a user saved in Dashboards went into `.kibana`, which is now the Global tenant. After the upgrade those objects are read-only for anyone without `199003`, including the user who created them. Grant `199003` to whoever needs to keep editing them.
  * Dev Tools is switched off (`console.enabled: false`). It is the one route by which a logged-in user can issue raw index requests as themselves, around the tenant layer that keeps saved objects private. Nothing in openIMIS uses it, but an operator looking for the console will not find it.
  * Tenants: every user has a private tenant for what they save in Dashboards, invisible to anyone else through Dashboards (the raw index is still readable by `admin`). The shipped dashboards live in the shared Global tenant, read-only without `199003`. The dashboard links openIMIS ships name that tenant (`security_tenant=global`); the `opensearch_reports` migration that fixes the four older links must be deployed no later than this configuration, or those four are not found for anyone.
  * `openimis_indexer` holds `openimis_indexer_role`: the nine indices, and no cluster administration or security REST API.
  * The audit log (`security/audit.yml`; `security-auditlog-YYYY.MM.dd` in the cluster, readable by `admin` only) records failed logins, denied requests and changes to the security configuration - not successful reads, and nothing from the two service accounts. Because the configuration is re-applied on every start, an ordinary restart writes configuration-change records whether or not anything changed. Removing `GRANTED_PRIVILEGES` from the two `disabled_*_categories` lines turns it into a full access trail. It grows without bound; a retention policy is the operator's and is not shipped.

**Changing a password or anything under `conf/opensearch/security/` takes effect on the next `docker compose up`.** The `opensearch-config` service re-applies the whole configuration every time the stack starts, authenticating with the admin certificate rather than a password, so there is no reload to remember and a wrong password cannot lock you out of fixing it. The node reports unhealthy until that service has succeeded, and Dashboards waits for both, so a configuration that fails to apply stops the stack visibly instead of leaving it half-configured.

One consequence worth knowing: the configuration in `conf/` is authoritative. Anything changed through the security API or the Dashboards security screen is overwritten on the next start.

**Upgrading an installation that already enabled the plugin the old way** (with the demo configuration) needs nothing special: the first `docker compose up` replaces the demo users with yours, and the demo `admin` and `kibanaserver` stop working. Installations running with the plugin **off** keep running with it off until they set `OPENSEARCH_SECURITY_DISABLED=false` and switch both `*_HOSTS` to `https`. The upgrade is not a no-op for them, though: three networks are created - `opensearch-net` on a fixed `172.29.0.0/24`, and `search-net` and `dashboards-net` on ranges Docker picks - so `docker compose up` fails with a pool overlap if the host already routes the fixed range: set `OPENSEARCH_NET_SUBNET` and `OPENSEARCH_DASHBOARDS_IP` in `.env.openSearch` if so; the cluster and Dashboards move off `openimis-net`, so the backend and worker no longer reach Dashboards directly and nginx is the only route to it; `opensearch-certgen` runs before `migrations`, so the backend waits on it even in legacy mode; and every api container gains a read-only mount of `data/opensearch/ca`.

**With the plugin off** - the shipped default, `OPENSEARCH_SECURITY_DISABLED=true` and both `*_HOSTS` on `http` - the cluster trusts every container on its network, so network isolation is the only control. Everything above about certificates, users and the configuration service applies only once you turn it on.

**The OpenSearch include is now required.** `compose.base.yml` names `opensearch-certgen`, so removing `compose.openSearch.yml` from `compose.yml` makes every `docker compose` command fail with `depends on undefined service`. To run without the cluster, stop the two services or use legacy mode rather than dropping the include.

Verify the gate once the stack is up, in either mode:

```
curl -so /dev/null -w '%{http_code}\n' http://localhost/opensearch/app/home   # 302 -> login
```

And, with the security plugin on, that the cluster itself refuses anonymous callers:

```
docker compose exec backend curl -s -o /dev/null -w '%{http_code}\n' \
  --cacert /run/opensearch-ca/ca.pem https://opensearch:9200/                  # 401
```

With it off that probe prints `000` instead: the node speaks plain http, so there is nothing to
connect to on `https`, and any container on the network can read the cluster without credentials.

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
