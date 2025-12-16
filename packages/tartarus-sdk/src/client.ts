import type {
  ChatRequest,
  ChatResponse,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  ApiKeyInfo,
  HealthResponse,
  ErrorResponse,
} from "./types.js";
import { TartarusError } from "./types.js";

export interface TartarusClientOptions {
  /** Base URL of the Tartarus API (e.g., "http://localhost:5000") */
  baseUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

export class TartarusClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(options: TartarusClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.timeout = options.timeout ?? 30000;
  }

  // ==========================================================================
  // Chat API
  // ==========================================================================

  /**
   * Send a chat message and get an AI response.
   * Messages are automatically stored and used for context in future requests.
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.post<ChatResponse>("/chat", request);
  }

  // ==========================================================================
  // Health Check
  // ==========================================================================

  /**
   * Check if the Tartarus API is healthy.
   * This endpoint does not require authentication.
   */
  async health(): Promise<HealthResponse> {
    return this.get<HealthResponse>("/health", false);
  }

  /**
   * Simple health check that returns a boolean.
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.health();
      return response.status === "healthy";
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // API Key Management (Admin only)
  // ==========================================================================

  /**
   * Create a new API key for a client.
   * Requires admin authentication.
   */
  async createApiKey(request: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
    return this.post<CreateApiKeyResponse>("/api-keys", request);
  }

  /**
   * List all API keys.
   * Requires admin authentication.
   */
  async listApiKeys(): Promise<ApiKeyInfo[]> {
    return this.get<ApiKeyInfo[]>("/api-keys");
  }

  /**
   * Deactivate an API key.
   * Requires admin authentication.
   */
  async deactivateApiKey(id: number): Promise<void> {
    await this.delete(`/api-keys/${id}`);
  }

  // ==========================================================================
  // HTTP Helpers
  // ==========================================================================

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    requiresAuth: boolean = true
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (requiresAuth) {
      headers["X-API-Key"] = this.apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorData: ErrorResponse;
        try {
          errorData = await response.json() as ErrorResponse;
        } catch {
          errorData = {
            error: `HTTP ${response.status}: ${response.statusText}`,
            code: "HTTP_ERROR",
          };
        }
        throw new TartarusError(errorData.error, errorData.code, response.status);
      }

      // Handle empty responses (204 No Content)
      if (response.status === 204) {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof TartarusError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new TartarusError("Request timed out", "TIMEOUT", 408);
      }
      throw new TartarusError(
        error instanceof Error ? error.message : "Unknown error",
        "NETWORK_ERROR",
        0
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private get<T>(path: string, requiresAuth: boolean = true): Promise<T> {
    return this.request<T>("GET", path, undefined, requiresAuth);
  }

  private post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  private delete(path: string): Promise<void> {
    return this.request<void>("DELETE", path);
  }
}
