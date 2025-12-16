using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Pgvector;

namespace Tartarus.Services;

public class EmbeddingService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<EmbeddingService> _logger;
    private readonly string _model;

    public EmbeddingService(ILogger<EmbeddingService> logger, IConfiguration configuration)
    {
        _logger = logger;

        var apiKey = Environment.GetEnvironmentVariable("OPENROUTER_API_KEY")
            ?? throw new InvalidOperationException("OPENROUTER_API_KEY is required");
        var apiBase = Environment.GetEnvironmentVariable("OPENROUTER_API_BASE") ?? "https://openrouter.ai/api/v1";
        _model = Environment.GetEnvironmentVariable("EMBEDDING_MODEL") ?? "openai/text-embedding-3-small";

        // Ensure base address ends with trailing slash for proper URI resolution
        if (!apiBase.EndsWith('/'))
        {
            apiBase += "/";
        }

        _httpClient = new HttpClient
        {
            BaseAddress = new Uri(apiBase)
        };
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public async Task<Vector?> GetEmbeddingAsync(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            _logger.LogWarning("Empty text provided for embedding");
            return null;
        }

        try
        {
            var request = new EmbeddingRequest
            {
                Model = _model,
                Input = text
            };

            var json = JsonSerializer.Serialize(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("embeddings", content);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError(
                    "Embedding API request failed with status {StatusCode}: {Error}",
                    response.StatusCode,
                    errorContent);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            var embeddingResponse = JsonSerializer.Deserialize<EmbeddingResponse>(responseJson);

            if (embeddingResponse?.Data == null || embeddingResponse.Data.Count == 0)
            {
                _logger.LogError("No embedding data returned from API");
                return null;
            }

            var embedding = embeddingResponse.Data[0].Embedding;
            _logger.LogDebug("Generated embedding with {Dimensions} dimensions", embedding.Length);

            return new Vector(embedding);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate embedding for text");
            return null;
        }
    }

    private class EmbeddingRequest
    {
        [JsonPropertyName("model")]
        public required string Model { get; set; }

        [JsonPropertyName("input")]
        public required string Input { get; set; }
    }

    private class EmbeddingResponse
    {
        [JsonPropertyName("data")]
        public List<EmbeddingData>? Data { get; set; }
    }

    private class EmbeddingData
    {
        [JsonPropertyName("embedding")]
        public float[] Embedding { get; set; } = [];
    }
}
