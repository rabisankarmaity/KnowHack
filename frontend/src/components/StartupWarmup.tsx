import { useEffect } from "react";
import { warmUpServers } from "@/lib/startup-warmup";

/**
 * Renders nothing. Fires the background backend + AI warm-up once per page load
 * (client only — SSR/hydration never issues these requests, and effects only
 * run in the browser).
 */
export function StartupWarmup() {
  useEffect(() => {
    warmUpServers();
  }, []);
  return null;
}
