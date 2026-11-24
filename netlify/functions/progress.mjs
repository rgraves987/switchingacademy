// Saves and loads each signed-in learner's progress (topics, labs, field jobs, badges, settings).
// Every account gets its own record; nobody can read or change anyone else's.
//
// Saves are atomic: the page sends the version tag (etag) it last saw, and the save only happens if the
// stored record still has that tag. Otherwise the page gets the stored copy back (409) and merges it.
import { json, getUser, withNetlify, accessStatus, progressStore, progressKey } from "../lib/common.mjs";

const MAX_BYTES = 1024 * 1024;

const main = async (req, ctx) => {
  const user = await getUser(req, ctx);
  if (user instanceof Response) return user;
  const access = await accessStatus(user);
  if (!access.ok) return json({ error: "No access", reason: access.reason }, 403);

  const store = progressStore();
  const key = progressKey(user.id);

  if (req.method === "GET") {
    const cur = await store.getWithMetadata(key, { type: "json" });
    return json({ data: cur ? cur.data.data : null, saved: cur ? cur.data.saved : null, etag: cur ? cur.etag || "" : "" });
  }

  if (req.method === "PUT") {
    const text = await req.text();
    if (text.length > MAX_BYTES) return json({ error: "Too much data" }, 413);
    let body;
    try { body = JSON.parse(text); } catch { return json({ error: "Bad data" }, 400); }
    const data = body && body.data;
    if (!data || typeof data !== "object" || Array.isArray(data) || Object.values(data).some((v) => typeof v !== "string")) {
      return json({ error: "Bad data" }, 400);
    }
    const rec = { saved: new Date().toISOString(), email: user.email, data };
    const w = body.etag
      ? await store.setJSON(key, rec, { onlyIfMatch: body.etag })
      : await store.setJSON(key, rec, { onlyIfNew: true });
    if (w.modified) return json({ etag: w.etag || "", saved: rec.saved });

    // Another device saved first: send back what's stored so the page can merge.
    const cur = await store.getWithMetadata(key, { type: "json" });
    return json({ conflict: true, etag: cur ? cur.etag || "" : "", data: cur ? cur.data.data : null }, 409);
  }

  return json({ error: "Method not allowed" }, 405);
};

export const handler = withNetlify(main);
