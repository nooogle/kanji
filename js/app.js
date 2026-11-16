// Start-up and button handling. index.html loads only this file; it imports everything else.
//
// Every button in the app has a data-act="..." attribute. Instead of wiring up each button separately,
// one click handler for the whole page reads that attribute and calls the right function.

import {S,save,fresh,replaceState} from './storage.js';
import {BY,WORD_BY} from './deck.js';
import {backupText,checkBackup} from './backup.js';
import {buildReview,buildPractice,buildPlacement,buildRunThrough} from './queues.js';
import {speakWord} from './sound.js';
import {toast} from './ui.js';
import {closeSheet,setSheet,settingsSheet,feedbackSheet} from './sheets.js';
import {closeTip,resetTips} from './tips.js';
import {needsWelcome,renderWelcome,welcomeNext,finishWelcome,install} from './welcome.js';
import {editHint,setHint} from './hints.js';
import {renderHome} from './screens/home.js';
import {renderReport,reportText,copyText} from './screens/report.js';
import {startSession,answer,next,introOk,noSound,clearDrawing,checkWriting,dontKnowWriting,selfGrade,retryWriting,replayStrokes,practiseWriting,nextStep,showPractised,pWatch,pNext,pDone} from './screens/session.js';
import './keys.js'; // keyboard shortcuts for computers (sets itself up when loaded)

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act,set=b.dataset.set;
  switch(a){
    // Starting sessions
    case 'review':closeSheet();startSession('review',buildReview());break;
    case 'practice':closeSheet();startSession('practice',buildPractice());break;
    case 'runall':closeSheet();startSession('practice',buildRunThrough());break;
    // Screens and sheets
    case 'home':closeSheet();renderHome();break;
    case 'settings':settingsSheet();break;
    case 'report':closeSheet();renderReport();break;
    case 'close':closeSheet();break;
    // Welcome, tips and feedback
    case 'wnext':if(welcomeNext())renderHome();break;
    case 'wdone':finishWelcome();renderHome();break;
    case 'install':install();break;
    case 'welcome':closeSheet();renderWelcome();break;
    case 'tipsreset':resetTips();toast('Tips will show again');break;
    case 'tipok':closeTip();break;
    case 'feedback':feedbackSheet();break;
    case 'share':{
      const text=reportText();
      if(navigator.share)navigator.share({title:'Kanji progress',text}).catch(err=>{if(!err||err.name!=='AbortError')copyText(text);});
      else copyText(text);
      break;}
    // Sets on the chart
    case 'set':setSheet(set);break;
    case 'setnew':if(!S.rows.includes(set))S.rows.push(set);save();closeSheet();renderHome();break;
    case 'setadd':
      if(!S.rows.includes(set))S.rows.push(set);save();closeSheet();
      startSession('placement',buildPlacement(set));break;
    case 'setpractice':closeSheet();startSession('practice',buildPractice(set));break;
    case 'setremove':
      if(confirm('Remove this set from your chart? Its progress is kept if you add it back.')){S.rows=S.rows.filter(r=>r!==set);save();closeSheet();renderHome();}
      break;
    // Sound
    case 'speakword':speakWord(WORD_BY[b.dataset.w]);break; // an example word
    case 'testvoice':(async()=>{for(const w of ['山','三つ','三月'])await speakWord(WORD_BY[w]);})();break;
    // During a session
    case 'answer':answer(b.dataset.k);break;
    case 'next':next();break;
    case 'nosound':noSound();break;
    case 'introok':introOk();break;
    case 'clear':clearDrawing();break;
    case 'check':checkWriting();break;
    case 'wdk':dontKnowWriting();break;
    case 'self':selfGrade(b.dataset.ok==='1');break;
    case 'strokes':replayStrokes();break;
    case 'practise':practiseWriting();break;
    case 'retry':retryWriting();break;
    case 'wstep':nextStep();break;
    case 'wshow':showPractised();break;
    case 'pwatch':pWatch();break;
    case 'pnext':pNext();break;
    case 'pdone':pDone();break;
    // Hints
    case 'edithint':editHint(b.dataset.k,b.closest('.hintkeys')?BY[b.dataset.k].set:null);break; // from the chart? go back there after
    case 'savehint':setHint(b.dataset.k,document.getElementById('hinttext').value.trim());break;
    case 'resethint':setHint(b.dataset.k,'');break;
    // Backup and reset
    case 'copy':{
      const txt=backupText(S);
      const fallback=()=>{const ta=document.getElementById('restore');ta.value=txt;ta.select();toast('Select all and copy');};
      if(navigator.clipboard)navigator.clipboard.writeText(txt).then(()=>toast('Backup copied'),fallback);else fallback();
      break;}
    case 'restore':{
      const txt=document.getElementById('restore').value.trim();
      try{const {state:s,error}=checkBackup(JSON.parse(txt));
        if(error){toast(error);break;}
        if(confirm('Replace the progress on this phone with this backup?')){
          const restored=Object.assign(fresh(),s);if(!s.v)restored.v=1; // backups from before FSRS get converted
          replaceState(restored);closeSheet();renderHome();toast('Backup restored');}
      }catch(err){toast('That backup could not be read');}
      break;}
    case 'reset':
      if(confirm('Reset all progress? This cannot be undone.')){replaceState(fresh());closeSheet();renderHome();}
      break;
  }
});

// Settings switches
document.addEventListener('change',e=>{
  if(e.target.id==='snd'){S.settings.sound=e.target.checked;save();}
  if(e.target.id==='wrt'){S.settings.write=e.target.checked;save();renderHome();}
  if(e.target.name==='pmode'){
    const manual=e.target.value==='manual';
    S.settings.mode=manual?'manual':'auto';save();
    document.getElementById('pauto').hidden=manual;document.getElementById('pmanual').hidden=!manual;
    renderHome();
  }
  if(e.target.name==='ptype'){
    const ticked=[...document.querySelectorAll('input[name="ptype"]:checked')].map(i=>i.value);
    if(!ticked.length){e.target.checked=true;toast('Tick at least one');return;}
    S.settings.types=ticked;save();renderHome();
  }
  if(e.target.name==='wpmode'){S.settings.practise=e.target.value;save();}
  if(e.target.id==='voice'){S.settings.voice=e.target.value;save();speakWord(WORD_BY['山']);}
});

if(needsWelcome())renderWelcome();else renderHome();
// Keeps the pages, code and voice clips on the phone so it works with no signal
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
