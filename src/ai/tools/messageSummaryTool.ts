import { tool } from "ai";
import { z } from "zod";
import { MessageRepository } from "../../database/repositories/messageRepository";

const messageRepo = new MessageRepository();

export function createMessageSummaryTool(userId: string, channelId: string, currentMessageId: string) {
  return tool({
    description:
      "Get all messages that were sent in this channel between the user's current message and their previous message. Use this when the user asks what they missed, wants a summary of recent activity, or wants to catch up on the conversation while they were away.",
    inputSchema: z.object({}),
    execute: async () => {
      const messagesBetween = await messageRepo.getMessagesBetweenUserMessages(
        userId,
        channelId,
        currentMessageId,
      );

      if (messagesBetween.length === 0) {
        return {
          found: false,
          message: "No messages found between your last two messages. Either this is your first message in this channel, or no one has sent any messages since your last message.",
        };
      }

      const formattedMessages = messagesBetween.map((msg) => ({
        author: msg.authorName,
        content: msg.content,
        timestamp: msg.createdAt.toISOString(),
        isBot: msg.isBot,
      }));

      return {
        found: true,
        messageCount: messagesBetween.length,
        messages: formattedMessages,
        summary: `Found ${messagesBetween.length} message(s) between your last two messages. Please provide an intelligent summary of the key topics, important points, and overall context of what happened while the user was away.`,
      };
    },
  });
}

