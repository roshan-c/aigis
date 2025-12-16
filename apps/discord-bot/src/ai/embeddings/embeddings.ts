const OPENROUTER_API_BASE =
  process.env.OPENROUTER_API_BASE ?? "https://openrouter.ai/api/v1";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_EMBEDDING_MODEL =
  process.env.OPENROUTER_EMBEDDING_MODEL ?? "openai/text-embedding-3-small";
const EXPECTED_EMBEDDING_DIMENSIONS = process.env.EMBEDDING_VECTOR_DIMENSION
  ? Number(process.env.EMBEDDING_VECTOR_DIMENSION)
  : undefined;

if (
  EXPECTED_EMBEDDING_DIMENSIONS !== undefined &&
  Number.isNaN(EXPECTED_EMBEDDING_DIMENSIONS)
) {
  throw new Error(
    "EMBEDDING_VECTOR_DIMENSION environment variable must be a valid number.",
  );
}

if (!OPENROUTER_API_KEY) {
  throw new Error(
    "Missing OPENROUTER_API_KEY environment variable. Set it to your OpenRouter API key.",
  );
}

type OpenRouterEmbeddingResponse = {
  data: Array<{
    embedding: number[];
  }>;
};

async function requestOpenRouterEmbeddings(
  inputs: string[],
  modelId: string,
): Promise<number[][]> {
  const response = await fetch(`${OPENROUTER_API_BASE}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      input: inputs,
      model: modelId,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to fetch embeddings from OpenRouter: ${response.status} ${response.statusText} - ${errorBody}`,
    );
  }

  const json = (await response.json()) as OpenRouterEmbeddingResponse;
  if (!json.data || json.data.length === 0) {
    throw new Error("OpenRouter embeddings response did not contain data.");
  }

  return json.data.map((item) => item.embedding);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const embeddings = await requestOpenRouterEmbeddings(
    [text],
    DEFAULT_EMBEDDING_MODEL,
  );
  const embedding = embeddings[0];
  if (!embedding) {
    throw new Error("OpenRouter did not return an embedding for the input.");
  }
  if (
    EXPECTED_EMBEDDING_DIMENSIONS !== undefined &&
    embedding.length !== EXPECTED_EMBEDDING_DIMENSIONS
  ) {
    throw new Error(
      `Embedding dimension mismatch. Expected ${EXPECTED_EMBEDDING_DIMENSIONS} but received ${embedding.length}. Update OPENROUTER_EMBEDDING_MODEL or EMBEDDING_VECTOR_DIMENSION to match your schema.`,
    );
  }

  return embedding;
}

export async function generateEmbeddings(
  texts: string[],
): Promise<number[][]> {
  const embeddings = await requestOpenRouterEmbeddings(
    texts,
    DEFAULT_EMBEDDING_MODEL,
  );
  if (embeddings.length !== texts.length) {
    throw new Error(
      `Expected ${texts.length} embeddings but received ${embeddings.length}.`,
    );
  }
  if (EXPECTED_EMBEDDING_DIMENSIONS !== undefined) {
    for (const embedding of embeddings) {
      if (embedding.length !== EXPECTED_EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Embedding dimension mismatch. Expected ${EXPECTED_EMBEDDING_DIMENSIONS} but received ${embedding.length}. Update OPENROUTER_EMBEDDING_MODEL or EMBEDDING_VECTOR_DIMENSION to match your schema.`,
        );
      }
    }
  }
  return embeddings;
}
