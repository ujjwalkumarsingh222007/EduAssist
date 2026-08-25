/**
 * Smart Education Assistant - Central Configuration
 * Centralizes the EduAssist website URL for production & local development.
 */

const CONFIG = {
  // Live Production URL
  PRODUCTION_URL: "https://edu-assist-two.vercel.app",

  // Local Development URL
  DEVELOPMENT_URL: "http://localhost:3000",

  // Default active environment
  DEFAULT_ENV: "production",
};

/**
 * Synchronously returns the default active API base URL.
 */
function getActiveServerUrl() {
  return CONFIG.PRODUCTION_URL;
}

/**
 * Returns the currently configured API base URL (Production by default, or Localhost if configured in storage).
 */
async function getApiBaseUrl() {
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      const data = await chrome.storage.local.get("sea_environment");
      if (data && data.sea_environment === "development") {
        return CONFIG.DEVELOPMENT_URL;
      }
      if (data && data.sea_environment === "production") {
        return CONFIG.PRODUCTION_URL;
      }
    }
  } catch (e) {
    // Fallback on error
  }
  return CONFIG.DEFAULT_ENV === "production"
    ? CONFIG.PRODUCTION_URL
    : CONFIG.DEVELOPMENT_URL;
}

/**
 * Returns the formatted display domain for UI hints.
 */
function getDisplayDomain(url) {
  try {
    const parsed = new URL(url || CONFIG.PRODUCTION_URL);
    return parsed.host;
  } catch {
    return "edu-assist-two.vercel.app";
  }
}

// Export for Node/CommonJS/ESM test scripts if needed
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CONFIG, getActiveServerUrl, getApiBaseUrl, getDisplayDomain };
}
