/**
 * Mock Discord Bot
 * 
 * This simulates a Discord bot frontend that communicates with the .NET backend.
 * In a real implementation, this would use discord.js and handle actual Discord events.
 */

const BACKEND_URL = "http://localhost:5000";

interface ChatRequest {
  Message: string;
  UserId: string;
  ChannelId: string;
}

interface ChatResponse {
  response: string;
}

async function sendToBackend(message: string, userId: string, channelId: string): Promise<string> {
  const request: ChatRequest = {
    Message: message,
    UserId: userId,
    ChannelId: channelId,
  };

  const response = await fetch(`${BACKEND_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ChatResponse;
  return data.response;
}

async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

// Simulate Discord bot behavior
async function simulateDiscordMessage(username: string, message: string) {
  const userId = `user_${Math.random().toString(36).substring(7)}`;
  const channelId = "mock-channel-123";

  console.log(`\n[Discord] ${username}: ${message}`);
  console.log("[Discord] Bot is typing...");

  try {
    const response = await sendToBackend(message, userId, channelId);
    console.log(`[Discord] Bot: ${response}`);
  } catch (error) {
    console.error(`[Discord] Error: ${error}`);
  }
}

// Main
async function main() {
  console.log("=".repeat(50));
  console.log("Mock Discord Bot - Frontend Example");
  console.log("=".repeat(50));

  // Check if backend is running
  console.log("\nChecking backend health...");
  const isHealthy = await checkBackendHealth();

  if (!isHealthy) {
    console.error("\nBackend is not running!");
    console.log("Start the backend first with:");
    console.log("  cd packages/backend/example/Example && dotnet run");
    process.exit(1);
  }

  console.log("Backend is healthy!\n");

  // Simulate some Discord messages
  const testMessages = [
    { user: "Alice", message: "What is 2 + 2?" },
    { user: "Bob", message: "Tell me a short joke" },
    { user: "Charlie", message: "What's the weather like? (just make something up)" },
  ];

  for (const { user, message } of testMessages) {
    await simulateDiscordMessage(user, message);
    console.log("-".repeat(50));
  }
}

main();
