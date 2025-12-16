using Microsoft.EntityFrameworkCore;
using Tartarus.Data;
using Tartarus.Data.Entities;

namespace Tartarus.Services;

public class MessageService
{
    private readonly TartarusDbContext _dbContext;
    private readonly ILogger<MessageService> _logger;

    public MessageService(TartarusDbContext dbContext, ILogger<MessageService> logger)
    {
        _dbContext = dbContext;
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
        var message = new Message
        {
            ExternalMessageId = externalMessageId,
            ChannelId = channelId,
            GuildId = guildId,
            UserId = userId,
            AuthorName = authorName,
            Content = content,
            Role = role
        };

        _dbContext.Messages.Add(message);
        await _dbContext.SaveChangesAsync();

        _logger.LogDebug(
            "Saved message {ExternalMessageId} from {AuthorName} in channel {ChannelId}",
            externalMessageId, authorName, channelId);

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

    public string BuildContextFromMessages(List<Message> messages)
    {
        if (messages.Count == 0)
            return string.Empty;

        var contextLines = messages.Select(m =>
            $"[{m.Role}] {m.AuthorName}: {m.Content}");

        return string.Join("\n", contextLines);
    }
}
