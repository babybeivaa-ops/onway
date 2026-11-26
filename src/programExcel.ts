import type {ProgramGroup,ProgramPlan} from './programPlan';
import {programTime} from './programRows.ts';
import {selectedProgramRegistration} from './programSelection.ts';
import {displayProgramPlace} from './programPlaces.ts';
import {matchProgramActivity} from './programActivityMatch.ts';
import {programActivities} from './programTimetable.ts';
import {monday} from './weeklyMeals.ts';

export type ExcelCell={row:number;col:number;endCol:number;text:string};
export type ExcelSheet={name:string;cells:ExcelCell[]};
export type ProgramSelection={name:string;date:string;registeredNames?:string[]};
const timePattern=/\d{1,2}\s*:\s*\d{2}\s*[~～–-]\s*\d{1,2}\s*:\s*\d{2}/g;
function dateValue(text:string,date1904:boolean){
 if(/^\d{5}(\.\d+)?$/.test(text))return new Date(Date.UTC(date1904?1904:1899,date1904?0:11,date1904?1:30)+Math.floor(Number(text))*86400000).toISOString().slice(0,10);
 const match=text.match(/(20\d{2})[년./-]\s*(\d{1,2})[월./-]\s*(\d{1,2})/);
 if(!match)return '';
 const value=`${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
 return Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value?value:'';
}

/** Read the operating-plan table, not the staff totals alongside it. */
export function parseProgramExcel(sheets:ExcelSheet[],source:string,selection:ProgramSelection,date1904=false):ProgramPlan{
 const candidates:ProgramGroup[]=[];
 for(const sheet of sheets){
  const cells=sheet.cells.filter(c=>c.text.trim());
  const dayCells=cells.filter(c=>/^[월화수목금토일]$/.test(c.text.trim())&&cells.some(d=>d.row===c.row&&d.col>c.col&&d.col<c.col+5&&dateValue(d.text,date1904)));
  if(!dayCells.length)continue;
  const labelCol=Math.min(...dayCells.map(c=>c.col));
  const firstRow=Math.min(...dayCells.filter(c=>c.col===labelCol).map(c=>c.row));
  const rows=[...new Set(cells.filter(c=>c.row>=firstRow).map(c=>c.row))].sort((a,b)=>a-b);
  const groups:ProgramGroup[]=[];
  let currentDate='';
  const owners=new Map<number,ProgramGroup>();
  const classes=new Map<number,string>();
  for(const row of rows){
   const rowCells=cells.filter(c=>c.row===row).sort((a,b)=>a.col-b.col);
   const label=rowCells.find(c=>c.col===labelCol)?.text.trim()??'';
   if(/^[월화수목금토일]$/.test(label)){
    const date=rowCells.filter(c=>c.col>labelCol&&c.col<labelCol+5).map(c=>dateValue(c.text,date1904)).find(Boolean);
    if(date)currentDate=date;
    continue;
   }
   if(!currentDate)continue;
   if(label==='사업/단체'){
    for(const cell of rowCells.filter(c=>c.col>labelCol&&/[가-힣]/.test(c.text)&&!/^사업\/단체|⇒|→|←/.test(c.text))){
     // The timetable occupies the columns before the next labelled staff table.
     const otherLabel=rowCells.find(c=>c.col>labelCol&&c.text==='사업/단체');
     if(otherLabel&&cell.col>=otherLabel.col)continue;
     const name=cell.text.trim();
     let group=groups.find(g=>g.name===name);
     if(!group){group={name,aliases:'',start:currentDate,end:currentDate,sessions:[]};groups.push(group)}
     for(let col=cell.col;col<=cell.endCol;col++){
      if(owners.get(col)!==group)classes.delete(col);
      owners.set(col,group);
     }
    }
    continue;
   }
   if(label==='구분'){
    for(const cell of rowCells.filter(c=>owners.has(c.col)&&/반/.test(c.text))){
     const value=(cell.text.split('반')[0].match(/\d+/g)??[]).join('·');
     for(let col=cell.col;col<=cell.endCol;col++)classes.set(col,value?value+'반':'');
    }
    continue;
   }
   const sharedTime=programTime(label.replace(/～/g,'~'));
   if(!sharedTime)continue;
   const placeLabel=cells.find(c=>c.col===labelCol&&c.row>row&&c.row<=row+4&&c.text.trim()==='장소');
   for(const cell of rowCells){
    const group=owners.get(cell.col);
    if(!group||!/[가-힣A-Za-z]/.test(cell.text)||/^(집합|식사|업무)\s*:/.test(cell.text))continue;
    const compact=cell.text.replace(/\s/g,'');
    const otherEvent=cells.some(c=>c.row<firstRow&&c.text.trim()!==group.name&&c.text.replace(/\s/g,'').startsWith(compact)&&compact.length>=4&&cells.some(d=>d.row===c.row&&d.col>c.col&&dateValue(d.text,date1904)));
    if(otherEvent)continue;
    // Do not assign unrelated special programmes to the preceding school.
    const registration=cells.find(c=>c.row<firstRow&&c.text.trim()===group.name);
    if(registration){
     const admission=cells.find(c=>c.row===registration.row&&c.col>registration.col&&dateValue(c.text,date1904));
     const duration=admission&&cells.find(c=>c.row===registration.row&&c.col>admission.col&&/^\d+$/.test(c.text)&&+c.text>=1&&+c.text<=7);
     if(admission&&duration){const end=new Date(Date.parse(dateValue(admission.text,date1904))+(+duration.text-1)*86400000).toISOString().slice(0,10);if(currentDate>end)continue}
    }
    const place=cells.find(c=>c.row===placeLabel?.row&&c.col<=cell.col&&c.endCol>=cell.col)?.text??'';
    const overrides=[...((cell.text+' '+place).match(timePattern)??[])].map(t=>programTime(t.replace(/～/g,'~')));
    if(new Set(overrides).size>1)throw Error(`${sheet.name} ${currentDate}: 한 활동에 서로 다른 예외 시간이 있어요. 원본 시간을 확인해주세요.`);
    const time=overrides[0]||sharedTime;
    if(time.slice(0,5)>=time.slice(6))throw Error(`${currentDate} 활동의 시작·종료 시간을 확인해주세요.`);
    const activity=matchProgramActivity(cell.text.replace(timePattern,'').trim(),programActivities).activity;
    const classNames=[...new Set(Array.from({length:cell.endCol-cell.col+1},(_,i)=>classes.get(cell.col+i)).filter(Boolean))].join('·');
    group.sessions.push({date:currentDate,time,activity,place:displayProgramPlace(place.replace(timePattern,'').trim(),activity),...(classNames?{classes:classNames}:{})});
    group.end=currentDate;
   }
  }
  candidates.push(...groups.filter(g=>g.sessions.length));
  // Prefer the actual operating-plan sheet over backup/duplicate worksheets.
  if(groups.some(g=>g.sessions.length)&&/편성표|운영계획/.test(sheet.name))break;
 }
 if(!candidates.length)throw Error('엑셀에서 날짜·사업/단체·시간·장소가 있는 편성표를 찾지 못했어요. 원본 운영계획 XLSX를 선택해주세요.');
 let chosen:ProgramGroup;
 try{chosen=selectedProgramRegistration(candidates,selection.name,selection.date,selection.registeredNames,true)}catch(error){throw Error((error as Error).message+' 파일에서 찾은 단체: '+[...new Set(candidates.map(g=>g.name))].join(', '))}
 const group={...chosen,name:selection.name,aliases:[chosen.name,chosen.aliases].filter(Boolean).join(',')};
 return {week:monday(group.start),source,updatedAt:new Date().toISOString(),groups:[group],dateNote:'엑셀의 셀 내용을 읽었습니다. 활동별 예외 시간을 우선 적용했으니 저장 전 확인해주세요.'};
}
