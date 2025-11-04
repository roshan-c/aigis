# RAG (Retrieval-Augmented Generation) System

This bot now includes a RAG system that allows Aigis to retrieve relevant information from a knowledge base before answering questions.

## How It Works

The RAG system consists of:

1. **Vector Store** (`src/ai/rag/vectorStore.ts`): An in-memory vector database that stores documents with their embeddings
2. **Knowledge Base** (`src/ai/rag/knowledgeBase.ts`): A collection of pre-loaded documents about Aigis, Persona 3, and SEES
3. **RAG Tool** (`src/ai/tools/ragTool.ts`): An AI tool that the agent can use to search the knowledge base

## Default Knowledge

The knowledge base is pre-loaded with information about:
- Aigis's background and creation
- Aigis's personality and development
- Aigis's abilities as an anti-Shadow weapon
- Her mission and purpose
- Persona 3 setting and the Dark Hour
- SEES team information

## Using RAG

The bot automatically initializes the knowledge base on first use. When you ask Aigis questions about herself or Persona 3, she will use the `searchKnowledge` tool to retrieve relevant context before responding.

Example questions that will trigger RAG:
- "Who are you?"
- "What is your mission?"
- "Tell me about SEES"
- "What is the Dark Hour?"

## Adding New Documents

To add new documents to the knowledge base programmatically, you can use:

```typescript
import { knowledgeBase } from "./src/ai/rag/knowledgeBase";

await knowledgeBase.addDocument({
  id: "unique-id",
  content: "Your document content here",
  metadata: { /* optional metadata */ }
});
```

## Technical Details

- **Embeddings**: Uses OpenAI's `text-embedding-3-small` model
- **Similarity Search**: Cosine similarity between query and document embeddings
- **Top-K Retrieval**: Returns the 3 most relevant documents by default (configurable)
- **Storage**: In-memory (documents are lost on restart)

## Future Enhancements

Potential improvements:
- Persistent storage (file-based or database)
- Document chunking for larger texts
- Support for uploading documents via Discord commands
- Metadata filtering
- Conversation history context
