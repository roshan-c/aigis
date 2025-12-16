export interface ChatRequest {
    /** The user's message */
    message: string;
    /** Unique identifier for the user */
    userId: string;
    /** Channel/conversation identifier */
    channelId: string;
    /** Optional guild/server identifier */
    guildId?: string;
    /** Unique identifier for this message */
    messageId: string;
    /** Display name of the message author */
    authorName: string;
    /** Number of recent messages to include as context (default: 10) */
    contextLimit?: number;
}
export interface ChatResponse {
    /** The AI-generated response */
    response: string;
    /** Time taken to process the request in milliseconds */
    processingTimeMs: number;
}
export interface CreateApiKeyRequest {
    /** Name/identifier for the API client */
    name: string;
}
export interface CreateApiKeyResponse {
    /** Unique ID of the created API key */
    id: number;
    /** Name of the API client */
    name: string;
    /** The API key (only shown once on creation) */
    apiKey: string;
    /** When the key was created */
    createdAt: string;
}
export interface ApiKeyInfo {
    /** Unique ID of the API key */
    id: number;
    /** Name of the API client */
    name: string;
    /** Whether the key is active */
    isActive: boolean;
    /** When the key was created */
    createdAt: string;
}
export interface HealthResponse {
    status: "healthy" | "unhealthy";
    timestamp: string;
}
export interface ErrorResponse {
    /** Human-readable error message */
    error: string;
    /** Machine-readable error code */
    code: string;
}
export declare class TartarusError extends Error {
    readonly code: string;
    readonly statusCode: number;
    constructor(message: string, code: string, statusCode: number);
}
//# sourceMappingURL=types.d.ts.map