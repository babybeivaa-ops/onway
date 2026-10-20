import type {ParticipantCount} from './types';

export function participantRows(counts:ParticipantCount){
 return (counts.youthDetails?.rows??[]).filter(row=>row.male>0||row.female>0);
}
