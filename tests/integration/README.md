# Integration Test Suites

Feature-wise integration test suites that can be run independently.

## Test Suites

### 1. Validation Flows
**File:** `test_validation_flows.py`  
**Run:** `pytest tests/integration/test_validation_flows.py -v`  
**Covers:**
- Validation score extraction from markdown
- Validation editing and retrieval
- Score mapping to all 10 parameters
- Validation workflow end-to-end

### 2. Founder Connect Flows
**File:** `test_founder_connect_flows.py`  
**Run:** `pytest tests/integration/test_founder_connect_flows.py -v`  
**Covers:**
- Creating listings from advisor runs
- Creating listings from validations
- Connection request workflow
- Credit system integration

### 3. Discovery Flows
**File:** `test_discovery_flows.py`  
**Run:** `pytest tests/integration/test_discovery_flows.py -v`  
**Covers:**
- Discovery run creation and retrieval
- Run lookup for listings
- Run appears in activity

### 4. Authentication Flows
**File:** `test_auth_flows.py`  
**Run:** `pytest tests/integration/test_auth_flows.py -v`  
**Covers:**
- User registration
- User login
- Session management
- Logout

### 5. Dashboard Flows
**File:** `test_dashboard_flows.py`  
**Run:** `pytest tests/integration/test_dashboard_flows.py -v`  
**Covers:**
- Dashboard data retrieval
- Pagination
- Usage statistics

## Running All Integration Tests

```bash
# Run all integration tests
pytest tests/integration/ -v

# Run specific suite
pytest tests/integration/test_validation_flows.py -v

# Run with coverage
pytest tests/integration/ --cov=app --cov-report=html
```

## Test Organization

Each test suite is organized by feature and tests:
- End-to-end workflows
- Component interactions
- Data flow between frontend and backend
- Error handling
- Edge cases

These tests complement unit tests by verifying that components work together correctly.

