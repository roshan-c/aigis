export interface BotConfig {
  discordToken: string;
  openAIApiKey: string;
}

export interface ConversationMessage {
  id: string;
  userID: string;
  channelID: string;
  role: "user" | "system";
  content: string;
  timestamp: Date;
}
