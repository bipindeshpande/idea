# Claude Integration Setup Guide

## Overview

The validation system now supports both OpenAI (GPT-4o) and Anthropic (Claude 3.5 Sonnet) models. Claude is recommended for more honest, critical evaluations.

---

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Choose validation model provider: "claude", "openai", or "auto"
VALIDATION_MODEL_PROVIDER=claude

# Required for Claude
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Required for OpenAI (fallback)
OPENAI_API_KEY=your_openai_api_key_here
```

### Options

- `VALIDATION_MODEL_PROVIDER=claude` - Use Claude 3.5 Sonnet (recommended)
- `VALIDATION_MODEL_PROVIDER=openai` - Use GPT-4o
- `VALIDATION_MODEL_PROVIDER=auto` - Try Claude first, fall back to OpenAI if unavailable

---

## Installation

1. **Install Anthropic package** (already added to `pyproject.toml`):
   ```bash
   pip install anthropic>=0.34.0
   ```

   Or install all dependencies:
   ```bash
   pip install -e .
   ```

2. **Get Anthropic API Key**:
   - Sign up at https://console.anthropic.com/
   - Create an API key
   - Add to `.env` file

---

## Testing

### Test with "sell ice to eskimo":

1. Set `VALIDATION_MODEL_PROVIDER=claude` in `.env`
2. Restart your Flask app
3. Validate the idea "sell ice to eskimo"
4. Expected result: Score 0-2 (Claude should be more critical)

### Compare Models:

Test the same idea with both models and compare:
- Claude should give lower scores to terrible ideas
- Claude should be more consistent
- Claude should follow scoring instructions better

---

## Cost Comparison

| Model | Cost per Validation | 1000 Validations/Month |
|-------|-------------------|----------------------|
| Claude 3.5 Sonnet | ~$0.006 | ~$6.00 |
| GPT-4o | ~$0.005 | ~$5.00 |

**Difference: Only $1/month more for significantly better quality**

---

## Why Claude?

1. **More Critical**: Better at giving terrible ideas low scores (0-2)
2. **More Honest**: Less likely to default to middle scores (4-6)
3. **Better Instruction Following**: More consistent with scoring framework
4. **More Rigorous**: Takes evaluation criteria more seriously

---

## Fallback Behavior

- If Claude is unavailable but `VALIDATION_MODEL_PROVIDER=claude`, system falls back to OpenAI
- If `VALIDATION_MODEL_PROVIDER=auto`, tries Claude first, falls back to OpenAI
- Logs warning when fallback occurs

---

## Troubleshooting

### Error: "anthropic package not installed"
```bash
pip install anthropic>=0.34.0
```

### Error: "ANTHROPIC_API_KEY not set"
- Check your `.env` file
- Make sure `ANTHROPIC_API_KEY` is set
- Restart your Flask app

### Claude still giving score 4 to terrible ideas?
- The pre-check should catch vague ideas and return 1/10 immediately (no AI call)
- Post-processing caps scores at 2/10 for vague ideas
- If still issues, check logs for which model is actually being used

---

## Next Steps

1. Test Claude with known terrible ideas
2. Compare responses with GPT-4o
3. Monitor costs and quality
4. Adjust `VALIDATION_MODEL_PROVIDER` as needed


