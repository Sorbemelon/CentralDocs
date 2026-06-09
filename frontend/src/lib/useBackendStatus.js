import { useCallback, useEffect, useRef, useState } from "react";
import { BACKEND_STATUS } from "./constants";
import { getHealth, warmBackend } from "@/services/healthApi";

/**
 * Tracks backend reachability for the status chip.
 * States: idle -> starting -> ready | offline.
 *
 * Phase 7A: a lightweight probe. The workspace stays usable in offline mode.
 */
export function useBackendStatus({ auto = true } = {}) {
  const [status, setStatus] = useState(BACKEND_STATUS.idle);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const check = useCallback(async ({ warm = false } = {}) => {
    if (mounted.current) setStatus(BACKEND_STATUS.starting);
    try {
      await (warm ? warmBackend() : getHealth());
      if (mounted.current) {
        setStatus(BACKEND_STATUS.ready);
        setLastCheckedAt(Date.now());
      }
      return BACKEND_STATUS.ready;
    } catch {
      if (mounted.current) {
        setStatus(BACKEND_STATUS.offline);
        setLastCheckedAt(Date.now());
      }
      return BACKEND_STATUS.offline;
    }
  }, []);

  useEffect(() => {
    if (auto) check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  return { status, lastCheckedAt, check };
}
