#https://blog.backslasher.net/event-log-permissions-with-scripts.html
param(
[string]$source='IMIS',
[string]$LogName="$source-LOG"
)
#Write-Output "download binaries"
#setting https protocols
#[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
# lattest open IMIS binaries
#$url = "https://github.com/openimis/web_app_vb/releases/download/v1.3.0/openIMIS_Web_App_x64_v1.3.0.zip"
#dowload
#Invoke-WebRequest -Uri $url -OutFile "openIMIS.zip"
Write-Output "uncompress app binaries"
New-Item -ItemType directory -Path /temp/imis

Get-ChildItem /temp/ -Filter *.zip | Expand-Archive  -DestinationPath /temp/imis/
Write-Output "move app binaries in wwwroot"
if (!(Test-Path /temp/imis/Web.config) ){
   Get-ChildItem /temp/imis/
   $subdirectoryPath = Get-ChildItem -Directory /temp/imis/ -Name | Select-Object -First 1
   Write-Output "subdirectory $subdirectoryPath detected in the zip, moving file on the wwwroot"
   Move-Item -Path "/temp/imis/$subdirectoryPath/*" -Destination "/inetpub/wwwroot" 
}else{
   Write-Output "moving file on the wwwroot"
   Move-Item -Path /temp/imis/ -Destination /inetpub/wwwroot/
}

Write-Output "Create the eventlog/source"
New-EventLog -LogName $LogName -Source $source
Write-Output "give the right to admin to the eventlog"
$LogPath = 'HKLM:\SYSTEM\CurrentControlSet\services\EventLog\'+$LogName;
$acl = Get-Acl $LogPath
$ace = New-Object System.Security.AccessControl.RegistryAccessRule $env:username,'WriteKey, ReadKey','allow'
$acl.AddAccessRule($ace)

Write-Output "Create a copy of the config file"
ls "/inetpub/wwwroot/" | Write-Output
Copy-Item "/inetpub/wwwroot/Web.config" -Destination "/inetpub/wwwroot/Web.config.sample"
