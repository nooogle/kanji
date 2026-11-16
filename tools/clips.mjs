// Every voice clip the app wants: clip name (audio/<name>.mp3) → the kana to say. One clip per example word,
// named from its reading (see clipname.mjs), so the list never drifts from the deck.
// tools/make_voice.py runs this to get the list:
//   node tools/clips.mjs        prints the whole table as JSON
import {WORDS} from '../js/deck.js';
import {clipName} from './clipname.mjs';

export const CLIPS={};
for(const w of WORDS)CLIPS[clipName(w.r)]=w.r;

if(import.meta.url===`file://${process.argv[1]}`)console.log(JSON.stringify({clips:CLIPS}));
