import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  throw new Error(
    "Missing OPENROUTER_API_KEY environment variable. Set it to your OpenRouter API key.",
  );
}

export const openrouter = createOpenRouter({
  apiKey,
});

