// Normalize OCR imports and existing names when opening an editable draft.
function key(value:string){return value.normalize('NFKC').toLowerCase().replace(/[^가-힣a-z0-9]/g,'')}
// Match each form to one canonical activity, never to a second generated label.
// Aliases only participate while their canonical activity is in the catalog.
const activityForms:Record<string,readonly string[]>={
 '천체투영관에서 본 하늘':['천체투영관에서 보는 하늘','천체투영관 본 하늘'],
 'GPS 오리엔티어링':['GPS 오리엔테어링','GPS 오리엔티어링 활동'],
 '회전하는 물체 그리고 공전':['회전하는 물체와 공전','회전하는 물체 공전'],
 '대기비행의 원리와 종이비행기':['대기비행 원리와 종이비행기','종이비행기'],
 '자기주도 활동':['자기주도활동','자기주도'],
 '대기비행의 안정성과 폼로켓':['대기비행 안정성과 폼로켓','폼로켓'],
 '우주인훈련장비체험 & S.O.S.':['우주인훈련장비체험','우주인훈련장비체험 S.O.S.','우주인훈련장비체험 및 S.O.S.'],
 '에어로켓 원하는 곳에 보내기':['에어로켓을 원하는 곳에 보내기','에어로켓'],
};
function forms(name:string){return [name,...(activityForms[name]??[])]}
// User-confirmed OCR errors. Keep these separate from similarity guesses.
const confirmedTrainingErrors=new Set([
 '으츠이후려자비체천6: (0)',
 '으초이후련자비체천6: (0)','으초이후련자비체천6: (O)',
 '으초이후련자비체천6: (ㅇ)','우초이후련자비체천6: (0)',
 '으초이후련자비체천6: (이)','우주인후련자비체천6: (0)',
].map(key));
export function confirmedProgramActivity(value:string){
 if(key(value)===key('자기우도알동'))return '자기주도 활동';
 if(key(value)===key('우주착륙션 제작'))return '우주착륙선 제작';
 if(key(value)===key('우구작륙선 제삭'))return '우주착륙선 제작';
 if(key(value)===key('605 오리멘티머링'))return 'GPS 오리엔티어링';
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
 // An explicit registered name always wins over aliases of other activities.
 const exact=catalog.find(name=>key(name)===normalized);
 if(normalized&&exact)return {activity:exact,changed:exact!==original,needsReview:false};
 const ranked=[...new Set(catalog)].filter(Boolean).map(name=>({name,score:Math.max(...forms(name).map(form=>similarity(normalized,key(form))))})).sort((a,b)=>b.score-a.score);
 const best=ranked[0],second=ranked[1];
 if(normalized&&best&&best.score-(second?.score??0)>=.12&&(best.score===1||(normalized.length>=6&&best.score>=.84)))return {activity:best.name,changed:best.name!==original,needsReview:false};
 const hangul=original.replace(/[^가-힣]/g,'');
 const phonetic=rankHangul(original,catalog),candidate=phonetic[0];
 // Require enough text, similar length and a clear lead over every other
 // activity. Similar numbered activities therefore never auto-resolve.
 if(candidate&&((hangul.length>=8&&candidate.score>=.65)||(hangul.length>=5&&candidate.score>=.86))&&candidate.score-(phonetic[1]?.score??0)>=.25&&candidate.coverage>=.8)return {activity:candidate.name,changed:candidate.name!==original,needsReview:false};
 return {activity:original,changed:false,needsReview:true};
}

function rankHangul(original:string,catalog:readonly string[]){
 const hangul=original.replace(/[^가-힣]/g,'');
 return [...new Set(catalog)].filter(Boolean).map(name=>{
  const variants=forms(name).map(form=>{
   const korean=form.replace(/[^가-힣]/g,'');
   return {name,score:similarity(hangul.normalize('NFD'),korean.normalize('NFD')),coverage:Math.min(hangul.length,korean.length)/Math.max(hangul.length,korean.length,1)};
  });
  return variants.sort((a,b)=>b.score-a.score||b.coverage-a.coverage)[0];
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
