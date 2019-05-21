param(
[string]$DB_HOSTNAME=$Env:DB_HOST,
[string]$DB_NAME=$Env:DB_NAME,
[string]$DB_USER=$Env:DB_USER,
[string]$DB_PASSWORD=$Env:DB_PASS
)
(Get-Content /inetpub/wwwroot/Web.config.sample).replace('Source=[DatabaseIPAdress];Initial Catalog=IMIS;User ID=[ImisUserId];Password=[ImisUserPassword]', "Source=$DB_HOSTNAME;Initial Catalog=$DB_NAME;User ID=$DB_USER;Password=$DB_PASSWORD") | Set-Content /inetpub/wwwroot/Web.config
