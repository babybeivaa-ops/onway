import type {CenterMessage} from './types';
export function chatTimeline(messages:CenterMessage[]){
 return messages.flatMap(message=>[
  {id:message.id,sender:message.sender??'guide',text:message.text,at:message.at,acknowledged:!!message.acknowledgedAt,cancelled:!!message.cancelledAt,cancellable:!message.cancelledAt&&!message.acknowledgedAt&&!(message.replies?.length)},
  ...(message.replies??[]).map(reply=>({id:message.id+':'+reply.id,sender:'admin' as const,text:reply.text,at:reply.at,acknowledged:false,cancelled:false,cancellable:false})),
 ]).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
}
