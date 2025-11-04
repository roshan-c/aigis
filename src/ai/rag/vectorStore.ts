import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

export interface Document {
  id: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface DocumentWithEmbedding extends Document {
  embedding: number[];
}

export class VectorStore {
  private documents: DocumentWithEmbedding[] = [];
  private embeddingModel = openai.embedding("text-embedding-3-small");

  async addDocument(doc: Document): Promise<void> {
    const { embedding } = await embed({
      model: this.embeddingModel,
      value: doc.content,
    });

    this.documents.push({
      ...doc,
      embedding,
    });
  }

  async addDocuments(docs: Document[]): Promise<void> {
    await Promise.all(docs.map((doc) => this.addDocument(doc)));
  }

  async search(query: string, topK: number = 3): Promise<Document[]> {
    if (this.documents.length === 0) {
      return [];
    }

    const { embedding: queryEmbedding } = await embed({
      model: this.embeddingModel,
      value: query,
    });

    const similarities = this.documents.map((doc) => ({
      doc,
      similarity: this.cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, topK).map((item) => ({
      id: item.doc.id,
      content: item.doc.content,
      metadata: item.doc.metadata,
    }));
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += (a[i] ?? 0) * (b[i] ?? 0);
      normA += (a[i] ?? 0) * (a[i] ?? 0);
      normB += (b[i] ?? 0) * (b[i] ?? 0);
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) {
      return 0;
    }

    return dotProduct / magnitude;
  }

  getDocumentCount(): number {
    return this.documents.length;
  }

  clear(): void {
    this.documents = [];
  }
}
