import type { Context } from "@earendil-works/pi-ai";
import { tools } from "./tools.ts";

export function createContext(): Context {
  return {
    systemPrompt:
      "You are a helpful assistant that provides information about the current user. The current user's ID is 123. What is their name?",
    messages: [
      {
        role: "user",
        content: "What is the user's name?",
        timestamp: Date.now(),
      },
    ],
    tools,
  };
}
