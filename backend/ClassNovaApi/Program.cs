using ClassNovaApi;
using ClassNovaApi.Data;
using ClassNovaApi.Models;
using ClassNovaApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.FileProviders;
using System.Text;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddOpenApi();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
           .UseSnakeCaseNamingConvention());

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "ClassNova API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Enter: Bearer {your token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
                Scheme = "oauth2",
                Name = "Bearer",
                In = ParameterLocation.Header
            },
            new List<string>()
        }
    });
});

builder.Services.AddControllers();

// Use SendGrid when an API key is configured; fall back to console logging otherwise
var sendGridKey = builder.Configuration["SendGrid:ApiKey"];
if (!string.IsNullOrWhiteSpace(sendGridKey))
    builder.Services.AddTransient<IEmailService, SendGridEmailService>();
else
    builder.Services.AddTransient<IEmailService, ConsoleEmailService>();

builder.Services.AddTransient<OtpService>();
builder.Services.AddTransient<PasswordResetService>();
builder.Services.AddTransient<BrandingService>();
builder.Services.AddTransient<TeacherAttendanceService>();
builder.Services.AddHostedService<TeacherAttendanceAutoCloseJob>();

if (builder.Environment.IsDevelopment())
    builder.Services.AddHostedService<AngularDevServerService>();

var key = Encoding.ASCII.GetBytes(builder.Configuration["Jwt:Key"]!);
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.MapInboundClaims = false; // preserve JWT claim names as-is (no URI remapping)
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
});

var app = builder.Build();

// Seed roles and navigation items on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    var seedRoles = new[]
    {
        new Role { Id = Guid.NewGuid(), Code = "PLATFORM_ADMIN", Name = "Platform Administrator" },
        new Role { Id = Guid.NewGuid(), Code = "ORG_ADMIN",      Name = "Organization Administrator" },
        new Role { Id = Guid.NewGuid(), Code = "TEACHER",        Name = "Teacher" },
        new Role { Id = Guid.NewGuid(), Code = "STUDENT",        Name = "Student" }
    };
    foreach (var role in seedRoles)
    {
        if (!db.Roles.Any(r => r.Code == role.Code))
            db.Roles.Add(role);
    }

    // NavigationItem rows are global (not per tenant).
    // IsAdminOnly  = true  → only ORG_ADMIN ever sees it; never shown in permission matrix.
    // IsLocked     = true  → cannot be toggled off; always shown to roles that have access.
    var seedNavItems = new[]
    {
        new ClassNovaApi.Models.NavigationItem { Key = "dashboard",  Label = "Dashboard",  Icon = "pi-home",            RoutePath = "dashboard",  SortOrder = 1, IsAdminOnly = false, IsLocked = true  },
        new ClassNovaApi.Models.NavigationItem { Key = "students",   Label = "Students",   Icon = "pi-users",           RoutePath = "students",   SortOrder = 2, IsAdminOnly = false, IsLocked = false },
        new ClassNovaApi.Models.NavigationItem { Key = "academic",   Label = "Academic",   Icon = "pi-book",            RoutePath = "academic",   SortOrder = 3, IsAdminOnly = false, IsLocked = false },
        new ClassNovaApi.Models.NavigationItem { Key = "attendance", Label = "Attendance", Icon = "pi-calendar-clock",  RoutePath = "attendance", SortOrder = 4, IsAdminOnly = false, IsLocked = false },
        new ClassNovaApi.Models.NavigationItem { Key = "fees",       Label = "Fees",       Icon = "pi-wallet",          RoutePath = "fees",       SortOrder = 5, IsAdminOnly = false, IsLocked = false },
        new ClassNovaApi.Models.NavigationItem { Key = "exams",      Label = "Exams",      Icon = "pi-file-edit",       RoutePath = "exams",      SortOrder = 6, IsAdminOnly = false, IsLocked = false },
        new ClassNovaApi.Models.NavigationItem { Key = "timetable",  Label = "Timetable",  Icon = "pi-calendar",        RoutePath = "timetable",  SortOrder = 7, IsAdminOnly = false, IsLocked = false },
        new ClassNovaApi.Models.NavigationItem { Key = "teachers",        Label = "Teachers",    Icon = "pi-graduation-cap",  RoutePath = "teachers",        SortOrder = 8,  IsAdminOnly = true,  IsLocked = false },
        new ClassNovaApi.Models.NavigationItem { Key = "teacher-profile", Label = "My Profile",  Icon = "pi-user",            RoutePath = "teacher-profile", SortOrder = 9,  IsAdminOnly = false, IsLocked = false },
        new ClassNovaApi.Models.NavigationItem { Key = "my-attendance",       Label = "My Attendance",      Icon = "pi-calendar-plus",  RoutePath = "my-attendance",       SortOrder = 10, IsAdminOnly = false, IsLocked = false },
        new ClassNovaApi.Models.NavigationItem { Key = "teacher-attendance",  Label = "Teacher Attendance", Icon = "pi-users",          RoutePath = "teacher-attendance",  SortOrder = 11, IsAdminOnly = true,  IsLocked = false },
        new ClassNovaApi.Models.NavigationItem { Key = "settings",            Label = "Settings",           Icon = "pi-cog",            RoutePath = "settings",            SortOrder = 12, IsAdminOnly = true,  IsLocked = true  },
    };
    foreach (var item in seedNavItems)
    {
        var existing = db.NavigationItems.Find(item.Key);
        if (existing == null)
            db.NavigationItems.Add(item);
        else
        {
            // Keep label/icon/route up to date on restart
            existing.Label        = item.Label;
            existing.Icon         = item.Icon;
            existing.RoutePath    = item.RoutePath;
            existing.SortOrder    = item.SortOrder;
            existing.IsAdminOnly  = item.IsAdminOnly;
            existing.IsLocked     = item.IsLocked;
        }
    }

    db.SaveChanges();
}

app.UseCors("AllowFrontend");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "ClassNova API v1"));
}

app.UseHttpsRedirection();

// Serve static files (uploaded photos) from wwwroot, creating it if absent
var webRootPath = app.Environment.WebRootPath
    ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");
Directory.CreateDirectory(webRootPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(webRootPath),
    RequestPath  = ""
});
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
