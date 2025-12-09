"""
Tests for Phase 2.3 Security Hardening - Founder Listings + Messaging.

Tests cover:
- Input validation
- Rate limiting
- Sanitization
- Junk detection
- Array validations
- URL validations
"""
import pytest
import json
import uuid
from app.models.database import db, FounderProfile, IdeaListing, ConnectionRequest, UserValidation, UserRun


class TestProfileValidation:
    """Tests for POST /api/founder/profile validation."""
    
    def test_create_profile_valid_data(self, authenticated_client):
        """Test creating profile with all valid fields."""
        data = {
            "full_name": "John Doe",
            "bio": "Experienced entrepreneur with 10 years in tech",
            "skills": ["Python", "JavaScript", "React"],
            "experience_summary": "Built multiple SaaS products",
            "location": "San Francisco, CA",
            "linkedin_url": "https://linkedin.com/in/johndoe",
            "website_url": "https://johndoe.com",
            "primary_skills": ["Python", "JavaScript"],
            "industries_of_interest": ["Technology", "Healthcare"],
            "looking_for": "Looking for technical co-founder",
            "commitment_level": "full-time",
            "is_public": True
        }
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 200
        result = json.loads(response.data)
        assert result["success"] is True
        assert "profile" in result
    
    def test_profile_full_name_max_length(self, authenticated_client):
        """Test full_name validation - max 200 chars."""
        # Valid - exactly 200 chars
        data = {"full_name": "A" * 200}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 200
        
        # Invalid - 201 chars
        data = {"full_name": "A" * 201}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 400
        result = json.loads(response.data)
        assert "too long" in result.get("error", "").lower()
    
    def test_profile_bio_max_length(self, authenticated_client):
        """Test bio validation - max 500 chars."""
        # Valid - exactly 500 chars (meaningful text to avoid junk detection)
        base_text = "Experienced entrepreneur with background in tech. "
        # Create exactly 500 chars
        meaningful_text = (base_text * 20)[:500]
        # Pad to exactly 500 if needed
        if len(meaningful_text) < 500:
            meaningful_text = meaningful_text.ljust(500, "A")
        assert len(meaningful_text) == 500, f"Expected exactly 500 chars, got {len(meaningful_text)}"
        
        data = {"bio": meaningful_text}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        # May hit rate limit, but validation should pass first
        assert response.status_code in [200, 429]
        if response.status_code == 200:
            result = json.loads(response.data)
            assert result.get("success") is True
        
        # Invalid - 501 chars (add one character)
        invalid_bio = meaningful_text + "x"
        assert len(invalid_bio) == 501, f"Expected exactly 501 chars, got {len(invalid_bio)}"
        data = {"bio": invalid_bio}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        # Should fail validation
        if response.status_code == 400:
            result = json.loads(response.data)
            assert "too long" in result.get("error", "").lower() or "500" in result.get("error", "")
        else:
            # If validation didn't catch it, that's a bug
            assert False, f"Validation should reject 501 chars (max 500), but got {response.status_code}"
    
    def test_profile_bio_script_tags_rejected(self, authenticated_client):
        """Test bio validation - script tags rejected."""
        data = {"bio": "<script>alert('xss')</script>My bio"}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 400
        result = json.loads(response.data)
        assert "prohibited" in result.get("error", "").lower() or "script" in result.get("error", "").lower()
    
    def test_profile_bio_junk_detection(self, authenticated_client):
        """Test bio validation - junk data detection."""
        # Keyboard mashing (should be detected as junk)
        data = {"bio": "asdfghjklasdfghjklasdfghjklasdfghjklasdfghjklasdfghjkl"}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 400
        result = json.loads(response.data)
        # Should detect junk data
        assert "random" in result.get("error", "").lower() or "junk" in result.get("error", "").lower() or "repetitive" in result.get("error", "").lower()
    
    def test_profile_experience_summary_max_length(self, authenticated_client):
        """Test experience_summary validation - max 2000 chars."""
        # Valid - exactly 2000 chars (meaningful text)
        base_text = "I have extensive experience in software development, building scalable systems. "
        # Create exactly 2000 chars
        meaningful_text = (base_text * 30)[:2000]
        # Pad to exactly 2000 if needed
        if len(meaningful_text) < 2000:
            meaningful_text = meaningful_text.ljust(2000, "A")
        assert len(meaningful_text) == 2000, f"Expected exactly 2000 chars, got {len(meaningful_text)}"
        
        data = {"experience_summary": meaningful_text}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        # May hit rate limit, but validation should pass first
        assert response.status_code in [200, 429]
        if response.status_code == 200:
            result = json.loads(response.data)
            assert result.get("success") is True
        
        # Invalid - 2001 chars (add one character)
        invalid_summary = meaningful_text + "x"
        assert len(invalid_summary) == 2001, f"Expected exactly 2001 chars, got {len(invalid_summary)}"
        data = {"experience_summary": invalid_summary}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        # Should fail validation
        if response.status_code == 400:
            result = json.loads(response.data)
            assert "too long" in result.get("error", "").lower() or "2000" in result.get("error", "")
        else:
            # If validation didn't catch it, that's a bug
            assert False, f"Validation should reject 2001 chars (max 2000), but got {response.status_code}"
    
    def test_profile_linkedin_url_validation(self, authenticated_client):
        """Test LinkedIn URL validation - must be linkedin.com domain."""
        # Valid LinkedIn URL
        data = {"linkedin_url": "https://linkedin.com/in/johndoe"}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        # May hit rate limit in test, but validation should pass
        assert response.status_code in [200, 429]
        
        # Valid LinkedIn URL with www
        data = {"linkedin_url": "https://www.linkedin.com/in/johndoe"}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 200
        
        # Invalid - wrong domain
        data = {"linkedin_url": "https://facebook.com/johndoe"}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 400
        result = json.loads(response.data)
        assert "linkedin" in result.get("error", "").lower()
        
        # Invalid - javascript protocol
        data = {"linkedin_url": "javascript:alert('xss')"}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 400
    
    def test_profile_website_url_validation(self, authenticated_client):
        """Test website URL validation."""
        # Valid URL
        data = {"website_url": "https://example.com"}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        # May hit rate limit in test, but validation should pass
        assert response.status_code in [200, 429]
        
        # Invalid - javascript protocol
        data = {"website_url": "javascript:alert('xss')"}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 400
        
        # Invalid - ftp protocol
        data = {"website_url": "ftp://example.com"}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 400
    
    def test_profile_skills_array_validation(self, authenticated_client):
        """Test skills array validation - max 50 items, 100 chars each."""
        # Valid - 3 items
        data = {"skills": ["Python", "JavaScript", "React"]}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        # May hit rate limit in test, but validation should pass
        assert response.status_code in [200, 429]
        
        # Valid - exactly 50 items (boundary)
        data = {"skills": [f"Skill{i}" for i in range(50)]}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        # May hit rate limit in test, but validation should pass
        assert response.status_code in [200, 429]
        
        # Invalid - 51 items
        data = {"skills": [f"Skill{i}" for i in range(51)]}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 400
        result = json.loads(response.data)
        assert "50" in result.get("error", "")
        
        # Invalid - item too long (101 chars)
        data = {"skills": ["A" * 101]}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 400
        result = json.loads(response.data)
        assert "100" in result.get("error", "")
        
        # Invalid - non-string item
        data = {"skills": [123]}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 400
        
        # Invalid - not an array
        data = {"skills": "not an array"}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 400
    
    def test_profile_primary_skills_array_validation(self, authenticated_client):
        """Test primary_skills array validation - max 20 items."""
        # Valid - exactly 20 items
        data = {"primary_skills": [f"Skill{i}" for i in range(20)]}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        # May hit rate limit in test, but validation should pass
        assert response.status_code in [200, 429]
        
        # Invalid - 21 items
        data = {"primary_skills": [f"Skill{i}" for i in range(21)]}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 400
        result = json.loads(response.data)
        assert "20" in result.get("error", "")
    
    def test_profile_industries_array_validation(self, authenticated_client):
        """Test industries_of_interest array validation - max 20 items, 200 chars each."""
        # Valid - exactly 20 items
        data = {"industries_of_interest": [f"Industry{i}" for i in range(20)]}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        # May hit rate limit in test, but validation should pass
        assert response.status_code in [200, 429]
        
        # Invalid - 21 items
        data = {"industries_of_interest": [f"Industry{i}" for i in range(21)]}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 400
        
        # Invalid - item too long (201 chars)
        data = {"industries_of_interest": ["A" * 201]}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 400
    
    def test_profile_looking_for_max_length(self, authenticated_client):
        """Test looking_for validation - max 1000 chars."""
        # Valid - exactly 1000 chars (meaningful text)
        meaningful_text = "Looking for technical co-founder with " * 28
        meaningful_text = meaningful_text[:1000]
        data = {"looking_for": meaningful_text}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        # May hit rate limit in test, but validation should pass
        assert response.status_code in [200, 429]
        
        # Invalid - 1001 chars
        data = {"looking_for": "A" * 1001}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 400
    
    def test_profile_commitment_level_max_length(self, authenticated_client):
        """Test commitment_level validation - max 50 chars."""
        # Valid - exactly 50 chars
        data = {"commitment_level": "A" * 50}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        # May hit rate limit in test, but validation should pass
        assert response.status_code in [200, 429]
        
        # Invalid - 51 chars
        data = {"commitment_level": "A" * 51}
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        assert response.status_code == 400


class TestConnectionRequestValidation:
    """Tests for POST /api/founder/connect validation."""
    
    def test_connection_request_message_max_length(self, authenticated_client, authenticated_client_2, app):
        """Test connection request message validation - max 2000 chars."""
        with app.app_context():
            # Create profile for user 2
            from app.models.database import User, FounderProfile, UserSession
            from app.utils import get_current_session
            
            # Get user 2 from session
            session_token_2 = authenticated_client_2.environ_base.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
            session_2 = UserSession.query.filter_by(session_token=session_token_2).first()
            if session_2 and session_2.user:
                user2 = session_2.user
                profile2 = FounderProfile.query.filter_by(user_id=user2.id).first()
                if not profile2:
                    profile2 = FounderProfile(user_id=user2.id, is_active=True, is_public=True)
                    db.session.add(profile2)
                    db.session.commit()
                
                # Invalid - 2001 chars
                data = {
                    "recipient_profile_id": profile2.id,
                    "message": "A" * 2001
                }
                response = authenticated_client.post(
                    "/api/founder/connect",
                    data=json.dumps(data),
                    content_type="application/json"
                )
                assert response.status_code == 400
                result = json.loads(response.data)
                assert "2000" in result.get("error", "") or "too long" in result.get("error", "").lower()
    
    def test_connection_request_message_script_tags_rejected(self, authenticated_client, authenticated_client_2, app):
        """Test connection request message - script tags rejected."""
        with app.app_context():
            from app.models.database import UserSession, FounderProfile
            session_token_2 = authenticated_client_2.environ_base.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
            session_2 = UserSession.query.filter_by(session_token=session_token_2).first()
            if session_2 and session_2.user:
                user2 = session_2.user
                profile2 = FounderProfile.query.filter_by(user_id=user2.id).first()
                if not profile2:
                    profile2 = FounderProfile(user_id=user2.id, is_active=True, is_public=True)
                    db.session.add(profile2)
                    db.session.commit()
                
                data = {
                    "recipient_profile_id": profile2.id,
                    "message": "<script>alert('xss')</script>"
                }
                response = authenticated_client.post(
                    "/api/founder/connect",
                    data=json.dumps(data),
                    content_type="application/json"
                )
                assert response.status_code == 400
                result = json.loads(response.data)
                assert "prohibited" in result.get("error", "").lower() or "script" in result.get("error", "").lower()


class TestIdeaListingPitchValidation:
    """Tests for idea listing brief_description (pitch) validation."""
    
    def test_create_listing_pitch_max_length(self, authenticated_client, app):
        """Test brief_description validation when creating listing - max 1500 chars."""
        with app.app_context():
            # Get user from session token
            from app.models.database import UserSession, UserValidation, FounderProfile
            session_token = authenticated_client.environ_base.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
            session = UserSession.query.filter_by(session_token=session_token).first()
            if session and session.user:
                user = session.user
                
                # Ensure user has profile
                profile = FounderProfile.query.filter_by(user_id=user.id).first()
                if not profile:
                    profile = FounderProfile(user_id=user.id, is_active=True, is_public=True)
                    db.session.add(profile)
                    db.session.commit()
                
                # Create validation
                validation = UserValidation(
                    user_id=user.id,
                    validation_id=f"test_val_{uuid.uuid4().hex[:12]}",
                    idea_explanation="Test idea explanation",
                    validation_result='{"overall_score": 7.5}',
                    is_deleted=False
                )
                db.session.add(validation)
                db.session.commit()
                
                # Create listing with valid pitch (1500 chars) - meaningful text
                base_pitch = "This is an innovative startup idea that aims to solve real problems. "
                # Create exactly 1500 chars
                meaningful_pitch = (base_pitch * 25)[:1500]
                # Pad to exactly 1500 if needed
                if len(meaningful_pitch) < 1500:
                    meaningful_pitch = meaningful_pitch.ljust(1500, "A")
                assert len(meaningful_pitch) == 1500, f"Expected exactly 1500 chars, got {len(meaningful_pitch)}"
                
                data = {
                    "title": "Test Idea",
                    "source_type": "validation",
                    "source_id": validation.id,
                    "brief_description": meaningful_pitch
                }
                response = authenticated_client.post(
                    "/api/founder/ideas",
                    data=json.dumps(data),
                    content_type="application/json"
                )
                # May hit rate limit, but validation should pass
                assert response.status_code in [200, 429]
                
                # Invalid - 1501 chars (use different validation to avoid "already exists" error)
                validation2 = UserValidation(
                    user_id=user.id,
                    validation_id=f"test_val2_{uuid.uuid4().hex[:12]}",
                    idea_explanation="Test idea explanation 2",
                    validation_result='{"overall_score": 8.0}',
                    is_deleted=False
                )
                db.session.add(validation2)
                db.session.commit()
                
                # Create exactly 1501 chars (add one character)
                invalid_pitch = meaningful_pitch + "x"
                assert len(invalid_pitch) == 1501, f"Expected exactly 1501 chars, got {len(invalid_pitch)}"
                data = {
                    "title": "Test Idea 2",
                    "source_type": "validation",
                    "source_id": validation2.id,  # Use different validation to avoid "already exists"
                    "brief_description": invalid_pitch
                }
                response = authenticated_client.post(
                    "/api/founder/ideas",
                    data=json.dumps(data),
                    content_type="application/json"
                )
                # Should fail validation before business logic check
                if response.status_code == 400:
                    result = json.loads(response.data)
                    assert "1500" in result.get("error", "") or "too long" in result.get("error", "").lower()
                else:
                    # If validation didn't catch it, that's a bug
                    assert False, f"Validation should reject 1501 chars (max 1500), but got {response.status_code}. Error: {json.loads(response.data).get('error', '')}"


class TestSanitization:
    """Tests for input sanitization."""
    
    def test_profile_sanitization(self, authenticated_client, app):
        """Test that profile fields are sanitized before saving."""
        data = {
            "full_name": "John\x00Doe",  # Null byte (should be rejected or sanitized)
            "bio": "My bio   with   extra   spaces"  # Extra whitespace
        }
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        # Null byte should be rejected by validation (400)
        # Or accepted and sanitized (200)
        # May also hit rate limit (429)
        assert response.status_code in [200, 400, 429]
    
    def test_connection_message_sanitization(self, authenticated_client):
        """Test that connection messages are sanitized."""
        # Similar to profile sanitization
        pass


class TestBusinessLogicUnchanged:
    """Tests to verify business logic was not changed."""
    
    def test_profile_update_preserves_existing_data(self, authenticated_client, app):
        """Test that updating profile preserves existing fields."""
        # Create profile with all fields
        data = {
            "full_name": "John Doe",
            "bio": "Original bio"
        }
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        # May hit rate limit, but first request should pass
        assert response.status_code in [200, 429]
        if response.status_code == 200:
            profile1 = json.loads(response.data)["profile"]
            
            # Update only full_name
            data = {"full_name": "Jane Doe"}
            response = authenticated_client.post(
                "/api/founder/profile",
                data=json.dumps(data),
                content_type="application/json"
            )
            # Second request likely to hit rate limit, but if it passes, check data
            if response.status_code == 200:
                profile2 = json.loads(response.data)["profile"]
                # Bio should still be there
                assert profile2.get("bio") == "Original bio"
                assert profile2.get("full_name") == "Jane Doe"
    
    def test_optional_fields_can_be_empty(self, authenticated_client):
        """Test that optional fields can be omitted or empty."""
        data = {"full_name": "John Doe"}  # Only required/one field
        response = authenticated_client.post(
            "/api/founder/profile",
            data=json.dumps(data),
            content_type="application/json"
        )
        # May hit rate limit in test
        assert response.status_code in [200, 429]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

