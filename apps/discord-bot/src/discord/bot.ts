import { Client, Events, GatewayIntentBits, Message } from "discord.js";
import { EmbedResponse } from "./embedBuilder/embedBuilder";
import { TartarusClient } from "../services/tartarus/client";

interface BotConfig {
  discordToken: string;
  tartarusUrl: string;
  tartarusApiKey: string;
}

const config: BotConfig = {
  discordToken: process.env.DISCORD_TOKEN!,
  tartarusUrl: process.env.TARTARUS_URL || "http://localhost:5000",
  tartarusApiKey: process.env.TARTARUS_API_KEY!,
};

// Validate required config
if (!config.discordToken) {
  throw new Error("DISCORD_TOKEN environment variable is required");
}
if (!config.tartarusApiKey) {
  throw new Error("TARTARUS_API_KEY environment variable is required");
}

const tartarus = new TartarusClient(config.tartarusUrl, config.tartarusApiKey);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
  
  // Check Tartarus connectivity
  const healthy = await tartarus.healthCheck();
  if (healthy) {
    console.log(`Connected to Tartarus at ${config.tartarusUrl}`);
  } else {
    console.warn(`Warning: Tartarus at ${config.tartarusUrl} is not responding`);
  }
});

function stripBotMention(content: string, botId: string): string {
  return content.replace(new RegExp(`<@!?${botId}>`, "g"), "").trim();
}

client.on(Events.MessageCreate, async (message: Message) => {
  const startTime = Date.now();

  try {
    // Early returns to avoid unnecessary processing
    if (message.author.bot) return;
    if (!client.user) return;
    if (!message.mentions.has(client.user)) return;

    const prompt = stripBotMention(message.content, client.user.id);
    if (!prompt) {
      await message.reply({
        content: "Please provide a prompt.",
        allowedMentions: { repliedUser: false },
      });
      return;
    }

    // Log incoming message
    console.log(`[INCOMING] ${message.author.username}: ${prompt}`);

    if (!message.channel.isTextBased()) return;
    await (message.channel as any).sendTyping();

    // Call Tartarus API
    const response = await tartarus.chat({
      message: prompt,
      userId: message.author.id,
      channelId: message.channelId,
      guildId: message.guildId ?? undefined,
      messageId: message.id,
      authorName: message.author.username,
      contextLimit: 10,
    });

    await EmbedResponse.sendLongResponse(message, response.response, {
      title: "Aigis",
      includeContext: true,
    });

    // Log outgoing message with timing
    const processingTime = Date.now() - startTime;
    console.log(`[OUTGOING] Response sent in ${processingTime}ms (Tartarus: ${response.processingTimeMs}ms)`);
    console.log(`[OUTGOING] Content: ${response.response.substring(0, 100)}${response.response.length > 100 ? "..." : ""}`);
  } catch (err) {
    console.error("Error handling message:", err);
    try {
      await EmbedResponse.sendError(
        message,
        "Sorry, something went wrong. Please try again later."
      );
    } catch {}
  }
});

client.login(config.discordToken);
