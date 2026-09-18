# Jonah Cullen — site

Static site, ready for GitHub Pages. Plain HTML/CSS/JS, no build step.

## Structure

```
index.html      Home (dark theme)
lux.html        LUX — Lux Aeterna (dark + gold theme, 9-track player)
within.html     Within (light theme, 10-track player)
about.html      About / bio (dark theme)
videos.html     Videos (dark theme)
contact.html    Contact (dark theme)
style.css       All styles, all pages
script.js       Nav, parallax, audio player
images/         Photos, album covers, video posters (placeholders included)
audio/lux/      LUX mp3s (01–09)
audio/within/   Within mp3s (01–10)
videos/         Video files (empty — see note below)
```

## Deploying to GitHub Pages

1. Create a repo, push this folder's contents to it (root of the repo, or a `/docs` folder — your choice, just set it in the repo's Pages settings).
2. In the repo Settings → Pages, set the source to the branch/folder you used.
3. Your site will be live at `https://<your-username>.github.io/<repo-name>/`.

## Replacing placeholders

**Photos** — everything in `images/` is a generated placeholder labeled with what
it's standing in for (e.g. "Home — main"). Replace the file, keep the same
filename, and it'll drop right in:

- `home-main.jpg`, `home-aux.jpg` — dark-theme home photos
- `lux-main.jpg`, `lux-aux.jpg`, `lux-cover.jpg` — LUX page + Lux Aeterna cover
- `within-main.jpg`, `within-aux.jpg`, `within-cover.jpg` — Within page + cover
- `about-main.jpg` — headshot for the About page
- `video-placeholder-1.jpg` … `-4.jpg` — video poster thumbnails

If your real photos have different filenames, either rename them to match, or
update the `src=` / `href=` in the HTML — every placeholder image tag has an
HTML comment right above it saying what to swap in.

**Audio** — drop your mp3s into `audio/lux/` and `audio/within/`, then in
`lux.html` / `within.html` update each `<li class="track" data-src="...">` to
point at the real filename, and change `data-title` / the visible
`<span class="track-title">` text to the real song title. The player picks up
whatever's there automatically — no other code changes needed. Keep files as
mp3s (not wav) to stay well within GitHub's size limits — see note below.

**Video** — put files in `videos/` and update the `<source src="...">` in
`videos.html`, plus swap the poster image and title/description. If a clip is
large, consider uploading it to YouTube (can be set to "unlisted") and
replacing the `<video>` block with an iframe embed instead — see the comment
in `videos.html`.

**Social links** — every Instagram/Spotify/Apple Music/YouTube link across the
site currently points at `href="#"`. Search the project for `href="#"` and
replace with your real profile URLs (there's one set in each page's footer,
plus one more set on the Contact page).

**Contact form** — this is a static site, so the form can't send email on its
own. It's wired to a `mailto:` action as a simple default — replace
`REPLACE_WITH_YOUR_EMAIL@example.com` in `contact.html` with your real
address. If you want an actual inbox-delivered form instead of opening the
visitor's email client, sign up for a free plan at formspree.io and swap in
the form action they give you.

**Bio / placeholder copy** — anything in `[]` or flagged with an HTML comment
starting `PLACEHOLDER` is sample copy for you to rewrite: the homepage intro,
About page bio + press bio, LUX and Within liner notes, and video
descriptions.

## A note on file sizes (GitHub Pages limits)

GitHub enforces a 100MB hard limit per file, and recommends keeping a whole
repo under ~1GB, with Pages sites capped similarly and a soft ~100GB/month
bandwidth limit. Practical guidance:

- **Audio**: encode mp3s at 128–192kbps. A 3–4 minute song at that bitrate is
  roughly 3–6MB. All 19 tracks across both albums should total well under
  150MB — no problem.
- **Video**: this is the one to watch. Even short compressed clips can be
  50–200MB+. Self-hosting is fine for a few short/small clips (aim under
  ~20–30MB each), but for anything longer, embedding from YouTube keeps the
  repo lean and avoids bandwidth issues.
