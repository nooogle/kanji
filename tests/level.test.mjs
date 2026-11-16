// level() lives in ui.js, which draws into the page, so give it a pretend page first.
import './helpers.mjs';
globalThis.document={getElementById:()=>null,addEventListener:()=>{}};
globalThis.window={};
globalThis.Audio=class{};
import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
const storage=await import('../js/storage.js'); // S is replaced when progress is reset, so always read it as storage.S
const {replaceState,fresh}=storage;
const {level}=await import('../js/ui.js');
const {State,newCard}=await import('../js/scheduler.js');
const {BY}=await import('../js/deck.js');

const solid=()=>Object.assign(newCard(),{state:State.Review,stability:30,reps:6});
beforeEach(()=>replaceState(fresh()));

test('a kanji not in an added set is not on the chart',()=>{assert.equal(level(BY['三']),-1);});
test('automatic mode: three solid cards make a solid kanji',()=>{
  storage.S.rows=[BY['三'].set];
  for(const t of ['read','recall','write'])storage.S.cards['三|'+t]=solid();
  assert.equal(level(BY['三']),4);
});
test('manual mode with every type ticked: word reading is not counted, so solid kanji cards still show as solid',()=>{
  storage.S.rows=[BY['三'].set];storage.S.settings.mode='manual';storage.S.settings.types=['read','recall','write','word'];
  for(const t of ['read','recall','write'])storage.S.cards['三|'+t]=solid();
  assert.equal(level(BY['三']),4);
});
test('manual mode with only Word reading ticked: the colour falls back to the kanji’s own cards instead of staying at Learning',()=>{
  storage.S.rows=[BY['三'].set];storage.S.settings.mode='manual';storage.S.settings.types=['word'];
  for(const t of ['read','recall','write'])storage.S.cards['三|'+t]=solid();
  assert.equal(level(BY['三']),4);
});
