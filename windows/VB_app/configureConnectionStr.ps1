param(
[string]$DB_HOSTNAME=$Env:DB_HOST,
[string]$DB_NAME=$Env:DB_NAME,
[string]$DB_USER=$Env:DB_USER,
[string]$DB_PASSWORD=$Env:DB_PASS
)

Write-Output 'Old config: '
Write-Output 'Source=[DatabaseIPAdress];Initial Catalog=IMIS;User ID=[ImisUserId];Password=[ImisUserPassword]'
Write-Output 'New config: '
Write-Output "Source=$DB_HOSTNAME;Initial Catalog=$DB_NAME;User ID=$DB_USER;Password=$DB_PASSWORD"
$WebDirectories = Get-ChildItem -Directory /inetpub/wwwroot/
foreach($webRoot in $WebDirectories){
    $webRootName = $webRoot.Name
    Write-Output "write the $webRootName config files"
    if (Test-Path /inetpub/wwwroot/$webRootName/Web.config){
		(Get-Content /inetpub/wwwroot/$webRootName/Web.config.sample)`
		-replace '\[DatabaseIPAdress\]',$DB_HOSTNAME`
		-replace '\[ImisUserId\]',$DB_USER`
		-replace '\[IMISDB\]',$DB_NAME`
		-replace '\[ImisUserPassword\]',$DB_PASSWORD`
		| Out-File -Encoding UTF8 /inetpub/wwwroot/$webRootName/Web.config;`
		Write-Output ('Pointing to legacy openIMIS on https://'+$Env:LEGACY_OPENIMIS_HOST)
    }
}

Write-Output "launch IIS"
$ISSprocess = (Start-Process C:\ServiceMonitor.exe -ArgumentList 'w3svc' -PassThru )
$handle = $proc.Handle
$ISSprocess.WaitForExit();
While ($true){
    Get-EventLog -LogName IMIS-LOG -Source IMIS -After (Get-Date).AddMinutes(-1) | Sort-Object Time
    if ($ISSprocess.ExitCode -ne 0) {
        Write-Warning "$_ exited with status code $($proc.ExitCode)"
        break;
    }
    Start-Sleep -s 60
}