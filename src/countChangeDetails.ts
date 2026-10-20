import {participantCountLabel} from './participantCountLabel.ts';
import type {ParticipantChange,ParticipantCount} from './types';
import {levelLabels,gradeLabel} from './participantCounts.ts';

export const guideCountChanges=(changes:ParticipantChange[])=>changes
 .filter(c=>c.actor!=='admin'&&(c.actor==='guide'||c.reason!=='관리자 등록 정보 수정'))
 .slice().sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));

export interface CountDifference {label:string;before:number;after:number}
export function countChangeDetails(before:ParticipantCount,after:ParticipantCount):CountDifference[]{
 const result:CountDifference[]=[];
 const add=(label:string,a:number,b:number)=>{if(a!==b)result.push({label,before:a,after:b})};
 add(participantCountLabel(before,after)+' 합계',before.youth,after.youth);
 add('인솔교사 합계',before.leaders,after.leaders);
 const key=(row:NonNullable<ParticipantCount['youthDetails']>['rows'][number])=>row.level+':'+row.grade;
 const previous=new Map(before.youthDetails?.rows.map(r=>[key(r),r]));
 const next=new Map(after.youthDetails?.rows.map(r=>[key(r),r]));
 for(const id of new Set([...previous.keys(),...next.keys()])){
  const a=previous.get(id),b=next.get(id),row=b??a!;
  const label=levelLabels[row.level]+(row.level==='adult'||row.level==='preschool'?'':' '+gradeLabel(row.grade));
  add(label+' 남',a?.male??0,b?.male??0);
  add(label+' 여',a?.female??0,b?.female??0);
 }
 add(participantCountLabel(before,after)+' 미분류',before.youthDetails?.unclassified??before.youth,after.youthDetails?.unclassified??after.youth);
 const a=before.leaderDetails??{male:0,female:0,unclassified:before.leaders};
 const b=after.leaderDetails??{male:0,female:0,unclassified:after.leaders};
 add('인솔교사 남',a.male,b.male);
 add('인솔교사 여',a.female,b.female);
 add('인솔교사 성별 미입력',a.unclassified,b.unclassified);
 return result;
}
