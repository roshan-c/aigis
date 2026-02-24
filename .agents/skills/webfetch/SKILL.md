---
name: webfetch
description: Fetch and read live content from URLs, including markdown conversion for HTML pages.
---

# Web Fetch Skill

## When to use this skill

Use this skill when a user asks for current or exact content from a URL, such as:

- "Summarize this page"
- "What does this doc say?"
- "Fetch this link and extract the key points"

## Tool to use

Call the `webFetch` tool with:

- `url` (required): must start with `http://` or `https://`
- `format` (optional): `markdown` (default), `text`, or `html`
- `timeout` (optional): seconds, max `120`

## Usage guidelines

1. Prefer `format: "markdown"` for article/docs pages.
2. Use `format: "text"` when the user wants plain extracted text.
3. Use `format: "html"` only when raw HTML is explicitly requested.
4. If the tool returns an `error`, explain it clearly and offer a retry suggestion.
5. If successful, provide a concise summary first, then include specific details the user asked for.

## Output handling

- The tool response includes a `title` and `output`.
- For image URLs, it may return `imageDataUrl`; describe what happened instead of dumping the entire data URL unless explicitly requested.
