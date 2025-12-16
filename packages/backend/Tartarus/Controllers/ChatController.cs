using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Tartarus.Models;
using Tartarus.Services;

namespace Tartarus.Controllers;

[ApiController]
[Route("[controller]")]
public class ChatController : ControllerBase
{
    private readonly ChatService _chatService;
    private readonly ILogger<ChatController> _logger;

    public ChatController(ChatService chatService, ILogger<ChatController> logger)
    {
        _chatService = chatService;
        _logger = logger;
    }

    [HttpPost("/chat")]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request)
    {
        var stopwatch = Stopwatch.StartNew();
        var clientName = HttpContext.Items["ClientName"]?.ToString() ?? "unknown";

        _logger.LogInformation(
            "Chat request from {ClientName} - User: {UserId}, Channel: {ChannelId}, Message: {Message}",
            clientName,
            request.UserId,
            request.ChannelId,
            request.Message[..Math.Min(100, request.Message.Length)]);

        try
        {
            // For Phase 1, we don't have context yet - will be added in Phase 2
            var response = await _chatService.GenerateResponseAsync(request.Message);

            stopwatch.Stop();

            _logger.LogInformation(
                "Chat response generated in {ElapsedMs}ms for {ClientName}",
                stopwatch.ElapsedMilliseconds,
                clientName);

            return Ok(new ChatResponse
            {
                Response = response,
                ProcessingTimeMs = stopwatch.ElapsedMilliseconds
            });
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            
            _logger.LogError(ex,
                "Chat request failed for {ClientName} after {ElapsedMs}ms",
                clientName,
                stopwatch.ElapsedMilliseconds);

            return StatusCode(500, new ErrorResponse
            {
                Error = "Failed to generate response",
                Code = "CHAT_FAILED"
            });
        }
    }
}
