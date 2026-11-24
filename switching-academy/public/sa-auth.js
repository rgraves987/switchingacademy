/* Switching Academy sign-in (Netlify Identity). Shared by the sign-in page and the site.
   Keeps the sign-in in this browser and in a short-lived "sa_jwt" cookie that the site gate checks. */
(function () {
  var ID = "/.netlify/identity", K = "saacct.auth";

  function load() { try { return JSON.parse(localStorage.getItem(K)); } catch (e) { return null; } }
  function setCookie(a) {
    var sec = location.protocol === "https:" ? "; Secure" : "";
    if (a && a.access_token) {
      var age = Math.max(0, Math.floor((a.expires_at - Date.now()) / 1000));
      document.cookie = "sa_jwt=" + a.access_token + "; Path=/; Max-Age=" + age + "; SameSite=Lax" + sec;
    } else {
      document.cookie = "sa_jwt=; Path=/; Max-Age=0; SameSite=Lax" + sec;
    }
  }
  function save(a) {
    try { if (a) localStorage.setItem(K, JSON.stringify(a)); else localStorage.removeItem(K); } catch (e) {}
    setCookie(a);
  }
  function fromToken(j) {
    return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000 };
  }
  async function readError(r) {
    var j = {};
    try { j = await r.json(); } catch (e) {}
    var err = new Error(j.error_description || j.msg || j.error || ("Error " + r.status));
    err.status = r.status;
    return err;
  }
  async function tokenCall(body) {
    var r = await fetch(ID + "/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body),
    });
    if (!r.ok) throw await readError(r);
    return r.json();
  }
  async function withUser(a) {
    var r = await fetch(ID + "/user", { headers: { Authorization: "Bearer " + a.access_token } });
    if (r.ok) { var u = await r.json(); a.email = String(u.email || "").toLowerCase(); a.id = u.id; }
    return a;
  }

  var refreshing = null;
  var SAAuth = {
    get: load,
    async login(email, password) {
      var a = fromToken(await tokenCall({ grant_type: "password", username: email, password: password }));
      await withUser(a); save(a); return a;
    },
    // Returns a sign-in with at least 5 minutes left, renewing it if needed.
    async refresh(force) {
      var a = load();
      if (!a || !a.refresh_token) { var e = new Error("Not signed in"); e.status = 401; throw e; }
      if (!force && Date.now() < a.expires_at - 5 * 60e3) { setCookie(a); return a; }
      if (refreshing) return refreshing;
      var used = a.refresh_token;
      refreshing = (async function () {
        try {
          var j = await tokenCall({ grant_type: "refresh_token", refresh_token: used });
          var n = Object.assign({}, load() || a, fromToken(j));
          save(n); return n;
        } catch (err) {
          // Another tab may have renewed it a moment ago with the same token.
          var now = load();
          if (now && now.refresh_token !== used && Date.now() < now.expires_at - 60e3) { setCookie(now); return now; }
          throw err;
        } finally { refreshing = null; }
      })();
      return refreshing;
    },
    async token() { return (await SAAuth.refresh()).access_token; },
    // type "signup" accepts an invitation (with a new password); "recovery" resets a forgotten password.
    async verify(type, token, password) {
      var body = { token: token, type: type };
      if (type === "signup" && password) body.password = password;
      var r = await fetch(ID + "/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw await readError(r);
      var a = fromToken(await r.json());
      if (type === "recovery" && password) {
        var r2 = await fetch(ID + "/user", {
          method: "PUT", headers: { Authorization: "Bearer " + a.access_token, "Content-Type": "application/json" },
          body: JSON.stringify({ password: password }),
        });
        if (!r2.ok) throw await readError(r2);
      }
      await withUser(a); save(a); return a;
    },
    async recover(email) {
      var r = await fetch(ID + "/recover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email }) });
      if (!r.ok && r.status !== 404) throw await readError(r);
    },
    async logout() {
      var a = load();
      try { if (a) await fetch(ID + "/logout", { method: "POST", headers: { Authorization: "Bearer " + a.access_token } }); } catch (e) {}
      save(null);
    },
    clear: function () { save(null); },
  };
  window.SAAuth = SAAuth;
})();
