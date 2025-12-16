using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using Tartarus.Plugins;

namespace Tartarus.Services;

public class ChatService
{
    private readonly Kernel _kernel;
    private readonly ILogger<ChatService> _logger;
    private readonly string _systemPrompt;

    public ChatService(
        Kernel kernel,
        ILogger<ChatService> logger,
        IConfiguration configuration)
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
        var chatCompletionService = _kernel.GetRequiredService<IChatCompletionService>();
        
        // Build chat history
        var chatHistory = new ChatHistory();
        chatHistory.AddSystemMessage(_systemPrompt);

        if (!string.IsNullOrWhiteSpace(context))
        {
            chatHistory.AddSystemMessage($"## Recent Conversation Context\n{context}");
        }

        chatHistory.AddUserMessage(message);
        
        _logger.LogDebug("Generating response for message: {Message}", message[..Math.Min(100, message.Length)]);

        // Enable automatic function calling
        var executionSettings = new OpenAIPromptExecutionSettings
        {
            FunctionChoiceBehavior = FunctionChoiceBehavior.Auto()
        };

        var result = await chatCompletionService.GetChatMessageContentAsync(
            chatHistory,
            executionSettings,
            _kernel);

        var response = result.Content ?? string.Empty;

        _logger.LogDebug("Generated response: {Response}", response[..Math.Min(100, response.Length)]);

        return response;
    }
}
