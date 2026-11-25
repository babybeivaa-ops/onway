import {useEffect,useState} from 'react';
import type {CenterMessage} from './types';
import {sharedRequest} from './sharedClient';
export function useGuideChatNotice(groupId:string,messages:CenterMessage[],token:string|undefined,open:boolean,onOpen:()=>void,enabled=true){
 const storageKey='onway-guide-chat-read:'+groupId;
 const [read,setRead]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{return []}});
 const [live,setLive]=useState<CenterMessage[]>([]);
 useEffect(()=>{let alive=true,busy=false;
 const refresh=async()=>{if(!enabled||!token||busy||document.visibilityState!=='visible')return;busy=true;try{const data=await sharedRequest(token,'workspace');const incoming=data.workspace?.groups?.find((g:{id:string})=>g.id===groupId)?.state?.centerMessages;if(alive&&Array.isArray(incoming))setLive(incoming)}catch{/* Workspace reports connection failures. */}finally{busy=false}};
 void refresh();const timer=setInterval(refresh,5000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
 return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)};
 },[groupId,token,enabled]);
 const map=new Map(messages.map(m=>[m.id,m]));for(const m of live){const current=map.get(m.id);map.set(m.id,current?.cancelledAt?current:{...m,acknowledgedAt:current?.acknowledgedAt??m.acknowledgedAt});}const merged=[...map.values()];
 const pending=merged.filter(m=>enabled&&m.sender==='admin'&&!m.acknowledgedAt&&!m.cancelledAt&&!read.includes(m.id));
 const pendingKey=pending.map(m=>m.id).join('|');
 useEffect(()=>{if(!pendingKey)return;
 const check=()=>{if(document.visibilityState!=='visible')return;
 if(open){const next=[...new Set([...read,...pending.map(m=>m.id)])];setRead(next);try{localStorage.setItem(storageKey,JSON.stringify(next))}catch{};return;}
};
 check();const timer=setInterval(check,1500);return()=>clearInterval(timer);
 },[pendingKey,open,storageKey]);
 return {messages:merged,unread:pending.length};
}
