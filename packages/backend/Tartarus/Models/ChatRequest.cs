namespace Tartarus.Models;

public class ChatRequest
{
    public required string Message { get; set; }
    public required string UserId { get; set; }
    public required string ChannelId { get; set; }
    public string? GuildId { get; set; }
    public required string MessageId { get; set; }
    public required string AuthorName { get; set; }
    public int ContextLimit { get; set; } = 10;
}
