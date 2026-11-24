# Switching Academy: putting it online with sign-in accounts

Everyone who uses Switching Academy now signs in with their own account (email + password). Nobody can sign up on their own. People tap **Request access** on the sign-in page, you get an email and see the request on your **Access** tab, and you send the invitation with one button. Each learner's progress is saved to their account, so it follows them to any computer, tablet or phone. The site is still free to use.

What's in this folder:

| File | What it does |
|---|---|
| `public/index.html` | Switching Academy, with the new side-panel layout |
| `public/login.html` | The sign-in page: the "now uses accounts" notice, sign in, forgot password, request access |
| `public/sa-layout.css` | The side-panel layout, account box and Access tab styles |
| `public/sa-app.js` | Builds the side panels, the account box, progress saving and your Access tab |
| `public/sa-auth.js` | Sign-in helper shared by both pages |
| `public/logo.jpg`, `hero.jpg`, `favicon.jpg` | Images for the sign-in page |
| `netlify/edge-functions/gate.js` | The gate: sends anyone who isn't signed in (or is locked) to the sign-in page |
| `netlify/functions/session.mjs` | Checks a sign-in and whether that person is allowed in |
| `netlify/functions/progress.mjs` | Saves and loads each learner's progress |
| `netlify/functions/access.mjs` | Your Access tab: requests, invites, lock, unlock, remove (only you can use it) |
| `netlify/functions/request-invite.mjs` | Receives "Request access" forms from the sign-in page |
| `netlify/lib/common.mjs` | Shared sign-in and access rules |
| `package.json`, `netlify.toml` | Settings that tell Netlify how to run it |

Everything used here (Identity, Functions, Edge Functions, Blobs and Forms) is part of Netlify's free plan.

---

## Part 1. Put it on Netlify (once)

Netlify's drag-and-drop upload only handles plain web pages. This version also has a small server part, so deploy it with GitHub (easiest) or the Netlify command-line tool. You can deploy it to your existing **switchingacademy** project so the address stays the same.

**Option A: GitHub (no coding tools needed)**
1. Make a free GitHub account if you don't have one, and create a new **private** repository (for example `switching-academy`).
2. On the repository page, choose **Add file → Upload files** and drag in everything from this folder (`public`, `netlify`, `package.json`, `netlify.toml`, `README.md`). Keep the folder structure. Click **Commit changes**.
3. In Netlify, open your **switchingacademy** project → **Project configuration → Build & deploy → Link repository**, and pick the repository. (Or **Add new project → Import an existing project** for a new address.)
4. Leave the build settings as they are (they come from `netlify.toml`) and deploy.

**Option B: Netlify CLI** (if you have Node.js installed): in this folder run `npx netlify-cli deploy --prod` and pick your switchingacademy project.

Netlify Blobs, where progress and requests are saved, turns on by itself.

## Part 2. Turn on accounts (once)

1. In your Netlify project, open **Identity** and click **Enable Identity**.
2. In the Identity settings, set **Registration** to **Invite only**. *This is the step that stops strangers from signing up.*
3. Leave **External providers** (Google, GitHub and so on) off.
4. Open **Project configuration → Environment variables** and add `OWNER_EMAILS` = your own email. For more than one owner, separate the emails with commas. Owners can't be locked out and are the only people who see the **Access** tab.
5. Redeploy so the setting takes effect (**Deploys → Trigger deploy → Deploy project**).
6. Invite yourself: **Identity → Invite users**, enter the same email. Open the email, choose a password, and you're in. You'll see **🔑 Access** in the left menu.
7. Optional: under Identity **Emails**, edit the **Invitation** template so it says it's from Switching Academy.

## Part 3. Get an email for every access request (once)

Requests always show up on your Access tab. To also get an email:

1. In your Netlify project, open **Forms** and click **Enable form detection**, then redeploy (**Deploys → Trigger deploy**).
2. After the deploy, a form called **access-request** appears under **Forms**.
3. Open **Project configuration → Notifications → Emails and webhooks → Form submission notifications → Add notification → Email notification**.
4. Choose the event **New form submission**, the form **access-request**, and type your email. Save.
5. If that email isn't the one you log in to Netlify with, Netlify first sends it a confirmation email. Click **Confirm** in it, or no notifications arrive.

Each email shows the person's name, email, whether they're a student, parent or teacher, their school or class, and their message. Netlify filters spam on these forms, and the sign-in page has its own spam trap too.

## Part 4. Give someone access

**When a request comes in:** open **Access** (the red number shows new requests). Under **Invite requests**, press **Send invite**. Netlify emails them an invitation link, they choose a password, and they're in. If sending ever fails, invite them in Netlify (**Identity → Invite users**) and press **Mark invited**. **Dismiss** clears a request you don't want.

**To invite someone without a request:** type their email under **Invite someone directly** on the Access tab.

**Resend an invitation:** people who haven't set a password yet show as **Invited**. Press **Resend invite**.

## Pause or remove someone

- **Lock** stops them at their next page load. Their account and progress stay saved. **Unlock** lets them back in.
- **Remove** deletes their account and saved progress straight away. To let them back in later, invite them again; they'll start fresh.

## If someone forgets their password

They click **Forgot your password?** on the sign-in page and follow the email. You don't need to do anything.

## How progress saving works

- While someone is signed in, their progress saves to their account a few seconds after each change. The account box in the left menu says **✓ Progress saved to your account**.
- **First sign-in on a browser that already has progress** (from before accounts): the page asks whether to add it to their account. On a shared school computer, the learner can choose **No, start from my account** so they don't pick up someone else's progress.
- **Two devices at once:** if a learner works on two devices, their progress is combined. Anything done on either device stays done, and the higher score wins.
- **Signing out** saves first, then clears the progress from that browser, so the next person on a shared computer starts clean.
- **Progress codes and backup files** still work, under **Progress codes and backup files** in the right panel.

## The new layout

- **Desktop:** sections and your account are in the left panel. Progress, quick jumps, progress codes, text size and theme are in the right panel.
- **Tablet:** the left panel stays; the **📊 Progress** button opens the right panel.
- **Phone:** a top bar with **☰** (sections and account) and **📊** (progress and settings).

## Good to know

- **The whole site is behind the sign-in.** The gate runs before any page is sent, so the lessons can't be read without signing in. Only the sign-in page and its images are public.
- **Sign-ins last.** People stay signed in on their device until they sign out. Behind the scenes the sign-in renews itself every hour.
- **Young learners:** the request form asks anyone under 13 to have a parent, guardian or teacher help send the request. Because you collect names and emails, it's worth adding a short privacy note to the sign-in page (what you collect and why) if you don't have one.
- **Free plan use:** each page load runs one quick sign-in check, and each save is one small function call. A site used by a few classes is light use, but check your plan's limits on Netlify's pricing page now and then.
