# aigis

A Discord bot powered by AI with RAG (Retrieval Augmented Generation) capabilities, role-playing as Aigis from Persona 3.

## Features

- AI-powered responses using GPT-4
- RAG with PostgreSQL and pgvector for conversation memory
- Semantic search through conversation history
- Automatic message embedding and storage
- Aigis personality from Persona 3

## Prerequisites

- [Bun](https://bun.sh) v1.2.22 or higher
- [Docker](https://www.docker.com/) for PostgreSQL
- Discord Bot Token
- OpenAI API Key

## Installation

### 1. Install dependencies

```bash
bun install
```

### 2. Set up PostgreSQL with pgvector

Build and run the PostgreSQL container:

```bash
docker build -t aigis-postgres -f Dockerfile.postgres .
docker run -d \
  --name aigis-db \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=your_secure_password \
  -v aigis-data:/var/lib/postgresql/data \
  aigis-postgres
```

Or use the provided script:

```bash
# Start database
./scripts/start-db.sh

# Stop database
./scripts/stop-db.sh
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
# Discord
DISCORD_TOKEN=your_discord_bot_token

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=aigis
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
```

### 4. Run the bot

Development mode (with hot reload):
```bash
bun run dev
```

Production mode:
```bash
bun run start
```

## Architecture

### RAG System

The bot uses Retrieval Augmented Generation (RAG) to maintain conversation context:

1. **Message Storage**: Every message is stored with embeddings in PostgreSQL
2. **Recent Context**: The last 10 messages are automatically loaded for each interaction
3. **Semantic Search**: When the AI needs more context, it searches the database using pgvector's cosine similarity
4. **Tool-based Retrieval**: The AI can call the `ragSearch` tool to find relevant historical messages

### Database Schema

```sql
messages (
  id: SERIAL PRIMARY KEY,
  message_id: VARCHAR(255) UNIQUE,
  channel_id: VARCHAR(255),
  guild_id: VARCHAR(255),
  author_id: VARCHAR(255),
  author_name: VARCHAR(255),
  content: TEXT,
  embedding: vector(1536),
  created_at: TIMESTAMP,
  is_bot: BOOLEAN
)
```

### Project Structure

```
aigis/
├── src/
│   ├── ai/
│   │   ├── agent/
│   │   │   └── agent.ts          # Main AI agent logic
│   │   ├── embeddings/
│   │   │   └── embeddings.ts     # OpenAI embedding generation
│   │   ├── system/
│   │   │   ├── SYSTEM.MD         # System prompt
│   │   │   └── system.ts
│   │   └── tools/
│   │       ├── ragSearchTool.ts  # RAG search functionality
│   │       ├── weatherTool.ts
│   │       └── convertFahrenheitToCelsiusTool.ts
│   ├── database/
│   │   ├── client.ts             # PostgreSQL connection
│   │   ├── schema.sql            # Database schema
│   │   └── repositories/
│   │       └── messageRepository.ts  # Message CRUD operations
│   ├── discord/
│   │   ├── bot.ts                # Discord bot main file
│   │   └── embedBuilder/
│   │       └── embedBuilder.ts   # Discord embed utilities
│   └── types/
│       └── BotConfig.ts
├── Dockerfile.postgres
├── init.sql
├── package.json
└── tsconfig.json
```

## Usage

Mention the bot in any channel:

```
@Aigis What's the weather like?
@Aigis Can you remind me what we discussed about X?
```

The bot will:
- Automatically consider the last 10 messages for context
- Search its memory when it needs more historical information
- Respond in character as Aigis

## Tools Available

- **weather**: Get weather information (mocked)
- **convertFahrenheitToCelsius**: Convert temperature units
- **ragSearch**: Search conversation history for relevant context

## Database Management

### View stored messages

```bash
docker exec -it aigis-db psql -U postgres -d aigis
```

```sql
-- Count messages
SELECT COUNT(*) FROM messages;

-- View recent messages
SELECT author_name, content, created_at
FROM messages
ORDER BY created_at DESC
LIMIT 10;

-- Check embedding status
SELECT COUNT(*) as total,
       COUNT(embedding) as with_embeddings
FROM messages;
```

### Reset database

```bash
docker exec -it aigis-db psql -U postgres -d aigis -c "DROP TABLE IF EXISTS messages CASCADE;"
```

Then restart the bot to recreate tables.

### Backup and restore

```bash
# Backup
docker exec aigis-db pg_dump -U postgres aigis > backup.sql

# Restore
docker exec -i aigis-db psql -U postgres aigis < backup.sql
```

## Development

### Linting

```bash
bun run eslint .
```

### Adding new tools

1. Create a new tool file in `src/ai/tools/`
2. Import and add it to the agent in `src/ai/agent/agent.ts`
3. Update the system prompt if needed

### Modifying personality

Edit `src/ai/system/SYSTEM.MD` to change the bot's personality and behavior.

## Performance Considerations

- **Embeddings**: Generated using `text-embedding-3-small` (1536 dimensions)
- **Index**: Uses IVFFlat index for fast similarity search
- **Context window**: Limited to 10 recent messages + RAG results
- **Connection pooling**: PostgreSQL pool with max 20 connections

## Troubleshooting

### Database connection issues

```bash
# Check if container is running
docker ps | grep aigis-db

# Check logs
docker logs aigis-db

# Test connection
docker exec -it aigis-db psql -U postgres -d aigis -c "SELECT 1"
```

### Bot not responding

1. Check Discord token is valid
2. Ensure bot has proper permissions (Read Messages, Send Messages, Embed Links)
3. Verify bot is mentioned correctly
4. Check logs for errors

### Embedding errors

Ensure your OpenAI API key is valid and has access to embedding models:
```bash
echo $OPENAI_API_KEY
```

## License

This project was created using `bun init` in bun v1.2.22. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
