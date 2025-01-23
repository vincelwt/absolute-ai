# Absolute

A smart LLM proxy that automatically routes requests between fast and slow models based on prompt complexity. Built with Bun and Hono.

## Features

- 🚀 OpenAI API Compatible
- 🤖 Automatic Model Selection
- 📡 Streaming Support
- ⚙️ Custom Model Configuration
- 🔄 Fallback Handling

## Quick Start

```bash
# Install dependencies
bun install

# Start the server
bun run index.ts
```

## Usage

The proxy mirrors the OpenAI API interface with additional configuration options:

```typescript
interface ModelConfig {
  name: string      // Model name
  apiKey?: string   // Optional API key
  apiUrl?: string   // Optional API URL
}

// Request body extends OpenAI's chat completion with:
{
  fastModel?: string | ModelConfig  // Fast model config
  slowModel?: string | ModelConfig  // Slow model config
  // ... standard OpenAI parameters
}
```

### Example Request

```bash
curl http://localhost:3000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -d '{
    "messages": [
      {"role": "user", "content": "What is the meaning of life?"}
    ],
    "fastModel": "gpt-4o",
    "slowModel": {
      "name": "gpt-4o-mini",
      "apiKey": "optional-different-key",
      "apiUrl": "optional-different-url"
    },
    "stream": true
  }'
```

## Model Selection

The proxy automatically routes requests based on:

1. Length Threshold (>1000 chars → slow model)
2. Keyword Detection (e.g., "legal", "medical", "analysis" → slow model)

## License

MIT
