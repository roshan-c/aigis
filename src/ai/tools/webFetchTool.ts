import { Buffer } from "node:buffer";
import TurndownService from "turndown";
import { tool } from "ai";
import { z } from "zod";

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;
const DEFAULT_TIMEOUT_SECONDS = 30;
const MAX_TIMEOUT_SECONDS = 120;

function getAcceptHeader(format: "text" | "markdown" | "html"): string {
  switch (format) {
    case "markdown":
      return "text/markdown;q=1.0, text/x-markdown;q=0.9, text/plain;q=0.8, text/html;q=0.7, */*;q=0.1";
    case "text":
      return "text/plain;q=1.0, text/markdown;q=0.9, text/html;q=0.8, */*;q=0.1";
    case "html":
      return "text/html;q=1.0, application/xhtml+xml;q=0.9, text/plain;q=0.8, text/markdown;q=0.7, */*;q=0.1";
  }
}

function convertHTMLToMarkdown(html: string): string {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });
  turndownService.remove(["script", "style", "meta", "link"]);
  return turndownService.turndown(html);
}

function extractTextFromHTML(html: string): string {
  const withoutIgnoredBlocks = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, " ")
    .replace(/<embed\b[^>]*>[\s\S]*?<\/embed>/gi, " ");

  return withoutIgnoredBlocks.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export const webFetchTool = tool({
  description:
    "Fetch content from a URL and return it as markdown, text, or html. Supports up to 5MB responses and optional timeout in seconds.",
  inputSchema: z.object({
    url: z.string().describe("The URL to fetch content from"),
    format: z
      .enum(["text", "markdown", "html"])
      .default("markdown")
      .describe("The format to return the content in (text, markdown, or html)."),
    timeout: z
      .number()
      .int()
      .positive()
      .max(MAX_TIMEOUT_SECONDS)
      .optional()
      .describe("Optional timeout in seconds (max 120)"),
  }),
  execute: async ({ url, format, timeout }) => {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return { error: "URL must start with http:// or https://" };
    }

    const timeoutSeconds = Math.min(
      timeout ?? DEFAULT_TIMEOUT_SECONDS,
      MAX_TIMEOUT_SECONDS,
    );
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
      Accept: getAcceptHeader(format),
      "Accept-Language": "en-US,en;q=0.9",
    };

    let response: Response;
    try {
      const initial = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(timeoutSeconds * 1000),
      });

      response =
        initial.status === 403 &&
        initial.headers.get("cf-mitigated") === "challenge"
          ? await fetch(url, {
              headers: { ...headers, "User-Agent": "opencode" },
              signal: AbortSignal.timeout(timeoutSeconds * 1000),
            })
          : initial;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Request failed: ${message}` };
    }

    if (!response.ok) {
      return { error: `Request failed with status code: ${response.status}` };
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      return { error: "Response too large (exceeds 5MB limit)" };
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_RESPONSE_SIZE) {
      return { error: "Response too large (exceeds 5MB limit)" };
    }

    const contentType = response.headers.get("content-type") ?? "";
    const mime = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
    const title = `${response.url || url} (${contentType || "unknown"})`;

    const isImage =
      mime.startsWith("image/") &&
      mime !== "image/svg+xml" &&
      mime !== "image/vnd.fastbidsheet";

    if (isImage) {
      const base64Content = Buffer.from(arrayBuffer).toString("base64");
      return {
        title,
        output: "Image fetched successfully",
        mime,
        imageDataUrl: `data:${mime};base64,${base64Content}`,
      };
    }

    const content = new TextDecoder().decode(arrayBuffer);

    if (format === "markdown") {
      return {
        title,
        output: contentType.includes("text/html")
          ? convertHTMLToMarkdown(content)
          : content,
      };
    }

    if (format === "text") {
      return {
        title,
        output: contentType.includes("text/html")
          ? extractTextFromHTML(content)
          : content,
      };
    }

    return {
      title,
      output: content,
    };
  },
});

export type WebFetchToolInput = z.infer<typeof webFetchTool.inputSchema>;
