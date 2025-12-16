using Microsoft.SemanticKernel;

// Configuration - replace these with your actual values
var endpoint = "https://openrouter.ai/api/v1"; // or Azure OpenAI endpoint
var apiKey = "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";
var modelId = "x-ai/grok-4.1-fast"; // or your preferred model

// Build the kernel
var builder = Kernel.CreateBuilder();

// Option 1: OpenAI-compatible endpoint (OpenRouter, local LLMs, etc.)
#pragma warning disable SKEXP0010 // Suppress experimental API warning
builder.AddOpenAIChatCompletion(
    modelId: modelId,
    apiKey: apiKey,
    endpoint: new Uri(endpoint)
);
#pragma warning restore SKEXP0010

// Option 2: If using Azure OpenAI, use this instead:
// builder.AddAzureOpenAIChatCompletion(
//     deploymentName: "your-deployment-name",
//     endpoint: endpoint,
//     apiKey: apiKey
// );

var kernel = builder.Build();

// Send a prompt and get a response
var prompt = "What is the capital of France? Answer in one sentence.";

Console.WriteLine($"Prompt: {prompt}");
Console.WriteLine("Thinking...\n");

var response = await kernel.InvokePromptAsync(prompt);

Console.WriteLine($"Response: {response}");
