import { Type, getModel, stream, complete } from "@earendil-works/pi-ai";
import type { Context, Tool } from "@earendil-works/pi-ai";
import { readFileSync, writeFileSync } from "fs";
import { getOAuthApiKey } from "@earendil-works/pi-ai/oauth";

const model = getModel("github-copilot", "gpt-5.4-mini");

const tools: Tool[] = [
  {
    name: "get_user_info",
    description: "Get information about the current user",
    parameters: Type.Object({
      user_id: Type.String({
        description: "The ID of the user to get information about",
      }),
    }),
  },
];

const context: Context = {
  systemPrompt:
    "You are a helpful assistant that provides information about the current user.",
  messages: [
    {
      role: "user",
      content: "What is the user's name?",
      timestamp: Date.now(),
    },
  ],
  tools,
};

const auth = JSON.parse(readFileSync("auth.json", "utf-8"));

const oauthResult = await getOAuthApiKey("github-copilot", auth);

if (!oauthResult) {
  console.error("Failed to get OAuth API key");
  process.exit(1);
}

auth["github-copilot"] = {
  type: "oauth",
  ...oauthResult.newCredentials,
};

writeFileSync("auth.json", JSON.stringify(auth, null, 2));

const s = stream(model, context, { apiKey: oauthResult.apiKey });

for await (const event of s) {
  switch (event.type) {
    case "start":
      console.log("Stream started");
      break;
    case "text_start":
      console.log("Text generation started");
      break;
    case "text_delta":
      console.log("Text delta:", event.delta);
      break;
    case "text_end":
      console.log("Text generation ended");
      break;
    case "thinking_start":
      console.log("Model is thinking...");
      break;
    case "thinking_delta":
      console.log("Thinking delta:", event.delta);
      break;
    case "thinking_end":
      console.log("Model finished thinking");
      break;
    case "toolcall_start":
      console.log(`Tool call started`);
      break;
    case "toolcall_end":
      console.log(`Tool call ended: ${event.toolCall.name}`);
      break;
    case "toolcall_delta":
      const partialCall = event.partial.content[event.contentIndex];
      if (partialCall?.type === "toolCall") {
        console.log(`[Tool call delta for ${partialCall.name}]`);
      }
      break;
    case "done":
      console.log("Stream completed");
      break;
    case "error":
      console.error("Stream error:", event.error);
      break;
  }
}

const finalMessage = await s.result();
context.messages.push(finalMessage);

const toolCalls = finalMessage.content.filter((b) => b.type === "toolCall");

for (const call of toolCalls) {
  const result =
    call.name === "get_user_info"
      ? {
          name: "John Doe",
          email: "john@example.com",
          user_id: call.arguments.user_id,
        }
      : { error: `Unknown tool: ${call.name}` };

  context.messages.push({
    role: "toolResult",
    toolCallId: call.id,
    toolName: call.name,
    content: [{ type: "text", text: JSON.stringify(result) }],
    isError: "error" in result,
    timestamp: Date.now(),
  });
}

if (toolCalls.length > 0) {
  const continuation = await complete(model, context, {
    apiKey: oauthResult.apiKey,
  });
  context.messages.push(continuation);
  console.log("Continuation after tool calls:", continuation.content);
}

console.log(
  `Total tokens: ${finalMessage.usage.input} in, ${finalMessage.usage.output} out`,
);
console.log(`Cost: $${finalMessage.usage.cost.total.toFixed(4)}`);
