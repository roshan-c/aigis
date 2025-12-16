namespace Tartarus.Models;

public class ChatResponse
{
    public required string Response { get; set; }
    public long ProcessingTimeMs { get; set; }
}
