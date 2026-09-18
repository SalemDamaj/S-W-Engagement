# Salem ♥ Wafaa — Digital Engagement Invitation

A cinematic, mobile-first digital wedding invitation with an intro animation, couple photo, countdown, RSVP and a small admin panel.

- **Frontend:** plain HTML/CSS/JS + GSAP (no build step, no install)
- **Backend:** Supabase (Postgres + Auth + Storage) for settings, RSVP replies and media uploads
- **Sharing:** works with any URL; no app needed (perfect for WhatsApp)

```
index.html                 Guest-facing invitation
admin.html                 Admin panel (edit details, upload media, view RSVP list)
assets/                    CSS, JS (invite + admin + vendored GSAP)
supabase/config.js         Supabase project keys (fill these in)
supabase/schema.sql        Database tables, security policies and storage bucket
```

---

## 1. See it locally (2 minutes)

No Supabase is required to preview — it runs in "defaults mode" and works offline.

```powershell
# from this folder
python -m http.server 8080
```

Then open `http://localhost:8080` (the invitation) and `http://localhost:8080/admin.html` (admin panel).

> Tip: use your phone *DevTools → device toolbar* to preview the 9:16 mobile experience.
> To open it on a real phone on the same Wi-Fi, run the server with `python -m http.server 8080 --bind 0.0.0.0` and visit `http://<your-computer-ip>:8080`.

---

## 2. Connect Supabase (needed for admin + RSVP)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it.
   This creates the `settings` table, the `rsvps` table, Row-Level-Security policies,
   and the public `invite-media` storage bucket.
3. In **Authentication → Users**, click **Add user** and create the admin account
   (email + password) you'll use to sign in to `admin.html`.
4. In **Project Settings → API**, copy the **Project URL** and the **anon public key**.
5. Open `supabase/config.js` and paste them in:

```js
window.SUPABASE_CONFIG = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "YOUR-ANON-PUBLIC-KEY"
};
```

That's it. Reload `admin.html` and sign in.

**Security note:** the anon key is public by design. Guests can only *read settings* and
*submit RSVPs*; all editing and media uploads require your admin login (see policies in `schema.sql`).

---

## 3. Publish it (pick one)

### Netlify (easiest)
- Go to [app.netlify.com/drop](https://app.netlify.com/drop), drag this folder in.
- You get `https://random-name.netlify.app`. Rename it under **Site settings → Site details**.

### Vercel
- Install the [Vercel CLI](https://vercel.com/docs/cli), then in this folder run:
  ```powershell
  npx vercel --prod
  ```

### GitHub Pages
- Push to a GitHub repo → **Settings → Pages → Deploy from branch (main, /root)**.
  Published at `https://<user>.github.io/<repo>/`.

### Custom domain (optional)
- Point your domain at Netlify/Vercel/GitHub Pages and it works with any HTTPS URL.
- Example shareable link: `https://salem-wafaa.example.com`

---

## 4. Share on WhatsApp

After publishing, send guests the link, e.g.:

```
https://salem-wafaa.example.com
```

Guest flow: tap link → invitation loads → "Open Invitation" → intro → music starts.
No install, no account. The final screen has a **Share** button for guests who want
to pass it on.

---

## 5. Admin panel

Open `https://your-link/admin.html`, sign in with the admin account.

| Tab | What you can change |
|---|---|
| **Invitation** | Couple names, opening phrase & message, event title, date, time, venue, location, map link, countdown target, RSVP on/off, max guests, music/countdown toggles, share texts |
| **Photos & Music** | Upload the couple photo, an optional highlight video (MP4/WebM), background music, or paste hosted URLs |
| **Guest list** | Live RSVP replies with summary stats, delete entries, **Export CSV** |

Changes save instantly — guests see updated details as soon as they reload the link.

---

## 6. The experience (what's built)

1. **Preloader** — monogram + elegant progress shimmer
2. **Gate** — "Open Invitation" screen (also unlocks audio, required by mobile browsers)
3. **Intro** — *"Two hearts, one beautiful story…"* fades in
4. **Names** — "Salem ♥ Wafaa" writes in letter-by-letter, heart glows, flourish underline draws, then **OUR ENGAGEMENT**
5. **Photo / video** — cinematic zoom-in + light-leak on scroll; video loops if provided
6. **Message** — the invitation story, line by line
7. **Event details** — date, time, venue, location cards + **View Location** (opens Google/Apple Maps)
8. **Countdown** — DAYS : HOURS : MINUTES : SECONDS → *"Today is the day! ❤️"* when it hits zero
9. **RSVP** — name, guests, Yes/No, optional message
10. **Finale** — thank-you, names, share button

Background: floating golden particles, soft light rays, ambient sound (a built-in dreamy
pad, or your own music file). All motion respects `prefers-reduced-motion`, pauses when the
tab is hidden, and is tuned for smooth performance on normal phones.

---

## 7. Media & content notes

- **Photo** — portrait (3:4) looks best.
- **Video** — keep it short and optimized (5–15 s, ~720p MP4). If set, it replaces the photo and plays muted.
- **Music** — MP3 from your own file or any hosted audio URL. If empty, a subtle ambient sound is generated on the device (no file needed). Tip: a royalty-free track works best for public sharing.
- **Map link** — paste any location URL, e.g.
  `https://www.google.com/maps/search/?api=1&query=Rosewood+Hotel+Riyadh`
  The button opens Google Maps on Android/desktop and Apple Maps when the phone prefers it.
- **Date labels** — edit them in the admin panel, or just pick the date and the "Day" and "Full date" labels auto-generate.

---

## 8. Without Supabase (offline/defaults mode)

If the keys in `supabase/config.js` are empty, the invitation still works:

- It uses the values in `assets/js/config.defaults.js`.
- RSVP replies are kept in your browser's local storage (not shared).
- The admin panel shows a warning until keys are added.

This is handy for quick previews; for the real thing just complete step 2.

---

## 9. Troubleshooting

- **Music doesn't start automatically** — that's browsers blocking autoplay by design.
  It starts right after the guest taps **Open Invitation** (an intentional tap = permission).
- **Countdown shows nothing / section hidden** — the countdown target is empty or invalid,
  or "Countdown" is toggled off in admin.
- **Photo/video doesn't show** — confirm the URL is public (files uploaded with the admin
  panel always are).
- **RSVP "Could not save"** — the row-level security policies aren't applied yet; re-run `supabase/schema.sql`.
- **Changed settings aren't visible to guests** — guests refresh the page to pull the latest settings.

---

## 10. Project structure

```
assets/
  css/
    invitation.css        Guest invitation styling + tokens
    admin.css             Admin panel styling
  js/
    config.defaults.js    Default content (offline fallback + admin base)
    vendor/
      gsap.min.js         GSAP animation library (bundled)
      ScrollTrigger.min.js
      supabase.min.js     Supabase JS client (bundled — no CDN needed at runtime)
    invite/
      settings.js         Loads settings from Supabase → merges with defaults
      audio.js            Music: your file OR a built-in Web Audio ambient pad
      particles.js        Golden dust canvas FX
      countdown.js        Countdown engine
      rsvp.js             RSVP form + Supabase insert
      animations.js       Intro timeline + scroll animations (GSAP)
      main.js             Boot / orchestration
    admin/
      supabase.js         Supabase client loader (shared)
      admin.js            Auth, settings editor, media uploads, guest list
supabase/
  config.js               → YOUR PUBLIC SUPABASE KEYS
  schema.sql              → run once in the SQL editor
```