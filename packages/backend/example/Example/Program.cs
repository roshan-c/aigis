using Microsoft.SemanticKernel;
using DotNetEnv;

// Load .env file from project root (walks up to find it)
Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

// Configuration from environment variables
var endpoint = Environment.GetEnvironmentVariable("OPENROUTER_API_BASE") ?? "https://openrouter.ai/api/v1";
var apiKey = Environment.GetEnvironmentVariable("OPENROUTER_API_KEY") 
    ?? throw new InvalidOperationException("OPENROUTER_API_KEY environment variable is required");
var modelId = Environment.GetEnvironmentVariable("AI_MODEL") ?? "openai/gpt-4o-mini";

// Build the kernel and register as singleton
#pragma warning disable SKEXP0010
var kernel = Kernel.CreateBuilder()
    .AddOpenAIChatCompletion(
        modelId: modelId,
        apiKey: apiKey,
        endpoint: new Uri(endpoint)
    )
    .Build();
#pragma warning restore SKEXP0010

builder.Services.AddSingleton(kernel);

var app = builder.Build();

// Chat endpoint
app.MapPost("/chat", async (ChatRequest request, Kernel kernel) =>
{
    Console.WriteLine($"[Backend] Received message from {request.UserId}: {request.Message}");
    
    var response = await kernel.InvokePromptAsync(request.Message);
    var responseText = response.ToString();
    
    Console.WriteLine($"[Backend] Sending response: {responseText[..Math.Min(50, responseText.Length)]}...");
    
    return Results.Ok(new ChatResponse(responseText));
});

// Health check
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

Console.WriteLine("Backend API running on http://localhost:5000");
app.Run("http://localhost:5000");

// Request/Response models
record ChatRequest(string Message, string UserId, string ChannelId);
record ChatResponse(string Response);
