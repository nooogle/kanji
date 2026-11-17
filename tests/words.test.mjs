import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readingOptions,listenOptions,canListen} from '../js/words.js';
import {WORDS,WORD_BY,SETS,BY} from '../js/deck.js';

const ALL=SETS.map(s=>s.id);
const seeded=()=>{let n=11;return()=>((n=(n*16807)%2147483647)/2147483647);};

test('reading options: four different readings, exactly one right, and it is the word’s own',()=>{
  for(const w of WORDS){
    const o=readingOptions(w,ALL,seeded());
    assert.equal(o.length,4,w.w);
    assert.equal(new Set(o.map(x=>x.text)).size,4,`${w.w} has a repeated reading`);
    assert.equal(o.filter(x=>x.ok).length,1,w.w);
    assert.equal(o.find(x=>x.ok).text,w.r,w.w);
  }
});
test('no wrong reading is the same as the right one',()=>{
  for(const w of WORDS)for(const x of readingOptions(w,ALL,seeded()))if(!x.ok)assert.notEqual(x.text,w.r,w.w);
});
test('with only one set added, the options fill up from the rest of the deck',()=>{
  const w=WORD_BY['三つ'];
  const o=readingOptions(w,[BY['三'].set]);
  assert.equal(o.length,4);
  assert.equal(new Set(o.map(x=>x.text)).size,4);
});
test('with no sets added there are still four options',()=>{
  assert.equal(readingOptions(WORD_BY['山'],[]).length,4);
  assert.equal(listenOptions(WORD_BY['山'],[]).length,4);
});
test('wrong readings prefer words that share a kanji with this word',()=>{
  const w=WORD_BY['三月'];
  let shared=false;
  for(let i=0;i<30&&!shared;i++){
    const wrong=readingOptions(w,ALL).filter(x=>!x.ok).map(x=>x.text);
    shared=WORDS.some(y=>y!==w&&y.k.some(k=>w.k.includes(k))&&wrong.includes(y.r));
  }
  assert.ok(shared);
});
test('listening options: four different written words, one right, and none sounds the same as another',()=>{
  for(const w of WORDS){
    const o=listenOptions(w,ALL,seeded());
    assert.equal(o.length,4,w.w);
    assert.equal(new Set(o.map(x=>x.text)).size,4,w.w);
    assert.equal(o.filter(x=>x.ok).length,1,w.w);
    assert.equal(o.find(x=>x.ok).text,w.w,w.w);
    const reads=o.map(x=>WORD_BY[x.text].r);
    assert.equal(new Set(reads).size,4,`${w.w} has two options that sound the same`);
  }
});
test('canListen is false for a word with no voice clip yet',()=>{
  assert.equal(canListen({w:'山',r:'やま',a:null}),false);
  assert.equal(canListen({w:'山',r:'やま',a:'w-yama'}),true);
});

test('a wrong reading is never a valid reading of one of the word’s kanji (し for 四)',()=>{
  const four=WORDS.find(w=>w.w==='四');
  for(let i=0;i<200;i++){
    const bad=readingOptions(four,SETS.map(s=>s.id)).filter(o=>!o.ok).map(o=>o.text);
    assert.ok(!bad.includes('し')&&!bad.includes('よ'),bad.join());
  }
});
