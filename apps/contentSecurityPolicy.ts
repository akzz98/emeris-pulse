// The dev server injects the React refresh script inline, and component CSS as style tags.
// Scripts and images from this app stay on the same origin. The QR code is a data URL.
// The API is a different origin, and the websocket is only the local reload channel.
export function contentSecurityPolicy(devPort: number): string {
  const apiOrigin = process.env.VITE_API_URL ? new URL(process.env.VITE_API_URL).origin : "http://localhost:4000";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    `connect-src 'self' ${apiOrigin} ws://localhost:${devPort}`,
  ].join("; ");
}
