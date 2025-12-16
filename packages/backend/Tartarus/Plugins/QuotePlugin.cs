using System.ComponentModel;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.SemanticKernel;
using Polly;
using Polly.CircuitBreaker;

namespace Tartarus.Plugins;

public class QuotePlugin
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<QuotePlugin> _logger;
    private readonly AsyncCircuitBreakerPolicy<HttpResponseMessage> _circuitBreaker;

    public QuotePlugin(ILogger<QuotePlugin> logger)
    {
        _logger = logger;
        _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(10)
        };

        // Circuit breaker: open after 3 failures, stay open for 30 seconds
        _circuitBreaker = Policy<HttpResponseMessage>
            .Handle<HttpRequestException>()
            .OrResult(r => !r.IsSuccessStatusCode)
            .CircuitBreakerAsync(
                handledEventsAllowedBeforeBreaking: 3,
                durationOfBreak: TimeSpan.FromSeconds(30),
                onBreak: (outcome, breakDelay) =>
                {
                    _logger.LogWarning(
                        "Quote API circuit breaker opened for {BreakDuration}s due to: {Reason}",
                        breakDelay.TotalSeconds,
                        outcome.Exception?.Message ?? outcome.Result?.StatusCode.ToString());
                },
                onReset: () =>
                {
                    _logger.LogInformation("Quote API circuit breaker reset");
                },
                onHalfOpen: () =>
                {
                    _logger.LogInformation("Quote API circuit breaker half-open, testing...");
                });
    }

    [KernelFunction("get_random_quote")]
    [Description("Get a random inspirational or philosophical quote. Use this when a user asks for a quote, inspiration, or wisdom.")]
    public async Task<string> GetRandomQuoteAsync(
        [Description("Optional category: inspire, life, love, funny, art")] string? category = null)
    {
        try
        {
            if (_circuitBreaker.CircuitState == CircuitState.Open)
            {
                _logger.LogWarning("Quote API circuit breaker is open, returning fallback");
                return GetFallbackQuote();
            }

            var url = "https://zenquotes.io/api/random";
            
            var response = await _circuitBreaker.ExecuteAsync(async () =>
                await _httpClient.GetAsync(url));

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Quote API returned {StatusCode}", response.StatusCode);
                return GetFallbackQuote();
            }

            var json = await response.Content.ReadAsStringAsync();
            var quotes = JsonSerializer.Deserialize<List<ZenQuote>>(json);

            if (quotes == null || quotes.Count == 0)
            {
                return GetFallbackQuote();
            }

            var quote = quotes[0];
            _logger.LogDebug("Retrieved quote from {Author}", quote.Author);

            return $"\"{quote.Text}\" — {quote.Author}";
        }
        catch (BrokenCircuitException)
        {
            _logger.LogWarning("Quote API circuit breaker is open");
            return GetFallbackQuote();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch quote");
            return GetFallbackQuote();
        }
    }

    private static string GetFallbackQuote()
    {
        var fallbackQuotes = new[]
        {
            "\"The only way to do great work is to love what you do.\" — Steve Jobs",
            "\"In the middle of difficulty lies opportunity.\" — Albert Einstein",
            "\"It does not matter how slowly you go as long as you do not stop.\" — Confucius",
            "\"The future belongs to those who believe in the beauty of their dreams.\" — Eleanor Roosevelt",
            "\"I have not failed. I've just found 10,000 ways that won't work.\" — Thomas Edison"
        };

        return fallbackQuotes[Random.Shared.Next(fallbackQuotes.Length)];
    }

    private class ZenQuote
    {
        [JsonPropertyName("q")]
        public string Text { get; set; } = string.Empty;

        [JsonPropertyName("a")]
        public string Author { get; set; } = string.Empty;
    }
}
