import type {DemoState} from './types';

export function acknowledgeCenterMessage(state:DemoState,id:string):DemoState{
 const message=state.centerMessages?.find(message=>message.id===id);
 if(!message)throw Error('전달사항을 찾을 수 없어요.');
 if(message.acknowledgedAt)return state;
 return {...state,centerMessages:state.centerMessages!.map(message=>message.id===id?{...message,acknowledgedAt:new Date().toISOString()}:message)};
}

export function addCenterMessage(state:DemoState,content:string,sender:'admin'|'guide'='guide'):DemoState{
 const text=content.trim();
 if(!text)throw Error('전달할 내용을 입력해주세요.');
 const previous=state.centerMessages??[];
 if(previous.length>=1000)throw Error('전달사항을 더 이상 추가할 수 없어요.');
 return {...state,centerMessages:[...previous,{id:crypto.randomUUID(),text,at:new Date().toISOString(),...(sender==='admin'?{sender}: {})}]};
}

export function replyToCenterMessage(state:DemoState,id:string,content:string):DemoState{
 const message=state.centerMessages?.find(m=>m.id===id);
 if(!message)throw Error('전달사항을 찾을 수 없어요.');
 const text=content.trim();if(!text)throw Error('답변 내용을 입력해주세요.');
 if((message.replies?.length??0)>=100)throw Error('이 전달사항에는 답변을 더 추가할 수 없어요.');
 const at=new Date().toISOString();
 return {...state,centerMessages:state.centerMessages!.map(m=>m.id===id?{...m,acknowledgedAt:m.acknowledgedAt??at,replies:[...(m.replies??[]),{id:crypto.randomUUID(),text,at,actor:'admin' as const}]}:m)};
}
