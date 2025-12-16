using Microsoft.SemanticKernel;

namespace Tartarus.Services;

public class ChatService
{
    private readonly Kernel _kernel;
    private readonly ILogger<ChatService> _logger;
    private readonly string _systemPrompt;

    public ChatService(Kernel kernel, ILogger<ChatService> logger, IConfiguration configuration)
    {
        _kernel = kernel;
        _logger = logger;
        
        // Load system prompt from file
        var promptPath = Path.Combine(AppContext.BaseDirectory, "AI", "SystemPrompt.md");
        if (File.Exists(promptPath))
        {
            _systemPrompt = File.ReadAllText(promptPath);
        }
        else
        {
            _logger.LogWarning("SystemPrompt.md not found at {Path}, using default", promptPath);
            _systemPrompt = "You are a helpful AI assistant.";
        }
    }

    public async Task<string> GenerateResponseAsync(string message, string? context = null)
    {
        var prompt = BuildPrompt(message, context);
        
        _logger.LogDebug("Generating response for prompt: {Prompt}", prompt[..Math.Min(100, prompt.Length)]);

        var result = await _kernel.InvokePromptAsync(prompt);
        var response = result.ToString();

        _logger.LogDebug("Generated response: {Response}", response[..Math.Min(100, response.Length)]);

        return response;
    }

    private string BuildPrompt(string message, string? context)
    {
        var parts = new List<string> { _systemPrompt };

        if (!string.IsNullOrWhiteSpace(context))
        {
            parts.Add($"\n\n## Context\n{context}");
        }

        parts.Add($"\n\n## Current Message\n{message}");

        return string.Join("", parts);
    }
}
