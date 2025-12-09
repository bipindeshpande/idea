# Anthropic Claude Integration for Discovery Pipeline

The discovery pipeline now supports both **OpenAI** (GPT-4o-mini) and **Anthropic** (Claude Sonnet 4) models.

## Configuration

Set the `DISCOVERY_MODEL_PROVIDER` environment variable:

```bash
# Use Claude (recommended for more critical/honest analysis)
DISCOVERY_MODEL_PROVIDER=claude

# Use OpenAI (default, faster and cheaper)
DISCOVERY_MODEL_PROVIDER=openai

# Auto mode: Try Claude first, fall back to OpenAI if unavailable
DISCOVERY_MODEL_PROVIDER=auto
```

## Required Environment Variables

### For Claude:
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
CLAUDE_MODEL_NAME=claude-sonnet-4-20250514  # Optional, defaults to Sonnet 4
```

### For OpenAI (default):
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

## Available Claude Models

- `claude-sonnet-4-20250514` (Sonnet 4 - recommended, default)
- `claude-3-7-sonnet-20250219` (Sonnet 3.7 - alternative)
- `claude-3-5-sonnet-20240620` (Sonnet 3.5 - older but still works)

## Usage

The system automatically detects which provider to use based on `DISCOVERY_MODEL_PROVIDER`:

1. **"claude"**: Uses Claude if `ANTHROPIC_API_KEY` is set, otherwise falls back to OpenAI
2. **"openai"**: Always uses OpenAI (default)
3. **"auto"**: Tries Claude first, falls back to OpenAI if unavailable

## Implementation Details

- **Stage 1 (Profile Analysis)**: Uses selected model
- **Stage 2 (Idea Research)**: Uses selected model
- **Streaming**: Claude uses non-streaming mode (streaming not fully supported yet)

## Cost Comparison

| Model | Input Cost | Output Cost | Avg Call Cost |
|-------|-----------|-------------|---------------|
| GPT-4o-mini | $0.15/1M | $0.60/1M | ~$0.001 |
| Claude Sonnet 4 | $3/1M | $15/1M | ~$0.006 |

Claude is more expensive but provides more critical and honest analysis.

