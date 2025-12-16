import { EmbedBuilder, Message } from "discord.js";

export class EmbedResponse {
  private static readonly MAX_EMBED_DESCRIPTION = 4096;
  private static readonly MAX_EMBEDS_PER_MESSAGE = 10;
  private static readonly DEFAULT_COLOR = 0x5865f2;

  static async sendLongResponse(
    message: Message,
    content: string,
    options?: {
      title?: string;
      color?: number;
      includeContext?: boolean; // shows a small author line on first embed
    },
  ): Promise<void> {
    const chunks = this.chunkContent(content);
    const embeds: EmbedBuilder[] = [];

    for (let i = 0; i < chunks.length && i < this.MAX_EMBEDS_PER_MESSAGE; i++) {
      const chunk = chunks[i] ?? "";

      const embed = new EmbedBuilder()
        .setDescription(chunk.trimEnd())
        .setColor(options?.color ?? this.DEFAULT_COLOR);

      if (i === 0 && options?.title) {
        embed.setTitle(options.title);
      }

      if (chunks.length > 1) {
        embed.setFooter({
          text: `Page ${i + 1} of ${Math.min(
            chunks.length,
            this.MAX_EMBEDS_PER_MESSAGE,
          )}`,
        });
      }

      if (i === 0 && options?.includeContext) {
        embed.setAuthor({
          name: "Aigis",
          iconURL: message.client.user?.displayAvatarURL() || undefined,
        });
      }

      embeds.push(embed);
    }

    try {
      if ("send" in message.channel) {
        await (message.channel as any).send({
          embeds,
          reply: { messageReference: message.id },
          allowedMentions: { repliedUser: false },
        });
      } else {
        await message.reply({
          embeds,
          allowedMentions: { repliedUser: false },
        });
      }
    } catch (error) {
      console.error("Failed to send embed response:", error);
      // fallback to plain text (2000 char limit)
      const truncated =
        content.length > 2000 ? content.substring(0, 1997) + "..." : content;
      try {
        if ("send" in message.channel) {
          await (message.channel as any).send({
            content: truncated,
            reply: { messageReference: message.id },
            allowedMentions: { repliedUser: false },
          });
        } else {
          await message.reply({
            content: truncated,
            allowedMentions: { repliedUser: false },
          });
        }
      } catch {
        await message.reply(truncated);
      }
    }
  }

  static chunkContent(content: string): string[] {
    if (content.length <= this.MAX_EMBED_DESCRIPTION) {
      return [content.trimEnd()];
    }

    const chunks: string[] = [];
    let remaining = content.trim();

    while (remaining.length > 0) {
      if (remaining.length <= this.MAX_EMBED_DESCRIPTION) {
        chunks.push(remaining.trimEnd());
        break;
      }

      let breakPoint = this.MAX_EMBED_DESCRIPTION;
      const window = remaining.substring(0, this.MAX_EMBED_DESCRIPTION);

      // Prefer line breaks
      const lastNewline = window.lastIndexOf("\n");
      if (lastNewline > this.MAX_EMBED_DESCRIPTION * 0.7) {
        breakPoint = lastNewline;
      } else {
        // Then sentence boundaries
        const lastSentence = Math.max(
          window.lastIndexOf(". "),
          window.lastIndexOf("! "),
          window.lastIndexOf("? "),
        );
        if (lastSentence > this.MAX_EMBED_DESCRIPTION * 0.7) {
          breakPoint = lastSentence + 1;
        } else {
          // Then spaces
          const lastSpace = window.lastIndexOf(" ");
          if (lastSpace > this.MAX_EMBED_DESCRIPTION * 0.7) {
            breakPoint = lastSpace;
          }
        }
      }

      chunks.push(remaining.substring(0, breakPoint).trim());
      remaining = remaining.substring(breakPoint).trim();
    }

    return chunks.map((c) => c.trimEnd());
  }

  static async sendError(message: Message, error: string): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("❌ Error")
      .setDescription(error)
      .setColor(0xff0000);
    await message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
    });
  }

  static async sendInfo(
    message: Message,
    title: string,
    description: string,
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0x00ff00);
    await message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false },
    });
  }
}
