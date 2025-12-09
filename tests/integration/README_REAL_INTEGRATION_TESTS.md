# Real Integration Tests for Discovery Pipeline

These tests verify that `founder_psychology` flows through the actual discovery pipeline and produces different outputs based on psychology.

## Test Files

### 1. `test_discovery_endpoint_integration.py`
**Tests the actual `/api/run` endpoint**

- Uses Flask test client to call the real endpoint
- Mocks OpenAI at the tool level (in `market_research_tool` and `validation_tool`)
- Verifies psychology appears in outputs
- Tests that different personas produce different outputs

**Status:** ✅ Ready to use - mocks at tool level work

### 2. `test_discovery_real_integration.py`
**Tests the crew directly**

- Calls `crew.kickoff()` directly
- Attempts to mock CrewAI's LLM system
- More complex mocking required

**Status:** ⚠️ May need refinement - CrewAI's LLM mocking is complex

## How It Works

### Mocking Strategy

1. **Tool-Level Mocking** (✅ Working)
   - Injects mock OpenAI client into `_get_openai_client()` functions
   - Tools use `_MOCK_OPENAI_CLIENT` if set (via monkeypatch)
   - Returns persona-specific responses

2. **CrewAI LLM Mocking** (⚠️ Complex)
   - CrewAI uses langchain's ChatOpenAI internally
   - LLM is specified as string: `"openai/gpt-4o-mini"`
   - Requires mocking at langchain level
   - May need to patch `ChatOpenAI.__init__` or `LLM.from_llm_string()`

### What Gets Tested

✅ **Tool-level calls** - Market research and validation tools use mocked OpenAI
✅ **Psychology flow** - Verifies `founder_psychology` appears in outputs
✅ **Output differences** - Different personas produce different recommendations
⚠️ **CrewAI agent LLM** - May still call real OpenAI (needs refinement)

## Running Tests

```bash
# Run endpoint integration tests (recommended)
pytest tests/integration/test_discovery_endpoint_integration.py -v

# Run crew-level integration tests
pytest tests/integration/test_discovery_real_integration.py -v

# Run all integration tests
pytest tests/integration/ -v
```

## Current Limitations

1. **CrewAI LLM Mocking**: The crew-level tests attempt to mock CrewAI's internal LLM, but this is complex because:
   - CrewAI uses langchain's LLM providers
   - LLM is resolved from string like `"openai/gpt-4o-mini"`
   - Multiple layers of abstraction to mock

2. **Manager LLM**: The hierarchical process uses a manager LLM that coordinates agents. This also needs mocking.

## Recommended Approach

For now, use **`test_discovery_endpoint_integration.py`** which:
- ✅ Tests the real endpoint
- ✅ Mocks tool-level OpenAI calls (most of the AI usage)
- ✅ Verifies psychology flows through
- ✅ Tests output differences

The crew-level tests can be refined later as needed.

## Future Improvements

1. **Better CrewAI Mocking**: Create a more robust mock for CrewAI's LLM system
2. **Manager LLM Mocking**: Mock the hierarchical manager LLM
3. **Full Pipeline Test**: Test with all LLM calls mocked (tools + agents + manager)

## Notes

- Tests use `monkeypatch` to inject mocks at application level
- No application code modified except for injectable hooks (`_MOCK_OPENAI_CLIENT`)
- Tests are fast because they mock OpenAI calls
- Tests verify real behavior, not just test infrastructure

