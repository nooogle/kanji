// Scheduling with FSRS.
// Each card keeps an FSRS memory state (stability and difficulty) and is next shown when recall is
// predicted to drop to 90%. Wrong or "Don't know" = Again; right answers are Hard, Good or Easy by speed.
// New and missed cards go through short learning steps (1 and 10 minutes) before longer gaps.

import {fsrs,generatorParameters,createEmptyCard,Rating,State} from '../vendor/ts-fsrs-5.4.2.mjs';
import {S,save} from './storage.js';
import {KANJI,WORDS,BY,TYPES,WORD_TYPE,entryOf} from './deck.js';

export {State};

// Gaps are capped at 60 days: multiple choice is easier than recalling from nothing, so very long gaps would be over-confident
const F=fsrs(generatorParameters({request_retention:0.9,maximum_interval:60,enable_fuzz:true}));

// Cards are stored with dates as plain numbers (milliseconds) so they survive being saved as JSON
const toCard=c=>Object.assign({},c,{due:new Date(c.due),last_review:c.last_review?new Date(c.last_review):undefined});
const fromCard=(c,ok)=>Object.assign({},c,{due:c.due.getTime(),last_review:c.last_review?c.last_review.getTime():null,ok});
export function newCard(now=Date.now()){return fromCard(createEmptyCard(new Date(now)),false);}

// Answer-time limits in ms for a right answer: quicker than the first is Easy, slower than the second is Hard
const SPEED={read:[1800,6000],recall:[2200,7000],word:[2500,8000],listen:[3200,8000]};
function rating(type,ok,ms,listen,c){
  if(!ok)return Rating.Again;
  if(type==='write')return Rating.Good; // self-graded, so no speed signal
  const [easy,hard]=SPEED[listen?'listen':type];
  if(ms>hard)return Rating.Hard;
  if(ms<easy&&c&&c.state===State.Review)return Rating.Easy; // only once a card is past its learning steps
  return Rating.Good;
}
function schedule(c,r,now){
  return fromCard(F.next(toCard(c||newCard(now)),new Date(now),r).card,r!==Rating.Again);
}
// "I already know these": a right answer counts as two good reviews, so the card skips its learning steps
function placementGrade(c,ok,now){
  if(!ok)return schedule(c,Rating.Again,now);
  return schedule(schedule(c,Rating.Good,now),Rating.Good,now);
}

/** True when the user has picked which card types to practise, instead of letting them unlock in turn. */
export const isManual=()=>S.settings.mode==='manual';
/** The card types ticked in manual mode (all of them if the setting is missing). Word reading counts as a type. */
export function manualTypes(){const all=[...TYPES,WORD_TYPE],t=S.settings.types;return Array.isArray(t)&&t.length?all.filter(x=>t.includes(x)):all;}

// Automatic: a kanji's Recall card unlocks once its Meaning card is past its learning steps, and Write once Recall is.
// A word card unlocks once every kanji in the word is in an added set and each one's Meaning card is past its learning steps.
// Manual: just the ticked types, for every kanji (and word) in the chosen sets, with nothing to unlock.
// (S.rows holds the ids of the sets the learner has added; the name is kept from the Hiragana drill.)
function strong(id){const c=S.cards[id];return !!c&&c.state===State.Review;}
/** Whether the card with this id (like "三|read" or "三つ|word") is currently in play. */
export function unlockedId(id){
  const e=entryOf(id);if(!e)return false;
  const {kind,item,type}=e;
  if(kind==='kanji'){
    if(!S.rows.includes(item.set))return false;
    if(isManual())return manualTypes().includes(type);
    if(type==='write'&&S.settings.write===false)return false;
    if(type==='read'||S.cards[id])return true; // once a card type has started it stays in
    return strong(item.k+'|'+(type==='recall'?'read':'recall'));
  }
  if(!item.k.every(k=>S.rows.includes(BY[k].set)))return false;
  if(isManual())return manualTypes().includes(WORD_TYPE);
  return !!S.cards[id]||item.k.every(k=>strong(k+'|read'));
}
/** Every card id ("三|read", "三つ|word" and so on) that's currently in play. */
export function activeCards(){
  const ids=[];
  KANJI.forEach(it=>TYPES.forEach(t=>{const id=it.k+'|'+t;if(unlockedId(id))ids.push(id);}));
  WORDS.forEach(w=>{const id=w.w+'|'+WORD_TYPE;if(unlockedId(id))ids.push(id);});
  return ids;
}

// 0 not started, 1 learning, 2-4 by how long it's expected to be remembered
export function cardScore(id){
  const c=S.cards[id];
  if(!c||c.state===State.New)return 0;
  if(c.state!==State.Review)return 1;
  return c.stability<4?2:c.stability<14?3:4;
}

/** Record an answer: update the card's schedule and add it to the answer log. */
export function grade(id,ok,mode,ms,listen){
  const now=Date.now(),type=id.split('|')[1],c=S.cards[id];
  let r=null;
  if(mode==='placement')S.cards[id]=placementGrade(c,ok,now);
  else if(mode==='practice'){if(!ok){r=Rating.Again;S.cards[id]=schedule(c,r,now);}} // extra practice: only misses change the schedule
  else{r=rating(type,ok,ms,listen,c);S.cards[id]=schedule(c,r,now);}
  S.log.push({t:now,id,ok,ms:Math.round(ms),m:mode,r});
  save();
}
