using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using BaseCore.Repository;
using BaseCore.Repository.Authen;
using BaseCore.Services.Authen;
using System.Text;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });
builder.Services.AddEndpointsApiExplorer();

// CORS Configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "BaseCore Auth Service API",
        Version = "v1",
        Description = "Authentication Microservice - Login, Register, User Management"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter JWT token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type=ReferenceType.SecurityScheme,
                    Id="Bearer"
                }
            },
            new string[]{}
        }
    });
});

// SQL Server Configuration
builder.Services.AddDbContext<SQLServerDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("ConnectedDb"));
});
// DI for Authentication Services and Repositories only
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserRefundQrRepository, UserRefundQrRepository>();

// JWT Authentication Key
var key = Encoding.ASCII.GetBytes(builder.Configuration["Jwt:SecretKey"] ?? "YourSecretKeyForAuthenticationShouldBeLongEnough");
builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false
    };
});

var app = builder.Build();

// Auto migrate database and Seed
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<SQLServerDbContext>();
    // Use EnsureCreated so the service can run against an existing DB created from database.sql
    dbContext.Database.EnsureCreated();
    await dbContext.Database.ExecuteSqlRawAsync(@"
IF OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL
    AND COL_LENGTH(N'[dbo].[Users]', N'RefundQrImageUrl') IS NULL
BEGIN
    ALTER TABLE [dbo].[Users] ADD [RefundQrImageUrl] [nvarchar](1000) NULL;
END;

IF OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL
    AND COL_LENGTH(N'[dbo].[Users]', N'RefundQrImageUrl') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[Users] ALTER COLUMN [RefundQrImageUrl] [nvarchar](max) NULL;
END;

IF OBJECT_ID(N'[dbo].[UserRefundQrs]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[UserRefundQrs](
        [UserRefundQrId] [int] IDENTITY(1,1) NOT NULL,
        [UserId] [nvarchar](450) NOT NULL,
        [DisplayName] [nvarchar](120) NOT NULL,
        [QrImageUrl] [nvarchar](max) NOT NULL,
        [IsDefault] [bit] NOT NULL CONSTRAINT [DF_UserRefundQrs_IsDefault] DEFAULT ((0)),
        [CreatedAt] [datetime] NOT NULL CONSTRAINT [DF_UserRefundQrs_CreatedAt] DEFAULT (getdate()),
        [UpdatedAt] [datetime] NULL,
        CONSTRAINT [PK_UserRefundQrs] PRIMARY KEY CLUSTERED ([UserRefundQrId] ASC)
    );
END;

IF OBJECT_ID(N'[dbo].[UserRefundQrs]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_UserRefundQrs_UserId' AND [object_id] = OBJECT_ID(N'[dbo].[UserRefundQrs]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_UserRefundQrs_UserId] ON [dbo].[UserRefundQrs]([UserId] ASC);
END;

IF OBJECT_ID(N'[dbo].[UserRefundQrs]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_UserRefundQrs_UserId_IsDefault' AND [object_id] = OBJECT_ID(N'[dbo].[UserRefundQrs]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_UserRefundQrs_UserId_IsDefault] ON [dbo].[UserRefundQrs]([UserId] ASC, [IsDefault] ASC);
END;

IF OBJECT_ID(N'[dbo].[UserRefundQrs]', N'U') IS NOT NULL
    AND OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'FK_UserRefundQrs_Users')
BEGIN
    ALTER TABLE [dbo].[UserRefundQrs] WITH CHECK ADD CONSTRAINT [FK_UserRefundQrs_Users]
        FOREIGN KEY([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE;
END;

IF OBJECT_ID(N'[dbo].[UserRefundQrs]', N'U') IS NOT NULL
    AND OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL
BEGIN
    INSERT INTO [dbo].[UserRefundQrs] ([UserId], [DisplayName], [QrImageUrl], [IsDefault], [CreatedAt])
    SELECT u.[Id], N'Tài khoản mặc định', LTRIM(RTRIM(u.[RefundQrImageUrl])), 1, GETDATE()
    FROM [dbo].[Users] u
    WHERE u.[RefundQrImageUrl] IS NOT NULL
      AND LTRIM(RTRIM(u.[RefundQrImageUrl])) <> N''
      AND NOT EXISTS (
          SELECT 1
          FROM [dbo].[UserRefundQrs] q
          WHERE q.[UserId] = u.[Id]
      );
END;

IF OBJECT_ID(N'[dbo].[UserRefundQrs]', N'U') IS NOT NULL
BEGIN
    ;WITH DefaultPick AS (
        SELECT [UserRefundQrId],
               ROW_NUMBER() OVER (PARTITION BY [UserId] ORDER BY CASE WHEN [IsDefault] = 1 THEN 0 ELSE 1 END, [UserRefundQrId]) AS rn
        FROM [dbo].[UserRefundQrs]
    )
    UPDATE q
    SET [IsDefault] = CASE WHEN d.rn = 1 THEN 1 ELSE 0 END
    FROM [dbo].[UserRefundQrs] q
    INNER JOIN DefaultPick d ON d.[UserRefundQrId] = q.[UserRefundQrId];
END;
");
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

Console.WriteLine("BaseCore Auth Service running on port 5002");
Console.WriteLine("Endpoints: /api/auth, /api/users, /api/roles");
app.Run();
