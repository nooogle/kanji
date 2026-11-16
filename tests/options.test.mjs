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
