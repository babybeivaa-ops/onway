import {displayProgramPlace} from './programPlaces';
import {selectedProgramRegistration} from './programSelection';
import {programRowAnchor,programTime} from './programRows';
import type {ProgramPlan,ProgramGroup} from './programPlan';
import {monday} from './weeklyMeals';
import {programDates} from './programDates';
type Box={x:number;y:number;right:number;bottom:number};
function boxes(data:ImageData,test:(r:number,g:number,b:number)=>boolean){
 const found:Box[]=[];for(let y=0;y<data.height;y++){let start=-1,last=-1;const save=()=>{if(last-start>data.width*.07){const box=found.find(b=>y-b.bottom<3&&Math.abs(b.x-start)<15&&Math.abs(b.right-last)<15);if(box){box.bottom=y;box.x=Math.min(box.x,start);box.right=Math.max(box.right,last)}else found.push({x:start,y,right:last,bottom:y})}start=last=-1};for(let x=0;x<data.width;x++){const i=(y*data.width+x)*4;if(test(data.data[i],data.data[i+1],data.data[i+2])){if(start<0)start=x;last=x}else if(start>=0&&x-last>data.width*.015)save()}if(start>=0)save()}
 return found.filter(b=>b.bottom-b.y>=2);
}
export async function readProgramPng(file:File,progress:(s:string)=>void,selection?:{name:string;date:string;registeredNames:string[]}):Promise<ProgramPlan>{
 if(!/\.png$/i.test(file.name)||file.size>10*1024*1024)throw Error('10MB 이하 PNG 편성표를 선택해주세요.');
 const bitmap=await createImageBitmap(file);if(bitmap.width>6000||bitmap.height>12000){bitmap.close();throw Error('이미지 크기를 줄여 다시 등록해주세요.')}const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d')!;ctx.drawImage(bitmap,0,0);bitmap.close();
 if(canvas.width>6000||canvas.height>12000)throw Error('이미지 크기를 줄여 다시 등록해주세요.');
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
 const dates=boxes(pixels,(r,g,b)=>b-r>12&&r-g>12&&r<140&&r>50).filter(b=>b.right-b.x>canvas.width*.5);
 const blue=boxes(pixels,(r,g,b)=>b-r>40&&g-r>18&&r>90&&r<180);
 const pink=boxes(pixels,(r,g,b)=>r-g>35&&r-b>30&&g>100&&g<190&&Math.abs(g-b)<20);
 const titles=boxes(pixels,(r,g,b)=>r>180&&r<245&&b-g>5&&b-r>0&&r-g>0);
 if(!dates.length||!blue.length)throw Error('날짜와 단체 영역을 찾지 못했어요. 편성표 전체가 보이는 원본 PNG를 선택해주세요.');
 const tableLeft=Math.min(...dates.map(b=>b.x)),unit=dates[0].bottom-dates[0].y+2;
 // The narrow first column is the printed time/role label column.
 let labelRight=tableLeft+unit*5,best=0;for(let x=Math.round(tableLeft+unit*3);x<Math.round(tableLeft+unit*7);x++){let score=0;for(let y=dates[0].bottom+2;y<Math.min(dates[1]?.y??canvas.height,dates[0].y+unit*14);y++){const i=(y*canvas.width+x)*4;if((pixels.data[i]+pixels.data[i+1]+pixels.data[i+2])/3<210)score++}if(score>best){best=score;labelRight=x}}
 const {createWorker}=await import('tesseract.js');const worker=await createWorker('kor',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr',langPath:'/ocr/lang-best',cachePath:'onway-menu-ocr-v2'});
 const crop=async(x:number,y:number,w:number,h:number,numeric=false)=>{const c=document.createElement('canvas'),scale=Math.max(2,Math.min(5,1600/Math.max(1,w)));c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));c.getContext('2d')!.drawImage(canvas,x,y,w,h,0,0,c.width,c.height);await worker.setParameters({tessedit_pageseg_mode:'7' as import('tesseract.js').PSM,tessedit_char_whitelist:numeric?'0123456789:~- ':''});const result=await worker.recognize(c);c.width=c.height=0;return result.data.text.replace(/[|_]/g,' ').replace(/\s+/g,' ').trim()};
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
  const candidates=[...blue,...sideHeaders].sort((a,b)=>a.y-b.y||a.x-b.x);
  for(const box of candidates){if(registrations.some(r=>Math.abs(r.box.y-box.y)<unit&&Math.abs(r.box.x-box.x)<unit))continue;const x=box.x<tableLeft+unit?labelRight+2:box.x;const text=await crop(x,box.y,box.right-x,unit);const name=text.replace(/^[^가-힣]+|[^가-힣0-9a-zA-Z)]+$/g,'').replace(/^사업.?단체\s*/,'');if(!name||!/[가-힣]{3}/.test(name))continue;const date=dateFor(box.y);if(!date)continue;let groupName=name,aliases='';if(/후기/.test(name)){const institution=await crop(x+unit*.08,box.y+unit*2.85,box.right-x-unit*.16,unit*.85);const university=institution.match(/[가-힣]+대학교/)?.[0];if(university){groupName=institution;aliases=[name,university,university+' 후기청소년'].join(',')}}registrations.push({box:{...box,x},group:{name:groupName,aliases,start:date,end:date,sessions:[]}})}
  const selected=selection?selectedProgramRegistration(registrations.map(r=>r.group),selection.name,selection.date,selection.registeredNames):undefined;
  if(selected&&selection){selected.aliases=[selected.aliases,selected.name].filter(Boolean).join(',');selected.name=selection.name;}
  progress(selection?`${selection.name}의 활동만 읽고 있어요…`:'단체별 활동 시간과 장소를 읽고 있어요…');
  const rows:Box[]=[];for(const t of titles.sort((a,b)=>a.y-b.y)){const duplicate=rows.find(r=>Math.abs(r.y-t.y)<unit*.65&&Math.abs(r.x-t.x)<unit);if(duplicate){duplicate.right=Math.max(duplicate.right,t.right);duplicate.bottom=Math.max(duplicate.bottom,t.bottom)}else rows.push({...t})}
  const activityRows=selected?rows.filter(row=>[...registrations].reverse().find(r=>r.box.y<row.y&&Math.max(row.x,labelRight+2)>=r.box.x-unit&&row.x<r.box.right)?.group===selected):rows;
  const sharedTimes=new Map<number,string>();
  let done=0;
  for(const row of activityRows){const owner=[...registrations].reverse().find(r=>r.box.y<row.y&&Math.max(row.x,labelRight+2)>=r.box.x-unit&&row.x<r.box.right);if(!owner||(selected&&owner.group!==selected))continue;const date=dateFor(row.y);if(!date)continue;
   // Find the rule immediately above the colored activity cell.
   let top=Math.max(0,row.y-unit*.6),scoreBest=0;for(let y=Math.max(0,Math.floor(row.y-unit));y<=row.y;y++){let score=0;for(let x=Math.round(Math.max(row.x,labelRight));x<Math.min(owner.box.right,canvas.width);x++){const i=(y*canvas.width+x)*4;if((pixels.data[i]+pixels.data[i+1]+pixels.data[i+2])/3<205)score++}if(score>scoreBest){scoreBest=score;top=y+1}}
   const textX=Math.max(row.x,labelRight+2),right=Math.min(row.right,owner.box.right);if(right-textX<40)continue;
   const anchor=programRowAnchor(row,rows,unit);
   if(!sharedTimes.has(anchor.y)){
    let time='';
    for(const offset of [-unit*.15,-unit*.35,0]){time=programTime(await crop(tableLeft,anchor.y+offset,labelRight-tableLeft,unit,true));if(time)break;}
    sharedTimes.set(anchor.y,time);
   }
   const time=sharedTimes.get(anchor.y)!;
   const activity=await crop(textX,top,right-textX,unit),place=await crop(textX,top+unit*3,right-textX,unit);
   if(activity&&!/^(담당|보조|장소|집합|식사)/.test(activity)){owner.group.sessions.push({date,time,activity,place:displayProgramPlace(place)});owner.group.end=date}
   progress(`활동을 읽고 있어요… ${++done}/${activityRows.length}`);
  }
  const groups=registrations.map(r=>r.group).filter(g=>g.sessions.length);if(!groups.length)throw Error('활동을 읽지 못했어요. 선명한 원본 PNG가 필요합니다.');
  return {week:monday(dayBands[0].date),source:file.name,updatedAt:new Date().toISOString(),groups,dateNote:resolved.yearInferred?`원본에 연도가 없어 ${currentYear}년으로 읽었어요. 날짜를 확인해주세요.`:undefined};
 }finally{await worker.terminate();canvas.width=canvas.height=0}
}


