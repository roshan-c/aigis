import { Client, Events, GatewayIntentBits, Message } from "discord.js";
import { EmbedResponse } from "./embedBuilder/embedBuilder";

import type { BotConfig } from "../types/BotConfig";
import { runAgent } from "../ai/agent/agent";
import { getDiscoveredSkills } from "../ai/skills/skills";
import { initDatabase } from "../database/client";
import { MessageRepository } from "../database/repositories/messageRepository";

const config: BotConfig = {
  discordToken: process.env.DISCORD_TOKEN!,
  aiModel: process.env.AI_MODEL!,
};

const messageRepo = new MessageRepository();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
  await initDatabase();
  console.log("Database ready");

  const skills = await getDiscoveredSkills();
  if (skills.length === 0) {
    console.log("Skills ready: 0 discovered");
  } else {
    const skillNames = skills.map((skill) => skill.name).join(", ");
    console.log(`Skills ready: ${skills.length} discovered (${skillNames})`);
  }
});

function stripBotMention(content: string, botId: string): string {
  return content.replace(new RegExp(`<@!?${botId}>`, "g"), "");
}

async function buildContext(
  channelId: string,
  limit: number = 10,
): Promise<string> {
  const recentMessages = await messageRepo.getRecentMessages(channelId, limit);

  if (recentMessages.length === 0) {
    return "No recent conversation history.";
  }

  // Build context string directly without reversing array
  const contextLines = [];
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i]!;
    contextLines.push(
      `[${msg.createdAt.toISOString()}] ${msg.authorName}: ${msg.content}`,
    );
  }

  return `Recent conversation history:\n${contextLines.join("\n")}`;
}

client.on(Events.MessageCreate, async (message: Message) => {
  const startTime = Date.now();
  
  try {
    // Early returns to avoid unnecessary processing
    if (message.author.bot) return;
    if (!client.user) return;
    if (!message.mentions.has(client.user)) return;

    const prompt = stripBotMention(message.content, client.user.id).trim();
    if (!prompt) {
      await message.reply({
        content: "Please provide a prompt.",
        allowedMentions: { repliedUser: false },
      });
      return;
    }

    // Log incoming message
    console.log(`[INCOMING] ${message.author.username}: ${prompt}`);

    // Store user message only after confirming bot will respond
    await messageRepo.storeMessage(
      message.id,
      message.channelId,
      message.guildId,
      message.author.id,
      message.author.username,
      message.content,
      false,
    );

    if (!message.channel.isTextBased()) return;
    await (message.channel as any).sendTyping();

    const context = await buildContext(message.channelId, 10);
    const reply = await runAgent(
      prompt,
      context,
      message.channelId,
      message.author.id,
      message.id,
      config.aiModel,
    );

    await messageRepo.storeMessage(
      `${message.id}-reply`,
      message.channelId,
      message.guildId,
      client.user.id,
      client.user.username,
      reply,
      true,
    );

    await EmbedResponse.sendLongResponse(message, reply, {
      title: "AI Response 🤖",
      includeContext: true,
    });

    // Log outgoing message with timing
    const processingTime = Date.now() - startTime;
    console.log(`[OUTGOING] Response sent in ${processingTime}ms`);
    console.log(`[OUTGOING] Content: ${reply.substring(0, 100)}${reply.length > 100 ? '...' : ''}`);
  } catch (err) {
    console.error("Error handling mention with embed:", err);
    try {
      await EmbedResponse.sendError(message, "Sorry, something went wrong.");
    } catch {}
  }
});

client.login(config.discordToken);
