using Pgvector;

namespace Tartarus.Data.Entities;

public class Message
{
    public long Id { get; set; }
    public required string ExternalMessageId { get; set; }
    public required string ChannelId { get; set; }
    public string? GuildId { get; set; }
    public required string UserId { get; set; }
    public required string AuthorName { get; set; }
    public required string Content { get; set; }
    public required string Role { get; set; } // "user" or "assistant"
    public Vector? Embedding { get; set; } // 1536 dimensions for text-embedding-3-small
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
