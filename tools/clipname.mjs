// Voice clip names. Each example word's clip is audio/w-<romaji of its reading>.mp3, so words that are read the same share one.

const BASE={あ:'a',い:'i',う:'u',え:'e',お:'o',か:'ka',き:'ki',く:'ku',け:'ke',こ:'ko',さ:'sa',し:'shi',す:'su',せ:'se',そ:'so',
  た:'ta',ち:'chi',つ:'tsu',て:'te',と:'to',な:'na',に:'ni',ぬ:'nu',ね:'ne',の:'no',は:'ha',ひ:'hi',ふ:'fu',へ:'he',ほ:'ho',
  ま:'ma',み:'mi',む:'mu',め:'me',も:'mo',や:'ya',ゆ:'yu',よ:'yo',ら:'ra',り:'ri',る:'ru',れ:'re',ろ:'ro',わ:'wa',を:'o',ん:'n',
  が:'ga',ぎ:'gi',ぐ:'gu',げ:'ge',ご:'go',ざ:'za',じ:'ji',ず:'zu',ぜ:'ze',ぞ:'zo',だ:'da',ぢ:'ji',づ:'zu',で:'de',ど:'do',
  ば:'ba',び:'bi',ぶ:'bu',べ:'be',ぼ:'bo',ぱ:'pa',ぴ:'pi',ぷ:'pu',ぺ:'pe',ぽ:'po'};
const SMALL={ゃ:'a',ゅ:'u',ょ:'o'};

/** The romaji (Hepburn) of a reading written in hiragana, like みっつ → mittsu, きょう → kyo-u. Long vowels are kept as
 *  separate letters (おう is ou) so that different readings never get the same name. */
export function romaji(kana){
  const chars=[...kana];let out='',double=false;
  for(let i=0;i<chars.length;i++){
    const c=chars[i];
    if(c==='っ'){double=true;continue;}
    let r=BASE[c];
    if(r===undefined)throw new Error(`Can't write "${c}" in "${kana}" as romaji`);
    if(SMALL[chars[i+1]]){ // きゃ: drop the i, add the small vowel (sh/ch/j keep their own sound)
      r=(/^(sh|ch|j)/.test(r)?r.slice(0,-1):r.slice(0,-1)+'y')+SMALL[chars[i+1]];i++;
    }
    if(double){r=(r.startsWith('ch')?'t':r[0])+r;double=false;}
    out+=r;
  }
  return out;
}

/** The clip name for a word with this reading. */
export const clipName=reading=>'w-'+romaji(reading);
