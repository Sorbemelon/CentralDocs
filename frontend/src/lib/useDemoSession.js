import { useCallback, useEffect, useRef, useState } from "react";
import { BACKEND_STATUS } from "./constants";
import { clearDemoSessionId, getDemoSessionId } from "./apiClient";
import { warmBackend } from "@/services/healthApi";
import { bootstrapDemo, createOrResumeSession, getDemoSession } from "@/services/demoApi";
import { normalizeUsage } from "./workspaceData";

/**
 * Workspace bring-up: warm backend -> create/resume demo session -> bootstrap.
 * The session request is the online signal. Bootstrap is best-effort because a
 * seeded-data issue should not make a reachable backend look offline.
 */
export function useDemoSession({ requireExistingSession = false } = {}) {
  const [backendStatus, setBackendStatus] = useState(BACKEND_STATUS.idle);
  const [session, setSession] = useState(null);
  const [bootstrap, setBootstrap] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [needsLaunch, setNeedsLaunch] = useState(() => Boolean(requireExistingSession && !getDemoSessionId()));
  const mounted = useRef(true);
  const retryTimer = useRef(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  const run = useCallback(async () => {
    if (requireExistingSession && !getDemoSessionId()) {
      if (mounted.current) {
        setNeedsLaunch(true);
        setBackendStatus(BACKEND_STATUS.idle);
        setSession(null);
        setBootstrap(null);
        setLastError(null);
      }
      return false;
    }

    if (mounted.current) setBackendStatus(BACKEND_STATUS.starting);
    async function bringOnline({ resetStoredSession = false } = {}) {
      if (resetStoredSession) {
        clearDemoSessionId();
      }
      try {
        await warmBackend();
      } catch {
        /* warm is best-effort; the real signal is the session call below */
      }
      const sessionResult = requireExistingSession ? await getDemoSession() : await createOrResumeSession();
      let bootstrapResult = null;
      let bootstrapError = null;
      try {
        bootstrapResult = await bootstrapDemo();
      } catch (error) {
        bootstrapError = error;
      }
      if (mounted.current) {
        setNeedsLaunch(false);
        setSession(bootstrapResult?.session || sessionResult.session || null);
        setBootstrap(bootstrapResult);
        setBackendStatus(BACKEND_STATUS.ready);
        setLastError(bootstrapError);
      }
      return true;
    }

    try {
      return await bringOnline();
    } catch (error) {
      if (requireExistingSession) {
        if (mounted.current) {
          if (error?.offline) {
            setBackendStatus(BACKEND_STATUS.offline);
            setLastError(error);
          } else {
            clearDemoSessionId();
            setNeedsLaunch(true);
            setBackendStatus(BACKEND_STATUS.idle);
          }
          setSession(null);
          setBootstrap(null);
        }
        return false;
      }
      try {
        return await bringOnline({ resetStoredSession: true });
      } catch (error) {
        if (mounted.current) {
          setBackendStatus(BACKEND_STATUS.offline);
          setBootstrap(null);
          setLastError(error);
        }
        return false;
      }
    }
  }, [requireExistingSession]);

  useEffect(() => {
    run();
  }, [run]);

  useEffect(() => {
    if (backendStatus !== BACKEND_STATUS.offline) return undefined;
    retryTimer.current = setTimeout(() => {
      run();
    }, 5000);
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [backendStatus, run]);

  return {
    backendStatus,
    online: backendStatus === BACKEND_STATUS.ready,
    needsLaunch,
    session,
    bootstrap,
    lastError,
    usage: normalizeUsage(session),
    reload: run,
  };
}
