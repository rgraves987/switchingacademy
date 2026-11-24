// Checks a sign-in. Used by the site gate (on every page load) and by the page itself.
// 200 -> signed in and allowed. 401 -> not signed in / expired. 403 -> access paused or removed.
import { json, getUser, withNetlify, accessStatus } from "../lib/common.mjs";

const main = async (req, ctx) => {
  const user = await getUser(req, ctx);
  if (user instanceof Response) return user;
  const s = await accessStatus(user);
  if (!s.ok) return json({ error: "No access", reason: s.reason }, 403);
  return json({ ok: true, email: user.email, owner: s.owner });
};

export const handler = withNetlify(main);
