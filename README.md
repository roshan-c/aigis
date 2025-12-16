# Aigis (+ Tartarus)

An AI-powered Discord companion that role-plays as Aigis from *Persona 3*. Built with a microservices architecture featuring a .NET backend API (Tartarus) and a lightweight Discord bot frontend.

---

## Architecture

```
┌─────────────────┐     ┌─────────────────────────────────────┐     ┌──────────────┐
│   Discord Bot   │────▶│           Tartarus API              │────▶│  PostgreSQL  │
│   (Bun/TS)      │     │           (.NET 10)                 │     │  + pgvector  │
└─────────────────┘     │                                     │     └──────────────┘
                        │  • Chat endpoint with context       │
                        │  • RAG search (semantic memory)     │            │
                        │  • Embeddings (OpenRouter)          │            ▼
                        │  • Quote tool (circuit breaker)     │     ┌──────────────┐
                        │  • API key management               │     │  OpenRouter  │
                        └─────────────────────────────────────┘     │     API      │
                                                                    └──────────────┘
```

### Components

| Component | Location | Description |
|-----------|----------|-------------|
| **Tartarus API** | `packages/backend/Tartarus/` | .NET backend handling AI, database, and business logic |
| **Discord Bot** | `apps/discord-bot/` | Thin client that forwards messages to Tartarus |
| **Tartarus SDK** | `packages/tartarus-sdk/` | TypeScript SDK for building Tartarus clients |

---

## Features

- **Semantic Memory (RAG)** — Messages stored with 1,536-dimensional embeddings for semantic search via pgvector
- **Tool Calling** — Semantic Kernel plugins for memory search, quotes, and extensible tools
- **Circuit Breaker** — Polly-based resilience for external API calls
- **Multi-client Support** — API key authentication enables multiple frontends (Discord, Slack, web, etc.)
- **Persona System** — Configurable system prompt for in-character responses

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) 1.2+
- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Docker](https://www.docker.com/)
- Discord bot token with *Message Content* intent
- [OpenRouter](https://openrouter.ai/) API key

### 1. Start PostgreSQL with pgvector

```bash
docker run -d \
  --name aigis-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=aigis \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your keys
```

Required variables:
```bash
# OpenRouter (used by Tartarus)
OPENROUTER_API_KEY=your_key_here

# Tartarus admin key (for managing API keys)
ADMIN_API_KEY=your_admin_key_here

# Discord bot
DISCORD_TOKEN=your_discord_token_here
TARTARUS_API_KEY=  # Will be created in step 4
```

### 3. Start Tartarus API

```bash
cd packages/backend/Tartarus
dotnet run
```

The API starts on `http://localhost:5000`. Migrations apply automatically.

### 4. Create a Client API Key

```bash
curl -X POST http://localhost:5000/api-keys \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_ADMIN_KEY" \
  -d '{"name": "discord-bot"}'
```

Copy the returned `apiKey` (starts with `trt_`) to your `.env` as `TARTARUS_API_KEY`.

### 5. Start Discord Bot

```bash
cd apps/discord-bot
bun install
bun run dev
```

### 6. Test

Mention the bot in Discord:
```
@Aigis Hello!
@Aigis What did we talk about yesterday?
@Aigis Give me an inspirational quote
```

---

## Project Structure

```
.
├── apps/
│   └── discord-bot/           # Discord bot (Bun/TypeScript)
│       └── src/
│           └── discord/
│               ├── bot.ts
│               └── embedBuilder/
├── packages/
│   ├── backend/
│   │   └── Tartarus/          # .NET API
│   │       ├── Controllers/
│   │       ├── Services/
│   │       ├── Plugins/       # Semantic Kernel tools
│   │       ├── Data/          # EF Core entities
│   │       └── AI/            # System prompt
│   └── tartarus-sdk/          # TypeScript SDK
│       └── src/
│           ├── client.ts
│           ├── types.ts
│           └── index.ts
└── .env.example
```

---

## Tartarus API

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | None | Health check |
| `POST` | `/chat` | API Key | Send message, get AI response |
| `POST` | `/api-keys` | Admin | Create new API key |
| `GET` | `/api-keys` | Admin | List all API keys |
| `DELETE` | `/api-keys/{id}` | Admin | Deactivate an API key |

### Chat Request

```json
{
  "message": "Hello!",
  "userId": "123456789",
  "channelId": "987654321",
  "guildId": "optional-guild-id",
  "messageId": "unique-message-id",
  "authorName": "Username",
  "contextLimit": 10
}
```

### Chat Response

```json
{
  "response": "Greetings. I am Aigis, a weapon designed to...",
  "processingTimeMs": 1234
}
```

---

## Using the SDK

Install in your project:
```bash
bun add @aigis/tartarus-sdk
```

Usage:
```typescript
import { TartarusClient, TartarusError } from "@aigis/tartarus-sdk";

const client = new TartarusClient({
  baseUrl: "http://localhost:5000",
  apiKey: "trt_your_api_key",
});

// Send a chat message
const response = await client.chat({
  message: "Hello!",
  userId: "123",
  channelId: "456",
  messageId: "789",
  authorName: "User",
});
console.log(response.response);

// Health check
const healthy = await client.isHealthy();

// Error handling
try {
  await client.chat({ ... });
} catch (err) {
  if (err instanceof TartarusError) {
    console.error(`${err.code}: ${err.message}`);
  }
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCORD_TOKEN` | ✅ | — | Discord bot token |
| `OPENROUTER_API_KEY` | ✅ | — | OpenRouter API key |
| `ADMIN_API_KEY` | ✅ | — | Admin key for `/api-keys` endpoints |
| `TARTARUS_API_KEY` | ✅ | — | Client API key for Discord bot |
| `TARTARUS_URL` | ❌ | `http://localhost:5000` | Tartarus API URL |
| `AI_MODEL` | ❌ | `openai/gpt-4o-mini` | Chat model ID |
| `EMBEDDING_MODEL` | ❌ | `openai/text-embedding-3-small` | Embedding model ID |
| `POSTGRES_HOST` | ❌ | `localhost` | PostgreSQL host |
| `POSTGRES_PORT` | ❌ | `5432` | PostgreSQL port |
| `POSTGRES_DB` | ❌ | `aigis` | Database name |
| `POSTGRES_USER` | ❌ | `postgres` | Database user |
| `POSTGRES_PASSWORD` | ❌ | `postgres` | Database password |

---

## Extending Tartarus

### Adding a New Tool

1. Create a plugin in `packages/backend/Tartarus/Plugins/`:

```csharp
using System.ComponentModel;
using Microsoft.SemanticKernel;

public class MyPlugin
{
    [KernelFunction("my_function")]
    [Description("Description for the AI to understand when to use this")]
    public async Task<string> MyFunctionAsync(
        [Description("Parameter description")] string input)
    {
        // Implementation
        return "Result";
    }
}
```

2. Register in `Program.cs`:
```csharp
kernel.Plugins.AddFromObject(new MyPlugin(), "my_plugin");
```

### Modifying the Persona

Edit `packages/backend/Tartarus/AI/SystemPrompt.md` to change Aigis's personality and behavior.

---

## Development

### Tartarus API
```bash
cd packages/backend/Tartarus
dotnet watch run  # Hot reload
```

### Discord Bot
```bash
cd apps/discord-bot
bun run dev  # Hot reload
```

### SDK
```bash
cd packages/tartarus-sdk
bun run dev  # Watch mode
```

### Database Migrations

```bash
cd packages/backend/Tartarus
dotnet ef migrations add MigrationName
# Migrations apply automatically on startup
```

---

## Troubleshooting

**Bot not responding**
- Check Tartarus is running: `curl http://localhost:5000/health`
- Verify `TARTARUS_API_KEY` in `.env` matches a valid key

**Database connection failed**
- Ensure PostgreSQL is running: `docker ps | grep aigis-postgres`
- Check connection string in environment variables

**Embedding errors**
- Verify pgvector extension: `docker exec aigis-postgres psql -U postgres -d aigis -c "\dx"`
- Ensure embedding model returns 1536 dimensions

**API key rejected**
- Admin endpoints require `ADMIN_API_KEY`
- Client endpoints require a key created via `POST /api-keys`

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

> "I am Aigis. My mission is to protect you."
