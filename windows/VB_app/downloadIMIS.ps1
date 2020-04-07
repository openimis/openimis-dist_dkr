param(
[string]$PathZip = "/temp"
)

#setting https protocols
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
# lattest open IMIS binaries
$urlWebApp = "https://github.com/openimis/web_app_vb/releases/download/v1.3.0/openIMIS_Web_App_x64_v1.3.0.zip"
$urlWebService = "https://github.com/openimis/web_service_vb/releases/download/v1.2.1/openIMIS_Web_Services_v1.2.1.zip"
# $urlRenewalService = "https://github.com/openimis/policy_renewal_service_vb/releases/download/v1.2.0/ImisPolicyRenewalSetup.zip"
#$urlBackupService = "https://github.com/openimis/backup_service_vb/releases/download/v1.2.0/ImisBackupSetupx64.zip"
# $urlPhotoService = "https://github.com/openimis/assign_photo_service_vb/releases/download/v1.2.0/AssignPhotosSetup.zip"
# $urlfeedbackService = "https://github.com/openimis/feedback_prompt_service_vb/releases/download/v1.2.0/ImisFeedbackPromptSetup.zip"
#dowload
Write-Output "download OpenIMIS binaries"
Invoke-WebRequest -Uri $urlWebApp -OutFile "$PathZip/openIMIS.zip"
Write-Output "download web services binaries"
Invoke-WebRequest -Uri $urlWebService -OutFile "$PathZip/Service.zip"
Write-Output "download Renewal service binaries"
# Invoke-WebRequest -Uri $urlRenewalService -OutFile "$PathZip/RenewalService.zip"
#Write-Output "download Backup service binaries"
#Invoke-WebRequest -Uri $urlBackupService -OutFile "$PathZip/BackupService.zip"
# Write-Output "download Photo update service binaries"
# Invoke-WebRequest -Uri $urlPhotoService -OutFile "$PathZip/PhotoService.zip"
# Write-Output "download Feedback prompt binaries"
# Invoke-WebRequest -Uri $urlfeedbackService -OutFile "$PathZip/FBService.zip"
# Write-Output "uncompress app binaries"