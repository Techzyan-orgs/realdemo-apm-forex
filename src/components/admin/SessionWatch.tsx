"use client";
import { useEffect } from "react";

/**
 * When the session expires (12 h) while a dashboard is open, admin API calls start returning 401.
 * Send the owner to the login page (and back here afterwards) instead of failing silently.
 */
export function SessionWatch() {
  useEffect(() => {
    const original = window.fetch;
    let redirecting = false;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await original(...args);
      const url = String(args[0] instanceof Request ? args[0].url : args[0]);
      if (res.status === 401 && url.includes("/api/admin/") && !url.includes("/api/admin/auth/") && !redirecting) {
        redirecting = true;
        const next = window.location.pathname + window.location.search;
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the proxy sees the cookie change
        window.location.assign(`/admin/login?next=${encodeURIComponent(next)}`);
      }
      return res;
    };
    return () => {
      window.fetch = original;
    };
  }, []);
  return null;
}
