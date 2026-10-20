import type {ParticipantCount,YouthDetails,YouthLevel} from './types';
import {participantRows} from './participantRows.ts';
import {validCounts} from '../public-api/workspace-schema.mjs';
export const youthLevels:YouthLevel[]=['elementary','middle','high','university','adult','preschool'];
export const levelLabels:Record<YouthLevel,string>={elementary:'초등',middle:'중등',high:'고등',university:'대학생',adult:'성인',preschool:'미취학'};
export const gradeOptions:Record<YouthLevel,string[]>={elementary:['','6','5','4','3','2','1','other'],middle:['','1','2','3'],high:['','1','2','3'],university:['','1','2','3'],adult:[''],preschool:['']};
export const gradeLabel=(g:string)=>g==='other'?'기타 학년':g?g+'학년':'학년 구분 없음';
export function insertYouthRow(details:YouthDetails,level:YouthLevel,afterId?:string):YouthDetails|null {
 const used=new Set(details.rows.filter(row=>row.level===level).map(row=>row.grade));
 const candidates=level==='elementary'?['6','5','4','3','2','1','other','']:[...gradeOptions[level].filter(Boolean),''];
 const grade=candidates.find(grade=>!used.has(grade));
 if(grade===undefined)return null;
 const row={id:crypto.randomUUID(),level,grade,male:0,female:0};
 const after=afterId?details.rows.findIndex(row=>row.id===afterId&&row.level===level):-1;
 const index=after<0?details.rows.length:after+1;
 return {...details,rows:[...details.rows.slice(0,index),row,...details.rows.slice(index)]};
}
export function inferYouthLevel(name:string):YouthLevel|undefined {const n=name.replace(/\s/g,'');if(/대학교|대학|대$/.test(n))return 'university';if(/초/.test(n))return 'elementary';if(/중학교|중등|중$/.test(n))return 'middle';if(/고등학교|고등|고$/.test(n))return 'high';}
export function countYouth(details:YouthDetails){return details.unclassified+details.rows.reduce((sum,r)=>sum+r.male+r.female,0)}
export function normalizeCounts(value:ParticipantCount,previous?:ParticipantCount):ParticipantCount {
 const next:ParticipantCount={youth:value.youth,leaders:value.leaders};
 const details=value.youthDetails??(previous?.youth===value.youth?previous.youthDetails:undefined);
 if(details!==undefined)next.youthDetails=structuredClone(details);
 const leaders=value.leaderDetails??(previous?.leaders===value.leaders?previous.leaderDetails:undefined);
 if(leaders!==undefined)next.leaderDetails=structuredClone(leaders);
 if(!validCounts(next))throw Error('남·여 인원, 학년과 합계를 확인해주세요. 같은 구분·학년은 한 행에 입력해주세요.');
 if(next.youthDetails)next.youthDetails.rows=participantRows(next);
 return next;
}
export const sameCounts=(a:ParticipantCount,b:ParticipantCount)=>JSON.stringify(normalizeCounts(a))===JSON.stringify(normalizeCounts(b));
export function genderTotals(counts:ParticipantCount){const d=counts.youthDetails;return {male:d?.rows.reduce((n,r)=>n+r.male,0)??0,female:d?.rows.reduce((n,r)=>n+r.female,0)??0,unclassified:d?.unclassified??counts.youth}}
export function describeCounts(counts:ParticipantCount){const t=genderTotals(counts);return '참가자 '+counts.youth+' / 남 '+t.male+' / 여 '+t.female+' / 미분류 '+t.unclassified+' / 인솔자 '+counts.leaders+' (남 '+(counts.leaderDetails?.male??0)+' / 여 '+(counts.leaderDetails?.female??0)+' / 미분류 '+(counts.leaderDetails?.unclassified??counts.leaders)+')';}
