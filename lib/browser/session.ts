import { chromium, Browser, BrowserContext, Page } from "playwright";
import { BrowserSessionState, LiveFormFieldDescriptor, BrowserInteractionAction } from "./types";
import { validateTargetUrl, navigatePage, capturePageScreenshot } from "./navigation";
import { detectPageFormFields } from "./form-detector";

interface ActiveSessionInstance {
  sessionId: string;
  userId: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  url: string;
  pageTitle: string;
  detectedFields: LiveFormFieldDescriptor[];
  lastActive: number;
}

// In-memory store for active Playwright browser sessions
const sessionStore = new Map<string, ActiveSessionInstance>();

// Clean up sessions older than 15 minutes
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

function pruneStaleSessions() {
  const now = Date.now();
  for (const [id, session] of sessionStore.entries()) {
    if (now - session.lastActive > SESSION_TIMEOUT_MS) {
      console.log(`Pruning inactive browser session: ${id}`);
      closeBrowserSession(id).catch(() => {});
    }
  }
}

/**
 * Creates and initializes a controlled Playwright browser session
 */
export async function createBrowserSession(
  userId: string,
  targetUrl: string
): Promise<{ success: boolean; session?: BrowserSessionState; error?: string }> {
  pruneStaleSessions();

  const urlCheck = validateTargetUrl(targetUrl);
  if (!urlCheck.valid || !urlCheck.normalizedUrl) {
    return { success: false, error: urlCheck.error || "Invalid URL" };
  }

  const normalizedUrl = urlCheck.normalizedUrl;
  const sessionId = `bs_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  try {
    const browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1200, height: 750 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();

    // Navigate to requested URL
    const navResult = await navigatePage(page, normalizedUrl);
    if (!navResult.success) {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
      return { success: false, error: navResult.error };
    }

    // Detect form fields on initial load
    const detectedFields = await detectPageFormFields(page);
    const screenshot = await capturePageScreenshot(page);

    const instance: ActiveSessionInstance = {
      sessionId,
      userId,
      browser,
      context,
      page,
      url: navResult.url,
      pageTitle: navResult.title,
      detectedFields,
      lastActive: Date.now(),
    };

    sessionStore.set(sessionId, instance);

    const sessionState: BrowserSessionState = {
      sessionId,
      url: navResult.url,
      pageTitle: navResult.title,
      status: "ready",
      screenshotBase64: screenshot,
      detectedFieldsCount: detectedFields.length,
      matchedFieldsCount: 0,
      filledFieldsCount: 0,
      needsInputCount: detectedFields.length,
      securityChallengeDetected: detectedFields.some((f) => f.is_security_challenge),
      mappings: [],
      statusMessage: `Browser connected to official portal • ${detectedFields.length} interactive fields detected`,
      updatedAt: new Date().toISOString(),
    };

    return { success: true, session: sessionState };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to initialize browser session";
    console.error("Browser session start error:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Gets an active browser session instance
 */
export function getActiveSession(sessionId: string): ActiveSessionInstance | null {
  const session = sessionStore.get(sessionId);
  if (session) {
    session.lastActive = Date.now();
    return session;
  }
  return null;
}

/**
 * Executes a student interaction (click, type, key press, scroll) on the live Playwright session
 */
export async function interactWithSession(
  sessionId: string,
  action: BrowserInteractionAction
): Promise<{ success: boolean; screenshot?: string; url?: string; pageTitle?: string; error?: string }> {
  const instance = getActiveSession(sessionId);
  if (!instance) {
    return { success: false, error: "Session expired or not found. Please start a new session." };
  }

  const { page } = instance;

  try {
    switch (action.type) {
      case "click":
        if (typeof action.x === "number" && typeof action.y === "number") {
          await page.mouse.click(action.x, action.y);
        } else if (action.selector) {
          await page.click(action.selector);
        }
        break;

      case "type":
        if (action.text) {
          await page.keyboard.type(action.text);
        }
        break;

      case "press":
        if (action.key) {
          await page.keyboard.press(action.key);
        }
        break;

      case "scroll":
        if (typeof action.deltaY === "number") {
          await page.mouse.wheel(action.deltaX || 0, action.deltaY);
        }
        break;

      case "select":
        if (action.selector && action.value) {
          await page.selectOption(action.selector, action.value);
        }
        break;
    }

    // Give 300ms for animations/DOM updates to settle
    await page.waitForTimeout(300);

    const screenshot = await capturePageScreenshot(page);
    const currentUrl = page.url();
    const pageTitle = await page.title();

    instance.url = currentUrl;
    instance.pageTitle = pageTitle;

    return {
      success: true,
      screenshot,
      url: currentUrl,
      pageTitle,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Interaction error";
    return { success: false, error: errorMsg };
  }
}

/**
 * Closes an active Playwright browser session
 */
export async function closeBrowserSession(sessionId: string): Promise<boolean> {
  const instance = sessionStore.get(sessionId);
  if (instance) {
    try {
      await instance.context.close().catch(() => {});
      await instance.browser.close().catch(() => {});
    } catch (err) {
      console.warn("Session close error:", err);
    } finally {
      sessionStore.delete(sessionId);
    }
    return true;
  }
  return false;
}
