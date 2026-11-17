// The four answers on a word card: for a reading card, readings in kana; for a listening card, written words.
// Pure code (no screen or storage), so it can be tested.

import {WORDS,wordsOf,BY} from './deck.js';

const hira=t=>t.replace(/[\u30a1-\u30f6]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
/** Every reading a kanji can have, in hiragana (on readings converted, okurigana with and without its tail). */
function readingsOf(k){
  const e=BY[k],out=new Set();
  for(const r of e.on)out.add(hira(r));
  for(const r of e.kun){out.add(r.replace(/[()]/g,''));out.add(r.replace(/\(.*\)/,''));}
  return out;
}

function shuffled(a,rand){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/** Three wrong words for this one: all with a different reading from it and from each other. Words that share a kanji
 *  with it come first (they're the ones easiest to mix up), then other words from the sets added, then any word. */
function wrongWords(word,setIds,rand){
  const here=new Set(wordsOf(setIds));
  const tiers=[
    WORDS.filter(x=>here.has(x)&&x.k.some(k=>word.k.includes(k))),
    WORDS.filter(x=>here.has(x)),
    WORDS,
  ];
  const out=[],reads=new Set([word.r]);
  // a wrong answer must not be a perfectly good reading of one of this word's kanji (し for 四)
  for(const k of word.k)for(const r of readingsOf(k))reads.add(r);
  for(const tier of tiers){
    // within a tier, random order, but words of a similar length first
    const order=shuffled(tier,rand).sort((a,b)=>Math.min(2,Math.abs(a.r.length-word.r.length))-Math.min(2,Math.abs(b.r.length-word.r.length)));
    for(const x of order){
      if(out.length===3)return out;
      if(x===word||reads.has(x.r))continue;
      reads.add(x.r);out.push(x);
    }
  }
  return out;
}

/** Reading card: the word's reading and three wrong ones, in random order, as [{text, ok}]. */
export function readingOptions(word,setIds,rand=Math.random){
  const all=[{text:word.r,ok:true},...wrongWords(word,setIds,rand).map(x=>({text:x.r,ok:false}))];
  return shuffled(all,rand);
}

/** Listening card: the written word and three wrong ones, none sounding the same, as [{text, ok}]. */
export function listenOptions(word,setIds,rand=Math.random){
  const all=[{text:word.w,ok:true},...wrongWords(word,setIds,rand).map(x=>({text:x.w,ok:false}))];
  return shuffled(all,rand);
}

/** Whether a word can be asked as a listening card: only once its voice clip has been made. */
export const canListen=word=>!!word.a;
