// Owner-only Access tab: invite requests and the list of people who can sign in.
// GET  -> everything for the Access tab.
// POST -> invite, markinvited, dismiss, lock, unlock, remove, seen.
import { json, getUser, withNetlify, isOwner, owners, identityAdmin, accessStore, update,
         userKey, seenKey, reqKey, progressStore, progressKey } from "../lib/common.mjs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Everyone with a Netlify Identity account (invited or signed up), using the admin pass.
async function identityUsers(admin) {
  if (!admin) return null;
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const r = await fetch(`${admin.url}/admin/users?page=${page}&per_page=100`,
      { headers: { Authorization: `Bearer ${admin.token}` } });
    if (!r.ok) return all.length ? all : null;
    const j = await r.json();
    const users = (j && j.users) || [];
    all.push(...users);
    if (users.length < 100) break;
  }
  return all;
}

async function listAll(ctx) {
  const st = accessStore();
  const { blobs } = await st.list();
  const recs = {}, seen = {}, requests = [];
  await Promise.all(blobs.map(async ({ key }) => {
    const v = await st.get(key, { type: "json" });
    if (!v) return;
    if (key.startsWith("user:")) recs[key.slice(5)] = v;
    else if (key.startsWith("seen:")) seen[key.slice(5)] = v;
    else if (key.startsWith("req:")) requests.push(v);
  }));
  const idUsers = await identityUsers(identityAdmin(ctx));
  const people = {};
  for (const u of idUsers || []) {
    const email = String(u.email || "").toLowerCase();
    if (!email) continue;
    people[email] = {
      email, id: u.id, created: u.created_at || null,
      invitedAt: u.invited_at || null, confirmed: !!u.confirmed_at,
    };
  }
  // People we only know from this site's own records (for example if the user list couldn't load).
  for (const email of new Set([...Object.keys(recs), ...Object.keys(seen)])) {
    if (!people[email] && !(recs[email] && recs[email].removed)) people[email] = { email, id: (seen[email] || {}).id || null };
  }
  const list = Object.values(people).map((p) => {
    const r = recs[p.email] || {};
    const owner = isOwner(p.email);
    let status = "active";
    if (owner) status = "owner";
    else if (r.locked) status = "locked";
    else if (p.confirmed === false) status = "invited";
    return { ...p, owner, status, lastSeen: (seen[p.email] || {}).at || null, lockedAt: r.lockedAt || null };
  }).sort((a, b) => a.email.localeCompare(b.email));
  const cfg = (await st.get("config", { type: "json" })) || {};
  return {
    owner: true, owners: owners(), list, userListOk: !!idUsers,
    requests: requests.sort((a, b) => (a.at < b.at ? 1 : -1)),
    lastRead: cfg.lastRead || "",
  };
}

const main = async (req, ctx) => {
  const user = await getUser(req, ctx);
  if (user instanceof Response) return user;
  if (!isOwner(user.email)) return json({ error: "Only the owner can use the Access tab" }, 403);
  const st = accessStore();

  if (req.method === "GET") return json(await listAll(ctx));
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let b;
  try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const now = new Date().toISOString();

  if (b.action === "seen") {
    await update(st, "config", (c) => ({ ...(c || {}), lastRead: now }));
    return json(await listAll(ctx));
  }

  const email = String(b.email || "").trim().toLowerCase();
  if (!EMAIL.test(email)) return json({ error: "Enter a valid email address." }, 400);

  if (b.action === "dismiss") {
    await st.delete(reqKey(email));
    return json(await listAll(ctx));
  }
  if (b.action === "markinvited") {
    await update(st, reqKey(email), (c) => c ? { ...c, status: "invited", invitedAt: now } : undefined);
    return json(await listAll(ctx));
  }
  if (b.action === "invite") {
    const admin = identityAdmin(ctx);
    if (!admin) return json({ error: "Couldn't send the invitation from here. Invite them in Netlify (Identity → Invite users), then press Mark invited." }, 502);
    let r, detail = "";
    try {
      r = await fetch(`${admin.url}/invite`, {
        method: "POST", headers: { Authorization: `Bearer ${admin.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!r.ok) { try { const j = await r.json(); detail = j.msg || j.error_description || j.error || ""; } catch {} }
    } catch { detail = "Netlify Identity didn't respond"; }
    const already = r && (r.status === 422 || r.status === 409) && /already|registered|exists/i.test(detail);
    if (r && (r.ok || already)) {
      // A fresh invitation also clears an earlier lock or removal.
      await update(st, userKey(email), (c) => c ? { ...c, locked: false, removed: false, log: [...(c.log || []), { at: now, action: "invited" }].slice(-50) } : undefined);
      await update(st, reqKey(email), (c) => c ? { ...c, status: "invited", invitedAt: now } : undefined);
      const res = await listAll(ctx);
      return json({ ...res, notice: already ? `${email} already has an account. They can sign in, or use "Forgot your password?".` : `Invitation sent to ${email}.` });
    }
    return json({ error: `Netlify didn't send the invitation${detail ? " (" + detail + ")" : ""}. You can invite them in Netlify (Identity → Invite users), then press Mark invited.` }, 502);
  }

  if (isOwner(email) && (b.action === "lock" || b.action === "remove")) {
    return json({ error: "Owners can't be locked out or removed here. Take them out of OWNER_EMAILS first." }, 400);
  }
  if (b.action === "lock" || b.action === "unlock") {
    const locked = b.action === "lock";
    await update(st, userKey(email), (c) => {
      const rec = c || { email, log: [] };
      rec.locked = locked; rec.removed = false; rec.lockedAt = locked ? now : null;
      rec.log = [...(rec.log || []), { at: now, action: b.action }].slice(-50);
      return rec;
    });
    return json(await listAll(ctx));
  }
  if (b.action === "remove") {
    // Block right away (a sign-in can stay valid for up to an hour), then delete the Netlify account.
    await update(st, userKey(email), (c) => ({ ...(c || { email }), locked: true, removed: true, lockedAt: now,
      log: [...((c && c.log) || []), { at: now, action: "removed" }].slice(-50) }));
    await st.delete(seenKey(email));
    if (b.id) await progressStore().delete(progressKey(b.id));
    const admin = identityAdmin(ctx);
    let deleted = false;
    if (admin && b.id) {
      try {
        const r = await fetch(`${admin.url}/admin/users/${encodeURIComponent(b.id)}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${admin.token}` } });
        deleted = r.ok || r.status === 404;
      } catch {}
    }
    const res = await listAll(ctx);
    return json({ ...res, notice: deleted ? `${email} was removed.`
      : `${email} can no longer get in. To delete their account completely, open Netlify Identity, click their email and choose Delete user.` });
  }
  return json({ error: "Unknown action" }, 400);
};

export const handler = withNetlify(main);
