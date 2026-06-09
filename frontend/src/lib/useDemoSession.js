import { useCallback, useEffect, useRef, useState } from "react";
import { BACKEND_STATUS } from "./constants";
import { warmBackend } from "@/services/healthApi";
import { bootstrapDemo, createOrResumeSession } from "@/services/demoApi";
import { normalizeUsage } from "./workspaceData";

/**
 * Workspace bring-up: warm backend -> create/resume demo session -> bootstrap.
 * Any failure in the chain marks the workspace offline; callers then use the
 * offline fallback data and keep local-only attach/remove behavior.
 */
export function useDemoSession() {
  const [backendStatus, setBackendStatus] = useState(BACKEND_STATUS.idle);
  const [session, setSession] = useState(null);
  const [bootstrap, setBootstrap] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    if (mounted.current) setBackendStatus(BACKEND_STATUS.starting);
    try {
      try {
        await warmBackend();
      } catch {
        /* warm is best-effort; the real signal is the session call below */
      }
      const sessionResult = await createOrResumeSession();
      const bootstrapResult = await bootstrapDemo();
      if (mounted.current) {
        setSession(bootstrapResult.session || sessionResult.session || null);
        setBootstrap(bootstrapResult);
        setBackendStatus(BACKEND_STATUS.ready);
      }
      return true;
    } catch {
      if (mounted.current) {
        setBackendStatus(BACKEND_STATUS.offline);
        setBootstrap(null);
      }
      return false;
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  return {
    backendStatus,
    online: backendStatus === BACKEND_STATUS.ready,
    session,
    bootstrap,
    usage: normalizeUsage(session),
    reload: run,
  };
}
