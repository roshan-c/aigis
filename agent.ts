import { complete, stream } from "@earendil-works/pi-ai";
import type { Context, ToolCall } from "@earendil-works/pi-ai";
import { model } from "./model.ts";
import { createToolResultMessage } from "./tools.ts";
import { logStreamEvent } from "./stream-log.ts";

export async function runAgent(context: Context, apiKey: string): Promise<void> {
  const s = stream(model, context, { apiKey });

  for await (const event of s) {
    logStreamEvent(event);
  }

  const finalMessage = await s.result();
  context.messages.push(finalMessage);

  const toolCalls = finalMessage.content.filter(
    (block): block is ToolCall => block.type === "toolCall",
  );

  for (const call of toolCalls) {
    context.messages.push(createToolResultMessage(call));
  }

  if (toolCalls.length > 0) {
    const continuation = await complete(model, context, { apiKey });
    context.messages.push(continuation);
    console.log("Continuation after tool calls:", continuation.content);
  }

  console.log(
    `Total tokens: ${finalMessage.usage.input} in, ${finalMessage.usage.output} out`,
  );
  console.log(`Cost: $${finalMessage.usage.cost.total.toFixed(4)}`);
}
