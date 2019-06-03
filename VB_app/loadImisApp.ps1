#https://blog.backslasher.net/event-log-permissions-with-scripts.html
param(
[string]$source='IMIS',
[string]$LogName="$source-LOG"
)
Write-Output "uncompress app binaries"
Get-ChildItem /inetpub/wwwroot/ -Filter *.zip | Expand-Archive  -DestinationPath /inetpub/wwwroot/
Write-Output "Create the eventlog/source"
New-EventLog -LogName $LogName -Source $source
Write-Output "give the right to admin to the eventlog"
$LogPath = 'HKLM:\SYSTEM\CurrentControlSet\services\EventLog\'+$LogName;
$acl = Get-Acl $LogPath
$ace = New-Object System.Security.AccessControl.RegistryAccessRule $env:username,'WriteKey, ReadKey','allow'
$acl.AddAccessRule($ace)