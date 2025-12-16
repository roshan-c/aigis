import type { ChatRequest, ChatResponse, CreateApiKeyRequest, CreateApiKeyResponse, ApiKeyInfo, HealthResponse } from "./types.js";
export interface TartarusClientOptions {
    /** Base URL of the Tartarus API (e.g., "http://localhost:5000") */
    baseUrl: string;
    /** API key for authentication */
    apiKey: string;
    /** Request timeout in milliseconds (default: 30000) */
    timeout?: number;
}
export declare class TartarusClient {
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeout;
    constructor(options: TartarusClientOptions);
    /**
     * Send a chat message and get an AI response.
     * Messages are automatically stored and used for context in future requests.
     */
    chat(request: ChatRequest): Promise<ChatResponse>;
    /**
     * Check if the Tartarus API is healthy.
     * This endpoint does not require authentication.
     */
    health(): Promise<HealthResponse>;
    /**
     * Simple health check that returns a boolean.
     */
    isHealthy(): Promise<boolean>;
    /**
     * Create a new API key for a client.
     * Requires admin authentication.
     */
    createApiKey(request: CreateApiKeyRequest): Promise<CreateApiKeyResponse>;
    /**
     * List all API keys.
     * Requires admin authentication.
     */
    listApiKeys(): Promise<ApiKeyInfo[]>;
    /**
     * Deactivate an API key.
     * Requires admin authentication.
     */
    deactivateApiKey(id: number): Promise<void>;
    private request;
    private get;
    private post;
    private delete;
}
//# sourceMappingURL=client.d.ts.map