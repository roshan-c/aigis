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
    try {
      // Store message first without embedding for faster response
      await pool.query(
        `INSERT INTO messages
				(message_id, channel_id, guild_id, author_id, author_name, content, is_bot)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
				ON CONFLICT (message_id) DO NOTHING`,
        [messageId, channelId, guildId, authorId, authorName, content, isBot],
      );

      // Generate embedding asynchronously (non-blocking)
      generateEmbedding(content)
        .then((embedding) => {
          return pool.query(
            `UPDATE messages SET embedding = $1::vector WHERE message_id = $2`,
            [JSON.stringify(embedding), messageId],
          );
        })
        .catch((err) => {
          console.error(
            `Failed to generate embedding for message ${messageId}:`,
            err,
          );
        });
    } catch (error) {
      console.error("Error storing message:", error);
      throw error;
    }
  }

  async getRecentMessages(
    channelId: string,
    limit: number = 10,
  ): Promise<StoredMessage[]> {
    const result = await pool.query(
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
  }

  async searchSimilarMessages(
    query: string,
    channelId: string,
    limit: number = 5,
    similarityThreshold: number = 0.7,
  ): Promise<StoredMessage[]> {
    const queryEmbedding = await generateEmbedding(query);

    const result = await pool.query(
      `SELECT id, message_id, channel_id, guild_id, author_id,
				author_name, content, created_at, is_bot,
				1 - (embedding <=> $1::vector) as similarity
				FROM messages
				WHERE channel_id = $2
				AND 1 - (embedding <=> $1::vector) > $3
				AND embedding IS NOT NULL
				ORDER BY embedding <=> $1::vector
				LIMIT $4`,
      [JSON.stringify(queryEmbedding), channelId, similarityThreshold, limit],
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
  }

  async getMessagesBetweenUserMessages(
    userId: string,
    channelId: string,
    currentMessageId: string,
    limit: number = 200,
  ): Promise<StoredMessage[]> {
    try {
      // First, get the timestamp of the current message
      const currentMessageResult = await pool.query(
        `SELECT created_at FROM messages WHERE message_id = $1`,
        [currentMessageId],
      );

      if (currentMessageResult.rows.length === 0) {
        return [];
      }

      const currentMessageTime = currentMessageResult.rows[0].created_at;

      // Find the user's previous message in the same channel before the current message
      const previousMessageResult = await pool.query(
        `SELECT created_at FROM messages
         WHERE author_id = $1
         AND channel_id = $2
         AND created_at < $3
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId, channelId, currentMessageTime],
      );

      // If no previous message found, return empty array
      if (previousMessageResult.rows.length === 0) {
        return [];
      }

      const previousMessageTime = previousMessageResult.rows[0].created_at;

      // Get all messages between the two timestamps (excluding the boundary messages themselves)
      // Limited to prevent performance issues with huge message ranges
      const result = await pool.query(
        `SELECT id, message_id, channel_id, guild_id, author_id,
         author_name, content, created_at, is_bot
         FROM messages
         WHERE channel_id = $1
         AND created_at > $2
         AND created_at < $3
         ORDER BY created_at ASC
         LIMIT $4`,
        [channelId, previousMessageTime, currentMessageTime, limit],
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
    } catch (error) {
      console.error("Error getting messages between user messages:", error);
      throw error;
    }
  }
}
