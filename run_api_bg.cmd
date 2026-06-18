@echo off
set DOTNET_CLI_HOME=D:\FW\FW
set DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1
cd /d D:\FW\FW\BaseCore
dotnet run --project .\BaseCore.APIService\BaseCore.APIService.csproj >> D:\FW\FW\BaseCore\tmp_api_run.log 2>&1
