using Microsoft.EntityFrameworkCore;
using Pgvector;
using Pgvector.EntityFrameworkCore;
using Tartarus.Data;
using Tartarus.Data.Entities;

namespace Tartarus.Services;

public class MessageService
{
    private readonly TartarusDbContext _dbContext;
    private readonly EmbeddingService _embeddingService;
    private readonly ILogger<MessageService> _logger;

    public MessageService(
        TartarusDbContext dbContext,
        EmbeddingService embeddingService,
        ILogger<MessageService> logger)
    {
        _dbContext = dbContext;
        _embeddingService = embeddingService;
        _logger = logger;
    }

    public async Task<Message> SaveMessageAsync(
        string externalMessageId,
        string channelId,
        string? guildId,
        string userId,
        string authorName,
        string content,
        string role)
    {
        // Generate embedding for the message content
        var embedding = await _embeddingService.GetEmbeddingAsync(content);

        var message = new Message
        {
            ExternalMessageId = externalMessageId,
            ChannelId = channelId,
            GuildId = guildId,
            UserId = userId,
            AuthorName = authorName,
            Content = content,
            Role = role,
            Embedding = embedding
        };

        _dbContext.Messages.Add(message);
        await _dbContext.SaveChangesAsync();

        _logger.LogDebug(
            "Saved message {ExternalMessageId} from {AuthorName} in channel {ChannelId} (embedding: {HasEmbedding})",
            externalMessageId, authorName, channelId, embedding != null);

        return message;
    }

    public async Task<List<Message>> GetRecentMessagesAsync(string channelId, int limit = 10)
    {
        var messages = await _dbContext.Messages
            .Where(m => m.ChannelId == channelId)
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit)
            .ToListAsync();

        // Return in chronological order for context building
        messages.Reverse();

        _logger.LogDebug(
            "Retrieved {Count} recent messages from channel {ChannelId}",
            messages.Count, channelId);

        return messages;
    }

    public async Task<List<Message>> SemanticSearchAsync(string query, int limit = 5, string? channelId = null)
    {
        var queryEmbedding = await _embeddingService.GetEmbeddingAsync(query);
        if (queryEmbedding == null)
        {
            _logger.LogWarning("Failed to generate embedding for search query");
            return [];
        }

        var messagesQuery = _dbContext.Messages
            .Where(m => m.Embedding != null);

        if (!string.IsNullOrEmpty(channelId))
        {
            messagesQuery = messagesQuery.Where(m => m.ChannelId == channelId);
        }

        var messages = await messagesQuery
            .OrderBy(m => m.Embedding!.CosineDistance(queryEmbedding))
            .Take(limit)
            .ToListAsync();

        _logger.LogDebug(
            "Semantic search for '{Query}' returned {Count} results",
            query[..Math.Min(50, query.Length)], messages.Count);

        return messages;
    }

    public string BuildContextFromMessages(List<Message> messages)
    {
        if (messages.Count == 0)
            return string.Empty;

        var contextLines = messages.Select(m =>
            $"[{m.Role}] {m.AuthorName}: {m.Content}");

        return string.Join("\n", contextLines);
    }
}
