// The four answers on a kanji card: the right kanji plus three wrong ones. Pure code (no screen or storage), so it can be tested.

import {KANJI,CONFMAP} from './deck.js';

function shuffled(a,rand){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

// The words in a meaning, without little words: "roof, shop" has roof and shop
const STOP=new Set(['be','to','the','of','a']);
const meaningWords=m=>m.toLowerCase().split(/[^a-z]+/).filter(w=>w&&!STOP.has(w));

/** The right answer plus three wrong ones, in random order. Wrong ones prefer look-alikes (up to two) from the sets
 *  already added, then anything from those sets, then anything in the deck. No wrong answer shares a word with the
 *  right meaning ("shop" and "roof, shop" would be unfair), so a fair answer is never marked wrong.
 *  it: the kanji entry; setIds: ids of the sets added; rand: a 0-1 random number function (the tests choose one). */
export function pickOptions(it,setIds,rand=Math.random){
  const on=new Set(setIds);
  const mine=meaningWords(it.m);
  const ok=x=>x.k!==it.k&&x.m!==it.m&&!meaningWords(x.m).some(w=>mine.includes(w));
  const pool=KANJI.filter(x=>on.has(x.set)&&ok(x));
  const conf=shuffled(pool.filter(x=>CONFMAP[it.k]&&CONFMAP[it.k].has(x.k)),rand).slice(0,2);
  let chosen=conf.concat(shuffled(pool.filter(x=>!conf.includes(x)),rand));
  if(chosen.length<3)chosen=chosen.concat(shuffled(KANJI.filter(x=>ok(x)&&!chosen.includes(x)),rand));
  return shuffled([it,...chosen.slice(0,3)],rand);
}
