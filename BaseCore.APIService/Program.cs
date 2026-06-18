using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using BaseCore.APIService.BackgroundJobs;
using BaseCore.APIService.Data;
using BaseCore.Services;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

builder.Services.AddEndpointsApiExplorer();

// Swagger Configuration
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "BaseCore API Service",
        Version = "v1",
        Description = "Business Logic Microservice - Products, Categories, Orders"
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
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});


builder.Services.AddDbContext<SQLServerDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("ConnectedDb"));
});


// Repository Registration - Products, Categories, Orders is Based on
builder.Services.AddScoped<IProductRepositoryEF, ProductRepositoryEF>();
builder.Services.AddScoped<ICategoryRepositoryEF, CategoryRepositoryEF>();
builder.Services.AddScoped<IOrderRepositoryEF, OrderRepositoryEF>();
builder.Services.AddScoped<IOrderItemRepositoryEF, OrderItemRepositoryEF>();
builder.Services.AddScoped<IOrderStatusHistoryRepositoryEF, OrderStatusHistoryRepositoryEF>();
builder.Services.AddScoped<IOrderActivityLogRepositoryEF, OrderActivityLogRepositoryEF>();
builder.Services.AddScoped<ICartItemRepositoryEF, CartItemRepositoryEF>();
builder.Services.AddScoped<ISupportMessageRepositoryEF, SupportMessageRepositoryEF>();
builder.Services.AddScoped<ICouponRepositoryEF, CouponRepositoryEF>();
builder.Services.AddScoped<IAnalyticsRepositoryEF, AnalyticsRepositoryEF>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
builder.Services.AddScoped<IWalletRepositoryEF, WalletRepositoryEF>();
builder.Services.AddScoped<BaseCore.Repository.Authen.IUserRefundQrRepository, BaseCore.Repository.Authen.UserRefundQrRepository>();
builder.Services.AddScoped<IWalletService, WalletService>();
builder.Services.AddScoped<BaseCore.Services.ICouponService, BaseCore.Services.CouponService>();
builder.Services.AddScoped<BaseCore.Services.IOrderService, BaseCore.Services.OrderService>();
builder.Services.AddScoped<BaseCore.Services.IProductService, BaseCore.Services.ProductService>();
builder.Services.AddScoped<BaseCore.Services.ICategoryService, BaseCore.Services.CategoryService>();
builder.Services.AddScoped<BaseCore.Services.IProductReviewService, BaseCore.Services.ProductReviewService>();
builder.Services.AddScoped<BaseCore.Services.ICartService, BaseCore.Services.CartService>();
builder.Services.AddScoped<BaseCore.Services.ICustomerAddressService, BaseCore.Services.CustomerAddressService>();
builder.Services.AddScoped<BaseCore.Services.ISupportMessageService, BaseCore.Services.SupportMessageService>();
builder.Services.AddScoped<BaseCore.Services.INotificationService, BaseCore.Services.NotificationService>();
builder.Services.AddScoped<INotificationRepositoryEF, NotificationRepositoryEF>();
builder.Services.AddScoped<ICustomerAddressRepositoryEF, CustomerAddressRepositoryEF>();
builder.Services.AddScoped<IProductReviewRepositoryEF, ProductReviewRepositoryEF>();
builder.Services.AddScoped<IBillRepositoryEF, BillRepositoryEF>();
builder.Services.AddScoped<IUnitOfWorkEF, UnitOfWorkEF>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddHostedService<BankTransferTimeoutWorker>();
builder.Services.AddHostedService<RubyPromotionsRunner>();

// JWT Authentication
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

// Auto migrate database
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SQLServerDbContext>();
    db.Database.EnsureCreated();
    await ShopFeatureDatabaseBootstrapper.EnsureAsync(db);
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

Console.WriteLine("BaseCore API Service running on port 5001");
Console.WriteLine("Endpoints: /api/products, /api/categories, /api/orders");
app.Run();


