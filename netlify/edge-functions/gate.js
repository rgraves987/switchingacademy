// The site gate. Every page of Switching Academy goes through here first.
// Signed in and allowed -> the page. Otherwise -> the sign-in page (/login).
// The sign-in check itself is done by the "session" function, which Netlify verifies.
export default async (request, context) => {
  const url = new URL(request.url);
  const toLogin = (why) => {
    const l = new URL("/login", url);
    const next = url.pathname + url.search;
    if (next !== "/" && next.startsWith("/")) l.searchParams.set("next", next);
    if (why) l.searchParams.set("why", why);
    return new Response(null, { status: 302, headers: { location: l.pathname + l.search, "cache-control": "no-store" } });
  };

  const token = context.cookies.get("sa_jwt");
  if (!token) return toLogin("");

  let r;
  try {
    r = await fetch(new URL("/.netlify/functions/session", url), { headers: { authorization: "Bearer " + token } });
  } catch {
    r = null;
  }
  if (r && r.status === 401) return toLogin("expired");
  if (r && r.status === 403) {
    let reason = "locked";
    try { reason = (await r.json()).reason || reason; } catch {}
    return toLogin(reason);
  }
  if (!r || !r.ok) {
    return new Response(
      "<!doctype html><meta name=viewport content='width=device-width'><title>Switching Academy</title>" +
      "<p style='font:1.1rem system-ui;padding:24px'>We couldn't check your sign-in just now. Please refresh the page in a moment.</p>",
      { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  }

  const res = await context.next();
  const headers = new Headers(res.headers);
  headers.set("cache-control", "private, no-store");
  return new Response(res.body, { status: res.status, headers });
};

export const config = {
  path: "/*",
  excludedPath: ["/login", "/login.html", "/sa-auth.js", "/logo.jpg", "/hero.jpg", "/favicon.jpg", "/robots.txt", "/.netlify/*"],
};
