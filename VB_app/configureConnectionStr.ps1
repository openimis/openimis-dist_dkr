param(
[string]$DB_HOSTNAME=$Env:DB_HOST,
[string]$DB_NAME=$Env:DB_NAME,
[string]$DB_USER=$Env:DB_USER,
[string]$DB_PASSWORD=$Env:DB_PASS
)
Write-Output 'Source=[DatabaseIPAdress];Initial Catalog=IMIS;User ID=[ImisUserId];Password=[ImisUserPassword]', "Source=$DB_HOSTNAME;Initial Catalog=$DB_NAME;User ID=$DB_USER;Password=$DB_PASSWORD"
(Get-Content /inetpub/wwwroot/Web.config.sample).replace('Source=[DatabaseIPAdress];Initial Catalog=IMIS;User ID=[ImisUserId];Password=[ImisUserPassword]', "Source=$DB_HOSTNAME;Initial Catalog=$DB_NAME;User ID=$DB_USER;Password=$DB_PASSWORD") | Set-Content /inetpub/wwwroot/Web.config
#Write-Output "sleep for 15 seconds"
#Start-Sleep -s 15
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