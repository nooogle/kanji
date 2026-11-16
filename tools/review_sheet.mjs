// Prints the whole deck as a plain table for checking: one line per kanji with its meaning, readings and words.
// Run from the top of the repo:  node tools/review_sheet.mjs   (add  > review.txt  to save it)
import {SETS,KANJI,WORDS} from '../js/deck.js';

for(const s of SETS){
  console.log(`\n== ${s.name} (${s.tier}) ==`);
  for(const k of [...s.k]){
    const x=KANJI.find(y=>y.k===k);
    const words=WORDS.filter(w=>w.k.includes(k)).map(w=>`${w.w} ${w.r} "${w.e}"`).join(' / ');
    console.log(`${k}  ${x.m}  [on ${x.on.join(',')||'-'}  kun ${x.kun.join(',')||'-'}]  ${x.n} strokes  ${words}`);
  }
}
console.log(`\n${KANJI.length} kanji, ${WORDS.length} words`);
