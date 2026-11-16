# kanji

The Kanji drill: a small web app for learning the 200 kanji of the UK GCSE in Japanese (Pearson Edexcel), with the
words that teach their readings, published by GitHub Pages at <https://nooogle.github.io/kanji/>. It started as a copy
of the Hiragana drill (as the Katakana drill did). The home page that lists all the apps is in the separate
`nooogle.github.io` repo; it links here, so keep the address the same.

Read `README.md` and `docs/superpowers/specs/2026-11-16-kanji-drill-design.md` before working on the code. The
build plan is `docs/superpowers/plans/2026-11-16-kanji-drill.md`.

## Layout

- The app is at the top of the repo: `index.html`, `css/`, `js/`, `vendor/`, `icons/`, `audio/`, `sw.js` and so on.
- `tools/`: helper scripts, run from the top of the repo (`make_sw.py` for the offline cache list, `make_strokes.py` for
  the stroke data, `make_fonts.py` for the fonts, `make_voice.py` and `tidy_voice.py` for new voice clips).
- `tests/`: run with `node --test tests/*.test.mjs`.

## Conventions

- Plain HTML, CSS and JavaScript (ES modules), with no build step and no npm. GitHub Pages serves the files exactly as committed.
- Third-party code is copied into `vendor/`, pinned to a version, with its licence alongside.
- Pages should work well on a phone first, and support light and dark mode (colours as CSS variables on `:root`).
- Every app on nooogle.github.io shares one browser storage space, so keep `localStorage` keys and caches namespaced to this app (`kanji-...`).
- Explanations and docs are written in plain, friendly English for a non-specialist reader.
- Readings are only ever taught inside words, never on a bare kanji.

## Running locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. Opening the HTML files directly won't work, because browsers block ES modules from `file://`.

## Things to remember

- If you add, rename or remove a file, or change a voice clip, rerun `tools/make_sw.py` with a new version name.
- Don't break the saved progress format without adding a migration.
- Never commit an API key (the voice tools read `GOOGLE_API_KEY` from the environment).
