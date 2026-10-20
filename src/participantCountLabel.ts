import type {ParticipantCount} from './types';
import {participantRows} from './participantRows.ts';

/** Adult and preschool categories share the participant total with school groups. */
export function participantCountLabel(...counts:ParticipantCount[]):'참가자'|'청소년'{
 return counts.some(count=>participantRows(count).some(row=>row.level==='adult'||row.level==='preschool'))?'참가자':'청소년';
}
