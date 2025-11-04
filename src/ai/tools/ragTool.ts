import { tool } from "ai";
import { z } from "zod";
import { knowledgeBase } from "../rag/knowledgeBase";

export const ragTool = tool({
  description:
    "Search the knowledge base for relevant information about Aigis, Persona 3, SEES, and related topics. Use this tool when you need context or background information to answer a question.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The search query to find relevant information in the knowledge base",
      ),
    topK: z
      .number()
      .optional()
      .describe("Number of relevant documents to retrieve (default: 3)"),
  }),
  execute: async ({ query, topK = 3 }) => {
    const results = await knowledgeBase.search(query, topK);

    if (results.length === 0) {
      return {
        found: false,
        message: "No relevant information found in the knowledge base.",
      };
    }

    return {
      found: true,
      results: results.map((doc) => ({
        id: doc.id,
        content: doc.content,
      })),
    };
  },
});

export type RagToolInput = z.infer<typeof ragTool.inputSchema>;
