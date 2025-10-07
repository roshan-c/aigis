import { Client, Events, GatewayIntentBits, Message } from "discord.js";
import { EmbedResponse } from "./embedBuilder/embedBuilder";

import { BotConfig } from "../types/BotConfig";

import { runAgent } from "../ai/agent/agent";

const config: BotConfig = {
  discordToken: process.env.DISCORD_TOKEN!,
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

function stripBotMention(content: string, botId: string): string {
  // handles both <@id> and <@!id>, and removes all occurrences
  return content.replaceAll(`<@${botId}>`, "").replaceAll(`<@!${botId}>`, "");
}

client.on(Events.MessageCreate, async (message: Message) => {
  try {
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

    const reply = await runAgent(prompt);

    await EmbedResponse.sendLongResponse(message, reply, {
      title: "AI Response 🤖",
      includeContext: true,
    });
  } catch (err) {
    console.error("Error handling mention with embed:", err);
    // Fallback to simple text reply if embed fails
    try {
      const reply = "Sorry, something went wrong.";
    } catch {}
  }
});

client.login(config.discordToken);
