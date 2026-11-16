import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pickOptions} from '../js/options.js';
import {KANJI,BY,SETS} from '../js/deck.js';

const ALL=SETS.map(s=>s.id);
const seeded=()=>{let n=7;return()=>((n=(n*16807)%2147483647)/2147483647);};

test('four different kanji, including the answer, with no meaning repeated',()=>{
  for(const x of KANJI){
    const o=pickOptions(x,ALL,seeded());
    assert.equal(o.length,4,x.k);
    assert.equal(new Set(o.map(y=>y.k)).size,4,x.k);
    assert.equal(new Set(o.map(y=>y.m)).size,4,`${x.k} has two options with one meaning`);
    assert.ok(o.includes(x),x.k);
  }
});
test('a look-alike is offered when both are in sets already added',()=>{
  const sets=[BY['日'].set,BY['目'].set];
  let seen=false;
  for(let i=0;i<20&&!seen;i++)seen=pickOptions(BY['日'],sets).some(y=>y.k==='目');
  assert.ok(seen,'目 should turn up as a wrong answer for 日');
});
test('wrong answers come from the added sets when there are enough of them',()=>{
  const only=[SETS[0].id,SETS[2].id];
  const allowed=new Set(only);
  for(let i=0;i<20;i++)for(const y of pickOptions(BY['三'],only))assert.ok(allowed.has(y.set),y.k);
});
test('with only one small set added it fills up from the rest of the deck',()=>{
  const o=pickOptions(BY['千'],[BY['千'].set]);
  assert.equal(o.length,4);
  assert.equal(new Set(o.map(y=>y.k)).size,4);
});
test('with no sets added it still gives four options',()=>{
  assert.equal(pickOptions(BY['山'],[]).length,4);
});

// Words that don't tell two meanings apart
const STOP=new Set(['be','to','the','of','a']);
const words=m=>m.toLowerCase().split(/[^a-z]+/).filter(w=>w&&!STOP.has(w));
test('no wrong answer shares a word with the right meaning (店 "shop" is never shown beside 屋 "roof, shop")',()=>{
  for(const x of KANJI){
    for(let i=0;i<5;i++){
      const o=pickOptions(x,ALL,seeded());
      for(const y of o)if(y!==x)assert.ok(!words(y.m).some(w=>words(x.m).includes(w)),`${x.k} "${x.m}" was offered with ${y.k} "${y.m}"`);
    }
  }
});
test('店 and 屋 are never offered together, even when only their set is added',()=>{
  const sets=[BY['店'].set];
  for(let i=0;i<30;i++){
    const ks=pickOptions(BY['店'],sets).map(y=>y.k);
    assert.ok(!ks.includes('屋'));
  }
});
