// The deck: the kanji (grouped in sets, in learning order), the example words, and which kanji look alike.
// Pure data and lookups, with no screen or storage code, so any other module (and the tests) can import it.
// The data itself is in kanjidata.js (that's the file to check and correct).

import {SETS_DATA,KANJI_DATA,WORDS_DATA} from './kanjidata.js';

/** Sets in learning order: {id, name, tier ('foundation' or 'higher'), k (the set's kanji as one string)}. */
export const SETS=SETS_DATA;
export const SETMAP=Object.fromEntries(SETS.map(s=>[s.id,s]));

/** One entry per kanji: k the kanji, m meaning, on/kun readings, n strokes, tier, set (id) and i (position in its set). */
export const KANJI=[];
SETS.forEach(s=>[...s.k].forEach((k,i)=>{
  const d=KANJI_DATA[k];
  KANJI.push({k,m:d.m,on:d.on,kun:d.kun,n:d.n,tier:s.tier,set:s.id,i});
}));
export const BY=Object.fromEntries(KANJI.map(x=>[x.k,x]));

// Cards: each kanji has three (see it and pick its meaning, pick it from its meaning, write it), and each example
// word has one (its reading, or hearing it). Card ids are "<key>|<type>": "三|read", "三つ|word".
export const TYPES=['read','recall','write'];
export const WORD_TYPE='word';

/** One entry per example word: w written, r reading in kana, e English, k the kanji in it, set (the latest of its
 *  kanji's sets, which is when it becomes available) and a (voice clip name, null until the clip exists). */
const ORDER=Object.fromEntries(SETS.map((s,i)=>[s.id,i]));
export const WORDS=WORDS_DATA.map(([w,r,e,a])=>{
  const k=[...new Set([...w].filter(c=>BY[c]))];
  const set=k.map(c=>BY[c].set).reduce((a,b)=>ORDER[b]>ORDER[a]?b:a,BY[k[0]].set);
  return {w,r,e,k,set,a:a||null};
});
export const WORD_BY=Object.fromEntries(WORDS.map(x=>[x.w,x]));

/** The entry a card id belongs to: {kind:'kanji'|'word', item, type}, or null if it isn't in this deck. */
export function entryOf(id){
  const [key,type]=String(id).split('|');
  if(type===WORD_TYPE)return WORD_BY[key]?{kind:'word',item:WORD_BY[key],type}:null;
  return BY[key]&&TYPES.includes(type)?{kind:'kanji',item:BY[key],type}:null;
}

/** Words whose kanji are all in the given sets (set ids). */
export function wordsOf(setIds){
  const on=new Set(setIds);
  return WORDS.filter(w=>w.k.every(c=>on.has(BY[c].set)));
}

// Kanji that are easily confused with each other, used to pick convincing wrong answers
const CONF=['日目見','大犬','人入','土上','白百','午牛','木本休体','持待時寺','語話読言','子字学','町村','左右有','小少','雨雪電','道週近',
  '飲飯','買売','四西','兄弟姉妹','和私','川州','古右','切七'];
export const CONFMAP={};
const link=(a,b)=>{if(a===b)return;(CONFMAP[a]=CONFMAP[a]||new Set()).add(b);(CONFMAP[b]=CONFMAP[b]||new Set()).add(a);};
CONF.forEach(g=>{const c=[...g].filter(x=>BY[x]);c.forEach(a=>c.forEach(b=>link(a,b)));});

// Two kanji the learner mixed up, as one key (the same whichever way round), and back again.
// null unless both are real kanji (on a word card the other answer is '~', which isn't one).
export const mixKey=(a,b)=>BY[a]&&BY[b]?[a,b].sort().join('|'):null;
export const mixParts=key=>key.split('|');

/** Card ids in a saved progress object that aren't in this deck, such as another drill's backup. */
export const unknownCards=state=>Object.keys((state&&state.cards)||{}).filter(id=>!entryOf(id));
