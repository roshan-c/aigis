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
    private readonly MessageService _messageService;
    private readonly ILogger<ChatController> _logger;

    public ChatController(
        ChatService chatService,
        MessageService messageService,
        ILogger<ChatController> logger)
    {
        _chatService = chatService;
        _messageService = messageService;
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
            // Save the user's message
            await _messageService.SaveMessageAsync(
                externalMessageId: request.MessageId,
                channelId: request.ChannelId,
                guildId: request.GuildId,
                userId: request.UserId,
                authorName: request.AuthorName,
                content: request.Message,
                role: "user");

            // Get recent messages for context
            var recentMessages = await _messageService.GetRecentMessagesAsync(
                request.ChannelId,
                request.ContextLimit);
            var context = _messageService.BuildContextFromMessages(recentMessages);

            // Generate AI response with context
            var response = await _chatService.GenerateResponseAsync(request.Message, context);

            // Save the bot's response (generate a unique ID for the response)
            var responseMessageId = $"bot-{request.MessageId}";
            await _messageService.SaveMessageAsync(
                externalMessageId: responseMessageId,
                channelId: request.ChannelId,
                guildId: request.GuildId,
                userId: "aigis-bot",
                authorName: "Aigis",
                content: response,
                role: "assistant");

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
