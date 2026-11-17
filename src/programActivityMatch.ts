// Normalize OCR imports and existing names when opening an editable draft.
function key(value:string){return value.normalize('NFKC').toLowerCase().replace(/[^가-힣a-z0-9]/g,'')}
// User-confirmed OCR errors. Keep these separate from similarity guesses.
const confirmedTrainingErrors=new Set([
 '으츠이후려자비체천6: (0)',
 '으초이후련자비체천6: (0)','으초이후련자비체천6: (O)',
 '으초이후련자비체천6: (ㅇ)','우초이후련자비체천6: (0)',
 '으초이후련자비체천6: (이)','우주인후련자비체천6: (0)',
].map(key));
export function confirmedProgramActivity(value:string){
 return confirmedTrainingErrors.has(key(value))?'우주인훈련장비체험 & S.O.S.':value;
}
function similarity(a:string,b:string){
 let row=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next}
 return 1-row[b.length]/Math.max(a.length,b.length,1);
}
export function matchProgramActivity(original:string,catalog:readonly string[]){
 const normalized=key(original);
 const confirmed=confirmedProgramActivity(original);
 if(confirmed!==original&&catalog.includes(confirmed))return {activity:confirmed,changed:true,needsReview:false};
 const ranked=[...new Set(catalog)].filter(Boolean).map(name=>({name,score:similarity(normalized,key(name))})).sort((a,b)=>b.score-a.score);
 const best=ranked[0],second=ranked[1];
 if(normalized&&best&&(best.score===1||(normalized.length>=6&&best.score>=.84&&best.score-(second?.score??0)>=.12)))return {activity:best.name,changed:best.name!==original,needsReview:false};
 const hangul=original.replace(/[^가-힣]/g,'');
 const phonetic=rankHangul(original,catalog),candidate=phonetic[0];
 // Require enough text, similar length and a clear lead over every other
 // activity. Similar numbered activities therefore never auto-resolve.
 if(hangul.length>=8&&candidate&&candidate.score>=.65&&candidate.score-(phonetic[1]?.score??0)>=.25&&candidate.coverage>=.8)return {activity:candidate.name,changed:candidate.name!==original,needsReview:false};
 return {activity:original,changed:false,needsReview:true};
}

function rankHangul(original:string,catalog:readonly string[]){
 const hangul=original.replace(/[^가-힣]/g,'');
 return [...new Set(catalog)].filter(Boolean).map(name=>{
  const korean=name.replace(/[^가-힣]/g,'');
  return {name,score:similarity(hangul.normalize('NFD'),korean.normalize('NFD')),coverage:Math.min(hangul.length,korean.length)/Math.max(hangul.length,korean.length,1)};
 }).sort((a,b)=>b.score-a.score);
}
export function suggestProgramActivity(original:string,catalog:readonly string[]){
 if(!matchProgramActivity(original,catalog).needsReview)return undefined;
 if(original.replace(/[^가-힣]/g,'').length<6)return undefined;
 const ranked=rankHangul(original,catalog);
 return ranked[0]?.score>=.60&&ranked[0].score-(ranked[1]?.score??0)>=.15?ranked[0].name:undefined;
}

export function normalizeProgramGroup<T extends {sessions:{activity:string}[]}>(group:T,catalog:readonly string[]):T{
 return {...group,sessions:group.sessions.map(session=>({...session,activity:matchProgramActivity(session.activity,catalog).activity}))};
}
