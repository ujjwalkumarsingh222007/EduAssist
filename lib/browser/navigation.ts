import { Page } from "playwright";

/**
 * Validates whether a target URL is permitted for controlled browser sessions
 */
export function validateTargetUrl(rawUrl: string): { valid: boolean; normalizedUrl?: string; error?: string } {
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    return { valid: false, error: "Please enter an official application URL." };
  }

  let urlStr = rawUrl.trim();
  if (urlStr.startsWith("/")) {
    urlStr = `http://localhost:3000${urlStr}`;
  } else if (!urlStr.startsWith("http://") && !urlStr.startsWith("https://")) {
    urlStr = `https://${urlStr}`;
  }

  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, error: "Only HTTP and HTTPS URLs are permitted." };
    }

    // Disallow loopback ports other than current dev server (3000)
    const hostname = parsed.hostname.toLowerCase();
    if ((hostname === "localhost" || hostname === "127.0.0.1") && parsed.port && parsed.port !== "3000") {
      return { valid: false, error: "Target local port is not allowed." };
    }

    return { valid: true, normalizedUrl: parsed.toString() };
  } catch (err) {
    return { valid: false, error: "Invalid URL format." };
  }
}

/**
 * Navigates a Playwright page safely with timeout handling
 */
export async function navigatePage(page: Page, targetUrl: string): Promise<{ success: boolean; url: string; title: string; error?: string }> {
  try {
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });

    const title = await page.title();
    const currentUrl = page.url();
    return { success: true, url: currentUrl, title };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Navigation failed";
    return {
      success: false,
      url: targetUrl,
      title: "Error",
      error: `Could not access target URL: ${errorMsg}`,
    };
  }
}

/**
 * Captures current page screenshot as base64 data URI
 */
export async function capturePageScreenshot(page: Page): Promise<string> {
  try {
    const buffer = await page.screenshot({
      type: "jpeg",
      quality: 85,
      fullPage: false,
    });
    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.error("Screenshot capture error:", err);
    return "";
  }
}
