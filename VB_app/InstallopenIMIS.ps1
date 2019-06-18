#https://blog.backslasher.net/event-log-permissions-with-scripts.html
param(
[string]$source='IMIS',
[string]$LogName="$source-LOG",
[string]$SiteName = "Default Web Site",
[string]$IISUser = $env:username,
[string]$PathZip = "/temp"
)
#configure ISS
Import-Module WebAdministration

$ZipFiles = Get-ChildItem "$PathZip/" -Filter *.zip 
Write-Output "move app binaries in wwwroot"

foreach($Zip in $ZipFiles){ 
   $ZipName = $Zip.BaseName
   New-Item -ItemType directory -Path /temp/$ZipName
   Expand-Archive  $PathZip/$Zip -DestinationPath /temp/$ZipName/
   $singleFile = (Get-ChildItem /temp/$ZipName/ | Measure-Object).count
   $subdirectoryPath = ""
   Write-output " number of file found $singleFile"
   if($singleFile -eq 1){
      $subdirectoryPath = Get-ChildItem -Directory /temp/$ZipName/ -Name | Select-Object -First 1
      Write-Output "sub directory  $subdirectoryPath detected "
      $subdirectoryPath = "/$subdirectoryPath"
   }
   if($ZipName -eq "openIMIS"){
      New-Item -ItemType directory -Path /inetpub/wwwroot/$ZipName
      Set-ItemProperty "IIS:\Sites\$SiteName\" -name physicalPath -value C:\inetpub\wwwroot\$ZipName
      Move-Item -Path "/temp/$ZipName$subdirectoryPath/*" -Destination "/inetpub/wwwroot/$ZipName/"
      Write-Output "Create a copy of the $ZipName config files"
      Copy-Item "/inetpub/wwwroot/$ZipName/Web.config" -Destination "/inetpub/wwwroot/$ZipName/Web.config.sample"
   }elseif(Test-Path "/temp/$ZipName$subdirectoryPath/Web.config"){
      New-Item -ItemType directory -Path /inetpub/wwwroot/$ZipName
      New-WebApplication -Name $ZipName -Site $SiteName -PhysicalPath C:\inetpub\wwwroot\$ZipName -ApplicationPool DefaultAppPool
      Move-Item -Path "/temp/$ZipName$subdirectoryPath/*" -Destination "/inetpub/wwwroot/$ZipName/"
      Write-Output "Create a copy of the $ZipName config files"
      Copy-Item "/inetpub/wwwroot/$ZipName/Web.config" -Destination "/inetpub/wwwroot/$ZipName/Web.config.sample"
   }else{
      Write-Output "Move $ZipName in the service directory"
      New-Item -ItemType directory -Path /service/$ZipName
      Move-Item -Path "/temp/$ZipName$subdirectoryPath/*" -Destination /service/$ZipName/
   }
   
}

Write-Output "Create the eventlog/source"
New-EventLog -LogName $LogName -Source $source
Write-Output "give the right to $IISUser to the eventlog"
$LogPath = 'HKLM:\SYSTEM\CurrentControlSet\services\EventLog\'+$LogName;
$acl = Get-Acl $LogPath
$ace = New-Object System.Security.AccessControl.RegistryAccessRule $IISUser,'WriteKey, ReadKey','allow'
$acl.AddAccessRule($ace)

