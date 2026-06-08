export const DEMO_SESSION_COOKIE = "centraldocs_demo_session";
export const DEMO_SESSION_HEADER = "x-demo-session-id";

export function demoSessionMiddleware(req, res, next) {
  req.demoSessionId = req.get(DEMO_SESSION_HEADER) || req.cookies?.[DEMO_SESSION_COOKIE] || null;
  next();
}
