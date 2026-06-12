import { buildDemoQuotaIdentityFromRequest } from "../services/demo/demoQuotaIdentity.service.js";

export const DEMO_SESSION_COOKIE = "centraldocs_demo_session";
export const DEMO_SESSION_HEADER = "x-demo-session-id";

export function demoSessionMiddleware(req, res, next) {
  const headerSessionId = req.get(DEMO_SESSION_HEADER);
  const cookieSessionId = req.cookies?.[DEMO_SESSION_COOKIE] || null;
  const sessionId = headerSessionId || cookieSessionId || null;

  req.demoSessionId = sessionId;
  req.demoSessionContext = {
    sessionId,
    source: headerSessionId ? "header" : cookieSessionId ? "cookie" : "none",
  };
  req.demoQuotaIdentity = buildDemoQuotaIdentityFromRequest(req);
  next();
}
