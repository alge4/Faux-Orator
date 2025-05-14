# AI Integration for Faux-Orator

This document explains how to use different AI models (Claude and OpenAI) in your Faux-Orator project.

## Overview

Faux-Orator now supports a unified AI service that can use either Anthropic's Claude or OpenAI models. The system will:

1. Automatically select the best available model based on your API keys
2. Allow you to specify a preferred provider globally
3. Let you override the provider for specific requests

## Setup

### 1. Get API Keys

You'll need at least one of these:

1. Claude API Key: Sign up at [Anthropic's website](https://console.anthropic.com/)
2. OpenAI API Key: Sign up at [OpenAI's website](https://platform.openai.com/)

### 2. Configure Your Environment

Add your API keys to your `.env` file:

```
# OpenAI Configuration
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_OPENAI_DEFAULT_MODEL=gpt-4-turbo-preview

# Claude AI Configuration
VITE_CLAUDE_API_KEY=your_claude_api_key
VITE_CLAUDE_DEFAULT_MODEL=claude-3-sonnet-20240229
```

You can configure one or both providers. The system will use what's available.

Available Claude models include:

- `claude-3-opus-20240229` (highest capability, slower)
- `claude-3-sonnet-20240229` (balanced performance)
- `claude-3-haiku-20240307` (fastest, good for most tasks)

### 3. Using the Unified AI Service

The system is designed to work with either provider transparently.

#### Direct Usage

```typescript
import { aiService } from "../services/aiService";

// Use default provider (auto-selected based on available API keys)
const response = await aiService.getChatCompletion([
  {
    role: "system",
    content: "You are a helpful assistant for a tabletop RPG.",
  },
  {
    role: "user",
    content: "Generate a character name.",
  },
]);

// Explicitly specify provider
const claudeResponse = await aiService.getChatCompletion(
  [
    {
      role: "user",
      content: "Generate a character description.",
    },
  ],
  {
    provider: "claude",
    temperature: 0.8,
  }
);

// Set global provider preference
aiService.setPreferredProvider("claude"); // or "openai" or "auto"
```

#### Using with Agents

All agents in the system now support specifying the AI provider:

```typescript
import { BaseAgent } from "./ai-agents/BaseAgent";

// Create an agent with provider preference
const agent = new SomeAgent(context, {
  aiProvider: "claude", // or "openai" or "auto"
  temperature: 0.7,
  maxTokens: 1000,
});

// Change provider at runtime
agent.setAIProvider("openai");
```

The AgentPool will respect these settings:

```typescript
import { AgentPool } from "./ai-agents/AgentPool";

const pool = new AgentPool(context, {
  preferredProvider: "claude", // Global preference
});
```

## Running Tests

To test the AI integrations:

```bash
# Test Claude specific integration
npm run test:claude

# Test the unified AI service with both providers
npm run test:ai
```

## Provider Comparisons

### Claude Advantages

- More creative and conversational responses
- Better at following complex instructions
- Often more nuanced understanding of context

### OpenAI Advantages

- Broader knowledge base
- Better for programming and technical tasks
- More fine-grained control over responses

## Troubleshooting

- **API Key Issues**: Ensure your API keys are correctly formatted and not expired
- **Provider Availability**: If a specified provider is unavailable, the system will fall back to another
- **Model Differences**: Different models have different capabilities and token limits

## Additional Resources

- [Claude API Documentation](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Claude vs OpenAI Comparison](https://docs.anthropic.com/claude/docs/claude-versus-other-models)
