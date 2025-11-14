import { tool } from "ai";
import { z } from "zod";
import CircuitBreaker from "../../services/circuitBreaker/circuitBreaker";

// Initialize circuit breaker for the quote API
// failureThreshold: 3, recoveryTimeout: 30000ms (30s), successThreshold: 2
const quoteApiCircuitBreaker = new CircuitBreaker(3, 30000, 2);

interface QuoteApiResponse {
  content: string;
  author: string;
}

export const quoteTool = tool({
  description: "Get an inspirational quote from an external API",
  inputSchema: z.object({
    category: z
      .string()
      .optional()
      .describe("Optional category for the quote (e.g., inspirational, motivational)"),
  }),
  execute: async ({ category }) => {
    try {
      // Use circuit breaker to protect against API failures
      const result = await quoteApiCircuitBreaker.call(async () => {
        // Simulating an external API call
        const response = await fetch("https://api.quotable.io/random", {
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }

        const data = (await response.json()) as QuoteApiResponse;
        return {
          quote: data.content,
          author: data.author,
          category: category || "general",
        };
      });

      return result;
    } catch (error) {
      if (error instanceof Error && error.message === "Circuit is open") {
        return {
          error: "Quote service is temporarily unavailable. Please try again later.",
          quote: "The circuit breaker is protecting the system from cascading failures.",
          author: "Circuit Breaker Pattern",
        };
      }

      // Fallback quote for any other errors
      return {
        error: "Failed to fetch quote from API",
        quote: "In the face of adversity, resilience is our greatest strength.",
        author: "Fallback Quote",
      };
    }
  },
});

export type QuoteToolInput = z.infer<typeof quoteTool.inputSchema>;
