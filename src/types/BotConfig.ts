export interface BotConfig {
  discordToken: string;
  openAIApiKey: string;
}

export interface ConversationMessage {
  id: string;
  userID: string;
  channelID: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
