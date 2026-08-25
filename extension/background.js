/**
 * Smart Education Assistant - Background Service Worker (MV3)
 * Manages pairing code exchange, connection tokens, and secure profile fields retrieval (Step 6C).
 */

const API_BASE_URL = "http://localhost:3000";

// Categorize fetch and server errors safely without leaking sensitive information
function categorizeError(status, data, isNetworkError = false) {
  if (isNetworkError) {
    return "Server unavailable. Please ensure http://localhost:3000 is running.";
  }

  if (data && typeof data.error === "string") {
    const err = data.error.toUpperCase();
    if (err.includes("CONNECTION_EXPIRED") || err.includes("SESSION_EXPIRED") || err.includes("EXPIRED")) {
      return "Extension connection expired.";
    }
    if (err.includes("AUTHENTICATION_FAILED") || err.includes("NOT_AUTHENTICATED") || err.includes("AUTH")) {
      return "Profile API authentication failed.";
    }
    if (err.includes("NO_FIELDS_REQUESTED") || err.includes("PROFILE_NOT_FOUND")) {
      return "Requested profile fields are unavailable.";
    }
    if (err.includes("SERVER_ERROR")) {
      return "Server error occurred.";
    }
    return data.message || data.error;
  }

  if (status === 400) return "Requested profile fields are unavailable.";
  if (status === 401) return "Extension connection expired.";
  if (status >= 500) return "Server error occurred.";

  return "Profile request failed.";
}

// Verify connection against Next.js API
async function checkConnectionWithServer(connectionId) {
  const url = `${API_BASE_URL}/api/extension/profile`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${connectionId}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 401) {
      return { valid: false, error: "Extension connection expired." };
    }

    if (!res.ok) {
      return { valid: false, error: "Server unavailable. Please ensure http://localhost:3000 is running." };
    }

    const data = await res.json();
    return { valid: true, data };
  } catch (err) {
    console.warn(`[SEA] Connection verification failed at ${url}:`, err);
    return { valid: false, error: "Server unavailable. Please ensure http://localhost:3000 is running." };
  }
}

// Centralized message router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. Open Website Extension Setup Page
  if (message.type === "OPEN_DASHBOARD") {
    chrome.tabs.create({ url: `${API_BASE_URL}/dashboard/extension` });
    sendResponse({ success: true });
    return true;
  }

  // 2. Submit One-Time Pairing Code
  if (message.type === "SUBMIT_PAIRING_CODE") {
    (async () => {
      const url = `${API_BASE_URL}/api/extension/connect`;
      try {
        const { code } = message;
        if (!code || typeof code !== "string" || !code.trim()) {
          sendResponse({ success: false, error: "Invalid connection code" });
          return;
        }

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: code.trim() }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.connected || !data.connection_id) {
          const safeError = categorizeError(res.status, data, false);
          sendResponse({
            success: false,
            error: safeError,
          });
          return;
        }

        // Store connection securely in chrome.storage.local
        const sessionPayload = {
          connection_id: data.connection_id,
          user_id: data.user_id,
          connected: true,
          connected_at: new Date().toISOString(),
        };

        await chrome.storage.local.set({ extension_session: sessionPayload });
        await chrome.action.setBadgeText({ text: "✓" });
        await chrome.action.setBadgeBackgroundColor({ color: "#16A34A" });

        sendResponse({
          success: true,
          user_id: data.user_id,
          connection_id: data.connection_id,
        });
      } catch (err) {
        console.error(`[SEA] Pairing network error at ${url}:`, err);
        sendResponse({ success: false, error: "Server unavailable. Please ensure http://localhost:3000 is running." });
      }
    })();
    return true;
  }

  // 3. Disconnect Extension
  if (message.type === "DISCONNECT_EXTENSION") {
    (async () => {
      try {
        const { extension_session } = await chrome.storage.local.get("extension_session");
        if (extension_session && extension_session.connection_id) {
          fetch(`${API_BASE_URL}/api/extension/disconnect`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${extension_session.connection_id}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ connection_id: extension_session.connection_id }),
          }).catch(() => {});
        }

        await chrome.storage.local.remove("extension_session");
        await chrome.action.setBadgeText({ text: "" });
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // 4. Check Connection Status
  if (message.type === "GET_CONNECTION_STATUS") {
    (async () => {
      try {
        const { extension_session } = await chrome.storage.local.get("extension_session");
        if (!extension_session || !extension_session.connection_id) {
          sendResponse({ connected: false, error: "Not connected" });
          return;
        }

        // Verify with server
        const check = await checkConnectionWithServer(extension_session.connection_id);

        if (check.valid) {
          sendResponse({
            connected: true,
            user_id: check.data?.user_id || extension_session.user_id,
          });
        } else {
          if (check.error === "Extension connection expired.") {
            await chrome.storage.local.remove("extension_session");
            await chrome.action.setBadgeText({ text: "" });
          }
          sendResponse({
            connected: false,
            error: check.error || "Connection failed",
          });
        }
      } catch (err) {
        sendResponse({ connected: false, error: "Server unavailable. Please ensure http://localhost:3000 is running." });
      }
    })();
    return true;
  }

  // 5. Fetch Profile Fields for Approved Mappings (Step 6C)
  if (message.type === "FETCH_PROFILE_FIELDS") {
    (async () => {
      try {
        const { extension_session } = await chrome.storage.local.get("extension_session");
        if (!extension_session || !extension_session.connection_id) {
          console.warn("[SEA] Profile API request failed: No active connection found in local storage");
          sendResponse({ success: false, error: "Extension not connected. Please connect account first." });
          return;
        }

        const url = `${API_BASE_URL}/api/extension/profile-fields`;
        console.log(`[SEA] Profile API URL: ${url}`);

        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${extension_session.connection_id}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: message.fields || [],
            confirmed_sensitive: message.confirmed_sensitive || [],
          }),
        });

        console.log(`[SEA] Profile API status: ${res.status}`);

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const safeError = categorizeError(res.status, data, false);
          console.warn(`[SEA] Profile API request failed: HTTP ${res.status} -> ${safeError}`);
          sendResponse({
            success: false,
            error: safeError,
          });
          return;
        }

        sendResponse(data);
      } catch (err) {
        console.error("[SEA] Profile API request failed: Network/Fetch error", err);
        sendResponse({ success: false, error: "Server unavailable. Please ensure http://localhost:3000 is running." });
      }
    })();
    return true;
  }

  // 6. Intelligent Semantic Field Mapping (Step 6D - AI Fallback)
  if (message.type === "SEMANTIC_MAP_FIELDS") {
    (async () => {
      try {
        const { extension_session } = await chrome.storage.local.get("extension_session");
        if (!extension_session || !extension_session.connection_id) {
          sendResponse({ success: false, error: "Extension not connected. Please connect account first." });
          return;
        }

        const url = `${API_BASE_URL}/api/extension/semantic-map`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${extension_session.connection_id}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: message.fields || [],
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const safeError = categorizeError(res.status, data, false);
          sendResponse({ success: false, error: safeError });
          return;
        }

        sendResponse(data);
      } catch (err) {
        console.error("[SEA] Semantic Map API network error:", err);
        sendResponse({ success: false, error: "Server unavailable. Please ensure http://localhost:3000 is running." });
      }
    })();
    return true;
  }

  return false;
});
