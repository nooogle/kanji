# Kanji drill: design

A third drill app, after the Hiragana and Katakana drills, for learning the 200 kanji of the UK GCSE
(Pearson Edexcel Level 1/Level 2 GCSE (9-1) in Japanese, Appendix 4). Lives in its own repo, `kanji`,
published at <https://nooogle.github.io/kanji/>.

## Intent and why

Two learners are preparing for the GCSE and need to read, write and hear these 200 characters. The spec
assesses listening, speaking, reading and writing at 25% each; the spec's marking notes penalise wrong
kanji in writing (for example 工園 for 公園). Other people may use the app too, so the screens are general
("kanji drill") and the GCSE is mentioned only in the guide and as a tier label on sets.

## Goals

- Learn all 200 kanji: recognise each and know its meaning, pick it from its meaning, write it from memory.
- Learn how each is read, **inside real words** (readings are never taught on a bare character).
- Hear the words (listening), with a prompt to say them aloud (speaking, unmarked: the app can't judge speech).
- Same feel as the Hiragana and Katakana drills: FSRS scheduling, same session screens, hints, progress,
  backup/restore, offline, light/dark, phone first.

## Non-goals

- The GCSE vocabulary lists (well over a thousand words, given in kana). Possible future project.
- Grammar, sentence practice, listening comprehension beyond single words.
- Marking speech.
- Suggested mnemonics for each kanji in the first release (the user-written hint editor carries over).
- Kanji beyond the 200 (the data layout should make adding sets easy, but none are built).

## Anti-goals

- Teaching a reading with no word around it.
- Looking or behaving like an official Pearson product. The guide says plainly it isn't one.
- Breaking the plain HTML/CSS/ES-modules, no-build, no-npm rule, or sharing storage keys with the other apps.

## Constraints

- Same conventions as the Hiragana drill's CLAUDE.md: vendored third-party code with licences, localStorage
  keys and caches namespaced (`kanji-drill-v1`, caches `kanji-...`), backups labelled `"app":"kanji-drill"`
  so other drills' backups are turned away, plain friendly English docs.
- Stroke data from KanjiVG (CC BY-SA 3.0, already used by the other drills), built by a `make_strokes.py`.
- Fonts: rerun `make_fonts.py` so every character used is in the subset (kanji included).
- Voice clips via `make_voice.py`, then `tidy_voice.py`; offline list via `make_sw.py` with a new version name.

## Approaches considered

- **A. Copy and adapt the Hiragana drill, as Katakana was (chosen).** Fastest; keeps everything proven.
  Cost: the card engine must handle several card families per kanji.
- B. One shared engine across the three apps. Tidier, but breaks the standalone/no-build rule and means
  reworking two working apps. Rejected.
- C. Words first, kanji only inside words (WaniKani style). Teaches readings well, but the GCSE tests the
  characters themselves, including writing. Rejected.

## The design

**Repo setup (as Katakana was):** copy the Hiragana drill, give it its own name, icons, storage key, cache
name, backup label and README/CLAUDE.md; then replace the deck. Design and plan docs live in `docs/superpowers/`.

**The deck.** One entry per kanji: the character, English meaning(s), on/kun readings (shown as information
after answers), stroke count, GCSE tier (Foundation 76 / Higher 124), its set, and 1-3 example words.
The set order is a learning order, Foundation first, starting with numbers
(一二三四五六七八九十, then 百千万円), then people/time/nature and so on; roughly 8-12 per set (builder
proposes the grouping; stroke-count order from the spec is not used for teaching). Example words are taken
from the spec's own vocabulary lists where possible (each word: kanji spelling, kana reading, English).
English meanings and readings are drafted by Claude and must be checked by the owners (the data has a
"checked" note in the plan, not in the UI).

**Cards per kanji** (ids namespaced like `k|type`):
1. *Meaning*: see the kanji, pick the English meaning.
2. *Recall*: see the meaning, pick the kanji. Wrong answers are look-alikes from the confusable list
   (for example 日/目, 大/犬, 人/入, 午/牛, 持/待, 語/話/読, 休/体), as in the other drills.
3. *Write*: the existing trace-then-draw-from-memory pad with stroke-order animation (self-graded).
4. *Word reading*: see a word containing the kanji (for example 三月, 三つ, 山) and pick its reading;
   wrong answers are other readings of the same kanji or of look-alike words. About half become
   *listening* cards: hear the word, pick the written word. Each shows the meaning and offers a "say it aloud" step.

**Unlock and scheduling.** FSRS as in Hiragana (same retention, steps, speed ratings; writing is
self-graded). Automatic unlock chain: Meaning, then Recall, then Write, with Word reading unlocking once
Meaning is past its learning steps. Manual mode and "I already know these" placement carry over.
Sets are added by the learner like rows; tier filters (Foundation/Higher) are a convenience on the chart.

**Sound.** One clip per example word (not per bare kanji). New clips are made with `make_voice.py`, the
Foundation sets first.

**Saved progress.** New app, so no migration needed; format `kanji-drill-v1`, same shape as the Hiragana one.

**Tests** (as in the other drills, `node --test tests/*.test.mjs`): the deck is exactly the 200 characters,
no duplicates; every kanji has a meaning, a set and at least one word containing it; every character has
KanjiVG stroke data; every clip named in the deck exists; backups reject other apps' backups.

## Calls made after the builder check (Claude's calls, for Jon to check)

- **Word cards.** Each example word is its own FSRS card, id `<word>|word` (so the existing `id.split('|')` code keeps working), stored beside the kanji cards in the
  same progress object. Reading versus listening is chosen at random each time the card is shown (as listening is
  in Hiragana recall cards) and logged with `v:'listen'`; there are not two cards per word. If a word has no
  voice clip yet, it is only ever shown as a reading card.
- **Unlock and counting.** A kanji's word cards unlock once its Meaning card is past its learning steps. The
  chart, Progress screen and mastery colours count the three kanji cards (meaning, recall, write) only; word
  cards get their own line in Progress ("words") and are included in reviews and "weakest".
- **New cards.** No daily limit, as in Hiragana: the learner adds a set when ready, so sets stay small (about 8)
  to keep the pile manageable.
- **Manual mode.** "Word reading" is one tick box (covers listening). "I already know these" checks a set's Meaning cards, as the Hiragana drill checks a row's read cards; right
  answers put them past their learning steps, so Recall, Write and the set's words unlock from there.
- **Wrong answers for word readings.** Generated by rule from the deck (other words' readings, other readings of
  the same kanji), with optional hand-written overrides per word. No hand-written list for every word.
- **Data first, audio second.** the owners check the drafted meanings, readings and example words before any
  voice clips are made, so no clips are wasted. The spec's vocabulary lists are only used as a source to pick
  words from; the extracted text is not copied into the repo.
- **Release in stages.** The app can ship with Foundation sets (with audio) first and Higher sets once their
  clips exist; Higher sets without clips just have no listening cards.
- **Stroke forms.** After building the stroke data, spot-check the forms against the spec's list in a few
  tricky characters (for example 青, 直-type variants); KanjiVG is otherwise trusted.
- **Source of the kanji list.** Only Appendix 4 was needed and is in the appendix below.

## Left to the builder

The set grouping and names; the confusable-kanji list; which and how many example words per kanji; the
card id scheme; how the home chart lays out sets and tiers; wording of tips and the guide; build order
(deck and data first, then card engine changes, then audio).

## Appendix: the 200 kanji (Pearson Appendix 4, Issue 5, Oct 2022), by strokes

Foundation (76): 一 二七八九十人入 三千万下口才山川子女大小上土 五六円日月火水木牛犬元今手中天分友 四外右左市出生田白本目
百気行字耳自先肉年 何見言私村町男来 金学国 県食 家校高時

Higher (124): 化午公少心切父文 古写冬半母北兄 安会休好西寺州多地同毎有名式 花近社車住図赤体売作弟
雨英画京空事所青知長店東物和使夜泳姉妹 映音海前後思持室春秋神待庭風昼南屋茶 院夏帰紙書真病勉旅料
教強魚黒週雪族都動部理祭終 飲晩間場番朝道買飯 園漢楽新鉄電働話 駅銀語読聞 館 曜
