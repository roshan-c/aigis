import type { AssistantMessageEvent } from "@earendil-works/pi-ai";

export function logStreamEvent(event: AssistantMessageEvent): void {
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
      console.log("Tool call started");
      break;
    case "toolcall_end":
      console.log(`Tool call ended: ${event.toolCall.name}`);
      break;
    case "toolcall_delta": {
      const partialCall = event.partial.content[event.contentIndex];
      if (partialCall?.type === "toolCall") {
        console.log(`[Tool call delta for ${partialCall.name}]`);
      }
      break;
    }
    case "done":
      console.log("Stream completed");
      break;
    case "error":
      console.error("Stream error:", event.error);
      break;
  }
}
