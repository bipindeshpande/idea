import { useState, memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

function OpenForCollaboratorsButton({ 
  validationId, 
  runId,
  sourceType, 
  sourceId, 
  ideaTitle, 
  categoryAnswers,
  ideaIndex 
}) {
  const [loading, setLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [listingData, setListingData] = useState(null);
  const navigate = useNavigate();
  const { getAuthHeaders, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  const handleClick = async () => {
    setLoading(true);
    try {
      // Check if user has a founder profile
      const profileRes = await fetch("/api/founder/profile", { headers: getAuthHeaders() });
      let hasProfile = false;
      
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        hasProfile = profileData.success && profileData.profile;
      }

      if (!hasProfile) {
        // Show modal to create profile first
        setShowProfileModal(true);
        setLoading(false);
        return;
      }

      // Check if listing already exists
      const listingsRes = await fetch("/api/founder/ideas", { headers: getAuthHeaders() });
      if (listingsRes.ok) {
        const listingsData = await listingsRes.json();
        if (listingsData.success) {
          const existingListing = listingsData.listings?.find(
            l => l.source_type === sourceType && l.source_id === sourceId
          );
          if (existingListing) {
            // Navigate to Founder Connect with listings tab
            navigate("/founder-connect?tab=listings");
            setLoading(false);
            return;
          }
        }
      }

      // Extract data for listing
      const industry = categoryAnswers?.industry || categoryAnswers?.category_answers?.industry || "Not specified";
      const stage = categoryAnswers?.stage || categoryAnswers?.category_answers?.stage || "idea";
      const skillsNeeded = categoryAnswers?.skills_needed || categoryAnswers?.category_answers?.skills_needed || [];

      // Prepare listing data and show confirmation modal
      const preparedData = {
        title: ideaTitle || "My startup idea",
        source_type: sourceType,
        source_id: sourceId,
        industry: industry,
        stage: stage,
        skills_needed: Array.isArray(skillsNeeded) ? skillsNeeded : [],
        brief_description: ideaTitle || "Looking for collaborators to help bring this idea to life.",
      };

      setListingData(preparedData);
      setShowConfirmModal(true);
    } catch (err) {
      console.error("Error preparing listing:", err);
      alert("Failed to prepare listing. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCreate = async () => {
    if (!listingData) return;
    
    setLoading(true);
    try {
      const createRes = await fetch("/api/founder/ideas", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(listingData),
      });

      if (createRes.ok) {
        const createData = await createRes.json();
        if (createData.success) {
          setShowConfirmModal(false);
          // Navigate to Founder Connect with listings tab
          navigate("/founder-connect?tab=listings");
        } else {
          alert(createData.error || "Failed to create listing");
        }
      } else {
        const errorData = await createRes.json().catch(() => ({}));
        alert(errorData.error || "Failed to create listing");
      }
    } catch (err) {
      console.error("Error creating listing:", err);
      alert("Failed to create listing. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    try {
      // Create a basic profile
      const res = await fetch("/api/founder/profile", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          is_public: true,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        // Retry opening for collaborators
        handleClick();
      } else {
        alert("Failed to create profile. Please try again.");
      }
    } catch (err) {
      console.error("Error creating profile:", err);
      alert("Failed to create profile. Please try again.");
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-xl border border-brand-300 dark:border-brand-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-brand-700 dark:text-brand-400 shadow-sm transition hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Opening..." : "🤝 Open for Collaborators"}
      </button>

      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Create Founder Profile</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              To list your idea and find collaborators, you need to create a Founder Profile first.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCreateProfile}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
              >
                Create Profile
              </button>
              <button
                onClick={() => setShowProfileModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && listingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Create Idea Listing</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              This will create a listing from your {sourceType === "validation" ? "validated idea" : "discovered idea"}:
            </p>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg mb-4 space-y-2">
              <p><strong>Title:</strong> {listingData.title}</p>
              <p><strong>Industry:</strong> {listingData.industry}</p>
              <p><strong>Stage:</strong> {listingData.stage}</p>
              {listingData.skills_needed && listingData.skills_needed.length > 0 && (
                <p><strong>Skills Needed:</strong> {listingData.skills_needed.join(", ")}</p>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              You'll be redirected to Founder Connect where you can manage this listing and find collaborators.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmCreate}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Listing"}
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setListingData(null);
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(OpenForCollaboratorsButton);

