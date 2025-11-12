import { Client, Events, GatewayIntentBits, Message } from "discord.js";
import { EmbedResponse } from "./embedBuilder/embedBuilder";

import type { BotConfig } from "../types/BotConfig";
import { runAgent } from "../ai/agent/agent";
import { initDatabase } from "../database/client";
import { MessageRepository } from "../database/repositories/messageRepository";

const config: BotConfig = {
  discordToken: process.env.DISCORD_TOKEN!,
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
});

function stripBotMention(content: string, botId: string): string {
  return content.replaceAll(`<@${botId}>`, "").replaceAll(`<@!${botId}>`, "");
}

async function buildContext(
  channelId: string,
  limit: number = 10,
): Promise<string> {
  const recentMessages = await messageRepo.getRecentMessages(channelId, limit);

  if (recentMessages.length === 0) {
    return "No recent conversation history.";
  }

  const contextLines = recentMessages
    .reverse()
    .map(
      (msg) =>
        `[${msg.createdAt.toISOString()}] ${msg.authorName}: ${msg.content}`,
    );

  return `Recent conversation history:\n${contextLines.join("\n")}`;
}

client.on(Events.MessageCreate, async (message: Message) => {
  try {
    if (message.author.bot && message.author.id !== client.user?.id) return;

    if (message.author.id !== client.user?.id) {
      await messageRepo.storeMessage(
        message.id,
        message.channelId,
        message.guildId,
        message.author.id,
        message.author.username,
        message.content,
        message.author.bot,
      );
    }

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

    if (!message.channel.isTextBased()) return;
    await (message.channel as any).sendTyping();

    const context = await buildContext(message.channelId, 10);
    const reply = await runAgent(prompt, context, message.channelId);

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
  } catch (err) {
    console.error("Error handling mention with embed:", err);
    try {
      await EmbedResponse.sendError(message, "Sorry, something went wrong.");
    } catch {}
  }
});

client.login(config.discordToken);
