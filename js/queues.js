// Choosing which cards come up: due reviews, practice on the weakest, and a run through everything.

import {S} from './storage.js';
import {KANJI,WORDS,TYPES,WORD_TYPE,entryOf} from './deck.js';
import {activeCards,cardScore,isManual} from './scheduler.js';

export function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

// The set an id's entry belongs to, and the entry's own key (the kanji or the word)
const setOf=id=>entryOf(id).item.set;
const keyOf=id=>id.split('|')[0];

// Shuffle but never put two cards from the same set (or the same kanji or word) back to back
function spread(ids){
  const pool=shuffle(ids),out=[];
  while(pool.length){
    const last=out.length?out[out.length-1]:null;
    let idx=last?pool.findIndex(id=>setOf(id)!==setOf(last)&&keyOf(id)!==keyOf(last)):0;
    if(idx<0&&last)idx=pool.findIndex(id=>keyOf(id)!==keyOf(last));
    if(idx<0)idx=0;
    out.push(pool.splice(idx,1)[0]);
  }
  return out;
}

/** Cards due now, then a few not started yet; at most 30 per session. */
export function buildReview(){
  const now=Date.now(),due=[],newer=[],intro=[];
  for(const id of activeCards()){
    const c=S.cards[id];
    if(!c)(id.endsWith('|read')?intro:newer).push(id);
    else if(c.due<=now)due.push(id);
  }
  let q=shuffle(due).slice(0,30);
  q=q.concat(shuffle(newer).slice(0,Math.max(0,Math.min(12,30-q.length))));
  q=q.concat(shuffle(intro).slice(0,Math.max(0,Math.min(8,30-q.length))));
  return spread(q);
}

/** The Meaning card of every kanji in a set, for the "I already know these" check when the set is added. */
export function buildPlacement(setId){
  return shuffle(KANJI.filter(x=>x.set===setId).map(x=>x.k+'|read'));
}

/** The weakest started cards (optionally just one set), for extra practice. */
export function buildPractice(setId){
  let ids=activeCards().filter(id=>setId?setOf(id)===setId:!!S.cards[id]);
  const score=id=>{const c=S.cards[id];return cardScore(id)-Math.min(c?c.lapses:0,3)*0.5+Math.random()*1.5;};
  ids=ids.map(id=>[score(id),id]).sort((a,b)=>a[0]-b[0]).slice(0,setId?20:15).map(x=>x[1]);
  return spread(ids);
}

/** One card for every kanji and word already started (in manual mode, every one in the chosen sets), shuffled;
 *  runs as practice so it doesn't disturb the schedule. */
export function buildRunThrough(){
  const ids=[],active=activeCards(),manual=isManual();
  const entries=[...KANJI.map(x=>({key:x.k,types:TYPES})),...WORDS.map(w=>({key:w.w,types:[WORD_TYPE]}))];
  entries.forEach(({key,types})=>{
    const mine=types.map(t=>key+'|'+t).filter(id=>active.includes(id)&&(manual||S.cards[id]));
    if(mine.length)ids.push(mine[Math.floor(Math.random()*mine.length)]);
  });
  return spread(ids);
}
