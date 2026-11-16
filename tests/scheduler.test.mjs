import './helpers.mjs';
import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {S,replaceState,fresh} from '../js/storage.js';
import {activeCards,unlockedId,grade,newCard,State,manualTypes} from '../js/scheduler.js';
import {buildPlacement,buildPractice,buildRunThrough,buildReview} from '../js/queues.js';
import {SETS,KANJI,WORDS,entryOf} from '../js/deck.js';

const F1=SETS[0].id,F3='f3';
const review=()=>Object.assign(newCard(),{state:State.Review,stability:5,reps:3});
beforeEach(()=>replaceState(fresh()));

test('with no sets added there is nothing to study',()=>{
  assert.deepEqual(activeCards(),[]);
  assert.deepEqual(buildReview(),[]);
  assert.deepEqual(buildRunThrough(),[]);
});
test('adding the numbers set starts with the Meaning cards only: no Recall, Write or word cards',()=>{
  S.rows=[F1];
  const ids=activeCards();
  assert.ok(ids.includes('三|read'));
  assert.ok(!ids.includes('三|recall'));
  assert.ok(!ids.includes('三|write'));
  assert.ok(!ids.some(id=>id.endsWith('|word')));
  assert.equal(ids.length,10);
});
test('Recall unlocks once Meaning is past its learning steps, then Write once Recall is',()=>{
  S.rows=[F1];
  S.cards['三|read']=review();
  assert.ok(unlockedId('三|recall'));
  assert.ok(!unlockedId('三|write'));
  S.cards['三|recall']=review();
  assert.ok(unlockedId('三|write'));
});
test('a word unlocks when all its kanji are added and their Meaning cards are learned, and not before',()=>{
  S.rows=[F1];
  assert.ok(!unlockedId('三つ|word'));
  S.cards['三|read']=review();
  assert.ok(unlockedId('三つ|word'));
  assert.ok(activeCards().includes('三つ|word'));
  // 三月 needs 月, which is in another set
  assert.ok(!unlockedId('三月|word'));
  S.rows=[F1,F3];
  S.cards['月|read']=review();
  assert.ok(unlockedId('三月|word'));
});
test('a word whose kanji are not all in added sets never appears',()=>{
  S.rows=[F1];
  for(const k of '一二三四五六七八九十')S.cards[k+'|read']=review();
  const words=activeCards().filter(id=>id.endsWith('|word')).map(id=>entryOf(id).item);
  assert.ok(words.length>0);
  for(const w of words)assert.ok(w.k.every(k=>'一二三四五六七八九十'.includes(k)),w.w);
  assert.ok(!words.some(w=>w.w==='三月'));
});
test('a card type that has started stays in even if the card before it slips',()=>{
  S.rows=[F1];
  S.cards['三|recall']=Object.assign(newCard(),{state:State.Learning});
  assert.ok(unlockedId('三|recall'));
});
test('the Writing setting can switch Write cards off',()=>{
  S.rows=[F1];S.settings.write=false;
  S.cards['三|read']=review();S.cards['三|recall']=review();
  assert.ok(!unlockedId('三|write'));
});
test('manual mode: just the ticked types for every kanji in the chosen sets, with Word reading as a type of its own',()=>{
  S.rows=[F1];S.settings.mode='manual';S.settings.types=['word'];
  assert.deepEqual(manualTypes(),['word']);
  const ids=activeCards();
  assert.ok(ids.length>0&&ids.every(id=>id.endsWith('|word')));
  assert.ok(ids.includes('三つ|word'));
  S.settings.types=['read','write'];
  const ids2=activeCards();
  assert.ok(ids2.includes('三|write')&&ids2.includes('三|read')&&!ids2.includes('三|recall'));
  assert.ok(!ids2.some(id=>id.endsWith('|word')));
});
test('a card id from another app is never unlocked',()=>{
  S.rows=[F1];
  assert.equal(unlockedId('あ|read'),false);
  assert.equal(unlockedId('nonsense'),false);
});
test('buildPlacement is the set’s Meaning cards, and nothing else',()=>{
  const ids=buildPlacement(F1);
  assert.deepEqual([...ids].sort(),[...'一二三四五六七八九十'].map(k=>k+'|read').sort());
});
test('after a set passes its placement check, Recall and the set’s words are in play',()=>{
  S.rows=[F1];
  for(const id of buildPlacement(F1))grade(id,true,'placement',1000,false);
  const ids=activeCards();
  for(const k of '一二三四五六七八九十')assert.ok(ids.includes(k+'|recall'),k);
  assert.ok(ids.includes('三つ|word'));
});
test('grade stores the card and logs the answer',()=>{
  S.rows=[F1];
  grade('三|read',true,'review',1000,false);
  assert.ok(S.cards['三|read']);
  const last=S.log[S.log.length-1];
  assert.equal(last.id,'三|read');assert.equal(last.ok,true);
});
test('a word card is graded with speed limits of its own',()=>{
  S.rows=[F1];
  grade('三つ|word',true,'review',1000,false);
  assert.ok(S.cards['三つ|word']);
  assert.equal(S.log[S.log.length-1].id,'三つ|word');
});
test('practice for a set only has cards from that set, and never the same entry twice in a row',()=>{
  S.rows=[F1,F3];
  for(const k of '一二三四五六七八九十日月火水木金土')grade(k+'|read',true,'review',1000,false);
  const ids=buildPractice(F1);
  assert.ok(ids.length>0);
  for(const id of ids)assert.equal(entryOf(id).item.set,F1);
  for(let i=1;i<ids.length;i++)assert.notEqual(ids[i].split('|')[0],ids[i-1].split('|')[0]);
});
test('run through gives one card per started kanji or word',()=>{
  S.rows=[F1];
  grade('三|read',true,'review',1000,false);
  grade('三つ|word',true,'review',1000,false);
  const ids=buildRunThrough();
  assert.equal(ids.length,2);
  assert.ok(ids.includes('三|read')&&ids.includes('三つ|word'));
});
test('a kanji and a word that are the same text are different cards',()=>{
  assert.notEqual(entryOf('山|read').kind,entryOf('山|word').kind);
  assert.ok(WORDS.some(w=>w.w==='山')&&KANJI.some(x=>x.k==='山'));
});
