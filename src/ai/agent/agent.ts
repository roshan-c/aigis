import { generateText, stepCountIs } from "ai";

import { system } from "../system/system";
import { openrouter } from "../providers/openrouter";
import { buildSkillsPrompt, getDiscoveredSkills } from "../skills/skills";
import { MessageRepository } from "../../database/repositories/messageRepository";

import { 
  weatherTool,
  convertFahrenheitToCelsiusTool,
  createRagSearchTool,
  quoteTool,
  createMessageSummaryTool,
  createLoadSkillTool,
  webFetchTool,
} from "../tools";

const messageRepo = new MessageRepository();

export async function runAgent(
  prompt: string,
  context: string,
  channelId: string,
  userId: string,
  currentMessageId: string,
  model: string,
) {
  const skills = await getDiscoveredSkills();
  const systemPrompt = `${system}\n\n${buildSkillsPrompt(skills)}`;

  const result = await generateText({
    model: openrouter.chat(model),
    system: systemPrompt,
    prompt: `${context}\n\nCurrent message: ${prompt}`,
    tools: {
      weather: weatherTool,
      convertFahrenheitToCelsius: convertFahrenheitToCelsiusTool,
      ragSearch: createRagSearchTool(channelId),
      quote: quoteTool,
      webFetch: webFetchTool,
      messageSummary: createMessageSummaryTool(userId, channelId, currentMessageId, messageRepo),
      loadSkill: createLoadSkillTool(skills),
    },
    toolChoice: "auto",
    stopWhen: stepCountIs(10),
  });
  return result.text;
}
