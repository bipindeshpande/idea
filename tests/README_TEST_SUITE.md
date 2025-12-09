# AI Behavior Test Suite

This test suite verifies that the founder_psychology integration produces different idea rankings, tone, risk framing, and roadmaps across different personas.

## Test Structure

```
tests/
├── helpers/
│   ├── mock_llm.py              # Mock LLM for deterministic testing
│   ├── persona_inputs.py        # Test input data for three personas
│   └── snapshot_utils.py         # Snapshot loading/saving utilities
├── integration/
│   ├── test_discovery_ranking_changes.py    # Ranking differences
│   ├── test_discovery_tone_changes.py       # Tone differences
│   ├── test_discovery_risk_framing_changes.py  # Risk framing differences
│   └── test_discovery_roadmap_changes.py    # Roadmap pacing differences
├── regression/
│   ├── snapshots/
│   │   ├── persona_risk_averse.json
│   │   ├── persona_fast_executor.json
│   │   └── persona_low_time.json
│   └── test_snapshot_personas.py            # Snapshot regression tests
└── unit/
    └── test_founder_psychology_fields.py    # Psychology structure validation
```

## Running Tests

### Run all tests
```bash
pytest tests/
```

### Run specific test suites
```bash
# Unit tests
pytest tests/unit/

# Integration tests
pytest tests/integration/

# Regression tests
pytest tests/regression/
```

### Run specific test files
```bash
pytest tests/integration/test_discovery_ranking_changes.py
pytest tests/integration/test_discovery_tone_changes.py
pytest tests/integration/test_discovery_risk_framing_changes.py
pytest tests/integration/test_discovery_roadmap_changes.py
pytest tests/regression/test_snapshot_personas.py
pytest tests/unit/test_founder_psychology_fields.py
```

## Test Coverage

### Integration Tests

1. **Ranking Differences** (`test_discovery_ranking_changes.py`)
   - Verifies different personas produce different idea rankings
   - Tests top idea differs by persona
   - Validates idea scores reflect persona preferences
   - Checks rankings align with interest areas

2. **Tone Differences** (`test_discovery_tone_changes.py`)
   - Verifies different personas produce different tones
   - Tests tone matches persona psychology
   - Validates distinct tones across personas

3. **Risk Framing Differences** (`test_discovery_risk_framing_changes.py`)
   - Verifies different personas produce different risk styles
   - Tests risk style matches persona fears
   - Validates distinct risk framing across personas

4. **Roadmap Pacing Differences** (`test_discovery_roadmap_changes.py`)
   - Verifies roadmaps differ based on energy patterns
   - Tests roadmap pacing matches time commitment
   - Validates all timeframes (30/60/90) differ
   - Checks roadmap reflects decision style

### Regression Tests

**Snapshot Tests** (`test_snapshot_personas.py`)
- `test_risk_averse_snapshot()` - Validates risk-averse persona output
- `test_fast_executor_snapshot()` - Validates fast-executor persona output
- `test_low_time_snapshot()` - Validates low-time persona output

### Unit Tests

**Psychology Structure** (`test_founder_psychology_fields.py`)
- Validates required fields exist
- Tests all personas have valid structure
- Verifies field value types
- Checks personas have different characteristics
- Validates optional fields handling

## Personas

### Risk Averse
- **Goal**: Replace job
- **Time**: 5-10 hours
- **Decision Style**: Slow
- **Energy Pattern**: Steady
- **Tone**: Reassuring
- **Risk Style**: Avoid high upfront investment

### Fast Executor
- **Goal**: Create business
- **Time**: 20 hours
- **Decision Style**: Fast
- **Energy Pattern**: Bursts
- **Tone**: Direct
- **Risk Style**: Bias toward action

### Low Time
- **Goal**: Side income
- **Time**: 1-3 hours
- **Decision Style**: Slow
- **Energy Pattern**: Low
- **Tone**: Supportive
- **Risk Style**: Minimize ops

## MockLLM

The `MockLLM` class provides deterministic responses for testing:
- Returns predictable outputs based on persona
- No actual LLM API calls during tests
- Fast test execution
- Consistent results for regression testing

## Notes

- Tests run without launching the full web server
- All tests use MockLLM to avoid real API calls
- Snapshot tests detect regressions in output format
- Integration tests verify persona-specific behavior differences

