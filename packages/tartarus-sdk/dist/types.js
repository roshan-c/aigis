// ============================================================================
// Chat API Types
// ============================================================================
export class TartarusError extends Error {
    code;
    statusCode;
    constructor(message, code, statusCode) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = "TartarusError";
    }
}
