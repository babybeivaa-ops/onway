import type {ParticipantActor} from './types';
// Before actor was stored, admin edits used this fixed reason; guide edits did not.
export const participantActorLabel=(actor?:ParticipantActor,reason='')=>
 (actor??(reason.trim()==='관리자 등록 정보 수정'?'admin':'guide'))==='admin'?'관리자 변경':'인솔교사 변경';

export const participantReasonLabel=(reason:string)=>reason.replaceAll('인솔자','인솔교사');
