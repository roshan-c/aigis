export interface ChatRequest {
  message: string;
  userId: string;
  channelId: string;
  guildId?: string;
  messageId: string;
  authorName: string;
  contextLimit?: number;
}

export interface ChatResponse {
  response: string;
  processingTimeMs: number;
}

export class TartarusClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = apiKey;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tartarus API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<ChatResponse>;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
