"use client";

import { useEffect } from "react";

/** Clears the new-in-The-Sirath badge for this session. Stores only the session id. */
export function SirathSeen({ sessionId }: { sessionId: string | null }) {
  useEffect(() => {
    if (!sessionId) return;
    document.cookie = `sirath_seen=${encodeURIComponent(sessionId)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [sessionId]);
  return null;
}
