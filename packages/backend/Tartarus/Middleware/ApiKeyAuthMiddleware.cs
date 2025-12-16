using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Tartarus.Data;

namespace Tartarus.Middleware;

public class ApiKeyAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiKeyAuthMiddleware> _logger;
    private readonly string? _adminApiKey;

    private static readonly HashSet<string> PublicPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/health"
    };

    private static readonly HashSet<string> AdminOnlyPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/api-keys"
    };

    public ApiKeyAuthMiddleware(
        RequestDelegate next,
        ILogger<ApiKeyAuthMiddleware> logger,
        IConfiguration configuration)
    {
        _next = next;
        _logger = logger;
        // Check environment variable first, then configuration
        _adminApiKey = Environment.GetEnvironmentVariable("ADMIN_API_KEY") 
            ?? configuration["ADMIN_API_KEY"];
    }

    public async Task InvokeAsync(HttpContext context, TartarusDbContext dbContext)
    {
        var path = context.Request.Path.Value ?? "";

        // Allow public paths without auth
        if (PublicPaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            await _next(context);
            return;
        }

        // Get API key from header
        if (!context.Request.Headers.TryGetValue("X-API-Key", out var apiKeyHeader))
        {
            _logger.LogWarning("Request to {Path} missing API key", path);
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "Missing API key", code = "UNAUTHORIZED" });
            return;
        }

        var apiKey = apiKeyHeader.ToString();

        // Check if this is an admin-only path
        if (AdminOnlyPaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            if (string.IsNullOrEmpty(_adminApiKey))
            {
                _logger.LogError("Admin API key not configured but admin endpoint accessed");
                context.Response.StatusCode = 503;
                await context.Response.WriteAsJsonAsync(new { error = "Admin API key not configured", code = "SERVICE_UNAVAILABLE" });
                return;
            }

            if (!CryptographicOperations.FixedTimeEquals(
                System.Text.Encoding.UTF8.GetBytes(apiKey),
                System.Text.Encoding.UTF8.GetBytes(_adminApiKey)))
            {
                _logger.LogWarning("Invalid admin API key used for {Path}", path);
                context.Response.StatusCode = 401;
                await context.Response.WriteAsJsonAsync(new { error = "Invalid API key", code = "UNAUTHORIZED" });
                return;
            }

            // Admin authenticated
            context.Items["ClientName"] = "admin";
            await _next(context);
            return;
        }

        // For regular paths, validate against database
        var client = await dbContext.ApiClients
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ApiKey == apiKey && c.IsActive);

        if (client == null)
        {
            _logger.LogWarning("Invalid or inactive API key used for {Path}", path);
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid or inactive API key", code = "UNAUTHORIZED" });
            return;
        }

        // Store client info for logging
        context.Items["ClientName"] = client.Name;
        context.Items["ClientId"] = client.Id;

        _logger.LogInformation("Request from client {ClientName} to {Path}", client.Name, path);

        await _next(context);
    }
}

public static class ApiKeyAuthMiddlewareExtensions
{
    public static IApplicationBuilder UseApiKeyAuth(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<ApiKeyAuthMiddleware>();
    }
}
