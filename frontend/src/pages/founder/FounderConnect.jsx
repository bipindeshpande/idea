import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import LoadingIndicator from "../../components/common/LoadingIndicator.jsx";
import { ToastContainer } from "../../components/common/Toast.jsx";

export default function FounderConnectPage() {
  const { user, isAuthenticated, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "profile"); // "profile", "listings", "browse-ideas", "browse-people", "connections"
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [browseIdeas, setBrowseIdeas] = useState([]);
  const [browsePeople, setBrowsePeople] = useState([]);
  const [connections, setConnections] = useState({ sent: [], received: [] });
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "success", duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadInitialData();
    
    // Update active tab from URL params
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [isAuthenticated, navigate, searchParams]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load profile, usage, and connections in parallel
      const [profileRes, usageRes, connectionsRes] = await Promise.all([
        fetch("/api/founder/profile", { headers: getAuthHeaders() }),
        fetch("/api/user/usage", { headers: getAuthHeaders() }),
        fetch("/api/founder/connections", { headers: getAuthHeaders() }),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.success) {
          setProfile(profileData.profile);
        }
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        if (usageData.success) {
          setUsage(usageData.usage);
        }
      }

      if (connectionsRes.ok) {
        const connectionsData = await connectionsRes.json();
        if (connectionsData.success) {
          setConnections(connectionsData);
        }
      }
    } catch (err) {
      setError("Failed to load data. Please try again.");
      console.error("Error loading founder connect data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadListings = async () => {
    try {
      const res = await fetch("/api/founder/ideas", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setListings(data.listings || []);
        }
      }
    } catch (err) {
      console.error("Error loading listings:", err);
    }
  };

  const loadBrowseIdeas = async (page = 1) => {
    try {
      const res = await fetch(`/api/founder/ideas/browse?page=${page}&per_page=20`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBrowseIdeas(data.listings || []);
        }
      }
    } catch (err) {
      console.error("Error loading browse ideas:", err);
    }
  };

  const loadBrowsePeople = async (page = 1) => {
    try {
      const res = await fetch(`/api/founder/people/browse?page=${page}&per_page=20`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBrowsePeople(data.profiles || []);
        }
      }
    } catch (err) {
      console.error("Error loading browse people:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "listings") {
      loadListings();
    } else if (activeTab === "browse-ideas") {
      loadBrowseIdeas();
    } else if (activeTab === "browse-people") {
      loadBrowsePeople();
    }
  }, [activeTab]);

  if (loading) {
    return <LoadingIndicator message="Loading Founder Connect..." />;
  }

  const connectionCredits = usage?.connections || { used: 0, limit: 0, remaining: 0 };

  return (
    <>
      <Seo
        title="Founder Connect - Find Co-Founders & Collaborators | IdeaBunch"
        description="Connect with other founders, find co-founders, and collaborate on startup ideas."
      />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Founder Connect
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Connect with other founders, find co-founders, and collaborate on startup ideas.
          </p>
        </div>

        {/* Credits Display */}
        <div className="mb-6 p-4 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-200 dark:border-brand-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Connections this month
              </p>
              <p className="text-2xl font-bold text-brand-700 dark:text-brand-400">
                {connectionCredits.used} / {connectionCredits.limit === 999 ? "∞" : connectionCredits.limit}
              </p>
              {connectionCredits.limit !== 999 && (
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {connectionCredits.remaining} remaining
                </p>
              )}
            </div>
            {connectionCredits.remaining === 0 && connectionCredits.limit !== 999 && (
              <button
                onClick={() => navigate("/pricing")}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
              >
                Upgrade Plan
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
          <nav className="flex space-x-8">
            {[
              { id: "profile", label: "My Profile" },
              { id: "listings", label: "My Listings" },
              { id: "browse-ideas", label: "Browse Ideas" },
              { id: "browse-people", label: "Browse Founders" },
              { id: "connections", label: "Connections" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === tab.id
                    ? "border-brand-500 text-brand-600 dark:text-brand-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                {tab.label}
                {tab.id === "connections" && (connections.sent?.length > 0 || connections.received?.length > 0) && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 rounded-full">
                    {(connections.sent?.length || 0) + (connections.received?.length || 0)}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "profile" && (
            <ProfileTab profile={profile} onUpdate={loadInitialData} getAuthHeaders={getAuthHeaders} addToast={addToast} />
          )}
          {activeTab === "listings" && (
            <ListingsTab listings={listings} onUpdate={loadListings} getAuthHeaders={getAuthHeaders} addToast={addToast} />
          )}
          {activeTab === "browse-ideas" && (
            <BrowseIdeasTab ideas={browseIdeas} onUpdate={loadBrowseIdeas} getAuthHeaders={getAuthHeaders} credits={connectionCredits} addToast={addToast} />
          )}
          {activeTab === "browse-people" && (
            <BrowsePeopleTab people={browsePeople} onUpdate={loadBrowsePeople} getAuthHeaders={getAuthHeaders} credits={connectionCredits} addToast={addToast} />
          )}
          {activeTab === "connections" && (
            <ConnectionsTab connections={connections} onUpdate={loadInitialData} getAuthHeaders={getAuthHeaders} addToast={addToast} />
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-400">
            {error}
          </div>
        )}

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </>
  );
}

// Profile Tab Component
function ProfileTab({ profile, onUpdate, getAuthHeaders, addToast }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    skills: [],
    experience_summary: "",
    location: "",
    linkedin_url: "",
    website_url: "",
    primary_skills: [],
    industries_of_interest: [],
    looking_for: "",
    commitment_level: "",
    is_public: true,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        skills: profile.skills || [],
        experience_summary: profile.experience_summary || "",
        location: profile.location || "",
        linkedin_url: profile.linkedin_url || "",
        website_url: profile.website_url || "",
        primary_skills: profile.primary_skills || [],
        industries_of_interest: profile.industries_of_interest || [],
        looking_for: profile.looking_for || "",
        commitment_level: profile.commitment_level || "",
        is_public: profile.is_public !== false,
      });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/founder/profile", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEditing(false);
          onUpdate();
          addToast("Profile saved successfully", "success");
        } else {
          addToast(data.error || "Failed to save profile", "error");
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        addToast(errorData.error || "Failed to save profile", "error");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      addToast("Failed to save profile. Please try again.", "error");
    }
  };

  if (!profile && !editing) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <p className="text-slate-600 dark:text-slate-400 mb-4">Create your Founder Profile</p>
        <p className="text-sm text-slate-500 dark:text-slate-500 mb-6">Set up your profile to start connecting with other founders.</p>
        <button
          onClick={() => setEditing(true)}
          className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
        >
          Create Profile
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      {editing ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
          {/* Form fields - simplified for now */}
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={4}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 border rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold">My Profile</h2>
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Edit
            </button>
          </div>
          <div className="space-y-2">
            <p><strong>Name:</strong> {profile?.full_name || "Not set"}</p>
            <p><strong>Bio:</strong> {profile?.bio || "Not set"}</p>
            <p><strong>Location:</strong> {profile?.location || "Not set"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Listings Tab Component
function ListingsTab({ listings, onUpdate, getAuthHeaders, addToast }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">My Idea Listings</h2>
      </div>
      {listings.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-400 mb-2">You haven't listed any ideas yet.</p>
          <p className="text-sm text-slate-500 dark:text-slate-500">List your validated ideas or recommendations to find collaborators.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <div key={listing.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-bold text-lg mb-2">{listing.title}</h3>
              <p className="text-slate-600 dark:text-slate-400">{listing.brief_description}</p>
              <div className="mt-2 flex gap-2">
                {listing.industry && <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm">{listing.industry}</span>}
                {listing.stage && <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm">{listing.stage}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Browse Ideas Tab Component
function BrowseIdeasTab({ ideas, onUpdate, getAuthHeaders, credits, addToast }) {
  const handleConnect = async (idea) => {
    if (credits.remaining === 0 && credits.limit !== 999) {
      addToast("You've reached your connection limit. Please upgrade to send more requests.", "error", 5000);
      return;
    }

    // Get recipient profile ID from the idea's founder info
    // Note: browse endpoint doesn't return founder_profile_id, so we need to get it from the idea listing detail
    // For now, we'll need to pass it differently or fetch it
    // Actually, looking at the API, the browse endpoint should return the founder profile ID in a way we can use
    // But for privacy, we shouldn't expose it. Let's check the API response structure.
    
    try {
      // First, get the listing detail to find the founder profile ID
      // Actually, we can't do that without exposing identity. Let's modify the approach.
      // The browse endpoint should return a way to connect without exposing identity.
      // For now, we'll need to pass the listing ID and let the backend figure it out.
      
      const res = await fetch("/api/founder/connect", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          idea_listing_id: idea.id,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          addToast("Connection request sent!", "success");
          onUpdate();
        } else {
          addToast(data.error || "Failed to send request", "error");
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        addToast(errorData.error || "Failed to send request", "error");
      }
    } catch (err) {
      console.error("Error sending connection:", err);
      addToast("Failed to send connection request", "error");
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Browse Ideas</h2>
      {ideas.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-400 mb-2">No matching ideas found yet.</p>
          <p className="text-sm text-slate-500 dark:text-slate-500">Check back later or list your own idea to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ideas.map((idea) => (
            <div key={idea.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-bold text-lg mb-2">{idea.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">{idea.brief_description}</p>
              <div className="flex gap-2 mb-4">
                {idea.industry && <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm">{idea.industry}</span>}
                {idea.stage && <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm">{idea.stage}</span>}
              </div>
              {idea.founder && (
                <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                  <p>Looking for: {idea.founder.looking_for || "Collaborators"}</p>
                  {idea.founder.primary_skills && idea.founder.primary_skills.length > 0 && (
                    <p className="mt-1">Skills: {idea.founder.primary_skills.join(", ")}</p>
                  )}
                </div>
              )}
              <button
                onClick={() => handleConnect(idea)}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={credits.remaining === 0 && credits.limit !== 999}
              >
                Connect
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Browse People Tab Component
function BrowsePeopleTab({ people, onUpdate, getAuthHeaders, credits, addToast }) {
  const handleConnect = async (recipientProfileId) => {
    if (credits.remaining === 0 && credits.limit !== 999) {
      addToast("You've reached your connection limit. Please upgrade to send more requests.", "error", 5000);
      return;
    }

    try {
      const res = await fetch("/api/founder/connect", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_profile_id: recipientProfileId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          addToast("Connection request sent!", "success");
          onUpdate();
        } else {
          addToast(data.error || "Failed to send request", "error");
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        addToast(errorData.error || "Failed to send request", "error");
      }
    } catch (err) {
      console.error("Error sending connection:", err);
      addToast("Failed to send connection request", "error");
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Browse Founders</h2>
      {people.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-400 mb-2">No matching founders found yet.</p>
          <p className="text-sm text-slate-500 dark:text-slate-500">Check back later or create your profile to get discovered.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {people.map((person) => (
            <div key={person.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2">Founder Profile</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-2">{person.looking_for || "Looking for collaborators"}</p>
                  {person.primary_skills && person.primary_skills.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-2">
                      {person.primary_skills.map((skill, idx) => (
                        <span key={idx} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm">{skill}</span>
                      ))}
                    </div>
                  )}
                  {person.commitment_level && (
                    <p className="text-sm text-slate-500 dark:text-slate-500">Commitment: {person.commitment_level}</p>
                  )}
                  {/* DO NOT display: full_name, email, linkedin_url, website_url, location, user_id */}
                </div>
                <button
                  onClick={() => handleConnect(person.id)}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed ml-4"
                  disabled={credits.remaining === 0 && credits.limit !== 999}
                >
                  Connect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Connections Tab Component
function ConnectionsTab({ connections, onUpdate, getAuthHeaders, addToast }) {
  const handleRespond = async (connectionId, action) => {
    try {
      const res = await fetch(`/api/founder/connections/${connectionId}/respond`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          addToast(action === "accept" ? "Connection accepted!" : "Connection declined", "success");
          onUpdate();
        } else {
          addToast(data.error || "Failed to respond to request", "error");
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        addToast(errorData.error || "Failed to respond to request", "error");
      }
    } catch (err) {
      console.error("Error responding to connection:", err);
      addToast("Failed to respond to connection request", "error");
    }
  };

  const acceptedConnections = [
    ...(connections.received || []).filter(req => req.status === "accepted"),
    ...(connections.sent || []).filter(req => req.status === "accepted"),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4">Received Requests</h2>
        {!connections.received || connections.received.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400">No incoming requests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {connections.received.map((req) => (
              <div key={req.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <p className="mb-2">{req.message || "Connection request"}</p>
                <p className="text-sm text-slate-500 mb-4">Status: {req.status}</p>
                {req.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(req.id, "accept")}
                      className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespond(req.id, "decline")}
                      className="px-4 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Decline
                    </button>
                  </div>
                )}
                {req.status === "accepted" && req.sender && req.sender.email && (
                  <div className="mt-4 p-4 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
                    <p className="font-semibold mb-2">Contact Information:</p>
                    {req.sender.full_name && <p><strong>Name:</strong> {req.sender.full_name}</p>}
                    <p><strong>Email:</strong> {req.sender.email}</p>
                    {req.sender.linkedin_url && <p><strong>LinkedIn:</strong> <a href={req.sender.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{req.sender.linkedin_url}</a></p>}
                    {req.sender.website_url && <p><strong>Website:</strong> <a href={req.sender.website_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{req.sender.website_url}</a></p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Sent Requests</h2>
        {!connections.sent || connections.sent.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400">No sent requests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {connections.sent.map((req) => (
              <div key={req.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <p className="mb-2">{req.message || "Connection request"}</p>
                <p className="text-sm text-slate-500 mb-4">Status: {req.status}</p>
                {req.status === "accepted" && req.recipient && req.recipient.email && (
                  <div className="mt-4 p-4 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
                    <p className="font-semibold mb-2">Contact Information:</p>
                    {req.recipient.full_name && <p><strong>Name:</strong> {req.recipient.full_name}</p>}
                    <p><strong>Email:</strong> {req.recipient.email}</p>
                    {req.recipient.linkedin_url && <p><strong>LinkedIn:</strong> <a href={req.recipient.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{req.recipient.linkedin_url}</a></p>}
                    {req.recipient.website_url && <p><strong>Website:</strong> <a href={req.recipient.website_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{req.recipient.website_url}</a></p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {acceptedConnections.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Accepted Connections</h2>
          <div className="space-y-4">
            {acceptedConnections.map((req) => (
              <div key={req.id} className="bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-200 dark:border-brand-800 p-6">
                <p className="font-semibold mb-2">
                  {req.sender?.full_name || req.recipient?.full_name || "Connection"}
                </p>
                {(req.sender?.email || req.recipient?.email) && (
                  <p><strong>Email:</strong> {req.sender?.email || req.recipient?.email}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

