import { tool } from "ai";
import { z } from "zod";
import { MessageRepository } from "../../database/repositories/messageRepository";

const messageRepo = new MessageRepository();

export function createRagSearchTool(channelId: string) {
  return tool({
    description:
      "Search the message history for relevant context when you need more information about past conversations or specific topics discussed in this channel",
    inputSchema: z.object({
      query: z
        .string()
        .describe("The search query to find relevant past messages"),
    }),
    execute: async ({ query }) => {
      const similarMessages = await messageRepo.searchSimilarMessages(
        query,
        channelId,
        5,
        0.7,
      );

      if (similarMessages.length === 0) {
        return {
          found: false,
          message: "No relevant historical context found.",
        };
      }

      const formattedResults = similarMessages.map((msg) => ({
        author: msg.authorName,
        content: msg.content,
        timestamp: msg.createdAt.toISOString(),
        similarity: msg.similarity?.toFixed(2),
      }));

      return {
        found: true,
        results: formattedResults,
        count: similarMessages.length,
      };
    },
  });
}
