// After new clips are in audio/, tell the deck which words have one: adds the clip name to each word in js/kanjidata.js
// whose clip file exists (and takes it off any whose file has gone). Run from the top of the repo:
//   node tools/mark_clips.mjs
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {clipName} from './clipname.mjs';

const file='js/kanjidata.js';
let made=0,total=0;
const text=readFileSync(file,'utf8').split('\n').map(line=>{
  const m=line.match(/^  \['([^']+)','([^']+)','((?:[^'\\]|\\.)*)'(?:,'[^']*')?\],$/);
  if(!m)return line;
  total++;
  const name=clipName(m[2]),has=existsSync(`audio/${name}.mp3`);
  if(has)made++;
  return `  ['${m[1]}','${m[2]}','${m[3]}'${has?`,'${name}'`:''}],`;
}).join('\n');
writeFileSync(file,text);
console.log(`${made} of ${total} words have a clip`);
