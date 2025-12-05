import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);
const SESSION_TOKEN_KEY = "sia_session_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [sessionToken, setSessionToken] = useState(localStorage.getItem(SESSION_TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Track user activity for inactivity timeout
  useEffect(() => {
    if (!sessionToken) return;

    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
    let inactivityTimer;

    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    const checkInactivity = () => {
      const timeSinceActivity = Date.now() - lastActivity;
      if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
        // Session expired due to inactivity
        localStorage.removeItem(SESSION_TOKEN_KEY);
        setSessionToken(null);
        setUser(null);
        setSubscription(null);
        // Clean up event listeners
        events.forEach(event => {
          document.removeEventListener(event, updateActivity, true);
        });
        return;
      }
      inactivityTimer = setTimeout(checkInactivity, 60000); // Check every minute
    };

    inactivityTimer = setTimeout(checkInactivity, 60000);

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [sessionToken, lastActivity]);

  // Load user on mount
  useEffect(() => {
    if (sessionToken) {
      checkAuth();
    } else {
      setLoading(false);
    }
  }, [sessionToken]);

  const checkAuth = useCallback(async () => {
    if (!sessionToken) {
      setUser(null);
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        await checkSubscription();
      } else if (response.status === 401) {
        // Invalid or expired session - silently clear it
        localStorage.removeItem(SESSION_TOKEN_KEY);
        setSessionToken(null);
        setUser(null);
        setSubscription(null);
      } else {
        // Other error - log it
        console.error("Auth check failed with status:", response.status);
        localStorage.removeItem(SESSION_TOKEN_KEY);
        setSessionToken(null);
        setUser(null);
        setSubscription(null);
      }
    } catch (error) {
      // Only log network errors, not expected 401s
      if (error.name !== 'TypeError' || !error.message.includes('fetch')) {
        console.error("Auth check failed:", error);
      }
      localStorage.removeItem(SESSION_TOKEN_KEY);
      setSessionToken(null);
      setUser(null);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  const checkSubscription = useCallback(async () => {
    if (!sessionToken) return;

    try {
      const response = await fetch("/api/subscription/status", {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error("Subscription check failed:", error);
    }
  }, [sessionToken]);

  const register = useCallback(async (email, password) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          return { success: false, error: `Server error: ${response.status}` };
        }
        return { success: false, error: errorData.error || "Registration failed" };
      }

      const data = await response.json();
      if (data.success) {
        localStorage.setItem(SESSION_TOKEN_KEY, data.session_token);
        setSessionToken(data.session_token);
        setUser(data.user);
        await checkSubscription();
        return { success: true };
      } else {
        return { success: false, error: data.error || "Registration failed" };
      }
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, error: error.message || "Network error" };
    }
  }, [checkSubscription]);

  const login = useCallback(async (email, password) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          console.error('Failed to parse error response:', errorText);
          return { success: false, error: `Server error: ${response.status}` };
        }
        console.error('Login failed:', errorData);
        return { success: false, error: errorData.error || "Login failed" };
      }

      const data = await response.json();
      
      if (data.success) {
        if (!data.session_token) {
          console.error('No session_token in response:', data);
          return { success: false, error: "Login succeeded but no session token received" };
        }
        localStorage.setItem(SESSION_TOKEN_KEY, data.session_token);
        setSessionToken(data.session_token);
        setUser(data.user);
        await checkSubscription();
        return { success: true };
      } else {
        console.error('Login response indicates failure:', data);
        return { success: false, error: data.error || "Login failed" };
      }
    } catch (error) {
      console.error("Login exception:", error);
      return { success: false, error: error.message || "Network error" };
    }
  }, [checkSubscription]);

  const logout = useCallback(async () => {
    try {
      if (sessionToken) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      localStorage.removeItem(SESSION_TOKEN_KEY);
      setSessionToken(null);
      setUser(null);
      setSubscription(null);
    }
  }, [sessionToken]);

  const forgotPassword = useCallback(async (email) => {
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      return { success: data.success, message: data.message, reset_link: data.reset_link };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const resetPassword = useCallback(async (token, password) => {
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();
      return { success: data.success, error: data.error, message: data.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    if (!sessionToken) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });

      const data = await response.json();
      return { success: data.success, error: data.error, message: data.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [sessionToken]);

  const refreshSubscription = useCallback(async () => {
    await checkSubscription();
  }, [checkSubscription]);

  const getAuthHeaders = useCallback(() => {
    if (!sessionToken) return {};
    return {
      Authorization: `Bearer ${sessionToken}`,
    };
  }, [sessionToken]);

  const value = useMemo(
    () => ({
      user,
      subscription,
      sessionToken,
      loading,
      isAuthenticated: !!user,
      isSubscriptionActive: subscription?.is_active ?? false,
      register,
      login,
      logout,
      forgotPassword,
      resetPassword,
      changePassword,
      refreshSubscription,
      checkSubscription,
      checkAuth,
      getAuthHeaders,
    }),
    [user, subscription, sessionToken, loading, register, login, logout, forgotPassword, resetPassword, changePassword, refreshSubscription, checkSubscription, checkAuth, getAuthHeaders]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

