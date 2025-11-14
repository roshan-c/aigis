// src/database/client.ts
import { Pool } from "pg";

const dbConfig = {
  host: "localhost",
  port: 5432,
  database: "aigis",
  user: "postgres",
  password: "postgres",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

console.log("Database config:", {
  ...dbConfig,
  password: dbConfig.password ? "***SET***" : "NOT SET",
});

export const pool = new Pool(dbConfig);

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
  // Don't exit - let the application handle it gracefully
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");

    await client.query(`
			CREATE TABLE IF NOT EXISTS messages (
				id SERIAL PRIMARY KEY,
				message_id VARCHAR(255) UNIQUE NOT NULL,
				channel_id VARCHAR(255) NOT NULL,
				guild_id VARCHAR(255),
				author_id VARCHAR(255) NOT NULL,
				author_name VARCHAR(255) NOT NULL,
				content TEXT NOT NULL,
				embedding vector(1536),
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				is_bot BOOLEAN DEFAULT FALSE
			)
		`);

    await client.query(`
			CREATE INDEX IF NOT EXISTS idx_messages_channel_created
			ON messages(channel_id, created_at DESC)
		`);

    await client.query(`
			CREATE INDEX IF NOT EXISTS idx_messages_embedding
			ON messages USING ivfflat (embedding vector_cosine_ops)
			WITH (lists = 100)
		`);

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  } finally {
    client.release();
  }
}
