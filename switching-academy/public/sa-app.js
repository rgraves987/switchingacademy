/* Switching Academy: side-panel layout, account, progress sync and the owner's Access tab.
   Runs after the page's own scripts, so it only moves existing parts around and adds new ones. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var DEV = location.protocol === "file:"; // opened straight from a file: show the layout, skip sign-in
  var SECS = ["learn", "practice", "builder", "fieldjobs", "parts", "courses", "teachers"];
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var toast = function (m) { var t = $("toast"); if (!t) return; t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 4200); };

  /* =====================================================================
     1. Layout: left navigation | content | right panel
     ===================================================================== */
  var main = document.querySelector("main");
  var header = main.querySelector("header");
  var tabs = header.querySelector(".tabs");
  var logoImg = header.querySelector(".logo");
  var logoSrc = logoImg ? logoImg.getAttribute("src") : "/logo.jpg";

  var shell = document.createElement("div");
  shell.className = "sa-shell";
  main.parentNode.insertBefore(shell, main);

  // Left navigation: brand, the section tabs, and the account box.
  var nav = document.createElement("aside");
  nav.className = "sa-nav"; nav.id = "saNav"; nav.setAttribute("aria-label", "Site navigation");
  nav.innerHTML = '<div class="sa-brand"><img alt="" src="' + esc(logoSrc) + '"><div><b>Switching Academy</b><span>Learn · Practice · Build</span></div>' +
    '<button type="button" class="sa-x" data-close aria-label="Close menu">✕</button></div><div class="sa-navlbl">Sections</div>';
  nav.appendChild(tabs);
  tabs.setAttribute("aria-orientation", "vertical");
  var ICONS = { tabL: "📘", tabP: "🧪", tabB: "🧩", tabF: "🧰", tabH: "🖥️", tabC: "🎓", tabT: "👪" };
  tabs.querySelectorAll("button[role=tab]").forEach(function (b) {
    b.dataset.label = b.textContent.trim();
    var s = document.createElement("span"); s.className = "sa-ic"; s.setAttribute("aria-hidden", "true"); s.textContent = ICONS[b.id] || "•";
    b.insertBefore(s, b.firstChild);
  });
  var tabA = document.createElement("button");
  tabA.type = "button"; tabA.id = "tabA"; tabA.hidden = true; tabA.tabIndex = -1;
  tabA.setAttribute("role", "tab"); tabA.setAttribute("aria-selected", "false"); tabA.setAttribute("aria-controls", "access");
  tabA.dataset.label = "Access";
  tabA.innerHTML = '<span class="sa-ic" aria-hidden="true">🔑</span>Access<span class="sa-badge" id="tabABadge" hidden></span>';
  tabs.appendChild(tabA);
  var acct = document.createElement("div");
  acct.className = "sa-acct";
  acct.innerHTML = '<div class="sa-av" id="saAv" aria-hidden="true">?</div><div class="sa-who"><b id="saEmail">' + (DEV ? "Preview (not signed in)" : "Signing in…") + '</b><span id="saRole"></span></div>' +
    '<div class="sa-sync" id="saSync" role="status"></div><button type="button" class="sa-out" id="saOut">Sign out</button>';
  nav.appendChild(acct);

  // Right panel: progress, quick jumps, saving, display settings, updates.
  var rail = document.createElement("aside");
  rail.className = "sa-rail"; rail.id = "saRail"; rail.setAttribute("aria-label", "Your progress and settings");
  rail.innerHTML = '<div class="sa-railhd"><b>Your progress &amp; settings</b><button type="button" class="sa-x" data-close aria-label="Close panel">✕</button></div>';
  var prog = $("cnt") && $("cnt").closest(".card");
  if (prog) { prog.classList.add("sa-prog"); prog.insertAdjacentHTML("afterbegin", "<h3>Your progress</h3>"); rail.appendChild(prog); }
  var quick = document.createElement("div");
  quick.className = "sa-card sa-quick";
  quick.innerHTML = '<h3>Jump to</h3><button type="button" data-jump="cont">▶️ Continue where you left off</button><button type="button" data-jump="rewards">🏅 Level, badges &amp; certificate</button><button type="button" data-jump="practice">🧪 Practice labs</button>';
  rail.appendChild(quick);
  if ($("svBox")) rail.appendChild($("svBox"));
  var tools = document.querySelector(".tools");
  if (tools) { var dc = document.createElement("div"); dc.className = "sa-card"; dc.innerHTML = "<h3>Display</h3>"; dc.appendChild(tools); rail.appendChild(dc); }
  var fbc = document.querySelector(".fbc");
  if (fbc) rail.appendChild(fbc);

  shell.appendChild(nav); shell.appendChild(main); shell.appendChild(rail);

  // Top bar (phones), floating button (tablets) and the dimmed background behind open panels.
  var top = document.createElement("div");
  top.className = "sa-top";
  top.innerHTML = '<button type="button" class="sa-tb" id="saMenu" aria-label="Open menu" aria-controls="saNav" aria-expanded="false">☰</button>' +
    '<img alt="" src="' + esc(logoSrc) + '"><div class="sa-tt"><b>Switching Academy</b><span id="saCur">Learn</span></div>' +
    '<button type="button" class="sa-tb" id="saRailBtn" aria-label="Your progress and settings" aria-controls="saRail" aria-expanded="false">📊</button>';
  document.body.insertBefore(top, shell);
  var fab = document.createElement("button");
  fab.type = "button"; fab.className = "sa-fab"; fab.id = "saFab"; fab.setAttribute("aria-controls", "saRail"); fab.setAttribute("aria-expanded", "false");
  fab.innerHTML = "📊 Progress";
  document.body.appendChild(fab);
  var scrim = document.createElement("div"); scrim.className = "sa-scrim"; document.body.appendChild(scrim);

  var lastFocus = null;
  function isDrawer(el) { return getComputedStyle(el).position === "fixed"; }
  function openPanel(which) {
    closePanels(true);
    var el = which === "nav" ? nav : rail;
    if (!isDrawer(el)) return;
    lastFocus = document.activeElement;
    document.body.classList.add("sa-open-" + which);
    [$("saMenu"), $("saRailBtn"), fab].forEach(function (b) { b.setAttribute("aria-expanded", String(b.getAttribute("aria-controls") === el.id)); });
    setTimeout(function () { var f = el.querySelector(".sa-x"); if (f) f.focus(); }, 60);
  }
  function closePanels(quiet) {
    var was = document.body.classList.contains("sa-open-nav") || document.body.classList.contains("sa-open-rail");
    document.body.classList.remove("sa-open-nav", "sa-open-rail");
    [$("saMenu"), $("saRailBtn"), fab].forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
    if (was && !quiet && lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $("saMenu").onclick = function () { openPanel("nav"); };
  $("saRailBtn").onclick = fab.onclick = function () { openPanel("rail"); };
  scrim.onclick = function () { closePanels(); };
  document.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closePanels(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanels(); });

  quick.addEventListener("click", function (e) {
    var b = e.target.closest("[data-jump]"); if (!b) return;
    var j = b.dataset.jump;
    closePanels(true);
    if (j === "practice") { window.showTab("practice"); return; }
    window.showTab("learn");
    var t = $(j); if (t) setTimeout(function () { t.scrollIntoView({ behavior: "smooth", block: "start" }); }, 50);
  });

  // Up/Down arrows move through the vertical list (Left/Right still work too).
  tabs.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    var bs = Array.prototype.filter.call(tabs.querySelectorAll("button[role=tab]"), function (b) { return !b.hidden; });
    var i = bs.indexOf(e.target); if (i < 0) return;
    e.preventDefault();
    var n = bs[(i + (e.key === "ArrowDown" ? 1 : bs.length - 1)) % bs.length];
    n.click(); n.focus();
  });

  // Sections: wrap showTab so it also handles the Access tab, the top-bar label and closing panels.
  var prevShow = window.showTab;
  var current = "learn";
  window.showTab = function (n) {
    var acc = $("access");
    if (n === "access" && acc && !tabA.hidden) {
      SECS.forEach(function (k) { $(k).hidden = true; });
      acc.hidden = false;
      tabs.querySelectorAll("button[role=tab]").forEach(function (b) { var on = b === tabA; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
      loadAccess(true);
    } else {
      if (n === "access") n = "learn";
      if (acc) acc.hidden = true;
      tabA.setAttribute("aria-selected", "false"); tabA.tabIndex = -1;
      prevShow(n);
    }
    var sel = tabs.querySelector('[aria-selected="true"]');
    $("saCur").textContent = sel ? sel.dataset.label : "";
    closePanels(true);
    if (n !== current) { current = n; window.scrollTo(0, 0); }
  };
  tabA.onclick = function () { window.showTab("access"); };
  var startSel = tabs.querySelector('[aria-selected="true"]');
  if (startSel) { $("saCur").textContent = startSel.dataset.label; current = (startSel.getAttribute("aria-controls") || "learn"); }

  document.documentElement.classList.remove("sa-pre");

  /* =====================================================================
     2. Access tab (owners only)
     ===================================================================== */
  var accSec = document.createElement("section");
  accSec.id = "access"; accSec.hidden = true;
  accSec.setAttribute("role", "tabpanel"); accSec.setAttribute("aria-labelledby", "tabA");
  accSec.innerHTML =
    '<h3 class="sec">🔑 Access</h3><p class="sub">Who can use Switching Academy. Only owners see this tab.</p>' +
    '<div id="acMsg" class="sa-msg" role="status" aria-live="polite"></div>' +
    '<div class="sa-stats" id="acStats"></div>' +
    '<div class="sa-card"><h2>Invite requests</h2><p class="sub">People who tapped <b>Request access</b> on the sign-in page. <b>Send invite</b> emails them a Netlify invitation to set a password.</p>' +
    '<div class="sa-filter" id="acReqF" role="group" aria-label="Show requests"><button type="button" data-f="new" aria-pressed="true">Waiting</button><button type="button" data-f="invited" aria-pressed="false">Invited</button><button type="button" data-f="all" aria-pressed="false">All</button></div>' +
    '<div class="sa-rows" id="acReq"></div></div>' +
    '<div class="sa-card"><h2>Invite someone directly</h2><p class="sub">No request needed. They get the same invitation email.</p>' +
    '<form id="acInv"><label class="vh" for="acInvEmail">Email to invite</label><input id="acInvEmail" type="email" placeholder="name@example.com" autocomplete="off"><button type="submit">Send invite</button></form></div>' +
    '<div class="sa-card"><h2>People</h2><p class="sub">Everyone with an account. <b>Lock</b> pauses someone right away and keeps their account; <b>Remove</b> deletes it.</p>' +
    '<label class="vh" for="acFind">Search people</label><input id="acFind" type="search" placeholder="Search by email">' +
    '<div class="sa-rows" id="acList"></div></div>' +
    '<details class="sa-card"><summary>How access works</summary><ul>' +
    '<li>Nobody can sign up on their own. The only way in is an invitation from you (registration is set to <b>Invite only</b> in Netlify Identity).</li>' +
    '<li>Each new request also arrives in your email through Netlify Forms, if you turned on form notifications.</li>' +
    '<li><b>Invited</b> means the invitation was sent but they haven\'t set a password yet. Press <b>Send invite</b> again to resend it.</li>' +
    '<li><b>Lock</b> takes effect on their next page load. Their progress stays saved, and <b>Unlock</b> lets them back in.</li>' +
    '<li><b>Remove</b> deletes their account and saved progress. To let them back in later, invite them again.</li>' +
    '<li>Owners are set with the <code>OWNER_EMAILS</code> setting in Netlify and can\'t be locked out here.</li></ul></details>';
  var foot = main.querySelector("footer.sf");
  if (foot) main.insertBefore(accSec, foot); else main.appendChild(accSec);

  var AC = null, reqFilter = "new", acBusy = false;
  function acMsg(t, cls) { var m = $("acMsg"); m.textContent = t || ""; m.className = "sa-msg" + (t ? " " + (cls || "ok") : ""); }
  function fmtDate(s) { if (!s) return "—"; var d = new Date(s); return isNaN(d) ? "—" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  function ago(s) {
    if (!s) return "never"; var m = (Date.now() - Date.parse(s)) / 60000;
    if (m < 60) return "within the hour"; if (m < 1440) return Math.round(m / 60) + " h ago";
    var d = Math.round(m / 1440); return d < 45 ? d + " day" + (d === 1 ? "" : "s") + " ago" : fmtDate(s);
  }
  function unread(d) { return (d.requests || []).filter(function (r) { return r.status !== "invited" && (!d.lastRead || r.at > d.lastRead); }).length; }
  function setBadge(n) { var b = $("tabABadge"); b.hidden = !n; b.textContent = n > 99 ? "99+" : String(n); tabA.setAttribute("aria-label", "Access" + (n ? ", " + n + " new request" + (n === 1 ? "" : "s") : "")); }

  function renderAccess() {
    var d = AC; if (!d) return;
    var reqs = d.requests || [], list = d.list || [];
    var waiting = reqs.filter(function (r) { return r.status !== "invited"; }).length;
    var cnt = function (st) { return list.filter(function (p) { return p.status === st; }).length; };
    $("acStats").innerHTML = [[waiting, "waiting for an invite"], [cnt("active") + cnt("owner"), "active accounts"], [cnt("invited"), "invited, not joined yet"], [cnt("locked"), "locked"]]
      .map(function (s) { return '<div class="sa-stat"><b>' + s[0] + "</b><span>" + s[1] + "</span></div>"; }).join("");

    var shown = reqs.filter(function (r) { return reqFilter === "all" || (reqFilter === "invited" ? r.status === "invited" : r.status !== "invited"); });
    $("acReq").innerHTML = shown.length ? shown.map(function (r) {
      var isNew = r.status !== "invited" && (!d.prevRead || r.at > d.prevRead);
      return '<div class="sa-row' + (isNew ? " new" : "") + '"><div class="who"><b>' + esc(r.name) + "</b>" + (isNew ? '<span class="sa-chip new">New</span>' : "") +
        (r.status === "invited" ? '<span class="sa-chip invited-ok">Invited ' + esc(fmtDate(r.invitedAt)) + "</span>" : "") +
        '<span class="meta">' + esc(r.email) + " · " + esc(r.role || "Other") + (r.school ? " · " + esc(r.school) : "") + " · asked " + esc(ago(r.at)) + (r.count > 1 ? " (" + r.count + " times)" : "") + "</span></div>" +
        '<div class="acts"><button type="button" class="go" data-act="invite" data-email="' + esc(r.email) + '">' + (r.status === "invited" ? "Resend invite" : "Send invite") + "</button>" +
        (r.status !== "invited" ? '<button type="button" data-act="markinvited" data-email="' + esc(r.email) + '">Mark invited</button>' : "") +
        '<button type="button" data-act="dismiss" data-email="' + esc(r.email) + '">Dismiss</button></div>' +
        (r.message ? '<div class="say">' + esc(r.message) + "</div>" : "") + "</div>";
    }).join("") : '<p class="sub" style="margin:8px 0 0">' + (reqFilter === "new" ? "No requests waiting. New ones show up here (and in your email, if form notifications are on)." : "Nothing here yet.") + "</p>";

    var q = ($("acFind").value || "").trim().toLowerCase();
    var people = list.filter(function (p) { return !q || p.email.indexOf(q) >= 0; });
    var LBL = { owner: "Owner", active: "Active", invited: "Invited", locked: "Locked" };
    $("acList").innerHTML = (d.userListOk ? "" : '<p class="sa-msg bad">Netlify\'s user list couldn\'t be loaded, so this shows only people who have used the site. Check that Identity is turned on.</p>') +
      (people.length ? people.map(function (p) {
        var acts = "";
        if (!p.owner) {
          acts += p.status === "locked" ? '<button type="button" class="go" data-act="unlock" data-email="' + esc(p.email) + '">Unlock</button>' : '<button type="button" data-act="lock" data-email="' + esc(p.email) + '">Lock</button>';
          if (p.status === "invited") acts += '<button type="button" data-act="invite" data-email="' + esc(p.email) + '">Resend invite</button>';
          acts += '<button type="button" class="warn" data-act="remove" data-email="' + esc(p.email) + '" data-id="' + esc(p.id || "") + '">Remove</button>';
        }
        return '<div class="sa-row"><div class="who"><b>' + esc(p.email) + '</b><span class="sa-chip ' + p.status + '">' + LBL[p.status] + "</span>" +
          '<span class="meta">' + (p.status === "invited" ? "Invited " + esc(fmtDate(p.invitedAt || p.created)) : "Joined " + esc(fmtDate(p.created))) + " · last used " + esc(ago(p.lastSeen)) +
          (p.status === "locked" && p.lockedAt ? " · locked " + esc(fmtDate(p.lockedAt)) : "") + "</span></div>" +
          '<div class="acts">' + acts + "</div></div>";
      }).join("") : '<p class="sub" style="margin:8px 0 0">' + (q ? "No one matches that search." : "No accounts yet.") + "</p>");
  }

  async function loadAccess(markSeen) {
    if (DEV || !ME || !ME.owner) return;
    try {
      var r = await api("GET", "/.netlify/functions/access");
      var d = await r.json();
      if (!r.ok) throw new Error(d.error || "Couldn't load the Access tab.");
      d.prevRead = AC && AC.prevRead !== undefined ? AC.prevRead : d.lastRead;
      AC = d; renderAccess();
      var n = unread(d); setBadge(n);
      if (markSeen && n && !$("access").hidden) {
        var r2 = await api("POST", "/.netlify/functions/access", { action: "seen" });
        if (r2.ok) { var d2 = await r2.json(); d2.prevRead = d.lastRead; AC = d2; setBadge(0); }
      }
    } catch (e) { acMsg(e.message || "Couldn't load the Access tab.", "bad"); }
  }
  async function acAction(body, btn) {
    if (acBusy) return; acBusy = true; acMsg("");
    if (btn) btn.disabled = true;
    try {
      var r = await api("POST", "/.netlify/functions/access", body);
      var d = await r.json();
      if (!r.ok) throw new Error(d.error || "That didn't work. Please try again.");
      d.prevRead = AC ? AC.prevRead : d.lastRead;
      AC = d; renderAccess(); setBadge(unread(d));
      var done = { lock: body.email + " is locked.", unlock: body.email + " can sign in again.", dismiss: "Request dismissed.", markinvited: "Marked as invited." };
      acMsg(d.notice || done[body.action] || "Done.", "ok");
      return true;
    } catch (e) { acMsg(e.message, "bad"); if (btn) btn.disabled = false; return false; }
    finally { acBusy = false; }
  }
  accSec.addEventListener("click", function (e) {
    var f = e.target.closest("#acReqF button");
    if (f) { reqFilter = f.dataset.f; $("acReqF").querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b === f)); }); renderAccess(); return; }
    var b = e.target.closest("button[data-act]"); if (!b) return;
    var act = b.dataset.act, email = b.dataset.email;
    if (act === "remove" && !confirm("Remove " + email + "?\n\nThis deletes their account and their saved progress. They can only come back with a new invitation.")) return;
    if (act === "lock" && !confirm("Lock " + email + "?\n\nThey'll be signed out on their next page load. Their progress stays saved, and you can unlock them any time.")) return;
    acAction({ action: act, email: email, id: b.dataset.id || "" }, b);
  });
  $("acInv").onsubmit = async function (e) {
    e.preventDefault();
    var em = $("acInvEmail").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { acMsg("Enter a valid email address.", "bad"); return; }
    if (await acAction({ action: "invite", email: em }, null)) $("acInvEmail").value = "";
  };
  $("acFind").addEventListener("input", renderAccess);

  /* =====================================================================
     3. Account: sign-in, sign-out
     ===================================================================== */
  var ME = null;
  function toLogin(why) {
    if (window.SAAuth) SAAuth.clear();
    var u = "/login?next=" + encodeURIComponent(location.pathname + location.search);
    if (why) u += "&why=" + encodeURIComponent(why);
    location.replace(u);
  }
  async function api(method, path, body) {
    var send = async function (tok) {
      var h = { Authorization: "Bearer " + tok };
      if (body !== undefined) h["Content-Type"] = "application/json";
      return fetch(path, { method: method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined, keepalive: !!api.keepalive });
    };
    var r;
    try { r = await send(await SAAuth.token()); }
    catch (e) { if (e && e.status === 401) { toLogin("expired"); throw e; } throw e; }
    if (r.status === 401) {
      try { r = await send((await SAAuth.refresh(true)).access_token); } catch (e) { toLogin("expired"); throw e; }
      if (r.status === 401) { toLogin("expired"); throw new Error("Signed out"); }
    }
    if (r.status === 403 && path.indexOf("/access") < 0) {
      var j = {}; try { j = await r.clone().json(); } catch (x) {}
      if (j.reason) { toLogin(j.reason); throw new Error("No access"); }
    }
    return r;
  }

  $("saOut").onclick = async function () {
    if (DEV) { toast("Sign out works on the live site."); return; }
    this.disabled = true;
    var ok = await SYNC.flush();
    if (!ok && !confirm("Your latest progress hasn't been saved to your account yet (you may be offline).\n\nSign out anyway? Anything not saved will be lost from this browser.")) { this.disabled = false; return; }
    SYNC.forgetDevice();
    await SAAuth.logout();
    location.replace("/login");
  };

  /* =====================================================================
     4. Progress sync: this browser's progress <-> the learner's account
     ===================================================================== */
  var MK = "saacct.sync";
  var skip = function (k) { return !k || k.indexOf("saacct.") === 0 || k === "sa_t"; };
  function snap() { var o = {}; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (!skip(k)) o[k] = localStorage.getItem(k); } } catch (e) {} return o; }
  var hash = function (o) { return JSON.stringify(Object.keys(o).sort().map(function (k) { return [k, o[k]]; })); };
  function meta() { try { return JSON.parse(localStorage.getItem(MK)) || null; } catch (e) { return null; } }
  function setMeta(m) { try { localStorage.setItem(MK, JSON.stringify(m)); } catch (e) {} }
  function apply(o) {
    var cur = snap();
    try {
      Object.keys(cur).forEach(function (k) { if (!(k in o)) localStorage.removeItem(k); });
      Object.keys(o).forEach(function (k) { if (cur[k] !== o[k]) localStorage.setItem(k, o[k]); });
    } catch (e) {}
  }
  // Merge two copies of progress. Same rule as loading a progress code: done stays done, the higher score wins.
  function deep(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
      var seen = {}, out = a.slice();
      a.forEach(function (x) { seen[JSON.stringify(x)] = 1; });
      b.forEach(function (x) { var s = JSON.stringify(x); if (!seen[s]) { seen[s] = 1; out.push(x); } });
      return out;
    }
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
      var o = Object.assign({}, a);
      Object.keys(b).forEach(function (k) { o[k] = k in a ? deep(a[k], b[k]) : b[k]; });
      return o;
    }
    if (typeof a === "number" && typeof b === "number") return Math.max(a, b);
    if (typeof a === "boolean" && typeof b === "boolean") return a || b;
    if (a === true || b === true) return true;
    if (a === null || a === undefined || a === "") return b;
    return a;
  }
  function merge(srv, loc) {
    var o = Object.assign({}, srv);
    Object.keys(loc).forEach(function (k) {
      if (!(k in srv)) { o[k] = loc[k]; return; }
      if (srv[k] === loc[k]) return;
      var A, B; try { A = JSON.parse(srv[k]); B = JSON.parse(loc[k]); } catch (e) { return; }
      if (A && B && typeof A === "object" && typeof B === "object") o[k] = JSON.stringify(deep(A, B));
      else if (typeof A === "number" && typeof B === "number") o[k] = String(Math.max(A, B));
    });
    return o;
  }
  // Is there real progress here (not just display settings)?
  var PROGRESS_KEYS = ["tt", "lab", "fj", "diy", "hn", "hw", "rq"];
  function hasProgress(o) { return PROGRESS_KEYS.some(function (k) { try { var v = JSON.parse(o[k] || "{}"); return v && typeof v === "object" && Object.keys(v).length > 0; } catch (e) { return false; } }); }

  function syncLine(t, bad) {
    var s = $("saSync"); if (s) { s.textContent = t; s.className = "sa-sync" + (bad ? " bad" : ""); }
    // Saved to the account: the page's old "save a code" reminder isn't needed.
    if (t.charAt(0) === "✓" && window.SA && SA.markSaved) { try { SA.markSaved(); } catch (e) {} }
  }
  function reloadOnce() {
    try { var t = +sessionStorage.getItem("saacct.reload") || 0; if (Date.now() - t < 15000) return false; sessionStorage.setItem("saacct.reload", String(Date.now())); } catch (e) {}
    location.reload(); return true;
  }

  var SYNC = (function () {
    var etag = "", pushing = false, lastErr = false, ready = false, timer = null;
    async function push() {
      if (!ready || pushing || !ME) return true;
      var s = snap(), h = hash(s), m = meta();
      if (m && m.id === ME.id && m.hash === h) { if (lastErr) { lastErr = false; syncLine("✓ Progress saved to your account"); } return true; }
      pushing = true; syncLine("Saving…");
      try {
        var r = await api("PUT", "/.netlify/functions/progress", { data: s, etag: etag });
        var j = await r.json();
        if (r.status === 409) {
          // Another device saved in between: combine both, keep it here, and save the combined copy.
          var combined = merge(j.data || {}, snap());
          apply(combined); etag = j.etag || "";
          setMeta({ id: ME.id, etag: etag, hash: "" });
          pushing = false;
          toast("Progress from your other device was added. Refresh the page to see all of it.");
          return await push();
        }
        if (!r.ok) throw new Error(j.error || "save failed");
        etag = j.etag || ""; setMeta({ id: ME.id, etag: etag, hash: h });
        lastErr = false; syncLine("✓ Progress saved to your account");
        return true;
      } catch (e) {
        lastErr = true; syncLine(navigator.onLine === false ? "Offline. Progress will save when you're back online." : "Couldn't save just now. Trying again…", true);
        return false;
      } finally { pushing = false; }
    }
    async function pull(onLoad) {
      var r = await api("GET", "/.netlify/functions/progress");
      if (!r.ok) throw new Error("load failed");
      var j = await r.json();
      var server = j.data || null, m = meta(), local = snap(), lh = hash(local);
      etag = j.etag || "";
      // A different learner used this browser last: start from this learner's own progress.
      if (m && m.id && m.id !== ME.id) {
        apply(server || {}); setMeta({ id: ME.id, etag: etag, hash: hash(snap()) });
        return onLoad && reloadOnce();
      }
      // First sign-in on this browser, and it already has progress from before accounts.
      if (!m && hasProgress(local)) {
        ready = false;
        askMigrate(server, local);
        return false;
      }
      if (!server) { ready = true; await push(); return false; }
      var sh = hash(server);
      if (m && m.etag === etag) { ready = true; if (lh !== m.hash) await push(); else syncLine("✓ Progress saved to your account"); return false; }
      // The account changed somewhere else.
      var unsaved = m && m.hash && lh !== m.hash;
      var next = unsaved ? merge(server, local) : server;
      var changed = hash(next) !== lh;
      apply(next); setMeta({ id: ME.id, etag: etag, hash: unsaved ? "" : sh });
      ready = true;
      if (unsaved) await push(); else syncLine("✓ Progress saved to your account");
      if (changed) {
        if (onLoad) return reloadOnce();
        toast("Progress from your other device was loaded. Refresh the page to see it.");
      }
      return false;
    }
    function askMigrate(server, local) {
      cover(false);
      var b = document.createElement("div");
      b.className = "sa-banner"; b.id = "saMig"; b.setAttribute("role", "region"); b.setAttribute("aria-label", "Progress on this browser");
      b.innerHTML = "<p><b>💾 This browser has progress saved from before accounts.</b> Add it to your account" + (ME.email ? " (" + esc(ME.email) + ")" : "") +
        "? Choose <b>Add it</b> if it's yours. On a shared computer, it may belong to someone else.</p>" +
        '<button type="button" id="saMigYes">Add it to my account</button><button type="button" class="ghost" id="saMigNo">No, start from my account</button>';
      main.insertBefore(b, header.nextElementSibling);
      syncLine("Waiting for your choice above…");
      $("saMigYes").onclick = async function () {
        apply(server ? merge(server, local) : local);
        setMeta({ id: ME.id, etag: etag, hash: "" }); ready = true; b.remove();
        await push(); if (server) reloadOnce();
      };
      $("saMigNo").onclick = async function () {
        apply(server || {}); setMeta({ id: ME.id, etag: etag, hash: server ? hash(server) : "" }); ready = true; b.remove();
        if (!server) await push();
        reloadOnce();
      };
    }
    return {
      async start() {
        try { if (await pull(true)) return; }
        catch (e) { syncLine("Couldn't load your saved progress. Using this browser's copy for now.", true); ready = !!meta(); }
        cover(false);
        timer = setInterval(push, 5000);
        document.addEventListener("visibilitychange", function () {
          if (document.visibilityState === "hidden") { api.keepalive = true; push().finally(function () { api.keepalive = false; }); }
          else if (ready) { SAAuth.refresh().catch(function () {}); pull(false).catch(function () {}); }
        });
        window.addEventListener("online", push);
      },
      flush: function () { return ready ? push() : Promise.resolve(true); },
      forgetDevice: function () {
        clearInterval(timer); ready = false;
        try { Object.keys(snap()).forEach(function (k) { localStorage.removeItem(k); }); localStorage.removeItem(MK); } catch (e) {}
      },
    };
  })();

  function cover(on) {
    var c = $("saCover");
    if (on && !c) { c = document.createElement("div"); c.id = "saCover"; c.className = "sa-cover"; c.innerHTML = "<div><i></i>Loading your progress…</div>"; document.body.appendChild(c); setTimeout(function () { cover(false); }, 6000); }
    if (!on && c) c.remove();
  }

  /* =====================================================================
     5. Start
     ===================================================================== */
  if (DEV) { $("saRole").textContent = "Layout preview"; syncLine("Sign-in and syncing run on the live site."); return; }
  if (!window.SAAuth || !SAAuth.get()) { toLogin(""); return; }
  cover(true);
  (async function () {
    var r;
    try { r = await api("GET", "/.netlify/functions/session"); }
    catch (e) { cover(false); syncLine("Couldn't reach Switching Academy. Check your connection.", true); return; }
    if (!r.ok) { cover(false); syncLine("Couldn't check your sign-in. Refresh to try again.", true); return; }
    var s = await r.json(), a = SAAuth.get() || {};
    ME = { email: s.email, owner: !!s.owner, id: a.id };
    if (!ME.id) { try { var u = await fetch("/.netlify/identity/user", { headers: { Authorization: "Bearer " + (await SAAuth.token()) } }); if (u.ok) ME.id = (await u.json()).id; } catch (e) {} }
    $("saEmail").textContent = s.email; $("saEmail").title = s.email;
    $("saAv").textContent = (s.email || "?").charAt(0).toUpperCase();
    $("saRole").textContent = ME.owner ? "Owner" : "Learner";
    if (ME.owner) {
      tabA.hidden = false;
      if (location.hash === "#access") window.showTab("access"); else loadAccess(false);
      setInterval(function () { if (document.visibilityState === "visible") loadAccess(!$("access").hidden); }, 120000);
    }
    setInterval(function () { SAAuth.refresh().catch(function (e) { if (e && e.status === 401) toLogin("expired"); }); }, 4 * 60e3);
    if (!ME.id) { cover(false); syncLine("Couldn't load your account details. Refresh to try again.", true); return; }
    SYNC.start();
  })();
})();
