namespace Tartarus.Models;

public class CreateApiKeyResponse
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string ApiKey { get; set; }
    public DateTime CreatedAt { get; set; }
}
