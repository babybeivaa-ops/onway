import {createHash} from 'node:crypto';

// Owner-requested, one-record correction for the legacy admin-as-guide bug.
// This does not change the normal unread-only cancellation API.
const groupId='4fba973f-8939-4ca0-ae8a-eb331d2933e1';
const messageId='65cf070e-912d-414b-8871-a0d2d8cb5013';
const sentAt='2026-11-25T02:34:22.381Z';
const textHash='3d1f7a1c93de794925532684d3e273a4356ab2732f352a4197f670aea860efc3';
const repairId='owner-requested-chat-cancellation-20261125-1134';

export async function repairMisattributedChat(store,now=Date.now){
 if(!store)return {status:'not-applicable'};
 for(let attempt=0;attempt<3;attempt++){
  const db=await store.load();
  if(db.chatRepairs?.[repairId])return {status:'already-applied'};
  const message=db.workspace.groups.find(g=>g.id===groupId)?.state.centerMessages?.find(m=>m.id===messageId);
  if(!message)return {status:'not-found'};
  if(message.cancelledAt)return {status:'already-cancelled'};
  if(message.at!==sentAt||(message.sender??'guide')!=='guide'||(message.replies?.length??0)>0||createHash('sha256').update(message.text).digest('hex')!==textHash)return {status:'record-changed'};
  const next=structuredClone(db),at=new Date(now()).toISOString();
  const target=next.workspace.groups.find(g=>g.id===groupId).state.centerMessages.find(m=>m.id===messageId);
  // Recovery record is server-only and is never included in shared snapshots.
  next.chatRepairs={...next.chatRepairs,[repairId]:{at,groupId,messageId,previousMessage:structuredClone(message)}};
  target.text='전송이 취소된 메시지입니다.';
  target.cancelledAt=at;
  next.revision=db.revision+1;
  try{await store.save(next,db.revision);}catch(error){if(error.status===409&&attempt<2)continue;throw error;}
  const saved=await store.load();
  const result=saved.workspace.groups.find(g=>g.id===groupId)?.state.centerMessages?.find(m=>m.id===messageId);
  if(!saved.chatRepairs?.[repairId]||result?.cancelledAt!==at||result.text!==target.text)throw Error('Chat correction verification failed.');
  return {status:'cancelled',messageId};
 }
}
