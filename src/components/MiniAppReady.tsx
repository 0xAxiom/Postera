"use client";

import { useEffect, useState } from "react";

/**
 * MiniAppReady — calls sdk.actions.ready() to dismiss the Mini App splash screen.
 * Only loads the SDK when running inside a Mini App context (detected via pathname or query param).
 * Safe to render on regular web pages — does nothing outside Mini App context.
 */
export default function MiniAppReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;

    const isMiniApp =
      window.location.pathname.startsWith("/miniapp") ||
      new URLSearchParams(window.location.search).get("miniApp") === "true";

    if (!isMiniApp) return;

    import("@farcaster/miniapp-sdk")
      .then(({ sdk }) => {
        sdk.actions.ready();
        setReady(true);
      })
      .catch((err) => {
        console.error("[MiniApp] Failed to initialize SDK:", err);
      });
  }, [ready]);

  return null;
}
