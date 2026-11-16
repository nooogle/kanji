// The home screen: what's ready to review, and the chart of kanji sets coloured by how well each kanji is known.

import {S} from '../storage.js';
import {SETS,KANJI,BY} from '../deck.js';
import {buildReview} from '../queues.js';
import {isManual,manualTypes} from '../scheduler.js';
import {app,level,nextDueText,paceText} from '../ui.js';
import {endSession} from './session.js';

// The chart's sections, in order: the two GCSE tiers
const SECTIONS=[['foundation','Foundation'],['higher','Higher']];

function setHTML(set){
  const on=S.rows.includes(set.id);
  const lvlVar=['--l0','--l1','--l2','--l3','--l4'];
  const cells=[...set.k].map(k=>{const l=level(BY[k]);return `<span class="cell" ${l>=0?`style="background:var(${lvlVar[l]})"`:''}>${k}</span>`;}).join('');
  return `<div class="setname">${set.name}</div><button class="row ${on?'on':'off'}" data-act="set" data-set="${set.id}" aria-label="${on?'Options for':'Add'} ${set.name}"><span class="cells">${cells}</span><span class="tag">${on?'':'Add'}</span></button>`;
}

export function renderHome(){
  endSession();
  const n=buildReview().length;
  const seen=Object.keys(S.cards).length>0&&S.rows.length>0;
  const run=seen||isManual()?'<button class="secondary" data-act="runall">Run through everything</button>':''; // manual mode can run through cards not started yet
  const writing=isManual()?manualTypes().includes('write'):S.settings.write!==false;
  let hero;
  if(!S.rows.length){
    hero=`<p class="lead">Pick the sets you've studied</p><p class="sub">Tap a set in the chart to add it. If you already know a set, you'll get a quick check first so the easy ones don't waste your time.</p>`;
  }else if(n){
    hero=`<p class="lead">${n} ${n===1?'card':'cards'} ready</p><p class="sub">Short and often works best. A few minutes now, a few more later.</p><button class="primary" data-act="review">Start review</button>${seen?'<button class="secondary" data-act="practice">Practise weakest</button>':''}${run}`;
  }else{
    hero=`<p class="lead">All caught up</p><p class="sub">${nextDueText()}</p>${seen?'<button class="primary" data-act="practice">Practise weakest</button>'+run:run.replace('secondary','primary')}`;
  }
  app.innerHTML=`
    <header class="top"><h1>Kanji drill</h1><span class="nav"><button class="link" data-act="report">Progress</button><button class="link" data-act="settings">Settings</button></span></header>
    <section class="hero">${hero}</section>
    <p class="pace">${paceText()}</p>
    <section class="chart">
      ${SECTIONS.map(([tier,title])=>`<h2>${title}</h2>${SETS.filter(x=>x.tier===tier).map(setHTML).join('')}`).join('')}
    </section>
    <div class="legend"><span><i style="background:var(--l1)"></i>Learning</span><span><i style="background:var(--l2)"></i>Shaky</span><span><i style="background:var(--l3)"></i>Good</span><span><i style="background:var(--l4)"></i>${writing?'Solid, can write it':'Solid'}</span></div>
    <p class="howlink"><a href="how-it-works.html">How this works</a></p>`;
}
