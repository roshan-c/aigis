import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";

import { system } from "../system/system";

import { weatherTool } from "../tools/weatherTool";
import { convertFahrenheitToCelsiusTool } from "../tools/convertFahrenheitToCelsiusTool";

export async function runAgent(prompt: string) {
  const result = await generateText({
    model: openai("gpt-4.1-mini"),
    system: system,
    prompt,
    tools: {
      weather: weatherTool,
      convertFahrenheitToCelsius: convertFahrenheitToCelsiusTool,
    },
    stopWhen: stepCountIs(10),
  });
  return result.text;
}
