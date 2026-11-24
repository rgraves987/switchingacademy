// Shared helpers: sign-in check, owner check, access (lock) rules and storage.
import { getStore, connectLambda } from "@netlify/blobs";

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

// Returns the signed-in Netlify Identity user, or a Response to send back.
// 1) Netlify checks the login token itself and passes the verified user in (clientContext.user).
// 2) If that's missing, ask the site's Identity service directly.
export async function getUser(req, ctx = {}) {
  const authz = req.headers.get("authorization") || "";
  if (!authz.startsWith("Bearer ")) return json({ error: "Sign in required" }, 401);
  const cc = (ctx.lambda && ctx.lambda.clientContext) || {};
  if (cc.user && cc.user.sub && cc.user.email) {
    return { id: cc.user.sub, email: String(cc.user.email).toLowerCase() };
  }
  const bases = [];
  if (cc.identity && cc.identity.url) bases.push(cc.identity.url.replace(/\/$/, ""));
  bases.push(`${new URL(req.url).origin}/.netlify/identity`);
  for (const base of bases) {
    try {
      const r = await fetch(`${base}/user`, { headers: { authorization: authz } });
      if (r.ok) {
        const u = await r.json();
        if (u && u.id && u.email) return { id: u.id, email: String(u.email).toLowerCase() };
      }
    } catch {}
  }
  return json({ error: "Sign in required" }, 401);
}

// Runs a function in Netlify's classic mode, which is where Netlify verifies Identity logins
// and hands functions the Identity admin pass (used to send invites and manage users).
export function withNetlify(fn) {
  return async (event, context) => {
    connectLambda(event);
    const h = event.headers || {};
    const url = event.rawUrl || `https://${h.host || "localhost"}${event.path || "/"}`;
    const method = event.httpMethod || "GET";
    const body = method === "GET" || method === "HEAD" ? undefined
      : event.isBase64Encoded ? Buffer.from(event.body || "", "base64") : event.body || "";
    let res;
    try {
      res = await fn(new Request(url, { method, headers: h, body }), { lambda: context });
    } catch (e) {
      console.error(e);
      const busy = String((e && e.message) || "").startsWith("Busy");
      res = json({ error: busy ? e.message : "Server error" }, busy ? 409 : 500);
    }
    return { statusCode: res.status, headers: Object.fromEntries(res.headers), body: await res.text() };
  };
}

// OWNER_EMAILS (Netlify environment variable): your email(s), comma-separated.
// Owners can never be locked out and are the only people who see the Access tab.
export const owners = () =>
  (process.env.OWNER_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
export const isOwner = (email) => owners().includes(String(email || "").toLowerCase());

// Identity admin pass that Netlify gives classic functions.
export const identityAdmin = (ctx) => {
  const id = ctx && ctx.lambda && ctx.lambda.clientContext && ctx.lambda.clientContext.identity;
  return id && id.url && id.token ? { url: id.url.replace(/\/$/, ""), token: id.token } : null;
};

export const accessStore = (strong = false) =>
  getStore(strong ? { name: "sa-access", consistency: "strong" } : { name: "sa-access" });
export const progressStore = () => getStore({ name: "sa-progress" });
export const progressKey = (id) => "user-" + id;
export const userKey = (email) => "user:" + String(email).toLowerCase();
export const seenKey = (email) => "seen:" + String(email).toLowerCase();
export const reqKey = (email) => "req:" + String(email).toLowerCase();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Read a JSON record, change it with fn, and save it only if nobody changed it in between.
// fn returns the new value, or undefined to leave it as is.
export async function update(st, key, fn, tries = 8) {
  for (let i = 0; i < tries; i++) {
    const cur = await st.getWithMetadata(key, { type: "json" });
    const next = await fn(cur ? structuredClone(cur.data) : null);
    if (next === undefined) return cur ? cur.data : null;
    const r = cur && cur.etag
      ? await st.setJSON(key, next, { onlyIfMatch: cur.etag })
      : await st.setJSON(key, next, { onlyIfNew: true });
    if (r.modified) return next;
    await sleep(200 * (i + 1));
  }
  throw new Error("Busy: someone else was saving at the same moment. Please try again.");
}

// Is this person allowed in right now? Also remembers when they last used the site.
export async function accessStatus(user) {
  const owner = isOwner(user.email);
  const st = accessStore();
  const [rec, seen] = await Promise.all([
    st.get(userKey(user.email), { type: "json" }),
    st.get(seenKey(user.email), { type: "json" }),
  ]);
  if (!seen || Date.now() - Date.parse(seen.at || 0) > 36e5) {
    await st.setJSON(seenKey(user.email), { at: new Date().toISOString(), id: user.id });
  }
  if (owner) return { ok: true, owner: true };
  if (rec && rec.removed) return { ok: false, reason: "removed" };
  if (rec && rec.locked) return { ok: false, reason: "locked" };
  return { ok: true, owner: false };
}
