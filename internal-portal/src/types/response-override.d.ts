// Override Response.json() and Request.json() to return any instead of unknown
// This resolves widespread TS2339 errors across the codebase where
// fetch response.json() and request.json() are used without explicit type casting.
interface Response {
  json(): Promise<any>;
}
interface Request {
  json(): Promise<any>;
}
