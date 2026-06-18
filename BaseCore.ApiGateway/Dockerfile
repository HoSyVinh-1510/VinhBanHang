FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore "BaseCore.ApiGateway/BaseCore.ApiGateway.csproj"
WORKDIR "/src/BaseCore.ApiGateway"
RUN dotnet build "BaseCore.ApiGateway.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "BaseCore.ApiGateway.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "BaseCore.ApiGateway.dll"]
