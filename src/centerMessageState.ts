import type {DemoState} from './types';

export function acknowledgeCenterMessage(state:DemoState,id:string):DemoState{
 const message=state.centerMessages?.find(message=>message.id===id);
 if(!message)throw Error('전달사항을 찾을 수 없어요.');
 if(message.acknowledgedAt)return state;
 return {...state,centerMessages:state.centerMessages!.map(message=>message.id===id?{...message,acknowledgedAt:new Date().toISOString()}:message)};
}

export function addCenterMessage(state:DemoState,content:string):DemoState{
 const text=content.trim();
 if(!text)throw Error('전달할 내용을 입력해주세요.');
 if(text.length>2000)throw Error('전달사항은 2000자 이내로 입력해주세요.');
 const previous=state.centerMessages??[];
 if(previous.length>=1000)throw Error('전달사항을 더 이상 추가할 수 없어요.');
 return {...state,centerMessages:[...previous,{id:crypto.randomUUID(),text,at:new Date().toISOString()}]};
}
