import {test} from 'node:test';
import assert from 'node:assert/strict';
import {KANJI} from '../js/deck.js';
import {STROKES,strokeCount,strokesSVG,stepSVG} from '../js/strokes.js';

// KanjiVG can draw a kanji with a different form from the deck's stroke count; list any such here (none at present).
const KNOWN_DIFFERENT={};

test('every kanji in the deck has stroke data',()=>{
  const missing=KANJI.map(x=>x.k).filter(ch=>!(STROKES[ch]&&STROKES[ch].s.length>=1&&STROKES[ch].s.length===STROKES[ch].n.length));
  assert.deepEqual(missing,[]);
});
test('stroke data has a stroke count that matches the deck (which follows the GCSE list)',()=>{
  const wrong=KANJI.filter(x=>!KNOWN_DIFFERENT[x.k]&&STROKES[x.k]&&STROKES[x.k].s.length!==x.n).map(x=>`${x.k}: deck ${x.n}, KanjiVG ${STROKES[x.k].s.length}`);
  assert.deepEqual(wrong,[]);
});
test('the longest ones are there: 館 has 16 strokes and 曜 has 18',()=>{
  assert.equal(strokeCount('館'),16);
  assert.equal(strokeCount('曜'),18);
});
test('a kanji is a single picture, with its strokes numbered from 1',()=>{
  const svg=strokesSVG('三');
  assert.equal((svg.match(/<svg/g)||[]).length,1);
  assert.match(svg,/>3<\/text>/);
  assert.equal((stepSVG('三',2,true).match(/class="now"/g)||[]).length,2); // stroke 2 and its number
});
test('a missing character gives no strokes rather than crashing',()=>{
  assert.equal(strokeCount('Q'),0);
});
