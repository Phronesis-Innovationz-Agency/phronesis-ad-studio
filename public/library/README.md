# Media library

Drop your own files in these folders from your computer. This is founder-curated
stock media - separate from `public/uploads/` (what individual visitors upload for
their own ad) and `public/demo/` (the one fixed showcase video).

## images/

JPEG, PNG, or WebP. When someone generates an ad **without** uploading their own
product photo, the pipeline randomly picks one of these and uses it as a full-bleed
background (same treatment as an uploaded photo - `object-fit: cover` plus a dark
overlay so text stays readable). Good candidates: clean lifestyle/product-style
photography, textures, gradients - anything that still reads well with text and a
mascot placed on top of it.

## videos/

MP4 or WebM. Used the same way as images/ (random pick when nobody uploaded a photo,
same full-bleed background treatment) - if a scene has no image to fall back to, the
pipeline tries a video next. Muted automatically (the ad's own narration plays over
it).

**Not looped** - Remotion's frame-accurate looping needs a clip's exact duration known
ahead of render time, which this simple random-pick doesn't compute (unlike the music/
folder below, which does). Use clips at least as long as your longest scene; a shorter
one just holds its last frame once it runs out. Large files also slow down rendering,
so a few MB each is plenty - nothing needs to be broadcast quality.

## music/

MP3, WAV, or M4A. When a track exists here, the pipeline picks one at random and plays
it under the *entire* ad (all scenes, not per-scene like images/videos) at a low,
fixed volume so the narration stays clearly audible, with a short fade in/out. Unlike
videos/, this **is** looped seamlessly for the full length of the ad - the pipeline
measures the track's real duration before rendering and hands that to Remotion's
`<Loop>`, so a 10-second track correctly repeats for a 50-second ad.

Pick something copyright-cleared for commercial use (a track you made, a royalty-free
library that covers this, or similar) - you're distributing it in every ad this app
generates for a visitor.

Currently seeded with:

- `warm-ambient-loop.wav` - hand-generated, no license concerns.
- `valley-sunset-ambient.mp3`, `relaxation-05-ambient.mp3` - calm ambient beds, good
  default choice for most brand/product ads.
- `motivating-mornings-corporate.mp3`, `raising-me-higher-corporate.mp3` - upbeat
  corporate tracks, better fit for energetic/promotional ads.
- `what-about-action-dancepop.mp3`, `heartbeat-pop.mp3` - dance-pop tracks with an
  actual drum beat, for ads that want to feel driving/energetic rather than just
  pleasant background texture. `what-about-action-dancepop.mp3` is what's mixed into
  the Phronesis Ad Studio showcase demo (`public/demo/`).

All MP3s are from [Mixkit](https://mixkit.co/free-stock-music/), free under the
[Mixkit License](https://mixkit.co/license/#musicFree) for commercial use with no
attribution required. If you add more tracks of your own, favor short (10-30s),
steady ambient/corporate loops - no big drops or vocal hooks - since they repeat for
the length of the ad and anything with strong dynamics gets distracting on a loop.

## audio/

For pre-recorded **narration** (spoken voice), not music - see music/ above for
background music. Reserved for a future feature (not wired up yet): letting a user
pick a pre-recorded narration track instead of generating one with ElevenLabs. It's
not auto-applied
today because a stored voiceover's *words* would need to actually match whatever
product the visitor describes - unlike a background image or video, audio can't be
randomly substituted without producing a narration that talks about the wrong thing.
Drop files here now if you want them ready for when that selection UI gets built.
