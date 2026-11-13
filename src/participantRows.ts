import type {ParticipantCount,YouthCountRow,YouthLevel} from './types';

const ageOrder:YouthLevel[]=['preschool','elementary','middle','high','university','lateYouth','adult'];
export function compareParticipantRows(a:YouthCountRow,b:YouthCountRow):number {
 const level=ageOrder.indexOf(a.level)-ageOrder.indexOf(b.level);
 if(level)return level;
 const rank=(row:YouthCountRow)=>row.level==='adult'||row.level==='preschool'
  ?row.age??Infinity:/^[1-6]$/.test(row.grade)?Number(row.grade):row.grade==='other'?99:100;
 const left=rank(a),right=rank(b);
 return left===right?0:left<right?-1:1;
}
export function participantRows(counts:ParticipantCount){
 return (counts.youthDetails?.rows??[]).filter(row=>row.male>0||row.female>0).sort(compareParticipantRows);
}
