import { TartarusError } from "./types.js";
export class TartarusClient {
    baseUrl;
    apiKey;
    timeout;
    constructor(options) {
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
    async chat(request) {
        return this.post("/chat", request);
    }
    // ==========================================================================
    // Health Check
    // ==========================================================================
    /**
     * Check if the Tartarus API is healthy.
     * This endpoint does not require authentication.
     */
    async health() {
        return this.get("/health", false);
    }
    /**
     * Simple health check that returns a boolean.
     */
    async isHealthy() {
        try {
            const response = await this.health();
            return response.status === "healthy";
        }
        catch {
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
    async createApiKey(request) {
        return this.post("/api-keys", request);
    }
    /**
     * List all API keys.
     * Requires admin authentication.
     */
    async listApiKeys() {
        return this.get("/api-keys");
    }
    /**
     * Deactivate an API key.
     * Requires admin authentication.
     */
    async deactivateApiKey(id) {
        await this.delete(`/api-keys/${id}`);
    }
    // ==========================================================================
    // HTTP Helpers
    // ==========================================================================
    async request(method, path, body, requiresAuth = true) {
        const url = `${this.baseUrl}${path}`;
        const headers = {
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
                let errorData;
                try {
                    errorData = await response.json();
                }
                catch {
                    errorData = {
                        error: `HTTP ${response.status}: ${response.statusText}`,
                        code: "HTTP_ERROR",
                    };
                }
                throw new TartarusError(errorData.error, errorData.code, response.status);
            }
            // Handle empty responses (204 No Content)
            if (response.status === 204) {
                return undefined;
            }
            return response.json();
        }
        catch (error) {
            if (error instanceof TartarusError) {
                throw error;
            }
            if (error instanceof Error && error.name === "AbortError") {
                throw new TartarusError("Request timed out", "TIMEOUT", 408);
            }
            throw new TartarusError(error instanceof Error ? error.message : "Unknown error", "NETWORK_ERROR", 0);
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    get(path, requiresAuth = true) {
        return this.request("GET", path, undefined, requiresAuth);
    }
    post(path, body) {
        return this.request("POST", path, body);
    }
    delete(path) {
        return this.request("DELETE", path);
    }
}
