import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";

import { system } from "../system/system";

import { weatherTool } from "../tools/weatherTool";
import { convertFahrenheitToCelsiusTool } from "../tools/convertFahrenheitToCelsiusTool";
import { createRagSearchTool } from "../tools/ragSearchTool";

export async function runAgent(
  prompt: string,
  context: string,
  channelId: string,
) {
  const result = await generateText({
    model: openai("gpt-4o-mini"),
    system: system,
    prompt: `${context}\n\nCurrent message: ${prompt}`,
    tools: {
      weather: weatherTool,
      convertFahrenheitToCelsius: convertFahrenheitToCelsiusTool,
      ragSearch: createRagSearchTool(channelId),
    },
    toolChoice: "auto",
    stopWhen: stepCountIs(10),
  });
  return result.text;
}
