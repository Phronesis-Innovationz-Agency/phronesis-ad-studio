# Phronesis Ad Studio (MVP)

AI-assisted advertisement video generator for Phronesis Innovationz Agency.

**How it works:** you describe your product/ad in plain language -> Claude turns that
into a structured "ad script" (scenes, headlines, colors, a per-scene voiceover line)
-> ElevenLabs synthesizes the voiceover audio (and scene timing stretches to fit the
narration) -> a Remotion template renders it into an actual MP4 with the audio baked
in. No raw AI video generation — the animation comes from a coded template, so output
is fast, cheap, and consistently polished.

MVP niche: fast-paced **product/e-commerce ads** (hook -> showcase -> benefits ->
offer -> CTA), 9:16 vertical, ready for TikTok/Instagram/Facebook.

The web UI (`npm run server`) shows a permanent showcase video beside the form (two
columns on desktop, stacked on mobile) - `public/demo/phronesis-ad-studio-demo.mp4`,
served at `/demo/...` - a real ~50s ad about Phronesis Ad Studio itself, made entirely
with its own pipeline (including the animated spokesperson). It's a static asset, not
regenerated per visitor, so it costs nothing to show and nobody's free-tier quota. To
make a new one after a rebrand or feature change: write/edit a script (`npm run
generate` or by hand), `npm run render`, then copy `out/ad.mp4` over that file.

### Brand assets

`public/brand/` (served at `/brand/...`) holds original, hand-designed SVG artwork —
no photos, no stock imagery, no AI image generation involved:

- `logo-mark.svg` — the app's logo (a gradient badge with a play icon + sparkle),
  shown in the web UI header
- `illustration-hero.svg` — a flat-illustration scene of a person holding up a phone
  showing the logo, used as the demo ad's hook-scene background via the same
  full-bleed `imageFile` mechanism a real uploaded product photo uses

When composing a background illustration like this, keep the frame's horizontal
center clear (that's where centered headline/subtext render) — put the illustrated
subject to one side, same principle as the spokesperson mascot's placement.

## Setup

```bash
npm install
cp .env.example .env
# put your Anthropic API key and ElevenLabs API key in .env
```

## Preview templates live (Remotion Studio)

```bash
npm run studio
```

Opens an editor where you can see the `ProductAd` template with the sample script
and scrub through it frame by frame.

## Generate an ad from a description

```bash
npm run generate -- "A vertical ad for a citrus-scented natural soap brand called Solstice. Playful, warm, summery vibe. 20% off this weekend only."
```

Writes the AI-generated script (including a per-scene `voiceover` line) to
`out/script.json` so you can review/edit it before rendering.

## Render a script to video

```bash
npm run render
```

If any scene has a `voiceover` line but no `audioFile` yet, this synthesizes the
narration with ElevenLabs first (saving MP3s under `public/audio/`, and stretching
scene durations to fit the narration), writes the updated script back to
`out/script.json`, then renders `out/script.json` to `out/ad.mp4`. Re-running it
reuses already-synthesized audio instead of regenerating it.

## One-shot: description straight to video

```bash
npm run make-ad -- "A vertical ad for a citrus-scented natural soap brand called Solstice..."
```

## Web UI + free/paid tier limits

```bash
npm run server
```

Opens a browser-based UI at `http://localhost:3000` in front of the same pipeline.
Visitors get an anonymous session cookie (no signup) and a **free tier of 3 ad
renders per calendar month** — free-tier renders get a small watermark baked into
the video by the template.

You can also optionally attach a product photo (JPEG/PNG/WebP, up to 8MB) in the UI —
it gets uploaded, saved under `public/uploads/`, and the pipeline attaches it to the
script's "showcase" scene. It renders full-bleed as that scene's background (covering
the entire frame, `object-fit: cover`) with a dark overlay so the headline/subtext
stay readable on top of it, rather than as a small inset thumbnail.

### Media library (stock backgrounds for visitors who skip the upload)

Drop your own images/videos in `public/library/images/` and `public/library/videos/`
(see `public/library/README.md`) - when someone generates an ad **without** uploading
their own photo, the pipeline randomly picks one of these as that same full-bleed
background instead of leaving it flat-colored (`src/ai/mediaLibrary.ts`). Images take
priority over videos when both exist. Background videos play muted (the ad's own
narration plays over them) and aren't looped - Remotion's frame-accurate looping needs
knowing a clip's exact duration ahead of time, so for now just use clips at least as
long as your longest scene; a short clip will simply hold its last frame if it runs out
early. There's also a `public/library/audio/` folder reserved for a future "pick a
pre-recorded narration track" feature - not wired up yet, since a stored voiceover's
words would need to actually match whatever the visitor describes, unlike a background
image or video which can be swapped in blind.

**Background music** works differently: drop a track in `public/library/music/` and
every ad plays it under the *entire* video (not per-scene) at a low, fixed volume with
a short fade in/out, so the narration always stays clearly audible. Unlike the
image/video fallback, music **is** looped seamlessly - the pipeline measures the
track's real duration with `music-metadata` before rendering and hands that to
Remotion's `<Loop>`, so a short track correctly repeats for the full ad length. Make
sure whatever you add is cleared for commercial use, since it goes out in every ad this
app generates.

### Aspect ratio (phone vs. desktop)

Pick **Vertical** (9:16, 1080x1920 — phone/TikTok/Reels), **Horizontal** (16:9,
1920x1080 — YouTube/desktop/standard ad placements), or **Square** (1:1, 1080x1080)
before generating. Left to itself the AI defaults to vertical almost every time, so
this is a hard override (`src/pipeline.ts`) rather than left as a creative choice —
same pattern as the watermark/spokesperson toggles. The template's layout (text,
bullets, the spokesperson mascot) uses percentage-based sizing rather than fixed
pixel values, so it holds up across all three formats without separate per-format
templates.

### Animated AI spokesperson

Checking "Add an animated AI spokesperson to narrate" adds a full-body fox-like
mascot that stands beside the centered text (alternating sides scene to scene, so it
reads as moving around rather than glued in one spot), walks in from off-screen at
the start of each scene with a little stepping animation, points its inner arm toward
the text, and glances between the text and the viewer on a timer. Its mouth opens and
closes in time with the narration, and its outer arm sways gently so it never looks
frozen. Sized off the frame's *width* (not height) so it fits beside the text on
every aspect ratio, including the narrow 9:16 vertical format, without ever growing
wide enough to cover the words.

**Important, by design:** this is a fully fictional mascot, not a photorealistic
human and not based on any real person's photo or likeness. It
does not do real phoneme-accurate lip-sync either — there's no ML model involved.
`src/ai/mouthEnvelope.ts` decodes the actual generated narration audio and computes
how loud it is at every video frame; `src/templates/ProductAd.tsx`'s `Spokesperson`
component maps that loudness to how open the mouth is. It's a believable "talking"
effect, entirely free (no GPU, no external API), because it's just audio amplitude
analysis, not a real avatar-generation model.

This was a deliberate scope decision: a feature that mimics a specific real, identifiable
person's appearance to make them "say" things in an ad — even with photos the user
uploads — is a non-consensual deepfake with real legal exposure (right-of-publicity
law, FTC fake-endorsement rules) and platform-ban risk, on top of the harm to whoever
is depicted. That was explicitly ruled out rather than built. If a photorealistic
presenter is wanted later, the safe paths are (a) fully synthetic AI people that don't
resemble anyone real, or (b) a verified self-avatar where a user can only generate
videos of themselves after proving consent — both need a paid talking-head/lip-sync
service (open-source options like SadTalker need a GPU to be practical; D-ID/HeyGen
have free trials, then paid), not something to build for free at MVP stage. If/when
that's worth budgeting for: Replicate's pay-per-use SadTalker is ~$0.09/video (cheapest
way to test), D-ID Lite is ~$4.70–5.90/mo, HeyGen Creator is $29/mo.

### Voice selection

Claude picks a narrator voice to match the brand's vibe from a curated list of 8
ElevenLabs voices (`src/ai/voices.ts`) — e.g. "George" (warm storyteller) for a cozy
candle brand, "Charlie" (deep, energetic) for a bold tech product, "Jessica" (playful,
bright) for a summery lifestyle brand. The picked voice name shows under the video
("Narrated by: ..."). All 8 are account-default ElevenLabs voices, so this works on
the free tier (see the note in `src/ai/textToSpeech.ts` about why that distinction
matters).

### Real billing (Stripe)

Upgrading to Phronesis Pro (unlimited, watermark-free renders) goes through actual
Stripe Checkout. To turn it on:

1. In the [Stripe Dashboard](https://dashboard.stripe.com) (stay in **test mode** —
   toggle top-right — while developing), create a recurring **Price** for your Pro
   plan (Product catalog -> Add product -> set a recurring price). Copy its Price ID
   (`price_...`).
2. Copy your test-mode **Secret key** (Developers -> API keys).
3. Forward webhooks to your machine with the [Stripe CLI](https://stripe.com/docs/stripe-cli):
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   This prints a webhook signing secret (`whsec_...`) — copy that too.
4. Put all three in `.env`: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`.
5. Restart `npm run server`, click "Upgrade to Phronesis Pro" in the UI, and pay with
   a [Stripe test card](https://stripe.com/docs/testing) (e.g. `4242 4242 4242 4242`,
   any future expiry/CVC) — no real money moves in test mode.

How it works: clicking upgrade calls `/api/checkout`, which creates a Stripe Checkout
Session (`src/billing/stripe.ts`) and redirects the browser to Stripe's hosted payment
page. On success, Stripe calls our `/api/stripe/webhook` with a signed
`checkout.session.completed` event, which is how the session actually gets marked
`pro` (`src/tiers.ts`) — not the redirect back, which could be spoofed. Canceling a
subscription later (`customer.subscription.deleted`) reverts it automatically.

Since there's still no real login system, "pro" is linked to the browser's session
cookie plus the email Stripe collected at checkout. A visitor who clears cookies or
switches browsers can get back in via "Already subscribed? Restore access" by typing
that email — **this has no password/verification**, so anyone who knows/guesses a
paying customer's email could claim their Pro status. Fine for an early MVP with a
handful of real customers you can watch by hand; replace with verified login before
this scales.

## Deploying to Render

A `render.yaml` blueprint is checked in. To deploy:

1. Push this repo to GitHub (Render deploys from a git repo, not a local folder).
2. In the Render dashboard: **New → Blueprint**, connect the repo, and it will pick up
   `render.yaml` automatically.
3. Fill in the secret env vars Render will prompt for (`ANTHROPIC_API_KEY`,
   `ELEVENLABS_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`,
   `STRIPE_WEBHOOK_SECRET`) — these are marked `sync: false` in the blueprint so Render
   asks for them instead of expecting them in git.
4. After the first deploy, copy the assigned `https://<name>.onrender.com` URL and:
   - update `APP_URL` in the Render dashboard's env vars to match it exactly (Stripe
     checkout redirects and the webhook depend on it)
   - update the Stripe webhook endpoint (in the Stripe dashboard) to point at
     `<that URL>/api/stripe/webhook`
   - update `server.url` in `capacitor.config.ts` to that URL and re-run
     `npx cap sync android` before building the APK (see below)

**Free plan limitations, worth knowing before relying on this:**

- **No persistent disk.** `out/renders/`, `public/uploads/`, and `public/audio/` are
  written to local disk at runtime and are wiped on every deploy and every restart
  (including the free plan's automatic idle spin-down). A rendered ad's link can go
  dead later even though the person who made it never deleted anything. `public/library/`
  is unaffected since it ships from git. Fixing this for real means either a paid plan
  with a disk attached, or moving renders/uploads to external storage (e.g. S3).
- **Cold starts.** Free services spin down after 15 minutes idle; the next visitor's
  first request can take 30-60s to wake it back up.
- **Rendering is heavy.** Each ad render launches headless Chromium (via Remotion) and
  ffmpeg, and bundles the composition fresh each time. Render's free tier gives very
  little RAM/CPU for this — renders may be slow, or fail outright on larger/longer ads.
  If that happens in practice, the next step up is a paid Render plan with more memory,
  not a code fix.

## Android app (APK)

This isn't a native rewrite — it's a thin [Capacitor](https://capacitorjs.com/) WebView
shell that loads the hosted site full-screen (`capacitor.config.ts`'s `server.url`).
Nothing runs on-device; the phone just needs network access to the Render deployment.
That also means the APK is only as alive as that deployment - if it's asleep (see cold
starts above) or down, the app shows a load failure until it's reachable again.

To build it yourself once Render is live:

```bash
# after updating capacitor.config.ts's server.url to the real Render URL
npx cap sync android
cd android
./gradlew assembleDebug
# output: android/app/build/outputs/apk/debug/app-debug.apk
```

That produces a debug-signed APK — installable directly on a device (`adb install
app-debug.apk`, or just copy it over and tap it, allowing "install from unknown
sources"), but not suitable for the Play Store. A Play Store release build needs its
own signing keystore (`./gradlew assembleRelease` plus a `key.properties` pointing at
a keystore you generate with `keytool` — Capacitor's
[Android deployment docs](https://capacitorjs.com/docs/android/deploying-to-google-play)
cover this) — not set up here since it's a one-way decision (losing that keystore later
means losing the ability to update the Play Store listing at all).

**Serving it for download from the site itself:** the web UI has a "Download the
Android app" button (`web-ui/index.html`) linking to `/app/phronesis-ad-studio.apk`,
served via `public/app/` (see `src/server.ts`). This is a plain static file, not wired
into the build — after producing a new APK, copy it over manually:

```bash
cp android/app/build/outputs/apk/debug/app-debug.apk public/app/phronesis-ad-studio.apk
```

Otherwise the button keeps serving whatever APK was last copied there, even after
`capacitor.config.ts`'s `server.url` or other app config changes.

App icon/splash source images live in `resources/` (generated from
`public/brand/logo-mark.svg`); `@capacitor/assets` reads them and writes every
density-specific Android resource under `android/app/src/main/res/`.

## Project layout

- `src/schema/adScript.ts` — the contract between AI output and the renderer (zod schema)
- `src/ai/generateScript.ts` — calls Claude, forces structured tool-call output, validates it
- `src/ai/textToSpeech.ts` — synthesizes per-scene narration with ElevenLabs, measures each
  clip's real duration, and stretches scene timing to fit it
- `src/templates/ProductAd.tsx` — the Remotion composition/template that renders a script
  (including the `<Audio>` track per scene, looped `<Loop>`-wrapped background music,
  the animated `Spokesperson` mascot, and a gradient + soft-glow background built from
  the brand's own two colors)
- `src/templates/color.ts` — lightens/darkens a hex color, used to build that gradient
- `src/ai/mouthEnvelope.ts` — decodes narration audio into a per-frame loudness curve
  that drives the spokesperson's mouth
- `src/ai/voices.ts` — curated ElevenLabs voice catalog Claude picks from
- `src/ai/mediaLibrary.ts` — picks a random stock image/video/music track from
  `public/library/` when a visitor didn't supply their own
- `src/render.ts` — headless render pipeline (bundle + renderMedia)
- `src/pipeline.ts` — shared generate -> voiceover -> render flow, used by both the CLI and the server
- `src/tiers.ts` — free/paid tier usage tracking and limits (in-memory, per session cookie + email)
- `src/billing/stripe.ts` — Stripe Checkout session creation
- `src/server.ts` + `web-ui/` — the web UI and its API, including the Stripe webhook endpoint
- `src/cli/*` — command-line entry points
- `src/sampleScript.ts` — sample script used for Studio preview and as an AI few-shot example
- `public/audio/` — generated voiceover MP3s (git-ignored; Remotion serves anything under `public/`)
- `public/uploads/` — user-uploaded product photos (git-ignored)
- `render.yaml` — Render deployment blueprint (see "Deploying to Render" above)
- `capacitor.config.ts` + `android/` — the Android APK wrapper project (see "Android app" above)
- `resources/` — source icon/splash images for the Android app
- `public/app/` — the built APK served for in-browser download (see "Android app" above)

## Roadmap toward a real product

1. **More templates** — add composition variants beyond `ProductAd` (testimonial-style,
   local-service style, announcement style) and let the AI pick one, not just fill it.
2. **Multiple product photos** — right now only one uploaded photo is supported, always
   attached to the "showcase" scene; extend to placing several images across scenes.
3. **Real accounts** — replace the anonymous session cookie + unverified "restore by
   email" with actual signup/login (magic link or password), so Pro status can't be
   claimed by anyone who knows a customer's email. Also worth adding: a database
   instead of in-memory Maps (today, a server restart wipes all usage/subscription
   state), and a lower resolution/quality cap on free-tier renders, not just the
   watermark.
4. **Cloud rendering** — local rendering is fine for prototyping; at scale, move
   `renderMedia` calls to a render farm (Remotion Lambda or your own worker queue),
   since video rendering is CPU-heavy and slow to do synchronously per request.
