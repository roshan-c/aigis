# aigis

A Discord bot that role-plays as Aigis from Persona 3, powered by OpenAI's GPT with RAG (Retrieval-Augmented Generation) capabilities.

## Features

- 🤖 AI-powered responses using OpenAI GPT
- 📚 RAG system with knowledge about Aigis and Persona 3
- 🔧 Tool-based architecture for extensibility
- 💬 Discord integration with embed responses

## Installation

To install dependencies:

```bash
bun install
```

## Configuration

Set up your environment variables:

```bash
DISCORD_TOKEN=your_discord_bot_token
OPENAI_API_KEY=your_openai_api_key
```

## Running

To run the bot:

```bash
bun run dev
```

Or for production:

```bash
bun run start
```

## RAG System

The bot includes a Retrieval-Augmented Generation system that allows Aigis to retrieve relevant information from a knowledge base. See [RAG.md](RAG.md) for more details.

## About

This project was created using `bun init` in bun v1.2.22. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
