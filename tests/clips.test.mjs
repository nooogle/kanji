import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {romaji,clipName} from '../tools/clipname.mjs';
import {CLIPS} from '../tools/clips.mjs';
import {WORDS} from '../js/deck.js';

test('readings turn into romaji',()=>{
  const cases={みっつ:'mittsu',さんがつ:'sangatsu',ひとつ:'hitotsu',きょう:'kyou',いっさい:'issai',じゅっさい:'jussai',ちゃ:'cha',がっこう:'gakkou',
    しゃしん:'shashin',にほん:'nihon',いちがつ:'ichigatsu',ちいさな:'chiisana',おとうさん:'otousan',こんしゅう:'konshuu',けさ:'kesa',きゃく:'kyaku',あっち:'atchi'};
  for(const [k,v] of Object.entries(cases))assert.equal(romaji(k),v,k);
});
test('clip names start with w- and use only lower-case letters',()=>{
  assert.equal(clipName('みっつ'),'w-mittsu');
  for(const n of Object.keys(CLIPS))assert.match(n,/^w-[a-z]+$/,n);
});
test('every word has a clip name, and different readings never share one',()=>{
  const seen={};
  for(const w of WORDS){
    const n=clipName(w.r);
    assert.ok(n,w.w);
    if(seen[n])assert.equal(seen[n],w.r,`${n} is used for both ${seen[n]} and ${w.r}`);
    seen[n]=w.r;
  }
  assert.equal(Object.keys(CLIPS).length,new Set(WORDS.map(w=>w.r)).size);
});
test('a word marked as having a clip has the right name and the file exists; no clip file goes unused',()=>{
  for(const w of WORDS){
    if(!w.a)continue;
    assert.equal(w.a,clipName(w.r),w.w);
    assert.ok(existsSync(new URL(`../audio/${w.a}.mp3`,import.meta.url)),`audio/${w.a}.mp3 is missing`);
  }
  const used=new Set(WORDS.filter(w=>w.a).map(w=>w.a+'.mp3'));
  const dir=new URL('../audio/',import.meta.url);
  const files=existsSync(dir)?readdirSync(dir).filter(f=>f.endsWith('.mp3')):[];
  assert.deepEqual(files.filter(f=>!used.has(f)),[],'clips in audio/ that no word uses');
});
