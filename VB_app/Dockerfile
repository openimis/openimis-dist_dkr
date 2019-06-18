FROM mcr.microsoft.com/dotnet/framework/aspnet:4.7.2
ADD https://github.com/openimis/web_app_vb/releases/download/v1.3.0/openIMIS_Web_App_x64_v1.3.0.zip /temp/openIMIS.zip
ADD "https://github.com/openimis/web_service_vb/releases/download/v1.2.1/openIMIS_Web_Services_v1.2.1.zip" /temp/Service.zip
# ADD "https://github.com/openimis/policy_renewal_service_vb/releases/download/v1.2.0/ImisPolicyRenewalSetup.zip" /temp/Renewal.zip
# ADD "https://github.com/openimis/assign_photo_service_vb/releases/download/v1.2.0/AssignPhotosSetup.zip" /temp/photo.zip
# ADD "https://github.com/openimis/feedback_prompt_service_vb/releases/download/v1.2.0/ImisFeedbackPromptSetup.zip" /temp/feedback.zip
COPY InstallopenIMIS.ps1 /temp/InstallopenIMIS.ps1
COPY configureConnectionStr.ps1 /temp/configureConnectionStr.ps1
RUN powershell -Command /temp/InstallopenIMIS.ps1
WORKDIR "/inetpub/wwwroot"
ENTRYPOINT ["powershell.exe", "C:\\temp\\configureConnectionStr.ps1"]