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
  const [showModal, setShowModal] = useState(false);
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
        setShowModal(true);
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
      const stage = "idea"; // Default, can be improved
      const skillsNeeded = []; // Can be extracted from categoryAnswers if available

      // Create the listing
      const createRes = await fetch("/api/founder/ideas", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ideaTitle || "My startup idea",
          source_type: sourceType,
          source_id: sourceId,
          industry: industry,
          stage: stage,
          skills_needed: skillsNeeded,
          brief_description: ideaTitle || "Looking for collaborators to help bring this idea to life.",
        }),
      });

      if (createRes.ok) {
        const createData = await createRes.json();
        if (createData.success) {
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
      console.error("Error opening idea for collaborators:", err);
      alert("Failed to open idea for collaborators. Please try again.");
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

      {showModal && (
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
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
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

