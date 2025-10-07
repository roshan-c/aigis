// internal imports
import type { BotConfig } from "./types/BotConfig";
import { system } from "./system/system";

// ai-sdk
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

// discord.js
import { Client, Events, GatewayIntentBits, Message } from "discord.js";
import type { TextBasedChannel } from "discord.js";

// tools
import { getWeather } from "./tools/GetWeather";

const config: BotConfig = {
  discordToken: process.env.DISCORD_TOKEN!,
  openAIApiKey: process.env.OPENAI_API_KEY!,
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

function stripBotMention(content: string, botId: string): string {
  // handles both <@id> and <@!id>, and removes all occurrences
  return content.replaceAll(`<@${botId}>`, "").replaceAll(`<@!${botId}>`, "");
}

client.on(Events.MessageCreate, async (message: Message) => {
  try {
    if (message.author.bot) return;
    if (!client.user) return;

    // only respond to messages that mention the bot
    if (!message.mentions.has(client.user)) return;

    // remove only this bot's mention using the function above
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

    // stream the model output given system + prompt
    const result = streamText({
      model: openai("gpt-5-nano"),
      system,
      prompt,
      tools: { getWeather },
    });

    // collect full text from the stream
    let full = "";
    for await (const delta of result.textStream) {
      full += delta;
    }

    // discord has a 2000-character message limit
    const chunks = chunkString(full, 2000).filter((c) => c.trim().length > 0);
    if (chunks.length === 0) return;
    for (const chunk of chunks) {
      await message.reply({
        content: chunk,
        allowedMentions: { repliedUser: false },
      });
    }
  } catch (err) {
    console.error("Error handling mention:", err);
    try {
      await message.reply({
        content: "Sorry, something went wrong.",
        allowedMentions: { repliedUser: false },
      });
    } catch {}
  }
});

function chunkString(input: string, size: number): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < input.length) {
    chunks.push(input.slice(i, i + size));
    i += size;
  }
  return chunks;
}

client.login(config.discordToken);
