#https://blog.backslasher.net/event-log-permissions-with-scripts.html
param(
[string]$source='IMIS',
[string]$LogName="$source-LOG"
)
# uncompress app binaries
Get-ChildItem /inetpub/wwwroot/ -Filter *.zip | Expand-Archive  -DestinationPath /inetpub/wwwroot/
#Create the eventlog/source
New-EventLog -LogName $LogName -Source $source
#give the right to admin
$LogPath = 'HKLM:\SYSTEM\CurrentControlSet\services\EventLog\'+$LogName;
$acl = Get-Acl $LogPath
$ace = New-Object System.Security.AccessControl.RegistryAccessRule $env:username,'WriteKey, ReadKey','allow'
$acl.AddAccessRule($ace)

Copy-Item /inetpub/wwwroot/Web.config /inetpub/wwwroot/Web.config.sample

# change the database connection string of openIMIS
#(Get-Content /inetpub/wwwroot/Web.config).replace('Source=[DatabaseIPAdress];Initial Catalog=IMIS;User ID=[ImisUserId];Password=[ImisUserPassword]', "Source=database;Initial Catalog=IMIS;User ID=SA;Password=$env:SA_PASSWORD") | Set-Content /inetpub/wwwroot/Web.config


