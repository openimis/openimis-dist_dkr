ARG WINDOWS_VERSION="4.7-20200312-windowsservercore-ltsc2016"
ARG WINDOWS_BASE="mcr.microsoft.com/dotnet/framework/aspnet"
FROM "${WINDOWS_BASE}:${WINDOWS_VERSION}"
ARG OPENIMIS_VERSION="1.4.0" 
LABEL vendor="openIMIS"\
      maintainer="Patrick Delcroix <patrick.delcroix@swisspth.ch>"\
	  org.openimis.webapp.is-beta= \
      org.openimis.webapp.is-production="" \
      org.openimis.webapp.version="${OPENIMIS_VERSION}" 
ADD https://github.com/openimis/web_app_vb/releases/download/v${OPENIMIS_VERSION}/openIMIS_Web_App_x64_v${OPENIMIS_VERSION}.zip /temp/openIMIS.zip
ADD "https://github.com/openimis/web_service_vb/releases/download/v1.2.1/openIMIS_Web_Services_v1.2.1.zip" /temp/Service.zip
# ADD "https://github.com/openimis/policy_renewal_service_vb/releases/download/v1.2.0/ImisPolicyRenewalSetup.zip" /temp/Renewal.zip
# ADD "https://github.com/openimis/assign_photo_service_vb/releases/download/v1.2.0/AssignPhotosSetup.zip" /temp/photo.zip
# ADD "https://github.com/openimis/feedback_prompt_service_vb/releases/download/v1.2.0/ImisFeedbackPromptSetup.zip" /temp/feedback.zip
ADD "https://github.com/shibayan/iislua/releases/download/v0.6.1/iislua_x64.msi" /temp/iislua_x64.msi
ADD "https://go.microsoft.com/fwlink/?LinkID=615136" /temp/ARS.mis
COPY InstallopenIMIS.ps1 /temp/InstallopenIMIS.ps1
RUN powershell -Command /temp/InstallopenIMIS.ps1;\
	Start-Process msiexec.exe -Wait -ArgumentList '/q /i /temp/iislua_x64.msi';
RUN Start-Process msiexec.exe -Wait -ArgumentList '/q /i /temp/ars.msi';
WORKDIR "/inetpub/wwwroot"
ENTRYPOINT ["powershell","-Command","C:\\temp\\configureConnectionStr.ps1", "$env:username"]
COPY configureConnectionStr.ps1 /temp/configureConnectionStr.ps1