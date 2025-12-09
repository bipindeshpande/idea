# 🧪 Phase 2.3 Test Plan - Founder Listings + Messaging Security Hardening

## Overview

This test plan validates all security improvements implemented in Phase 2.3:
- Input validation
- Rate limiting
- Sanitization
- Junk detection
- Array validations
- URL validations

---

## Test Categories

### 1. Profile Endpoint Tests (`POST /api/founder/profile`)

#### 1.1 Rate Limiting
- ✅ **Test:** 11 requests within 1 hour should return 429
- ✅ **Test:** 10 requests within 1 hour should all succeed
- ✅ **Test:** Rate limit resets after 1 hour (simulated)

#### 1.2 Field Validation - Text Fields

**Full Name:**
- ✅ Valid: "John Doe" (within 200 chars)
- ❌ Invalid: 201+ character string
- ❌ Invalid: Contains script tags `<script>alert('xss')</script>`
- ❌ Invalid: Contains null bytes `\x00`

**Bio (500 chars max):**
- ✅ Valid: "Experienced entrepreneur with 10 years in tech" (within 500 chars)
- ❌ Invalid: 501+ character string
- ❌ Invalid: Contains script tags
- ✅ Valid: 499 character string (boundary test)
- ❌ Invalid: Junk data (keyboard mashing "asdfghjklasdfghjkl")
- ❌ Invalid: Repeated characters ("aaaaaaa...")

**Experience Summary (2000 chars max):**
- ✅ Valid: Meaningful text within 2000 chars
- ❌ Invalid: 2001+ character string
- ❌ Invalid: Junk data (if >= 50 chars)

**Location (200 chars max):**
- ✅ Valid: "San Francisco, CA"
- ❌ Invalid: 201+ character string

**Looking For (1000 chars max):**
- ✅ Valid: "Looking for technical co-founder"
- ❌ Invalid: 1001+ character string

**Commitment Level (50 chars max):**
- ✅ Valid: "full-time"
- ❌ Invalid: 51+ character string

#### 1.3 URL Validation

**LinkedIn URL:**
- ✅ Valid: "https://linkedin.com/in/johndoe"
- ✅ Valid: "https://www.linkedin.com/in/johndoe"
- ❌ Invalid: "https://facebook.com/johndoe" (wrong domain)
- ❌ Invalid: "javascript:alert('xss')"
- ❌ Invalid: "ftp://example.com"
- ❌ Invalid: Not a valid URL

**Website URL:**
- ✅ Valid: "https://example.com"
- ✅ Valid: "http://example.com"
- ❌ Invalid: "javascript:alert('xss')"
- ❌ Invalid: "ftp://example.com"

#### 1.4 Array Validation

**Skills (max 50 items, 100 chars each):**
- ✅ Valid: ["Python", "JavaScript", "React"]
- ✅ Valid: 50 items (boundary test)
- ❌ Invalid: 51 items
- ❌ Invalid: Item with 101+ chars
- ❌ Invalid: Item with script tags
- ❌ Invalid: Non-string item (number, object)
- ❌ Invalid: Not an array (string)

**Primary Skills (max 20 items, 100 chars each):**
- ✅ Valid: ["Python", "JavaScript"]
- ✅ Valid: 20 items (boundary test)
- ❌ Invalid: 21 items

**Industries of Interest (max 20 items, 200 chars each):**
- ✅ Valid: ["Technology", "Healthcare"]
- ✅ Valid: 20 items (boundary test)
- ❌ Invalid: 21 items
- ❌ Invalid: Item with 201+ chars

#### 1.5 Sanitization Tests
- ✅ **Test:** Script tags are sanitized
- ✅ **Test:** Null bytes are removed
- ✅ **Test:** Whitespace is normalized
- ✅ **Test:** Data saved to DB is sanitized

#### 1.6 Business Logic Verification
- ✅ **Test:** Valid profile can be created
- ✅ **Test:** Valid profile can be updated
- ✅ **Test:** All fields are preserved correctly
- ✅ **Test:** Existing functionality unchanged

---

### 2. Connection Request Tests (`POST /api/founder/connect`)

#### 2.1 Rate Limiting
- ✅ **Test:** 21 requests within 1 hour should return 429
- ✅ **Test:** 20 requests within 1 hour should all succeed

#### 2.2 Message Validation
- ✅ Valid: "Hi, I'm interested in your idea!" (within 2000 chars)
- ❌ Invalid: 2001+ character message
- ❌ Invalid: Contains script tags
- ❌ Invalid: Junk data (if >= 50 chars)
- ✅ Valid: Empty message (optional field)

#### 2.3 Sanitization
- ✅ **Test:** Message sanitized before saving
- ✅ **Test:** Script tags removed from message

#### 2.4 Business Logic Verification
- ✅ **Test:** Connection request created successfully
- ✅ **Test:** Existing validation logic still works (recipient_profile_id, idea_listing_id)
- ✅ **Test:** Cannot send to self
- ✅ **Test:** Duplicate prevention still works

---

### 3. Idea Listing Tests (Pitch Validation)

#### 3.1 Brief Description (Pitch) - Create Listing

**Validation:**
- ✅ Valid: Meaningful pitch within 1500 chars
- ❌ Invalid: 1501+ character pitch
- ❌ Invalid: Contains script tags
- ❌ Invalid: Junk data (if >= 50 chars)
- ✅ Valid: Empty pitch (optional)

**Rate Limiting:**
- ✅ **Test:** Create listing rate limit applied (if exists)

#### 3.2 Brief Description (Pitch) - Update Listing

**Validation:**
- ✅ Valid: Updated pitch within 1500 chars
- ❌ Invalid: 1501+ character pitch
- ❌ Invalid: Contains script tags
- ❌ Invalid: Junk data (if >= 50 chars)

**Business Logic:**
- ✅ **Test:** Existing listing can be updated
- ✅ **Test:** Other fields update correctly

---

### 4. Connection Detail Tests (`GET /api/founder/connections/<id>/detail`)

#### 4.1 Rate Limiting
- ✅ **Test:** 61 requests within 1 hour should return 429
- ✅ **Test:** 60 requests within 1 hour should all succeed

#### 4.2 Business Logic Verification
- ✅ **Test:** Connection detail retrievable
- ✅ **Test:** Authorization still works (only sender/recipient can view)
- ✅ **Test:** Identity revealed only for accepted connections

---

### 5. Junk Data Detection Tests

#### 5.1 Repeated Characters
- ❌ Invalid: "aaaaaaaaaaaaaaaaaaaa" (20+ repeats)
- ✅ Valid: "aaaa" (few repeats, but meaningful)

#### 5.2 Keyboard Mashing
- ❌ Invalid: "asdfghjklasdfghjkl" (keyboard pattern)
- ❌ Invalid: "qwertyuiopqwertyuiop"
- ✅ Valid: "asdf" (short, not detected)

#### 5.3 Low Entropy Text
- ❌ Invalid: "12345678901234567890" (mostly numbers, >= 50 chars)
- ✅ Valid: "I have experience in Python and JavaScript" (meaningful text)

#### 5.4 Repeated Words
- ❌ Invalid: Text with same word repeated 50%+ of content (if >= 10 words)

---

### 6. Integration Tests

#### 6.1 Complete Profile Creation Flow
- ✅ **Test:** Create profile with all valid fields
- ✅ **Test:** Verify all fields saved correctly
- ✅ **Test:** Update profile with new values
- ✅ **Test:** Verify updates saved correctly

#### 6.2 Connection Request Flow
- ✅ **Test:** Create profile
- ✅ **Test:** Send connection request with valid message
- ✅ **Test:** Verify message saved correctly
- ✅ **Test:** Retrieve connection detail

#### 6.3 Idea Listing Flow
- ✅ **Test:** Create idea listing with pitch
- ✅ **Test:** Update idea listing with new pitch
- ✅ **Test:** Verify pitch validation works

---

## Test Execution Plan

### Test Environment Setup
1. Use pytest with existing test fixtures
2. Use in-memory SQLite database
3. Mock rate limiting (or test with disabled rate limits in test mode)
4. Use authenticated test clients

### Test Execution Order
1. **Unit Tests** - Individual validation functions
2. **Integration Tests** - Full endpoint flows
3. **Edge Case Tests** - Boundary conditions
4. **Business Logic Tests** - Verify no regressions

### Test Data
- Use realistic test data for valid cases
- Use malicious input for security tests
- Use boundary values (max length, max items, etc.)
- Use edge cases (empty strings, null, special characters)

---

## Success Criteria

All tests must pass:
- ✅ All validation rules enforced
- ✅ All rate limits working
- ✅ All sanitization applied
- ✅ Junk detection working
- ✅ Business logic unchanged
- ✅ No false positives (valid inputs accepted)
- ✅ No false negatives (invalid inputs rejected)

---

## Notes

1. **Rate Limiting Tests:** May need to mock or disable rate limits in test environment
2. **Database:** Use test fixtures for clean database state
3. **Authentication:** Use authenticated_client fixtures
4. **Cleanup:** Ensure proper cleanup after each test

---

**Status:** Ready for execution

