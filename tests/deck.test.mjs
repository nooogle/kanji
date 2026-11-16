import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SETS,SETMAP,KANJI,BY,WORDS,WORD_BY,TYPES,WORD_TYPE,entryOf,CONFMAP,wordsOf,unknownCards,mixKey,mixParts} from '../js/deck.js';

// The 76 Foundation kanji of Pearson Edexcel GCSE (9-1) Japanese, Appendix 4 (Issue 5, October 2022)
const FOUNDATION=[...'一二七八九十人入三千万下口才山川子女大小上土五六円日月火水木牛犬元今手中天分友四外右左市出生田白本目百気行字耳自先肉年何見言私村町男来金学国県食家校高時'];

// The 124 Higher kanji, same source
const HIGHER=[...'化午公少心切父文古写冬半母北兄安会休好西寺州多地同毎有名式花近社車住図赤体売作弟雨英画京空事所青知長店東物和使夜泳姉妹映音海前後思持室春秋神待庭風昼南屋茶院夏帰紙書真病勉旅料教強魚黒週雪族都動部理祭終飲晩間場番朝道買飯園漢楽新鉄電働話駅銀語読聞館曜'];

test('the Higher sets hold exactly the 124 Higher kanji, and the deck is all 200',()=>{
  const got=KANJI.filter(x=>x.tier==='higher').map(x=>x.k);
  assert.equal(got.length,124);
  assert.deepEqual([...got].sort(),[...HIGHER].sort());
  assert.equal(KANJI.length,200);
  assert.equal(new Set(KANJI.map(x=>x.k)).size,200);
});
test('Foundation sets come before Higher sets',()=>{
  const tiers=SETS.map(s=>s.tier),firstHigher=tiers.indexOf('higher');
  assert.ok(firstHigher>0);
  assert.ok(tiers.slice(firstHigher).every(t=>t==='higher'));
});
test('the Foundation sets hold exactly the 76 Foundation kanji, each once',()=>{
  const got=KANJI.filter(x=>x.tier==='foundation').map(x=>x.k);
  assert.equal(got.length,76);
  assert.deepEqual([...got].sort(),[...FOUNDATION].sort());
  assert.equal(new Set(got).size,76);
});
test('every kanji is in exactly one set, in the set it says it is in, and sets are small',()=>{
  const seen=new Set();
  for(const s of SETS){
    assert.ok([...s.k].length<=12,`${s.id} has ${[...s.k].length}`);
    for(const k of s.k){assert.ok(!seen.has(k),`${k} in two sets`);seen.add(k);assert.equal(BY[k].set,s.id);assert.equal(BY[k].tier,s.tier);}
  }
  assert.equal(seen.size,KANJI.length);
  assert.equal(SETMAP[SETS[0].id],SETS[0]);
});
test('meanings are unique across the deck, ignoring case, so two kanji are never offered with the same meaning',()=>{
  const seen=new Map();
  for(const x of KANJI){const m=x.m.toLowerCase();assert.ok(!seen.has(m),`${x.k} and ${seen.get(m)} both mean "${x.m}"`);seen.set(m,x.k);}
});
test('every kanji has a meaning, at least one reading, a stroke count and a position in its set',()=>{
  for(const x of KANJI){
    assert.ok(x.m&&x.m.length,x.k);
    assert.ok(x.on.length+x.kun.length>0,`${x.k} has no readings`);
    assert.ok(Number.isInteger(x.n)&&x.n>=1&&x.n<=18,`${x.k} strokes`);
    assert.equal([...SETMAP[x.set].k][x.i],x.k);
  }
});
test('the first set is the numbers one to ten, and the next one starts with 百千万円',()=>{
  assert.equal(SETS[0].k,'一二三四五六七八九十');
  for(const k of '百千万円')assert.equal(BY[k].set,SETS[1].id);
});
test('every word is made only of kana and kanji from the deck, and has at least one kanji',()=>{
  for(const w of WORDS){
    assert.ok(w.k.length>0,w.w);
    for(const c of w.w){if(c>='一'&&c<='鿿')assert.ok(BY[c],`${w.w} uses ${c}, which is not in the deck`);}
    assert.deepEqual(w.k,[...new Set([...w.w].filter(c=>BY[c]))],w.w);
    assert.ok(w.r&&w.e,w.w);
    assert.ok(SETMAP[w.set],w.w);
  }
  assert.equal(new Set(WORDS.map(w=>w.w)).size,WORDS.length,'duplicate words');
});
test('a word belongs to the latest set (in learning order) among its kanji',()=>{
  const order=Object.fromEntries(SETS.map((s,i)=>[s.id,i]));
  for(const w of WORDS)assert.equal(order[w.set],Math.max(...w.k.map(k=>order[BY[k].set])),w.w);
});
test('every kanji in the deck appears in at least one word',()=>{
  for(const x of KANJI)assert.ok(WORDS.some(w=>w.k.includes(x.k)),`${x.k} has no word`);
});
test('wordsOf gives only words whose kanji are all in the given sets',()=>{
  const first=wordsOf([SETS[0].id]).map(w=>w.w);
  assert.ok(first.includes('三つ'));
  assert.ok(!first.includes('三月'));
  assert.ok(wordsOf(SETS.map(s=>s.id)).length===WORDS.length);
  assert.deepEqual(wordsOf([]),[]);
});
test('word readings are unique per word text and never contain kanji',()=>{
  for(const w of WORDS)assert.ok(![...w.r].some(c=>c>='一'&&c<='鿿'),`${w.w} reading ${w.r}`);
});
test('card ids find their entry',()=>{
  assert.deepEqual(TYPES,['read','recall','write']);
  assert.equal(WORD_TYPE,'word');
  assert.equal(entryOf('三|read').kind,'kanji');
  assert.equal(entryOf('三|read').item,BY['三']);
  assert.equal(entryOf('三|write').type,'write');
  assert.equal(entryOf('三つ|word').kind,'word');
  assert.equal(entryOf('三つ|word').item,WORD_BY['三つ']);
  assert.equal(entryOf('x|read'),null);
  assert.equal(entryOf('あ|read'),null);
});
test('look-alikes are linked',()=>{
  for(const [a,b] of [['休','体'],['語','話'],['持','待'],['買','売'],['日','目'],['大','犬'],['人','入'],['土','上'],['白','百']])
    assert.ok(CONFMAP[a]&&CONFMAP[a].has(b)&&CONFMAP[b].has(a),`${a} should look like ${b}`);
});
test('mixKey is the same whichever way round and only for real kanji',()=>{
  assert.equal(mixKey('日','目'),mixKey('目','日'));
  assert.deepEqual(mixParts(mixKey('日','目')).sort(),['日','目'].sort());
  assert.equal(mixKey('日','~'),null);
});
test('unknownCards finds cards from other apps',()=>{
  assert.deepEqual(unknownCards({cards:{'三|read':{},'あ|read':{},'三つ|word':{}}}),['あ|read']);
  assert.deepEqual(unknownCards({}),[]);
});
