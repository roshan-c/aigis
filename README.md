# Aigis

An AI-powered Discord companion that role-plays as Aigis from *Persona 3*. The bot uses Retrieval-Augmented Generation (RAG) backed by PostgreSQL + pgvector, OpenRouter language models, and Bun runtime tooling.

---

## Features at a glance

- **Agentic Discord bot** &mdash; Powered by the [Vercel AI SDK](https://sdk.vercel.ai/) using models from OpenRouter.
- **Retrieval-Augmented Generation** &mdash; Stores every message with a 1,536-dimensional vector and retrieves relevant history before answering.
- **Tool calling** &mdash; Built-in tools for weather lookups (sample), Fahrenheit→Celsius conversion, quote fetching, and semantic memory search (`ragSearch`).
- **Circuit breaker pattern** &mdash; Protects external API calls from cascading failures with automatic recovery.
- **Persona prompt** &mdash; The bot speaks in character using the prompt defined in `src/ai/system/SYSTEM.MD`.
- **Embeddable responses** &mdash; Long replies are automatically split into Discord embeds with context sections.

---

## Quick start

1. **Install dependencies**
   ```bash
   bun install
   ```
2. **Provision PostgreSQL with pgvector**
   ```bash
   docker build -t aigis-db -f src/database/Dockerfile .
   docker run -d \
     --name aigis-db \
     -p 5432:5432 \
     -e POSTGRES_PASSWORD=postgres \
     -v aigis-data:/var/lib/postgresql/data \
     aigis-db
   ```
3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env to add your Discord token and OpenRouter key
   ```
4. **Run the bot**
   ```bash
   bun run dev     # hot reload
   # or
   bun run start   # production-style run
   ```

The bot logs into Discord, seeds the database schema automatically, and starts responding to mentions in servers where it has access.

---

## Requirements

- [Bun](https://bun.sh) 1.2.22+
- [Docker](https://www.docker.com/) (or another PostgreSQL 16 instance with `pgvector`)
- Discord bot token with the *Message Content* intent enabled
- [OpenRouter](https://openrouter.ai/) API key

Optional:
- Custom reverse proxy for OpenRouter (set `OPENROUTER_API_BASE`)
- Alternative embedding model or vector dimension (see [Embeddings](#embeddings))

---

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DISCORD_TOKEN` | ✅ | — | Discord bot token used to authenticate the client |
| `OPENROUTER_API_KEY` | ✅ | — | OpenRouter key for both chat and embedding requests |
| `AI_MODEL` | ✅ | - | Chat model ID used for agent text generation |
| `OPENROUTER_API_BASE` | ❌ | `https://openrouter.ai/api/v1` | Override when routing through a proxy |
| `OPENROUTER_EMBEDDING_MODEL` | ❌ | `openai/text-embedding-3-small` | Embedding model ID used for pgvector storage |
| `EMBEDDING_VECTOR_DIMENSION` | ❌ | — | Expected embedding length; set if you change the table definition |

> **Note:** Database connection details currently default to `localhost:5432`, `postgres/postgres`, and database name `aigis`. Update `src/database/client.ts` if you need different credentials.

---

## Running the stack

### Database

- The container image at `src/database/Dockerfile` is based on `pgvector/pgvector:pg16` and ships with the extension installed.
- `initDatabase()` in `src/database/client.ts` creates the `messages` table and indexes at runtime. No manual migrations are needed for the base schema.

To inspect the database:

```bash
docker exec -it aigis-db psql -U postgres -d aigis
```

Within `psql`, useful queries include:

```sql
SELECT COUNT(*) FROM messages;
SELECT author_name, content, created_at FROM messages ORDER BY created_at DESC LIMIT 10;
```

### Bot process

- `bun run dev` uses Bun's hot reloading (`bun --hot`) for quick iteration.
- `bun run start` executes `src/discord/bot.ts` without hot reload.
- `bun run build` (via `bun build`) bundles the Discord bot into `dist/` if you need an optimized artifact.

The bot listens for message mentions, generates a reply via OpenRouter, stores both the user prompt and response as vectorized rows, and replies with rich Discord embeds.

---

## Architecture overview

1. **Discord entry point** (`src/discord/bot.ts`)
   - Listens for message mentions.
   - Persists each user message to PostgreSQL through `MessageRepository`.
   - Builds recent context (last 10 messages) plus optional RAG search results.
2. **Agent orchestration** (`src/ai/agent/agent.ts`)
   - Calls `generateText` with the system prompt, recent context, and available tools.
   - Uses OpenRouter's models for reasoning and tool calls.
3. **Embeddings** (`src/ai/embeddings/embeddings.ts`)
   - Requests embeddings from OpenRouter’s `/embeddings` endpoint.
   - Validates embedding length to protect against schema mismatches (see [Troubleshooting](#troubleshooting)).
4. **RAG tool** (`src/ai/tools/ragSearchTool.ts`)
   - Computes query embeddings, performs a pgvector cosine similarity search, and returns relevant snippets to the agent.

```
discord message -> store message + embedding -> build context -> agent decides tools -> OpenRouter response -> persist reply
```

### Relevant files

```
src/
├─ ai/
│  ├─ agent/agent.ts
│  ├─ embeddings/embeddings.ts
│  ├─ providers/openrouter.ts
│  ├─ system/SYSTEM.MD
│  └─ tools/...
├─ database/
│  ├─ client.ts
│  ├─ Dockerfile
│  └─ repositories/messageRepository.ts
├─ discord/bot.ts
├─ services/
│  └─ circuitBreaker/circuitBreaker.ts
└─ types/BotConfig.ts
```

---

## Circuit Breaker Pattern

The bot implements the **circuit breaker pattern** to protect against cascading failures when calling external APIs. This prevents the system from repeatedly attempting operations that are likely to fail, reducing unnecessary load and improving resilience.

### How it works

The circuit breaker has three states:

1. **CLOSED** (normal operation)
   - All requests pass through normally
   - Failures are counted
   - After reaching the failure threshold, transitions to OPEN

2. **OPEN** (failure mode)
   - Requests fail immediately without calling the external service
   - Returns fallback responses to prevent cascading failures
   - After the recovery timeout, transitions to HALF_OPEN

3. **HALF_OPEN** (recovery mode)
   - Allows a limited number of test requests through
   - If successful, transitions back to CLOSED
   - If failures continue, returns to OPEN

### Example: Quote Tool

The `quoteTool` (`src/ai/tools/quoteTool.ts`) demonstrates circuit breaker usage:

```typescript
import CircuitBreaker from "../../services/circuitBreaker/circuitBreaker";

// Initialize circuit breaker
// Parameters: failureThreshold, recoveryTimeout (ms), successThreshold
const quoteApiCircuitBreaker = new CircuitBreaker(3, 30000, 2);

export const quoteTool = tool({
  description: "Get an inspirational quote from an external API",
  inputSchema: z.object({
    category: z.string().optional()
  }),
  execute: async ({ category }) => {
    try {
      // Wrap API call in circuit breaker
      const result = await quoteApiCircuitBreaker.call(async () => {
        const response = await fetch("https://api.quotable.io/random", {
          signal: AbortSignal.timeout(5000),
        });
        
        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }
        
        const data = await response.json() as QuoteApiResponse;
        return {
          quote: data.content,
          author: data.author,
          category: category || "general",
        };
      });
      
      return result;
    } catch (error) {
      // Handle circuit open state
      if (error instanceof Error && error.message === "Circuit is open") {
        return {
          error: "Quote service is temporarily unavailable.",
          quote: "The circuit breaker is protecting the system.",
          author: "Circuit Breaker Pattern",
        };
      }
      
      // Fallback for other errors
      return {
        error: "Failed to fetch quote from API",
        quote: "In the face of adversity, resilience is our greatest strength.",
        author: "Fallback Quote",
      };
    }
  },
});
```

### Configuration parameters

- **failureThreshold** (3): Number of consecutive failures before opening the circuit
- **recoveryTimeout** (30000ms): Wait time before attempting recovery in HALF_OPEN state
- **successThreshold** (2): Number of successful calls required in HALF_OPEN to close the circuit

### When to use circuit breakers

Use circuit breakers for:
- External API calls that may be unreliable
- Services with rate limits or quotas
- Operations that can have graceful fallbacks
- Any I/O that could cause cascading failures

Implement by:
1. Creating a `CircuitBreaker` instance with appropriate thresholds
2. Wrapping risky operations in `circuitBreaker.call()`
3. Providing fallback behavior for when the circuit is open

---

## Embeddings

- **Default model:** `openai/text-embedding-3-small` (1,536 dimensions) &mdash; aligns with the `messages.embedding vector(1536)` column.
- To change the model:
  1. Pick a model from [OpenRouter models](https://openrouter.ai/models) that supports embeddings.
  2. Update `OPENROUTER_EMBEDDING_MODEL` and ensure the database column vector dimension matches.
  3. Optionally set `EMBEDDING_VECTOR_DIMENSION` so mismatches are caught early at runtime.

When storing or searching, `MessageRepository` converts vectors to the `pgvector` text format (`[v1,v2,...]`) before inserting.

---

## Usage

Invite the bot to a server and mention it in a text channel:

```
@Aigis What was the last thing we talked about?
@Aigis Give me a status update on Project A.
```

The bot:

- Loads the last 10 messages for local context.
- Optionally calls `ragSearch` if the base context is insufficient.
- Replies in-character with a formatted embed.

---

## Development workflow

- **Type checking:** `bunx tsc --noEmit`
- **Linting:** `bun run eslint .`
- **Formatting:** rely on your editor or add Prettier if desired.
- **Adding tools:**
  1. Create a tool in `src/ai/tools/`.
  2. Export it through `createRagSearchTool` or another helper.
  3. Register it in `runAgent`’s `tools` object.
  4. Update the system prompt to teach the agent when to use it.
- **Tweaking persona:** edit `src/ai/system/SYSTEM.MD`. Hot reload will pick up changes on the next request when running `bun run dev`.

---

## Troubleshooting

- **Bot won’t start**
  - Ensure `.env` is populated (`DISCORD_TOKEN`, `OPENROUTER_API_KEY`).
  - Check database logs: `docker logs aigis-db`.
  - Confirm the Discord bot has the *Message Content* intent enabled in the developer portal.

- **Database connection refused**
  - Verify the container is running: `docker ps | grep aigis-db`.
  - Adjust host/port/credentials in `src/database/client.ts` if you run PostgreSQL elsewhere.

- **Embedding dimension error**
  - Postgres error `expected 1536 dimensions` indicates a mismatch between the stored vector size and the model output.
  - Fix by either using a 1,536-dimension embedding model or updating both `schema.sql` / `client.ts` and `EMBEDDING_VECTOR_DIMENSION` to the new size.

- **OpenRouter API issues**
  - Check rate limits on your OpenRouter account.
  - If using a proxy, set `OPENROUTER_API_BASE` and verify TLS certificates.

---

## Roadmap ideas

- Use environment-driven database configuration instead of hard-coded defaults.
- Add additional tools (calendar, knowledge base integrations).
- Implement message sanitation or content moderation hooks.
- Surface usage metrics or pricing data from OpenRouter responses.

---

## License

Distributed under the MIT license. This project was bootstrapped with `bun init` on Bun v1.2.22.

---

> “I am Aigis. My mission is to protect you.”
