import { pool } from "../client";
import { generateEmbedding } from "../../ai/embeddings/embeddings";

export interface StoredMessage {
  id: number;
  messageId: string;
  channelId: string;
  guildId: string | null;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
  isBot: boolean;
  similarity?: number;
}

export class MessageRepository {
  async storeMessage(
    messageId: string,
    channelId: string,
    guildId: string | null,
    authorId: string,
    authorName: string,
    content: string,
    isBot: boolean = false,
  ): Promise<void> {
    const client = await pool.connect();
    try {
      const embedding = await generateEmbedding(content);

      await client.query(
        `INSERT INTO messages
				(message_id, channel_id, guild_id, author_id, author_name, content, embedding, is_bot)
				VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8)
				ON CONFLICT (message_id) DO NOTHING`,
        [
          messageId,
          channelId,
          guildId,
          authorId,
          authorName,
          content,
          `[${embedding.join(",")}]`,
          isBot,
        ],
      );
    } catch (error) {
      console.error("Error storing message:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getRecentMessages(
    channelId: string,
    limit: number = 10,
  ): Promise<StoredMessage[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, message_id, channel_id, guild_id, author_id,
				author_name, content, created_at, is_bot
				FROM messages
				WHERE channel_id = $1
				ORDER BY created_at DESC
				LIMIT $2`,
        [channelId, limit],
      );

      return result.rows.map((row) => ({
        id: row.id,
        messageId: row.message_id,
        channelId: row.channel_id,
        guildId: row.guild_id,
        authorId: row.author_id,
        authorName: row.author_name,
        content: row.content,
        createdAt: row.created_at,
        isBot: row.is_bot,
      }));
    } finally {
      client.release();
    }
  }

  async searchSimilarMessages(
    query: string,
    channelId: string,
    limit: number = 5,
    similarityThreshold: number = 0.7,
  ): Promise<StoredMessage[]> {
    const client = await pool.connect();
    try {
      const queryEmbedding = await generateEmbedding(query);

      const result = await client.query(
        `SELECT id, message_id, channel_id, guild_id, author_id,
				author_name, content, created_at, is_bot,
				1 - (embedding <=> $1::vector) as similarity
				FROM messages
				WHERE channel_id = $2
				AND 1 - (embedding <=> $1::vector) > $3
				ORDER BY embedding <=> $1::vector
				LIMIT $4`,
        [
          `[${queryEmbedding.join(",")}]`,
          channelId,
          similarityThreshold,
          limit,
        ],
      );

      return result.rows.map((row) => ({
        id: row.id,
        messageId: row.message_id,
        channelId: row.channel_id,
        guildId: row.guild_id,
        authorId: row.author_id,
        authorName: row.author_name,
        content: row.content,
        createdAt: row.created_at,
        isBot: row.is_bot,
        similarity: row.similarity,
      }));
    } finally {
      client.release();
    }
  }
}
