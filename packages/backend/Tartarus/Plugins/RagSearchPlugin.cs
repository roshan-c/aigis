using System.ComponentModel;
using Microsoft.SemanticKernel;
using Tartarus.Services;

namespace Tartarus.Plugins;

public class RagSearchPlugin
{
    private readonly IServiceProvider _serviceProvider;

    public RagSearchPlugin(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    [KernelFunction("search_memories")]
    [Description("Search through past conversation memories to find relevant information. Use this when a user asks about something that might have been discussed before, or when you need historical context.")]
    public async Task<string> SearchMemoriesAsync(
        [Description("The search query to find relevant past conversations")] string query,
        [Description("Optional: limit results to a specific channel ID")] string? channelId = null,
        [Description("Maximum number of results to return (default: 5)")] int limit = 5)
    {
        // Create a scope to resolve the scoped MessageService
        using var scope = _serviceProvider.CreateScope();
        var messageService = scope.ServiceProvider.GetRequiredService<MessageService>();
        
        var messages = await messageService.SemanticSearchAsync(query, limit, channelId);

        if (messages.Count == 0)
        {
            return "No relevant memories found.";
        }

        var results = messages.Select(m =>
            $"[{m.CreatedAt:yyyy-MM-dd HH:mm}] {m.AuthorName}: {m.Content}");

        return $"Found {messages.Count} relevant memories:\n\n" + string.Join("\n\n", results);
    }
}
