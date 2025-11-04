# RAG System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Discord User                                 │
│                              ↓                                       │
│                    "Who are you, Aigis?"                            │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Discord Bot (bot.ts)                            │
│  - Receives message                                                  │
│  - Strips bot mention                                                │
│  - Calls runAgent(prompt)                                            │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       AI Agent (agent.ts)                            │
│  - Initialize knowledge base (first run)                             │
│  - Tools available:                                                  │
│    • weather                                                         │
│    • convertFahrenheitToCelsius                                      │
│    • searchKnowledge (RAG) ← NEW                                     │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   OpenAI GPT-4.1-mini                                │
│  Decides: "I should use searchKnowledge tool to answer this"        │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    RAG Tool (ragTool.ts)                             │
│  Input: { query: "Who are you, Aigis?" }                            │
│  Action: Call knowledgeBase.search(query, topK=3)                   │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                Knowledge Base (knowledgeBase.ts)                     │
│  - Contains 7 default documents about Aigis & Persona 3              │
│  - Delegates to VectorStore for search                               │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  Vector Store (vectorStore.ts)                       │
│  1. Generate query embedding via OpenAI                              │
│     query → [0.12, 0.45, -0.33, ...] (1536 dimensions)              │
│                                                                       │
│  2. Calculate cosine similarity with each document:                  │
│     - doc1 (aigis-background):     similarity = 0.89 ✓              │
│     - doc2 (aigis-personality):    similarity = 0.85 ✓              │
│     - doc3 (aigis-abilities):      similarity = 0.82 ✓              │
│     - doc4 (aigis-mission):        similarity = 0.71                │
│     - doc5 (persona-3-setting):    similarity = 0.42                │
│     - doc6 (sees-team):            similarity = 0.38                │
│     - doc7 (aigis-development):    similarity = 0.75                │
│                                                                       │
│  3. Return top-3 most similar documents                              │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      RAG Tool Returns                                │
│  {                                                                   │
│    found: true,                                                      │
│    results: [                                                        │
│      { id: "aigis-background", content: "Aigis is..." },            │
│      { id: "aigis-personality", content: "Aigis initially..." },    │
│      { id: "aigis-abilities", content: "As an anti-Shadow..." }     │
│    ]                                                                 │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   OpenAI GPT-4.1-mini                                │
│  Context: Retrieved documents + System prompt                        │
│  Generates: "I am Aigis, an anti-Shadow weapon created by the       │
│             Kirijo Group. My mission is to protect humanity from     │
│             Shadows. I may be a machine, but I am learning about     │
│             emotions through my interactions with SEES."             │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Discord Bot (bot.ts)                            │
│  - Formats response as Discord embed                                 │
│  - Sends reply to user                                               │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         Discord User                                 │
│                    Receives informed response                        │
└─────────────────────────────────────────────────────────────────────┘


## Key Components

**Vector Embeddings**: Text → High-dimensional vectors
- "Aigis is an anti-Shadow weapon" → [0.12, 0.45, -0.33, ..., 0.78]
- Captures semantic meaning
- Similar concepts have similar vectors

**Cosine Similarity**: Measures semantic similarity
- Range: 0 (completely different) to 1 (identical)
- Formula: cos(θ) = (A·B) / (||A|| × ||B||)
- Higher score = more relevant document

**Top-K Retrieval**: Returns K most relevant documents
- Default: 3 documents
- Provides context without overwhelming the AI
- Balance between relevance and token usage

## Data Flow

1. **User Query** → Discord Message
2. **Bot** → Extracts prompt, calls agent
3. **Agent** → Provides tools to OpenAI
4. **OpenAI** → Decides to use searchKnowledge tool
5. **RAG Tool** → Calls knowledge base
6. **Knowledge Base** → Delegates to vector store
7. **Vector Store** → 
   - Generates query embedding
   - Calculates similarities
   - Returns top-K documents
8. **OpenAI** → Generates response with context
9. **Bot** → Formats and sends Discord message
10. **User** → Receives contextual answer

## Benefits of RAG

✅ **Accurate Information**: Grounds responses in factual knowledge  
✅ **Consistent Character**: Maintains Aigis's personality and lore  
✅ **Extensible**: Easy to add new documents and knowledge  
✅ **Semantic Search**: Finds relevant info even with different wording  
✅ **Cost Effective**: Only retrieves relevant context, not entire KB  
