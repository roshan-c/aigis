import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";

import { system } from "../system/system";

import { weatherTool } from "../tools/weatherTool";
import { convertFahrenheitToCelsiusTool } from "../tools/convertFahrenheitToCelsiusTool";
import { ragTool } from "../tools/ragTool";
import { knowledgeBase } from "../rag/knowledgeBase";

let initialized = false;

export async function runAgent(prompt: string) {
  if (!initialized) {
    await knowledgeBase.initialize();
    initialized = true;
  }

  const result = await generateText({
    model: openai("gpt-4.1-mini"),
    system: system,
    prompt,
    tools: {
      weather: weatherTool,
      convertFahrenheitToCelsius: convertFahrenheitToCelsiusTool,
      searchKnowledge: ragTool,
    },
    stopWhen: stepCountIs(10),
  });
  return result.text;
}
