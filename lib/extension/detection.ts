"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export interface ExtensionDetectionResult {
  installed: boolean;
  version?: string;
}

export type ExtensionLifecycleState =
  | "checking"
  | "not_detected"
  | "detected"
  | "connected";

/**
 * Pings the extension content script via pure window.postMessage with timed retries.
 * NEVER modifies the webpage DOM or attributes.
 */
export async function checkExtensionInstallation(timeoutMs = 3200): Promise<ExtensionDetectionResult> {
  if (typeof window === "undefined") {
    return { installed: false };
  }

  return new Promise((resolve) => {
    let resolved = false;
    const timers: NodeJS.Timeout[] = [];

    const cleanup = () => {
      window.removeEventListener("message", handleMessage);
      timers.forEach((t) => clearTimeout(t));
    };

    const handleSuccess = (version = "1.0.0") => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({ installed: true, version });
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (window.location.origin !== "null" && event.origin !== window.location.origin) return;
      if (
        event.data &&
        (event.data.type === "SEA_EXTENSION_PONG" || event.data.type === "SMART_ASSISTANT_PONG")
      ) {
        handleSuccess(event.data.extensionVersion || "1.0.0");
      }
    };

    // 1. Attach listener FIRST
    window.addEventListener("message", handleMessage);

    // 2. Helper to send ping
    const sendPing = () => {
      if (resolved) return;
      try {
        window.postMessage({ type: "SEA_EXTENSION_PING" }, window.location.origin);
      } catch {
        // Ignore
      }
    };

    // Send immediate ping
    sendPing();

    // 3. Retry pings (at 500ms, 1500ms, and 3000ms)
    timers.push(setTimeout(sendPing, 500));
    timers.push(setTimeout(sendPing, 1500));
    timers.push(setTimeout(sendPing, 3000));

    // 4. Final timeout
    timers.push(
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({ installed: false });
        }
      }, timeoutMs)
    );
  });
}

/**
 * React hook for managing extension installation & connection states with hydration safety.
 */
export function useExtensionDetector(userId?: string) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [state, setState] = useState<ExtensionLifecycleState>("checking");
  const [version, setVersion] = useState<string>("");
  const [checking, setChecking] = useState<boolean>(true);

  const activeTimersRef = useRef<NodeJS.Timeout[]>([]);
  const isInstalledRef = useRef<boolean>(false);

  const checkStatus = useCallback(async () => {
    if (typeof window === "undefined") return;

    setChecking(true);
    setState("checking");
    isInstalledRef.current = false;

    // Clear any previous active timers
    activeTimersRef.current.forEach((t) => clearTimeout(t));
    activeTimersRef.current = [];

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (window.location.origin !== "null" && event.origin !== window.location.origin) return;

      if (
        event.data &&
        (event.data.type === "SEA_EXTENSION_PONG" || event.data.type === "SMART_ASSISTANT_PONG")
      ) {
        isInstalledRef.current = true;
        setVersion(event.data.extensionVersion || "1.0.0");

        // Clear remaining retry timers
        activeTimersRef.current.forEach((t) => clearTimeout(t));
        activeTimersRef.current = [];

        // Check if user has active extension connection on server
        (async () => {
          let isConnected = false;
          try {
            const res = await fetch("/api/extension/profile", {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            });
            if (res.ok) {
              const data = await res.json().catch(() => ({}));
              isConnected = Boolean(data.connected);
            }
          } catch {
            isConnected = false;
          }

          setState(isConnected ? "connected" : "detected");
          setChecking(false);
        })();
      }
    };

    // 1. Add listener FIRST
    window.addEventListener("message", handleMessage);

    const sendPing = () => {
      if (isInstalledRef.current) return;
      try {
        window.postMessage({ type: "SEA_EXTENSION_PING" }, window.location.origin);
      } catch {
        // Ignore
      }
    };

    // Immediate ping
    sendPing();

    // Retries at 500ms, 1500ms, 3000ms
    activeTimersRef.current.push(setTimeout(sendPing, 500));
    activeTimersRef.current.push(setTimeout(sendPing, 1500));
    activeTimersRef.current.push(setTimeout(sendPing, 3000));

    // Final fallback timeout
    activeTimersRef.current.push(
      setTimeout(() => {
        window.removeEventListener("message", handleMessage);
        if (!isInstalledRef.current) {
          setState("not_detected");
          setChecking(false);
        }
      }, 3400)
    );
  }, []);

  useEffect(() => {
    setMounted(true);
    checkStatus();

    return () => {
      activeTimersRef.current.forEach((t) => clearTimeout(t));
    };
  }, [checkStatus, userId]);

  return {
    mounted,
    state: mounted ? state : "checking",
    version,
    checking: mounted ? checking : true,
    checkStatus,
    isInstalled: mounted && (state === "detected" || state === "connected"),
    isConnected: mounted && state === "connected",
  };
}
