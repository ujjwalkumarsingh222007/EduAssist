/**
 * Smart Education Assistant - Background Service Worker (MV3)
 * Manages pairing code exchange, connection tokens, and secure profile fields retrieval.
 * Supports both Production (https://edu-assist-two.vercel.app) and Localhost (http://localhost:3000).
 */

importScripts("config.js");

// Categorize fetch and server errors safely without leaking sensitive information
function categorizeError(status, data, isNetworkError = false, domain = "edu-assist-two.vercel.app") {
  if (isNetworkError) {
    return `Unable to connect to EduAssist server (${domain}). Please check your connection.`;
  }

  if (data && typeof data.error === "string") {
    const err = data.error.toUpperCase();
    if (err.includes("CONNECTION_EXPIRED") || err.includes("SESSION_EXPIRED") || err.includes("CODE_EXPIRED") || err.includes("EXPIRED")) {
      return "Authentication expired. Please reconnect your account.";
    }
    if (err.includes("AUTHENTICATION_FAILED") || err.includes("NOT_AUTHENTICATED") || err.includes("AUTH")) {
      return "Profile API authentication failed (401). Please reconnect your account.";
    }
    if (err.includes("NO_FIELDS_REQUESTED") || err.includes("PROFILE_NOT_FOUND")) {
      return "Requested profile fields are unavailable.";
    }
    if (err.includes("INVALID_CODE")) {
      return data.error || "Invalid connection code. Please generate a new code on the dashboard.";
    }
    if (err.includes("SERVER_ERROR")) {
      return `EduAssist server returned an error (${status || 500}).`;
    }
    return data.message || data.error;
  }

  if (status === 400) return "Invalid request or connection code.";
  if (status === 401) return "Authentication expired. Please reconnect your account (401).";
  if (status === 404) return "Profile API endpoint not found (404).";
  if (status >= 500) return `EduAssist server returned an error (${status}).`;

  return `EduAssist request failed (${status}).`;
}

// Verify connection against Next.js API
async function checkConnectionWithServer(connectionId) {
  const baseUrl = await getApiBaseUrl();
  const domain = getDisplayDomain(baseUrl);
  const url = `${baseUrl}/api/extension/profile`;

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
      return { valid: false, error: `Server unavailable. Please ensure EduAssist (${domain}) is reachable.` };
    }

    const data = await res.json();
    return { valid: true, data };
  } catch (err) {
    console.warn(`[SEA] Connection verification failed at ${url}:`, err);
    return { valid: false, error: `Server unavailable. Please ensure EduAssist (${domain}) is reachable.` };
  }
}

// Centralized message router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. Open Website Extension Setup Page
  if (message.type === "OPEN_DASHBOARD") {
    (async () => {
      const baseUrl = await getApiBaseUrl();
      const targetPath = message.path || "/dashboard/extension";
      chrome.tabs.create({ url: `${baseUrl}${targetPath}` });
      sendResponse({ success: true, url: `${baseUrl}${targetPath}` });
    })();
    return true;
  }

  // 2. Submit One-Time Pairing Code
  if (message.type === "SUBMIT_PAIRING_CODE") {
    (async () => {
      const baseUrl = await getApiBaseUrl();
      const domain = getDisplayDomain(baseUrl);
      const url = `${baseUrl}/api/extension/connect`;

      try {
        const { code } = message;
        if (!code || typeof code !== "string" || !code.trim()) {
          sendResponse({ success: false, error: "Invalid connection code" });
          return;
        }

        console.log(`[SEA] Connecting to EduAssist at: ${url}`);

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: code.trim() }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.connected || !data.connection_id) {
          const safeError = categorizeError(res.status, data, false, domain);
          sendResponse({
            success: false,
            error: safeError,
          });
          return;
        }

        // Store connection securely in chrome.storage.local (NO sensitive profile data stored permanently)
        const sessionPayload = {
          connection_id: data.connection_id,
          user_id: data.user_id,
          connected: true,
          connected_at: new Date().toISOString(),
          server_url: baseUrl,
        };

        await chrome.storage.local.set({ extension_session: sessionPayload });
        await chrome.action.setBadgeText({ text: "✓" });
        await chrome.action.setBadgeBackgroundColor({ color: "#16A34A" });

        sendResponse({
          success: true,
          user_id: data.user_id,
          connection_id: data.connection_id,
          server_url: baseUrl,
        });
      } catch (err) {
        console.error(`[SEA] Pairing network error at ${url}:`, err);
        sendResponse({
          success: false,
          error: `Server unavailable. Please ensure EduAssist (${domain}) is reachable.`,
        });
      }
    })();
    return true;
  }

  // 3. Disconnect Extension
  if (message.type === "DISCONNECT_EXTENSION") {
    (async () => {
      try {
        const baseUrl = await getApiBaseUrl();
        const { extension_session } = await chrome.storage.local.get("extension_session");
        if (extension_session && extension_session.connection_id) {
          fetch(`${baseUrl}/api/extension/disconnect`, {
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
      const baseUrl = await getApiBaseUrl();
      const domain = getDisplayDomain(baseUrl);

      try {
        const { extension_session } = await chrome.storage.local.get("extension_session");
        if (!extension_session || !extension_session.connection_id) {
          sendResponse({ connected: false, error: "Not connected", server_url: baseUrl });
          return;
        }

        // Verify with server
        const check = await checkConnectionWithServer(extension_session.connection_id);

        if (check.valid) {
          sendResponse({
            connected: true,
            user_id: check.data?.user_id || extension_session.user_id,
            server_url: baseUrl,
          });
        } else {
          if (check.error === "Extension connection expired.") {
            await chrome.storage.local.remove("extension_session");
            await chrome.action.setBadgeText({ text: "" });
          }
          sendResponse({
            connected: false,
            error: check.error || "Connection failed",
            server_url: baseUrl,
          });
        }
      } catch (err) {
        sendResponse({
          connected: false,
          error: `Server unavailable. Please ensure EduAssist (${domain}) is reachable.`,
          server_url: baseUrl,
        });
      }
    })();
    return true;
  }

  // 5. Fetch Profile Fields for Approved Mappings (Step 6C)
  if (message.type === "FETCH_PROFILE_FIELDS") {
    (async () => {
      const baseUrl = await getApiBaseUrl();
      const domain = getDisplayDomain(baseUrl);

      try {
        const { extension_session } = await chrome.storage.local.get("extension_session");
        if (!extension_session || !extension_session.connection_id) {
          console.warn("[SEA] Profile API request failed: No active connection found in local storage");
          sendResponse({ success: false, error: "Extension not connected. Please connect account first." });
          return;
        }

        const url = `${baseUrl}/api/extension/profile-fields`;
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
          const safeError = categorizeError(res.status, data, false, domain);
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
        sendResponse({
          success: false,
          error: `Server unavailable. Please ensure EduAssist (${domain}) is reachable.`,
        });
      }
    })();
    return true;
  }

  // 6. Intelligent Semantic Field Mapping (Step 6D - AI Fallback)
  if (message.type === "SEMANTIC_MAP_FIELDS") {
    (async () => {
      const baseUrl = await getApiBaseUrl();
      const domain = getDisplayDomain(baseUrl);

      try {
        const { extension_session } = await chrome.storage.local.get("extension_session");
        if (!extension_session || !extension_session.connection_id) {
          sendResponse({ success: false, error: "Extension not connected. Please connect account first." });
          return;
        }

        const url = `${baseUrl}/api/extension/semantic-map`;
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
          const safeError = categorizeError(res.status, data, false, domain);
          sendResponse({ success: false, error: safeError });
          return;
        }

        sendResponse(data);
      } catch (err) {
        console.error("[SEA] Semantic Map API network error:", err);
        sendResponse({
          success: false,
          error: `Server unavailable. Please ensure EduAssist (${domain}) is reachable.`,
        });
      }
    })();
    return true;
  }

  return false;
});
