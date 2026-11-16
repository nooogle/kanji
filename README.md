# Kanji drill: notes for working on the code

This is the developer side of the app. (For how to *use* it, see [How it works](how-it-works.html).)

This repo is the whole app. GitHub Pages publishes it at <https://nooogle.github.io/kanji/> (the home page listing all the apps lives in the separate `nooogle.github.io` repo). It started as a copy of the Hiragana drill, as the Katakana drill did.

It's plain HTML, CSS and JavaScript with no build step. GitHub Pages serves these files exactly as they are, and the browser loads the JavaScript as **ES modules**: each file `export`s what it shares and `import`s what it needs from the others.

## Where things are

```
kanji/                  (this repo)
  index.html            the page skeleton: one empty <main>, then loads js/app.js
  css/style.css         all the styling (colours are variables at the top, with dark mode below)
  js/
    app.js              start-up, and the one click handler that routes every button (data-act="...")
    kanjidata.js        the data to check and correct: the sets, each kanji's meaning, readings and stroke
                        count, and the example words (written, reading, English, voice clip name)
    deck.js             builds the lookups from that data: KANJI, WORDS, SETS, entryOf(id), wordsOf(sets), look-alikes
    options.js          the four answers on a kanji card (pure code, tested)
    words.js            the four answers on a word card, reading or listening (pure code, tested)
    storage.js          the progress object S, saved to localStorage; backups copy exactly this
    scheduler.js        FSRS: grading answers, unlocking cards (unlockedId, activeCards)
    queues.js           which cards come up: reviews, weakest, placement, run through everything
    sound.js            voice clips and phone speech, and waiting for sounds to finish
    hints.js            hint boxes and the hint editor
    hintdata.js         suggested hints (none yet; learners write their own)
    keys.js             keyboard shortcuts for computers (each key presses a button on screen)
    welcome.js          the welcome slides for first-time users, and the Android Install button
    tips.js             the one-time tips during practice (which ones have been seen is kept in settings)
    sheets.js           pop-up panels: set options, Settings, and Send feedback (by email)
    ui.js               shared bits: icons, toasts, chart colours, streak, "next cards ready" text
    drawing.js          the finger-drawing pad on writing cards
    strokes.js          the stroke order animation shown after Check on writing cards
    backup.js           backup text and the checks before restoring one
    screens/
      home.js           the chart screen (Foundation and Higher, set by set)
      session.js        showing cards, answers, feedback, the done screen
      report.js         the Progress screen and its share text
  vendor/               the ts-fsrs library, untouched (MIT licence), and the stroke order data
                        from KanjiVG (CC BY-SA 3.0, built by tools/make_strokes.py)
    fonts/              the Klee One and Zen Maru Gothic fonts (SIL Open Font License), kept here so they
                        work offline (built by tools/make_fonts.py)
  icons/                app icons for iPhone, Android and desktop, and the favicons
  manifest.webmanifest  the app's name, icons and colours, used when it's installed
  audio/                one MP3 per example word reading, named w-<romaji> (words read the same share one)
  sw.js                 the offline cache (generated, see below)
  how-it-works.html     the user guide
  how-the-voice-was-made.html
  tests/                node --test tests/*.test.mjs (the deck, options, scheduler, strokes, clips, backups)
  tools/                helper scripts: make_sw.py (the offline cache list), make_strokes.py (the stroke data),
                        make_fonts.py (the fonts), review_sheet.mjs (the deck as a table to check),
                        make_voice.py, tidy_voice.py and mark_clips.mjs (new voice clips; see the top of each)
  docs/superpowers/     the design, the build plan and the data review sheet
```

## The cards

A kanji has three cards: **read** (see it, pick the meaning), **recall** (see the meaning, pick the kanji) and **write**.
Each example word has one card (`<word>|word`): a reading question, or, if the word has a voice clip, sometimes a
listening question. Card ids are `<key>|<type>`, like `三|read` and `三つ|word`. Recall unlocks once read is past its
learning steps, write once recall is; a word unlocks once every kanji in it is in an added set and each one's read card is
past its learning steps. `S.rows` holds the ids of the sets the learner has added (the name is left over from the
Hiragana drill).

## Checking the data

The meanings, readings and example words were drafted by Claude from Pearson's published GCSE list, so they need a
person's eye. `node tools/review_sheet.mjs` prints every kanji with its words; `docs/data-review-sheet.txt` is a saved copy.
Words with no voice clip (`a` is missing in `js/kanjidata.js`) are only ever asked as reading questions.

## Making voice clips

Once the data is checked: `export GOOGLE_API_KEY=...`, then `python3 tools/make_voice.py`, `python3 tools/tidy_voice.py`,
listen to the clips, `node tools/mark_clips.mjs`, then rebuild the offline cache list. Never commit the key.

## Trying changes on your Mac

Modules won't load if you just double-click the HTML file (browsers block that). Run a tiny web server from the top of the repo instead:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. Progress there is separate from the live site.

## The offline cache

`sw.js` keeps a copy of every file on the phone so the app works with no signal. Pages, scripts and styles are always fetched fresh when there's signal, so ordinary code changes need nothing extra. If the server takes more than 3 seconds to answer (a weak signal), the saved copy is used instead, so the app still opens quickly. But **if you add, rename or remove a file, or change a voice clip**, rebuild the list and give it a new version name:

```bash
python3 tools/make_sw.py . sw.js 2026-11-02a
```

The fonts are kept in the app, not loaded from Google, so they work offline. To save space, only the parts of each font covering characters the app uses are kept. If you add text with new characters (new kanji, say), run `python3 tools/make_fonts.py`, then rebuild the cache list as above. Until then, those characters just show in the phone's own font.

## Saved progress

Progress lives in `localStorage` under the key `kanji-drill-v1`, as one JSON object (`S` in `storage.js`). A backup is that object as text with an `"app":"kanji-drill"` label added (`js/backup.js`), so a Hiragana or Katakana drill backup pasted into Restore is turned away instead of being loaded. The checks in `tests/` (the deck, answer options, scheduler, stroke data, voice clips and backups) run with `node --test tests/*.test.mjs`. Keep that format compatible, or add a conversion step like `migrate()` in `scheduler.js`, so nobody loses their progress when the app updates.
