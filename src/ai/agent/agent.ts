import { generateText, stepCountIs } from "ai";

import { system } from "../system/system";
import { openrouter } from "../providers/openrouter";

import { weatherTool } from "../tools/weatherTool";
import { convertFahrenheitToCelsiusTool } from "../tools/convertFahrenheitToCelsiusTool";
import { createRagSearchTool } from "../tools/ragSearchTool";
import { quoteTool } from "../tools/quoteTool";
import { createMessageSummaryTool } from "../tools/messageSummaryTool";

export async function runAgent(
  prompt: string,
  context: string,
  channelId: string,
  userId: string,
  currentMessageId: string,
  model: string,
) {
  const result = await generateText({
    model: openrouter.chat(model),
    system: system,
    prompt: `${context}\n\nCurrent message: ${prompt}`,
    tools: {
      weather: weatherTool,
      convertFahrenheitToCelsius: convertFahrenheitToCelsiusTool,
      ragSearch: createRagSearchTool(channelId),
      quote: quoteTool,
      messageSummary: createMessageSummaryTool(userId, channelId, currentMessageId),
    },
    toolChoice: "auto",
    stopWhen: stepCountIs(10),
  });
  return result.text;
}
