import {programRegistrationIdentity} from './programRegistration';
import {matchProgramActivity,suggestProgramActivity} from './programActivityMatch';
import {programActivities,programPlaces} from './programTimetable';
import {displayProgramPlace} from './programPlaces';
import {selectedProgramRegistration} from './programSelection';
import {programRowAnchor,programTime} from './programRows';
import type {ProgramPlan,ProgramGroup} from './programPlan';
import {monday} from './weeklyMeals';
import {programDates} from './programDates';
type Box={x:number;y:number;right:number;bottom:number};
function boxes(data:ImageData,test:(r:number,g:number,b:number)=>boolean,gap=data.width*.015){
 const found:Box[]=[];for(let y=0;y<data.height;y++){let start=-1,last=-1;const save=()=>{if(last-start>data.width*.07){const box=found.find(b=>y-b.bottom<3&&Math.abs(b.x-start)<15&&Math.abs(b.right-last)<15);if(box){box.bottom=y;box.x=Math.min(box.x,start);box.right=Math.max(box.right,last)}else found.push({x:start,y,right:last,bottom:y})}start=last=-1};for(let x=0;x<data.width;x++){const i=(y*data.width+x)*4;if(test(data.data[i],data.data[i+1],data.data[i+2])){if(start<0)start=x;last=x}else if(start>=0&&x-last>gap)save()}if(start>=0)save()}
 return found.filter(b=>b.bottom-b.y>=2);
}
export async function readProgramPng(file:File,progress:(s:string)=>void,selection?:{name:string;date:string;registeredNames:string[]}):Promise<ProgramPlan>{
 if(!/\.png$/i.test(file.name)||file.size>10*1024*1024)throw Error('10MB 이하 PNG 편성표를 선택해주세요.');
 const bitmap=await createImageBitmap(file);if(bitmap.width>6000||bitmap.height>12000){bitmap.close();throw Error('이미지 크기를 줄여 다시 등록해주세요.')}const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d')!;ctx.drawImage(bitmap,0,0);bitmap.close();
 if(canvas.width>6000||canvas.height>12000)throw Error('이미지 크기를 줄여 다시 등록해주세요.');
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
 const dateFragments=boxes(pixels,(r,g,b)=>b-r>12&&r-g>12&&r<140&&r>50).filter(b=>b.right-b.x>canvas.width*.5);
 const dates:Box[]=[];
 // Text in a colored header can split its background into several strips.
 for(const fragment of dateFragments.sort((a,b)=>a.y-b.y)){
  const previous=dates.at(-1);
  if(previous&&fragment.y-previous.bottom<=Math.max(3,canvas.height*.003)&&Math.abs(fragment.x-previous.x)<canvas.width*.02&&Math.abs(fragment.right-previous.right)<canvas.width*.02){previous.bottom=fragment.bottom;previous.x=Math.min(previous.x,fragment.x);previous.right=Math.max(previous.right,fragment.right)}else dates.push({...fragment});
 }
 const blue=boxes(pixels,(r,g,b)=>b-r>40&&g-r>18&&r>90&&r<180);
 const green=boxes(pixels,(r,g,b)=>g-r>25&&g-b>40&&r>65&&g>140);
 const pink=boxes(pixels,(r,g,b)=>r-g>35&&r-b>30&&g>100&&g<190&&Math.abs(g-b)<20);
 const titles=boxes(pixels,(r,g,b)=>r>180&&r<245&&g>175&&b-g>=4&&b-r>=0&&r-g>=-5);
 const divisions=boxes(pixels,(r,g,b)=>r>230&&g>170&&g<235&&b>130&&b<210&&r-g>15&&g-b>15);
 if(!dates.length||!(blue.length+green.length+pink.length))throw Error('날짜와 단체 영역을 찾지 못했어요. 편성표 전체가 보이는 원본 PNG를 선택해주세요.');
 const tableLeft=Math.min(...dates.map(b=>b.x)),unit=dates[0].bottom-dates[0].y+2;
 const splitCells=(box:Box,height=unit*3)=>{
  const cuts:number[]=[];
  for(let x=box.x+5;x<box.right-5;x++){
   let hits=0,total=0;for(let y=box.y;y<Math.min(canvas.height,box.y+height);y++){const i=(y*canvas.width+x)*4;const [r,g,b]=pixels.data.slice(i,i+3);if(Math.max(r,g,b)<210&&Math.max(r,g,b)-Math.min(r,g,b)<16)hits++;total++;}
   if(hits/total>.85&&(cuts.length===0||x-cuts.at(-1)!>5))cuts.push(x);
  }
  const edges=[box.x,...cuts,box.right];return edges.slice(0,-1).map((x,i)=>({...box,x:i?x+1:x,right:edges[i+1]-1})).filter(b=>b.right-b.x>unit*3);
 };
 // The narrow first column is the printed time/role label column.
 let labelRight=tableLeft+unit*5,best=0;for(let x=Math.round(tableLeft+unit*3);x<Math.round(tableLeft+unit*7);x++){let score=0;for(let y=dates[0].bottom+2;y<Math.min(dates[1]?.y??canvas.height,dates[0].y+unit*14);y++){const i=(y*canvas.width+x)*4;if((pixels.data[i]+pixels.data[i+1]+pixels.data[i+2])/3<210)score++}if(score>best){best=score;labelRight=x}}
 const {createWorker}=await import('tesseract.js');const worker=await createWorker('kor',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr',langPath:'/ocr/lang-best',cachePath:'onway-program-best-v3'});
 const crop=async(x:number,y:number,w:number,h:number,numeric=false,multiline=false)=>{const c=document.createElement('canvas'),scale=5;c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));c.getContext('2d')!.drawImage(canvas,x,y,w,h,0,0,c.width,c.height);await worker.setParameters({tessedit_pageseg_mode:(multiline?'6':'7') as import('tesseract.js').PSM,tessedit_char_whitelist:numeric?'0123456789:~- ':''});const result=await worker.recognize(c);c.width=c.height=0;return result.data.text.replace(/[|_]/g,' ').replace(multiline?/[^\S\n]+/g:/\s+/g,' ').trim()};
 try{
  progress('편성표 날짜를 읽고 있어요…');const labels:string[]=[];
  for(const box of dates)labels.push(await crop(labelRight+2,box.y,unit*18,unit));
  const currentYear=Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Seoul'}).format(new Date()));
  const resolved=programDates(labels,currentYear);
  const dayBands=dates.map((box,i)=>({box,date:resolved.dates[i]}));
  const dateFor=(y:number)=>[...dayBands].reverse().find(b=>b.box.y<y)?.date;
  const registrations:{box:Box;group:ProgramGroup}[]=[];
  const sideHeaders=pink.filter(b=>b.y<dates[0].bottom+unit*2).map(b=>{
   const column=titles.filter(t=>t.y>b.bottom&&Math.abs(t.x-b.x)<unit&&t.y<(dates[1]?.y??canvas.height)).sort((a,b)=>a.y-b.y)[0];
   const baseline=blue.find(t=>Math.abs(t.y-b.y)<unit);
   return {...b,y:baseline?.y??b.y,right:column?.right??b.right};
  });
  const candidates=[...blue,...green,...sideHeaders].sort((a,b)=>a.y-b.y||a.x-b.x);
  for(const box of candidates){
   if(registrations.some(r=>Math.abs(r.box.y-box.y)<unit&&Math.abs(r.box.x-box.x)<unit))continue;
   const x=box.x<tableLeft+unit?labelRight+2:box.x;
   const date=dateFor(box.y);if(!date||box.right-x<40)continue;
   // Read every identifying row up to this column's first activity. Never
   // search another column or borrow a school from the next day's section.
   const nextDay=dayBands.find(b=>b.box.y>box.y)?.box.y??canvas.height;
   const nextHeader=candidates.find(b=>b.y>box.y+unit&&b.x<box.right&&b.right>x)?.y??nextDay;
   const firstActivity=titles.filter(t=>t.y>box.y&&t.x<box.right&&t.right>x&&t.y<nextDay).sort((a,b)=>a.y-b.y)[0]?.y??nextDay;
   const bottom=Math.min(nextDay,nextHeader,firstActivity,box.y+unit*5);
   const lines:string[]=[];
   for(let row=0;box.y+row*unit*.95<bottom-unit*.45;row++){
    const text=await crop(x+unit*.08,box.y+row*unit*.95,box.right-x-unit*.16,unit*.88);
    if(text)lines.push(text);
   }
   // A wide merged school header has large colored margins. OCR can turn
   // its border into a line of invented characters. Retry the centered title
   // without those margins, but accept only a complete institution name.
   const matchesSelection=(title:string)=>{
    if(!selection)return false;
    const identity=programRegistrationIdentity([title]);
    try{return !!selectedProgramRegistration([{...identity,start:date,end:date,sessions:[]}],selection.name,selection.date,selection.registeredNames,true)}catch{return false}
   };
   if((selection?!lines.some(matchesSelection):!/(?:초등학교|중학교|고등학교|대학교)/.test(programRegistrationIdentity(lines).name))&&box.right-x>unit*18){
    const width=box.right-x;
    let found=false;
    for(const fraction of [1/3,.4,.5,2/3]){
     for(const inset of [0,1,-1]){
      const title=await crop(Math.round(x+width*(1-fraction)/2),box.y+inset,Math.round(width*fraction),box.bottom-box.y+1);
      const identity=programRegistrationIdentity([title]);
      if(selection?matchesSelection(title):/^[가-힣\s]+(?:초등학교|중학교|고등학교|대학교)$/.test(identity.name)){
       lines.unshift(identity.name);found=true;break;
      }
     }
     if(found)break;
    }
   }
   const identity=programRegistrationIdentity(lines);
   if(!/[가-힣]{2}/.test(identity.name))continue;
   registrations.push({box:{...box,x},group:{...identity,start:date,end:date,sessions:[]}});
  }
  let selected:ProgramGroup|undefined;
  if(selection){
   try{selected=selectedProgramRegistration(registrations.map(r=>r.group),selection.name,selection.date,selection.registeredNames,true)}
   catch(error){
    const names=registrations.map(r=>r.group.name).filter(Boolean).join(' / ');
    throw Error((error as Error).message+(names?` 인식된 단체명: ${names}`:''));
   }
  }
  if(selected&&selection){selected.aliases=[selected.aliases,selected.name].filter(Boolean).join(',');selected.name=selection.name;}
  progress(selection?`${selection.name}의 활동만 읽고 있어요…`:'단체별 활동 시간과 장소를 읽고 있어요…');
  const classColumns:{box:Box;label:string}[]=[];
  const divisionRows:Box[]=[];for(const b of divisions){const previous=divisionRows.find(r=>Math.abs(r.y-b.y)<unit);if(previous){previous.x=Math.min(previous.x,b.x);previous.right=Math.max(previous.right,b.right);previous.bottom=Math.max(previous.bottom,b.bottom)}else divisionRows.push({...b});}
  for(const row of divisionRows){
   const x=Math.max(row.x,labelRight+2),cells=splitCells({...row,x});
   const text=await crop(x,row.y-1,row.right-x,unit);
   const labelsFrom=(text:string)=>[...text.matchAll(/(\d+(?:\s*[,·]\s*\d+)*)\s*[반받]\s*[（(\[]/g)].map(m=>m[1].replace(/\s/g,'').replace(/,/g,'·')+'반');
   let labels=labelsFrom(text);
   if(labels.length!==cells.length){const registration=[...registrations].reverse().find(r=>r.box.y<row.y&&r.box.x<=x&&r.box.right>=row.right-unit);if(registration){const headerLabels=labelsFrom(registration.group.aliases);if(headerLabels.length===cells.length)labels=headerLabels;}}
   for(let i=0;i<cells.length;i++){
    const box=cells[i],raw=labels.length===cells.length?labels[i]:await crop(box.x+2,box.y-1,box.right-box.x-3,unit);
    const label=raw.split(/[（(]/)[0].replace(/[^0-9,·~\-반]/g,'').replace(/반/g,'').replace(/[,]/g,'·');
    const valid=label&&(label.match(/\d+/g)??[]).every(n=>+n>0&&+n<=30);
    classColumns.push({box,label:valid?label+'반':'구분 확인 필요'});
   }
  }
  const rows:Box[]=[];for(const t of titles.flatMap(b=>splitCells(b)).sort((a,b)=>a.y-b.y||a.x-b.x)){const duplicate=rows.find(r=>Math.abs(r.y-t.y)<unit*.65&&Math.abs(r.x-t.x)<unit);if(duplicate){duplicate.right=Math.max(duplicate.right,t.right);duplicate.bottom=Math.max(duplicate.bottom,t.bottom)}else rows.push({...t})}
  const activityRows=selected?rows.filter(row=>[...registrations].reverse().find(r=>r.box.y<row.y&&Math.max(row.x,labelRight+2)>=r.box.x-unit&&row.x<r.box.right)?.group===selected):rows;
  const sharedTimes=new Map<number,string>();
  let done=0;const corrected:string[]=[],unmatched:string[]=[];
  for(const row of activityRows){const owner=[...registrations].reverse().find(r=>r.box.y<row.y&&Math.max(row.x,labelRight+2)>=r.box.x-unit&&row.x<r.box.right);if(!owner||(selected&&owner.group!==selected))continue;const date=dateFor(row.y);if(!date)continue;
   // Anchor to the activity cell, not the nearby purple date header.
   const textX=Math.max(row.x,labelRight+2),right=Math.min(row.right,owner.box.right);if(right-textX<40)continue;
   let top=row.y;
   for(let y=Math.max(0,Math.floor(row.y-unit*.75));y<row.y;y++){let hits=0;for(let x=textX+2;x<right-2;x++){const i=(y*canvas.width+x)*4;const [r,g,b]=pixels.data.slice(i,i+3);if(Math.max(r,g,b)<215&&Math.max(r,g,b)-Math.min(r,g,b)<20)hits++;}if(hits/(right-textX-4)>.85)top=y+1;}
   const anchor=programRowAnchor(row,rows,unit);
   if(!sharedTimes.has(anchor.y)){
    let time='';
    for(const offset of [-unit*.15,-unit*.35,0]){time=programTime(await crop(tableLeft,anchor.y+offset,labelRight-tableLeft,unit,true));if(time)break;}
    sharedTimes.set(anchor.y,time);
   }
   const time=sharedTimes.get(anchor.y)!;
   const block=(await crop(textX+1,top,right-textX-2,unit*4,false,true)).split('\n').map(line=>line.trim()).filter(Boolean);
   const activity=await crop(textX+2,top,right-textX-3,unit*.88);
   let place=block.length>=3?block.at(-1)!:'';
   if(!programPlaces.some(room=>displayProgramPlace(place).includes(room))){
    const lastLine=await crop(textX+1,top+unit*3,right-textX-2,unit*.9);
    if(programPlaces.some(room=>displayProgramPlace(lastLine).includes(room)))place=lastLine;
   }
   const roomNames=programPlaces.filter(room=>displayProgramPlace(place).includes(room));if(roomNames.length===1)place=roomNames[0];
   const columns=classColumns.filter(c=>c.box.y>=owner.box.y&&c.box.y<row.y&&Math.min(c.box.right,right)-Math.max(c.box.x,textX)>unit*2);
   const latest=columns.length?Math.max(...columns.map(c=>c.box.y)):0;
   const classes=[...new Set(columns.filter(c=>Math.abs(c.box.y-latest)<unit).map(c=>c.label))].join(' / ');
   if(activity&&!/^(담당|보조|장소|집합|식사)/.test(activity)){const match=matchProgramActivity(activity,programActivities);if(match.changed)corrected.push(activity+' → '+match.activity);if(match.needsReview)unmatched.push(activity+(suggestProgramActivity(activity,programActivities)?' → 추천: '+suggestProgramActivity(activity,programActivities):''));owner.group.sessions.push({date,time,activity:match.activity,place:displayProgramPlace(place,match.activity),...(classes?{classes}:{})});owner.group.end=date}
   progress(`활동을 읽고 있어요… ${++done}/${activityRows.length}`);
  }
  const groups=registrations.map(r=>r.group).filter(g=>g.sessions.length);if(!groups.length)throw Error('활동을 읽지 못했어요. 선명한 원본 PNG가 필요합니다.');
  return {week:monday(dayBands[0].date),source:file.name,updatedAt:new Date().toISOString(),groups,dateNote:[resolved.yearInferred?`원본에 연도가 없어 ${currentYear}년으로 읽었어요. 날짜를 확인해주세요.`:null,corrected.length?`프로그램명 보정: ${[...new Set(corrected)].join(' / ')}`:null,unmatched.length?`프로그램명 확인 필요: ${[...new Set(unmatched)].join(', ')}`:null].filter(Boolean).join(' · ')||undefined};
 }finally{await worker.terminate();canvas.width=canvas.height=0}
}


