namespace Tartarus.Models;

public class ApiClientDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ApiClientsListResponse
{
    public required List<ApiClientDto> Clients { get; set; }
}
