// A practice session: showing each card, checking answers, feedback, and the "done" screen.
// The current session is kept in sess (null when no session is running).
// A kanji has three cards (meaning, recall, write). Each example word has one (its reading, or hearing it).

import {S,save} from '../storage.js';
import {BY,WORDS,entryOf} from '../deck.js';
import {grade,newCard} from '../scheduler.js';
import {buildReview} from '../queues.js';
import {canSpeak,speakWord,autoSpeak,whenSoundDone} from '../sound.js';
import {app,spkBtn,toast,DK,esc,PLAY_ICON} from '../ui.js';
import {hintBox} from '../hints.js';
import {pickOptions} from '../options.js';
import {readingOptions,listenOptions,canListen} from '../words.js';
import {setupCanvas} from '../drawing.js';
import {playStrokes,slideIn,morph} from '../strokes.js';
import {showTips} from '../tips.js';

export let sess=null;
export function endSession(){sess=null;}

/** Start a session: mode is 'review', 'practice' or 'placement'; queue is a list of card ids. */
export function startSession(mode,queue){
  if(!queue.length){toast('Nothing to practise yet');return;}
  sess={mode,queue,pos:0,right:0,wrong:0,requeued:new Set(),answered:false};
  renderCard();
}

// Returns a check that's true only while the same card is still on screen (so a delayed sound doesn't play on the next one)
function stillHere(){const s=sess,p=s&&s.pos;return ()=>sess===s&&(!s||s.pos===p);}

function bar(){
  const pct=Math.round(sess.pos/sess.queue.length*100);
  return `<div class="sbar"><button class="link" data-act="home">Stop</button><div class="prog"><i style="width:${pct}%"></i></div><span class="count">${sess.pos}/${sess.queue.length}</span></div>`;
}

/** The readings of a kanji as one line: on-readings (katakana) then kun-readings (hiragana). */
const readingsLine=it=>[it.on.length?'on: '+it.on.join(', '):'',it.kun.length?'kun: '+it.kun.join(', '):''].filter(Boolean).join('   ');
/** A word you can tap to hear: the word, its reading and what it means. */
export const wordBtn=w=>`<button class="pw" data-act="speakword" data-w="${w.w}" aria-label="Play ${w.r}"><span class="kana">${w.w}</span><small>${w.r} · ${esc(w.e)}</small></button>`;
/** Up to three of the example words that use a kanji. */
const wordsWith=k=>WORDS.filter(w=>w.k.includes(k)).slice(0,3);

function renderCard(){
  if(sess.pos>=sess.queue.length)return renderDone();
  const id=sess.queue[sess.pos],e=entryOf(id);
  sess.answered=false;sess.retried=false;sess.t0=performance.now();sess.listen=false;
  if(!e){sess.pos++;renderCard();return;} // a card that isn't in this deck: skip it
  if(e.kind==='word'){renderWordCard(id,e.item);showTips();return;}
  const it=e.item,k=it.k,type=e.type;
  if(type==='read'&&!S.cards[id]&&sess.mode==='review'){
    app.innerHTML=`${bar()}<div class="stage"><p class="ask">New one to learn</p><div class="sq"><span class="big">${k}</span></div>
      <p class="reveal">${esc(it.m)}</p><p class="rd">${readingsLine(it)}</p>
      <div class="pairs">${wordsWith(k).map(wordBtn).join('')}</div>${hintBox(k)}
      <p class="hint">Tap a word to hear it. Try writing the kanji too, in your course. You'll be tested on this in a moment.</p>
      <button class="primary" data-act="introok">Got it</button></div>`;
    return;
  }
  if(type==='read'){
    const opts=pickOptions(it,S.rows);
    app.innerHTML=`${bar()}<div class="stage"><p class="ask">What does this mean?</p><div class="sq"><span class="big">${k}</span></div>
      <div class="opts">${opts.map(o=>`<button class="opt" data-act="answer" data-k="${o.k}">${esc(o.m)}</button>`).join('')}</div>${DK}<div class="fb" id="fb"></div></div>`;
  }else if(type==='recall'){
    const opts=pickOptions(it,S.rows);
    app.innerHTML=`${bar()}<div class="stage"><p class="ask">Which kanji is this?</p><div class="sq"><span class="roma">${esc(it.m)}</span></div>
      <div class="opts">${opts.map(o=>`<button class="opt ko" data-act="answer" data-k="${o.k}">${o.k}</button>`).join('')}</div>${DK}<div class="fb" id="fb"></div></div>`;
  }else{
    const w=wordsWith(k)[0];
    app.innerHTML=`${bar()}<div class="stage"><p class="ask">Write this one</p><p class="romaline">${esc(it.m)}</p>${w?`<p class="rd">as in ${w.r}</p>`:''}
      <div class="pside" id="pside"><div class="wsq"><span class="model" id="model">${k}</span><canvas id="cv" aria-label="Drawing area"></canvas></div></div>
      <div class="btns2" id="wbtns"><button class="secondary" data-act="clear">Clear</button><button class="primary" data-act="check">Check</button></div>
      <button class="dk" data-act="wdk">Don't know</button></div>`;
    setupCanvas(document.getElementById('cv'));
  }
  showTips();
}

// ----- Word cards -----
// Words are 1 to 5 characters, so the big word is sized to fit the square
const wordSize=w=>[...w.w].length>3?' long':' three';
// One card per example word. It's either a reading card (see the word, pick how it's read) or, if the word has a voice
// clip, sometimes a listening card (hear it, pick the written word). The right answer's button has the word as data-k and
// the wrong ones '~1', '~2'... so grading works as it does for kanji.
function renderWordCard(id,w){
  const optBtns=(opts,ko)=>`<div class="opts">${opts.map((o,i)=>`<button class="opt${ko?' ko':''}${[...o.text].length>3?' long':''}" data-act="answer" data-k="${o.ok?w.w:'~'+i}">${esc(o.text)}</button>`).join('')}</div>`;
  if(!S.cards[id]&&sess.mode==='review'){
    app.innerHTML=`${bar()}<div class="stage"><p class="ask">New word</p><div class="sq"><span class="big${wordSize(w)}">${w.w}</span></div>
      <p class="reveal">${w.r}</p><p class="rd">${esc(w.e)}</p>${spkBtn(w)}
      <p class="hint">Say it aloud. You'll be tested on this in a moment.</p>
      <button class="primary" data-act="introok">Got it</button></div>`;
    if(S.settings.sound&&canListen(w))autoSpeak(w,stillHere());
    return;
  }
  sess.listen=canSpeak&&canListen(w)&&!sess.noSound&&Math.random()<0.5;
  if(sess.listen){
    app.innerHTML=`${bar()}<div class="stage"><p class="ask">Which word did you hear?</p><div class="sq" id="lsq"><button class="play" data-act="speakword" data-w="${w.w}" aria-label="Play the word again">${PLAY_ICON}</button></div>
      ${optBtns(listenOptions(w,S.rows),true)}<button class="link mute" data-act="nosound">Can't use sound right now</button><div class="fb" id="fb"></div></div>`;
    autoSpeak(w,stillHere());
  }else{
    app.innerHTML=`${bar()}<div class="stage"><p class="ask">How is this read?</p><div class="sq"><span class="big${wordSize(w)}">${w.w}</span></div>
      ${optBtns(readingOptions(w,S.rows),false)}${DK}<div class="fb" id="fb"></div></div>`;
  }
}

/** After an answer on a word card: the reading and meaning. Right answers move on after a pause; wrong ones stay,
 *  with a prompt to say the word aloud (nothing is recorded or marked). */
function wordFeedback(w,ok,dk){
  const m=document.querySelector('.mute');if(m)m.remove();
  if(sess.listen){const sq=document.getElementById('lsq');if(sq)sq.innerHTML=`<span class="roma kana">${w.w}</span>`;}
  const line=`<span class="kana">${w.w}</span> is <b>${w.r}</b>: ${esc(w.e)}.`;
  if(ok){
    document.getElementById('fb').innerHTML=`<p>${line}</p>`;
    if(S.settings.sound&&!sess.listen&&canListen(w))speakWord(w);
    const pos=sess.pos;
    Promise.all([new Promise(r=>setTimeout(r,1500)),whenSoundDone()]).then(()=>{if(sess&&sess.pos===pos&&sess.answered)next();});
    return;
  }
  const again=sess.mode==='placement'?'It will come up in your reviews.':'You\'ll see it again in a moment.';
  document.getElementById('fb').innerHTML=`<p>${line} ${dk?again:''}</p>${spkBtn(w)}<p class="rd">Say it aloud: ${w.r}</p>
    <button class="primary" data-act="next" style="margin-top:14px">Next</button>`;
  {const nx=document.querySelector('#fb [data-act="next"]');if(nx&&nx.scrollIntoView)nx.scrollIntoView({block:'nearest',behavior:'smooth'});}
}

// Grade the answer, and bring a missed card back a few cards later in the same session
function record(id,ok){
  grade(id,ok,sess.mode,performance.now()-sess.t0,sess.listen);
  ok?sess.right++:sess.wrong++;
  if(!ok&&sess.mode!=='placement'&&!sess.requeued.has(id)){
    sess.requeued.add(id);
    sess.queue.splice(Math.min(sess.queue.length,sess.pos+4),0,id);
  }
}

/** A multiple-choice answer: chosen is the kanji tapped (or, on a word card, the right word or '~'), or '?' for "Don't know". */
export function answer(chosen){
  if(sess.answered)return;sess.answered=true;
  const id=sess.queue[sess.pos],e=entryOf(id),k=id.split('|')[0],ok=chosen===k,dk=chosen==='?';
  document.querySelectorAll('.opt').forEach(b=>{b.disabled=true;if(b.dataset.k===k)b.classList.add('right');else if(b.dataset.k===chosen)b.classList.add('wrong');});
  {const d=document.querySelector('.dk');if(d)d.remove();}
  record(id,ok);
  if(dk){S.log[S.log.length-1].dk=true;save();}
  else if(!ok&&BY[chosen]){S.log[S.log.length-1].c=chosen;save();} // remember what was picked, to spot mix-ups
  if(sess.listen){S.log[S.log.length-1].v='listen';save();}
  if(e.kind==='word'){wordFeedback(e.item,ok,dk);showTips();return;}
  if(ok){ // move on after a short pause, but never before the sound has finished
    const pos=sess.pos;
    Promise.all([new Promise(r=>setTimeout(r,900)),whenSoundDone()]).then(()=>{if(sess&&sess.pos===pos&&sess.answered)next();});
    showTips();
    return;}
  const again=sess.mode==='placement'?'It will come up in your reviews.':'You\'ll see it again in a moment.';
  const it=e.item,c=BY[chosen];
  document.getElementById('fb').innerHTML=`<p><span class="kana">${k}</span> means <b>${esc(it.m)}</b>. ${dk?again:`<span class="kana">${c.k}</span> means <b>${esc(c.m)}</b>.`}</p>
    <p class="rd">${readingsLine(it)}</p><div class="pairs">${wordsWith(k).map(wordBtn).join('')}</div>${hintBox(k,!dk)}${dk?'':hintBox(chosen,true)}<button class="primary" data-act="next" style="margin-top:14px">Next</button>`;
  {const nx=document.querySelector('#fb [data-act="next"]');if(nx&&nx.scrollIntoView)nx.scrollIntoView({block:'nearest',behavior:'smooth'});}
  showTips();
}

export function next(){if(!sess)return;sess.pos++;renderCard();}

/** "Got it" on a new kanji's intro card: it's now in play and will be tested a few cards later. */
export function introOk(){
  const id=sess.queue[sess.pos];
  S.cards[id]=newCard();save();
  sess.queue.splice(Math.min(sess.queue.length,sess.pos+4),0,id);
  next();
}

/** "Can't use sound right now": turn listening cards off for the rest of this session. */
export function noSound(){sess.noSound=true;renderCard();toast('Sound off for this session');}

// ----- Writing cards -----
export function clearDrawing(){
  const cv=document.getElementById('cv');if(cv&&cv.clear)cv.clear();
}

/** "Check" on a writing card: show the answer, then ask for a self-mark. */
export function checkWriting(){
  if(document.getElementById('cv').blank()){dontKnowWriting();return;} // nothing drawn: same as "Don't know"
  showStrokes();
  document.getElementById('wbtns').innerHTML=`<button class="secondary" data-act="self" data-ok="0">Not quite</button><button class="primary" data-act="self" data-ok="1">Got it</button>`;
  showTips();
}

/** "Don't know" on a writing card: show the answer and mark it as a miss, with no self-mark to make. */
export function dontKnowWriting(){showStrokes(true);selfGrade(false,true);}

/** Show the right kanji's strokes, one at a time in order, in a small box beside the drawing (which is left as it is). Tapping the small box plays them again. */
function showStrokes(blank){
  const cv=document.getElementById('cv');cv.dataset.locked='1';
  const k=sess.queue[sess.pos].split('|')[0];
  if(blank)document.getElementById('pside').classList.add('solo'); // nothing was drawn: show the answer on its own, with no empty pad beside it
  {const d=document.querySelector('.dk');if(d)d.remove();}
  slideIn(document.getElementById('pside'),`<span class="pmodel"><button class="trace" id="trace" data-act="strokes" aria-label="Correct answer: ${k}. Tap to see the stroke order again"></button></span>`,()=>{
    const m=document.getElementById('model');
    if(replayStrokes())return;
    if(blank)document.getElementById('trace').parentNode.innerHTML=`<span class="model show" style="opacity:1">${k}</span>`; // no stroke data: show the plain kanji instead
    else if(m)m.classList.add('show');
  });
}

/** Play the stroke order animation in the small answer box. Returns false if there's no stroke data for this kanji. */
export function replayStrokes(){
  const box=document.getElementById('trace');
  return !!(box&&sess&&playStrokes(box,sess.queue[sess.pos].split('|')[0],!box.dataset.plain)); // data-plain: no numbers
}

/** The self-mark on a writing card. "Got it" moves straight on. "Not quite" clears the box and the answer so they can
 *  have another go (with the hint showing). Only the first go counts towards the schedule; later goes are just practice.
 *  "Don't know" (dk) keeps the answer on screen, with Try again and Next. */
export function selfGrade(ok,dk){
  if(sess.answered)return;sess.answered=true;
  const k=sess.queue[sess.pos].split('|')[0];
  if(!sess.retried){
    record(sess.queue[sess.pos],ok);
    if(dk){S.log[S.log.length-1].dk=true;save();}
  }
  if(ok){next();return;}
  if(dk){
    showHint(k);
    document.getElementById('wbtns').innerHTML=`<button class="secondary" data-act="retry">Try again</button><button class="primary" data-act="next">Next</button>`;
  }else retryWriting();
  showTips();
}

// The hint, just above the buttons (replacing any already there)
function showHint(k){
  const old=document.getElementById('rhint');if(old)old.remove();
  document.getElementById('wbtns').insertAdjacentHTML('beforebegin',`<div id="rhint">${hintBox(k)}</div>`);
}

/** Another go at the same kanji: clear their writing and the answer, keep the hint, and Check again. Doesn't change the schedule. */
export function retryWriting(){
  if(!sess)return;
  const k=sess.queue[sess.pos].split('|')[0],cv=document.getElementById('cv');
  sess.retried=true;sess.answered=false;
  morph(()=>{
    cv.clear();delete cv.dataset.locked;
    document.getElementById('pside').classList.remove('solo');
    const m=document.querySelector('#pside .pmodel');if(m)m.remove();
    const md=document.getElementById('model');if(md)md.classList.remove('show');
    showHint(k);
    document.getElementById('wbtns').innerHTML=`<button class="secondary" data-act="clear">Clear</button><button class="primary" data-act="check">Check</button>`;
  });
}

function renderDone(){
  const total=sess.right+sess.wrong;
  let title='Session done',sub=`${sess.right} right out of ${total}.`;
  if(sess.mode==='placement'){title='Check done';sub=`You knew ${sess.right} of ${total}. Any you missed will come up in your reviews until they stick.`;}
  else if(sess.wrong)sub+=' The ones you missed will come back soon.';
  const more=buildReview().length;
  app.innerHTML=`<header class="top"><h1>Kanji drill</h1></header><section class="hero"><p class="lead">${title}</p><p class="sub">${sub}</p>
    ${more?`<button class="primary" data-act="review">Review ${more} more</button>`:''}
    <button class="${more?'secondary':'primary'}" data-act="practice">Keep practising</button>
    <button class="secondary" data-act="home">Back to chart</button></section>`;
  sess=null;
}
