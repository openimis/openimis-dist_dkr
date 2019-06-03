FROM mcr.microsoft.com/dotnet/framework/aspnet:4.7.2
COPY loadImisApp.ps1 /temp/loadImisApp.ps1
COPY configureConnectionStr.ps1 /temp/configureConnectionStr.ps1
ADD https://github.com/openimis/web_app_vb/releases/download/v1.3.0/openIMIS_Web_App_x64_v1.3.0.zip "/inetpub/wwwroot/"
RUN powershell -Command /temp/loadImisApp.ps1
WORKDIR "/inetpub/wwwroot"
CMD [powershell.exe, -executionpolicy, bypass, C:\temp\configureConnectionStr.ps1;C:\ServiceMonitor.exe, w3svc]