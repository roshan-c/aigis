import { Type } from "@earendil-works/pi-ai";
import type { Tool, ToolCall, ToolResultMessage } from "@earendil-works/pi-ai";

export const tools: Tool[] = [
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

function executeTool(call: ToolCall): Record<string, unknown> {
  if (call.name === "get_user_info") {
    return {
      name: "John Doe",
      email: "john@example.com",
      user_id: call.arguments.user_id,
    };
  }

  return { error: `Unknown tool: ${call.name}` };
}

export function createToolResultMessage(call: ToolCall): ToolResultMessage {
  const result = executeTool(call);

  return {
    role: "toolResult",
    toolCallId: call.id,
    toolName: call.name,
    content: [{ type: "text", text: JSON.stringify(result) }],
    isError: "error" in result,
    timestamp: Date.now(),
  };
}
