namespace Tartarus.Data.Entities;

public class ApiClient
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string ApiKey { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
