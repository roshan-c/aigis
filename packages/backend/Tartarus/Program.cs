using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
using Serilog;
using Serilog.Events;
using Serilog.Formatting.Compact;
using Tartarus.Data;
using Tartarus.Middleware;
using Tartarus.Plugins;
using Tartarus.Services;

// Load .env file from project root (walks up to find it)
Env.TraversePath().Load();

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File(
        new CompactJsonFormatter(),
        "logs/tartarus-.json",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30)
    .CreateLogger();

try
{
    Log.Information("Starting Tartarus API");

    var builder = WebApplication.CreateBuilder(args);

    // Use Serilog
    builder.Host.UseSerilog();

    // Configuration from environment variables
    var openRouterApiBase = Environment.GetEnvironmentVariable("OPENROUTER_API_BASE") ?? "https://openrouter.ai/api/v1";
    var openRouterApiKey = Environment.GetEnvironmentVariable("OPENROUTER_API_KEY")
        ?? throw new InvalidOperationException("OPENROUTER_API_KEY environment variable is required");
    var aiModel = Environment.GetEnvironmentVariable("AI_MODEL") ?? "openai/gpt-4o-mini";

    // Database configuration
    var postgresHost = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "localhost";
    var postgresPort = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
    var postgresDb = Environment.GetEnvironmentVariable("POSTGRES_DB") ?? "aigis";
    var postgresUser = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "postgres";
    var postgresPassword = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "postgres";

    var connectionString = $"Host={postgresHost};Port={postgresPort};Database={postgresDb};Username={postgresUser};Password={postgresPassword}";

    // Add DbContext with pgvector support
    builder.Services.AddDbContext<TartarusDbContext>(options =>
        options.UseNpgsql(connectionString, o => o.UseVector()));

    // Build the Semantic Kernel
    #pragma warning disable SKEXP0010
    var kernel = Kernel.CreateBuilder()
        .AddOpenAIChatCompletion(
            modelId: aiModel,
            apiKey: openRouterApiKey,
            endpoint: new Uri(openRouterApiBase))
        .Build();
    #pragma warning restore SKEXP0010

    builder.Services.AddSingleton(kernel);

    // Add services
    builder.Services.AddSingleton<EmbeddingService>();
    builder.Services.AddScoped<ChatService>();
    builder.Services.AddScoped<MessageService>();

    // Add controllers
    builder.Services.AddControllers();

    var app = builder.Build();

    // Apply migrations on startup
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<TartarusDbContext>();
        Log.Information("Applying database migrations...");
        dbContext.Database.Migrate();
        Log.Information("Database migrations applied successfully");
    }

    // Register RAG plugin with the kernel (using IServiceProvider for scoped dependencies)
    kernel.Plugins.AddFromObject(new RagSearchPlugin(app.Services), "rag");

    // Configure middleware pipeline
    app.UseSerilogRequestLogging();
    app.UseApiKeyAuth();
    app.MapControllers();

    var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
    Log.Information("Tartarus API starting on port {Port}", port);

    app.Run($"http://localhost:{port}");
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
