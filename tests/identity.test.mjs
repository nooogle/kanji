import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {join,extname} from 'node:path';

const SKIP=new Set(['docs','vendor','tests','.git','.superpowers','node_modules','audio','preview']);
function files(dir,out=[]){
  for(const n of readdirSync(dir)){
    if(SKIP.has(n))continue;
    const p=join(dir,n);
    if(statSync(p).isDirectory())files(p,out);
    else if(['.js','.mjs','.html','.json','.webmanifest','.py','.css'].includes(extname(p)))out.push(p);
  }
  return out;
}
const root=new URL('..',import.meta.url).pathname;

test('the app has its own name, storage key and caches (nothing left from the Hiragana drill)',()=>{
  assert.ok(existsSync(join(root,'manifest.webmanifest')),'manifest exists');
  for(const f of files(root)){
    const t=readFileSync(f,'utf8');
    assert.ok(!/hiragana-drill/.test(t.replace(/'hiragana-drill':'the Hiragana drill'/,'').replace(/'katakana-drill':'the Katakana drill'/,'')),`${f} mentions hiragana-drill`);
    assert.ok(!/Hiragana drill/.test(t.replace(/'the Hiragana drill'/g,'').replace(/the Hiragana drill/g,'')),`${f} mentions the Hiragana drill`);
    assert.ok(!/hiragana-v|hiragana-(?:cache|sw)/.test(t),`${f} has a hiragana- storage or cache name`);
  }
});
test('the service worker cache and manifest are named for this app',()=>{
  assert.match(readFileSync(join(root,'sw.js'),'utf8'),/kanji-/);
  assert.equal(JSON.parse(readFileSync(join(root,'manifest.webmanifest'),'utf8')).name,'Kanji drill');
});
