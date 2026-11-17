# Kanji Drill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standalone kanji drill app (200 UK GCSE kanji, with example words, writing, listening) built by copying the Hiragana drill and replacing its deck and card engine pieces.

**Architecture:** Copy `/Users/jon/develop/cds/hiragana` into this repo (as Katakana was), rename its identity, then replace `js/deck.js` with a kanji deck (kanji entries plus word entries) and generalise the scheduler, queues, session, home and report code to two entry kinds. Everything else (FSRS vendor copy, drawing pad, backups, offline cache, tips) is kept.

**Tech Stack:** Plain HTML/CSS/ES modules, no build, no npm; `node --test` for tests; Python 3 helper scripts in `tools/`; ts-fsrs 5.4.2 and KanjiVG (vendored, with licences).

**Spec:** `docs/superpowers/specs/2026-11-16-kanji-drill-design.md` (includes the 200-kanji appendix). One deliberate change from the spec's example: word card ids are `<word>|word` (not `w|<word>|word`) so `id.split('|')` still gives `[key,type]`.

## Global Constraints

- Plain HTML, CSS and JavaScript (ES modules); no build step, no npm. GitHub Pages serves files as committed.
- Third-party code in `vendor/`, pinned, licence alongside.
- Phone first; light and dark mode (colours as CSS variables on `:root`).
- Storage namespaced: progress key `kanji-drill-v1` (plus `-preview` under `/preview/`), caches `kanji-...`, backup label `"app":"kanji-drill"`; other drills' backups are turned away.
- 200 kanji exactly: Foundation 76, Higher 124 (spec appendix). No duplicates.
- Readings are only ever taught inside words. Speaking is unmarked (a "say it aloud" step only).
- Explanations and docs in plain, friendly English for a non-specialist. The guide says plainly this is not an official Pearson product; screens say "Kanji drill" and show the GCSE only as a tier label.
- After adding, renaming or removing files, or changing a clip: rerun `python3 tools/make_sw.py . sw.js <new-version>`.
- Never commit an API key. Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Work on branch `build`; the app need not run between Tasks 2 and 7 (deck replaced before dependents are updated).
- Pushing to GitHub, enabling Pages, and editing the `nooogle.github.io` home page are outward-facing: ask Jon before each.

## Review Focus

1. Two kanji with the same English meaning offered together as answers (言/語/話 "say/language/speak"; 小/少 "small/few"): meanings must be distinct and options never repeat a meaning.
2. A word appearing before all of its kanji have been added and learned (三月 before 月): it must not.
3. A word with no voice clip being asked as a listening card: it must only be a reading card, and the app must not break.
4. First run with no sets added, and a backup from the Hiragana or Katakana drill pasted into Restore: no crash; backup refused with a clear message.
5. Characters with unusual stroke counts or forms (館 16, 曜 18, 青, 才): the drawing pad and animation must work, and KanjiVG's stroke count must match the spec's.

---

## File structure

- Keep (renamed/edited): `index.html`, `css/style.css`, `manifest.webmanifest`, `sw.js`, `icons/`, `how-it-works.html`, `how-the-voice-was-made.html`, `README.md`, `CLAUDE.md`, `js/{app,storage,backup,scheduler,queues,sound,hints,hintdata,keys,welcome,tips,sheets,ui,drawing,strokes}.js`, `js/screens/{home,session,report}.js`, `tools/*`, `tests/*`.
- New `js/kanjidata.js`: pure data only (SETS, per-kanji meanings/readings, WORDS). The thing the owners check.
- Replace `js/deck.js`: builds KANJI, WORDS, lookups from the data.
- New `js/words.js`: pure functions picking answer options for word cards.
- New `tools/review_sheet.mjs`: prints the deck as a readable table for checking.
- Delete `js/hintdata.js` suggested hints content (keep file, export `{}`), hiragana `audio/*`, `vendor/kanjivg-hiragana.js`.

---

### Task 1: Bootstrap the repo from the Hiragana drill

**Files:** Create/copy everything under "Keep" from `/Users/jon/develop/cds/hiragana` (not `.git`, `preview/`, `audio/*.mp3`, `docs/`); create `.nojekyll`; modify names throughout.

**Interfaces:** Produces `APP='kanji-drill'` in `js/backup.js`; `NAMES` includes `'kanji-drill':'the Kanji drill'`; storage key `kanji-drill-v1`.

- [ ] **Step 1: Failing test** `tests/identity.test.mjs`: read every `.js`, `.html`, `.json`, `.webmanifest` file under the repo (excluding `docs/`, `vendor/`, `tests/`) and assert none contains `hiragana-drill`, `Hiragana drill` or the string `hiragana-` as a storage/cache key; assert `sw.js` cache name starts `kanji-`; assert `manifest.webmanifest` name is "Kanji drill".
- [ ] **Step 2:** Run `node --test tests/identity.test.mjs`; expect FAIL.
- [ ] **Step 3:** Copy files, then rename: titles, headings, `STORE`, cache names in `tools/make_sw.py` and `sw.js`, `APP` and `NAMES` in `backup.js` (keep hiragana and katakana names so their backups are refused by name), manifest, icons (new simple 漢 icon set; builder's choice of colours, matching how Katakana differs from Hiragana), README and CLAUDE.md (same shape as the Hiragana ones, kanji wording, link `https://nooogle.github.io/kanji/`). Remove the hiragana audio and stroke data; stub `js/hintdata.js` to export an empty suggestions object.
- [ ] **Step 4:** Rerun the test; expect PASS. (Other tests are deleted or rewritten in later tasks; delete `tests/{audio,deck,hints,strokes}.test.mjs` now, keep `backup.test.mjs` and adapt its app names.)
- [ ] **Step 5:** Commit `Kanji drill: copy the Hiragana drill and give it its own name and storage`.

### Task 2: Deck model and Foundation data

**Files:** Create `js/kanjidata.js`, `tools/review_sheet.mjs`; replace `js/deck.js`; test `tests/deck.test.mjs`.

**Interfaces — Produces** (from `js/deck.js`):
- `SETS: {id:string,name:string,tier:'foundation'|'higher',k:string}[]` (`k` = the set's kanji as one string), `SETMAP`.
- `KANJI: {k,m,on:string[],kun:string[],n:number,tier,set:string,i:number}[]` (`m` meaning, readings in kana, `n` stroke count), `BY: Record<char,KanjiEntry>`.
- `WORDS: {w,r,e,k:string[],a:string|null,set:string}[]` (`w` written, `r` kana reading, `e` English, `k` the kanji it contains, `a` clip name or null, `set` = the latest set among its kanji), `WORD_BY: Record<string,WordEntry>`.
- `TYPES=['read','recall','write']`, `WORD_TYPE='word'`.
- `entryOf(id:string): {kind:'kanji'|'word', item, type:string}|null` (id `三|read`, `三月|word`).
- `CONFMAP: Record<char,Set<char>>`, `mixKey(a,b)`, `mixParts(key)`, `unknownCards(state): string[]` (card ids whose entry is not in this deck).
- `wordsOf(setIds:string[]): WordEntry[]` — words whose kanji are all in the given sets.

`js/kanjidata.js` exports `SETS_DATA`, `KANJI_DATA` (`{[char]:{m,on,kun,n}}`) and `WORDS_DATA`; `deck.js` derives the rest.

- [ ] **Step 1: Failing tests** in `tests/deck.test.mjs`:
  - `KANJI.length` is 76 with `tier==='foundation'` before Task 3 (this test is changed to 76+124 in Task 3); every kanji appears in exactly one set; meanings are unique across `KANJI` (case-insensitive).
  - Order check: first set is `一二三四五六七八九十`; `百千万円` in the second.
  - Every word's characters that are kanji are all in `KANJI`; every word contains at least one kanji; `wordsOf(['num1'])` contains `三つ` but not `三月`; every kanji has at least one word whose `k` includes it (Foundation).
  - `entryOf('三|read').kind==='kanji'`, `entryOf('三月|word').kind==='word'`, `entryOf('x|read')===null`.
  - `CONFMAP['日'].has('目')`, `['大','犬']`, `['人','入']`.
  - Foundation characters equal the spec appendix (the 76 listed in the spec's appendix, pasted into the test).
- [ ] **Step 2:** Run `node --test tests/deck.test.mjs`; expect FAIL.
- [ ] **Step 3:** Write `kanjidata.js` for the 76 Foundation kanji in about 9 sets of 8–10 (numbers first; then e.g. days and the sun/moon/elements, people, body, directions and places, school and big/small words), each with a unique short English meaning, readings in kana, spec stroke count, and 1–3 example words (from the spec's vocabulary lists where they fit; reading as kana). Add `deck.js` as described; `CONF` groups cover at least 日目, 大犬太-style pairs within the 200, 人入, 午牛, 千干-style, 土士-style, 右石-style, 休体, 持待, 語話読, 子字, 町村, 白百, 外夕-style where both are in the 200.
- [ ] **Step 4:** Rerun; expect PASS.
- [ ] **Step 5:** Write `tools/review_sheet.mjs` printing one line per kanji (character, meaning, readings, words with readings and English) from the deck; run it and check it prints 76 lines.
- [ ] **Step 6:** Commit.

### Task 3: Higher data

**Files:** Modify `js/kanjidata.js`, `tests/deck.test.mjs`.

**Consumes:** Task 2's data shapes.

- [ ] **Step 1:** Update the tests: 200 kanji (76 foundation, 124 higher); every Higher character equals the spec appendix list; same uniqueness and word checks over all 200; every set has at most 12 kanji.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Add the 124 Higher kanji in sets of about 8–12 after the Foundation sets, themed (family, time, travel, school, nature, verbs…), with the same data. Some Higher kanji may make words with Foundation kanji; those words belong to the latest set.
- [ ] **Step 4:** Run; expect PASS. Regenerate the review sheet.
- [ ] **Step 5:** Commit. **Stop and hand the review sheet to Jon for checking (meanings, readings, words). Do not continue to Task 10 (audio) until Jon says the data is checked.** Tasks 4–9 can proceed meanwhile.

### Task 4: Stroke data

**Files:** Modify `tools/make_strokes.py` (read the 200 kanji from `js/kanjidata.js` instead of `js/deck.js`; output `vendor/kanjivg-kanji.js`; keep the licence file); modify `js/strokes.js` import and lookup names; create `tests/strokes.test.mjs`.

**Interfaces — Produces:** `STROKES[k]={s:string[],n:number[][]}` for every kanji; `js/strokes.js` exports as before, keyed by kanji.

- [ ] **Step 1: Failing test:** every kanji in `KANJI` has stroke data; `STROKES[k].s.length===BY[k].n` for each (list known exceptions with a comment, if any); 館 has 16 and 曜 has 18.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Run `python3 tools/make_strokes.py <KanjiVG release tag>` (use the tag from the Hiragana script's docstring or the latest release; pin it in the docstring). If any count differs from the spec, check that character by eye (KanjiVG variant) and either record the exception in the test or the deck's `n`.
- [ ] **Step 4:** Run; expect PASS. Check by eye in the browser (Task 7) that the animation of 青, 館 and 曜 looks right.
- [ ] **Step 5:** Commit.

### Task 5: Fonts

**Files:** Modify `tools/make_fonts.py` (characters taken from deck, words and UI text); regenerate `vendor/fonts/`.

- [ ] **Step 1:** Run `python3 tools/make_fonts.py`; it must report that every kanji in the 200 and every word character is in the Klee One subset. If it can't check this, add a small check at the end of the script that fails when a deck character is missing.
- [ ] **Step 2:** Commit the fonts.

### Task 6: Scheduler, queues, storage and backup for two entry kinds

**Files:** Modify `js/scheduler.js`, `js/queues.js`, `js/backup.js`; create `tests/helpers.mjs` (sets `globalThis.localStorage` as an in-memory stub and `globalThis.location={pathname:'/'}` before importing modules that read them) and `tests/scheduler.test.mjs`; extend `tests/backup.test.mjs`.

**Interfaces — Consumes:** Task 2's `entryOf`, `wordsOf`, `KANJI`, `WORDS`, `TYPES`, `WORD_TYPE`. **Produces:**
- `unlockedId(id:string): boolean` replacing `unlocked(it,t)`: kanji cards as the Hiragana unlock chain (read, then recall once read is in `State.Review`, then write once recall is); a word card (`<word>|word`) when every kanji of the word is in an added set (`S.rows` holds **set ids**; the saved key name stays `rows`) and each of those kanji's `|read` card is in `State.Review`; manual mode: ticked types, with `'word'` as a type alongside the three.
- `activeCards(): string[]` (kanji cards for kanji in added sets plus unlocked word cards).
- `SPEED.word=[2500,8000]`; `rating`/`grade` otherwise unchanged (word cards are graded with listen speed when `listen` is true).
- `manualTypes()` may return `'word'`.
- `queues.js`: `spread` keys on the entry's set (use `entryOf`), `buildPractice(setId)`, `buildRunThrough()` pick one card per kanji and per word.
- `buildPlacement(setId:string): string[]` in `queues.js`: the shuffled `<kanji>|read` ids of that set (what `app.js` passes to `startSession('placement',…)`).
- `backup.js`: `checkBackup` refuses backups whose `app` is another drill, and ones whose cards are not in this deck.

- [ ] **Step 1: Failing tests** `tests/scheduler.test.mjs` (using `helpers.mjs`):
  - With no sets added, `activeCards()` is `[]`.
  - After adding the set containing 三 (`S.rows=['num1']`): `activeCards()` includes `三|read` but not `三|recall`, and no word cards.
  - After setting `S.cards['三|read']` to a Review-state card: `三|recall` is active; `三つ|word` is active only if every kanji of 三つ is in added sets and learned; `三月|word` is not active while 月 is not added.
  - `buildPlacement('num1')` is exactly the `|read` ids of the set's kanji (and no word ids); after placement-grading all of them right, every `|recall` card of the set is active and so are the words whose kanji are all in added sets.
  - `grade('三|read',true,'review',1000,false)` stores a card and logs `{id:'三|read',ok:true}`.
  - In `tests/backup.test.mjs`: a backup text with `app:'hiragana-drill'` and one with `app:'katakana-drill'` are refused with a message naming the other drill; a backup containing `あ|read` is refused; `backupText(S)` round trips for a kanji progress object.
- [ ] **Step 2:** Run `node --test tests/*.test.mjs`; expect FAIL.
- [ ] **Step 3:** Implement as described, replacing `KANA`/`BY` uses with `entryOf` and `KANJI`.
- [ ] **Step 4:** Run; expect PASS.
- [ ] **Step 5:** Commit.

### Task 7: Kanji cards in the session (meaning, recall, write)

**Files:** Modify `js/screens/session.js`, `js/ui.js` (the `level(it)` helper takes a kanji entry), `js/hints.js` if it keys on the kana, `css/style.css` for long meanings.

**Interfaces — Consumes:** Task 2 `BY`, `CONFMAP`, `entryOf`; Task 6 `activeCards`. **Produces:** `pickOptions(it:KanjiEntry): KanjiEntry[]` (the right answer plus three wrong: up to two look-alikes from `CONFMAP` among added sets, then others from added sets, then any kanji; never two with the same meaning).

- [ ] **Step 1: Failing test** `tests/options.test.mjs`: move `pickOptions` to `js/options.js` (pure, takes the entry, the added set ids and an optional `rand`) and test: 4 distinct entries, includes the answer, no repeated `m`, look-alike 目 is offered for 日 when both sets are added.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement `js/options.js`; then in `session.js` rewrite the three kanji card layouts:
  - *new kanji intro* (first time `|read` appears in a review): big kanji, meaning, readings (on and kun, in kana), its example words, hint box, "Got it".
  - *read* ("What does this mean?"): kanji shown, four meaning buttons.
  - *recall* ("Which kanji means 'three'?"): meaning shown, four kanji buttons.
  - *write*: shows the meaning (and the first example word), the drawing pad, stroke-trace steps, Check and Don't know exactly as the Hiragana write card works; the pad is one square (no double-width boxes).
  After each answer, feedback shows the kanji, meaning, readings and words. Remove the っ pair code.
- [ ] **Step 4:** Run `node --test tests/*.test.mjs`; PASS. Run `python3 -m http.server 8000` and try a session with the set 一〜十 on a phone-width window: all three card kinds, right and wrong answers, Don't know, a blank pad.
- [ ] **Step 5:** Commit.

### Task 8: Word cards

**Files:** Create `js/words.js`, `tests/words.test.mjs`; modify `js/screens/session.js`, `js/sound.js` (reuse `speakWord(text,clip)`), `js/keys.js` if answer keys assume four kana options.

**Interfaces — Consumes:** `WORD_BY`, `wordsOf`, `BY`. **Produces:**
- `readingOptions(word:WordEntry, setIds:string[], rand?:()=>number): {text:string,ok:boolean}[]` — 4 distinct kana readings: the right one plus three from other words in `wordsOf(setIds)` that share a kanji with this word first, then readings of other words; never the same reading as the right answer.
- `listenOptions(word, setIds, rand?): {text:string,ok:boolean}[]` — 4 distinct written words, wrong ones with a different reading from the right answer.
- `canListen(word): boolean` — true when `word.a` is not null.

- [ ] **Step 1: Failing tests** `tests/words.test.mjs`: `readingOptions` returns 4 distinct texts with exactly one `ok`; no wrong option equals the right reading; works with only one set added (falls back to words from the whole deck); `listenOptions` never has two options with the same reading; `canListen` is false for a word with `a:null`.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement `words.js`. In `session.js` add the word card: first time seen, an intro (word, reading, English, speaker button, "Got it"); then reading card ("How is this read?", word shown, four kana buttons) or, at random when sound is available and `canListen`, a listening card ("Which word did you hear?", sound plays, four written-word buttons; logged with `v:'listen'`). After the answer, the feedback shows the word, reading, English, a speaker button where a clip exists, and a "Say it aloud" prompt (no recording, no marking) before Next. "Can't use sound right now" still turns listening off for the session.
- [ ] **Step 4:** Run tests; PASS. Try word cards in the browser with sound on and off.
- [ ] **Step 5:** Commit.

### Task 9: Home chart, Progress, Settings, text

**Files:** Modify `js/screens/home.js`, `js/screens/report.js`, `js/sheets.js`, `js/app.js` (row actions become set actions), `js/welcome.js`, `js/tips.js`, `how-it-works.html`, `css/style.css`.

**Interfaces — Consumes:** `SETS`, `BY`, `KANJI`, `level`, Task 6 functions.

- [ ] **Step 1:** Home chart: sections "Foundation" and "Higher" (headings), each listing its sets as buttons (like rows): the kanji as cells coloured by `level`, tag "Add" or the set name; tapping opens the existing add/options sheet (with the "I already know these" quick check, using `buildPlacement`, replacing the row code in `app.js`). The hero and "Run through everything" work as before. Empty state wording: "Pick the sets you've studied".
- [ ] **Step 2:** Progress screen: counts and shaky/strongest lists over kanji; a separate "Words" line (learned / in progress). The share text says "Kanji drill".
- [ ] **Step 3:** Settings: the card-type ticks become Meaning, Recall, Write, Word reading (one box for reading and listening); keep sound, writing on/off, backup/restore, reset.
- [ ] **Step 4:** Welcome slides and tips rewritten for kanji (what a kanji is; readings come through words; writing; "say it aloud"); `how-it-works.html` says what the app does, that it is not an official Pearson product, credits Pearson's published kanji list as the source of the 200, KanjiVG (CC BY-SA 3.0), Klee One and Zen Maru Gothic (OFL) and ts-fsrs (MIT).
- [ ] **Step 5:** Check by hand on a phone-width window, light and dark, first run with no sets, and after adding two sets; check Restore with a pasted Hiragana backup says it is from the Hiragana drill.
- [ ] **Step 6:** Commit.

### Task 10: Voice clips (after Jon checks the data)

**Files:** Modify `tools/clips.mjs`, `tools/make_voice.py`, `tools/tidy_voice.py` (names, not logic), `js/kanjidata.js` (set `a` once a clip exists), `tests/audio.test.mjs`; create `audio/*.mp3`.

**Interfaces:** `CLIPS` in `tools/clips.mjs` maps clip name → the word's kana reading to say (for example `w-sangatsu` → `さんがつ`). Clip names are `w-<romaji of the reading>`; `WORDS_DATA` entries get `a` set only when the file exists.

- [ ] **Step 1: Failing test** `tests/audio.test.mjs`: every word with `a` has `audio/<a>.mp3` on disk; no two words with different readings share a clip name; no `audio/` file is unused by the deck.
- [ ] **Step 2:** Run; expect FAIL once `a` values are added without files (write the test first, then add `a` values in Step 3 only as clips are made).
- [ ] **Step 3:** With Jon's confirmation that the data is checked, and with Jon supplying the Google API key in the environment (never committed): run `python3 tools/make_voice.py` for the Foundation words, `python3 tools/tidy_voice.py`, ask Jon to listen to each clip, then set `a` for those words. Higher words follow once clips exist.
- [ ] **Step 4:** Run tests; PASS. In the browser, check listening cards for words with clips and that words without clips appear only as reading cards.
- [ ] **Step 5:** Commit.

### Task 11: Offline cache, docs, publish

**Files:** `sw.js` (generated), `README.md`, `CLAUDE.md`, `.nojekyll`.

- [ ] **Step 1:** Run `python3 tools/make_sw.py . sw.js 2026-11-16a` (use today's date and a letter); run `node --test tests/*.test.mjs`; expect all PASS.
- [ ] **Step 2:** Update `README.md` ("Where things are" for the new files) and `CLAUDE.md` so a future session understands the kanji deck, ids and the staged release.
- [ ] **Step 3:** Merge `build` into `main` (ask Jon first). Ask Jon before creating the GitHub repo `nooogle/kanji`, pushing, enabling Pages, and before adding the link on the `nooogle.github.io` home page (a separate repo).
- [ ] **Step 4:** Commit.
