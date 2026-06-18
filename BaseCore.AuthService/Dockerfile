FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore "BaseCore.AuthService/BaseCore.AuthService.csproj"
WORKDIR "/src/BaseCore.AuthService"
RUN dotnet build "BaseCore.AuthService.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "BaseCore.AuthService.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "BaseCore.AuthService.dll"]
