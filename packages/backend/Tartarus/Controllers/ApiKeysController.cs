using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tartarus.Data;
using Tartarus.Data.Entities;
using Tartarus.Models;

namespace Tartarus.Controllers;

[ApiController]
[Route("api-keys")]
public class ApiKeysController : ControllerBase
{
    private readonly TartarusDbContext _dbContext;
    private readonly ILogger<ApiKeysController> _logger;

    public ApiKeysController(TartarusDbContext dbContext, ILogger<ApiKeysController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> CreateApiKey([FromBody] CreateApiKeyRequest request)
    {
        _logger.LogInformation("Creating API key for client: {Name}", request.Name);

        // Check if name already exists
        var existingClient = await _dbContext.ApiClients
            .FirstOrDefaultAsync(c => c.Name == request.Name);

        if (existingClient != null)
        {
            return BadRequest(new ErrorResponse
            {
                Error = $"Client with name '{request.Name}' already exists",
                Code = "DUPLICATE_NAME"
            });
        }

        // Generate secure API key with trt_ prefix
        var apiKey = $"trt_{GenerateSecureKey()}";

        var client = new ApiClient
        {
            Name = request.Name,
            ApiKey = apiKey,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.ApiClients.Add(client);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Created API key for client: {Name} (ID: {Id})", client.Name, client.Id);

        return Ok(new CreateApiKeyResponse
        {
            Id = client.Id,
            Name = client.Name,
            ApiKey = apiKey, // Only returned once!
            CreatedAt = client.CreatedAt
        });
    }

    [HttpGet]
    public async Task<IActionResult> ListApiKeys()
    {
        var clients = await _dbContext.ApiClients
            .OrderBy(c => c.Name)
            .Select(c => new ApiClientDto
            {
                Id = c.Id,
                Name = c.Name,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();

        return Ok(new ApiClientsListResponse { Clients = clients });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeactivateApiKey(int id)
    {
        var client = await _dbContext.ApiClients.FindAsync(id);

        if (client == null)
        {
            return NotFound(new ErrorResponse
            {
                Error = $"Client with ID {id} not found",
                Code = "NOT_FOUND"
            });
        }

        client.IsActive = false;
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Deactivated API key for client: {Name} (ID: {Id})", client.Name, client.Id);

        return Ok(new { message = $"API key for '{client.Name}' has been deactivated" });
    }

    private static string GenerateSecureKey()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes)
            .Replace("+", "")
            .Replace("/", "")
            .Replace("=", "")
            [..32];
    }
}
